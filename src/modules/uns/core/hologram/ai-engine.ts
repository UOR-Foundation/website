/**
 * Hologram AI Engine — In-Browser ONNX Model Inference
 * ═══════════════════════════════════════════════════════
 *
 * Runs any ONNX-compatible Hugging Face model directly in the browser
 * via Transformers.js, with WebGPU acceleration when available.
 *
 * UOR Compliance:
 *   - Every loaded model is content-addressed (model ID → SHA-256 → CID)
 *   - Every inference produces a traceable derivation (input CID → output CID)
 *   - Model configs are serializable Lens blueprints
 *
 * Architecture:
 *   ┌──────────────┬──────────────────────────────────────────┐
 *   │ vShell Cmd    │ AI Operation                             │
 *   ├──────────────┼──────────────────────────────────────────┤
 *   │ ai load       │ Download & register ONNX model           │
 *   │ ai run        │ Generate text with active model          │
 *   │ ai models     │ List registered model projections        │
 *   │ ai info       │ Show device, quantization, memory        │
 *   │ ai unload     │ Release model from memory                │
 *   └──────────────┴──────────────────────────────────────────┘
 *
 * @module uns/core/hologram/ai-engine
 */

import { singleProofHash, type SingleProofResult } from "@/lib/uor-canonical";

// ── Types ───────────────────────────────────────────────────────────────────

/** Supported Transformers.js task types for the pipeline API. */
export type AiTask =
  | "text-generation"
  | "text2text-generation"
  | "summarization"
  | "translation"
  | "feature-extraction"
  | "fill-mask"
  | "question-answering"
  | "sentiment-analysis"
  | "zero-shot-classification";

/** A registered model in the Hologram AI subsystem. */
export interface AiModelRegistration {
  /** Content-addressed identity of the model config. */
  readonly configCid: string;
  /** Hugging Face model identifier. */
  readonly modelId: string;
  /** Task this model was loaded for. */
  readonly task: AiTask;
  /** Device used (webgpu or wasm). */
  readonly device: "webgpu" | "wasm";
  /** Quantization dtype. */
  readonly dtype: string;
  /** Timestamp of registration. */
  readonly loadedAt: string;
}

/** Result of a single inference run — also a v2 ComputationTrace. */
export interface AiInferenceResult {
  /** Trace type identifier. */
  readonly "@type": "trace:ComputationTrace";
  /** The generated text output. */
  readonly output: string;
  /** Content-addressed identity of the input. */
  readonly inputCid: string;
  /** Content-addressed identity of the output. */
  readonly outputCid: string;
  /** Inference time in milliseconds. */
  readonly inferenceTimeMs: number;
  /** Tokens generated (approximate). */
  readonly tokensGenerated: number;
  /** Whether WebGPU was used. */
  readonly gpuAccelerated: boolean;
  /** Model that produced this output. */
  readonly modelId: string;
  /** Self-certification: outputCid is the certificate. */
  readonly certifiedBy: string;
}

/** Progress callback for model loading. */
export type AiProgressCallback = (progress: {
  status: string;
  file?: string;
  progress?: number;
  loaded?: number;
  total?: number;
}) => void;

// ── Default Models ─────────────────────────────────────────────────────────

/**
 * Curated models that work well in-browser with WebGPU.
 * Ordered by size: smallest first for low-spec hardware.
 */
export const RECOMMENDED_MODELS: ReadonlyArray<{
  id: string;
  task: AiTask;
  dtype: string;
  description: string;
  sizeApprox: string;
}> = [
  {
    id: "onnx-community/Qwen2.5-0.5B-Instruct",
    task: "text-generation",
    dtype: "q4f16",
    description: "Qwen 0.5B — fast, capable, runs on any device",
    sizeApprox: "~350MB",
  },
  {
    id: "onnx-community/Qwen3-0.6B-ONNX",
    task: "text-generation",
    dtype: "q4f16",
    description: "Qwen3 0.6B — ultra-light, fast responses",
    sizeApprox: "~400MB",
  },
  {
    id: "Xenova/gpt2",
    task: "text-generation",
    dtype: "fp32",
    description: "GPT-2 — classic, instant responses",
    sizeApprox: "~500MB",
  },
  {
    id: "Xenova/distilbert-base-uncased-finetuned-sst-2-english",
    task: "sentiment-analysis",
    dtype: "fp32",
    description: "DistilBERT — sentiment analysis",
    sizeApprox: "~67MB",
  },
  {
    id: "Xenova/all-MiniLM-L6-v2",
    task: "feature-extraction",
    dtype: "fp32",
    description: "MiniLM — text embeddings (384-dim)",
    sizeApprox: "~23MB",
  },
];

