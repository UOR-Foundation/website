/**
 * ContextGraph — Force-directed visualization of the user's context profile.
 * Shows identity as anchor node with interest, task, and domain nodes.
 */

import { useEffect, useRef, useMemo, useState } from "react";
import * as d3Force from "d3-force";
import { useContextProjection } from "@/modules/hologram-ui/hooks/useContextProjection";

interface GraphNode {
  id: string;
  label: string;
  type: "identity" | "interest" | "task" | "domain";
  weight?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphLink {
  source: string;
  target: string;
}

const TYPE_COLORS: Record<GraphNode["type"], { fill: string; stroke: string }> = {
  identity: { fill: "hsl(var(--primary))", stroke: "hsl(var(--primary))" },
  interest: { fill: "hsl(var(--accent))", stroke: "hsl(var(--accent-foreground) / 0.3)" },
  task: { fill: "hsl(142 60% 50%)", stroke: "hsl(142 60% 40% / 0.3)" },
  domain: { fill: "hsl(var(--muted-foreground) / 0.6)", stroke: "hsl(var(--muted-foreground) / 0.2)" },
};

const TYPE_RADIUS: Record<GraphNode["type"], number> = {
  identity: 24,
  interest: 14,
  task: 12,
  domain: 10,
};

interface ContextGraphProps {
  isDark: boolean;
}

export function ContextGraph({ isDark }: ContextGraphProps) {
  const ctx = useContextProjection();
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ w: 400, h: 280 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Measure container
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0) setDimensions({ w: width, h: Math.max(height, 240) });
    });
    ro.observe(svg.parentElement!);
    return () => ro.disconnect();
  }, []);

  // Build graph data from context profile
  const { nodes, links } = useMemo(() => {
    const ns: GraphNode[] = [];
    const ls: GraphLink[] = [];

    const anchorId = "self";
    ns.push({ id: anchorId, label: ctx.authenticated ? "You" : "Identity", type: "identity" });

    // Interests (top 8)
    const interests = Object.entries(ctx.profile.interests)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);
    for (const [tag, weight] of interests) {
      const id = `i:${tag}`;
      ns.push({ id, label: tag.replace(/-/g, " "), type: "interest", weight });
      ls.push({ source: anchorId, target: id });
    }

    // Tasks (top 5)
    for (const task of ctx.profile.activeTasks.slice(0, 5)) {
      const id = `t:${task}`;
      ns.push({ id, label: task.length > 18 ? task.slice(0, 16) + "…" : task, type: "task" });
      ls.push({ source: anchorId, target: id });
    }

    // Domains (top 5)
    for (const domain of ctx.profile.recentDomains.slice(0, 5)) {
      const id = `d:${domain}`;
      ns.push({ id, label: domain.replace(/-/g, " "), type: "domain" });
      ls.push({ source: anchorId, target: id });
    }

    return { nodes: ns, links: ls };
  }, [ctx.profile, ctx.authenticated]);

  // Run simulation
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  useEffect(() => {
    if (nodes.length <= 1) return;
    const cx = dimensions.w / 2;
    const cy = dimensions.h / 2;

    const simNodes = nodes.map((n) => ({
      ...n,
      x: n.type === "identity" ? cx : cx + (Math.random() - 0.5) * 100,
      y: n.type === "identity" ? cy : cy + (Math.random() - 0.5) * 100,
    }));

    const simLinks = links.map((l) => ({ ...l }));

    const sim = d3Force
      .forceSimulation(simNodes)
      .force("link", d3Force.forceLink(simLinks).id((d: any) => d.id).distance(70).strength(0.6))
      .force("charge", d3Force.forceManyBody().strength(-120))
      .force("center", d3Force.forceCenter(cx, cy))
      .force("collision", d3Force.forceCollide().radius((d: any) => TYPE_RADIUS[d.type as GraphNode["type"]] + 6))
      .alpha(0.8)
      .alphaDecay(0.04);

    sim.on("tick", () => {
      const map = new Map<string, { x: number; y: number }>();
      for (const n of simNodes) {
        map.set(n.id, { x: n.x ?? cx, y: n.y ?? cy });
      }
      setPositions(new Map(map));
    });

    return () => { sim.stop(); };
  }, [nodes, links, dimensions]);

  const isEmpty = nodes.length <= 1;

  return (
    <div className="relative w-full" style={{ minHeight: 240 }}>
      <svg
        ref={svgRef}
        className="w-full"
        style={{ height: dimensions.h }}
        viewBox={`0 0 ${dimensions.w} ${dimensions.h}`}
      >
        {/* Links */}
        {links.map((l) => {
          const s = positions.get(l.source);
          const t = positions.get(l.target);
          if (!s || !t) return null;
          return (
            <line
              key={`${l.source}-${l.target}`}
              x1={s.x} y1={s.y} x2={t.x} y2={t.y}
              stroke="hsl(var(--border))"
              strokeWidth={1}
              opacity={0.5}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((n) => {
          const pos = positions.get(n.id) ?? { x: dimensions.w / 2, y: dimensions.h / 2 };
          const r = TYPE_RADIUS[n.type];
          const colors = TYPE_COLORS[n.type];
          const isHovered = hoveredNode === n.id;

          return (
            <g
              key={n.id}
              transform={`translate(${pos.x},${pos.y})`}
              onMouseEnter={() => setHoveredNode(n.id)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ cursor: "default" }}
            >
              <circle
                r={isHovered ? r + 3 : r}
                fill={colors.fill}
                stroke={colors.stroke}
                strokeWidth={n.type === "identity" ? 2.5 : 1.5}
                opacity={isHovered ? 1 : 0.8}
                style={{ transition: "r 0.2s, opacity 0.2s" }}
              />
              {/* Label */}
              <text
                y={r + 14}
                textAnchor="middle"
                fill="hsl(var(--muted-foreground))"
                fontSize={n.type === "identity" ? 11 : 9}
                fontFamily="'DM Sans', system-ui, sans-serif"
                fontWeight={n.type === "identity" ? 600 : 400}
                style={{ textTransform: "capitalize" as const }}
              >
                {n.label}
              </text>
              {/* Weight indicator for interests */}
              {n.type === "interest" && n.weight !== undefined && (
                <text
                  y={-2}
                  textAnchor="middle"
                  fill="hsl(var(--primary-foreground))"
                  fontSize={8}
                  fontFamily="'DM Sans', monospace"
                  fontWeight={500}
                >
                  {(n.weight * 100).toFixed(0)}
                </text>
              )}
              {/* Identity glyph */}
              {n.type === "identity" && (
                <text
                  y={4}
                  textAnchor="middle"
                  fill="hsl(var(--primary-foreground))"
                  fontSize={14}
                  fontWeight={700}
                >
                  ◈
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Empty state */}
      {isEmpty && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
            style={{ background: "hsl(var(--muted))" }}
          >
            <span className="text-lg" style={{ color: "hsl(var(--muted-foreground))" }}>◈</span>
          </div>
          <p className="text-muted-foreground font-body text-sm">
            {ctx.authenticated
              ? "Your context graph is empty. Chat with the hologram to build it."
              : "Sign in to see your context graph."}
          </p>
        </div>
      )}

      {/* Legend */}
      {!isEmpty && (
        <div className="absolute bottom-1 right-2 flex items-center gap-3 text-[10px] text-muted-foreground font-body">
          {(["interest", "task", "domain"] as const).map((t) => (
            <span key={t} className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: TYPE_COLORS[t].fill }} />
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
