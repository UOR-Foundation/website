/**
 * GraphExplorer — Force-directed d3 visualization of the code knowledge graph.
 *
 * Earth-tone palette, zoom/pan, click-to-inspect. Minimal, delightful.
 */

import { useRef, useEffect, useCallback, useState } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import type { CodeGraphStore, GraphNode, GraphEdge } from "../lib/graph-store";

// ── Palette ─────────────────────────────────────────────────────────────────

const NODE_COLORS: Record<string, string> = {
  class:     "hsl(25, 18%, 38%)",
  function:  "hsl(45, 16%, 36%)",
  interface: "hsl(30, 12%, 32%)",
  variable:  "hsl(38, 25%, 38%)",
  type:      "hsl(20, 14%, 34%)",
  enum:      "hsl(35, 20%, 30%)",
};

const NODE_RADII: Record<string, number> = {
  class: 8, interface: 7, enum: 7, function: 5, type: 5, variable: 4,
};

const EDGE_STYLES: Record<string, { dash: string; opacity: number; width: number }> = {
  imports:    { dash: "4,3",  opacity: 0.2,  width: 1   },
  calls:      { dash: "",     opacity: 0.35, width: 1   },
  extends:    { dash: "",     opacity: 0.5,  width: 1.5 },
  implements: { dash: "6,2",  opacity: 0.4,  width: 1   },
  exports:    { dash: "2,4",  opacity: 0.15, width: 0.5 },
};

// ── Types ───────────────────────────────────────────────────────────────────

interface SimNode extends SimulationNodeDatum {
  id: string;
  data: GraphNode;
}

interface SimLink extends SimulationLinkDatum<SimNode> {
  data: GraphEdge;
}

interface GraphExplorerProps {
  store: CodeGraphStore;
  onSelectNode: (node: GraphNode | null) => void;
  selectedNodeId: string | null;
}

