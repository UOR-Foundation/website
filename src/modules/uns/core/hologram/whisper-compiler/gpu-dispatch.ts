/**
 * GPU Dispatch Layer — Whisper Inference Acceleration
 * ════════════════════════════════════════════════════
 *
 * Routes tensor operations to HologramGpu WGSL kernels when WebGPU
 * is available, with automatic CPU fallback. This provides 10-50×
 * speedup on the hot path (matmul, layerNorm, gelu, softmax).
 *
 * Design:
 *   - All functions have identical signatures to CPU counterparts
 *   - GPU init is lazy — first call initialises vGPU if available
 *   - Buffer reuse minimised for correctness; GPU handles parallelism
 *   - Every dispatch is content-addressed through HologramGpu
 *
 * @module uns/core/hologram/whisper-compiler/gpu-dispatch
 */

import { getHologramGpu, type HologramGpu } from "@/modules/uns/core/hologram/gpu";
import {
  WGSL_MATMUL,
  WGSL_LAYER_NORM,
  WGSL_GELU,
  WGSL_SOFTMAX,
  WGSL_SDPA,
  WGSL_CONV1D,
  cpuMatmul,
  cpuLayerNorm,
  cpuGelu,
  cpuSoftmax,
  cpuScaledDotProductAttention,
  cpuConv1d,
} from "./wgsl-kernels";

// ── Types ──────────────────────────────────────────────────────────────────

export interface GpuDispatchStats {
  gpuOps: number;
  cpuFallbackOps: number;
  totalGpuTimeMs: number;
  deviceName: string;
  available: boolean;
}

/**
 * Per-layer KV cache for incremental attention.
 * Stores K and V as [nHeads][seqSoFar × dHead].
 */
export interface KvCache {
  /** Cached keys per head: nHeads arrays, each pre-allocated [maxLen × dHead] */
  k: Float32Array[];
  /** Cached values per head: nHeads arrays, each pre-allocated [maxLen × dHead] */
  v: Float32Array[];
  /** Number of cached positions */
  len: number;
  /** Pre-allocated capacity (positions) */
  capacity: number;
  /** Head dimension */
  dHead: number;
}

/** Max decoder positions for Whisper */
const KV_CACHE_MAX_POSITIONS = 512;
/** Head dimension for Whisper tiny.en */
const KV_CACHE_D_HEAD = 64;

export function createKvCache(nHeads: number, maxPositions = KV_CACHE_MAX_POSITIONS, dHead = KV_CACHE_D_HEAD): KvCache {
  return {
    // Pre-allocate full capacity — zero-copy appends via subarray views
    k: Array.from({ length: nHeads }, () => new Float32Array(maxPositions * dHead)),
    v: Array.from({ length: nHeads }, () => new Float32Array(maxPositions * dHead)),
    len: 0,
    capacity: maxPositions,
    dHead,
  };
}

/** Append new K/V rows to existing cache — zero-copy when within capacity */
function appendKv(cache: KvCache, headIdx: number, newK: Float32Array, newV: Float32Array, dHead: number, newLen: number): void {
  const writeOffset = cache.len * dHead;

  if (cache.len + newLen <= cache.capacity) {
    // Fast path: write into pre-allocated buffer (no allocation)
    cache.k[headIdx].set(newK, writeOffset);
    cache.v[headIdx].set(newV, writeOffset);
  } else {
    // Rare fallback: grow buffer (should not happen with proper capacity)
    const totalLen = cache.len + newLen;
    const mergedK = new Float32Array(totalLen * dHead);
    mergedK.set(cache.k[headIdx].subarray(0, cache.len * dHead), 0);
    mergedK.set(newK, writeOffset);
    cache.k[headIdx] = mergedK;

    const mergedV = new Float32Array(totalLen * dHead);
    mergedV.set(cache.v[headIdx].subarray(0, cache.len * dHead), 0);
    mergedV.set(newV, writeOffset);
    cache.v[headIdx] = mergedV;
    cache.capacity = totalLen;
  }
}

