/**
 * SourceBreakdownPanel — Real-time event source breakdown with sparklines.
 *
 * Subscribes to SystemEventBus and tracks per-source (ring, identity, hologram)
 * event counts + rolling history for sparkline rendering.
 */

import { useEffect, useRef, useState } from "react";
import { SystemEventBus, type SystemEventSource } from "../system-event-bus";

interface SourceStats {
  count: number;
  bytesTotal: number;
  lastOp: string;
  history: number[]; // rolling bucket counts for sparkline
}

type SourceMap = Record<SystemEventSource, SourceStats>;

const SOURCES: { id: SystemEventSource; label: string; icon: string; color: string; barColor: string }[] = [
  { id: "ring",        label: "Ring Core",  icon: "💎", color: "text-sky-400",     barColor: "bg-sky-400" },
  { id: "identity",    label: "Identity",   icon: "🔑", color: "text-violet-400",  barColor: "bg-violet-400" },
  { id: "hologram",    label: "Hologram",   icon: "🌐", color: "text-emerald-400", barColor: "bg-emerald-400" },
  { id: "certificate", label: "Certificate",icon: "📜", color: "text-amber-400",   barColor: "bg-amber-400" },
];

const HISTORY_LEN = 30; // 30 buckets
const BUCKET_MS = 500;  // each bucket = 500ms → 15s window

const empty = (): SourceStats => ({ count: 0, bytesTotal: 0, lastOp: "—", history: Array(HISTORY_LEN).fill(0) });

export function SourceBreakdownPanel() {
  const [stats, setStats] = useState<SourceMap>({
    ring: empty(), identity: empty(), hologram: empty(), certificate: empty(),
  });
  const accRef = useRef<Record<SystemEventSource, number>>({ ring: 0, identity: 0, hologram: 0, certificate: 0 });
  const statsRef = useRef(stats);
  statsRef.current = stats;

  useEffect(() => {
    // Accumulate events between bucket ticks
    const unsub = SystemEventBus.subscribe((event) => {
      accRef.current[event.source] = (accRef.current[event.source] || 0) + 1;

      setStats((prev) => {
        const s = prev[event.source];
        return {
          ...prev,
          [event.source]: {
            ...s,
            count: s.count + 1,
            bytesTotal: s.bytesTotal + event.inputBytes.length + event.outputBytes.length,
            lastOp: event.operation,
          },
        };
      });
    });

    // Sparkline bucket tick
    const timer = setInterval(() => {
      setStats((prev) => {
        const next = { ...prev };
        for (const src of SOURCES) {
          const s = prev[src.id];
          const bucketVal = accRef.current[src.id] || 0;
          accRef.current[src.id] = 0;
          const hist = [...s.history.slice(1), bucketVal];
          next[src.id] = { ...s, history: hist };
        }
        return next;
      });
    }, BUCKET_MS);

    return () => { unsub(); clearInterval(timer); };
  }, []);

  const totalEvents = SOURCES.reduce((s, src) => s + stats[src.id].count, 0);
  const activeSources = SOURCES.filter((s) => stats[s.id].count > 0);

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          Event Source Breakdown
        </h3>
        <span className="text-[10px] font-mono text-muted-foreground">
          {totalEvents.toLocaleString()} total
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SOURCES.map((src) => {
          const s = stats[src.id];
          const pct = totalEvents > 0 ? (s.count / totalEvents) * 100 : 0;

          return (
            <div
              key={src.id}
              className="rounded-md border border-border bg-muted/20 p-3 space-y-2"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{src.icon}</span>
                  <span className={`text-xs font-semibold ${src.color}`}>{src.label}</span>
                </div>
                <span className="text-xs font-mono text-foreground">{s.count.toLocaleString()}</span>
              </div>

              {/* Proportion bar */}
              <div className="h-1 rounded-full bg-muted/40 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${src.barColor}`}
                  style={{ width: `${Math.max(pct, s.count > 0 ? 2 : 0)}%` }}
                />
              </div>

              {/* Sparkline */}
              <Sparkline data={s.history} color={src.barColor} />

              {/* Meta */}
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{(s.bytesTotal).toLocaleString()} B</span>
                <span className="font-mono truncate max-w-[120px]">{s.lastOp}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Tiny inline SVG sparkline. */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(1, ...data);
  const w = 120;
  const h = 20;
  const step = w / (data.length - 1 || 1);

  const points = data.map((v, i) => `${i * step},${h - (v / max) * h}`).join(" ");

  // Map tailwind bar class to an inline stroke color
  const strokeMap: Record<string, string> = {
    "bg-sky-400": "rgb(56, 189, 248)",
    "bg-violet-400": "rgb(167, 139, 250)",
    "bg-emerald-400": "rgb(52, 211, 153)",
    "bg-amber-400": "rgb(251, 191, 36)",
  };
  const stroke = strokeMap[color] ?? "rgb(148, 163, 184)";

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-5" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
