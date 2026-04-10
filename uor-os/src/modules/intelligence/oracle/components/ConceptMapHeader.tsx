/**
 * ConceptMapHeader — Algebrica-style radial concept map rendered as pure SVG.
 *
 * Monochrome aesthetic: zinc-scale palette, subtle pulse animation on center node,
 * directional edges (incoming vs outgoing), and Algebrica stat badges.
 *
 * Shows the current topic at center with 1-hop neighbors radiating outward.
 */

import { useMemo } from "react";
import { adjacencyIndex } from "@/modules/data/knowledge-graph/lib/adjacency-index";
import { motion } from "framer-motion";

interface Props {
  topic: string;
  onNavigate?: (topic: string) => void;
}

interface MapNode {
  id: string;
  label: string;
  x: number;
  y: number;
  isIncoming: boolean;
  /** Number of edges this neighbor has (degree). */
  degree: number;
}

export default function ConceptMapHeader({ topic, onNavigate }: Props) {
  const normalizedTopic = topic.toLowerCase();

  const { nodes, incoming, outgoing, density } = useMemo(() => {
    if (!adjacencyIndex.isInitialized()) return { nodes: [], incoming: 0, outgoing: 0, density: 0 };

    const inc = adjacencyIndex.getIncoming(normalizedTopic);
    const out = adjacencyIndex.getOutgoing(normalizedTopic);

    const allNeighbors = [...new Set([...inc, ...out])];
    if (allNeighbors.length === 0) return { nodes: [], incoming: 0, outgoing: 0, density: 0 };

    const cx = 200;
    const cy = 110;
    const radius = 78;

    const mapNodes: MapNode[] = allNeighbors.slice(0, 14).map((n, i, arr) => {
      const angle = (2 * Math.PI * i) / arr.length - Math.PI / 2;
      // Stagger radius slightly for visual interest
      const r = radius + (i % 3 === 0 ? 8 : i % 3 === 1 ? -6 : 0);
      return {
        id: n,
        label: n.split("/").pop() || n.slice(-16),
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
        isIncoming: inc.includes(n),
        degree: adjacencyIndex.getNeighbors(n).length,
      };
    });

    // Graph density = edges / possible edges
    const totalEdges = inc.length + out.length;
    const n = allNeighbors.length + 1;
    const maxEdges = n * (n - 1);
    const graphDensity = maxEdges > 0 ? totalEdges / maxEdges : 0;

    return { nodes: mapNodes, incoming: inc.length, outgoing: out.length, density: graphDensity };
  }, [normalizedTopic]);

  if (nodes.length === 0) return null;

  const cx = 200;
  const cy = 110;
  const total = incoming + outgoing;
  const truncatedTopic = topic.length > 28 ? topic.slice(0, 26) + "…" : topic;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mb-5"
    >
      {/* SVG Map */}
      <div className="flex justify-center">
        <svg
          viewBox="0 0 400 220"
          className="w-full"
          style={{ maxWidth: 520, height: "auto" }}
        >
          <defs>
            {/* Subtle radial gradient behind center */}
            <radialGradient id="center-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="white" stopOpacity="0.04" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </radialGradient>
            {/* Pulse animation for center */}
            <radialGradient id="pulse-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="white" stopOpacity="0.06">
                <animate attributeName="stopOpacity" values="0.06;0.12;0.06" dur="3s" repeatCount="indefinite" />
              </stop>
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Background glow */}
          <circle cx={cx} cy={cy} r={50} fill="url(#center-glow)" />
          <circle cx={cx} cy={cy} r={30} fill="url(#pulse-glow)" />

          {/* Edges — with opacity based on direction */}
          {nodes.map((n, i) => (
            <line
              key={`edge-${n.id}`}
              x1={cx}
              y1={cy}
              x2={n.x}
              y2={n.y}
              stroke={n.isIncoming ? "#52525b" : "#3f3f46"}
              strokeWidth={0.6}
              strokeDasharray={n.isIncoming ? "none" : "3 2"}
              opacity={0.5}
            >
              <animate
                attributeName="opacity"
                values="0;0.5"
                dur="0.4s"
                begin={`${i * 0.04}s`}
                fill="freeze"
              />
            </line>
          ))}

          {/* Center node — pulsing dot */}
          <circle cx={cx} cy={cy} r={7} fill="#a1a1aa" opacity={0.9}>
            <animate attributeName="r" values="7;8;7" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx={cx} cy={cy} r={3} fill="#e4e4e7" />

          {/* Center label */}
          <text
            x={cx}
            y={cy + 20}
            textAnchor="middle"
            fill="#d4d4d8"
            fontSize={9}
            fontWeight={600}
            fontFamily="'DM Sans', system-ui, sans-serif"
            letterSpacing="0.02em"
          >
            {truncatedTopic}
          </text>

          {/* Neighbor nodes */}
          {nodes.map((n, i) => {
            // Size proportional to degree (clamped)
            const r = Math.min(5, Math.max(2.5, n.degree * 0.5));
            const labelY = n.y > cy ? n.y + 12 : n.y - 8;

            return (
              <g
                key={n.id}
                style={{ cursor: onNavigate ? "pointer" : "default" }}
                onClick={() => onNavigate?.(n.label)}
                opacity={0}
              >
                <animate
                  attributeName="opacity"
                  values="0;1"
                  dur="0.3s"
                  begin={`${i * 0.04 + 0.1}s`}
                  fill="freeze"
                />
                {/* Node circle */}
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={r}
                  fill={n.isIncoming ? "#71717a" : "#52525b"}
                />
                {/* Hover ring (invisible but enlarges on hover via CSS) */}
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={r + 4}
                  fill="transparent"
                  className="hover:fill-white/5"
                />
                {/* Label */}
                <text
                  x={n.x}
                  y={labelY}
                  textAnchor="middle"
                  fill="#71717a"
                  fontSize={6.5}
                  fontFamily="'DM Sans', system-ui, sans-serif"
                >
                  {n.label.length > 18 ? n.label.slice(0, 16) + "…" : n.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Algebrica stat badges */}
      <div className="flex items-center justify-center gap-1 mt-1">
        <StatBadge label="Requires" value={incoming} />
        <span className="text-[#3f3f46] text-[8px]">·</span>
        <StatBadge label="Enables" value={outgoing} />
        <span className="text-[#3f3f46] text-[8px]">·</span>
        <StatBadge label="Total" value={total} />
        <span className="text-[#3f3f46] text-[8px]">·</span>
        <StatBadge label="Density" value={`${(density * 100).toFixed(0)}%`} />
      </div>
    </motion.div>
  );
}

function StatBadge({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#141414] border border-[#1c1c1e]">
      <span className="text-[9px] text-[#52525b] font-medium uppercase tracking-wider">{label}</span>
      <span className="text-[10px] text-[#a1a1aa] font-mono font-semibold tabular-nums">{value}</span>
    </span>
  );
}