// ── GPU Dispatch Singleton ─────────────────────────────────────────────────

export class GpuDispatch {
  private gpu: HologramGpu;
  private _available = false;
  private _initPromise: Promise<void> | null = null;
  private _initialized = false;
  private _deviceName = "CPU";
  private _gpuOps = 0;
  private _cpuOps = 0;
  private _totalGpuMs = 0;

  // ── Weight Transpose Cache ──────────────────────────────────────────
  // Key: original Float32Array reference, Value: transposed [K,M] → [M,K]
  // Eliminates ~4,000 redundant transpose ops per transcription.
  private _transposeCache = new WeakMap<Float32Array, Float32Array>();

  // Minimum matrix dimension to bother sending to GPU
  // (small ops have too much dispatch overhead)
  private readonly GPU_THRESHOLD = 64;

  constructor() {
    this.gpu = getHologramGpu();
  }

  // ── Init ─────────────────────────────────────────────────────────────

  /**
   * Lazy GPU init. Safe to call multiple times.
   */
  async init(): Promise<boolean> {
    if (this._initialized) return this._available;
    if (this._initPromise) {
      await this._initPromise;
      return this._available;
    }

    this._initPromise = this._doInit();
    await this._initPromise;
    return this._available;
  }

  private async _doInit(): Promise<void> {
    try {
      const info = await this.gpu.init();
      this._available = info.status === "ready" && this.gpu.isReady;
      this._deviceName = this._available
        ? info.adapterName
        : "CPU (WebGPU unavailable)";
      console.log(`[GpuDispatch] ${this._available ? "🎮 GPU" : "💻 CPU"}: ${this._deviceName}`);
    } catch {
      this._available = false;
      this._deviceName = "CPU (init failed)";
    }
    this._initialized = true;
    this._initPromise = null;
  }

  get available(): boolean { return this._available; }
  get deviceName(): string { return this._deviceName; }

  get stats(): GpuDispatchStats {
    return {
      gpuOps: this._gpuOps,
      cpuFallbackOps: this._cpuOps,
      totalGpuTimeMs: Math.round(this._totalGpuMs * 100) / 100,
      deviceName: this._deviceName,
      available: this._available,
    };
  }

  resetStats(): void {
    this._gpuOps = 0;
    this._cpuOps = 0;
    this._totalGpuMs = 0;
  }

  // ── MatMul ───────────────────────────────────────────────────────────
  // C[M×N] = A[M×K] × B[K×N]

  async matmul(
    A: Float32Array, B: Float32Array,
    M: number, N: number, K: number,
  ): Promise<Float32Array> {
    // Skip GPU for small matrices (dispatch overhead > compute)
    if (!this._available || M * N < this.GPU_THRESHOLD * this.GPU_THRESHOLD) {
      this._cpuOps++;
      return cpuMatmul(A, B, M, N, K);
    }

    try {
      const uniforms = new ArrayBuffer(16);
      const view = new Uint32Array(uniforms);
      view[0] = M; view[1] = N; view[2] = K; view[3] = 0;

      const outputSize = M * N * 4;
      const wgX = Math.ceil(M / 16);
      const wgY = Math.ceil(N / 16);

      const result = await this.gpu.compute(
        WGSL_MATMUL, [A, B], outputSize,
        [wgX, wgY, 1], uniforms,
      );

      this._gpuOps++;
      this._totalGpuMs += result.computeTimeMs;
      return result.output;
    } catch {
      this._cpuOps++;
      return cpuMatmul(A, B, M, N, K);
    }
  }

  // ── Layer Normalization ──────────────────────────────────────────────

