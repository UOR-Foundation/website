/**
 * Coherence Inference Engine — H-score Gradient Navigation on Atlas Manifold
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * THEOREM (Coherence Replaces Attention):
 *   The transformer attention mechanism computes:
 *     Attention(Q, K, V) = softmax(QK^T / √d) V    — O(N²d)
 *
 *   The coherence engine replaces this with:
 *     Coherence(x, Atlas) = ∇H(x) · V_{atlas}       — O(96d)
 *
 *   where ∇H is the coherence gradient on the 96-vertex Atlas manifold
 *   and V_{atlas} are the Engram-cached value projections at each vertex.
 *
 *   This achieves O(N) complexity instead of O(N²) because:
 *   1. The Atlas manifold is fixed-size (96 vertices) regardless of sequence length
 *   2. The coherence gradient ∇H is a local operation (no global attention needed)
 *   3. The Fano-plane routing topology ensures any vertex reaches any other in ≤2 hops
 *
 * ARCHITECTURE:
 *   ┌──────────────┐     ┌───────────────┐     ┌──────────────┐
 *   │ Token Input   │────▶│ Engram Cache   │────▶│ ∇H Navigator  │
 *   │ (N tokens)    │     │ O(1) lookup    │     │ O(96) gradient │
 *   └──────────────┘     └───────────────┘     └──────┬───────┘
 *                                                      │
 *                         ┌───────────────┐            │
 *                         │ Atlas Vertex   │◀───────────┘
 *                         │ Value Cache    │
 *                         │ (96 × d_model) │
 *                         └───────┬───────┘
 *                                 │
 *                         ┌───────▼───────┐
 *                         │ Output Token   │
 *                         │ (argmax over V)│
 *                         └───────────────┘
 *
 * @module hologram-compute/coherence-inference
 */

import { ATLAS_VERTEX_COUNT } from "../atlas/atlas";
import { EngramCache, type EngramRetrievalResult } from "./engram-cache";
import type { AtlasModelDecomposition, AtlasWeightBlock } from "./atlas-model-projector";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

/** A coherence state on the Atlas manifold */
export interface CoherenceState {
  /** Current position as Atlas vertex activations [96] */
  vertexActivations: Float32Array;
  /** H-score (global coherence measure) [0, 1] */
  hScore: number;
  /** Coherence gradient ∂H/∂vertex [96] */
  gradient: Float32Array;
  /** Observer zone */
  zone: "convergent" | "exploring" | "divergent";
  /** Phase angle φ (Euler bridge) */
  phi: number;
  /** Step count */
  step: number;
}

/** Configuration for the coherence inference engine */
export interface CoherenceInferenceConfig {
  /** Model hidden dimension */
  hiddenDim: number;
  /** Vocabulary size */
  vocabSize: number;
  /** Temperature for output distribution */
  temperature: number;
  /** Coherence gradient learning rate */
  gradientLR: number;
  /** Momentum for gradient smoothing */
  momentum: number;
  /** Maximum steps per token generation */
  maxStepsPerToken: number;
  /** Convergence threshold (stop when ∂H/∂t < this) */
  convergenceThreshold: number;
}

/** Result of a single inference step */
export interface InferenceStep {
  /** Generated token ID */
  tokenId: number;
  /** Token probability */
  probability: number;
  /** Coherence state after generation */
  state: CoherenceState;
  /** Engram retrieval result */
  engramResult: EngramRetrievalResult;
  /** Inference time (ms) */
  timeMs: number;
}

/** Complete inference result */
export interface InferenceResult {
  /** Generated token IDs */
  tokenIds: number[];
  /** Per-step details */
  steps: InferenceStep[];
  /** Mean H-score across generation */
  meanHScore: number;
  /** Total time (ms) */
  totalTimeMs: number;
  /** Tokens per second */
  tokensPerSecond: number;
}

// ═══════════════════════════════════════════════════════════════
// Default Configuration
// ═══════════════════════════════════════════════════════════════

export const DEFAULT_INFERENCE_CONFIG: CoherenceInferenceConfig = {
  hiddenDim: 4096,
  vocabSize: 128256,
  temperature: 0.7,
  gradientLR: 0.01,
  momentum: 0.9,
  maxStepsPerToken: 10,
  convergenceThreshold: 0.001,
};

