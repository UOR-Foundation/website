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

export { default as KnowledgeGraphPage } from "./pages/KnowledgeGraphPage";