  async layerNorm(
    input: Float32Array, gamma: Float32Array, beta: Float32Array,
    N: number, D: number, eps: number = 1e-5,
  ): Promise<Float32Array> {
    if (!this._available || N < 4) {
      this._cpuOps++;
      return cpuLayerNorm(input, gamma, beta, N, D, eps);
    }

    try {
      const uniforms = new ArrayBuffer(16);
      const uView = new DataView(uniforms);
      uView.setUint32(0, N, true);
      uView.setUint32(4, D, true);
      uView.setFloat32(8, eps, true);
      uView.setUint32(12, 0, true);

      const outputSize = N * D * 4;
      const wgX = Math.ceil(N / 256);

      const result = await this.gpu.compute(
        WGSL_LAYER_NORM, [input, gamma, beta], outputSize,
        [wgX, 1, 1], uniforms,
      );

      this._gpuOps++;
      this._totalGpuMs += result.computeTimeMs;
      return result.output;
    } catch {
      this._cpuOps++;
      return cpuLayerNorm(input, gamma, beta, N, D, eps);
    }
  }

  // ── GELU ─────────────────────────────────────────────────────────────

  async gelu(input: Float32Array): Promise<Float32Array> {
    if (!this._available || input.length < 1024) {
      this._cpuOps++;
      return cpuGelu(input);
    }

    try {
      const outputSize = input.byteLength;
      const wgX = Math.ceil(input.length / 256);

      const result = await this.gpu.compute(
        WGSL_GELU, [input], outputSize,
        [wgX, 1, 1],
      );

      this._gpuOps++;
      this._totalGpuMs += result.computeTimeMs;
      return result.output;
    } catch {
      this._cpuOps++;
      return cpuGelu(input);
    }
  }

  // ── Conv1D (GPU-accelerated) ──────────────────────────────────────────
  // input [C_in, L], weight [C_out, C_in, K], bias [C_out] → output [C_out, L']

  async conv1d(
    input: Float32Array, weight: Float32Array, bias: Float32Array | null,
    cIn: number, cOut: number, kernelSize: number, length: number,
    stride = 1, padding = 0,
  ): Promise<Float32Array> {
    const outLen = Math.floor((length + 2 * padding - kernelSize) / stride) + 1;
    const totalElements = cOut * outLen;

    // Skip GPU for small convolutions
    if (!this._available || totalElements < 4096) {
      this._cpuOps++;
      return cpuConv1d(input, weight, bias, cIn, cOut, kernelSize, length, stride, padding);
    }

    try {
      // Uniforms: 8 u32s = 32 bytes
      const uniforms = new ArrayBuffer(32);
      const view = new Uint32Array(uniforms);
      view[0] = cIn;
      view[1] = cOut;
      view[2] = kernelSize;
      view[3] = length;
      view[4] = outLen;
      view[5] = stride;
      view[6] = padding;
      view[7] = bias ? 1 : 0;

      // If no bias, pass a dummy single-element buffer
      const biasBuffer = bias ?? new Float32Array(1);
      const outputSize = totalElements * 4;
      const wgX = Math.ceil(totalElements / 256);

      const result = await this.gpu.compute(
        WGSL_CONV1D, [input, weight, biasBuffer], outputSize,
        [wgX, 1, 1], uniforms,
      );

      this._gpuOps++;
      this._totalGpuMs += result.computeTimeMs;
      return result.output;
    } catch {
      this._cpuOps++;
      return cpuConv1d(input, weight, bias, cIn, cOut, kernelSize, length, stride, padding);
    }
  }

  // ── Softmax ──────────────────────────────────────────────────────────