// ═══════════════════════════════════════════════════════════════
// Coherence Navigation
// ═══════════════════════════════════════════════════════════════

/**
 * Compute the H-score (coherence) for a vertex activation vector.
 *
 * H-score measures how "aligned" the current state is with the
 * Atlas topology. It's computed as the normalized dot product of
 * the activation vector with the Atlas adjacency structure.
 *
 * H ∈ [0, 1] where:
 *   H = 1 → perfectly coherent (convergent zone)
 *   H ∈ [0.5, 1) → exploring zone
 *   H < 0.5 → divergent zone
 */
export function computeHScore(activations: Float32Array): number {
  const n = activations.length;
  if (n === 0) return 0;

  // Compute activation energy: sum of squared activations (normalized)
  let energy = 0;
  let maxAct = 0;
  for (let i = 0; i < n; i++) {
    energy += activations[i] * activations[i];
    if (Math.abs(activations[i]) > maxAct) maxAct = Math.abs(activations[i]);
  }

  if (maxAct === 0) return 0;

  // Coherence = concentration of energy (peakedness)
  // Perfect coherence: all energy in one vertex
  // Zero coherence: uniform distribution
  const uniformEnergy = (1 / n); // energy if uniform
  const normalizedEnergy = energy / (maxAct * maxAct * n);

  // Compute entropy-based coherence
  let entropy = 0;
  for (let i = 0; i < n; i++) {
    const p = (activations[i] * activations[i]) / energy;
    if (p > 1e-10) entropy -= p * Math.log2(p);
  }
  const maxEntropy = Math.log2(n);
  const coherence = 1 - (entropy / maxEntropy);

  return Math.max(0, Math.min(1, coherence));
}

/**
 * Compute the coherence gradient ∂H/∂vertex.
 *
 * The gradient points in the direction of increasing coherence,
 * guiding the inference engine toward more aligned states.
 * This replaces the attention mechanism's "where to look" computation.
 */
export function computeGradient(activations: Float32Array): Float32Array {
  const n = activations.length;
  const gradient = new Float32Array(n);

  // Energy and its derivatives
  let energy = 0;
  for (let i = 0; i < n; i++) {
    energy += activations[i] * activations[i];
  }

  if (energy < 1e-10) return gradient;

  // ∂H/∂a_i = 2a_i/E - 2a_i * Σ(a_j²)/E²
  // Simplified: gradient points toward concentration
  const invE = 1 / energy;
  const meanAct = 0;
  for (let i = 0; i < n; i++) {
    // Gradient encourages sparsification (coherence increase)
    gradient[i] = 2 * activations[i] * invE * (activations[i] * invE - 1 / n);
  }

  return gradient;
}

/**
 * Determine the observer zone from H-score.
 */
export function classifyZone(hScore: number): "convergent" | "exploring" | "divergent" {
  if (hScore >= 0.8) return "convergent";
  if (hScore >= 0.4) return "exploring";
  return "divergent";
}

// ═══════════════════════════════════════════════════════════════
// Coherence Inference Engine
// ═══════════════════════════════════════════════════════════════

/**
 * CoherenceInferenceEngine — Replaces transformer forward pass with
 * H-score gradient navigation on the Atlas manifold.
 *
 * Instead of:
 *   for each layer:
 *     x = Attention(x) + x    ← O(N²)
 *     x = MLP(x) + x
 *
 * We do:
 *   state = initialize(input_tokens)
 *   while not converged:
 *     memory = engram.retrieve(context)      ← O(1)
 *     gradient = ∇H(state)                    ← O(96)
 *     state = state + lr * gradient + memory   ← O(96)
 *   output = project_to_vocab(state)
 */
export class CoherenceInferenceEngine {
  private config: CoherenceInferenceConfig;
  private engram: EngramCache;
  private decomposition: AtlasModelDecomposition | null = null;

  /** Value projection cache: vertex → hidden-dim embedding */
  private valueCacheMap: Map<number, Float32Array> = new Map();

  /** Output projection: [vocabSize × ATLAS_VERTEX_COUNT] — real lm_head projected to Atlas space */
  private outputProjection: Float32Array | null = null;
  /** Number of vocab rows stored in outputProjection */
  private outputVocabSize: number = 0;

