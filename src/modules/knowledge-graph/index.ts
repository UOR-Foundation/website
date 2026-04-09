/**
 * UOR Knowledge Graph — Barrel Export.
 *
 * CANONICAL: All graph operations go through the single GrafeoDB instance.
 */

export { grafeoStore as localGraphStore, grafeoStore, oxigraphStore } from "./grafeo-store";
export type { KGNode, KGEdge, KGDerivation, KGStats } from "./types";
export type { SparqlBinding } from "./grafeo-store";
export { sparqlQuery, sparqlUpdate } from "./grafeo-store";

export { ingestBridge } from "./ingest-bridge";

export { rawStore } from "./raw-store";
export type { RawAuditRecord } from "./raw-store";

export {
  findSimilarNodes,
  compressGraph,
  deductiveQuery,
  inductiveQuery,
  abductiveQuery,
  verifyGraphCoherence,
  graphSummary,
} from "./graph-compute";

export { syncBridge } from "./sync-bridge";
export type { SyncState } from "./sync-bridge";

export {
  decomposeToBlueprint,
  materializeFromBlueprint,
  decomposeRecursive,
  serializeBlueprint,
  deserializeBlueprint,
  verifyBlueprint,
} from "./blueprint";
export type {
  ObjectBlueprint,
  GroundObjectBlueprint,
  BlueprintAttribute,
  SpaceDefinition,
  CompositionRule,
  DerivationRule,
} from "./blueprint";

export {
  registerNodeType,
  validateBlueprint,
  getNodeTypeSchema,
  getAllRegisteredTypes,
} from "./blueprint-registry";
export type { AttributeSchema, ValidationResult, ValidationIssue } from "./blueprint-registry";

export { useKnowledgeGraph } from "./hooks/useKnowledgeGraph";
export type { KnowledgeGraphHandle } from "./hooks/useKnowledgeGraph";

export { processTabular, autoProfiler, deriveSourceKey } from "./data-engine";
export type {
  ProcessedDataPacket,
  ColumnStats,
  QualityDimensions,
  CleaningAction,
  ProcessingProfile,
} from "./data-engine";
