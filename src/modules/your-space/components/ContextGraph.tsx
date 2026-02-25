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
  /** 0 = freshest, 1 = oldest (used for time-decay visuals) */
  decay?: number;
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

    // Interests (top 8) — sorted by weight desc; index = recency rank
    const interests = Object.entries(ctx.profile.interests)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);
    const iCount = interests.length;
    for (let i = 0; i < iCount; i++) {
      const [tag, weight] = interests[i];
      const id = `i:${tag}`;
      // decay: 0 for freshest (highest weight), 1 for oldest
      const decay = iCount > 1 ? i / (iCount - 1) : 0;
      ns.push({ id, label: tag.replace(/-/g, " "), type: "interest", weight, decay });
      ls.push({ source: anchorId, target: id });
    }

    // Tasks (top 5) — first = most recent
    const tasks = ctx.profile.activeTasks.slice(0, 5);
    const tCount = tasks.length;
    for (let i = 0; i < tCount; i++) {
      const task = tasks[i];
      const id = `t:${task}`;
      const decay = tCount > 1 ? i / (tCount - 1) : 0;
      ns.push({ id, label: task.length > 18 ? task.slice(0, 16) + "…" : task, type: "task", decay });
      ls.push({ source: anchorId, target: id });
    }

    // Domains (top 5) — first = most recent
    const domains = ctx.profile.recentDomains.slice(0, 5);
    const dCount = domains.length;
    for (let i = 0; i < dCount; i++) {
      const domain = domains[i];
      const id = `d:${domain}`;
      const decay = dCount > 1 ? i / (dCount - 1) : 0;
      ns.push({ id, label: domain.replace(/-/g, " "), type: "domain", decay });
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
          // Find target node's decay for link opacity
          const targetNode = nodes.find((n) => n.id === l.target);
          const linkDecay = targetNode?.decay ?? 0;
          const linkOpacity = 0.6 - linkDecay * 0.4; // 0.6 → 0.2
          return (
            <line
              key={`${l.source}-${l.target}`}
              x1={s.x} y1={s.y} x2={t.x} y2={t.y}
              stroke="hsl(var(--border))"
              strokeWidth={1}
              opacity={linkOpacity}
              style={{ transition: "opacity 0.6s ease" }}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((n) => {
          const pos = positions.get(n.id) ?? { x: dimensions.w / 2, y: dimensions.h / 2 };
          const baseR = TYPE_RADIUS[n.type];
          const colors = TYPE_COLORS[n.type];
          const isHovered = hoveredNode === n.id;
          const decay = n.decay ?? 0;

          // Time-decay visuals: fresh nodes are larger, brighter, glowing
          const freshness = 1 - decay; // 1 = newest, 0 = oldest
          const nodeOpacity = n.type === "identity" ? 1 : 0.35 + freshness * 0.65; // 0.35–1.0
          const r = n.type === "identity" ? baseR : baseR * (0.7 + freshness * 0.3); // shrink older
          const glowRadius = freshness > 0.6 ? 4 + freshness * 4 : 0;
          const glowOpacity = freshness > 0.6 ? 0.15 + (freshness - 0.6) * 0.5 : 0;
          const labelOpacity = n.type === "identity" ? 1 : 0.4 + freshness * 0.6;

          return (
            <g
              key={n.id}
              transform={`translate(${pos.x},${pos.y})`}
              onMouseEnter={() => setHoveredNode(n.id)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ cursor: "default" }}
            >
              {/* Glow halo for fresh nodes */}
              {glowRadius > 0 && n.type !== "identity" && (
                <circle
                  r={r + glowRadius}
                  fill={colors.fill}
                  opacity={isHovered ? glowOpacity * 1.5 : glowOpacity}
                  style={{ filter: "blur(6px)", transition: "opacity 0.6s ease" }}
                />
              )}
              <circle
                r={isHovered ? r + 3 : r}
                fill={colors.fill}
                stroke={colors.stroke}
                strokeWidth={n.type === "identity" ? 2.5 : 1.5}
                opacity={isHovered ? 1 : nodeOpacity}
                style={{ transition: "r 0.3s, opacity 0.6s" }}
              />
              {/* Label */}
              <text
                y={r + 14}
                textAnchor="middle"
                fill="hsl(var(--muted-foreground))"
                fontSize={n.type === "identity" ? 11 : 9}
                fontFamily="'DM Sans', system-ui, sans-serif"
                fontWeight={n.type === "identity" ? 600 : 400}
                opacity={isHovered ? 1 : labelOpacity}
                style={{ textTransform: "capitalize" as const, transition: "opacity 0.6s ease" }}
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
                  opacity={nodeOpacity}
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