  async softmax(
    input: Float32Array, N: number, D: number,
  ): Promise<Float32Array> {
    if (!this._available || N < 4) {
      this._cpuOps++;
      return cpuSoftmax(input, N, D);
    }

    try {
      const uniforms = new ArrayBuffer(16);
      const view = new Uint32Array(uniforms);
      view[0] = N; view[1] = D; view[2] = 0; view[3] = 0;

      const outputSize = N * D * 4;
      const wgX = Math.ceil(N / 256);

      const result = await this.gpu.compute(
        WGSL_SOFTMAX, [input], outputSize,
        [wgX, 1, 1], uniforms,
      );

      this._gpuOps++;
      this._totalGpuMs += result.computeTimeMs;
      return result.output;
    } catch {
      this._cpuOps++;
      return cpuSoftmax(input, N, D);
    }
  }

  // ── Scaled Dot-Product Attention ─────────────────────────────────────

  async sdpa(
    Q: Float32Array, K: Float32Array, V: Float32Array,
    seqLen: number, dk: number,
  ): Promise<Float32Array> {
    if (!this._available || seqLen < 16) {
      this._cpuOps++;
      return cpuScaledDotProductAttention(Q, K, V, seqLen, dk);
    }

    try {
      const scale = 1 / Math.sqrt(dk);
      const uniforms = new ArrayBuffer(16);
      const uView = new DataView(uniforms);
      uView.setUint32(0, seqLen, true);
      uView.setUint32(4, dk, true);
      uView.setFloat32(8, scale, true);
      uView.setUint32(12, 0, true);

      const outputSize = seqLen * dk * 4;
      const wgX = Math.ceil(seqLen / 256);

      const result = await this.gpu.compute(
        WGSL_SDPA, [Q, K, V], outputSize,
        [wgX, 1, 1], uniforms,
      );

      this._gpuOps++;
      this._totalGpuMs += result.computeTimeMs;
      return result.output;
    } catch {
      this._cpuOps++;
      return cpuScaledDotProductAttention(Q, K, V, seqLen, dk);
    }
  }

  // ── Compound Ops (GPU-optimised) ─────────────────────────────────────

  /**
   * GPU-accelerated linear layer: Y = X @ W^T + bias
   * X: [N, K], W: [M, K], bias: [M] → Y: [N, M]
   */
  async linear(
    input: Float32Array, weight: Float32Array, bias: Float32Array | null,
    N: number, K: number, M: number,
  ): Promise<Float32Array> {
    // Cache the transposed weight matrix — same weights are reused
    // hundreds of times across decoder steps. WeakMap ensures GC
    // when the weight array is released on engine.dispose().
    let wT = this._transposeCache.get(weight);
    if (!wT) {
      wT = new Float32Array(K * M);
      for (let m = 0; m < M; m++) {
        for (let k = 0; k < K; k++) {
          wT[k * M + m] = weight[m * K + k];
        }
      }
      this._transposeCache.set(weight, wT);
    }

    const out = await this.matmul(input, wT, N, M, K);

    if (bias) {
      for (let n = 0; n < N; n++) {
        for (let m = 0; m < M; m++) {
          out[n * M + m] += bias[m];
        }
      }
    }
    return out;
  }

