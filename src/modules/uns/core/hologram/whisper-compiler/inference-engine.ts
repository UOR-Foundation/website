/**
 * Whisper Inference Engine — Phase 3 + Phase 4 (GPU-Accelerated)
 * ══════════════════════════════════════════════════════════════
 *
 * Runs Whisper tiny.en inference using compiled weights from
 * the Hologram weight store. GPU-accelerated via HologramGpu
 * WGSL kernels with automatic CPU fallback.
 *
 * Architecture (Whisper tiny.en):
 *   Encoder: Conv1D(80→384,k=3) → GELU → Conv1D(384→384,k=3,s=2) → GELU
 *            → positional → 4× TransformerBlock → LayerNorm
 *   Decoder: TokenEmbed + PosEmbed → 4× TransformerBlock (with cross-attn)
 *            → LayerNorm → lm_head (logits)
 *
 * Phase 4: All MatMul, LayerNorm, GELU, Softmax, and Attention ops
 * are dispatched through GpuDispatch → HologramGpu WGSL kernels,
 * providing 10-50× speedup over CPU on supported hardware.
 *
 * @module uns/core/hologram/whisper-compiler/inference-engine
 */

import { getWeightStore, type HologramWeightStore } from "./weight-store";
import { loadCompiledWhisper } from "./compiler";
import { computeMelSpectrogram, N_MELS, N_FRAMES } from "./mel-spectrogram";
import { cpuGelu } from "./wgsl-kernels";
import { getGpuDispatch, type GpuDispatch, type GpuDispatchStats } from "./gpu-dispatch";
import type { HologramCompiledModel, HologramTensorDescriptor } from "./types";

// ── Whisper tiny.en Architecture Constants ─────────────────────────────────

const D_MODEL = 384;
const N_HEADS = 6;
const D_HEAD = D_MODEL / N_HEADS; // 64
const D_MLP = 1536; // 4 * D_MODEL
const N_ENCODER_LAYERS = 4;
const N_DECODER_LAYERS = 4;
const VOCAB_SIZE = 51865;
const MAX_DECODER_POSITIONS = 448;
const EPS = 1e-5;

// Special tokens
const SOT = 50258;
const LANG_EN = 50259;
const TRANSCRIBE = 50360;
const NO_TIMESTAMPS = 50364;
const EOT = 50257;
const MAX_TOKENS = 224;

// ── Tensor Ops (CPU-only, for non-dispatchable ops) ────────────────────────

/** Conv1D: input [C_in, L], weight [C_out, C_in, K], bias [C_out] → output [C_out, L'] */
function conv1d(
  input: Float32Array, weight: Float32Array, bias: Float32Array | null,
  cIn: number, cOut: number, kernelSize: number, length: number,
  stride = 1, padding = 0,
): Float32Array {
  const outLen = Math.floor((length + 2 * padding - kernelSize) / stride) + 1;
  const output = new Float32Array(cOut * outLen);

  for (let oc = 0; oc < cOut; oc++) {
    const b = bias ? bias[oc] : 0;
    for (let ol = 0; ol < outLen; ol++) {
      let sum = b;
      for (let ic = 0; ic < cIn; ic++) {
        const wOff = oc * cIn * kernelSize + ic * kernelSize;
        const iBase = ic * length;
        for (let k = 0; k < kernelSize; k++) {
          const il = ol * stride - padding + k;
          if (il >= 0 && il < length) {
            sum += weight[wOff + k] * input[iBase + il];
          }
        }
      }
      output[oc * outLen + ol] = sum;
    }
  }
  return output;
}

/** Transpose [rows, cols] → [cols, rows] */
function transpose2d(data: Float32Array, rows: number, cols: number): Float32Array {
  const out = new Float32Array(rows * cols);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out[c * rows + r] = data[r * cols + c];
    }
  }
  return out;
}

/** Element-wise add (in-place on a) */
function addInPlace(a: Float32Array, b: Float32Array): void {
  for (let i = 0; i < a.length; i++) a[i] += b[i];
}

/** Embedding lookup: [vocabSize, dim] → tokens → [T, dim] */
function embedding(
  table: Float32Array, dim: number, tokenIds: number[],
): Float32Array {
  const T = tokenIds.length;
  const out = new Float32Array(T * dim);
  for (let t = 0; t < T; t++) {
    const off = tokenIds[t] * dim;
    out.set(table.subarray(off, off + dim), t * dim);
  }
  return out;
}

