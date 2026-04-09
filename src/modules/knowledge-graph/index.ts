/**
 * UOR Knowledge Graph — Barrel Export.
 */

export { localGraphStore } from "./local-store";
export type { KGNode, KGEdge, KGDerivation, KGStats } from "./local-store";

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

export { useKnowledgeGraph } from "./hooks/useKnowledgeGraph";
export type { KnowledgeGraphHandle } from "./hooks/useKnowledgeGraph";