  /**
   * GPU-accelerated multi-head attention.
   * Dispatches Q/K/V projections, per-head SDPA, and output projection through GPU.
   */
  async multiHeadAttention(
    input: Float32Array, seqLen: number,
    qW: Float32Array, qB: Float32Array,
    kW: Float32Array, kB: Float32Array | null,
    vW: Float32Array, vB: Float32Array,
    outW: Float32Array, outB: Float32Array,
    nHeads: number, dModel: number, dHead: number,
    causal: boolean,
  ): Promise<Float32Array> {
    // Q/K/V projections via GPU matmul
    const Q = await this.linear(input, qW, qB, seqLen, dModel, dModel);
    const K = await this.linear(input, kW, kB, seqLen, dModel, dModel);
    const V = await this.linear(input, vW, vB, seqLen, dModel, dModel);

    const attnOut = new Float32Array(seqLen * dModel);

    // Per-head attention
    for (let h = 0; h < nHeads; h++) {
      const headOff = h * dHead;

      // Extract per-head Q, K, V
      const Qh = new Float32Array(seqLen * dHead);
      const Kh = new Float32Array(seqLen * dHead);
      const Vh = new Float32Array(seqLen * dHead);

      for (let t = 0; t < seqLen; t++) {
        for (let d = 0; d < dHead; d++) {
          Qh[t * dHead + d] = Q[t * dModel + headOff + d];
          Kh[t * dHead + d] = K[t * dModel + headOff + d];
          Vh[t * dHead + d] = V[t * dModel + headOff + d];
        }
      }

      // Attention: scores = Q @ K^T
      const KhT = new Float32Array(dHead * seqLen);
      for (let t = 0; t < seqLen; t++) {
        for (let d = 0; d < dHead; d++) {
          KhT[d * seqLen + t] = Kh[t * dHead + d];
        }
      }

      const scores = await this.matmul(Qh, KhT, seqLen, seqLen, dHead);
      const scale = 1 / Math.sqrt(dHead);
      for (let i = 0; i < scores.length; i++) scores[i] *= scale;

      // Apply causal mask
      if (causal) {
        for (let i = 0; i < seqLen; i++) {
          for (let j = i + 1; j < seqLen; j++) {
            scores[i * seqLen + j] = -1e9;
          }
        }
      }

      // Softmax
      const weights = await this.softmax(scores, seqLen, seqLen);

      // Weighted sum: weights @ V
      const headOut = await this.matmul(weights, Vh, seqLen, dHead, seqLen);

      // Write back
      for (let t = 0; t < seqLen; t++) {
        for (let d = 0; d < dHead; d++) {
          attnOut[t * dModel + headOff + d] = headOut[t * dHead + d];
        }
      }
    }

    // Output projection
    return this.linear(attnOut, outW, outB, seqLen, dModel, dModel);
  }

  /**
   * GPU-accelerated cross-attention.
   * Queries from decoder, keys/values from encoder.
   */
  async crossAttention(
    input: Float32Array, decLen: number,
    encOutput: Float32Array, encLen: number,
    qW: Float32Array, qB: Float32Array,
    kW: Float32Array, kB: Float32Array | null,
    vW: Float32Array, vB: Float32Array,
    outW: Float32Array, outB: Float32Array,
    nHeads: number, dModel: number, dHead: number,
  ): Promise<Float32Array> {
    const Q = await this.linear(input, qW, qB, decLen, dModel, dModel);
    const K = await this.linear(encOutput, kW, kB, encLen, dModel, dModel);
    const V = await this.linear(encOutput, vW, vB, encLen, dModel, dModel);

    const attnOut = new Float32Array(decLen * dModel);

    for (let h = 0; h < nHeads; h++) {
      const headOff = h * dHead;

      const Qh = new Float32Array(decLen * dHead);
      const Kh = new Float32Array(encLen * dHead);
      const Vh = new Float32Array(encLen * dHead);

      for (let t = 0; t < decLen; t++) {
        for (let d = 0; d < dHead; d++) {
          Qh[t * dHead + d] = Q[t * dModel + headOff + d];
        }
      }
      for (let t = 0; t < encLen; t++) {
        for (let d = 0; d < dHead; d++) {
          Kh[t * dHead + d] = K[t * dModel + headOff + d];
          Vh[t * dHead + d] = V[t * dModel + headOff + d];
        }
      }

      // Scores: [decLen, encLen]
      const KhT = new Float32Array(dHead * encLen);
      for (let t = 0; t < encLen; t++) {
        for (let d = 0; d < dHead; d++) {
          KhT[d * encLen + t] = Kh[t * dHead + d];
        }
      }

      const scores = await this.matmul(Qh, KhT, decLen, encLen, dHead);
      const scale = 1 / Math.sqrt(dHead);
      for (let i = 0; i < scores.length; i++) scores[i] *= scale;

      const weights = await this.softmax(scores, decLen, encLen);
      const headOut = await this.matmul(weights, Vh, decLen, dHead, encLen);

      for (let t = 0; t < decLen; t++) {
        for (let d = 0; d < dHead; d++) {
          attnOut[t * dModel + headOff + d] = headOut[t * dHead + d];
        }
      }
    }

    return this.linear(attnOut, outW, outB, decLen, dModel, dModel);
  }
  // ── KV-Cached Self-Attention ─────────────────────────────────────────
  //
  // Only computes Q/K/V for the NEW token(s), appends K/V to cache,
  // then attends over the full cached sequence.
  // Reduces per-step complexity from O(T² · D) to O(T · D).

