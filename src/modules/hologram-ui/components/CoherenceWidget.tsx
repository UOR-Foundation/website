/**
 * CoherenceWidget — Persistent system health indicator.
 *
 * Renders a compact zone badge + telos progress bar in the page header.
 * Connects to the SystemEventBus on mount and runs a lightweight probe
 * to show real coherence state. Links to /stream-projection for details.
 */

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MetaObserver, type CoherenceZone } from "@/modules/observable/meta-observer";
import { SystemEventBus } from "@/modules/observable/system-event-bus";

interface WidgetState {
  zone: CoherenceZone;
  phi: number;
  telosProgress: number;
  totalEvents: number;
}

// Zone → numeric value for sparkline (0=coherence, 1=drift, 2=collapse)
const ZONE_VAL: Record<CoherenceZone, number> = { COHERENCE: 0, DRIFT: 1, COLLAPSE: 2 };

const ZONE_DOT: Record<CoherenceZone, string> = {
  COHERENCE: "bg-emerald-400",
  DRIFT: "bg-amber-400",
  COLLAPSE: "bg-red-400",
};

const ZONE_BAR: Record<CoherenceZone, string> = {
  COHERENCE: "bg-emerald-400",
  DRIFT: "bg-amber-400",
  COLLAPSE: "bg-red-400",
};

const HISTORY_LEN = 60; // 60 samples × 500ms = 30 seconds
const ZONE_STROKE: Record<number, string> = {
  0: "rgb(52, 211, 153)",  // emerald-400
  1: "rgb(251, 191, 36)",  // amber-400
  2: "rgb(248, 113, 113)", // red-400
};

export function CoherenceWidget() {
  const [state, setState] = useState<WidgetState>({
    zone: "COHERENCE",
    phi: 1,
    telosProgress: 1,
    totalEvents: 0,
  });
  const [history, setHistory] = useState<number[]>(() => Array(HISTORY_LEN).fill(0));
  const metaRef = useRef<MetaObserver | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const meta = new MetaObserver();
    metaRef.current = meta;

    meta.registerModule("ring-core", "Ring Core", 1);
    meta.registerModule("identity", "Identity", 2);
    meta.registerModule("hologram", "Hologram", 3);

    const unsub = SystemEventBus.subscribe((event) => {
      const moduleMap: Record<string, string> = {
        ring: "ring-core",
        identity: "identity",
        hologram: "hologram",
      };
      const moduleId = moduleMap[event.source] ?? event.source;
      const inputByte = event.inputBytes[0] ?? 0;
      const outputByte = event.outputBytes[0] ?? 0;

      meta.observe({
        moduleId,
        operation: event.operation,
        inputHash: inputByte,
        outputHash: outputByte,
        timestamp: new Date(event.timestamp).toISOString(),
        logosClass: inputByte === outputByte ? "isometry" : "embedding",
      });
    });

    timerRef.current = setInterval(() => {
      const telos = meta.telosVector();
      const overallZone: CoherenceZone =
        telos.zones.collapse > 0 ? "COLLAPSE" :
        telos.zones.drift > 0 ? "DRIFT" : "COHERENCE";

      setState({
        zone: overallZone,
        phi: telos.meanPhi,
        telosProgress: telos.progress,
        totalEvents: SystemEventBus.totalEvents,
      });

      setHistory((prev) => [...prev.slice(1), ZONE_VAL[overallZone]]);
    }, 500);

    return () => {
      unsub();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const phiPercent = Math.round(state.phi * 100);

  return (
    <Link
      to="/console/observer"
      className="flex items-center rounded-md bg-muted/40 hover:bg-muted/70 transition-colors group"
      style={{ gap: "var(--holo-space-2)", padding: "var(--holo-space-1) var(--holo-space-3)" }}
      title={`Zone: ${state.zone} · Φ=${phiPercent}% · ${state.totalEvents} events`}
    >
      {/* Zone dot */}
      <span
        className={`w-1.5 h-1.5 rounded-full ${ZONE_DOT[state.zone]} ${
          state.totalEvents > 0 ? "animate-pulse" : ""
        }`}
      />

      {/* Zone label */}
      <span className="font-mono uppercase text-muted-foreground group-hover:text-foreground transition-colors"
        style={{ fontSize: "var(--holo-text-xs)", letterSpacing: "0.08em" }}
      >
        {state.zone === "COHERENCE" ? "COH" : state.zone === "DRIFT" ? "DFT" : "COL"}
      </span>

      {/* Zone history sparkline */}
      <ZoneSparkline data={history} />

      {/* Phi value */}
      <span className="font-mono text-muted-foreground" style={{ fontSize: "var(--holo-text-xs)" }}>
        {phiPercent}%
      </span>
    </Link>
  );
}

/** Tiny SVG sparkline colored by zone value at each point. */
function ZoneSparkline({ data }: { data: number[] }) {
  const w = 40;
  const h = 8;
  const step = w / (data.length - 1 || 1);

  // Build colored line segments
  const segments: { x1: number; y1: number; x2: number; y2: number; color: string }[] = [];
  for (let i = 0; i < data.length - 1; i++) {
    const y1 = h - (data[i] / 2) * h;
    const y2 = h - (data[i + 1] / 2) * h;
    segments.push({
      x1: i * step,
      y1,
      x2: (i + 1) * step,
      y2,
      color: ZONE_STROKE[data[i + 1]] ?? ZONE_STROKE[0],
    });
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-10 h-2" preserveAspectRatio="none">
      {segments.map((s, i) => (
        <line
          key={i}
          x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
          stroke={s.color}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
