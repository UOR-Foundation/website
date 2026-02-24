/**
 * Observer Hub — Unified Navigation for Self-Reflective Observation
 * ═════════════════════════════════════════════════════════════════
 *
 * Links to all three observer views with live zone badges
 * computed from real system state.
 */

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PageShell } from "@/modules/hologram-ui";
import { MetaObserver, type CoherenceZone } from "../meta-observer";
import { StreamProjection, type StreamSnapshot } from "../stream-projection";
import { SystemEventBus } from "../system-event-bus";

// ── Types ───────────────────────────────────────────────────────────────────

interface ViewStatus {
  zone: CoherenceZone;
  label: string;
  metric: string;
}

// ── Zone Styles ─────────────────────────────────────────────────────────────

const ZONE_COLORS: Record<CoherenceZone, { badge: string; ring: string; glow: string; dot: string }> = {
  COHERENCE: {
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    ring: "ring-emerald-500/20",
    glow: "shadow-emerald-500/10",
    dot: "bg-emerald-400",
  },
  DRIFT: {
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    ring: "ring-amber-500/20",
    glow: "shadow-amber-500/10",
    dot: "bg-amber-400",
  },
  COLLAPSE: {
    badge: "bg-red-500/15 text-red-400 border-red-500/30",
    ring: "ring-red-500/20",
    glow: "shadow-red-500/10",
    dot: "bg-red-400",
  },
};

// ── View Definitions ────────────────────────────────────────────────────────

interface ViewDef {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  path: string;
  description: string;
}

const VIEWS: ViewDef[] = [
  {
    id: "meta-observer",
    title: "Meta-Observer",
    subtitle: "Module Coherence",
    icon: "🔭",
    path: "/meta-observer",
    description: "Per-module coherence profiling. Tracks H-scores, Logos classification, and God Conjecture metrics across all registered UOR modules.",
  },
  {
    id: "multi-scale",
    title: "Multi-Scale Observer",
    subtitle: "L0→L5 Hierarchy",
    icon: "🔬",
    path: "/multi-scale",
    description: "Six-level scale hierarchy from individual bytes (L0) through datums, operations, modules, projections, up to the full network (L5).",
  },
  {
    id: "stream-projection",
    title: "Stream Projection",
    subtitle: "Live Byte Stream",
    icon: "⚡",
    path: "/stream-projection",
    description: "Real-time byte stream flowing through all scale levels. Live System mode intercepts actual ring, identity, and hologram operations.",
  },
];

// ── Main Page ───────────────────────────────────────────────────────────────

