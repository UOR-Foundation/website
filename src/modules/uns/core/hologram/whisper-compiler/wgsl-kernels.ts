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

// ── Fused Attention ───────────────────────────────────────────────────────
// Single-dispatch kernel: Q×K^T scaling + optional causal mask + softmax + V multiply.
// Eliminates 3 separate dispatches (matmul, softmax, matmul) + CPU scaling/masking.
// Each workgroup handles one query row. 256 threads cooperate on the dot products.
//
// Params:  q_len  = number of query rows
//          kv_len = number of key/value rows
//          d_k    = head dimension
//          causal = 1 for causal mask, 0 for no mask

export const WGSL_FUSED_ATTN = /* wgsl */ `
struct Params {
  q_len: u32,
  kv_len: u32,
  d_k: u32,
  causal: u32,       // 1 = causal, 0 = no mask
  scale: f32,         // 1/sqrt(d_k)
  causal_offset: u32, // for cached attention: base position of queries in full sequence
  _p0: u32,
  _p1: u32,
}
@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> Q: array<f32>;      // [q_len, d_k]
@group(0) @binding(2) var<storage, read> K: array<f32>;      // [kv_len, d_k]
@group(0) @binding(3) var<storage, read> V: array<f32>;      // [kv_len, d_k]
@group(0) @binding(4) var<storage, read_write> output: array<f32>; // [q_len, d_k]

// Shared memory for cooperative score computation
var<workgroup> scores: array<f32, 4096>;  // max kv_len = 4096

@compute @workgroup_size(256)
fn main(
  @builtin(workgroup_id) wid: vec3<u32>,
  @builtin(local_invocation_id) lid: vec3<u32>,
) {
  let q_row = wid.x;
  if (q_row >= params.q_len) { return; }
  let tid = lid.x;

  let S = params.kv_len;
  let D = params.d_k;

  // ── Phase 1: Compute Q[q_row] · K[j]^T × scale for all j ─────────
  // Each thread handles ceil(S/256) keys
  let keys_per_thread = (S + 255u) / 256u;

  for (var ki: u32 = 0u; ki < keys_per_thread; ki = ki + 1u) {
    let j = tid * keys_per_thread + ki;
    if (j >= S) { break; }

    var dot: f32 = 0.0;
    for (var d: u32 = 0u; d < D; d = d + 1u) {
      dot = dot + Q[q_row * D + d] * K[j * D + d];
    }
    var score = dot * params.scale;

    // Apply causal mask
    if (params.causal != 0u) {
      let q_pos = params.causal_offset + q_row;
      if (j > q_pos) {
        score = -1e9;
      }
    }

    scores[j] = score;
  }

  workgroupBarrier();

  // ── Phase 2: Softmax (cooperative) ────────────────────────────────
  // 2a: Find max (parallel reduction)
  // Each thread computes max of its chunk
  var local_max: f32 = -3.402823e+38;
  for (var ki: u32 = 0u; ki < keys_per_thread; ki = ki + 1u) {
    let j = tid * keys_per_thread + ki;
    if (j < S) {
      local_max = max(local_max, scores[j]);
    }
  }

  // Store local max back for cooperative reduction (reuse a small portion of scores after S)
  // Since we only have scores array, do a manual sequential pass for the reduction.
  // For S <= 4096, a single-thread pass is fast enough after workgroupBarrier.
  workgroupBarrier();

  // Thread 0 does the final max/sum (simpler and avoids extra shared memory)
  if (tid == 0u) {
    var maxVal: f32 = -3.402823e+38;
    for (var j: u32 = 0u; j < S; j = j + 1u) {
      maxVal = max(maxVal, scores[j]);
    }
    // 2b: Compute exp and sum
    var sumExp: f32 = 0.0;
    for (var j: u32 = 0u; j < S; j = j + 1u) {
      let e = exp(scores[j] - maxVal);
      scores[j] = e;
      sumExp = sumExp + e;
    }
    // 2c: Normalize
    let invSum = 1.0 / sumExp;
    for (var j: u32 = 0u; j < S; j = j + 1u) {
      scores[j] = scores[j] * invSum;
    }
  }

  workgroupBarrier();

  // ── Phase 3: Output = weights × V ─────────────────────────────────
  // Each thread computes ceil(D/256) output dimensions
  let dims_per_thread = (D + 255u) / 256u;

  for (var di: u32 = 0u; di < dims_per_thread; di = di + 1u) {
    let d = tid * dims_per_thread + di;
    if (d >= D) { break; }

    var acc: f32 = 0.0;
    for (var j: u32 = 0u; j < S; j = j + 1u) {
      acc = acc + scores[j] * V[j * D + d];
    }
    output[q_row * D + d] = acc;
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

// ── Mel Spectrogram (STFT Power → Mel Filterbank) ─────────────────────────
// Each thread computes one (mel_bin, frame) element.
// Input: windowed audio frames [nFrames × fftSize] (pre-windowed on CPU)
// Filterbank: [nMels × nFreqs] (triangular mel filters, flattened)
// Output: [nMels × nFrames] (log-mel spectrogram before normalization)
//
// The FFT is done per-frame in shared memory using a radix-2 Cooley-Tukey.
// fftSize MUST be 512 (hardcoded for Whisper).

export const WGSL_MEL_SPEC = /* wgsl */ `
struct Params {
  n_frames: u32,
  fft_size: u32,   // 512
  n_freqs: u32,    // 257
  n_mels: u32,     // 80
  n_fft: u32,      // 400 (window length before zero-pad)
  hop_length: u32,  // 160
  _p0: u32,
  _p1: u32,
}
@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> audio: array<f32>;       // padded audio [n_samples]
@group(0) @binding(2) var<storage, read> window_fn: array<f32>;   // hann window [n_fft]
@group(0) @binding(3) var<storage, read> filterbank: array<f32>;  // [n_mels × n_freqs]
@group(0) @binding(4) var<storage, read_write> output: array<f32>; // [n_mels × n_frames]

