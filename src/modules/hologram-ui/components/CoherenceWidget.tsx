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

export function CoherenceWidget() {
  const [state, setState] = useState<WidgetState>({
    zone: "COHERENCE",
    phi: 1,
    telosProgress: 1,
    totalEvents: 0,
  });
  const metaRef = useRef<MetaObserver | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const meta = new MetaObserver();
    metaRef.current = meta;

    // Register lightweight probes for the three core subsystems
    meta.registerModule("ring-core", "Ring Core", 1);
    meta.registerModule("identity", "Identity", 2);
    meta.registerModule("hologram", "Hologram", 3);

    // Listen to real system events and feed them into the meta-observer
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

    // Periodically read telos state
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
      className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-muted/40 hover:bg-muted/70 transition-colors group"
      title={`Zone: ${state.zone} · Φ=${phiPercent}% · ${state.totalEvents} events — Click for Observer Hub`}
    >
      {/* Zone dot */}
      <span
        className={`w-1.5 h-1.5 rounded-full ${ZONE_DOT[state.zone]} ${
          state.totalEvents > 0 ? "animate-pulse" : ""
        }`}
      />

      {/* Zone label */}
      <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
        {state.zone === "COHERENCE" ? "COH" : state.zone === "DRIFT" ? "DFT" : "COL"}
      </span>

      {/* Telos progress bar */}
      <div className="w-8 h-1 rounded-full bg-muted/50 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${ZONE_BAR[state.zone]}`}
          style={{ width: `${phiPercent}%` }}
        />
      </div>

      {/* Phi value */}
      <span className="text-[9px] font-mono text-muted-foreground">
        {phiPercent}%
      </span>
    </Link>
  );
}
