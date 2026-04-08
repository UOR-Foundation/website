/**
 * ResonanceGraph — Force-directed constellation of books and invariant edges.
 * Uses d3-force for physics simulation, SVG for rendering, and framer-motion for transitions.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import type { Invariant, BookSummary } from "@/modules/oracle/lib/stream-resonance";

interface Props {
  books: BookSummary[];
  invariants: Invariant[];
  onInvariantClick?: (inv: Invariant) => void;
}

interface GraphNode extends SimulationNodeDatum {
  id: string;
  label: string;
  domain: string;
  type: "book";
}

interface GraphLink extends SimulationLinkDatum<GraphNode> {
  invariant: Invariant;
  strength: number;
}

const DOMAIN_COLORS: Record<string, string> = {
  Physics: "#3b82f6",
  Philosophy: "#8b5cf6",
  Business: "#10b981",
  Finance: "#f59e0b",
  Psychology: "#f43f5e",
  Biology: "#84cc16",
  History: "#f97316",
  Technology: "#06b6d4",
  Mathematics: "#d946ef",
  Science: "#14b8a6",
  Literature: "#fb923c",
  General: "#94a3b8",
  "Self Improvement": "#ec4899",
};

export default function ResonanceGraph({ books, invariants, onInvariantClick }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [hoveredLink, setHoveredLink] = useState<number | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  // Build graph data from books & invariants
  useEffect(() => {
    const bookMap = new Map(books.map((b) => [b.title, b]));
    const nodeMap = new Map<string, GraphNode>();

    // Create nodes for each book mentioned in invariants
    for (const inv of invariants) {
      for (const title of inv.books) {
        if (!nodeMap.has(title)) {
          const book = bookMap.get(title);
          nodeMap.set(title, {
            id: title,
            label: title.length > 25 ? title.slice(0, 24) + "…" : title,
            domain: book?.domain || "General",
            type: "book",
          });
        }
      }
    }

    const graphNodes = Array.from(nodeMap.values());
    const graphLinks: GraphLink[] = [];

    // Create links between books that share invariants
    for (const inv of invariants) {
      for (let i = 0; i < inv.books.length; i++) {
        for (let j = i + 1; j < inv.books.length; j++) {
          const source = nodeMap.get(inv.books[i]);
          const target = nodeMap.get(inv.books[j]);
          if (source && target) {
            graphLinks.push({
              source: source.id,
              target: target.id,
              invariant: inv,
              strength: inv.resonance,
            });
          }
        }
      }
    }

    // Run simulation
    const sim = forceSimulation<GraphNode>(graphNodes)
      .force("link", forceLink<GraphNode, GraphLink>(graphLinks).id((d) => d.id).distance(120).strength(0.3))
      .force("charge", forceManyBody().strength(-200))
      .force("center", forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force("collide", forceCollide(35));

    sim.on("tick", () => {
      setNodes([...graphNodes]);
      setLinks([...graphLinks]);
    });

    // Run for 150 ticks then stop
    for (let i = 0; i < 150; i++) sim.tick();
    sim.stop();
    setNodes([...graphNodes]);
    setLinks([...graphLinks]);

    return () => { sim.stop(); };
  }, [books, invariants, dimensions]);

  // Resize observer
  useEffect(() => {
    const el = svgRef.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width: Math.max(400, width), height: Math.max(300, height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (invariants.length === 0) return null;

  return (
    <div className="w-full h-[500px] rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm overflow-hidden relative">
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} className="w-full h-full">
        <defs>
          {/* Glow filter */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Links */}
        {links.map((link, i) => {
          const s = link.source as GraphNode;
          const t = link.target as GraphNode;
          if (!s.x || !t.x || !s.y || !t.y) return null;
          const isHovered = hoveredLink === i;

          // Curved path
          const midX = (s.x + t.x) / 2;
          const midY = (s.y + t.y) / 2 - 30;
          const d = `M ${s.x} ${s.y} Q ${midX} ${midY} ${t.x} ${t.y}`;

          return (
            <g key={i}>
              <path
                d={d}
                fill="none"
                stroke={isHovered ? "hsl(var(--primary))" : "rgba(255,255,255,0.15)"}
                strokeWidth={isHovered ? 3 : Math.max(1, link.strength * 3)}
                className="cursor-pointer transition-all duration-300"
                onMouseEnter={() => setHoveredLink(i)}
                onMouseLeave={() => setHoveredLink(null)}
                onClick={() => onInvariantClick?.(link.invariant)}
                filter={isHovered ? "url(#glow)" : undefined}
              />
              {/* Link label on hover */}
              {isHovered && (
                <text
                  x={midX}
                  y={midY - 8}
                  textAnchor="middle"
                  className="text-[10px] fill-primary font-semibold pointer-events-none"
                >
                  {link.invariant.name}
                </text>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const color = DOMAIN_COLORS[node.domain] || DOMAIN_COLORS.General;
          return (
            <g key={node.id} transform={`translate(${node.x || 0}, ${node.y || 0})`}>
              {/* Outer glow */}
              <circle r={22} fill={color} opacity={0.15} />
              {/* Node circle */}
              <circle
                r={16}
                fill={color}
                opacity={0.7}
                stroke="rgba(255,255,255,0.3)"
                strokeWidth={1}
                className="cursor-pointer hover:opacity-100 transition-opacity"
              />
              {/* Label */}
              <text
                y={28}
                textAnchor="middle"
                className="text-[9px] fill-white/60 font-medium pointer-events-none"
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
        {Array.from(new Set(nodes.map((n) => n.domain))).map((domain) => (
          <div key={domain} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: DOMAIN_COLORS[domain] || "#94a3b8" }} />
            <span className="text-[9px] text-white/40">{domain}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
