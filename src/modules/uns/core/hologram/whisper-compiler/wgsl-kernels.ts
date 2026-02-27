/**
 * Whisper Inference — WGSL Compute Kernels
 * ═════════════════════════════════════════
 *
 * Pure WGSL shaders for every op Whisper needs.
 * No ONNX Runtime, no external dependencies.
 * These run directly on the Hologram vGPU.
 *
 * @module uns/core/hologram/whisper-compiler/wgsl-kernels
 */

// ── MatMul ─────────────────────────────────────────────────────────────────
// C[M×N] = A[M×K] × B[K×N]
// Tiled 16×16 workgroups with shared memory for cache efficiency.

export const WGSL_MATMUL = /* wgsl */ `
struct Dims { M: u32, N: u32, K: u32, _pad: u32 }
@group(0) @binding(0) var<uniform> dims: Dims;
@group(0) @binding(1) var<storage, read> A: array<f32>;
@group(0) @binding(2) var<storage, read> B: array<f32>;
@group(0) @binding(3) var<storage, read_write> C: array<f32>;

const TILE: u32 = 16u;
var<workgroup> tileA: array<f32, 256>; // 16×16
var<workgroup> tileB: array<f32, 256>;

@compute @workgroup_size(16, 16)
fn main(
  @builtin(global_invocation_id) gid: vec3<u32>,
  @builtin(local_invocation_id) lid: vec3<u32>,
  @builtin(workgroup_id) wid: vec3<u32>,
) {
  let row = wid.x * TILE + lid.x;
  let col = wid.y * TILE + lid.y;
  var sum: f32 = 0.0;

  let numTiles = (dims.K + TILE - 1u) / TILE;
  for (var t: u32 = 0u; t < numTiles; t = t + 1u) {
    let aCol = t * TILE + lid.y;
    let bRow = t * TILE + lid.x;

    if (row < dims.M && aCol < dims.K) {
      tileA[lid.x * TILE + lid.y] = A[row * dims.K + aCol];
    } else {
      tileA[lid.x * TILE + lid.y] = 0.0;
    }

    if (bRow < dims.K && col < dims.N) {
      tileB[lid.x * TILE + lid.y] = B[bRow * dims.N + col];
    } else {
      tileB[lid.x * TILE + lid.y] = 0.0;
    }

    workgroupBarrier();

    for (var k: u32 = 0u; k < TILE; k = k + 1u) {
      sum = sum + tileA[lid.x * TILE + k] * tileB[k * TILE + lid.y];
    }

    workgroupBarrier();
  }

  if (row < dims.M && col < dims.N) {
    C[row * dims.N + col] = sum;
  }
}
`;

// ── Layer Normalization ────────────────────────────────────────────────────
// y = gamma * (x - mean) / sqrt(var + eps) + beta
// Two-pass: first pass computes mean+var per row, second normalizes.

export const WGSL_LAYER_NORM = /* wgsl */ `
struct Params {
  N: u32,        // number of rows (batch * seq_len)
  D: u32,        // hidden dimension
  eps: f32,
  _pad: u32,
}
@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> input: array<f32>;
@group(0) @binding(2) var<storage, read> gamma: array<f32>;
@group(0) @binding(3) var<storage, read> beta: array<f32>;
@group(0) @binding(4) var<storage, read_write> output: array<f32>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let row = gid.x;
  if (row >= params.N) { return; }

  let offset = row * params.D;

  // Pass 1: mean
  var mean: f32 = 0.0;
  for (var i: u32 = 0u; i < params.D; i = i + 1u) {
    mean = mean + input[offset + i];
  }
  mean = mean / f32(params.D);

  // Pass 2: variance
  var variance: f32 = 0.0;
  for (var i: u32 = 0u; i < params.D; i = i + 1u) {
    let diff = input[offset + i] - mean;
    variance = variance + diff * diff;
  }
  variance = variance / f32(params.D);

  let inv_std = 1.0 / sqrt(variance + params.eps);

  // Pass 3: normalize
  for (var i: u32 = 0u; i < params.D; i = i + 1u) {
    let normalized = (input[offset + i] - mean) * inv_std;
    output[offset + i] = gamma[i] * normalized + beta[i];
  }
}
`;

// ── GELU Activation ────────────────────────────────────────────────────────
// GELU(x) = 0.5 * x * (1 + tanh(sqrt(2/π) * (x + 0.044715 * x³)))

export const WGSL_GELU = /* wgsl */ `
@group(0) @binding(0) var<storage, read> input: array<f32>;
@group(0) @binding(1) var<storage, read_write> output: array<f32>;

const SQRT_2_OVER_PI: f32 = 0.7978845608;  // sqrt(2/π)
const COEFF: f32 = 0.044715;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let idx = gid.x;
  if (idx >= arrayLength(&input)) { return; }

  let x = input[idx];
  let x3 = x * x * x;
  let inner = SQRT_2_OVER_PI * (x + COEFF * x3);
  output[idx] = 0.5 * x * (1.0 + tanh(inner));
}
`;