export function GraphExplorer({ store, onSelectNode, selectedNodeId }: GraphExplorerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<SimNode[]>([]);
  const [links, setLinks] = useState<SimLink[]>([]);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const dragging = useRef<{ node: SimNode; startX: number; startY: number } | null>(null);
  const simRef = useRef<ReturnType<typeof forceSimulation<SimNode>> | null>(null);

  // Build simulation data from store
  useEffect(() => {
    const nodeArr = Array.from(store.nodes.values());
    if (nodeArr.length === 0) return;

    const simNodes: SimNode[] = nodeArr.map((n) => ({
      id: n.id,
      data: n,
      x: Math.random() * 600 - 300,
      y: Math.random() * 400 - 200,
    }));

    const nodeIndex = new Map(simNodes.map((n) => [n.id, n]));

    // Only include edges where both endpoints exist
    const simLinks: SimLink[] = store.edges
      .filter((e) => nodeIndex.has(e.source) && nodeIndex.has(e.target))
      .map((e) => ({
        source: nodeIndex.get(e.source)!,
        target: nodeIndex.get(e.target)!,
        data: e,
      }));

    const sim = forceSimulation(simNodes)
      .force("link", forceLink(simLinks).id((d: any) => d.id).distance(60).strength(0.3))
      .force("charge", forceManyBody().strength(-80))
      .force("center", forceCenter(0, 0))
      .force("collide", forceCollide<SimNode>().radius((d) => (NODE_RADII[d.data.type] ?? 5) + 3))
      .alphaDecay(0.02)
      .on("tick", () => {
        setNodes([...simNodes]);
        setLinks([...simLinks]);
      });

    simRef.current = sim;
    return () => { sim.stop(); };
  }, [store, store.nodes.size]);

  // Zoom/pan via wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    setTransform((t) => {
      const newK = Math.max(0.1, Math.min(5, t.k * factor));
      return { ...t, k: newK };
    });
  }, []);

  // Pan via drag on background
  const handleBgPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as SVGElement).tagName !== "rect") return;
    const startX = e.clientX, startY = e.clientY;
    const startTx = transform.x, startTy = transform.y;

    const onMove = (me: PointerEvent) => {
      setTransform({ x: startTx + me.clientX - startX, y: startTy + me.clientY - startY, k: transform.k });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [transform]);

  // Node drag
  const handleNodePointerDown = useCallback((e: React.PointerEvent, node: SimNode) => {
    e.stopPropagation();
    const startX = e.clientX, startY = e.clientY;
    const origX = node.x ?? 0, origY = node.y ?? 0;

    simRef.current?.alphaTarget(0.1).restart();

    const onMove = (me: PointerEvent) => {
      node.fx = origX + (me.clientX - startX) / transform.k;
      node.fy = origY + (me.clientY - startY) / transform.k;
      setNodes((prev) => [...prev]);
    };
    const onUp = () => {
      node.fx = null;
      node.fy = null;
      simRef.current?.alphaTarget(0);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [transform.k]);

  const showLabel = transform.k > 1.2;

  return (
    <svg
      ref={svgRef}
      className="w-full rounded-xl border border-border bg-card/50"
      style={{ height: 420, touchAction: "none" }}
      onWheel={handleWheel}
      onPointerDown={handleBgPointerDown}
    >
      {/* Background */}
      <rect width="100%" height="100%" fill="transparent" />

      <g transform={`translate(${transform.x + 400}, ${transform.y + 210}) scale(${transform.k})`}>
        {/* Edges */}
        {links.map((link, i) => {
          const s = link.source as SimNode;
          const t = link.target as SimNode;
          const style = EDGE_STYLES[link.data.type] ?? EDGE_STYLES.calls;
          const isHighlighted = selectedNodeId && (s.id === selectedNodeId || t.id === selectedNodeId);

          return (
            <line
              key={i}
              x1={s.x ?? 0}
              y1={s.y ?? 0}
              x2={t.x ?? 0}
              y2={t.y ?? 0}
              stroke="hsl(38, 15%, 50%)"
              strokeWidth={style.width}
              strokeDasharray={style.dash}
              opacity={isHighlighted ? 0.7 : style.opacity}
              className="transition-opacity duration-200"
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const r = NODE_RADII[node.data.type] ?? 5;
          const fill = NODE_COLORS[node.data.type] ?? "hsl(38, 15%, 35%)";
          const isSelected = node.id === selectedNodeId;
          const isHovered = node.id === hoveredId;

          return (
            <g key={node.id}>
              {/* Glow ring for selected/hovered */}
              {(isSelected || isHovered) && (
                <circle
                  cx={node.x ?? 0}
                  cy={node.y ?? 0}
                  r={r + 4}
                  fill="none"
                  stroke="hsl(38, 35%, 62%)"
                  strokeWidth={1}
                  opacity={isSelected ? 0.6 : 0.3}
                />
              )}
              <circle
                cx={node.x ?? 0}
                cy={node.y ?? 0}
                r={r}
                fill={fill}
                stroke={isSelected ? "hsl(38, 35%, 62%)" : "hsl(38, 10%, 20%)"}
                strokeWidth={isSelected ? 1.5 : 0.5}
                className="cursor-pointer transition-all duration-150"
                onPointerDown={(e) => handleNodePointerDown(e, node)}
                onPointerUp={() => onSelectNode(node.data)}
                onPointerEnter={() => setHoveredId(node.id)}
                onPointerLeave={() => setHoveredId(null)}
              />
              {/* Label — visible on zoom or hover */}
              {(showLabel || isHovered || isSelected) && (
                <text
                  x={(node.x ?? 0) + r + 4}
                  y={(node.y ?? 0) + 3}
                  fill="hsl(38, 8%, 65%)"
                  fontSize={10 / Math.max(transform.k, 0.8)}
                  fontFamily="'DM Sans', system-ui, sans-serif"
                  opacity={isHovered || isSelected ? 0.9 : 0.6}
                  pointerEvents="none"
                >
                  {node.data.name}
                </text>
              )}
            </g>
          );
        })}
      </g>

      {/* Legend */}
      <g transform="translate(12, 12)">
        {Object.entries(NODE_COLORS).slice(0, 4).map(([type, color], i) => (
          <g key={type} transform={`translate(0, ${i * 16})`}>
            <circle cx={5} cy={5} r={3.5} fill={color} />
            <text x={14} y={8} fill="hsl(38, 8%, 55%)" fontSize={9} fontFamily="'DM Sans', sans-serif">
              {type}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}
