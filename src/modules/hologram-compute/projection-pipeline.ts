/**
 * Atlas Model Projection Pipeline — Full End-to-End Integration
 * ═══════════════════════════════════════════════════════════════
 *
 * Unified pipeline: Model → Atlas Decomposition → Engram Cache → Coherence Inference
 *
 * This is the Hologram's answer to transformer inference:
 *   1. Any model (LLaMA, Mistral, Phi, etc.) decomposes into Atlas coordinates
 *   2. Weights become O(1) lookups in the Engram conditional memory
 *   3. Attention is replaced by coherence gradient navigation
 *   4. The model runs as a projection of the Atlas manifold
 *
 * @module hologram-compute/projection-pipeline
 */

import {
  projectModel,
  generateProjectionReport,
  LLAMA_31_8B_MANIFEST,
  type ModelManifest,
  type AtlasModelDecomposition,
} from "./atlas-model-projector";

import {
  EngramCache,
  DEFAULT_ENGRAM_CONFIG,
  type EngramConfig,
} from "./engram-cache";

import {
  CoherenceInferenceEngine,
  DEFAULT_INFERENCE_CONFIG,
  type CoherenceInferenceConfig,
  type InferenceResult,
} from "./coherence-inference";

import {
  holographicEncode,
  generateHolographicReport,
  type HolographicEncoding,
  type HolographicCodecConfig,
} from "./holographic-codec";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

/** Pipeline configuration */
export interface ProjectionPipelineConfig {
  /** Model manifest (default: LLaMA 3.1 8B) */
  manifest: ModelManifest;
  /** Engram cache config overrides */
  engramConfig?: Partial<EngramConfig>;
  /** Inference engine config overrides */
  inferenceConfig?: Partial<CoherenceInferenceConfig>;
  /** Use only canonical blocks (τ-mirror compressed) */
  useCompression: boolean;
  /** Maximum layers to process (for quick testing) */
  maxLayers?: number;
  /** Holographic codec config overrides */
  codecConfig?: Partial<HolographicCodecConfig>;
  /** Optional weight loader for real model weights */
  weightLoader?: (layer: number, matrix: import("./atlas-model-projector").WeightMatrixType) => Float32Array | null;
}

/** Pipeline status */
export interface PipelineStatus {
  stage: "idle" | "projecting" | "compressing" | "caching" | "ready" | "inferring" | "error";
  progress: number; // [0, 1]
  message: string;
  decomposition: AtlasModelDecomposition | null;
  holographicEncoding: HolographicEncoding | null;
  engramEntries: number;
  error?: string;
}

/** Complete pipeline result */
export interface PipelineReport {
  /** Model projection report */
  projectionReport: string;
  /** Holographic compression report */
  holographicReport: string;
  /** Decomposition stats */
  decomposition: AtlasModelDecomposition;
  /** Holographic encoding */
  holographicEncoding: HolographicEncoding;
  /** Engram cache stats */
  engramStats: ReturnType<EngramCache["stats"]>;
  /** Benchmark inference result */
  benchmarkResult: InferenceResult;
  /** Total pipeline time (ms) */
  totalTimeMs: number;
}

// ═══════════════════════════════════════════════════════════════
// Default Pipeline Config
// ═══════════════════════════════════════════════════════════════

export const DEFAULT_PIPELINE_CONFIG: ProjectionPipelineConfig = {
  manifest: LLAMA_31_8B_MANIFEST,
  useCompression: true,
  maxLayers: 4, // Start with 4 layers for fast demo
};

// ═══════════════════════════════════════════════════════════════
// Pipeline Implementation
// ═══════════════════════════════════════════════════════════════

/**
 * AtlasProjectionPipeline — End-to-end model projection engine.
 *
 * Usage:
 *   const pipeline = new AtlasProjectionPipeline();
 *   await pipeline.initialize();
 *   const result = pipeline.infer([1, 2, 3], 16); // prompt tokens → output
 */
export class AtlasProjectionPipeline {
  private config: ProjectionPipelineConfig;
  private decomposition: AtlasModelDecomposition | null = null;
  private engram: EngramCache | null = null;
  private engine: CoherenceInferenceEngine | null = null;
  private _status: PipelineStatus = {
    stage: "idle", progress: 0, message: "Not initialized",
    decomposition: null, holographicEncoding: null, engramEntries: 0,
  };
  private holographicEncoding: HolographicEncoding | null = null;

  /** Pending logits callback — stored here so it survives engine recreation */
  private pendingLogitsCallback: ((context: number[]) => Promise<Float32Array>) | null = null;

  /** Pending lm_head weights — stored here so they survive engine recreation */
  private pendingLmHead: { weights: Float32Array; vocabSize: number; hiddenDim: number } | null = null;

  /** Status change listeners */
  private listeners = new Set<(status: PipelineStatus) => void>();

