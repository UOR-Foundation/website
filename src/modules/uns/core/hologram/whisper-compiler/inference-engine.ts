/**
 * Whisper Inference Engine — Phase 3
 * ═══════════════════════════════════
 *
 * Runs Whisper tiny.en inference using compiled weights from
 * the Hologram weight store. CPU-first with GPU dispatch hooks.
 *
 * Architecture (Whisper tiny.en):
 *   Encoder: Conv1D(80→384,k=3) → GELU → Conv1D(384→384,k=3,s=2) → GELU
 *            → positional → 4× TransformerBlock → LayerNorm
 *   Decoder: TokenEmbed + PosEmbed → 4× TransformerBlock (with cross-attn)
 *            → LayerNorm → lm_head (logits)
 *
 * @module uns/core/hologram/whisper-compiler/inference-engine
 */

import { getWeightStore, type HologramWeightStore } from "./weight-store";
import { loadCompiledWhisper } from "./compiler";
import { computeMelSpectrogram, N_MELS, N_FRAMES } from "./mel-spectrogram";
import {
  cpuMatmul,
  cpuLayerNorm,
  cpuGelu,
  cpuSoftmax,
} from "./wgsl-kernels";
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
const SOT = 50258;        // <|startoftranscript|>
const LANG_EN = 50259;    // <|en|>
const TRANSCRIBE = 50360; // <|transcribe|>
const NO_TIMESTAMPS = 50364; // <|notimestamps|>
const EOT = 50257;        // <|endoftext|>
const MAX_TOKENS = 224;   // Max generated tokens

// ── Tensor Ops (CPU) ───────────────────────────────────────────────────────

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