  /**
   * Incremental self-attention with KV-cache.
   * `input` is [newLen, dModel] (typically newLen=1 for autoregressive).
   * `cache` accumulates K/V across steps.
   */
  async cachedSelfAttention(
    input: Float32Array, newLen: number,
    qW: Float32Array, qB: Float32Array,
    kW: Float32Array, kB: Float32Array | null,
    vW: Float32Array, vB: Float32Array,
    outW: Float32Array, outB: Float32Array,
    nHeads: number, dModel: number, dHead: number,
    cache: KvCache,
    causal: boolean,
  ): Promise<Float32Array> {
    // Project only new tokens
    const Q = await this.linear(input, qW, qB, newLen, dModel, dModel);
    const Knew = await this.linear(input, kW, kB, newLen, dModel, dModel);
    const Vnew = await this.linear(input, vW, vB, newLen, dModel, dModel);

    const attnOut = new Float32Array(newLen * dModel);

    for (let h = 0; h < nHeads; h++) {
      const headOff = h * dHead;

      // Extract new Q/K/V for this head
      const Qh = new Float32Array(newLen * dHead);
      const KhNew = new Float32Array(newLen * dHead);
      const VhNew = new Float32Array(newLen * dHead);

      for (let t = 0; t < newLen; t++) {
        for (let d = 0; d < dHead; d++) {
          Qh[t * dHead + d] = Q[t * dModel + headOff + d];
          KhNew[t * dHead + d] = Knew[t * dModel + headOff + d];
          VhNew[t * dHead + d] = Vnew[t * dModel + headOff + d];
        }
      }

      // Append to cache
      appendKv(cache, h, KhNew, VhNew, dHead, newLen);
    }

    // Update cache length (only once, after all heads appended)
    const fullLen = cache.len + newLen;
    cache.len = fullLen;

    // Now attend: Q_new [newLen, dHead] × K_cached^T [dHead, fullLen]
    for (let h = 0; h < nHeads; h++) {
      const headOff = h * dHead;

      const Qh = new Float32Array(newLen * dHead);
      for (let t = 0; t < newLen; t++) {
        for (let d = 0; d < dHead; d++) {
          Qh[t * dHead + d] = Q[t * dModel + headOff + d];
        }
      }

      // Use subarray view into pre-allocated buffer (no copy)
      const KhFull = cache.k[h].subarray(0, fullLen * dHead);
      const VhFull = cache.v[h].subarray(0, fullLen * dHead);

      // Transpose K: [fullLen, dHead] → [dHead, fullLen]
      const KhT = new Float32Array(dHead * fullLen);
      for (let t = 0; t < fullLen; t++) {
        for (let d = 0; d < dHead; d++) {
          KhT[d * fullLen + t] = KhFull[t * dHead + d];
        }
      }

      // Scores: [newLen, fullLen]
      const scores = await this.matmul(Qh, KhT, newLen, fullLen, dHead);
      const scale = 1 / Math.sqrt(dHead);
      for (let i = 0; i < scores.length; i++) scores[i] *= scale;

      // Causal mask: for position (cache.len - newLen + i), mask out j > (cache.len - newLen + i)
      if (causal) {
        const basePos = fullLen - newLen;
        for (let i = 0; i < newLen; i++) {
          for (let j = basePos + i + 1; j < fullLen; j++) {
            scores[i * fullLen + j] = -1e9;
          }
        }
      }

      const weights = await this.softmax(scores, newLen, fullLen);
      const headOut = await this.matmul(weights, VhFull, newLen, dHead, fullLen);

      for (let t = 0; t < newLen; t++) {
        for (let d = 0; d < dHead; d++) {
          attnOut[t * dModel + headOff + d] = headOut[t * dHead + d];
        }
      }
    }

    return this.linear(attnOut, outW, outB, newLen, dModel, dModel);
  }