  constructor(config: Partial<ProjectionPipelineConfig> = {}) {
    this.config = { ...DEFAULT_PIPELINE_CONFIG, ...config };
  }

  /** Current pipeline status */
  get status(): PipelineStatus { return this._status; }

  /** Subscribe to status changes */
  onStatusChange(fn: (status: PipelineStatus) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private updateStatus(update: Partial<PipelineStatus>): void {
    this._status = { ...this._status, ...update };
    for (const fn of this.listeners) fn(this._status);
  }

  /**
   * Initialize the full pipeline:
   *   1. Project model weights → Atlas coordinates
   *   2. Populate Engram cache from decomposition
   *   3. Initialize coherence inference engine
   */
  async initialize(): Promise<void> {
    const t0 = performance.now();

    try {
      // ── Stage 1: Atlas Projection ──────────────────────────
      this.updateStatus({ stage: "projecting", progress: 0.1, message: "Decomposing model weights into Atlas R₈ coordinates..." });

      // Optionally limit layers for faster init
      const manifest: ModelManifest = this.config.maxLayers
        ? { ...this.config.manifest, layerCount: Math.min(this.config.manifest.layerCount, this.config.maxLayers) }
        : this.config.manifest;

      // Run projection (synchronous but yields via microtasks)
      await yieldThread();
      this.decomposition = projectModel(manifest, this.config.weightLoader);

      this.updateStatus({
        progress: 0.4,
        message: `Projected ${this.decomposition.totalBlocks} blocks across ${manifest.layerCount} layers`,
        decomposition: this.decomposition,
      });

      // ── Stage 2: Holographic Compression ──────────────────
      this.updateStatus({ stage: "compressing", progress: 0.45, message: "Applying holographic compression (Bekenstein-Hawking)..." });
      await yieldThread();

      this.holographicEncoding = holographicEncode(this.decomposition, this.config.codecConfig);

      this.updateStatus({
        progress: 0.55,
        message: `Compressed ${this.holographicEncoding.compressionRatio.toFixed(1)}× via holographic codec (${this.holographicEncoding.blocks.length} blocks)`,
        holographicEncoding: this.holographicEncoding,
      });

      // ── Stage 3: Engram Cache Population ──────────────────
      this.updateStatus({ stage: "caching", progress: 0.6, message: "Populating Engram conditional memory cache..." });
      await yieldThread();

      this.engram = new EngramCache(this.config.engramConfig);

      // Use holographically compressed blocks for the cache
      const blocks = this.holographicEncoding.blocks.map(hb => ({
        vertex: hb.vertex,
        fiber: hb.fiber,
        r8Block: hb.canonical,
        layerIndex: 0,
        blockIndex: hb.scramblingIndex,
      }));

      const stored = this.engram.populateFromBlocks(blocks);

      this.updateStatus({
        progress: 0.8,
        message: `Cached ${stored} N-gram entries across ${this.engram.stats().vertexUtilization * 100 | 0}% of Atlas vertices`,
        engramEntries: stored,
      });

      // ── Stage 3: Inference Engine Init ─────────────────────
      this.updateStatus({ stage: "ready", progress: 0.9, message: "Initializing coherence inference engine..." });
      await yieldThread();

      this.engine = new CoherenceInferenceEngine(
        {
          ...this.config.inferenceConfig,
          hiddenDim: manifest.hiddenDim,
          vocabSize: manifest.vocabSize,
        },
        this.engram,
      );

      // Wire real lm_head weights if available from weight loader
      if (this.config.weightLoader) {
        const lmHead = this.config.weightLoader(manifest.layerCount, "lm_head");
        if (lmHead && lmHead.length >= manifest.hiddenDim) {
          const expectedSize = manifest.vocabSize * manifest.hiddenDim;
          const actualVocab = Math.floor(lmHead.length / manifest.hiddenDim);
          if (actualVocab > 1) {
            this.engine.setLmHead(lmHead, actualVocab, manifest.hiddenDim);
            console.log(`[Pipeline] Wired real lm_head: ${lmHead.length} floats → ${actualVocab} vocab × ${manifest.hiddenDim} dim`);
          }
        }
      }

      this.engine.initialize(this.decomposition);

      // Apply pending lm_head weights if set before engine creation
      if (this.pendingLmHead) {
        this.engine.setLmHead(
          this.pendingLmHead.weights,
          this.pendingLmHead.vocabSize,
          this.pendingLmHead.hiddenDim,
        );
        console.log("[Pipeline] Applied pending lm_head to engine");
      }

      // Apply pending logits callback if one was set before engine creation
      if (this.pendingLogitsCallback) {
        this.engine.setLogitsCallback(this.pendingLogitsCallback);
        console.log("[Pipeline] Applied pending logits callback to engine");
      }

      this.updateStatus({
        stage: "ready",
        progress: 1.0,
        message: `Pipeline ready — ${manifest.name} projected into Atlas (${(performance.now() - t0).toFixed(0)}ms)`,
      });

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.updateStatus({ stage: "error", message: `Pipeline error: ${msg}`, error: msg });
      throw error;
    }
  }

  /**
   * Run inference: prompt tokens → generated tokens.
   */
  async infer(promptTokens: number[], maxTokens: number = 32): Promise<InferenceResult> {
    if (!this.engine || this._status.stage !== "ready") {
      throw new Error("Pipeline not initialized. Call initialize() first.");
    }

    this.updateStatus({ stage: "inferring", message: "Generating via coherence navigation..." });
    const result = await this.engine.generate(promptTokens, maxTokens);
    this.updateStatus({ stage: "ready", message: `Generated ${result.tokenIds.length} tokens at ${result.tokensPerSecond.toFixed(0)} tok/s` });

    return result;
  }

  /**
   * Run the full benchmark: initialize + generate + report.
   */
  async benchmark(promptTokens: number[] = [1, 2, 3, 4, 5], maxTokens: number = 16): Promise<PipelineReport> {
    const t0 = performance.now();

    await this.initialize();

    const benchmarkResult = await this.infer(promptTokens, maxTokens);

    return {
      projectionReport: this.decomposition ? generateProjectionReport(this.decomposition) : "",
      holographicReport: this.holographicEncoding ? generateHolographicReport(this.holographicEncoding) : "",
      decomposition: this.decomposition!,
      holographicEncoding: this.holographicEncoding!,
      engramStats: this.engram!.stats(),
      benchmarkResult,
      totalTimeMs: performance.now() - t0,
    };
  }

  /** Get the raw decomposition */
  getDecomposition(): AtlasModelDecomposition | null {
    return this.decomposition;
  }

  /** Get the inference engine */
  getEngine(): CoherenceInferenceEngine | null {
    return this.engine;
  }

  /** Wire real lm_head weights into the engine's output projection */
  setLmHead(weights: Float32Array, vocabSize: number, hiddenDim: number): void {
    this.pendingLmHead = { weights, vocabSize, hiddenDim };
    // If engine already exists, apply immediately
    this.engine?.setLmHead(weights, vocabSize, hiddenDim);
  }

  /** Wire a real model logits callback into the engine */
  setLogitsCallback(fn: (context: number[]) => Promise<Float32Array>): void {
    this.pendingLogitsCallback = fn;
    // If engine already exists, apply immediately
    this.engine?.setLogitsCallback(fn);
  }
}

/** Yield to the event loop for UI responsiveness */
function yieldThread(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

// ═══════════════════════════════════════════════════════════════
// Convenience Functions
// ═══════════════════════════════════════════════════════════════

/**
 * Quick-project a model and return the report.
 * One-liner for testing.
 */
export async function quickProject(
  manifest: ModelManifest = LLAMA_31_8B_MANIFEST,
  maxLayers: number = 4,
): Promise<PipelineReport> {
  const pipeline = new AtlasProjectionPipeline({ manifest, maxLayers });
  return pipeline.benchmark();
}

/** Pre-built model manifests */
export const MODEL_MANIFESTS: Record<string, ModelManifest> = {
  "llama-3.1-8b": LLAMA_31_8B_MANIFEST,
  "llama-3.1-70b": {
    ...LLAMA_31_8B_MANIFEST,
    name: "Meta-Llama-3.1-70B",
    parameterCount: 70_600_000_000,
    layerCount: 80,
    hiddenDim: 8192,
    headCount: 64,
    headDim: 128,
    intermediateDim: 28672,
  },
  "phi-3-mini": {
    name: "Phi-3-mini-4k",
    architecture: "phi",
    parameterCount: 3_800_000_000,
    layerCount: 32,
    hiddenDim: 3072,
    headCount: 32,
    headDim: 96,
    intermediateDim: 8192,
    vocabSize: 32064,
    contextLength: 4096,
    precision: "bf16",
    sourceFormat: "safetensors",
  },
  "smollm2-1.7b": {
    name: "SmolLM2-1.7B",
    architecture: "generic",
    parameterCount: 1_700_000_000,
    layerCount: 24,
    hiddenDim: 2048,
    headCount: 16,
    headDim: 128,
    intermediateDim: 8192,
    vocabSize: 49152,
    contextLength: 8192,
    precision: "bf16",
    sourceFormat: "safetensors",
  },
  "mistral-7b": {
    name: "Mistral-7B-v0.3",
    architecture: "mistral",
    parameterCount: 7_240_000_000,
    layerCount: 32,
    hiddenDim: 4096,
    headCount: 32,
    headDim: 128,
    intermediateDim: 14336,
    vocabSize: 32768,
    contextLength: 32768,
    precision: "bf16",
    sourceFormat: "safetensors",
  },
};
