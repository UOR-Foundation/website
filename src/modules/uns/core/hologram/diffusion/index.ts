/**
 * Hologram Diffusion Engine — Module Barrel
 * ══════════════════════════════════════════
 *
 * Sovereign browser-native Stable Diffusion 1.5 pipeline.
 * Runs entirely via ONNX Runtime Web + WebGPU — zero server dependency
 * after model files are seeded via model-seeder.
 *
 * Usage:
 *   import { DiffusionPipeline } from "./diffusion";
 *
 *   const pipeline = new DiffusionPipeline();
 *   await pipeline.load(onProgress);
 *   const result = await pipeline.generate("a cat in space", undefined, onProgress);
 *   // result.imageData → canvas rendering
 *
 * Architecture (Holographic Projection):
 *   Prompt → singleProofHash(prompt) → promptCid
 *   promptCid → cache check → hit? instant replay : generate + cache
 *
 * @module uns/core/hologram/diffusion
 */

export { DiffusionPipeline } from "./pipeline";
export { PndmScheduler, generateLatentNoise } from "./scheduler";
export { ClipTokenizer } from "./clip-tokenizer";

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
