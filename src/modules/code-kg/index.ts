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
