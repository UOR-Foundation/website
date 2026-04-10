/**
 * SolarContextExplorer — Temporal constellation view.
 *
 * Visualizes knowledge patterns organized by time of day as a
 * monochrome constellation with Algebrica-style stat blocks.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { getSearchHistory, type SearchHistoryEntry } from "@/modules/intelligence/oracle/lib/search-history";
import { loadProfile } from "@/modules/intelligence/oracle/lib/attention-tracker";
import { computeSolarTimes, getSolarPhase, currentMinutes, type SolarPhase } from "@/modules/intelligence/oracle/lib/solar-position";
import { Loader2 } from "lucide-react";

interface Props {
  onNavigate?: (topic: string) => void;
}

/* ── Phase mapping ─────────────────────────────────────────── */

type TimeQuadrant = "dawn" | "zenith" | "dusk" | "void";

const QUADRANT_META: Record<TimeQuadrant, { label: string; hours: string; angle: number }> = {
  dawn:   { label: "Dawn",   hours: "05–11", angle: -Math.PI / 2 },
  zenith: { label: "Zenith", hours: "11–16", angle: 0 },
  dusk:   { label: "Dusk",   hours: "16–21", angle: Math.PI / 2 },
  void:   { label: "Void",   hours: "21–05", angle: Math.PI },
};

function hourToQuadrant(h: number): TimeQuadrant {
  if (h >= 5 && h < 11) return "dawn";
  if (h >= 11 && h < 16) return "zenith";
  if (h >= 16 && h < 21) return "dusk";
  return "void";
}

/* ── Stat Block ────────────────────────────────────────────── */

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className="font-mono text-foreground/80 tabular-nums"
        style={{ fontSize: 18, fontWeight: 500, letterSpacing: "-0.03em" }}
      >
        {value}
      </span>
      <span
        className="text-muted-foreground/40 uppercase tracking-widest"
        style={{ fontSize: 8, fontWeight: 600 }}
      >
        {label}
      </span>
    </div>
  );
}

/* ── Constellation Node ────────────────────────────────────── */

interface ConstellationNode {
  keyword: string;
  count: number;
  quadrant: TimeQuadrant;
  x: number;
  y: number;
  radius: number;
}

function buildConstellation(
  history: SearchHistoryEntry[],
  cx: number,
  cy: number
): { nodes: ConstellationNode[]; edges: [number, number][] } {
  const quadrantMap: Record<TimeQuadrant, Map<string, number>> = {
    dawn: new Map(), zenith: new Map(), dusk: new Map(), void: new Map(),
  };

  for (const entry of history) {
    if (!entry.searched_at) continue;
    const h = new Date(entry.searched_at).getHours();
    const q = hourToQuadrant(h);
    quadrantMap[q].set(entry.keyword, (quadrantMap[q].get(entry.keyword) || 0) + 1);
  }

  const nodes: ConstellationNode[] = [];
  const orbitRadii = [52, 90, 128, 158];
  const quadrants: TimeQuadrant[] = ["dawn", "zenith", "dusk", "void"];

  for (const q of quadrants) {
    const meta = QUADRANT_META[q];
    const topics = Array.from(quadrantMap[q].entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    topics.forEach(([keyword, count], i) => {
      const orbitIdx = Math.min(Math.floor(i / 3), orbitRadii.length - 1);
      const r = orbitRadii[orbitIdx];
      const spread = 0.7;
      const angleOffset = (i - topics.length / 2) * (spread / Math.max(topics.length, 1));
      const angle = meta.angle + angleOffset;

      // Slight jitter for organic feel
      const jx = (Math.sin(i * 7.3) * 6);
      const jy = (Math.cos(i * 5.1) * 6);

      nodes.push({
        keyword,
        count,
        quadrant: q,
        x: cx + r * Math.cos(angle) + jx,
        y: cy + r * Math.sin(angle) + jy,
        radius: Math.max(2, Math.min(6, 1.5 + count * 0.7)),
      });
    });
  }

  // Build edges: connect nodes within same quadrant by proximity
  const edges: [number, number][] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (nodes[i].quadrant !== nodes[j].quadrant) continue;
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      if (Math.sqrt(dx * dx + dy * dy) < 70) {
        edges.push([i, j]);
      }
    }
  }

  return { nodes, edges };
}

