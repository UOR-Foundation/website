/**
 * TrustGraphVisualization — Force-directed trust network diagram
 * ═══════════════════════════════════════════════════════════════
 *
 * Renders connections as a force-directed graph using d3-force.
 * Edge thickness represents trust level (1-5).
 * The current user is the central node.
 */

import { useRef, useEffect, useState, useCallback } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import { Star } from "lucide-react";
import { KP } from "@/modules/hologram-os/kernel-palette";

interface Connection {
  id: string;
  peer_name?: string | null;
  peer_handle?: string | null;
  peer_glyph?: string | null;
  trust_level: number;
}

interface TrustGraphVisualizationProps {
  connections: Connection[];
  userName?: string | null;
  userGlyph?: string | null;
}

interface GraphNode extends SimulationNodeDatum {
  id: string;
  label: string;
  glyph: string;
  isCenter: boolean;
  trustLevel?: number;
}

interface GraphLink extends SimulationLinkDatum<GraphNode> {
  trustLevel: number;
}

export default function TrustGraphVisualization({
  connections,
  userName,
  userGlyph,
}: TrustGraphVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<Simulation<GraphNode, GraphLink> | null>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 350 });

  // Measure container
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const parent = svg.parentElement;
    if (!parent) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width } = entry.contentRect;
      setDimensions({ width: Math.max(300, width), height: Math.max(280, Math.min(400, width * 0.85)) });
    });
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  // Build graph data and run simulation
  useEffect(() => {
    if (connections.length === 0) return;

    const centerNode: GraphNode = {
      id: "me",
      label: userName || "You",
      glyph: userGlyph || "◈",
      isCenter: true,
    };

    const peerNodes: GraphNode[] = connections.map((c) => ({
      id: c.id,
      label: c.peer_name || c.peer_handle || "Unknown",
      glyph: c.peer_glyph || c.peer_name?.[0]?.toUpperCase() || "?",
      isCenter: false,
      trustLevel: c.trust_level,
    }));

    const graphLinks: GraphLink[] = connections.map((c) => ({
      source: "me",
      target: c.id,
      trustLevel: c.trust_level || 1,
    }));

    const allNodes = [centerNode, ...peerNodes];
    nodesRef.current = allNodes;

    const sim = forceSimulation<GraphNode>(allNodes)
      .force(
        "link",
        forceLink<GraphNode, GraphLink>(graphLinks)
          .id((d) => d.id)
          .distance((d) => 90 - d.trustLevel * 8)
      )
      .force("charge", forceManyBody().strength(-200))
      .force("center", forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force("collide", forceCollide(32));

    linksRef.current = graphLinks;
    simRef.current = sim;

    sim.on("tick", () => {
      setNodes([...allNodes]);
      setLinks([...graphLinks]);
    });

    sim.alpha(1).restart();

    return () => {
      sim.stop();
      simRef.current = null;
    };
  }, [connections, userName, userGlyph, dimensions]);

  const onNodePointerDown = useCallback((e: React.PointerEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (!node || !simRef.current) return;
    setDraggedNode(nodeId);
    node.fx = node.x;
    node.fy = node.y;
    simRef.current.alphaTarget(0.3).restart();
    (e.target as SVGElement).setPointerCapture(e.pointerId);
  }, []);

  const onNodePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggedNode || !svgRef.current) return;
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    const node = nodesRef.current.find((n) => n.id === draggedNode);
    if (node) {
      node.fx = svgP.x;
      node.fy = svgP.y;
    }
  }, [draggedNode]);

  const onNodePointerUp = useCallback(() => {
    if (!draggedNode) return;
    const node = nodesRef.current.find((n) => n.id === draggedNode);
    if (node) {
      node.fx = null;
      node.fy = null;
    }
    setDraggedNode(null);
    simRef.current?.alphaTarget(0);
  }, [draggedNode]);

  if (connections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: `${KP.gold}10`, border: `1px solid ${KP.gold}15` }}
        >
          <Star className="w-6 h-6" style={{ color: KP.dim }} />
        </div>
        <p className="text-sm" style={{ color: KP.dim }}>
          No verified connections yet
        </p>
        <p className="text-xs" style={{ color: KP.dimmer }}>
          Connect with others to see your trust graph
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full"
        style={{ minHeight: 280 }}
        onPointerMove={onNodePointerMove}
        onPointerUp={onNodePointerUp}
      >
        {/* Edges */}
        {links.map((link, i) => {
          const s = link.source as GraphNode;
          const t = link.target as GraphNode;
          if (!s.x || !s.y || !t.x || !t.y) return null;
          const thickness = Math.max(1, link.trustLevel * 1.2);
          const isHovered = hoveredNode === (t as GraphNode).id || hoveredNode === "me";
          const opacity = hoveredNode ? (isHovered ? 0.7 : 0.15) : 0.35;
          return (
            <line
              key={i}
              x1={s.x}
              y1={s.y}
              x2={t.x}
              y2={t.y}
              stroke="hsl(38, 50%, 50%)"
              strokeWidth={thickness}
              strokeOpacity={opacity}
              strokeLinecap="round"
              style={{ transition: "stroke-opacity 0.3s ease, stroke-width 0.3s ease" }}
            />
          );
        })}

        {/* Trust level labels on edges */}
        {links.map((link, i) => {
          const s = link.source as GraphNode;
          const t = link.target as GraphNode;
          if (!s.x || !s.y || !t.x || !t.y) return null;
          const mx = (s.x + t.x) / 2;
          const my = (s.y + t.y) / 2;
          const isHovered = hoveredNode === (t as GraphNode).id || hoveredNode === "me";
          if (!isHovered && hoveredNode) return null;
          return (
            <g key={`label-${i}`}>
              <circle cx={mx} cy={my} r={8} fill="hsl(25, 10%, 14%)" fillOpacity={0.9} />
              <text
                x={mx}
                y={my}
                textAnchor="middle"
                dominantBaseline="central"
                fill="hsl(38, 50%, 55%)"
                fontSize={8}
                fontWeight={700}
                fontFamily="'DM Sans', sans-serif"
              >
                {link.trustLevel}★
              </text>
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          if (!node.x || !node.y) return null;
          const isHovered = hoveredNode === node.id;
          const isFaded = hoveredNode && !isHovered && hoveredNode !== "me" && node.id !== "me";
          const radius = node.isCenter ? 24 : 18;

          return (
            <g
              key={node.id}
              onMouseEnter={() => !draggedNode && setHoveredNode(node.id)}
              onMouseLeave={() => !draggedNode && setHoveredNode(null)}
              onPointerDown={(e) => onNodePointerDown(e, node.id)}
              style={{
                cursor: draggedNode === node.id ? "grabbing" : "grab",
                transition: "opacity 0.3s ease",
                opacity: isFaded ? 0.25 : 1,
              }}
            >
              {/* Glow ring for center */}
              {node.isCenter && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={radius + 4}
                  fill="none"
                  stroke="hsl(38, 50%, 50%)"
                  strokeWidth={1.5}
                  strokeOpacity={0.3}
                />
              )}

              {/* Node circle */}
              <circle
                cx={node.x}
                cy={node.y}
                r={radius}
                fill={node.isCenter ? "hsl(30, 12%, 18%)" : "hsl(25, 10%, 15%)"}
                stroke={node.isCenter ? "hsl(38, 50%, 50%)" : `hsla(38, 40%, 50%, ${isHovered ? 0.6 : 0.2})`}
                strokeWidth={node.isCenter ? 2 : 1.5}
                style={{ transition: "stroke 0.2s ease" }}
              />

              {/* Glyph / initial */}
              <text
                x={node.x}
                y={node.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={node.isCenter ? "hsl(38, 50%, 55%)" : "hsl(38, 20%, 75%)"}
                fontSize={node.isCenter ? 16 : 13}
                fontFamily="'DM Sans', sans-serif"
              >
                {node.glyph}
              </text>

              {/* Name label below */}
              <text
                x={node.x}
                y={node.y + radius + 14}
                textAnchor="middle"
                fill={isHovered ? "hsl(38, 20%, 80%)" : "hsl(30, 8%, 45%)"}
                fontSize={10}
                fontWeight={node.isCenter ? 600 : 400}
                fontFamily="'DM Sans', sans-serif"
                style={{ transition: "fill 0.2s ease" }}
              >
                {node.label.length > 14 ? node.label.slice(0, 12) + "…" : node.label}
              </text>

              {/* Trust stars for peer nodes */}
              {!node.isCenter && node.trustLevel && node.trustLevel > 0 && (
                <text
                  x={node.x}
                  y={node.y - radius - 6}
                  textAnchor="middle"
                  fill="hsl(38, 50%, 50%)"
                  fontSize={8}
                  fontFamily="'DM Sans', sans-serif"
                >
                  {"★".repeat(Math.min(node.trustLevel, 5))}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div
        className="flex items-center justify-center gap-4 py-2 mt-1"
        style={{ borderTop: `1px solid ${KP.border}` }}
      >
        {[1, 3, 5].map((level) => (
          <div key={level} className="flex items-center gap-1.5">
            <div
              style={{
                width: Math.max(12, level * 8),
                height: Math.max(1, level * 1.2),
                background: "hsl(38, 50%, 50%)",
                borderRadius: 1,
                opacity: 0.5,
              }}
            />
            <span className="text-[9px]" style={{ color: KP.dim, fontFamily: KP.font }}>
              Level {level}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
