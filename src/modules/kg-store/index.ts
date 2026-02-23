/**
 * kg-store module barrel export.
 */

export {
  ingestDatum,
  ingestDatumBatch,
  ingestDerivation,
  ingestCertificate,
  ingestReceipt,
  ingestTriples,
  getDatum,
  getDatumByValue,
  getDerivation,
} from "./store";

export {
  getGraphStats,
  listGraphs,
  getNamedGraphTripleCount,
} from "./graph-manager";
export type { GraphStats } from "./graph-manager";

// ── P24: UnsGraph quad store + VoID descriptor ──────────────────────────────
export { UnsGraph, ONTOLOGY_GRAPH, Q0_GRAPH } from "./uns-graph";
export type { Quad } from "./uns-graph";
export { generateVoID, CANONICAL_QUERIES } from "./void-descriptor";
export type { VoIDDescriptor } from "./void-descriptor";

export { default as KnowledgeGraphPage } from "./pages/KnowledgeGraphPage";