// ── Inference Progress ─────────────────────────────────────────────────────

export interface InferenceProgress {
  phase: "mel" | "encoder" | "decoder" | "done";
  message: string;
  progress: number;
  tokensGenerated?: number;
}

// ── WhisperEngine ──────────────────────────────────────────────────────────

export class WhisperEngine {
  private store: HologramWeightStore;
  private manifest: HologramCompiledModel | null = null;
  private weights = new Map<string, Float32Array>();
  private tensorIndex = new Map<string, HologramTensorDescriptor>();
  private ready = false;
  private dispatch: GpuDispatch;

  constructor() {
    this.store = getWeightStore();
    this.dispatch = getGpuDispatch();
  }

  // ── Initialization ─────────────────────────────────────────────────

  /**
   * Load compiled model weights into memory and initialise GPU.
   * Must be called before transcribe().
   */
  async init(
    onProgress?: (loaded: number, total: number) => void,
  ): Promise<void> {
    if (this.ready) return;

    // Init GPU in parallel with weight store
    const [, gpuAvailable] = await Promise.all([
      this.store.init(),
      this.dispatch.init(),
    ]);

    console.log(
      `[WhisperEngine] GPU: ${gpuAvailable ? "✅ " + this.dispatch.deviceName : "❌ CPU fallback"}`
    );

    this.manifest = await loadCompiledWhisper("both");

    if (!this.manifest) {
      throw new Error(
        "[WhisperEngine] No compiled model found. Run compileWhisperModel() first."
      );
    }

    console.log(
      `[WhisperEngine] Loading ${this.manifest.tensors.length} tensors ` +
      `(${(this.manifest.totalWeightBytes / 1024 / 1024).toFixed(1)} MB)...`
    );

    // Build index
    for (const desc of this.manifest.tensors) {
      this.tensorIndex.set(desc.name, desc);
    }

    // Load all tensors into memory
    const total = this.manifest.tensors.length;
    for (let i = 0; i < total; i++) {
      const desc = this.manifest.tensors[i];
      const raw = await this.store.loadTensor(desc.cid);
      if (!raw) {
        console.warn(`[WhisperEngine] Missing tensor: ${desc.name} (${desc.cid.slice(0, 8)})`);
        continue;
      }

      const float32 = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
      this.weights.set(desc.name, float32);
      onProgress?.(i + 1, total);
    }

    console.log(`[WhisperEngine] ✅ Loaded ${this.weights.size}/${total} tensors`);

    const names = [...this.weights.keys()].sort();
    console.log(`[WhisperEngine] Weight names (first 20):`, names.slice(0, 20));

    this.dispatch.resetStats();
    this.ready = true;
  }

  get isReady(): boolean { return this.ready; }

  /** Get GPU dispatch statistics */
  get gpuStats(): GpuDispatchStats { return this.dispatch.stats; }

  // ── Weight Lookup ──────────────────────────────────────────────────

  private w(pattern: string): Float32Array {
    if (this.weights.has(pattern)) return this.weights.get(pattern)!;
    for (const prefix of ["encoder/", "decoder/"]) {
      if (this.weights.has(prefix + pattern)) {
        return this.weights.get(prefix + pattern)!;
      }
    }
    for (const [name, data] of this.weights) {
      if (name.includes(pattern)) return data;
    }
    throw new Error(`[WhisperEngine] Weight not found: "${pattern}"`);
  }

  private tryW(pattern: string): Float32Array | null {
    try { return this.w(pattern); } catch { return null; }
  }

  // ── Encoder Forward Pass (GPU-accelerated) ─────────────────────────