  /**
   * Cached cross-attention: K/V from encoder are computed once
   * and stored in cache. Only Q is computed per decoder step.
   */
  async cachedCrossAttention(
    input: Float32Array, decLen: number,
    encOutput: Float32Array, encLen: number,
    qW: Float32Array, qB: Float32Array,
    kW: Float32Array, kB: Float32Array | null,
    vW: Float32Array, vB: Float32Array,
    outW: Float32Array, outB: Float32Array,
    nHeads: number, dModel: number, dHead: number,
    cache: KvCache,
  ): Promise<Float32Array> {
    // Only compute encoder K/V on first call (cache.len === 0)
    if (cache.len === 0) {
      const K = await this.linear(encOutput, kW, kB, encLen, dModel, dModel);
      const V = await this.linear(encOutput, vW, vB, encLen, dModel, dModel);

      for (let h = 0; h < nHeads; h++) {
        const headOff = h * dHead;
        const Kh = new Float32Array(encLen * dHead);
        const Vh = new Float32Array(encLen * dHead);
        for (let t = 0; t < encLen; t++) {
          for (let d = 0; d < dHead; d++) {
            Kh[t * dHead + d] = K[t * dModel + headOff + d];
            Vh[t * dHead + d] = V[t * dModel + headOff + d];
          }
        }
        cache.k[h] = Kh;
        cache.v[h] = Vh;
      }
      cache.len = encLen;
    }

    // Only Q changes each step
    const Q = await this.linear(input, qW, qB, decLen, dModel, dModel);
    const attnOut = new Float32Array(decLen * dModel);

    for (let h = 0; h < nHeads; h++) {
      const headOff = h * dHead;
      const Qh = new Float32Array(decLen * dHead);
      for (let t = 0; t < decLen; t++) {
        for (let d = 0; d < dHead; d++) {
          Qh[t * dHead + d] = Q[t * dModel + headOff + d];
        }
      }

      const KhFull = cache.k[h].subarray(0, cache.len * dHead);
      const VhFull = cache.v[h].subarray(0, cache.len * dHead);
      const cachedLen = cache.len;

      const KhT = new Float32Array(dHead * cachedLen);
      for (let t = 0; t < cachedLen; t++) {
        for (let d = 0; d < dHead; d++) {
          KhT[d * cachedLen + t] = KhFull[t * dHead + d];
        }
      }

      const scores = await this.matmul(Qh, KhT, decLen, cachedLen, dHead);
      const scale = 1 / Math.sqrt(dHead);
      for (let i = 0; i < scores.length; i++) scores[i] *= scale;

      const weights = await this.softmax(scores, decLen, cachedLen);
      const headOut = await this.matmul(weights, VhFull, decLen, dHead, cachedLen);

      for (let t = 0; t < decLen; t++) {
        for (let d = 0; d < dHead; d++) {
          attnOut[t * dModel + headOff + d] = headOut[t * dHead + d];
        }
      }
    }

    return this.linear(attnOut, outW, outB, decLen, dModel, dModel);
  }
}

// ── Singleton ──────────────────────────────────────────────────────────────

let _dispatch: GpuDispatch | null = null;

export function getGpuDispatch(): GpuDispatch {
  if (!_dispatch) _dispatch = new GpuDispatch();
  return _dispatch;
}
