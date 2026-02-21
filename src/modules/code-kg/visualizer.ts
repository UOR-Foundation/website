/**
 * UOR Code Knowledge Graph Visualizer — converts code graph to SVG-ready format.
 *
 * Transforms CodeGraphResult into positioned nodes and edges for rendering.
 * Uses a simple force-directed-like layout computed deterministically.
 */

import type { CodeGraphResult, CodeEntityDerived } from "./bridge";
import type { CodeRelation } from "./analyzer";

// ── Types ───────────────────────────────────────────────────────────────────

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  x: number;
  y: number;
  iri: string;
  grade: string;
  derivationId: string;
  ringValue: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}

export interface VisualizationData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width: number;
  height: number;
}

// ── Entity type colors (CSS class names) ────────────────────────────────────

export const ENTITY_COLORS: Record<string, string> = {
  class: "fill-blue-500",
  function: "fill-green-500",
  interface: "fill-purple-500",
  variable: "fill-yellow-500",
  type: "fill-orange-500",
  enum: "fill-pink-500",
};

export const ENTITY_STROKE: Record<string, string> = {
  class: "stroke-blue-400",
  function: "stroke-green-400",
  interface: "stroke-purple-400",
  variable: "stroke-yellow-400",
  type: "stroke-orange-400",
  enum: "stroke-pink-400",
};

// ── Layout ──────────────────────────────────────────────────────────────────

/**
 * Arrange nodes in a circular layout with deterministic positioning.
 */
export function buildVisualization(
  result: CodeGraphResult,
  width: number = 600,
  height: number = 400
): VisualizationData {
  const { derivedEntities, relations } = result;
  const n = derivedEntities.length;
  if (n === 0) return { nodes: [], edges: [], width, height };

  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(cx, cy) * 0.7;

  // Position nodes in a circle
  const nodes: GraphNode[] = derivedEntities.map((de, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    return {
      id: de.entity.name,
      label: de.entity.name,
      type: de.entity.type,
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
      iri: de.iri,
      grade: de.derivation.epistemicGrade,
      derivationId: de.derivation.derivationId,
      ringValue: de.ringValue,
    };
  });

  const nodeMap = new Map<string, GraphNode>();
  for (const node of nodes) nodeMap.set(node.id, node);

  // Build edges with coordinates
  const edges: GraphEdge[] = [];
  for (const rel of relations) {
    const s = nodeMap.get(rel.source);
    const t = nodeMap.get(rel.target);
    if (s && t) {
      edges.push({
        source: rel.source,
        target: rel.target,
        type: rel.type,
        sourceX: s.x,
        sourceY: s.y,
        targetX: t.x,
        targetY: t.y,
      });
    }
  }

  return { nodes, edges, width, height };
}