  private async encodeAudio(mel: Float32Array): Promise<Float32Array> {
    const T_mel = N_FRAMES;

    // Conv1: [80, 3000] → [384, 3000] (CPU — conv1d not yet GPU-dispatched)
    let x = conv1d(
      mel, this.w("conv1.weight"), this.tryW("conv1.bias"),
      N_MELS, D_MODEL, 3, T_mel, 1, 1,
    );
    x = await this.dispatch.gelu(x);

    // Conv2: [384, 3000] → [384, 1500] (stride=2)
    const T_conv1 = T_mel;
    x = conv1d(
      x, this.w("conv2.weight"), this.tryW("conv2.bias"),
      D_MODEL, D_MODEL, 3, T_conv1, 2, 1,
    );
    x = await this.dispatch.gelu(x);

    // Transpose [384, 1500] → [1500, 384]
    const T_enc = Math.floor((T_conv1 + 2 * 1 - 3) / 2) + 1;
    x = transpose2d(x, D_MODEL, T_enc);

    // Add positional embedding
    const posEmbed = this.w("embed_positions.weight");
    addInPlace(x, posEmbed.subarray(0, T_enc * D_MODEL));

    // Encoder transformer blocks (GPU-accelerated)
    for (let layer = 0; layer < N_ENCODER_LAYERS; layer++) {
      const prefix = `layers.${layer}`;
      x = await this.encoderBlock(x, T_enc, prefix);
    }

    // Final layer norm (GPU)
    x = await this.dispatch.layerNorm(
      x,
      this.w("encoder.layer_norm.weight") ?? this.w("layer_norm.weight"),
      this.w("encoder.layer_norm.bias") ?? this.w("layer_norm.bias"),
      T_enc, D_MODEL, EPS,
    );

    return x;
  }

  private async encoderBlock(x: Float32Array, seqLen: number, prefix: string): Promise<Float32Array> {
    // Self-attention sub-layer
    let residual = new Float32Array(x);
    x = await this.dispatch.layerNorm(
      x,
      this.w(`${prefix}.self_attn_layer_norm.weight`),
      this.w(`${prefix}.self_attn_layer_norm.bias`),
      seqLen, D_MODEL, EPS,
    );

    x = await this.dispatch.multiHeadAttention(
      x, seqLen,
      this.w(`${prefix}.self_attn.q_proj.weight`),
      this.w(`${prefix}.self_attn.q_proj.bias`),
      this.w(`${prefix}.self_attn.k_proj.weight`),
      this.tryW(`${prefix}.self_attn.k_proj.bias`),
      this.w(`${prefix}.self_attn.v_proj.weight`),
      this.w(`${prefix}.self_attn.v_proj.bias`),
      this.w(`${prefix}.self_attn.out_proj.weight`),
      this.w(`${prefix}.self_attn.out_proj.bias`),
      N_HEADS, D_MODEL, D_HEAD,
      false, // not causal
    );

    addInPlace(x, residual);

    // FFN sub-layer (GPU-accelerated matmul + gelu)
    residual = new Float32Array(x);
    x = await this.dispatch.layerNorm(
      x,
      this.w(`${prefix}.final_layer_norm.weight`),
      this.w(`${prefix}.final_layer_norm.bias`),
      seqLen, D_MODEL, EPS,
    );

    x = await this.dispatch.linear(x, this.w(`${prefix}.fc1.weight`), this.tryW(`${prefix}.fc1.bias`), seqLen, D_MODEL, D_MLP);
    x = await this.dispatch.gelu(x);
    x = await this.dispatch.linear(x, this.w(`${prefix}.fc2.weight`), this.tryW(`${prefix}.fc2.bias`), seqLen, D_MLP, D_MODEL);

    addInPlace(x, residual);
    return x;
  }

  // ── Decoder Forward Pass (GPU-accelerated) ─────────────────────────

  private async decoderStep(
    tokens: number[],
    encoderOutput: Float32Array,
    encLen: number,
  ): Promise<Float32Array> {
    const T = tokens.length;

    // Token + positional embedding (CPU — small lookup)
    const tokenEmbed = this.w("embed_tokens.weight");
    let x = embedding(tokenEmbed, D_MODEL, tokens);
    const posEmbed = this.w("embed_positions.weight");
    for (let t = 0; t < T; t++) {
      for (let d = 0; d < D_MODEL; d++) {
        x[t * D_MODEL + d] += posEmbed[t * D_MODEL + d];
      }
    }

    // Decoder blocks (GPU-accelerated)
    for (let layer = 0; layer < N_DECODER_LAYERS; layer++) {
      const prefix = `layers.${layer}`;
      x = await this.decoderBlock(x, T, encoderOutput, encLen, prefix);
    }

    // Final layer norm (GPU)
    x = await this.dispatch.layerNorm(
      x,
      this.w("layer_norm.weight"),
      this.w("layer_norm.bias"),
      T, D_MODEL, EPS,
    );

    // LM head: project last token to vocab logits (GPU matmul)
    const lastHidden = x.subarray((T - 1) * D_MODEL, T * D_MODEL);
    // lastHidden [1, D_MODEL] × tokenEmbed^T [D_MODEL, VOCAB] → [1, VOCAB]
    const logits = await this.dispatch.matmul(
      lastHidden,
      transpose2d(tokenEmbed, VOCAB_SIZE, D_MODEL),
      1, VOCAB_SIZE, D_MODEL,
    );

    return logits;
  }

