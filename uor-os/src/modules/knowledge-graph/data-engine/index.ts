/**
 * Data Engineering Engine — Barrel Export.
 *
 * 5-stage pipeline: Parse → Clean → Feature Eng → Quality → UOR Encode
 * Stages 1-4 are standard data engineering (no UOR).
 * Stage 5 calls singleProofHash() → IPv6 content address.
 */

export { processTabular } from "./engine";
export type {
  ProcessedDataPacket,
  ColumnStats,
  QualityDimensions,
  CleaningAction,
} from "./engine";

export { autoProfiler, deriveSourceKey } from "./profiler";
export type { ProcessingProfile } from "./profiler";