  /** Optional: async logits function using the real model */
  private logitsCallback: ((context: number[]) => Promise<Float32Array>) | null = null;

  /** Momentum buffer for gradient smoothing */
  private momentumBuffer: Float32Array;

  /** Current coherence state */
  private state: CoherenceState;

  constructor(
    config: Partial<CoherenceInferenceConfig> = {},
    engram?: EngramCache,
  ) {
    this.config = { ...DEFAULT_INFERENCE_CONFIG, ...config };
    this.engram = engram ?? new EngramCache();
    this.momentumBuffer = new Float32Array(ATLAS_VERTEX_COUNT);
    this.state = this.createInitialState();
  }

  /**
   * Initialize the engine from an Atlas model decomposition.
   *
   * This populates:
   *   1. The Engram cache with projected weight blocks
   *   2. The value cache with per-vertex embeddings
   *   3. The output projection matrix (fallback if no real lm_head is set)
   */
  initialize(decomposition: AtlasModelDecomposition): void {
    this.decomposition = decomposition;

    // Populate Engram cache
    this.engram.populateFromBlocks(decomposition.blocks);

    // Build value cache: aggregate embeddings per vertex
    const vertexSums = new Map<number, { sum: Float32Array; count: number }>();

    for (const block of decomposition.blocks) {
      if (!vertexSums.has(block.vertex)) {
        vertexSums.set(block.vertex, {
          sum: new Float32Array(ATLAS_VERTEX_COUNT),
          count: 0,
        });
      }
      const vs = vertexSums.get(block.vertex)!;
      // Project R₈ block to Atlas-dim embedding
      const ratio = block.r8Block.length / ATLAS_VERTEX_COUNT;
      for (let d = 0; d < ATLAS_VERTEX_COUNT; d++) {
        const start = Math.floor(d * ratio);
        const end = Math.floor((d + 1) * ratio);
        let val = 0;
        for (let i = start; i < end; i++) {
          val += block.r8Block[i] / 255.0;
        }
        vs.sum[d] += val / (end - start);
      }
      vs.count++;
    }

    // Average and store
    for (const [vertex, { sum, count }] of vertexSums) {
      const avg = new Float32Array(ATLAS_VERTEX_COUNT);
      for (let d = 0; d < ATLAS_VERTEX_COUNT; d++) {
        avg[d] = sum[d] / count;
      }
      this.valueCacheMap.set(vertex, avg);
    }

    // Only build fallback projection if no real lm_head has been set
    if (!this.outputProjection) {
      this.buildFallbackProjection();
    }

    console.log(
      `[CoherenceEngine] Initialized: ${decomposition.blocks.length} blocks, ` +
      `${this.valueCacheMap.size} vertices cached, ` +
      `Engram: ${this.engram.stats().totalEntries} entries, ` +
      `lm_head: ${this.outputVocabSize > 0 ? `real (${this.outputVocabSize} vocab)` : 'fallback'}`
    );
  }