export default function ObserverHubPage() {
  const [statuses, setStatuses] = useState<Record<string, ViewStatus>>({
    "meta-observer": { zone: "COHERENCE", label: "Idle", metric: "—" },
    "multi-scale": { zone: "COHERENCE", label: "Idle", metric: "—" },
    "stream-projection": { zone: "COHERENCE", label: "Idle", metric: "—" },
  });
  const [systemEventCount, setSystemEventCount] = useState(0);
  const [probeRunning, setProbeRunning] = useState(false);
  const metaRef = useRef<MetaObserver | null>(null);
  const streamRef = useRef<StreamProjection | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Run a lightweight probe that exercises the system and reads live state
  const startProbe = () => {
    if (probeRunning) return;
    setProbeRunning(true);

    const meta = new MetaObserver();
    const stream = new StreamProjection();
    metaRef.current = meta;
    streamRef.current = stream;

    // Register some representative modules
    meta.registerModule("ring-core", "Ring Core", 1);
    meta.registerModule("identity", "Identity Engine", 2);
    meta.registerModule("hologram", "Hologram Projector", 3);

    // Connect stream to system bus
    stream.connectToSystem();
    stream.subscribe((snap: StreamSnapshot) => {
      const l2 = snap.levels[2];
      setStatuses((prev) => ({
        ...prev,
        "stream-projection": {
          zone: l2?.zone ?? "COHERENCE",
          label: `${snap.totalBytes.toLocaleString()} B`,
          metric: `${snap.bytesPerSecond.toFixed(0)} B/s`,
        },
      }));
      setSystemEventCount(stream.systemEventsReceived);
    });

    // Probe: periodically run operations and observe
    let tick = 0;
    const now = () => new Date().toISOString();
    timerRef.current = setInterval(() => {
      tick++;

      const ops = [
        { moduleId: "ring-core", operation: "neg", inputHash: tick % 256, outputHash: (256 - (tick % 256)) & 0xff, timestamp: now(), logosClass: "isometry" as const },
        { moduleId: "ring-core", operation: "succ", inputHash: tick % 256, outputHash: ((tick % 256) + 1) & 0xff, timestamp: now(), logosClass: "isometry" as const },
        { moduleId: "identity", operation: "singleProofHash", inputHash: (tick * 37) % 256, outputHash: (tick * 37 + 3) % 256, timestamp: now(), logosClass: "embedding" as const },
        { moduleId: "hologram", operation: "project", inputHash: (tick * 13) % 256, outputHash: (tick * 13) % 256, timestamp: now(), logosClass: "isometry" as const },
      ];

      for (const op of ops) {
        meta.observe(op);
      }

      // Emit to system bus so stream picks up
      SystemEventBus.emit("ring", "probe:neg", new Uint8Array([tick % 256]), new Uint8Array([(256 - (tick % 256)) & 0xff]));
      SystemEventBus.emit("identity", "probe:hash", new Uint8Array([(tick * 37) % 256]), new Uint8Array([(tick * 37 + 3) % 256]));

      // Read meta-observer state
      const telos = meta.telosVector();
      const allProfiles = [
        meta.getProfile("ring-core"),
        meta.getProfile("identity"),
        meta.getProfile("hologram"),
      ].filter(Boolean);
      
      const worstZone = allProfiles.reduce<CoherenceZone>(
        (z, p) => (p!.zone === "COLLAPSE" ? "COLLAPSE" : p!.zone === "DRIFT" && z !== "COLLAPSE" ? "DRIFT" : z),
        "COHERENCE",
      );

      const overallZone: CoherenceZone = 
        telos.zones.collapse > 0 ? "COLLAPSE" : telos.zones.drift > 0 ? "DRIFT" : "COHERENCE";

      setStatuses((prev) => ({
        ...prev,
        "meta-observer": {
          zone: worstZone,
          label: `${allProfiles.length} modules`,
          metric: `Φ=${(telos.meanPhi * 100).toFixed(0)}%`,
        },
        "multi-scale": {
          zone: overallZone,
          label: `${(telos.coherenceRatio * 100) | 0}% coherent`,
          metric: `${telos.totalModules} modules`,
        },
      }));
    }, 200);
  };

  const stopProbe = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.stop();
    streamRef.current?.disconnectFromSystem();
    setProbeRunning(false);
  };

  useEffect(() => {
    return () => { stopProbe(); };
  }, []);

  return (
    <PageShell
      title="Observer Hub"
      subtitle="Self-reflective observation — the system watching itself"
    >
      <div className="space-y-8">
        {/* ── Probe Control ──────────────────────────────────────────── */}
        <div className="flex items-center gap-4">
          {!probeRunning ? (
            <button
              onClick={startProbe}
              className="px-4 py-2 rounded-lg text-sm font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors"
            >
              ▶ Start Live Probe
            </button>
          ) : (
            <button
              onClick={stopProbe}
              className="px-4 py-2 rounded-lg text-sm font-mono bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 transition-colors"
            >
              ■ Stop Probe
            </button>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <span className={`w-2 h-2 rounded-full ${probeRunning ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground/30"}`} />
            {probeRunning ? "Probing system…" : "Idle"}
          </div>
          {probeRunning && (
            <span className="text-xs font-mono text-muted-foreground ml-auto">
              {systemEventCount} system events
            </span>
          )}
        </div>

        {/* ── View Cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {VIEWS.map((view) => {
            const status = statuses[view.id];
            const colors = ZONE_COLORS[status.zone];
            return (
              <Link
                key={view.id}
                to={view.path}
                className={`group relative rounded-xl border border-muted-foreground/10 bg-card p-6 space-y-4 
                  hover:border-primary/30 hover:shadow-xl transition-all duration-300 
                  ring-1 ${colors.ring} shadow-lg ${colors.glow}`}
              >
                {/* Zone badge */}
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{view.icon}</span>
                  <span className={`text-[10px] font-mono uppercase px-2 py-1 rounded-full border ${colors.badge}`}>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${colors.dot} mr-1.5 ${probeRunning ? "animate-pulse" : ""}`} />
                    {status.zone}
                  </span>
                </div>

                {/* Title */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                    {view.title}
                  </h3>
                  <p className="text-xs font-mono text-muted-foreground">{view.subtitle}</p>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {view.description}
                </p>

                {/* Live metrics */}
                <div className="flex items-center gap-3 pt-2 border-t border-muted-foreground/10">
                  <span className="text-xs font-mono text-foreground">{status.label}</span>
                  <span className="text-[10px] text-muted-foreground">·</span>
                  <span className="text-xs font-mono text-muted-foreground">{status.metric}</span>
                </div>

                {/* Arrow */}
                <div className="absolute top-6 right-6 text-muted-foreground/30 group-hover:text-primary/50 transition-colors text-lg">
                  →
                </div>
              </Link>
            );
          })}
        </div>

        {/* ── System Overview ────────────────────────────────────────── */}
        <div className="rounded-xl border border-muted-foreground/10 bg-card p-6 space-y-4">
          <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
            Architecture
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div className="space-y-2">
              <p className="text-foreground font-semibold">System Event Bus</p>
              <p>Singleton emitter intercepting ring, identity, and hologram operations as raw byte signals.</p>
            </div>
            <div className="space-y-2">
              <p className="text-foreground font-semibold">Scale Hierarchy</p>
              <p>L0 Byte → L1 Datum → L2 Operation → L3 Module → L4 Projection → L5 Network</p>
            </div>
            <div className="space-y-2">
              <p className="text-foreground font-semibold">Self-Reflection</p>
              <p>The system observes its own computations through the same coherence framework it applies to everything else.</p>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
