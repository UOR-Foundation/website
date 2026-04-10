/**
 * SovereignGraphExplorer — Immersive, full-screen interactive knowledge graph visualizer.
 * Uses Sigma.js (WebGL) + Graphology for high-performance rendering.
 *
 * Algebrica-style monochrome aesthetic with structural stats.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { SigmaContainer, useRegisterEvents, useSigma } from "@react-sigma/core";
import "@react-sigma/core/lib/react-sigma.min.css";
import forceAtlas2 from "graphology-layout-forceatlas2";
import { useGraphData, colorForType } from "../hooks/useGraphData";
import { GraphFilterBar } from "./GraphFilterBar";
import { NodeDetailSheet } from "./NodeDetailSheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { Network, Loader2 } from "lucide-react";

// ── Longest Chain (BFS-based longest shortest path) ───────────────────────

function computeLongestChain(graph: ReturnType<typeof useGraphData>["graph"]): number {
  if (graph.order === 0) return 0;

  let longestPath = 0;
  const nodes = graph.nodes();

  // Sample up to 50 nodes for performance (BFS from each)
  const sample = nodes.length <= 50 ? nodes : nodes.filter((_, i) => i % Math.ceil(nodes.length / 50) === 0);

  for (const start of sample) {
    const visited = new Set<string>([start]);
    const queue: Array<{ node: string; depth: number }> = [{ node: start, depth: 0 }];

    while (queue.length > 0) {
      const { node, depth } = queue.shift()!;
      if (depth > longestPath) longestPath = depth;

      graph.forEachNeighbor(node, (neighbor) => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({ node: neighbor, depth: depth + 1 });
        }
      });
    }
  }

  return longestPath;
}

// ── Sigma Event Handler ───────────────────────────────────────────────────

function GraphEvents({
  onClickNode,
  onHoverNode,
  searchQuery,
  hiddenTypes,
  selectedNode,
}: {
  onClickNode: (nodeId: string) => void;
  onHoverNode: (nodeId: string | null) => void;
  searchQuery: string;
  hiddenTypes: Set<string>;
  selectedNode: string | null;
}) {
  const sigma = useSigma();
  const registerEvents = useRegisterEvents();

  useEffect(() => {
    registerEvents({
      clickNode: (event) => onClickNode(event.node),
      enterNode: (event) => onHoverNode(event.node),
      leaveNode: () => onHoverNode(null),
    });
  }, [registerEvents, onClickNode, onHoverNode]);

  useEffect(() => {
    const graph = sigma.getGraph();
    const lowerQuery = searchQuery.toLowerCase();

    sigma.setSetting("nodeReducer", (node, data) => {
      const nt = (data.nodeType as string || "entity").toLowerCase();
      if (hiddenTypes.has(nt)) {
        return { ...data, hidden: true };
      }
      if (selectedNode && selectedNode !== node) {
        const isBacklink = graph.hasEdge(node, selectedNode) ||
          graph.someEdge(node, (_e, _a, _source, target) => target === selectedNode);
        if (isBacklink) {
          return { ...data, color: "#d4d4d8", zIndex: 2, size: Math.max(7, (data.size as number || 5) * 1.2) };
        }
        return { ...data, color: "#27272a", size: Math.max(2, (data.size as number || 4) * 0.6), zIndex: 0 };
      }
      if (selectedNode === node) {
        return { ...data, color: "#fafafa", zIndex: 3, size: Math.max(10, (data.size as number || 6) * 1.5) };
      }
      if (lowerQuery && !(data.label as string || "").toLowerCase().includes(lowerQuery)) {
        return { ...data, color: "#1c1c1e", size: Math.max(2, (data.size as number || 4) * 0.5), zIndex: 0 };
      }
      if (lowerQuery && (data.label as string || "").toLowerCase().includes(lowerQuery)) {
        return { ...data, color: "#e4e4e7", highlighted: true, zIndex: 2, size: Math.max(8, (data.size as number || 6) * 1.3) };
      }
      return data;
    });

    sigma.setSetting("edgeReducer", (edge, data) => {
      if (selectedNode) {
        const source = graph.source(edge);
        const target = graph.target(edge);
        if (target === selectedNode) {
          return { ...data, color: "#a1a1aa", size: 1 };
        }
        if (source === selectedNode) {
          return { ...data, color: "#71717a", size: 1 };
        }
        return { ...data, color: "#0a0a0a", size: 0.15 };
      }
      return data;
    });

    sigma.refresh();
  }, [sigma, searchQuery, hiddenTypes, selectedNode]);

  return null;
}

// ── ForceAtlas2 Layout ────────────────────────────────────────────────────

function useLayout(graph: ReturnType<typeof useGraphData>["graph"], loading: boolean) {
  const layoutRan = useRef(false);

  useEffect(() => {
    if (loading || graph.order === 0 || layoutRan.current) return;
    layoutRan.current = true;

    graph.forEachNode((node) => {
      if (graph.getNodeAttribute(node, "x") == null) {
        graph.setNodeAttribute(node, "x", Math.random() * 500);
        graph.setNodeAttribute(node, "y", Math.random() * 500);
      }
    });

    try {
      forceAtlas2.assign(graph, {
        iterations: 100,
        settings: {
          gravity: 1,
          scalingRatio: 2,
          barnesHutOptimize: graph.order > 200,
          slowDown: 5,
        },
      });
    } catch (e) {
      console.warn("ForceAtlas2 layout failed:", e);
    }
  }, [graph, loading]);
}

// ── Algebrica Stat Block ──────────────────────────────────────────────────

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center px-3">
      <span className="text-[15px] font-mono font-semibold text-foreground/80 tracking-tight tabular-nums">
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
      <span className="text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground/40 mt-0.5">
        {label}
      </span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────

export function SovereignGraphExplorer() {
  const { graph, loading, error, nodeCount, edgeCount, nodeTypes, refresh } = useGraphData();
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());
  const isMobile = useIsMobile();

  useLayout(graph, loading);

  const longestChain = useMemo(() => computeLongestChain(graph), [graph, nodeCount]);

  const toggleType = useCallback((type: string) => {
    setHiddenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const onClickNode = useCallback((nodeId: string) => {
    setSelectedNode(nodeId);
  }, []);

  const onHoverNode = useCallback((nodeId: string | null) => {
    setHoveredNode(nodeId);
  }, []);

  const selectedNodeData = useMemo(() => {
    if (!selectedNode || !graph.hasNode(selectedNode)) return null;
    const attrs = graph.getNodeAttributes(selectedNode);
    const edges: Array<{ source: string; target: string; predicate: string }> = [];
    graph.forEachEdge(selectedNode, (_edge, edgeAttrs, source, target) => {
      edges.push({
        source,
        target,
        predicate: (edgeAttrs.label as string) || (edgeAttrs.predicate as string) || "—",
      });
    });
    return { attrs, edges };
  }, [selectedNode, graph, nodeCount]);

  // Empty state
  if (!loading && nodeCount === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-[#0a0a0a]">
        <div className="w-16 h-16 rounded-2xl bg-[#141414] border border-[#1c1c1e] flex items-center justify-center">
          <Network className="w-8 h-8 text-[#3f3f46]" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-[#a1a1aa]">No graph data yet</p>
          <p className="text-xs text-[#52525b] max-w-[280px]">
            Ingest data from the Knowledge Graph page to populate the visual explorer.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-[#0a0a0a] overflow-hidden">
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#0a0a0a]/90 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm text-[#71717a]">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading graph…
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 px-3 py-1.5 bg-[#1c1c1e] text-[#a1a1aa] text-xs rounded-lg border border-[#27272a]">
          {error}
        </div>
      )}

      {/* Filter bar */}
      <div className={`absolute z-30 ${isMobile ? "top-2 left-2 right-2" : "top-3 left-3 w-[240px]"}`}>
        <GraphFilterBar
          nodeTypes={nodeTypes}
          hiddenTypes={hiddenTypes}
          onToggleType={toggleType}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onRefresh={refresh}
          nodeCount={nodeCount}
          edgeCount={edgeCount}
          loading={loading}
        />
      </div>

      {/* Algebrica-style stats panel — bottom-right */}
      <div className={`absolute z-20 ${isMobile ? "bottom-2 right-2 left-2" : "bottom-3 right-3"}`}>
        <div className="flex items-center divide-x divide-[#1c1c1e] px-1 py-2 bg-[#0a0a0a]/80 backdrop-blur-md border border-[#1c1c1e] rounded-xl">
          <StatBlock label="Nodes" value={nodeCount} />
          <StatBlock label="Relations" value={edgeCount} />
          <StatBlock label="Longest Chain" value={longestChain} />
        </div>
      </div>

      {/* Sigma.js Canvas */}
      {graph.order > 0 && (
        <SigmaContainer
          graph={graph}
          style={{ width: "100%", height: "100%" }}
          settings={{
            defaultNodeColor: "#52525b",
            defaultEdgeColor: "#18181b",
            edgeReducer: (_edge, data) => ({ ...data, color: "#18181b", size: 0.3 }),
            labelColor: { color: "#71717a" },
            labelFont: "'DM Sans', system-ui, sans-serif",
            labelSize: 11,
            labelRenderedSizeThreshold: 8,
            renderEdgeLabels: false,
            enableEdgeEvents: false,
            zIndex: true,
          }}
        >
          <GraphEvents
            onClickNode={onClickNode}
            onHoverNode={onHoverNode}
            searchQuery={searchQuery}
            hiddenTypes={hiddenTypes}
            selectedNode={selectedNode}
          />
        </SigmaContainer>
      )}

      {/* Hovered node tooltip */}
      {hoveredNode && graph.hasNode(hoveredNode) && !selectedNode && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 bg-[#141414]/95 backdrop-blur-md border border-[#1c1c1e] rounded-lg shadow-2xl">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: colorForType(graph.getNodeAttribute(hoveredNode, "nodeType") || "entity") }}
            />
            <span className="text-[11px] font-medium text-[#e4e4e7]">
              {graph.getNodeAttribute(hoveredNode, "label")}
            </span>
            <span className="text-[9px] text-[#52525b] font-mono">
              {graph.getNodeAttribute(hoveredNode, "nodeType")}
            </span>
          </div>
        </div>
      )}

      {/* Node detail panel */}
      {selectedNode && selectedNodeData && (
        <NodeDetailSheet
          nodeId={selectedNode}
          attrs={selectedNodeData.attrs}
          edges={selectedNodeData.edges}
          onClose={() => setSelectedNode(null)}
          onNavigateNode={(id) => setSelectedNode(id)}
        />
      )}
    </div>
  );
}

export default SovereignGraphExplorer;
