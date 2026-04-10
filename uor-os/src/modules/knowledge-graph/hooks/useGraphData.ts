/**
 * useGraphData — Fetches KG data via the Sovereign Bus and builds a Graphology instance.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import Graph from "graphology";
import type { KGNode, KGEdge } from "../types";

/** Node-type → color mapping — Algebrica-inspired monochrome palette */
export const NODE_TYPE_COLORS: Record<string, string> = {
  entity:      "#d4d4d8", // zinc-300
  datum:       "#a1a1aa", // zinc-400
  derivation:  "#e4e4e7", // zinc-200
  certificate: "#f5f5f4", // stone-100
  ceremony:    "#d6d3d1", // stone-300
  person:      "#fafaf9", // stone-50
  file:        "#a8a29e", // stone-400
  workspace:   "#e7e5e4", // stone-200
  folder:      "#c4b5a4", // warm muted
  default:     "#71717a", // zinc-500
};

export function colorForType(t: string): string {
  return NODE_TYPE_COLORS[t.toLowerCase()] ?? NODE_TYPE_COLORS.default;
}

export interface GraphData {
  graph: Graph;
  loading: boolean;
  error: string | null;
  nodeCount: number;
  edgeCount: number;
  nodeTypes: string[];
  refresh: () => Promise<void>;
}

export function useGraphData(): GraphData {
  const [graph] = useState(() => new Graph({ multi: true, type: "directed" }));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nodeCount, setNodeCount] = useState(0);
  const [edgeCount, setEdgeCount] = useState(0);
  const [nodeTypes, setNodeTypes] = useState<string[]>([]);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { call } = await import("@/modules/bus");
      // Fetch all nodes and edges via bus
      const [nodesResult, edgesResult] = await Promise.all([
        call("graph/query", {}).catch(() => []),
        call("graph/query", { predicate: "*" }).catch(() => []),
      ]);

      if (!mounted.current) return;

      graph.clear();

      const nodes: KGNode[] = Array.isArray(nodesResult) ? nodesResult : [];
      const edges: KGEdge[] = Array.isArray(edgesResult) ? edgesResult : [];

      const typesSet = new Set<string>();

      // Add nodes
      for (const node of nodes) {
        const addr = node.uorAddress;
        if (!addr || graph.hasNode(addr)) continue;
        const nt = (node.nodeType || "entity").toLowerCase();
        typesSet.add(nt);
        graph.addNode(addr, {
          label: node.label || addr.slice(-12),
          nodeType: nt,
          color: colorForType(nt),
          size: 6,
          x: Math.random() * 500,
          y: Math.random() * 500,
          // Metadata for detail panel
          uorCid: node.uorCid,
          rdfType: node.rdfType,
          stratumLevel: node.stratumLevel,
          totalStratum: node.totalStratum,
          qualityScore: node.qualityScore,
          properties: node.properties,
          createdAt: node.createdAt,
        });
      }

      // Add edges
      for (const edge of edges) {
        const s = edge.subject;
        const o = edge.object;
        // Ensure both endpoints exist
        if (!graph.hasNode(s)) {
          graph.addNode(s, {
            label: s.split("/").pop() || s.slice(-12),
            nodeType: "entity",
            color: colorForType("entity"),
            size: 4,
            x: Math.random() * 500,
            y: Math.random() * 500,
          });
          typesSet.add("entity");
        }
        if (!graph.hasNode(o)) {
          graph.addNode(o, {
            label: o.split("/").pop() || o.slice(-12),
            nodeType: "entity",
            color: colorForType("entity"),
            size: 4,
            x: Math.random() * 500,
            y: Math.random() * 500,
          });
          typesSet.add("entity");
        }
        try {
          graph.addEdge(s, o, {
            label: edge.predicate.split("/").pop() || edge.predicate,
            predicate: edge.predicate,
            graphIri: edge.graphIri,
          });
        } catch {
          // duplicate edge — skip
        }
      }

      // Scale node sizes by degree
      graph.forEachNode((n) => {
        const deg = graph.degree(n);
        graph.setNodeAttribute(n, "size", Math.max(4, Math.min(20, 4 + deg * 1.5)));
      });

      setNodeCount(graph.order);
      setEdgeCount(graph.size);
      setNodeTypes(Array.from(typesSet).sort());
    } catch (e) {
      if (mounted.current) setError(String(e));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [graph]);

  useEffect(() => {
    mounted.current = true;
    refresh();
    return () => { mounted.current = false; };
  }, [refresh]);

  return { graph, loading, error, nodeCount, edgeCount, nodeTypes, refresh };
}
