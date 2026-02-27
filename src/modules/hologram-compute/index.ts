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
  lutMatmul,
  standardMatmul,
  gpuMatmul,
  HologramComputeCache,
  seededMatrix,
  fingerprint,
  matrixChecksum,
} from "./hologram-matmul";

export type { PrecomputeStats } from "./hologram-matmul";
