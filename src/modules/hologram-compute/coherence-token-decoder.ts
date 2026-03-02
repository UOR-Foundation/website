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
import { VocabularyPartitioner, type EnhancedSampleResult } from "./vocabulary-partitioner";
import { loadTokenizerVocabulary, simpleEncode, simpleDecode, type TokenizerInfo } from "./tokenizer-bridge";
import { CoherenceNavigator, type NavigatorState, type NavigationDiagnostics } from "./coherence-navigator";
import { SemanticFeedbackLoop, type TokenFeedback, type FeedbackLoopSnapshot } from "./semantic-feedback-loop";

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
  /** Fano channels activated */
  fanoChannelsActive: number;
  /** Stabilizer syndromes */
  syndromeCount: number;
  /** ∂H/∂t (coherence velocity) */
  dHdt: number;
  /** Time for this token (ms) */
  timeMs: number;
  /** Phase 3: H-score contribution of this token */
  hScoreContrib: number;
  /** Phase 3: Phase alignment with current φ [0, 1] */
  phaseAlignment: number;
  /** Phase 3: Whether stabilizer parity passed cleanly */
  parityClean: boolean;
  /** Phase 3: Candidates rejected by stabilizer filter */
  rejectedByStabilizer: number;
  /** Phase 3: Which sampling strategies were active */
  samplingStrategy: string;
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
 * Uses the topology-aware CoherenceNavigator with:
 *   - Three-scale navigation (Fano macro / edge meso / vertex micro)
 *   - τ-mirror stabilizer correction
 *   - Prescience explore/exploit modulation via ∂H/∂t
 */
export class CoherenceTokenDecoder {
  private config: DecoderConfig;
  private partitioner: VocabularyPartitioner;
  private navigator: CoherenceNavigator;
  private semanticLoop: SemanticFeedbackLoop;
  private tokenizerInfo: TokenizerInfo | null = null;
  private status: DecoderStatus = { stage: "idle", progress: 0, message: "Not initialized" };
  private onStatusChange?: (status: DecoderStatus) => void;