// Twiddle factors for 512-point FFT (precomputed on CPU)
@group(0) @binding(5) var<storage, read> twiddle_re: array<f32>;  // cos(-2πk/N) for each stage
@group(0) @binding(6) var<storage, read> twiddle_im: array<f32>;  // sin(-2πk/N) for each stage

// Each workgroup processes ONE frame.
// 256 threads per workgroup cooperatively compute the FFT and mel bands.
var<workgroup> fft_re: array<f32, 512>;
var<workgroup> fft_im: array<f32, 512>;

@compute @workgroup_size(256)
fn main(
  @builtin(workgroup_id) wid: vec3<u32>,
  @builtin(local_invocation_id) lid: vec3<u32>,
) {
  let frame = wid.x;
  if (frame >= params.n_frames) { return; }
  let tid = lid.x;

  let audio_start = frame * params.hop_length;

  // ── Load & window audio into shared memory (2 elements per thread) ──
  let idx0 = tid;
  let idx1 = tid + 256u;

  // Apply Hann window and zero-pad
  if (idx0 < params.n_fft) {
    fft_re[idx0] = audio[audio_start + idx0] * window_fn[idx0];
  } else {
    fft_re[idx0] = 0.0;
  }
  fft_im[idx0] = 0.0;

  if (idx1 < params.fft_size) {
    if (idx1 < params.n_fft) {
      fft_re[idx1] = audio[audio_start + idx1] * window_fn[idx1];
    } else {
      fft_re[idx1] = 0.0;
    }
    fft_im[idx1] = 0.0;
  }

  workgroupBarrier();

  // ── Bit-reversal permutation ────────────────────────────────────────
  // Each thread swaps its two indices if needed
  let N = params.fft_size; // 512
  let bits = 9u; // log2(512)

  // Bit-reverse function inline
  var rev0: u32 = 0u;
  var tmp0 = idx0;
  for (var b: u32 = 0u; b < bits; b = b + 1u) {
    rev0 = (rev0 << 1u) | (tmp0 & 1u);
    tmp0 = tmp0 >> 1u;
  }
  var rev1: u32 = 0u;
  var tmp1 = idx1;
  for (var b: u32 = 0u; b < bits; b = b + 1u) {
    rev1 = (rev1 << 1u) | (tmp1 & 1u);
    tmp1 = tmp1 >> 1u;
  }

  workgroupBarrier();

  // Swap for bit-reversal (copy through temporaries)
  let re0 = fft_re[idx0]; let im0 = fft_im[idx0];
  let re1 = fft_re[idx1]; let im1 = fft_im[idx1];

  workgroupBarrier();

  if (idx0 < rev0) {
    fft_re[rev0] = re0; fft_im[rev0] = im0;
    fft_re[idx0] = fft_re[rev0]; // will be overwritten below
  }
  // Simpler: just do a full copy-out/copy-in via shared memory
  // Actually, the canonical GPU approach is to read from source position:
  // For correctness with parallel swaps, we use a two-pass approach.

  // PASS 1: Store originals
  workgroupBarrier();

  // Correct bit-reversal: read from reversed index
  let src_re0 = fft_re[rev0]; let src_im0 = fft_im[rev0];
  var src_re1: f32 = 0.0; var src_im1: f32 = 0.0;
  if (idx1 < N) {
    src_re1 = fft_re[rev1]; src_im1 = fft_im[rev1];
  }

  workgroupBarrier();

  fft_re[idx0] = src_re0; fft_im[idx0] = src_im0;
  if (idx1 < N) {
    fft_re[idx1] = src_re1; fft_im[idx1] = src_im1;
  }

  workgroupBarrier();

  // ── Butterfly stages ────────────────────────────────────────────────
  // 9 stages for N=512: len = 2,4,8,...,512
  var twiddle_offset: u32 = 0u;
  for (var stage: u32 = 0u; stage < bits; stage = stage + 1u) {
    let len = 1u << (stage + 1u);      // 2,4,8,...,512
    let half_len = 1u << stage;         // 1,2,4,...,256

    // Each thread processes two butterfly pairs
    for (var pass: u32 = 0u; pass < 2u; pass = pass + 1u) {
      let i = select(idx0, idx1, pass == 1u);
      if (i >= N) { continue; }

      let block = i / len;
      let pos = i % len;

      if (pos < half_len) {
        let a = block * len + pos;
        let b_idx = a + half_len;

        let tw_idx = twiddle_offset + pos;
        let tw_re = twiddle_re[tw_idx];
        let tw_im = twiddle_im[tw_idx];

        let br = fft_re[b_idx];
        let bi = fft_im[b_idx];

        let t_re = br * tw_re - bi * tw_im;
        let t_im = br * tw_im + bi * tw_re;

        fft_re[b_idx] = fft_re[a] - t_re;
        fft_im[b_idx] = fft_im[a] - t_im;
        fft_re[a] = fft_re[a] + t_re;
        fft_im[a] = fft_im[a] + t_im;
      }
    }

    twiddle_offset = twiddle_offset + half_len;
    workgroupBarrier();
  }

  // ── Power spectrum → mel filterbank ─────────────────────────────────
  // Each thread computes ceil(n_mels / 256) mel bands for this frame
  let mels_per_thread = (params.n_mels + 255u) / 256u;

  for (var mi: u32 = 0u; mi < mels_per_thread; mi = mi + 1u) {
    let m = tid * mels_per_thread + mi;
    if (m >= params.n_mels) { break; }

    var sum: f32 = 0.0;
    let fb_offset = m * params.n_freqs;

    for (var k: u32 = 0u; k < params.n_freqs; k = k + 1u) {
      let power = fft_re[k] * fft_re[k] + fft_im[k] * fft_im[k];
      sum = sum + filterbank[fb_offset + k] * power;
    }

    // Store in [n_mels × n_frames] row-major
    output[m * params.n_frames + frame] = sum;
  }
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

/** CPU fallback for fused attention (matches the WGSL kernel exactly) */
export function cpuFusedAttention(
  Q: Float32Array, K: Float32Array, V: Float32Array,
  qLen: number, kvLen: number, dk: number,
  causal: boolean, causalOffset = 0,
): Float32Array {
  const scale = 1 / Math.sqrt(dk);
  const output = new Float32Array(qLen * dk);

  for (let i = 0; i < qLen; i++) {
    const scores = new Float32Array(kvLen);
    let maxScore = -Infinity;
    for (let j = 0; j < kvLen; j++) {
      let dot = 0;
      for (let d = 0; d < dk; d++) dot += Q[i * dk + d] * K[j * dk + d];
      let s = dot * scale;
      if (causal && j > causalOffset + i) s = -1e9;
      scores[j] = s;
      maxScore = Math.max(maxScore, s);
    }
    let sumExp = 0;
    for (let j = 0; j < kvLen; j++) {
      scores[j] = Math.exp(scores[j] - maxScore);
      sumExp += scores[j];
    }
    for (let j = 0; j < kvLen; j++) scores[j] /= sumExp;
    for (let d = 0; d < dk; d++) {
      let acc = 0;
      for (let j = 0; j < kvLen; j++) acc += scores[j] * V[j * dk + d];
      output[i * dk + d] = acc;
    }
  }
  return output;
}

export const WHISPER_KERNELS = {
  matmul: WGSL_MATMUL,
  layer_norm: WGSL_LAYER_NORM,
  gelu: WGSL_GELU,
  softmax: WGSL_SOFTMAX,
  sdpa: WGSL_SDPA,
  conv1d: WGSL_CONV1D,
  mel_spec: WGSL_MEL_SPEC,
  fused_attn: WGSL_FUSED_ATTN,
} as const;

export type WhisperKernelName = keyof typeof WHISPER_KERNELS;
