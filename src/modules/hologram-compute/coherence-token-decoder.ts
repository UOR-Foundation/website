/**
 * Coherence Token Decoder — Pure Manifold Navigation → Token Emission
 * ═══════════════════════════════════════════════════════════════════
 *
 * The final piece of pure coherence-based inference: converts Atlas
 * manifold navigation output (96-dim vertex activations) into text
 * tokens without any matrix multiplication.
 *
 * PIPELINE:
 *   Input text → simpleEncode → token IDs → seed manifold
 *   → coherence navigation → vertex activations
 *   → VocabularyPartitioner.sampleFromActivations → output token
 *   → simpleDecode → output text
 *
 * This module orchestrates the full decode loop, producing a
 * streaming sequence of tokens from pure coherence navigation.
 *
 * @module hologram-compute/coherence-token-decoder
 */

import { ATLAS_VERTEX_COUNT } from "../atlas/atlas";
import { VocabularyPartitioner } from "./vocabulary-partitioner";
import { loadTokenizerVocabulary, simpleEncode, simpleDecode, type TokenizerInfo } from "./tokenizer-bridge";
import {
  CoherenceInferenceEngine,
  computeHScore,
  computeGradient,
  classifyZone,
  type CoherenceState,
} from "./coherence-inference";
import { EngramCache } from "./engram-cache";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface DecoderConfig {
  /** Model to load vocabulary from */
  modelId: string;
  /** Temperature for sampling */
  temperature: number;
  /** Maximum tokens to generate */
  maxTokens: number;
  /** Convergence threshold for coherence navigation */
  convergenceThreshold: number;
  /** Navigation steps per token */
  stepsPerToken: number;
  /** Gradient learning rate */
  gradientLR: number;
  /** Momentum factor */
  momentum: number;
}

export const DEFAULT_DECODER_CONFIG: DecoderConfig = {
  modelId: "HuggingFaceTB/SmolLM2-1.7B",
  temperature: 0.7,
  maxTokens: 64,
  convergenceThreshold: 0.001,
  stepsPerToken: 8,
  gradientLR: 0.015,
  momentum: 0.9,
};

export interface DecoderStatus {
  stage: "idle" | "loading-tokenizer" | "partitioning" | "ready" | "generating" | "error";
  progress: number;
  message: string;
  tokenizerInfo?: TokenizerInfo;
  partitionStats?: import("./vocabulary-partitioner").PartitionStats;
}

export interface GenerationToken {
  /** Token string */
  text: string;
  /** Token ID */
  tokenId: number;
  /** Probability */
  probability: number;
  /** H-score at emission */
  hScore: number;
  /** Zone at emission */
  zone: "convergent" | "exploring" | "divergent";
  /** Active vertex count */
  activeVertices: number;
  /** Time for this token (ms) */
  timeMs: number;
}

export interface GenerationResult {
  /** Full generated text */
  text: string;
  /** Per-token details */
  tokens: GenerationToken[];
  /** Mean H-score */
  meanHScore: number;
  /** Tokens per second */
  tokensPerSecond: number;
  /** Total time (ms) */
  totalTimeMs: number;
  /** Model used */
  modelId: string;
  /** Whether this was pure coherence (no gateway) */
  pureCoherence: boolean;
}

// ═══════════════════════════════════════════════════════════════
// Coherence Token Decoder
// ═══════════════════════════════════════════════════════════════

/**
 * CoherenceTokenDecoder — Full pipeline for text generation via
 * pure Atlas manifold navigation. No weights. No matrix multiply.
 * 
 * This is the realization of the coherence-based inference thesis:
 * knowledge is stored as geometric relationships in the Atlas manifold,
 * and inference is navigation along coherence gradients.
 */
export class CoherenceTokenDecoder {
  private config: DecoderConfig;
  private partitioner: VocabularyPartitioner;
  private tokenizerInfo: TokenizerInfo | null = null;
  private status: DecoderStatus = { stage: "idle", progress: 0, message: "Not initialized" };
  private momentumBuffer: Float32Array;
  private onStatusChange?: (status: DecoderStatus) => void;