/* ── Main Component ────────────────────────────────────────── */

export default function SolarContextExplorer({ onNavigate }: Props) {
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await getSearchHistory(100);
      if (!cancelled) { setHistory(entries); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const profile = useMemo(() => loadProfile(), []);
  const currentPhase = useMemo(() => {
    const q = hourToQuadrant(new Date().getHours());
    return QUADRANT_META[q].label;
  }, []);

  const CX = 190, CY = 190;
  const { nodes, edges } = useMemo(() => buildConstellation(history, CX, CY), [history]);

  // Stats
  const uniqueTopics = useMemo(() => new Set(history.map(e => e.keyword)).size, [history]);
  const activeQuadrants = useMemo(() => {
    const qs = new Set<TimeQuadrant>();
    nodes.forEach(n => qs.add(n.quadrant));
    return qs.size;
  }, [nodes]);

  const handleClick = useCallback((keyword: string) => {
    onNavigate?.(keyword);
  }, [onNavigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground/30" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 rounded-full border border-border/20 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-muted-foreground/20" />
        </div>
        <p className="text-xs text-muted-foreground/30 font-mono tracking-wide">
          EXPLORE TOPICS TO MAP YOUR CONSTELLATION
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Header */}
      <div className="text-center space-y-1">
        <h2
          className="text-foreground/90"
          style={{ fontSize: "clamp(1.1rem, 2.5vw, 1.4rem)", fontWeight: 300, letterSpacing: "-0.03em" }}
        >
          Solar Context
        </h2>
        <p className="text-muted-foreground/30 font-mono" style={{ fontSize: 9, letterSpacing: "0.12em" }}>
          TEMPORAL KNOWLEDGE CONSTELLATION · {currentPhase.toUpperCase()}
        </p>
      </div>

      {/* Stat Blocks */}
      <div
        className="flex items-center justify-center gap-8 py-2 mx-auto"
        style={{ borderTop: "1px solid hsl(var(--border) / 0.1)", borderBottom: "1px solid hsl(var(--border) / 0.1)" }}
      >
        <StatBlock label="Topics" value={uniqueTopics} />
        <StatBlock label="Queries" value={history.length} />
        <StatBlock label="Quadrants" value={`${activeQuadrants}/4`} />
        <StatBlock label="Sessions" value={profile.sessionCount} />
      </div>

      {/* Constellation SVG */}
      <div className="flex justify-center">
        <svg
          viewBox="0 0 380 380"
          className="w-full"
          style={{ maxWidth: 440, height: "auto" }}
        >
          {/* Orbit rings */}
          {[52, 90, 128, 158].map((r, i) => (
            <circle
              key={`orbit-${i}`}
              cx={CX} cy={CY} r={r}
              fill="none"
              stroke="hsl(var(--border) / 0.08)"
              strokeWidth={0.5}
              strokeDasharray={i % 2 === 0 ? "2 6" : "4 4"}
            />
          ))}

          {/* Quadrant labels */}
          {(["dawn", "zenith", "dusk", "void"] as TimeQuadrant[]).map((q) => {
            const meta = QUADRANT_META[q];
            const labelR = 172;
            const lx = CX + labelR * Math.cos(meta.angle);
            const ly = CY + labelR * Math.sin(meta.angle);
            return (
              <g key={`label-${q}`}>
                <text
                  x={lx} y={ly}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="hsl(var(--muted-foreground) / 0.25)"
                  fontSize={7}
                  fontFamily="monospace"
                  letterSpacing="0.15em"
                >
                  {meta.label.toUpperCase()}
                </text>
                <text
                  x={lx} y={ly + 10}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="hsl(var(--muted-foreground) / 0.15)"
                  fontSize={6}
                  fontFamily="monospace"
                >
                  {meta.hours}
                </text>
              </g>
            );
          })}

          {/* Edges */}
          {edges.map(([i, j], idx) => (
            <line
              key={`edge-${idx}`}
              x1={nodes[i].x} y1={nodes[i].y}
              x2={nodes[j].x} y2={nodes[j].y}
              stroke="hsl(var(--foreground) / 0.06)"
              strokeWidth={0.5}
            />
          ))}

          {/* Center node */}
          <circle cx={CX} cy={CY} r={6} fill="hsl(var(--foreground) / 0.06)" />
          <circle cx={CX} cy={CY} r={2.5} fill="hsl(var(--foreground) / 0.5)" />

          {/* Radial lines to center for hovered quadrant */}
          {hoveredIdx !== null && (
            <line
              x1={CX} y1={CY}
              x2={nodes[hoveredIdx].x} y2={nodes[hoveredIdx].y}
              stroke="hsl(var(--foreground) / 0.12)"
              strokeWidth={0.5}
              strokeDasharray="2 3"
            />
          )}

          {/* Topic nodes */}
          {nodes.map((node, idx) => {
            const isHovered = hoveredIdx === idx;
            const isDimmed = hoveredIdx !== null && !isHovered;
            return (
              <g
                key={`node-${idx}`}
                style={{ cursor: onNavigate ? "pointer" : "default" }}
                onClick={() => handleClick(node.keyword)}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Glow ring on hover */}
                {isHovered && (
                  <circle
                    cx={node.x} cy={node.y}
                    r={node.radius + 4}
                    fill="none"
                    stroke="hsl(var(--foreground) / 0.15)"
                    strokeWidth={0.5}
                  />
                )}
                <circle
                  cx={node.x} cy={node.y}
                  r={node.radius}
                  fill={`hsl(var(--foreground) / ${isDimmed ? 0.08 : isHovered ? 0.7 : 0.35})`}
                />
                <text
                  x={node.x}
                  y={node.y + node.radius + 9}
                  textAnchor="middle"
                  fill={`hsl(var(--muted-foreground) / ${isDimmed ? 0.15 : isHovered ? 0.7 : 0.4})`}
                  fontSize={isHovered ? 7.5 : 6.5}
                  fontFamily="'DM Sans', system-ui, sans-serif"
                  fontWeight={isHovered ? 500 : 400}
                >
                  {node.keyword.length > 16 ? node.keyword.slice(0, 14) + "…" : node.keyword}
                </text>
                {/* Count badge for hovered */}
                {isHovered && (
                  <text
                    x={node.x}
                    y={node.y - node.radius - 5}
                    textAnchor="middle"
                    fill="hsl(var(--muted-foreground) / 0.5)"
                    fontSize={6}
                    fontFamily="monospace"
                  >
                    ×{node.count}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Quadrant Legend */}
      <div className="grid grid-cols-4 gap-2 px-3">
        {(["dawn", "zenith", "dusk", "void"] as TimeQuadrant[]).map((q) => {
          const meta = QUADRANT_META[q];
          const count = nodes.filter(n => n.quadrant === q).length;
          return (
            <div
              key={q}
              className="flex flex-col items-center gap-1 py-2 rounded-md"
              style={{
                background: count > 0 ? "hsl(var(--foreground) / 0.03)" : "transparent",
                border: count > 0 ? "1px solid hsl(var(--border) / 0.08)" : "1px solid transparent",
              }}
            >
              <span
                className="font-mono text-muted-foreground/50 uppercase"
                style={{ fontSize: 8, letterSpacing: "0.1em" }}
              >
                {meta.label}
              </span>
              <span
                className="font-mono text-foreground/60 tabular-nums"
                style={{ fontSize: 14, fontWeight: 500 }}
              >
                {count}
              </span>
              <span className="text-muted-foreground/25 font-mono" style={{ fontSize: 7 }}>
                {meta.hours}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
