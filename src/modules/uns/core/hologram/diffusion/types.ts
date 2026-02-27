/**
 * Hologram Diffusion Engine — Type Definitions
 * ══════════════════════════════════════════════
 *
 * Types for the sovereign, browser-native Stable Diffusion 1.5 pipeline.
 * Runs entirely via ONNX Runtime Web + WebGPU — zero server dependency.
 *
 * @module uns/core/hologram/diffusion/types
 */

// ── Pipeline Configuration ────────────────────────────────────────────────

export interface DiffusionConfig {
  /** HuggingFace model ID for the ONNX model files */
  modelId: string;
  /** Number of denoising steps (default: 20) */
  numSteps: number;
  /** Classifier-free guidance scale (default: 7.5) */
  guidanceScale: number;
  /** Output image dimensions (SD 1.5 native: 512x512) */
  width: number;
  height: number;
  /** Random seed for reproducibility (null = random) */
  seed: number | null;
  /** ONNX Runtime execution provider */
  executionProvider: "webgpu" | "wasm" | "cpu";
}

export const DEFAULT_DIFFUSION_CONFIG: DiffusionConfig = {
  modelId: "microsoft/stable-diffusion-v1.5-webnn",
  numSteps: 20,
  guidanceScale: 7.5,
  width: 512,
  height: 512,
  seed: null,
  executionProvider: "webgpu",
};

// ── Pipeline Progress ─────────────────────────────────────────────────────

export type DiffusionPhase =
  | "idle"
  | "loading-tokenizer"
  | "loading-text-encoder"
  | "loading-unet"
  | "loading-vae"
  | "encoding-text"
  | "denoising"
  | "decoding"
  | "complete"
  | "error";

export interface DiffusionProgress {
  phase: DiffusionPhase;
  /** 0.0 → 1.0 overall progress */
  progress: number;
  /** Current denoising step (during "denoising" phase) */
  step?: number;
  totalSteps?: number;
  /** Elapsed time in ms */
  elapsedMs?: number;
  message?: string;
}

// ── Generation Result ─────────────────────────────────────────────────────

export interface DiffusionResult {
  /** Generated image as ImageData (for canvas rendering) */
  imageData: ImageData;
  /** Content-addressed CID of the prompt */
  promptCid?: string;
  /** Content-addressed CID of the generated image */
  imageCid?: string;
  /** Generation metadata */
  meta: {
    prompt: string;
    negativePrompt?: string;
    config: DiffusionConfig;
    elapsedMs: number;
    seed: number;
  };
}

// ── ONNX Session Types ───────────────────────────────────────────────────

export interface DiffusionSessions {
  textEncoder: any; // ort.InferenceSession
  unet: any;        // ort.InferenceSession
  vaeDecoder: any;   // ort.InferenceSession
}

// ── Model File Manifest ──────────────────────────────────────────────────

export interface ModelFileManifest {
  modelId: string;
  files: {
    textEncoder: string;
    unet: string;
    vaeDecoder: string;
    tokenizer: string;
    tokenizerConfig: string;
    schedulerConfig: string;
  };
  /** Approximate total download size in MB */
  totalSizeMB: number;
}

/** File manifest for microsoft/stable-diffusion-v1.5-webnn */
export const SD15_WEBNN_MANIFEST: ModelFileManifest = {
  modelId: "microsoft/stable-diffusion-v1.5-webnn",
  files: {
    textEncoder: "text-encoder.onnx",
    unet: "unet.onnx",
    vaeDecoder: "vae-decoder.onnx",
    tokenizer: "tokenizer/vocab.json",
    tokenizerConfig: "tokenizer/merges.txt",
    schedulerConfig: "scheduler/scheduler_config.json",
  },
  totalSizeMB: 2048, // ~2GB fp16
};