// ── Softmax ────────────────────────────────────────────────────────────────
// Numerically stable: subtract max, exp, divide by sum.
// One workgroup per row, uses shared memory for reductions.

export const WGSL_SOFTMAX = /* wgsl */ `
struct Params {
  N: u32,  // number of rows
  D: u32,  // row length (vocab/seq dimension)
  _p0: u32,
  _p1: u32,
}
@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> input: array<f32>;
@group(0) @binding(2) var<storage, read_write> output: array<f32>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let row = gid.x;
  if (row >= params.N) { return; }

  let offset = row * params.D;

  // Find max for numerical stability
  var maxVal: f32 = -3.402823e+38;  // -FLT_MAX
  for (var i: u32 = 0u; i < params.D; i = i + 1u) {
    maxVal = max(maxVal, input[offset + i]);
  }

  // Compute exp(x - max) and sum
  var sumExp: f32 = 0.0;
  for (var i: u32 = 0u; i < params.D; i = i + 1u) {
    let e = exp(input[offset + i] - maxVal);
    output[offset + i] = e;
    sumExp = sumExp + e;
  }

  // Normalize
  let invSum = 1.0 / sumExp;
  for (var i: u32 = 0u; i < params.D; i = i + 1u) {
    output[offset + i] = output[offset + i] * invSum;
  }
}
`;

// ── Scaled Dot-Product Attention ───────────────────────────────────────────
// attn = softmax(Q × K^T / sqrt(d_k)) × V
// Q,K,V are [seq_len × d_k], output is [seq_len × d_k]

export const WGSL_SDPA = /* wgsl */ `
struct Params {
  seq_len: u32,
  d_k: u32,
  scale: f32,  // 1/sqrt(d_k)
  _pad: u32,
}
@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> Q: array<f32>;
@group(0) @binding(2) var<storage, read> K: array<f32>;
@group(0) @binding(3) var<storage, read> V: array<f32>;
@group(0) @binding(4) var<storage, read_write> output: array<f32>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let row = gid.x;
  if (row >= params.seq_len) { return; }

  let S = params.seq_len;
  let D = params.d_k;

  // Step 1: Compute attention scores = Q[row] · K[j]^T / scale
  // Find max for numerical stability
  var maxScore: f32 = -3.402823e+38;
  for (var j: u32 = 0u; j < S; j = j + 1u) {
    var score: f32 = 0.0;
    for (var d: u32 = 0u; d < D; d = d + 1u) {
      score = score + Q[row * D + d] * K[j * D + d];
    }
    score = score * params.scale;
    maxScore = max(maxScore, score);
  }

  // Step 2: Compute softmax weights
  // We need to store scores temporarily; recompute them inline.
  var sumExp: f32 = 0.0;
  for (var j: u32 = 0u; j < S; j = j + 1u) {
    var score: f32 = 0.0;
    for (var d: u32 = 0u; d < D; d = d + 1u) {
      score = score + Q[row * D + d] * K[j * D + d];
    }
    sumExp = sumExp + exp(score * params.scale - maxScore);
  }
  let invSum = 1.0 / sumExp;

  // Step 3: Weighted sum of V
  for (var d: u32 = 0u; d < D; d = d + 1u) {
    var acc: f32 = 0.0;
    for (var j: u32 = 0u; j < S; j = j + 1u) {
      var score: f32 = 0.0;
      for (var dk: u32 = 0u; dk < D; dk = dk + 1u) {
        score = score + Q[row * D + dk] * K[j * D + dk];
      }
      let weight = exp(score * params.scale - maxScore) * invSum;
      acc = acc + weight * V[j * D + d];
    }
    output[row * D + d] = acc;
  }
}
`;

// ── Conv1D ─────────────────────────────────────────────────────────────────
// output[oc, ol] = bias[oc] + Σ_ic Σ_k weight[oc, ic, k] × input[ic, ol*stride - padding + k]
// Each thread computes one (oc, ol) element.

export const WGSL_CONV1D = /* wgsl */ `
struct Params {
  c_in: u32,
  c_out: u32,
  kernel_size: u32,
  in_length: u32,
  out_length: u32,
  stride: u32,
  padding: u32,
  has_bias: u32,
}
@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> input: array<f32>;
@group(0) @binding(2) var<storage, read> weight: array<f32>;
@group(0) @binding(3) var<storage, read> bias: array<f32>;
@group(0) @binding(4) var<storage, read_write> output: array<f32>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let idx = gid.x;
  let total = params.c_out * params.out_length;
  if (idx >= total) { return; }

  let oc = idx / params.out_length;
  let ol = idx % params.out_length;

  var sum: f32 = 0.0;
  if (params.has_bias != 0u) {
    sum = bias[oc];
  }

  let K = params.kernel_size;
  let L = params.in_length;
  let S = params.stride;
  let P = params.padding;

  for (var ic: u32 = 0u; ic < params.c_in; ic = ic + 1u) {
    let wOff = oc * params.c_in * K + ic * K;
    let iBase = ic * L;
    for (var k: u32 = 0u; k < K; k = k + 1u) {
      let il_signed = i32(ol * S) - i32(P) + i32(k);
      if (il_signed >= 0 && il_signed < i32(L)) {
        sum = sum + weight[wOff + k] * input[iBase + u32(il_signed)];
      }
    }
  }

  output[oc * params.out_length + ol] = sum;
}
`;