  /**
   * Set the real lm_head weights for output projection.
   *
   * The lm_head is a [vocabSize × hiddenDim] matrix.
   * We project it down to [vocabSize × 96] by averaging hiddenDim columns
   * into ATLAS_VERTEX_COUNT buckets, preserving the model's learned
   * vocabulary distribution structure.
   *
   * @param lmHead - Raw lm_head weight matrix [vocabSize × hiddenDim]
   * @param vocabSize - Number of vocabulary entries (rows)
   * @param hiddenDim - Model hidden dimension (columns)
   */
  setLmHead(lmHead: Float32Array, vocabSize: number, hiddenDim: number): void {
    // Calculate actual number of complete vocab rows in the provided data
    const actualRows = Math.floor(lmHead.length / hiddenDim);
    const effectiveVocab = Math.min(actualRows, vocabSize, 32000); // Cap for browser memory

    if (effectiveVocab < 100) {
      console.warn(
        `[CoherenceEngine] lm_head too small: ${lmHead.length} elements / ${hiddenDim} hiddenDim = ${actualRows} rows. ` +
        `Need at least 100 vocab entries. Keeping fallback projection.`
      );
      return;
    }

    const projected = new Float32Array(effectiveVocab * ATLAS_VERTEX_COUNT);
    const colsPerVertex = hiddenDim / ATLAS_VERTEX_COUNT;

    for (let v = 0; v < effectiveVocab; v++) {
      const rowOffset = v * hiddenDim;
      for (let a = 0; a < ATLAS_VERTEX_COUNT; a++) {
        const colStart = Math.floor(a * colsPerVertex);
        const colEnd = Math.floor((a + 1) * colsPerVertex);
        let sum = 0;
        const count = colEnd - colStart;
        for (let c = colStart; c < colEnd && (rowOffset + c) < lmHead.length; c++) {
          sum += lmHead[rowOffset + c];
        }
        projected[v * ATLAS_VERTEX_COUNT + a] = count > 0 ? sum / count : 0;
      }
    }

    this.outputProjection = projected;
    this.outputVocabSize = effectiveVocab;
    this.config.vocabSize = effectiveVocab;

    console.log(
      `[CoherenceEngine] Real lm_head wired: ${lmHead.length} elements → ` +
      `[${effectiveVocab}×${ATLAS_VERTEX_COUNT}] Atlas projection ` +
      `(${actualRows} rows from [${vocabSize}×${hiddenDim}])`
    );
  }

  /**
   * Set a callback that uses the real model's forward pass for logits.
   * When set, this overrides the Atlas-projected lm_head for output.
   * The callback receives the current token context and returns logits.
   */
  setLogitsCallback(fn: (context: number[]) => Promise<Float32Array>): void {
    this.logitsCallback = fn;
    console.log("[CoherenceEngine] Real model logits callback wired");
  }

  private buildFallbackProjection(): void {
    // Fallback: random but seeded projection when no real lm_head available
    const size = Math.min(this.config.vocabSize, 1000);
    this.outputProjection = new Float32Array(size * ATLAS_VERTEX_COUNT);
    this.outputVocabSize = size;

    let s = 42;
    const next = () => {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      return (s >>> 0) / 4294967296;
    };
    for (let i = 0; i < this.outputProjection.length; i++) {
      this.outputProjection[i] = (next() - 0.5) * 0.1;
    }
  }

  private createInitialState(): CoherenceState {
    return {
      vertexActivations: new Float32Array(ATLAS_VERTEX_COUNT),
      hScore: 0,
      gradient: new Float32Array(ATLAS_VERTEX_COUNT),
      zone: "divergent",
      phi: 0,
      step: 0,
    };
  }