/** Linear: input [N, K] × weight [M, K]^T + bias [M] → [N, M] */
function linear(
  input: Float32Array, weight: Float32Array, bias: Float32Array | null,
  N: number, K: number, M: number,
): Float32Array {
  // Weight is stored as [M, K], need [K, M] for matmul
  const wT = transpose2d(weight, M, K);
  const out = cpuMatmul(input, wT, N, M, K);
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
 * Multi-head self-attention (optionally causal).
 * input [T, D], Q/K/V projections, output projection.
 */
function multiHeadAttention(
  input: Float32Array, seqLen: number,
  qW: Float32Array, qB: Float32Array,
  kW: Float32Array, kB: Float32Array | null,
  vW: Float32Array, vB: Float32Array,
  outW: Float32Array, outB: Float32Array,
  causal: boolean,
): Float32Array {
  const Q = linear(input, qW, qB, seqLen, D_MODEL, D_MODEL);
  const K = linear(input, kW, kB, seqLen, D_MODEL, D_MODEL);
  const V = linear(input, vW, vB, seqLen, D_MODEL, D_MODEL);

  const scale = 1 / Math.sqrt(D_HEAD);
  const attnOut = new Float32Array(seqLen * D_MODEL);

  // Per-head attention
  for (let h = 0; h < N_HEADS; h++) {
    const headOff = h * D_HEAD;

    // Extract Q_h, K_h, V_h: [seqLen, D_HEAD]
    const Qh = new Float32Array(seqLen * D_HEAD);
    const Kh = new Float32Array(seqLen * D_HEAD);
    const Vh = new Float32Array(seqLen * D_HEAD);

    for (let t = 0; t < seqLen; t++) {
      for (let d = 0; d < D_HEAD; d++) {
        Qh[t * D_HEAD + d] = Q[t * D_MODEL + headOff + d];
        Kh[t * D_HEAD + d] = K[t * D_MODEL + headOff + d];
        Vh[t * D_HEAD + d] = V[t * D_MODEL + headOff + d];
      }
    }

    // Attention scores: [seqLen, seqLen]
    const scores = cpuMatmul(Qh, transpose2d(Kh, seqLen, D_HEAD), seqLen, seqLen, D_HEAD);
    for (let i = 0; i < scores.length; i++) scores[i] *= scale;

    // Apply causal mask
    if (causal) {
      for (let i = 0; i < seqLen; i++) {
        for (let j = i + 1; j < seqLen; j++) {
          scores[i * seqLen + j] = -1e9;
        }
      }
    }

    // Softmax per row
    const weights = cpuSoftmax(scores, seqLen, seqLen);

    // Weighted sum: [seqLen, D_HEAD]
    const headOut = cpuMatmul(weights, Vh, seqLen, D_HEAD, seqLen);

    // Write back to combined output
    for (let t = 0; t < seqLen; t++) {
      for (let d = 0; d < D_HEAD; d++) {
        attnOut[t * D_MODEL + headOff + d] = headOut[t * D_HEAD + d];
      }
    }
  }

  // Output projection
  return linear(attnOut, outW, outB, seqLen, D_MODEL, D_MODEL);
}

/**
 * Cross-attention: queries from decoder, keys/values from encoder.
 */
function crossAttention(
  input: Float32Array, decLen: number,
  encOutput: Float32Array, encLen: number,
  qW: Float32Array, qB: Float32Array,
  kW: Float32Array, kB: Float32Array | null,
  vW: Float32Array, vB: Float32Array,
  outW: Float32Array, outB: Float32Array,
): Float32Array {
  const Q = linear(input, qW, qB, decLen, D_MODEL, D_MODEL);
  const K = linear(encOutput, kW, kB, encLen, D_MODEL, D_MODEL);
  const V = linear(encOutput, vW, vB, encLen, D_MODEL, D_MODEL);

  const scale = 1 / Math.sqrt(D_HEAD);
  const attnOut = new Float32Array(decLen * D_MODEL);

  for (let h = 0; h < N_HEADS; h++) {
    const headOff = h * D_HEAD;

    const Qh = new Float32Array(decLen * D_HEAD);
    const Kh = new Float32Array(encLen * D_HEAD);
    const Vh = new Float32Array(encLen * D_HEAD);

    for (let t = 0; t < decLen; t++) {
      for (let d = 0; d < D_HEAD; d++) {
        Qh[t * D_HEAD + d] = Q[t * D_MODEL + headOff + d];
      }
    }
    for (let t = 0; t < encLen; t++) {
      for (let d = 0; d < D_HEAD; d++) {
        Kh[t * D_HEAD + d] = K[t * D_MODEL + headOff + d];
        Vh[t * D_HEAD + d] = V[t * D_MODEL + headOff + d];
      }
    }

    // Scores: [decLen, encLen]
    const scores = cpuMatmul(Qh, transpose2d(Kh, encLen, D_HEAD), decLen, encLen, D_HEAD);
    for (let i = 0; i < scores.length; i++) scores[i] *= scale;

    const weights = cpuSoftmax(scores, decLen, encLen);
    const headOut = cpuMatmul(weights, Vh, decLen, D_HEAD, encLen);

    for (let t = 0; t < decLen; t++) {
      for (let d = 0; d < D_HEAD; d++) {
        attnOut[t * D_MODEL + headOff + d] = headOut[t * D_HEAD + d];
      }
    }
  }

  return linear(attnOut, outW, outB, decLen, D_MODEL, D_MODEL);
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

  constructor() {
    this.store = getWeightStore();
  }

  // ── Initialization ─────────────────────────────────────────────────

  /**
   * Load compiled model weights into memory.
   * Must be called before transcribe().
   */
  async init(
    onProgress?: (loaded: number, total: number) => void,
  ): Promise<void> {
    if (this.ready) return;

    await this.store.init();
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

      // Convert to Float32Array (most weights are float32)
      const float32 = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
      this.weights.set(desc.name, float32);
      onProgress?.(i + 1, total);
    }

    console.log(`[WhisperEngine] ✅ Loaded ${this.weights.size}/${total} tensors`);

    // Log discovered weight names for debugging
    const names = [...this.weights.keys()].sort();
    console.log(`[WhisperEngine] Weight names (first 20):`, names.slice(0, 20));

    this.ready = true;
  }

  /** Check if engine is ready for inference */
  get isReady(): boolean {
    return this.ready;
  }

  // ── Weight Lookup ──────────────────────────────────────────────────

  /**
   * Find a weight tensor by partial name match.
   * Tries exact match first, then substring match.
   */
  private w(pattern: string): Float32Array {
    // Try exact match
    if (this.weights.has(pattern)) return this.weights.get(pattern)!;

    // Try with common prefixes
    for (const prefix of ["encoder/", "decoder/"]) {
      if (this.weights.has(prefix + pattern)) {
        return this.weights.get(prefix + pattern)!;
      }
    }

    // Substring match (last resort)
    for (const [name, data] of this.weights) {
      if (name.includes(pattern)) return data;
    }

    throw new Error(`[WhisperEngine] Weight not found: "${pattern}"`);
  }

  /** Try to find a weight, return null if not found */
  private tryW(pattern: string): Float32Array | null {
    try {
      return this.w(pattern);
    } catch {
      return null;
    }
  }

  // ── Encoder Forward Pass ───────────────────────────────────────────

  /**
   * Run the Whisper encoder on mel features.
   * Input:  [N_MELS, N_FRAMES] = [80, 3000]
   * Output: [1500, D_MODEL] = [1500, 384]
   */
  private encodeAudio(mel: Float32Array): Float32Array {
    const T_mel = N_FRAMES; // 3000

    // Conv1: [80, 3000] → [384, 3000]
    let x = conv1d(
      mel, this.w("conv1.weight"), this.tryW("conv1.bias"),
      N_MELS, D_MODEL, 3, T_mel, 1, 1,
    );
    x = cpuGelu(x);

    // Conv2: [384, 3000] → [384, 1500] (stride=2)
    const T_conv1 = T_mel; // 3000
    x = conv1d(
      x, this.w("conv2.weight"), this.tryW("conv2.bias"),
      D_MODEL, D_MODEL, 3, T_conv1, 2, 1,
    );
    x = cpuGelu(x);

    // Transpose [384, 1500] → [1500, 384]
    const T_enc = Math.floor((T_conv1 + 2 * 1 - 3) / 2) + 1; // 1500
    x = transpose2d(x, D_MODEL, T_enc);

    // Add positional embedding [1500, 384]
    const posEmbed = this.w("embed_positions.weight");
    addInPlace(x, posEmbed.subarray(0, T_enc * D_MODEL));

    // Encoder transformer blocks
    for (let layer = 0; layer < N_ENCODER_LAYERS; layer++) {
      const prefix = `layers.${layer}`;
      x = this.encoderBlock(x, T_enc, prefix);
    }

    // Final layer norm
    x = cpuLayerNorm(
      x,
      this.w("encoder.layer_norm.weight") ?? this.w("layer_norm.weight"),
      this.w("encoder.layer_norm.bias") ?? this.w("layer_norm.bias"),
      T_enc, D_MODEL, EPS,
    );

    return x; // [1500, 384]
  }

  private encoderBlock(x: Float32Array, seqLen: number, prefix: string): Float32Array {
    // Self-attention sub-layer
    let residual = new Float32Array(x);
    x = cpuLayerNorm(
      x,
      this.w(`${prefix}.self_attn_layer_norm.weight`),
      this.w(`${prefix}.self_attn_layer_norm.bias`),
      seqLen, D_MODEL, EPS,
    );

    x = multiHeadAttention(
      x, seqLen,
      this.w(`${prefix}.self_attn.q_proj.weight`),
      this.w(`${prefix}.self_attn.q_proj.bias`),
      this.w(`${prefix}.self_attn.k_proj.weight`),
      this.tryW(`${prefix}.self_attn.k_proj.bias`),
      this.w(`${prefix}.self_attn.v_proj.weight`),
      this.w(`${prefix}.self_attn.v_proj.bias`),
      this.w(`${prefix}.self_attn.out_proj.weight`),
      this.w(`${prefix}.self_attn.out_proj.bias`),
      false, // not causal
    );

    addInPlace(x, residual);

    // FFN sub-layer
    residual = new Float32Array(x);
    x = cpuLayerNorm(
      x,
      this.w(`${prefix}.final_layer_norm.weight`),
      this.w(`${prefix}.final_layer_norm.bias`),
      seqLen, D_MODEL, EPS,
    );

    x = linear(x, this.w(`${prefix}.fc1.weight`), this.tryW(`${prefix}.fc1.bias`), seqLen, D_MODEL, D_MLP);
    x = cpuGelu(x);
    x = linear(x, this.w(`${prefix}.fc2.weight`), this.tryW(`${prefix}.fc2.bias`), seqLen, D_MLP, D_MODEL);

    addInPlace(x, residual);
    return x;
  }

  // ── Decoder Forward Pass ───────────────────────────────────────────

  /**
   * Run one decoder step. Returns logits [VOCAB_SIZE] for the next token.
   * tokens: sequence generated so far
   * encoderOutput: [encLen, D_MODEL]
   */
  private decoderStep(
    tokens: number[],
    encoderOutput: Float32Array,
    encLen: number,
  ): Float32Array {
    const T = tokens.length;

    // Token + positional embedding
    const tokenEmbed = this.w("embed_tokens.weight");
    let x = embedding(tokenEmbed, D_MODEL, tokens);
    const posEmbed = this.w("decoder") ? this.w("embed_positions.weight") : this.w("embed_positions.weight");
    // Add positional embedding (decoder positions)
    for (let t = 0; t < T; t++) {
      for (let d = 0; d < D_MODEL; d++) {
        x[t * D_MODEL + d] += posEmbed[t * D_MODEL + d];
      }
    }

    // Decoder blocks
    for (let layer = 0; layer < N_DECODER_LAYERS; layer++) {
      const prefix = `layers.${layer}`;
      x = this.decoderBlock(x, T, encoderOutput, encLen, prefix);
    }

    // Final layer norm
    x = cpuLayerNorm(
      x,
      this.w("layer_norm.weight"),
      this.w("layer_norm.bias"),
      T, D_MODEL, EPS,
    );

    // LM head: project last token to vocab logits
    // Whisper uses weight tying: lm_head = embed_tokens.weight.T
    const lastHidden = x.subarray((T - 1) * D_MODEL, T * D_MODEL);
    const logits = new Float32Array(VOCAB_SIZE);

    for (let v = 0; v < VOCAB_SIZE; v++) {
      let sum = 0;
      const off = v * D_MODEL;
      for (let d = 0; d < D_MODEL; d++) {
        sum += lastHidden[d] * tokenEmbed[off + d];
      }
      logits[v] = sum;
    }

    return logits;
  }

  private decoderBlock(
    x: Float32Array, decLen: number,
    encOutput: Float32Array, encLen: number,
    prefix: string,
  ): Float32Array {
    // Causal self-attention
    let residual = new Float32Array(x);
    x = cpuLayerNorm(
      x,
      this.w(`${prefix}.self_attn_layer_norm.weight`),
      this.w(`${prefix}.self_attn_layer_norm.bias`),
      decLen, D_MODEL, EPS,
    );

    x = multiHeadAttention(
      x, decLen,
      this.w(`${prefix}.self_attn.q_proj.weight`),
      this.w(`${prefix}.self_attn.q_proj.bias`),
      this.w(`${prefix}.self_attn.k_proj.weight`),
      this.tryW(`${prefix}.self_attn.k_proj.bias`),
      this.w(`${prefix}.self_attn.v_proj.weight`),
      this.w(`${prefix}.self_attn.v_proj.bias`),
      this.w(`${prefix}.self_attn.out_proj.weight`),
      this.w(`${prefix}.self_attn.out_proj.bias`),
      true, // causal
    );
    addInPlace(x, residual);

    // Cross-attention
    residual = new Float32Array(x);
    x = cpuLayerNorm(
      x,
      this.w(`${prefix}.encoder_attn_layer_norm.weight`),
      this.w(`${prefix}.encoder_attn_layer_norm.bias`),
      decLen, D_MODEL, EPS,
    );

    x = crossAttention(
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
    );
    addInPlace(x, residual);

    // FFN
    residual = new Float32Array(x);
    x = cpuLayerNorm(
      x,
      this.w(`${prefix}.final_layer_norm.weight`),
      this.w(`${prefix}.final_layer_norm.bias`),
      decLen, D_MODEL, EPS,
    );

    x = linear(x, this.w(`${prefix}.fc1.weight`), this.tryW(`${prefix}.fc1.bias`), decLen, D_MODEL, D_MLP);
    x = cpuGelu(x);
    x = linear(x, this.w(`${prefix}.fc2.weight`), this.tryW(`${prefix}.fc2.bias`), decLen, D_MLP, D_MODEL);
    addInPlace(x, residual);

    return x;
  }

  // ── Token Decoding ─────────────────────────────────────────────────

  /**
   * Greedy argmax over logits.
   * Suppresses special tokens except EOT.
   */
  private greedyDecode(logits: Float32Array): number {
    // Suppress special tokens (except EOT at 50257)
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

    const t0 = performance.now();

    // Phase 1: Mel spectrogram
    onProgress?.({ phase: "mel", message: "Computing mel spectrogram...", progress: 0.05 });
    const mel = computeMelSpectrogram(audio);
    console.log(`[WhisperEngine] Mel: ${N_MELS}×${N_FRAMES}`);

    // Phase 2: Encoder
    onProgress?.({ phase: "encoder", message: "Running encoder...", progress: 0.1 });
    const encStart = performance.now();
    const encoderOutput = this.encodeAudio(mel);
    const encMs = Math.round(performance.now() - encStart);
    const encLen = N_FRAMES / 2; // 1500 (after stride-2 conv)
    console.log(`[WhisperEngine] Encoder: ${encLen}×${D_MODEL} in ${encMs}ms`);

    // Phase 3: Decoder (autoregressive)
    onProgress?.({ phase: "decoder", message: "Decoding tokens...", progress: 0.5 });
    const tokens: number[] = [SOT, LANG_EN, TRANSCRIBE, NO_TIMESTAMPS];

    for (let step = 0; step < MAX_TOKENS; step++) {
      const stepStart = performance.now();
      const logits = this.decoderStep(tokens, encoderOutput, encLen);
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
        tokensGenerated: tokens.length - 4, // exclude prompt
      });

      if (step < 5 || step % 10 === 0) {
        console.log(`[WhisperEngine] Step ${step}: token=${nextToken}, ${stepMs}ms`);
      }
    }

    const totalMs = Math.round(performance.now() - t0);
    const generated = tokens.length - 4;
    console.log(
      `[WhisperEngine] ✅ Done: ${generated} tokens in ${totalMs}ms ` +
      `(${generated > 0 ? Math.round(totalMs / generated) : 0}ms/token)`
    );

    onProgress?.({
      phase: "done",
      message: `Transcribed ${generated} tokens in ${(totalMs / 1000).toFixed(1)}s`,
      progress: 1,
      tokensGenerated: generated,
    });

    // Return only generated tokens (exclude prompt)
    return tokens.slice(4);
  }

  /**
   * Get the architecture constants for display.
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