  private async decoderBlock(
    x: Float32Array, decLen: number,
    encOutput: Float32Array, encLen: number,
    prefix: string,
  ): Promise<Float32Array> {
    // Causal self-attention (GPU)
    let residual = new Float32Array(x);
    x = await this.dispatch.layerNorm(
      x,
      this.w(`${prefix}.self_attn_layer_norm.weight`),
      this.w(`${prefix}.self_attn_layer_norm.bias`),
      decLen, D_MODEL, EPS,
    );

    x = await this.dispatch.multiHeadAttention(
      x, decLen,
      this.w(`${prefix}.self_attn.q_proj.weight`),
      this.w(`${prefix}.self_attn.q_proj.bias`),
      this.w(`${prefix}.self_attn.k_proj.weight`),
      this.tryW(`${prefix}.self_attn.k_proj.bias`),
      this.w(`${prefix}.self_attn.v_proj.weight`),
      this.w(`${prefix}.self_attn.v_proj.bias`),
      this.w(`${prefix}.self_attn.out_proj.weight`),
      this.w(`${prefix}.self_attn.out_proj.bias`),
      N_HEADS, D_MODEL, D_HEAD,
      true, // causal
    );
    addInPlace(x, residual);

    // Cross-attention (GPU)
    residual = new Float32Array(x);
    x = await this.dispatch.layerNorm(
      x,
      this.w(`${prefix}.encoder_attn_layer_norm.weight`),
      this.w(`${prefix}.encoder_attn_layer_norm.bias`),
      decLen, D_MODEL, EPS,
    );

    x = await this.dispatch.crossAttention(
      x, decLen,
      encOutput, encLen,
      this.w(`${prefix}.encoder_attn.q_proj.weight`),
      this.w(`${prefix}.encoder_attn.q_proj.bias`),
      this.w(`${prefix}.encoder_attn.k_proj.weight`),
      this.tryW(`${prefix}.encoder_attn.k_proj.bias`),
      this.w(`${prefix}.encoder_attn.v_proj.weight`),
      this.w(`${prefix}.encoder_attn.v_proj.bias`),
      this.w(`${prefix}.encoder_attn.out_proj.weight`),
      this.w(`${prefix}.encoder_attn.out_proj.bias`),
      N_HEADS, D_MODEL, D_HEAD,
    );
    addInPlace(x, residual);

    // FFN (GPU)
    residual = new Float32Array(x);
    x = await this.dispatch.layerNorm(
      x,
      this.w(`${prefix}.final_layer_norm.weight`),
      this.w(`${prefix}.final_layer_norm.bias`),
      decLen, D_MODEL, EPS,
    );

    x = await this.dispatch.linear(x, this.w(`${prefix}.fc1.weight`), this.tryW(`${prefix}.fc1.bias`), decLen, D_MODEL, D_MLP);
    x = await this.dispatch.gelu(x);
    x = await this.dispatch.linear(x, this.w(`${prefix}.fc2.weight`), this.tryW(`${prefix}.fc2.bias`), decLen, D_MLP, D_MODEL);
    addInPlace(x, residual);

    return x;
  }

  // ── Token Decoding ─────────────────────────────────────────────────

