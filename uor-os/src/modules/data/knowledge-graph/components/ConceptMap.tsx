/**
 * ConceptMap — Algebrica-inspired radial 1-hop concept map.
 * Renders a clean SVG showing the current concept at center
 * with neighbors radiating outward, grouped by relationship type.
 */

import { useMemo } from "react";
import { motion } from "framer-motion";

export interface ConceptNode {
  id: string;
  label: string;
  type?: string;
  color?: string;
}

export interface ConceptEdge {
  from: string;
  to: string;
  relation: string;
}

interface ConceptMapProps {
  /** Center concept */
  center: ConceptNode;
  /** 1-hop neighbor nodes */
  neighbors: ConceptNode[];
  /** Edges connecting center to neighbors */
  edges: ConceptEdge[];
  /** Optional metadata counts */
  meta?: { requires?: number; enables?: number; difficulty?: string };
  /** Callback when a neighbor node is clicked */
  onNodeClick?: (id: string) => void;
  /** Width */
  width?: number;
  /** Height */
  height?: number;
  className?: string;
}

const RELATION_COLORS: Record<string, string> = {
  requires: "hsl(210 15% 50%)",
  enables: "hsl(160 30% 50%)",
  extends: "hsl(270 25% 55%)",
  implements: "hsl(35 60% 55%)",
  references: "hsl(0 0% 50%)",
  contains: "hsl(200 40% 55%)",
  default: "hsl(0 0% 35%)",
};

export default function ConceptMap({
  center,
  neighbors,
  edges,
  meta,
  onNodeClick,
  width = 480,
  height = 280,
  className = "",
}: ConceptMapProps) {
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(cx, cy) * 0.7;

  const positions = useMemo(() => {
    const n = neighbors.length;
    if (n === 0) return [];
    const step = (2 * Math.PI) / n;
    // Start from top (-π/2) for visual balance
    return neighbors.map((node, i) => {
      const angle = -Math.PI / 2 + step * i;
      return {
        node,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        angle,
      };
    });
  }, [neighbors, cx, cy, radius]);

  const getEdgeColor = (fromId: string, toId: string) => {
    const edge = edges.find(
      (e) => (e.from === fromId && e.to === toId) || (e.from === toId && e.to === fromId)
    );
    if (!edge) return RELATION_COLORS.default;
    return RELATION_COLORS[edge.relation] || RELATION_COLORS.default;
  };

  return (
    <div className={`relative ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="select-none"
      >
        {/* Edges */}
        {positions.map(({ node, x, y }) => (
          <motion.line
            key={`edge-${node.id}`}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke={getEdgeColor(center.id, node.id)}
            strokeWidth={1}
            strokeOpacity={0.3}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          />
        ))}

        {/* Center node */}
        <motion.circle
          cx={cx}
          cy={cy}
          r={24}
          fill="hsl(220 15% 12%)"
          stroke="hsl(0 0% 40%)"
          strokeWidth={1.5}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.4 }}
        />
        <text
          x={cx}
          y={cy + 1}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-zinc-200 text-[9px] font-mono pointer-events-none"
        >
          {center.label.length > 12 ? center.label.slice(0, 11) + "…" : center.label}
        </text>

        {/* Neighbor nodes */}
        {positions.map(({ node, x, y }, i) => (
          <g
            key={node.id}
            onClick={() => onNodeClick?.(node.id)}
            className="cursor-pointer"
          >
            <motion.circle
              cx={x}
              cy={y}
              r={16}
              fill={node.color || "hsl(220 15% 9%)"}
              stroke={getEdgeColor(center.id, node.id)}
              strokeWidth={1}
              strokeOpacity={0.5}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.15 + i * 0.04 }}
              whileHover={{ scale: 1.2, strokeOpacity: 1 }}
            />
            <motion.text
              x={x}
              y={y + 1}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-zinc-400 text-[7px] font-mono pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.04 }}
            >
              {node.label.length > 10 ? node.label.slice(0, 9) + "…" : node.label}
            </motion.text>

            {/* Relation label on hover — rendered as title for simplicity */}
            <title>
              {node.label}
              {node.type ? ` (${node.type})` : ""}
            </title>
          </g>
        ))}
      </svg>

      {/* Meta card (Algebrica-style) */}
      {meta && (
        <div className="absolute bottom-2 right-2 flex items-center gap-3 px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded text-[9px] font-mono text-zinc-500">
          {meta.requires !== undefined && (
            <span>
              <span className="text-zinc-300 font-bold">{meta.requires}</span>{" "}
              <span className="uppercase tracking-wider text-[7px]">Requires</span>
            </span>
          )}
          {meta.enables !== undefined && (
            <span>
              <span className="text-zinc-300 font-bold">{meta.enables}</span>{" "}
              <span className="uppercase tracking-wider text-[7px]">Enables</span>
            </span>
          )}
          {meta.difficulty && (
            <span className="uppercase tracking-wider text-[7px] text-zinc-600">
              {meta.difficulty}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
