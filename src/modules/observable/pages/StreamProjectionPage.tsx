/**
 * Stream Projection — Live Coherence Rendering
 * ═════════════════════════════════════════════
 *
 * Real-time visualization of a byte stream flowing through
 * all six scale levels of the Multi-Scale Observer.
 *
 * The stream IS the observation. The UI IS the projection.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { StreamProjection, type StreamSnapshot, type LevelSnapshot } from "../stream-projection";
import { SourceBreakdownPanel } from "../components/SourceBreakdownPanel";
import { SystemEventBus } from "../system-event-bus";
import { PageShell } from "@/modules/hologram-ui";
import { Q0 } from "@/modules/ring-core/ring";
import { singleProofHash } from "@/modules/uns/core/identity";
import { project } from "@/modules/uns/core/hologram";

// ── Zone Colors ─────────────────────────────────────────────────────────────

const ZONE_STYLE: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  COHERENCE: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", glow: "shadow-emerald-500/20" },
  DRIFT:     { bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/30",   glow: "shadow-amber-500/20" },
  COLLAPSE:  { bg: "bg-red-500/10",     text: "text-red-400",     border: "border-red-500/30",     glow: "shadow-red-500/20" },
};

// ── Main Page ───────────────────────────────────────────────────────────────

export default function StreamProjectionPage() {
  const engineRef = useRef<StreamProjection | null>(null);
  const [snapshot, setSnapshot] = useState<StreamSnapshot | null>(null);
  const [mode, setMode] = useState<"coherent" | "drift" | "collapse" | "recovery" | "live-system">("coherent");
  const [isStreaming, setIsStreaming] = useState(false);
  const [speed, setSpeed] = useState(80);
  const [systemEvents, setSystemEvents] = useState(0);
  const liveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize engine once
  useEffect(() => {
    const engine = new StreamProjection();
    engineRef.current = engine;
    const unsub = engine.subscribe((s) => {
      setSnapshot(s);
      setIsStreaming(engine.isStreaming);
    });
    return () => {
      engine.stop();
      engine.disconnectFromSystem();
      unsub();
      if (liveTimerRef.current) clearInterval(liveTimerRef.current);
    };
  }, []);

  const stopLiveSystem = useCallback(() => {
    if (liveTimerRef.current) {
      clearInterval(liveTimerRef.current);
      liveTimerRef.current = null;
    }
    engineRef.current?.disconnectFromSystem();
  }, []);

  const handleStart = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    if (mode === "live-system") {
      // Connect to real system events + generate real operations periodically
      engine.connectToSystem();
      const ring = Q0();
      let tick = 0;
      liveTimerRef.current = setInterval(() => {
        tick++;
        // Ring operations
        const a = [tick % 256];
        const b = [(tick * 7) % 256];
        ring.neg(a);
        ring.succ(b);
        ring.xor(a, b);
        // Identity derivation every 5th tick
        if (tick % 5 === 0) {
          singleProofHash({ "@type": "LiveTick", value: tick, ts: Date.now() }).then((id) => {
            // Hologram projection from the derived identity
            project(id);
          }).catch(() => {});
        }
      }, speed);
      setIsStreaming(true);
    } else {
      stopLiveSystem();
      engine.startDemo(mode, speed, 8);
      setIsStreaming(true);
    }
  }, [mode, speed, stopLiveSystem]);

  const handleStop = useCallback(() => {
    engineRef.current?.stop();
    stopLiveSystem();
    setIsStreaming(false);
  }, [stopLiveSystem]);

  const handleReset = useCallback(() => {
    stopLiveSystem();
    engineRef.current?.reset();
    setSnapshot(null);
    setIsStreaming(false);
    setSystemEvents(0);
  }, [stopLiveSystem]);

  const handlePulse = useCallback(() => {
    // Single manual injection
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    engineRef.current?.ingest(bytes);
  }, []);

  return (
    <PageShell
      title="Stream Projection"
      subtitle="Live coherence rendering — bytes flowing through L0→L5 in real-time"
    >
      <div className="space-y-6">
        {/* ── Controls ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Mode selector */}
          {(["coherent", "drift", "collapse", "recovery", "live-system"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                if (isStreaming) {
                  handleStop();
                  engineRef.current?.reset();
                }
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-mono uppercase tracking-wider transition-all ${
                mode === m
                  ? m === "live-system"
                    ? "bg-sky-500/20 text-sky-400 border border-sky-500/40"
                    : "bg-primary/20 text-primary border border-primary/40"
                  : "bg-muted/50 text-muted-foreground border border-transparent hover:border-muted-foreground/20"
              }`}
            >
              {m === "live-system" ? "⚡ Live System" : m}
            </button>
          ))}

          <div className="w-px h-6 bg-muted-foreground/20" />

          {/* Speed slider */}
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Speed</span>
            <input
              type="range" min={20} max={500} step={10} value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-20 accent-primary"
            />
            <span className="font-mono w-12">{speed}ms</span>
          </label>

          <div className="flex-1" />

          {/* Action buttons */}
          <button onClick={handlePulse} className="px-3 py-1.5 rounded-md text-xs font-mono bg-muted/50 text-muted-foreground border border-muted-foreground/20 hover:bg-muted transition-colors">
            Pulse
          </button>
          {!isStreaming ? (
            <button onClick={handleStart} className="px-4 py-1.5 rounded-md text-xs font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors">
              ▶ Start
            </button>
          ) : (
            <button onClick={handleStop} className="px-4 py-1.5 rounded-md text-xs font-mono bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors">
              ■ Stop
            </button>
          )}
          <button onClick={handleReset} className="px-3 py-1.5 rounded-md text-xs font-mono bg-muted/50 text-muted-foreground border border-muted-foreground/20 hover:bg-muted transition-colors">
            Reset
          </button>
        </div>

        {/* ── Stats Bar ────────────────────────────────────────────────── */}
        {snapshot && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <StatPill label="Frame" value={`#${snapshot.frame}`} />
            <StatPill label="Bytes" value={snapshot.totalBytes.toLocaleString()} />
            <StatPill label="Rate" value={`${snapshot.bytesPerSecond.toFixed(0)} B/s`} />
            <StatPill
              label="Cross-Scale"
              value={snapshot.crossScale.consistent ? "✓ Consistent" : `⚠ ${snapshot.crossScale.anomalies.length} anomaly`}
              zone={snapshot.crossScale.consistent ? "COHERENCE" : "DRIFT"}
            />
            <StatPill
              label="Network Zone"
              value={snapshot.network?.zone ?? "—"}
              zone={snapshot.network?.zone ?? "COHERENCE"}
            />
            {mode === "live-system" && (
              <StatPill
                label="System Events"
                value={`${engineRef.current?.systemEventsReceived ?? 0}`}
                zone="COHERENCE"
              />
            )}
          </div>
        )}

        {/* ── Scale Ladder ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          {(snapshot?.levels ?? []).map((level) => (
            <ScaleCard key={level.level} level={level} />
          ))}
        </div>

        {/* ── Byte Stream Visualization ────────────────────────────────── */}
        {snapshot && snapshot.recentBytes.length > 0 && (
          <div className="rounded-lg border border-muted-foreground/10 bg-card p-4 space-y-3">
            <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Live Byte Stream (last {snapshot.recentBytes.length})
            </h3>
            <div className="flex flex-wrap gap-1">
              {snapshot.recentBytes.map((b, i) => (
                <ByteCell key={i} value={b} isLast={i === snapshot.recentBytes.length - 1} />
              ))}
            </div>
          </div>
        )}

        {/* ── Cross-Scale Anomalies ────────────────────────────────────── */}
        {snapshot && snapshot.crossScale.anomalies.length > 0 && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
            <h3 className="text-xs font-mono text-amber-400 uppercase tracking-wider">
              Cross-Scale Anomalies
            </h3>
            {snapshot.crossScale.anomalies.map((a, i) => (
              <p key={i} className="text-sm text-amber-300/80 font-mono">{a}</p>
            ))}
          </div>
        )}

        {/* ── Source Breakdown ──────────────────────────────────────────── */}
        <SourceBreakdownPanel />
      </div>
    </PageShell>
  );
}

