/**
 * resolver module barrel export.
 */

export { resolve, classifyElement } from "./resolver";
export type { ResolverResult } from "./resolver";
export { computePartition } from "./partition";
export type { PartitionResult, ClosureMode } from "./partition";
export { correlate } from "./correlation";
export type { CorrelationResult } from "./correlation";

// P33: Fidelity Engine + SKOS Semantic Recommendations
export {
  correlateIds,
  correlateBytes,
  findNearDuplicates,
  classifyFidelity,
  FIDELITY_THRESHOLDS,
} from "./correlate-engine";
export type { CorrelateResult, SkosRelation, NearDuplicatePair } from "./correlate-engine";

// P34: NL Entity Resolver via DihedralFactorizationResolver
export { resolveEntity } from "./entity-resolver";
export type { EntityResolution, DihedralFactor } from "./entity-resolver";
