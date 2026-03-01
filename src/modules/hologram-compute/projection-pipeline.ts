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
}

/** Pipeline status */
export interface PipelineStatus {
  stage: "idle" | "projecting" | "caching" | "ready" | "inferring" | "error";
  progress: number; // [0, 1]
  message: string;
  decomposition: AtlasModelDecomposition | null;
  engramEntries: number;
  error?: string;
}

/** Complete pipeline result */
export interface PipelineReport {
  /** Model projection report */
  projectionReport: string;
  /** Decomposition stats */
  decomposition: AtlasModelDecomposition;
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
    decomposition: null, engramEntries: 0,
  };

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
      this.decomposition = projectModel(manifest);

      this.updateStatus({
        progress: 0.4,
        message: `Projected ${this.decomposition.totalBlocks} blocks across ${manifest.layerCount} layers`,
        decomposition: this.decomposition,
      });

      // ── Stage 2: Engram Cache Population ──────────────────
      this.updateStatus({ stage: "caching", progress: 0.5, message: "Populating Engram conditional memory cache..." });
      await yieldThread();

      this.engram = new EngramCache(this.config.engramConfig);

      // Select blocks for caching
      const blocks = this.config.useCompression
        ? this.decomposition.blocks.filter(b => b.isCanonical)
        : this.decomposition.blocks;

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
      this.engine.initialize(this.decomposition);

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
  infer(promptTokens: number[], maxTokens: number = 32): InferenceResult {
    if (!this.engine || this._status.stage !== "ready") {
      throw new Error("Pipeline not initialized. Call initialize() first.");
    }

    this.updateStatus({ stage: "inferring", message: "Generating via coherence navigation..." });
    const result = this.engine.generate(promptTokens, maxTokens);
    this.updateStatus({ stage: "ready", message: `Generated ${result.tokenIds.length} tokens at ${result.tokensPerSecond.toFixed(0)} tok/s` });

    return result;
  }

  /**
   * Run the full benchmark: initialize + generate + report.
   */
  async benchmark(promptTokens: number[] = [1, 2, 3, 4, 5], maxTokens: number = 16): Promise<PipelineReport> {
    const t0 = performance.now();

    await this.initialize();

    const benchmarkResult = this.infer(promptTokens, maxTokens);

    return {
      projectionReport: this.decomposition ? generateProjectionReport(this.decomposition) : "",
      decomposition: this.decomposition!,
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
