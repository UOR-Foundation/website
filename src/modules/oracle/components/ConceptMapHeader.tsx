/**
 * ConceptMapHeader — Algebrica-style radial concept map rendered as pure SVG.
 *
 * Shows the current topic at center with 1-hop neighbors radiating outward.
 * Monochrome aesthetic with "Requires X · Enables Y" badges.
 */

import { useMemo } from "react";
import { adjacencyIndex } from "@/modules/knowledge-graph/lib/adjacency-index";

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
}

export default function ConceptMapHeader({ topic, onNavigate }: Props) {
  const normalizedTopic = topic.toLowerCase();

  const { nodes, incoming, outgoing } = useMemo(() => {
    if (!adjacencyIndex.isInitialized()) return { nodes: [], incoming: 0, outgoing: 0 };

    const inc = adjacencyIndex.getIncoming(normalizedTopic);
    const out = adjacencyIndex.getOutgoing(normalizedTopic);

    const allNeighbors = [...new Set([...inc, ...out])];
    if (allNeighbors.length === 0) return { nodes: [], incoming: 0, outgoing: 0 };

    const cx = 200;
    const cy = 100;
    const radius = 75;

    const mapNodes: MapNode[] = allNeighbors.slice(0, 12).map((n, i, arr) => {
      const angle = (2 * Math.PI * i) / arr.length - Math.PI / 2;
      return {
        id: n,
        label: n.split("/").pop() || n.slice(-16),
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        isIncoming: inc.includes(n),
      };
    });

    return { nodes: mapNodes, incoming: inc.length, outgoing: out.length };
  }, [normalizedTopic]);

  if (nodes.length === 0) return null;

  const cx = 200;
  const cy = 100;

  return (
    <div className="mb-4">
      {/* SVG Map */}
      <div className="flex justify-center">
        <svg
          viewBox="0 0 400 200"
          className="w-full"
          style={{ maxWidth: 480, height: "auto" }}
        >
          {/* Edges */}
          {nodes.map((n) => (
            <line
              key={`edge-${n.id}`}
              x1={cx}
              y1={cy}
              x2={n.x}
              y2={n.y}
              stroke="hsl(var(--muted-foreground) / 0.15)"
              strokeWidth={0.8}
            />
          ))}

          {/* Center node */}
          <circle
            cx={cx}
            cy={cy}
            r={6}
            fill="hsl(var(--foreground))"
            opacity={0.9}
          />
          <text
            x={cx}
            y={cy + 16}
            textAnchor="middle"
            fill="hsl(var(--foreground))"
            fontSize={9}
            fontWeight={600}
            fontFamily="system-ui, sans-serif"
            opacity={0.8}
          >
            {topic.length > 24 ? topic.slice(0, 22) + "…" : topic}
          </text>

          {/* Neighbor nodes */}
          {nodes.map((n) => (
            <g
              key={n.id}
              style={{ cursor: onNavigate ? "pointer" : "default" }}
              onClick={() => onNavigate?.(n.label)}
            >
              <circle
                cx={n.x}
                cy={n.y}
                r={3.5}
                fill={n.isIncoming ? "hsl(var(--muted-foreground) / 0.5)" : "hsl(var(--foreground) / 0.4)"}
              />
              <text
                x={n.x}
                y={n.y + (n.y > cy ? 12 : -8)}
                textAnchor="middle"
                fill="hsl(var(--muted-foreground))"
                fontSize={7}
                fontFamily="system-ui, sans-serif"
                opacity={0.6}
              >
                {n.label.length > 18 ? n.label.slice(0, 16) + "…" : n.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Requires / Enables badges */}
      <div className="flex items-center justify-center gap-3 mt-1">
        <span className="text-[10px] text-muted-foreground/40 font-mono">
          Requires {incoming}
        </span>
        <span className="text-muted-foreground/20">·</span>
        <span className="text-[10px] text-muted-foreground/40 font-mono">
          Enables {outgoing}
        </span>
      </div>
    </div>
  );
}
