/**
 * UOR Knowledge Graph — Barrel Export.
 *
 * CANONICAL: All graph operations go through the single GrafeoDB instance.
 * Absorbs former kg-store module.
 */

export { grafeoStore as localGraphStore, grafeoStore } from "./grafeo-store";
export type { KGNode, KGEdge, KGDerivation, KGStats } from "./types";
export type { SparqlBinding } from "./grafeo-store";
export { sparqlQuery, sparqlUpdate } from "./grafeo-store";

export { ingestBridge } from "./ingest-bridge";

export { getBacklinks, getBacklinkCount, invalidateBacklinks } from "./backlinks";
export type { Backlink } from "./backlinks";

export { parseWikiLinks, stripWikiLinks, hasWikiSyntax } from "./lib/wiki-links";
export type { WikiLink, Hashtag, BlockRef, ParseResult } from "./lib/wiki-links";

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

// ── Absorbed from kg-store ──────────────────────────────────────────────────

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
  getNamespaceStats,
} from "./graph-manager";
export type { GraphStats } from "./graph-manager";

export { UnsGraph, ONTOLOGY_GRAPH, Q0_GRAPH } from "./uns-graph";
export type { Quad } from "./uns-graph";
export { generateVoID, CANONICAL_QUERIES } from "./void-descriptor";
export type { VoIDDescriptor } from "./void-descriptor";

export {
  recordToSchemaOrg,
  functionToSchemaOrg,
  objectToSchemaOrg,
  nodeToSchemaOrg,
  negotiateFormat,
  serializeSchemaOrg,
  generateSitemap,
  generateRobotsTxt,
} from "./schema-org";
export type {
  SchemaOrgRecord,
  SchemaOrgFunction,
  SchemaOrgStoredObject,
  SitemapEntry,
  SerializationFormat,
} from "./schema-org";

export { default as KnowledgeGraphPage } from "./pages/KnowledgeGraphPage";

// ── Persistence Provider Layer ──────────────────────────────────────────────

export { getProvider, setProvider, initProvider } from "./persistence";
export type { PersistenceProvider, ChangeEntry, SovereignBundle } from "./persistence/types";
export { exportSovereignBundle, importSovereignBundle, downloadBundle } from "./persistence/bundle";

// ── Graph Infrastructure ────────────────────────────────────────────────────

export { adjacencyIndex } from "./lib/adjacency-index";
export { beginTransaction } from "./lib/transaction-envelope";
export type { Transaction } from "./lib/transaction-envelope";
export {
  queryNamespace,
  queryAcross,
  getNamespaceIri,
  listNamespaces,
} from "./lib/graph-namespaces";
export type { GraphNamespace } from "./lib/graph-namespaces";