  constructor(config: Partial<DecoderConfig> = {}) {
    this.config = { ...DEFAULT_DECODER_CONFIG, ...config };
    this.partitioner = new VocabularyPartitioner();
    this.momentumBuffer = new Float32Array(ATLAS_VERTEX_COUNT);
  }

  /**
   * Set a callback for status changes.
   */
  onStatus(callback: (status: DecoderStatus) => void): void {
    this.onStatusChange = callback;
  }

  private updateStatus(update: Partial<DecoderStatus>): void {
    this.status = { ...this.status, ...update };
    this.onStatusChange?.(this.status);
  }

  /**
   * Initialize: load tokenizer and partition vocabulary.
   */
  async initialize(): Promise<void> {
    try {
      // Step 1: Load tokenizer
      this.updateStatus({ stage: "loading-tokenizer", progress: 0, message: "Loading tokenizer..." });

      this.tokenizerInfo = await loadTokenizerVocabulary(
        this.config.modelId,
        (p) => this.updateStatus({ progress: p.progress * 0.4, message: p.message }),
      );

      // Step 2: Partition vocabulary into Atlas clusters
      this.updateStatus({ stage: "partitioning", progress: 0.4, message: "Partitioning vocabulary..." });

      const stats = this.partitioner.partition(
        this.tokenizerInfo.vocabulary,
        (progress, message) => this.updateStatus({ progress: 0.4 + progress * 0.6, message }),
      );

      this.updateStatus({
        stage: "ready",
        progress: 1.0,
        message: `Ready: ${this.tokenizerInfo.vocabSize} tokens in ${stats.activeClusters} clusters`,
        tokenizerInfo: this.tokenizerInfo,
        partitionStats: stats,
      });
    } catch (err) {
      this.updateStatus({
        stage: "error",
        progress: 0,
        message: `Initialization failed: ${err instanceof Error ? err.message : String(err)}`,
      });
      throw err;
    }
  }

