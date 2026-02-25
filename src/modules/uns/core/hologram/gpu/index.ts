/**
 * Hologram GPU — Module Barrel
 * ════════════════════════════
 *
 * The WebGPU device layer of the Hologram OS.
 * Provides content-addressed GPU compute and rendering.
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