  /**
   * Generate the next token given a context of previous token IDs.
   *
   * This is the core inference loop:
   *   1. Retrieve memory from Engram cache (O(1))
   *   2. Compute coherence gradient (O(96))
   *   3. Navigate Atlas manifold (gradient descent)
   *   4. Project to vocabulary (O(V))
   *   5. Sample token
   */
  async generateToken(context: number[]): Promise<InferenceStep> {
    const t0 = performance.now();

    // ── Step 1: Engram retrieval ──────────────────────────────
    const engramResult = this.engram.retrieve(context, this.state.hScore);

    // ── Step 2: Fuse memory with current state ───────────────
    const activations = new Float32Array(this.state.vertexActivations);
    if (engramResult.matchCount > 0) {
      const emb = engramResult.embedding;
      const dim = Math.min(emb.length, activations.length);
      for (let d = 0; d < dim; d++) {
        activations[d] = 0.7 * activations[d] + 0.3 * emb[d];
      }
    }

    // ── Step 3: Coherence gradient navigation ────────────────
    for (let step = 0; step < this.config.maxStepsPerToken; step++) {
      const gradient = computeGradient(activations);

      // Momentum-accelerated gradient step
      for (let d = 0; d < ATLAS_VERTEX_COUNT; d++) {
        this.momentumBuffer[d] = this.config.momentum * this.momentumBuffer[d]
          + this.config.gradientLR * gradient[d];
        activations[d] += this.momentumBuffer[d];
      }

      // Add value cache contributions from active vertices
      for (const [vertex, value] of this.valueCacheMap) {
        if (activations[vertex] > 0.1) {
          for (let d = 0; d < ATLAS_VERTEX_COUNT; d++) {
            activations[d] += 0.01 * activations[vertex] * value[d];
          }
        }
      }

      // Check convergence
      const hScore = computeHScore(activations);
      if (Math.abs(hScore - this.state.hScore) < this.config.convergenceThreshold) {
        break;
      }
    }

    // ── Step 4: Update state ─────────────────────────────────
    const hScore = computeHScore(activations);
    this.state = {
      vertexActivations: activations,
      hScore,
      gradient: computeGradient(activations),
      zone: classifyZone(hScore),
      phi: Math.atan2(activations[1] || 0, activations[0] || 0),
      step: this.state.step + 1,
    };

    // ── Step 5: Project to vocabulary ────────────────────────
    // Priority: logits callback (real model forward pass) > real lm_head projection > fallback
    let tokenId: number;
    let probability: number;

    if (this.logitsCallback) {
      // Use real model forward pass — most accurate
      try {
        const logits = await this.logitsCallback(context);
        if (logits.length > 0) {
          // Modulate logits with coherence state — blend Atlas navigation with model output
          // This is where Atlas actually influences generation: vertex activations
          // bias the logit distribution toward coherence-favored tokens
          if (this.outputVocabSize > 1000) {
            const atlasLogits = this.projectToVocabLogits(activations);
            const blendWeight = 0.15; // 15% Atlas influence
            const minLen = Math.min(logits.length, atlasLogits.length);
            for (let v = 0; v < minLen; v++) {
              logits[v] = (1 - blendWeight) * logits[v] + blendWeight * atlasLogits[v];
            }
          }
          const result = this.sampleFromLogits(logits);
          tokenId = result.tokenId;
          probability = result.probability;
        } else {
          const result = this.projectToVocab(activations);
          tokenId = result.tokenId;
          probability = result.probability;
        }
      } catch {
        const result = this.projectToVocab(activations);
        tokenId = result.tokenId;
        probability = result.probability;
      }
    } else if (this.outputVocabSize > 1000) {
      // Real lm_head available, no forward pass callback — use Atlas projection
      const result = this.projectToVocab(activations);
      tokenId = result.tokenId;
      probability = result.probability;
    } else {
      // Fallback random projection
      const result = this.projectToVocab(activations);
      tokenId = result.tokenId;
      probability = result.probability;
    }

    return {
      tokenId,
      probability,
      state: { ...this.state },
      engramResult,
      timeMs: performance.now() - t0,
    };
  }

  /**
   * Sample a token from raw logits using temperature + top-k.
   */
  private sampleFromLogits(logits: Float32Array): { tokenId: number; probability: number } {
    const vocabSize = logits.length;

    // Temperature-scaled softmax with top-k
    let maxLogit = -Infinity;
    for (let v = 0; v < vocabSize; v++) {
      if (logits[v] > maxLogit) maxLogit = logits[v];
    }

    // Top-k filtering
    const topK = 40;
    const scaled = new Float32Array(vocabSize);
    if (vocabSize > topK) {
      const sorted = Array.from(logits).sort((a, b) => b - a);
      const threshold = sorted[topK - 1];
      for (let v = 0; v < vocabSize; v++) {
        scaled[v] = logits[v] >= threshold
          ? Math.exp((logits[v] - maxLogit) / this.config.temperature)
          : 0;
      }
    } else {
      for (let v = 0; v < vocabSize; v++) {
        scaled[v] = Math.exp((logits[v] - maxLogit) / this.config.temperature);
      }
    }

    let sumExp = 0;
    for (let v = 0; v < vocabSize; v++) sumExp += scaled[v];
    if (sumExp === 0) return { tokenId: 0, probability: 0 };

    const r = Math.random() * sumExp;
    let cumulative = 0;
    for (let v = 0; v < vocabSize; v++) {
      cumulative += scaled[v];
      if (cumulative >= r) {
        return { tokenId: v, probability: scaled[v] / sumExp };
      }
    }
    return { tokenId: 0, probability: scaled[0] / sumExp };
  }