// ── Sub-Components ──────────────────────────────────────────────────────────

function ScaleCard({ level }: { level: LevelSnapshot }) {
  const style = ZONE_STYLE[level.zone];
  const hPercent = Math.min(100, (level.meanH / 8) * 100);
  const phiPercent = level.phi * 100;

  return (
    <div className={`rounded-lg border ${style.border} ${style.bg} p-3 space-y-2 shadow-lg ${style.glow} transition-all`}>
      <div className="flex items-center justify-between">
        <span className="text-lg">{level.icon}</span>
        <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${style.bg} ${style.text}`}>
          {level.zone}
        </span>
      </div>
      <div>
        <p className="text-xs font-semibold text-foreground">L{level.level} {level.name}</p>
        <p className="text-[10px] text-muted-foreground">{level.count} entities</p>
      </div>
      {/* H-score bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>H-score</span>
          <span className="font-mono">{level.meanH.toFixed(2)}</span>
        </div>
        <div className="h-1 rounded-full bg-muted/30 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              level.zone === "COHERENCE" ? "bg-emerald-400" :
              level.zone === "DRIFT" ? "bg-amber-400" : "bg-red-400"
            }`}
            style={{ width: `${hPercent}%` }}
          />
        </div>
      </div>
      {/* Phi bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Φ</span>
          <span className="font-mono">{level.phi.toFixed(2)}</span>
        </div>
        <div className="h-1 rounded-full bg-muted/30 overflow-hidden">
          <div
            className="h-full rounded-full bg-sky-400 transition-all duration-300"
            style={{ width: `${phiPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function ByteCell({ value, isLast }: { value: number; isLast: boolean }) {
  // Color by zone: full Q0 graph means H=0 for all, so color by popcount
  const pc = popcount8(value);
  const heat = pc / 8; // 0–1
  const opacity = isLast ? "opacity-100 scale-110" : "opacity-70";

  return (
    <div
      className={`w-6 h-6 rounded-sm flex items-center justify-center text-[9px] font-mono transition-all duration-200 ${opacity}`}
      style={{
        backgroundColor: `hsl(${(1 - heat) * 140}, 70%, ${20 + heat * 20}%)`,
        color: `hsl(${(1 - heat) * 140}, 80%, 70%)`,
      }}
      title={`0x${value.toString(16).padStart(2, "0")} | pop=${pc} | bin=${value.toString(2).padStart(8, "0")}`}
    >
      {value.toString(16).padStart(2, "0")}
    </div>
  );
}

function StatPill({ label, value, zone }: { label: string; value: string; zone?: string }) {
  const style = zone ? ZONE_STYLE[zone] : null;
  return (
    <div className={`rounded-md border ${style?.border ?? "border-muted-foreground/10"} ${style?.bg ?? "bg-card"} px-3 py-2`}>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-mono font-semibold ${style?.text ?? "text-foreground"}`}>{value}</p>
    </div>
  );
}

// Inline popcount for byte visualization
function popcount8(x: number): number {
  let v = x & 0xff;
  let c = 0;
  while (v) { v &= v - 1; c++; }
  return c;
}