// ── Hologram AI Engine ─────────────────────────────────────────────────────

/**
 * The Hologram AI Engine.
 *
 * Manages model lifecycle, inference, and UOR-compliant tracing.
 * Uses dynamic import of @huggingface/transformers for code-splitting.
 */
export class HologramAiEngine {
  private pipeline: any = null;
  private activeModel: AiModelRegistration | null = null;
  private registry = new Map<string, AiModelRegistration>();
  private loading = false;

  /** Whether a model is currently loaded and ready. */
  get isReady(): boolean {
    return this.pipeline !== null && this.activeModel !== null;
  }

  /** Whether a model is currently loading. */
  get isLoading(): boolean {
    return this.loading;
  }

  /** The currently active model, if any. */
  get active(): AiModelRegistration | null {
    return this.activeModel;
  }

  /** All registered models. */
  get models(): AiModelRegistration[] {
    return Array.from(this.registry.values());
  }

  /**
   * Load a Hugging Face model via Transformers.js.
   *
   * Downloads the ONNX weights, initializes the pipeline,
   * content-addresses the model config, and registers it.
   */
  async load(
    modelId: string,
    task: AiTask = "text-generation",
    options: {
      dtype?: string;
      device?: "webgpu" | "wasm";
      onProgress?: AiProgressCallback;
    } = {},
  ): Promise<AiModelRegistration> {
    if (this.loading) {
      throw new Error("Another model is currently loading. Please wait.");
    }

    this.loading = true;

    try {
      // Dynamic import for code-splitting — only load Transformers.js when needed
      const { pipeline: createPipeline, env } = await import("@huggingface/transformers");
      const { installModelProxy } = await import("./model-proxy");

      // Disable local model check (we always fetch from our proxy)
      env.allowLocalModels = false;

      // Detect WebGPU availability
      let device = options.device ?? "wasm";
      if (!options.device) {
        try {
          if (typeof navigator !== "undefined" && "gpu" in navigator) {
            const adapter = await navigator.gpu.requestAdapter();
            if (adapter) device = "webgpu";
          }
        } catch {
          // WebGPU not available, fall back to WASM
        }
      }

      const dtype = (options.dtype ?? (device === "webgpu" ? "q4f16" : "q8")) as any;

      // Install model proxy so all HF fetches route through our caching proxy
      const restoreFetch = installModelProxy();

      // Create the pipeline
      try {
        this.pipeline = await createPipeline(task, modelId, {
          device,
          dtype,
          progress_callback: options.onProgress,
        });
      } finally {
        restoreFetch();
      }

      // Content-address the model config
      const configProof = await singleProofHash({
        "@type": "uor:AiModelConfig",
        modelId,
        task,
        device,
        dtype,
      });

      const registration: AiModelRegistration = {
        configCid: configProof.cid,
        modelId,
        task,
        device,
        dtype,
        loadedAt: new Date().toISOString(),
      };

      this.activeModel = registration;
      this.registry.set(configProof.cid, registration);

      return registration;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Run inference on the active model.
   *
   * Produces a content-addressed derivation trace:
   *   inputCid × modelCid → outputCid
   */
  async run(
    prompt: string,
    options: {
      maxNewTokens?: number;
      temperature?: number;
      topK?: number;
      doSample?: boolean;
      /** Called with each token/chunk of text as it's generated. */
      onToken?: (text: string) => void;
    } = {},
  ): Promise<AiInferenceResult> {
    if (!this.pipeline || !this.activeModel) {
      throw new Error("No model loaded. Use 'ai load <model>' first.");
    }

    // Content-address the input
    const inputProof = await singleProofHash({
      "@type": "uor:AiInferenceInput",
      prompt,
      modelCid: this.activeModel.configCid,
      timestamp: new Date().toISOString(),
    });

    const start = performance.now();
    let outputText = "";
    let tokensGenerated = 0;

    const task = this.activeModel.task;

    if (task === "text-generation") {
      // Build streamer if callback provided
      let streamer: any = undefined;
      if (options.onToken) {
        const { TextStreamer } = await import("@huggingface/transformers");
        const tokenizer = this.pipeline.tokenizer;
        streamer = new TextStreamer(tokenizer, {
          skip_prompt: true,
          skip_special_tokens: true,
          callback_function: (text: string) => {
            options.onToken!(text);
          },
        });
      }

      const result = await this.pipeline(prompt, {
        max_new_tokens: options.maxNewTokens ?? 128,
        temperature: options.temperature ?? 0.7,
        top_k: options.topK ?? 50,
        do_sample: options.doSample ?? true,
        ...(streamer ? { streamer } : {}),
      });

      // Extract generated text, removing the original prompt
      const fullText = Array.isArray(result)
        ? result[0]?.generated_text ?? ""
        : result?.generated_text ?? "";

      // Handle chat-style outputs (array of messages)
      if (Array.isArray(fullText)) {
        const lastMsg = fullText[fullText.length - 1];
        outputText = typeof lastMsg === "string" ? lastMsg : lastMsg?.content ?? "";
      } else {
        outputText = typeof fullText === "string"
          ? fullText.slice(prompt.length).trim()
          : String(fullText);
      }

      tokensGenerated = outputText.split(/\s+/).length; // Approximate
    } else if (task === "sentiment-analysis") {
      const result = await this.pipeline(prompt);
      const r = Array.isArray(result) ? result[0] : result;
      outputText = `${r.label} (${(r.score * 100).toFixed(1)}%)`;
      tokensGenerated = 1;
    } else if (task === "feature-extraction") {
      const result = await this.pipeline(prompt, { pooling: "mean", normalize: true });
      const embedding = result.tolist()[0];
      outputText = `[${embedding.slice(0, 5).map((n: number) => n.toFixed(4)).join(", ")}… ] (${embedding.length}-dim)`;
      tokensGenerated = embedding.length;
    } else if (task === "summarization") {
      const result = await this.pipeline(prompt, { max_new_tokens: options.maxNewTokens ?? 64 });
      outputText = Array.isArray(result) ? result[0]?.summary_text ?? "" : result?.summary_text ?? "";
      tokensGenerated = outputText.split(/\s+/).length;
    } else {
      // Generic fallback
      const result = await this.pipeline(prompt);
      outputText = JSON.stringify(result, null, 2);
      tokensGenerated = 1;
    }

    const inferenceTimeMs = Math.round((performance.now() - start) * 100) / 100;

    // Content-address the output
    const outputProof = await singleProofHash({
      "@type": "uor:AiInferenceOutput",
      inputCid: inputProof.cid,
      output: outputText,
      modelCid: this.activeModel.configCid,
      inferenceTimeMs,
    });

    return {
      "@type": "trace:ComputationTrace",
      output: outputText,
      inputCid: inputProof.cid,
      outputCid: outputProof.cid,
      inferenceTimeMs,
      tokensGenerated,
      gpuAccelerated: this.activeModel.device === "webgpu",
      modelId: this.activeModel.modelId,
      certifiedBy: `urn:uor:cert:self:${outputProof.cid.slice(0, 16)}`,
    };
  }

  /** Unload the active model and release memory. */
  async unload(): Promise<void> {
    if (this.pipeline) {
      // Transformers.js pipelines can be disposed
      if (typeof this.pipeline.dispose === "function") {
        await this.pipeline.dispose();
      }
      this.pipeline = null;
    }
    this.activeModel = null;
  }

  /** Destroy the engine entirely. */
  async destroy(): Promise<void> {
    await this.unload();
    this.registry.clear();
  }
}

// ── Singleton ───────────────────────────────────────────────────────────────

let _instance: HologramAiEngine | null = null;

/** Get the singleton AI engine instance. */
export function getAiEngine(): HologramAiEngine {
  if (!_instance) _instance = new HologramAiEngine();
  return _instance;
}