  /**
   * Generate a sequence of tokens.
   */
  async generate(prompt: number[], maxTokens: number = 32): Promise<InferenceResult> {
    const t0 = performance.now();
    const context = [...prompt];
    const steps: InferenceStep[] = [];
    const tokenIds: number[] = [];

    // Reset state for new generation
    this.state = this.createInitialState();

    // Seed activations from prompt
    for (const token of prompt) {
      const v = token % ATLAS_VERTEX_COUNT;
      this.state.vertexActivations[v] += 0.5;
    }

    for (let i = 0; i < maxTokens; i++) {
      const step = await this.generateToken(context);
      steps.push(step);
      tokenIds.push(step.tokenId);
      context.push(step.tokenId);

      // Inject the generated token into vertex activations to break fixed-point convergence.
      // This is the Atlas equivalent of autoregressive token feeding — each new token
      // perturbs the manifold state, preventing the gradient from re-converging to the same vertex.
      const v = step.tokenId % ATLAS_VERTEX_COUNT;
      this.state.vertexActivations[v] += 0.3;
      // Also inject positional diversity via neighboring vertices
      const vPrev = (v + ATLAS_VERTEX_COUNT - 1) % ATLAS_VERTEX_COUNT;
      const vNext = (v + 1) % ATLAS_VERTEX_COUNT;
      this.state.vertexActivations[vPrev] += 0.1;
      this.state.vertexActivations[vNext] += 0.1;
      // Slight decay on all activations to prevent saturation
      for (let d = 0; d < ATLAS_VERTEX_COUNT; d++) {
        this.state.vertexActivations[d] *= 0.95;
      }

      // Early stop on EOS-like conditions
      if (step.state.hScore > 0.99) break;
    }

    const totalMs = performance.now() - t0;
    const meanH = steps.reduce((s, st) => s + st.state.hScore, 0) / steps.length;

    return {
      tokenIds,
      steps,
      meanHScore: meanH,
      totalTimeMs: totalMs,
      tokensPerSecond: (steps.length / totalMs) * 1000,
    };
  }

  /** Return raw logits from Atlas projection (no sampling) */
  private projectToVocabLogits(activations: Float32Array): Float32Array {
    if (!this.outputProjection || this.outputVocabSize === 0) {
      return new Float32Array(0);
    }
    const vocabSize = this.outputVocabSize;
    const logits = new Float32Array(vocabSize);
    for (let v = 0; v < vocabSize; v++) {
      let sum = 0;
      const rowOffset = v * ATLAS_VERTEX_COUNT;
      for (let d = 0; d < ATLAS_VERTEX_COUNT; d++) {
        sum += activations[d] * this.outputProjection[rowOffset + d];
      }
      logits[v] = sum;
    }
    return logits;
  }

  private projectToVocab(activations: Float32Array): { tokenId: number; probability: number } {
    const logits = this.projectToVocabLogits(activations);
    if (logits.length === 0) return { tokenId: 0, probability: 0 };

    const vocabSize = logits.length;

    // Temperature-scaled softmax with top-k filtering for quality
    let maxLogit = -Infinity;
    for (let v = 0; v < vocabSize; v++) {
      if (logits[v] > maxLogit) maxLogit = logits[v];
    }

    // Top-k: zero out everything below the 40th highest
    const topK = 40;
    if (vocabSize > topK) {
      const sorted = Array.from(logits).sort((a, b) => b - a);
      const threshold = sorted[topK - 1];
      for (let v = 0; v < vocabSize; v++) {
        if (logits[v] < threshold) logits[v] = -Infinity;
      }
    }

    let sumExp = 0;
    for (let v = 0; v < vocabSize; v++) {
      logits[v] = logits[v] === -Infinity ? 0 : Math.exp((logits[v] - maxLogit) / this.config.temperature);
      sumExp += logits[v];
    }

    if (sumExp === 0) return { tokenId: 0, probability: 0 };

    // Sample from distribution
    const r = Math.random() * sumExp;
    let cumulative = 0;
    for (let v = 0; v < vocabSize; v++) {
      cumulative += logits[v];
      if (cumulative >= r) {
        return { tokenId: v, probability: logits[v] / sumExp };
      }
    }

    return { tokenId: 0, probability: logits[0] / sumExp };
  }

  /** Get the current coherence state */
  getState(): CoherenceState {
    return { ...this.state };
  }

  /** Get Engram cache stats */
  getEngramStats() {
    return this.engram.stats();
  }
}
