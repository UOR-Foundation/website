/**
 * type: namespace — unified barrel export.
 *
 * Consolidates: kg-store + code-kg
 * User Space — knowledge graph storage and code-to-graph projection.
 *
 * @namespace type:
 * @version 2.0.0
 */

// ── Knowledge Graph Store (from kg-store/) ─────────────────────────────────
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
} from "@/modules/kg-store/store";
export {
  getGraphStats,
  listGraphs,
  getNamedGraphTripleCount,
} from "@/modules/kg-store/graph-manager";
export type { GraphStats } from "@/modules/kg-store/graph-manager";
export { UnsGraph, ONTOLOGY_GRAPH, Q0_GRAPH } from "@/modules/kg-store/uns-graph";
export type { Quad } from "@/modules/kg-store/uns-graph";
export { generateVoID, CANONICAL_QUERIES } from "@/modules/kg-store/void-descriptor";
export type { VoIDDescriptor } from "@/modules/kg-store/void-descriptor";
export {
  recordToSchemaOrg,
  functionToSchemaOrg,
  objectToSchemaOrg,
  nodeToSchemaOrg,
  negotiateFormat,
  serializeSchemaOrg,
  generateSitemap,
  generateRobotsTxt,
} from "@/modules/kg-store/schema-org";
export type {
  SchemaOrgRecord,
  SchemaOrgFunction,
  SchemaOrgStoredObject,
  SitemapEntry,
  SerializationFormat,
} from "@/modules/kg-store/schema-org";
export { default as KnowledgeGraphPage } from "@/modules/kg-store/pages/KnowledgeGraphPage";

// ── Code Knowledge Graph (from code-kg/) ───────────────────────────────────
export { analyzeTypeScript } from "@/modules/code-kg/analyzer";
export type { CodeEntity, CodeRelation, AnalysisResult, EntityType, RelationType } from "@/modules/code-kg/analyzer";
export { ingestCodeGraph, exportToKgStore } from "@/modules/code-kg/bridge";
export type { CodeEntityDerived, CodeGraphResult } from "@/modules/code-kg/bridge";
export { buildVisualization, ENTITY_COLORS, ENTITY_STROKE } from "@/modules/code-kg/visualizer";
export type { GraphNode, GraphEdge, VisualizationData } from "@/modules/code-kg/visualizer";
export { default as CodeKnowledgeGraphPage } from "@/modules/code-kg/pages/CodeKnowledgeGraphPage";
export { buildCodeGraph, graphToTriples, computeStats } from "@/modules/code-kg/engine";
export type { CodeNode, CodeEdge, CodeGraph, CodeTriple, NodeKind, EdgeKind, GraphStats as CodeGraphStats } from "@/modules/code-kg/engine";
export { UOR_MODULE_SOURCES } from "@/modules/code-kg/data";
export type { ModuleSource } from "@/modules/code-kg/data";