  constructor(config: Partial<DecoderConfig> = {}) {
    this.config = { ...DEFAULT_DECODER_CONFIG, ...config };
    this.partitioner = new VocabularyPartitioner();
    this.navigator = new CoherenceNavigator({
      stepsPerRound: config.stepsPerToken ?? DEFAULT_DECODER_CONFIG.stepsPerToken,
      learningRate: config.gradientLR ?? DEFAULT_DECODER_CONFIG.gradientLR,
      momentum: config.momentum ?? DEFAULT_DECODER_CONFIG.momentum,
      convergenceThreshold: config.convergenceThreshold ?? DEFAULT_DECODER_CONFIG.convergenceThreshold,
    });
    this.semanticLoop = new SemanticFeedbackLoop();
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
      this.updateStatus({ stage: "loading-tokenizer", progress: 0, message: "Loading tokenizer..." });

      this.tokenizerInfo = await loadTokenizerVocabulary(
        this.config.modelId,
        (p) => this.updateStatus({ progress: p.progress * 0.4, message: p.message }),
      );

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
   * No matrix multiplication. No weight tensors.
   * Three-scale manifold navigation with stabilizer correction.
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

    // Reset navigator and semantic context
    this.navigator.reset();
    this.semanticLoop.setPromptContext(prompt);

    // Encode prompt
    const promptTokens = simpleEncode(prompt, this.tokenizerInfo.vocabulary);
    const context = [...promptTokens];
    const generatedTokens: GenerationToken[] = [];
    let fullText = "";

    // Initialize manifold state from prompt using topology-aware seeding
    const activations = new Float32Array(ATLAS_VERTEX_COUNT);
    const tokenVertices = promptTokens.map(tid => {
      const v = this.partitioner.getTokenVertex(tid);
      return v !== undefined ? v : tid % ATLAS_VERTEX_COUNT;
    });
    this.navigator.seedFromTokens(activations, tokenVertices);

    // ── Generation loop ──
    for (let t = 0; t < this.config.maxTokens; t++) {
      const tokenT0 = performance.now();

      // ── Three-scale coherence navigation ──
      // The navigator performs:
      //   1. Fano-plane routing (macro: long-range semantic direction)
      //   2. Atlas edge diffusion (meso: local meaning refinement)
      //   3. Vertex sharpening (micro: precise token selection)
      //   4. τ-mirror stabilizer correction
      //   5. Prescience modulation (∂H/∂t → explore/exploit)
      const { state, diagnostics } = this.navigator.navigate(activations);

      // Copy navigated activations back
      activations.set(state.activations);

      // ── Semantic grounding: blend semantic mask into activations ──
      const semanticMask = this.semanticLoop.getCombinedMask(activations);
      for (let i = 0; i < ATLAS_VERTEX_COUNT; i++) {
        activations[i] = activations[i] * 0.7 + semanticMask[i] * 0.3;
      }

      // Count Fano channels with significant activation
      let fanoChannelsActive = 0;
      for (let li = 0; li < 7; li++) {
        if (state.fanoActivations[li] > 0.1) fanoChannelsActive++;
      }

      // ── Enhanced three-strategy sampling with semantic grounding ──
      const sampled = this.partitioner.enhancedSample(
        activations,
        this.config.temperature,
        state.hScore,
        state.phi,
        0.15,
        40,
      );

      const genToken: GenerationToken = {
        text: sampled.tokenString,
        tokenId: sampled.tokenId,
        probability: sampled.probability,
        hScore: state.hScore,
        zone: state.zone,
        activeVertices: state.activeVertexCount,
        fanoChannelsActive,
        syndromeCount: state.syndromeCount,
        dHdt: state.dHdt,
        timeMs: performance.now() - tokenT0,
        hScoreContrib: sampled.hScoreContrib,
        phaseAlignment: sampled.phaseAlignment,
        parityClean: sampled.parityClean,
        rejectedByStabilizer: sampled.rejectedByStabilizer,
        samplingStrategy: sampled.samplingStrategy,
      };

      generatedTokens.push(genToken);
      context.push(sampled.tokenId);

      // Decode token to text
      const decodedChar = simpleDecode([sampled.tokenId], this.tokenizerInfo!.vocabulary);
      fullText += decodedChar;

      onToken?.(genToken, fullText);

      // ── Semantic feedback: teach the system from its own output ──
      this.semanticLoop.onTokenGenerated(decodedChar.trim(), activations, state.hScore);

      // Inject generated token back via topology-aware feedback
      const tokenV = this.partitioner.getTokenVertex(sampled.tokenId);
      if (tokenV !== undefined) {
        this.navigator.injectToken(activations, tokenV, 0.3);
      }

      // Early stop on EOS tokens
      if (this.tokenizerInfo!.specialTokens.has(sampled.tokenId)) {
        break;
      }
    }

    const totalMs = performance.now() - t0;
    const meanH = generatedTokens.length > 0
      ? generatedTokens.reduce((s, t) => s + t.hScore, 0) / generatedTokens.length
      : 0;

    const result: GenerationResult = {
      text: fullText,
      tokens: generatedTokens,
      meanHScore: meanH,
      tokensPerSecond: generatedTokens.length > 0 ? (generatedTokens.length / totalMs) * 1000 : 0,
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

  /** Get current decoder status. */
  getStatus(): DecoderStatus {
    return { ...this.status };
  }

  /** Get the vocabulary partitioner (for visualization). */
  getPartitioner(): VocabularyPartitioner {
    return this.partitioner;
  }

  /** Get the coherence navigator (for diagnostics). */
  getNavigator(): CoherenceNavigator {
    return this.navigator;
  }

  /** Get tokenizer info. */
  getTokenizerInfo(): TokenizerInfo | null {
    return this.tokenizerInfo;
  }

  /** Get the semantic feedback loop (for diagnostics & reasoning). */
  getSemanticLoop(): SemanticFeedbackLoop {
    return this.semanticLoop;
  }
}
