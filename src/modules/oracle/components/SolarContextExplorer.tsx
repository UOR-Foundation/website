/**
 * SolarContextExplorer — Temporal knowledge constellation view.
 *
 * Visualizes the user's knowledge patterns organized by time of day,
 * showing topic clusters as a constellation/orbital view.
 */

import { useState, useEffect, useMemo } from "react";
import { getSearchHistory, type SearchHistoryEntry } from "@/modules/oracle/lib/search-history";
import { loadProfile } from "@/modules/oracle/lib/attention-tracker";
import { Sun, Moon, Sunrise, Sunset, Loader2 } from "lucide-react";

interface Props {
  onNavigate?: (topic: string) => void;
}

interface TimeCluster {
  phase: "morning" | "afternoon" | "evening" | "night";
  label: string;
  icon: React.ElementType;
  topics: Array<{ keyword: string; count: number }>;
  color: string;
}

function getPhaseForHour(h: number): TimeCluster["phase"] {
  if (h < 6) return "night";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

const PHASE_META: Record<TimeCluster["phase"], { label: string; icon: React.ElementType; color: string }> = {
  morning: { label: "Morning", icon: Sunrise, color: "hsl(40 70% 60%)" },
  afternoon: { label: "Afternoon", icon: Sun, color: "hsl(45 80% 55%)" },
  evening: { label: "Evening", icon: Sunset, color: "hsl(25 60% 50%)" },
  night: { label: "Night", icon: Moon, color: "hsl(220 30% 55%)" },
};

export default function SolarContextExplorer({ onNavigate }: Props) {
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await getSearchHistory(100);
      if (!cancelled) {
        setHistory(entries);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const clusters = useMemo(() => {
    const phaseMap: Record<TimeCluster["phase"], Map<string, number>> = {
      morning: new Map(),
      afternoon: new Map(),
      evening: new Map(),
      night: new Map(),
    };

    for (const entry of history) {
      if (!entry.searched_at) continue;
      const h = new Date(entry.searched_at).getHours();
      const phase = getPhaseForHour(h);
      const map = phaseMap[phase];
      map.set(entry.keyword, (map.get(entry.keyword) || 0) + 1);
    }

    return (Object.keys(phaseMap) as TimeCluster["phase"][]).map((phase) => {
      const meta = PHASE_META[phase];
      const map = phaseMap[phase];
      const topics = Array.from(map.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([keyword, count]) => ({ keyword, count }));

      return { phase, ...meta, topics } as TimeCluster;
    });
  }, [history]);

  const profile = useMemo(() => loadProfile(), []);
  const totalSessions = profile.sessionCount;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground/40" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Sun className="w-8 h-8 text-muted-foreground/20" />
        <p className="text-sm text-muted-foreground/40">
          Explore topics to build your solar context map
        </p>
      </div>
    );
  }

  const cx = 200;
  const cy = 200;
  const orbitRadii = [60, 110, 155];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="text-center">
        <h2
          className="text-foreground/90 font-display"
          style={{ fontSize: "clamp(1.2rem, 3vw, 1.6rem)", fontWeight: 300, letterSpacing: "-0.02em" }}
        >
          Solar Context
        </h2>
        <p className="text-[11px] text-muted-foreground/40 mt-1 font-mono">
          {totalSessions} sessions · {history.length} explorations
        </p>
      </div>

      {/* Constellation SVG */}
      <div className="flex justify-center">
        <svg viewBox="0 0 400 400" className="w-full" style={{ maxWidth: 480, height: "auto" }}>
          {/* Orbit rings */}
          {orbitRadii.map((r, i) => (
            <circle
              key={`orbit-${i}`}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="hsl(var(--border) / 0.12)"
              strokeWidth={0.5}
              strokeDasharray="4 4"
            />
          ))}

          {/* Center sun */}
          <circle cx={cx} cy={cy} r={8} fill="hsl(var(--foreground) / 0.1)" />
          <circle cx={cx} cy={cy} r={4} fill="hsl(var(--foreground) / 0.7)" />
          <text
            x={cx}
            y={cy + 18}
            textAnchor="middle"
            fill="hsl(var(--muted-foreground))"
            fontSize={7}
            opacity={0.5}
          >
            You
          </text>

          {/* Phase clusters */}
          {clusters.map((cluster, ci) => {
            const phaseAngle = (ci / 4) * 2 * Math.PI - Math.PI / 2;

            return cluster.topics.map((topic, ti) => {
              const orbitIdx = Math.min(ti, orbitRadii.length - 1);
              const r = orbitRadii[orbitIdx];
              const angleSpread = 0.8;
              const angle = phaseAngle + (ti - cluster.topics.length / 2) * (angleSpread / Math.max(cluster.topics.length, 1));
              const x = cx + r * Math.cos(angle);
              const y = cy + r * Math.sin(angle);
              const nodeSize = Math.max(2, Math.min(5, 1.5 + topic.count * 0.8));

              return (
                <g
                  key={`${cluster.phase}-${topic.keyword}`}
                  style={{ cursor: onNavigate ? "pointer" : "default" }}
                  onClick={() => onNavigate?.(topic.keyword)}
                >
                  <circle
                    cx={x}
                    cy={y}
                    r={nodeSize}
                    fill={cluster.color}
                    opacity={0.6}
                  />
                  <text
                    x={x}
                    y={y + nodeSize + 8}
                    textAnchor="middle"
                    fill="hsl(var(--muted-foreground))"
                    fontSize={6}
                    opacity={0.5}
                    fontFamily="system-ui, sans-serif"
                  >
                    {topic.keyword.length > 14 ? topic.keyword.slice(0, 12) + "…" : topic.keyword}
                  </text>
                </g>
              );
            });
          })}
        </svg>
      </div>

      {/* Phase legend */}
      <div className="grid grid-cols-2 gap-3 px-4">
        {clusters
          .filter((c) => c.topics.length > 0)
          .map((cluster) => {
            const Icon = cluster.icon;
            return (
              <div
                key={cluster.phase}
                className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/15 border border-border/15"
              >
                <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: cluster.color }} />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                    {cluster.label}
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {cluster.topics.slice(0, 4).map((t) => (
                      <button
                        key={t.keyword}
                        onClick={() => onNavigate?.(t.keyword)}
                        className="text-[9px] text-muted-foreground/50 hover:text-foreground/70 bg-muted/20 px-1.5 py-0.5 rounded transition-colors truncate"
                        style={{ maxWidth: 80 }}
                      >
                        {t.keyword}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
