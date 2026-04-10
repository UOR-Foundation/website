/**
 * code-kg module barrel export.
 */

export { analyzeTypeScript } from "./analyzer";
export type { CodeEntity, CodeRelation, AnalysisResult, EntityType, RelationType } from "./analyzer";
export { ingestCodeGraph, exportToKgStore } from "./bridge";
export type { CodeEntityDerived, CodeGraphResult } from "./bridge";
export { buildVisualization, ENTITY_COLORS, ENTITY_STROKE } from "./visualizer";
export type { GraphNode, GraphEdge, VisualizationData } from "./visualizer";
export { default as CodeKnowledgeGraphPage } from "./pages/CodeKnowledgeGraphPage";

// ── Bevel-inspired engine (client-side TypeScript parser → UOR triples) ──
export { buildCodeGraph, graphToTriples, computeStats } from "./engine";
export type { CodeNode, CodeEdge, CodeGraph, CodeTriple, NodeKind, EdgeKind, GraphStats } from "./engine";
export { UOR_MODULE_SOURCES } from "./data";
export type { ModuleSource } from "./data";