// ── CPU Reference Implementations ──────────────────────────────────────────
// Used for verification and as fallback when WebGPU is unavailable.

export function cpuMatmul(A: Float32Array, B: Float32Array, M: number, N: number, K: number): Float32Array {
  const C = new Float32Array(M * N);
  for (let i = 0; i < M; i++) {
    for (let j = 0; j < N; j++) {
      let sum = 0;
      for (let k = 0; k < K; k++) {
        sum += A[i * K + k] * B[k * N + j];
      }
      C[i * N + j] = sum;
    }
  }
  return C;
}

export function cpuLayerNorm(
  input: Float32Array, gamma: Float32Array, beta: Float32Array,
  N: number, D: number, eps: number = 1e-5,
): Float32Array {
  const output = new Float32Array(N * D);
  for (let row = 0; row < N; row++) {
    const off = row * D;
    let mean = 0;
    for (let i = 0; i < D; i++) mean += input[off + i];
    mean /= D;

    let variance = 0;
    for (let i = 0; i < D; i++) {
      const diff = input[off + i] - mean;
      variance += diff * diff;
    }
    variance /= D;

    const invStd = 1 / Math.sqrt(variance + eps);
    for (let i = 0; i < D; i++) {
      output[off + i] = gamma[i] * ((input[off + i] - mean) * invStd) + beta[i];
    }
  }
  return output;
}

export function cpuGelu(input: Float32Array): Float32Array {
  const output = new Float32Array(input.length);
  const SQRT_2_OVER_PI = 0.7978845608;
  const COEFF = 0.044715;
  for (let i = 0; i < input.length; i++) {
    const x = input[i];
    const inner = SQRT_2_OVER_PI * (x + COEFF * x * x * x);
    output[i] = 0.5 * x * (1 + Math.tanh(inner));
  }
  return output;
}

export function cpuSoftmax(input: Float32Array, N: number, D: number): Float32Array {
  const output = new Float32Array(N * D);
  for (let row = 0; row < N; row++) {
    const off = row * D;
    let maxVal = -Infinity;
    for (let i = 0; i < D; i++) maxVal = Math.max(maxVal, input[off + i]);

    let sumExp = 0;
    for (let i = 0; i < D; i++) {
      const e = Math.exp(input[off + i] - maxVal);
      output[off + i] = e;
      sumExp += e;
    }
    for (let i = 0; i < D; i++) output[off + i] /= sumExp;
  }
  return output;
}

export function cpuScaledDotProductAttention(
  Q: Float32Array, K: Float32Array, V: Float32Array,
  seqLen: number, dk: number,
): Float32Array {
  const scale = 1 / Math.sqrt(dk);
  const output = new Float32Array(seqLen * dk);

  for (let i = 0; i < seqLen; i++) {
    // Compute scores
    const scores = new Float32Array(seqLen);
    let maxScore = -Infinity;
    for (let j = 0; j < seqLen; j++) {
      let s = 0;
      for (let d = 0; d < dk; d++) s += Q[i * dk + d] * K[j * dk + d];
      scores[j] = s * scale;
      maxScore = Math.max(maxScore, scores[j]);
    }

    // Softmax
    let sumExp = 0;
    for (let j = 0; j < seqLen; j++) {
      scores[j] = Math.exp(scores[j] - maxScore);
      sumExp += scores[j];
    }
    for (let j = 0; j < seqLen; j++) scores[j] /= sumExp;

    // Weighted sum of V
    for (let d = 0; d < dk; d++) {
      let acc = 0;
      for (let j = 0; j < seqLen; j++) acc += scores[j] * V[j * dk + d];
      output[i * dk + d] = acc;
    }
  }
  return output;
}

export function cpuConv1d(
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

// ── Kernel Registry ────────────────────────────────────────────────────────

export const WHISPER_KERNELS = {
  matmul: WGSL_MATMUL,
  layer_norm: WGSL_LAYER_NORM,
  gelu: WGSL_GELU,
  softmax: WGSL_SOFTMAX,
  sdpa: WGSL_SDPA,
  conv1d: WGSL_CONV1D,
} as const;

export type WhisperKernelName = keyof typeof WHISPER_KERNELS;