  /**
   * Generate text from a prompt using pure coherence-based inference.
   *
   * No matrix multiplication. No weight tensors. Pure manifold navigation.
   *
   * @param prompt - Input text
   * @param onToken - Callback for each generated token (for streaming)
   */
  async generate(
    prompt: string,
    onToken?: (token: GenerationToken, fullText: string) => void,
  ): Promise<GenerationResult> {
    if (!this.tokenizerInfo || this.status.stage !== "ready") {
      throw new Error("Decoder not initialized. Call initialize() first.");
    }

    this.updateStatus({ stage: "generating", message: "Generating..." });
    const t0 = performance.now();

    // Encode prompt
    const promptTokens = simpleEncode(prompt, this.tokenizerInfo.vocabulary);
    const context = [...promptTokens];
    const generatedTokens: GenerationToken[] = [];
    let fullText = "";

    // Initialize manifold state from prompt
    const activations = new Float32Array(ATLAS_VERTEX_COUNT);
    this.momentumBuffer.fill(0);

    // Seed: each prompt token activates its primary vertex
    for (const tokenId of promptTokens) {
      const vertex = this.partitioner.getTokenVertex(tokenId);
      if (vertex !== undefined) {
        activations[vertex] += 0.5;
      } else {
        // Fallback: hash to vertex
        activations[tokenId % ATLAS_VERTEX_COUNT] += 0.3;
      }
    }

    // Add positional diversity
    for (let i = 0; i < promptTokens.length; i++) {
      const v = (promptTokens[i] + i * 7) % ATLAS_VERTEX_COUNT;
      activations[v] += 0.1;
    }

    // ── Generation loop ──
    for (let t = 0; t < this.config.maxTokens; t++) {
      const tokenT0 = performance.now();

      // Coherence navigation steps
      for (let step = 0; step < this.config.stepsPerToken; step++) {
        const gradient = computeGradient(activations);

        // Momentum-accelerated gradient descent
        for (let d = 0; d < ATLAS_VERTEX_COUNT; d++) {
          this.momentumBuffer[d] = this.config.momentum * this.momentumBuffer[d]
            + this.config.gradientLR * gradient[d];
          activations[d] += this.momentumBuffer[d];
        }

        // Engram-style context injection: recent tokens bias neighbors
        if (context.length > 0) {
          const lastToken = context[context.length - 1];
          const lastV = this.partitioner.getTokenVertex(lastToken);
          if (lastV !== undefined) {
            // Boost neighbors of last token's vertex
            for (let v = 0; v < ATLAS_VERTEX_COUNT; v++) {
              const dist = Math.abs(v - lastV);
              const minDist = Math.min(dist, ATLAS_VERTEX_COUNT - dist);
              if (minDist <= 3) {
                activations[v] += 0.05 * Math.exp(-minDist);
              }
            }
          }
        }
      }

      // Compute coherence metrics
      const hScore = computeHScore(activations);
      const zone = classifyZone(hScore);

      // Count active vertices
      let activeVertices = 0;
      for (let v = 0; v < ATLAS_VERTEX_COUNT; v++) {
        if (activations[v] > 0.01) activeVertices++;
      }

      // Sample token from activations
      const sampled = this.partitioner.sampleFromActivations(activations, this.config.temperature);

      const genToken: GenerationToken = {
        text: sampled.tokenString,
        tokenId: sampled.tokenId,
        probability: sampled.probability,
        hScore,
        zone,
        activeVertices,
        timeMs: performance.now() - tokenT0,
      };

      generatedTokens.push(genToken);
      context.push(sampled.tokenId);

      // Decode token to text
      const decodedChar = simpleDecode([sampled.tokenId], this.tokenizerInfo!.vocabulary);
      fullText += decodedChar;

      onToken?.(genToken, fullText);

      // Inject generated token back into activations (autoregressive feedback)
      const tokenV = this.partitioner.getTokenVertex(sampled.tokenId);
      if (tokenV !== undefined) {
        activations[tokenV] += 0.3;
        // Neighbor perturbation for diversity
        const prevV = (tokenV + ATLAS_VERTEX_COUNT - 1) % ATLAS_VERTEX_COUNT;
        const nextV = (tokenV + 1) % ATLAS_VERTEX_COUNT;
        activations[prevV] += 0.1;
        activations[nextV] += 0.1;
      }

      // Gentle decay to prevent saturation
      for (let d = 0; d < ATLAS_VERTEX_COUNT; d++) {
        activations[d] *= 0.95;
      }

      // Early stop on EOS tokens
      if (this.tokenizerInfo!.specialTokens.has(sampled.tokenId)) {
        break;
      }
    }

    const totalMs = performance.now() - t0;
    const meanH = generatedTokens.reduce((s, t) => s + t.hScore, 0) / generatedTokens.length;

    const result: GenerationResult = {
      text: fullText,
      tokens: generatedTokens,
      meanHScore: meanH,
      tokensPerSecond: (generatedTokens.length / totalMs) * 1000,
      totalTimeMs: totalMs,
      modelId: this.config.modelId,
      pureCoherence: true,
    };

    this.updateStatus({ stage: "ready", message: `Generated ${generatedTokens.length} tokens` });

    console.log(
      `[CoherenceDecoder] Generated ${generatedTokens.length} tokens in ${totalMs.toFixed(0)}ms ` +
      `(${result.tokensPerSecond.toFixed(1)} tok/s, H̄=${meanH.toFixed(3)})`
    );

    return result;
  }

  /**
   * Get current decoder status.
   */
  getStatus(): DecoderStatus {
    return { ...this.status };
  }

  /**
   * Get the vocabulary partitioner (for visualization).
   */
  getPartitioner(): VocabularyPartitioner {
    return this.partitioner;
  }

  /**
   * Get tokenizer info.
   */
  getTokenizerInfo(): TokenizerInfo | null {
    return this.tokenizerInfo;
  }
}
