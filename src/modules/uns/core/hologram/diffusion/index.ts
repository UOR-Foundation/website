/**
 * Hologram Diffusion Engine — Module Barrel
 * ══════════════════════════════════════════
 *
 * Sovereign, zero-dependency Stable Diffusion 1.5 in the browser.
 *
 * Architecture:
 *   ONNX → onnx-parser (inline protobuf) → weight-store (SHA-256 CIDs)
 *     → compute graph → WGSL kernels (WebGPU) + CPU fallback
 *
 * No onnxruntime. No npm AI dependencies. Pure Hologram.
 *
 * The same infrastructure that runs Whisper STT now runs image generation.
 * Content-addressing provides natural compression through deduplication:
 * identical tensors across repeated UNet blocks share a single CID.
 *
 * Usage:
 *   import { DiffusionPipeline, compileDiffusionModel } from "./diffusion";
 *
 *   // One-time compilation (downloads ONNX, stores content-addressed weights)
 *   await compileDiffusionModel({ onProgress: console.log });
 *
 *   // Inference (pure WGSL kernels, zero external deps)
 *   const pipeline = new DiffusionPipeline();
 *   await pipeline.load(onProgress);
 *   const result = await pipeline.generate("a cat in space", undefined, onProgress);
 *
 * @module uns/core/hologram/diffusion
 */

// Compiler (ONNX → Hologram)
export {
  compileDiffusionModel,
  isDiffusionCompiled,
  loadCompiledDiffusion,
  deleteCompiledDiffusion,
} from "./compiler";
export type { DiffusionCompileOptions } from "./compiler";

// Pipeline (native inference + inference cache)
export { DiffusionPipeline, getDiffusionCache } from "./pipeline";

// Scheduler
export { PndmScheduler, generateLatentNoise } from "./scheduler";

// Tokenizer
export { ClipTokenizer } from "./clip-tokenizer";

// Types
export type {
  DiffusionConfig,
  DiffusionPhase,
  DiffusionProgress,
  DiffusionResult,
  DiffusionSessions,
  ModelFileManifest,
} from "./types";

export {
  DEFAULT_DIFFUSION_CONFIG,
  SD15_WEBNN_MANIFEST,
} from "./types";