  private greedyDecode(logits: Float32Array): number {
    for (let i = 50257; i < VOCAB_SIZE; i++) {
      if (i !== EOT) logits[i] = -Infinity;
    }

    let bestIdx = 0;
    let bestVal = logits[0];
    for (let i = 1; i < logits.length; i++) {
      if (logits[i] > bestVal) {
        bestVal = logits[i];
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  // ── Public API ─────────────────────────────────────────────────────

  /**
   * Transcribe raw audio to token IDs.
   * GPU-accelerated when WebGPU is available, CPU fallback otherwise.
   *
   * @param audio - 16kHz mono Float32Array PCM samples
   * @param onProgress - Optional progress callback
   * @returns Array of generated token IDs (decode with tokenizer)
   */
  async transcribe(
    audio: Float32Array,
    onProgress?: (p: InferenceProgress) => void,
  ): Promise<number[]> {
    if (!this.ready) {
      throw new Error("[WhisperEngine] Not initialized. Call init() first.");
    }

    this.dispatch.resetStats();
    const t0 = performance.now();

    // Phase 1: Mel spectrogram (CPU — FFT)
    onProgress?.({ phase: "mel", message: "Computing mel spectrogram...", progress: 0.05 });
    const mel = computeMelSpectrogram(audio);
    console.log(`[WhisperEngine] Mel: ${N_MELS}×${N_FRAMES}`);

    // Phase 2: Encoder (GPU-accelerated)
    onProgress?.({ phase: "encoder", message: `Running encoder (${this.dispatch.available ? "GPU" : "CPU"})...`, progress: 0.1 });
    const encStart = performance.now();
    const encoderOutput = await this.encodeAudio(mel);
    const encMs = Math.round(performance.now() - encStart);
    const encLen = N_FRAMES / 2;
    console.log(`[WhisperEngine] Encoder: ${encLen}×${D_MODEL} in ${encMs}ms (${this.dispatch.available ? "GPU" : "CPU"})`);

    // Phase 3: Decoder (GPU-accelerated autoregressive)
    onProgress?.({ phase: "decoder", message: "Decoding tokens...", progress: 0.5 });
    const tokens: number[] = [SOT, LANG_EN, TRANSCRIBE, NO_TIMESTAMPS];

    for (let step = 0; step < MAX_TOKENS; step++) {
      const stepStart = performance.now();
      const logits = await this.decoderStep(tokens, encoderOutput, encLen);
      const nextToken = this.greedyDecode(logits);
      const stepMs = Math.round(performance.now() - stepStart);

      if (nextToken === EOT) {
        console.log(`[WhisperEngine] EOT at step ${step}`);
        break;
      }

      tokens.push(nextToken);
      onProgress?.({
        phase: "decoder",
        message: `Token ${step + 1}: ${nextToken}`,
        progress: 0.5 + (0.45 * step) / MAX_TOKENS,
        tokensGenerated: tokens.length - 4,
      });

      if (step < 5 || step % 10 === 0) {
        console.log(`[WhisperEngine] Step ${step}: token=${nextToken}, ${stepMs}ms`);
      }
    }

    const totalMs = Math.round(performance.now() - t0);
    const generated = tokens.length - 4;
    const stats = this.dispatch.stats;

    console.log(
      `[WhisperEngine] ✅ Done: ${generated} tokens in ${totalMs}ms ` +
      `(${generated > 0 ? Math.round(totalMs / generated) : 0}ms/token) ` +
      `[GPU ops: ${stats.gpuOps}, CPU fallback: ${stats.cpuFallbackOps}, ` +
      `GPU time: ${stats.totalGpuTimeMs.toFixed(1)}ms, device: ${stats.deviceName}]`
    );

    onProgress?.({
      phase: "done",
      message: `Transcribed ${generated} tokens in ${(totalMs / 1000).toFixed(1)}s (${stats.deviceName})`,
      progress: 1,
      tokensGenerated: generated,
    });

    return tokens.slice(4);
  }

  /**
   * Get the architecture constants and GPU stats for display.
   */
  getModelInfo() {
    return {
      dModel: D_MODEL,
      nHeads: N_HEADS,
      encoderLayers: N_ENCODER_LAYERS,
      decoderLayers: N_DECODER_LAYERS,
      vocabSize: VOCAB_SIZE,
      maxPositions: MAX_DECODER_POSITIONS,
      weightsLoaded: this.weights.size,
      totalWeightsMB: this.manifest
        ? (this.manifest.totalWeightBytes / 1024 / 1024).toFixed(1)
        : "0",
      gpuAccelerated: this.dispatch.available,
      gpuDevice: this.dispatch.deviceName,
      gpuStats: this.dispatch.stats,
    };
  }

  /** Release all loaded weights from memory */
  dispose(): void {
    this.weights.clear();
    this.tensorIndex.clear();
    this.manifest = null;
    this.ready = false;
  }
}

// ── Singleton ──────────────────────────────────────────────────────────────

let _engine: WhisperEngine | null = null;

export function getWhisperEngine(): WhisperEngine {
  if (!_engine) _engine = new WhisperEngine();
  return _engine;
}
