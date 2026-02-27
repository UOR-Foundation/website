/**
 * Hologram Compute — Module Barrel
 * ═════════════════════════════════
 *
 * Provider-agnostic compute substrate.
 * Local vGPU today, cloud + P2P tomorrow.
 *
 * @module hologram-compute
 */

export {
  ComputeOrchestrator,
  LocalGpuProvider,
  CloudProvider,
  PeerProvider,
  getOrchestrator,
} from "./providers";

export type {
  ProviderKind,
  ProviderStatus,
  ComputeCapabilities,
  ProviderSnapshot,
  ComputeJob,
  ComputeJobResult,
  ComputeProvider,
  CpuLutBenchmarkResult,
} from "./providers";

export {
  MUL_TABLE,
  MUL_TABLE_BYTES,
  BIT_TABLE,
  BIT_TABLE_Q4_BYTES,
  lutMatmul,
  standardMatmul,
  gpuMatmul,
  gpuLastPath,
  buildCoQuantLut,
  coQuantMatVecCpu,
  coQuantLinearGpu,
  quantize,
  verifyCoQuant,
  HologramComputeCache,
  seededMatrix,
  fingerprint,
  matrixChecksum,
} from "./hologram-matmul";

export type {
  PrecomputeStats,
  BitPrecision,
  BitTableDescriptor,
  QuantBits,
  CoQuantLut,
} from "./hologram-matmul";
