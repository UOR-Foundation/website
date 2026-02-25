/**
 * Hologram GPU — Module Barrel
 * ════════════════════════════
 *
 * The WebGPU device layer + UOR LUT compute engine.
 * Provides content-addressed GPU compute, rendering,
 * and constant-time lookup-table computation.
 *
 * @module uns/core/hologram/gpu
 */

export {
  HologramGpu,
  getHologramGpu,
  WGSL_SHADERS,
} from "./device";
export type {
  GpuStatus,
  GpuDeviceInfo,
  GpuComputeResult,
  GpuBenchmarkResult,
  ShaderName,
} from "./device";

export {
  UorLutEngine,
  getLutEngine,
  WGSL_LUT_APPLY,
} from "./lut-engine";
export type {
  LutName,
  LutApplyResult,
  LutComposeResult,
  CriticalIdentityProof,
  LutEngineInfo,
} from "./lut-engine";

// Re-export AI engine from sibling module for convenience
export {
  HologramAiEngine,
  getAiEngine,
  RECOMMENDED_MODELS,
} from "../ai-engine";
export type {
  AiModelRegistration,
  AiInferenceResult,
  AiTask,
} from "../ai-engine";
