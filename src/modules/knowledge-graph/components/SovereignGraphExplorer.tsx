/**
 * SovereignGraphExplorer — Immersive, full-screen interactive knowledge graph visualizer.
 * Uses Sigma.js (WebGL) + Graphology for high-performance rendering.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { SigmaContainer, useRegisterEvents, useSigma } from "@react-sigma/core";
import "@react-sigma/core/lib/style.css";
import forceAtlas2 from "graphology-layout-forceatlas2";
import { useGraphData, colorForType } from "../hooks/useGraphData";
import { GraphFilterBar } from "./GraphFilterBar";
import { NodeDetailSheet } from "./NodeDetailSheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { Network, Loader2 } from "lucide-react";

/** Internal component that registers Sigma events and manages interactions */
function GraphEvents({
  onClickNode,
  onHoverNode,
  searchQuery,
  hiddenTypes,
}: {
  onClickNode: (nodeId: string) => void;
  onHoverNode: (nodeId: string | null) => void;
  searchQuery: string;
  hiddenTypes: Set<string>;
}) {
  const sigma = useSigma();
  const registerEvents = useRegisterEvents();

  // Register click/hover events
  useEffect(() => {
    registerEvents({
      clickNode: (event) => onClickNode(event.node),
      enterNode: (event) => onHoverNode(event.node),
      leaveNode: () => onHoverNode(null),
    });
  }, [registerEvents, onClickNode, onHoverNode]);

  // Apply node reducers for filtering & search highlighting
  useEffect(() => {
    const graph = sigma.getGraph();
    const lowerQuery = searchQuery.toLowerCase();

    sigma.setSetting("nodeReducer", (node, data) => {
      const nt = (data.nodeType as string || "entity").toLowerCase();
      if (hiddenTypes.has(nt)) {
        return { ...data, hidden: true };
      }
      if (lowerQuery && !(data.label as string || "").toLowerCase().includes(lowerQuery)) {
        return { ...data, color: "#334155", size: Math.max(2, (data.size as number || 4) * 0.5), zIndex: 0 };
      }
      if (lowerQuery && (data.label as string || "").toLowerCase().includes(lowerQuery)) {
        return { ...data, highlighted: true, zIndex: 2, size: Math.max(8, (data.size as number || 6) * 1.3) };
      }
      return data;
    });

    sigma.setSetting("edgeReducer", (_edge, data) => {
      return data;
    });

    sigma.refresh();
  }, [sigma, searchQuery, hiddenTypes]);

  return null;
}

/** Run ForceAtlas2 layout for N iterations */
function useLayout(graph: ReturnType<typeof useGraphData>["graph"], loading: boolean) {
  const layoutRan = useRef(false);

  useEffect(() => {
    if (loading || graph.order === 0 || layoutRan.current) return;
    layoutRan.current = true;

    // Assign random positions if missing
    graph.forEachNode((node) => {
      if (graph.getNodeAttribute(node, "x") == null) {
        graph.setNodeAttribute(node, "x", Math.random() * 500);
        graph.setNodeAttribute(node, "y", Math.random() * 500);
      }
    });

    // Run synchronous ForceAtlas2 for a fixed number of iterations
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

export function SovereignGraphExplorer() {
  const { graph, loading, error, nodeCount, edgeCount, nodeTypes, refresh } = useGraphData();
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());
  const isMobile = useIsMobile();

  // Run layout
  useLayout(graph, loading);

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

  // Get selected node details
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
  }, [selectedNode, graph, nodeCount]); // nodeCount as dependency to re-derive after refresh

  // Empty state
  if (!loading && nodeCount === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-background/50">
        <div className="w-16 h-16 rounded-2xl bg-muted/40 flex items-center justify-center">
          <Network className="w-8 h-8 text-muted-foreground/60" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-foreground">No graph data yet</p>
          <p className="text-xs text-muted-foreground max-w-[280px]">
            Ingest data from the Knowledge Graph page to populate the visual explorer.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-background overflow-hidden">
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading graph…
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 px-3 py-1.5 bg-destructive/20 text-destructive text-xs rounded-lg border border-destructive/30">
          {error}
        </div>
      )}

      {/* Filter bar — floating top-left */}
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

      {/* Sigma.js Canvas */}
      {graph.order > 0 && (
        <SigmaContainer
          graph={graph}
          style={{ width: "100%", height: "100%" }}
          settings={{
            defaultNodeColor: "#64748b",
            defaultEdgeColor: "#334155",
            edgeReducer: (_edge, data) => ({ ...data, color: "#334155", size: 0.5 }),
            labelColor: { color: "#94a3b8" },
            labelFont: "Inter, system-ui, sans-serif",
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
          />
        </SigmaContainer>
      )}

      {/* Hovered node tooltip */}
      {hoveredNode && graph.hasNode(hoveredNode) && !selectedNode && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 bg-card/90 backdrop-blur-md border border-border/50 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: colorForType(graph.getNodeAttribute(hoveredNode, "nodeType") || "entity") }}
            />
            <span className="text-xs font-medium text-foreground">
              {graph.getNodeAttribute(hoveredNode, "label")}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
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
        />
      )}
    </div>
  );
}

export default SovereignGraphExplorer;
