/**
 * KernelDevTools — Real-time projection stream diagnostics overlay.
 * ═══════════════════════════════════════════════════════════════════
 *
 * Shows live stats from both the KernelProjector (tick rate, frame
 * count, dirty flags, active/idle) and the BrowserSurfaceAdapter
 * (interpolation phase, tick interval).
 *
 * Toggle with Ctrl+Shift+D. Anchored bottom-right, semi-transparent.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { getKernelProjector } from "@/modules/hologram-os/projection-engine";
import { getBrowserAdapter } from "@/modules/hologram-os/surface-adapter";
import { KP } from "@/modules/hologram-os/kernel-palette";

interface Stats {
  // Projector
  tickCount: number;
  dirty: boolean;
  streamRunning: boolean;
  isActive: boolean;
  tickRateHz: number;
  listenerCount: number;
  activeUntil: number;
  lastFrameAge: number;
  // Surface adapter interpolation
  interpRunning: boolean;
  interpTickMs: number;
  interpPhase: number;
  interpHasPrev: boolean;
  // Derived
  measuredFps: number;
  // Breathing rhythm
  breathPeriodMs: number;
  breathEventCount: number;
  breathIntervalCount: number;
  breathDwellMs: number;
}

function StatRow({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex justify-between gap-4" style={{ fontSize: 10, fontFamily: "monospace" }}>
      <span style={{ color: KP.dim }}>{label}</span>
      <span style={{ color: color ?? KP.muted, fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

function Bar({ value, max = 1, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div
      className="h-1 rounded-full overflow-hidden"
      style={{ background: "hsla(30, 8%, 20%, 0.5)", width: "100%" }}
    >
      <div
        className="h-full rounded-full transition-all duration-75"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

export default function KernelDevTools() {
  const [visible, setVisible] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const frameCountRef = useRef(0);
  const fpsAccumRef = useRef<number[]>([]);
  const lastTickRef = useRef(performance.now());

  // Toggle with Ctrl+Shift+D
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        e.preventDefault();
        setVisible((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Poll stats at ~20Hz when visible
  useEffect(() => {
    if (!visible) return;

    const projector = getKernelProjector();
    const adapter = getBrowserAdapter();

    const poll = () => {
      const now = performance.now();
      const ps = projector.getStreamStats();
      const is = adapter.getInterpStats();

      // Measure actual FPS from poll cadence
      const dt = now - lastTickRef.current;
      lastTickRef.current = now;
      if (dt > 0 && dt < 200) {
        fpsAccumRef.current.push(1000 / dt);
        if (fpsAccumRef.current.length > 20) fpsAccumRef.current.shift();
      }
      const measuredFps =
        fpsAccumRef.current.length > 0
          ? fpsAccumRef.current.reduce((a, b) => a + b, 0) / fpsAccumRef.current.length
          : 0;

      const br = projector.getBreathingRhythm();

      setStats({
        ...ps,
        interpRunning: is.running,
        interpTickMs: is.tickMs,
        interpPhase: is.phase,
        interpHasPrev: is.hasPrev,
        measuredFps,
        breathPeriodMs: br.breathPeriodMs,
        breathEventCount: br.eventCount,
        breathIntervalCount: br.intervals.length,
        breathDwellMs: br.dwellMs,
      });
    };

    const id = setInterval(poll, 50);
    poll();
    return () => clearInterval(id);
  }, [visible]);

  if (!visible || !stats) return null;

  const activeColor = stats.isActive ? KP.green : KP.dim;
  const dirtyColor = stats.dirty ? KP.gold : KP.dim;

  return (
    <div
      className="fixed z-[9998] select-none pointer-events-auto"
      style={{ bottom: 16, right: 16 }}
    >
      <div
        className="w-56 rounded-lg p-2.5 backdrop-blur-xl space-y-1.5"
        style={{
          background: "hsla(25, 8%, 6%, 0.88)",
          border: `1px solid ${KP.cardBorder}`,
          fontFamily: KP.font,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <span
            className="text-[9px] font-semibold tracking-widest uppercase"
            style={{ color: KP.gold, fontFamily: KP.serif }}
          >
            Kernel DevTools
          </span>
          <span className="text-[8px]" style={{ color: KP.dim }}>
            Ctrl+⇧+D
          </span>
        </div>

        {/* Stream State */}
        <div className="space-y-0.5">
          <span className="text-[8px] uppercase tracking-wider" style={{ color: KP.dim }}>
            Projection Stream
          </span>
          <StatRow
            label="state"
            value={stats.isActive ? "ACTIVE" : "IDLE"}
            color={activeColor}
          />
          <StatRow
            label="tick rate"
            value={`${stats.tickRateHz} Hz`}
            color={stats.isActive ? KP.green : KP.muted}
          />
          <StatRow label="frames" value={stats.tickCount.toLocaleString()} />
          <StatRow
            label="dirty"
            value={stats.dirty ? "YES" : "no"}
            color={dirtyColor}
          />
          <StatRow label="listeners" value={stats.listenerCount} />
          {stats.isActive && (
            <StatRow
              label="active for"
              value={`${(stats.activeUntil / 1000).toFixed(1)}s`}
              color={KP.green}
            />
          )}
          <StatRow
            label="frame age"
            value={`${stats.lastFrameAge.toFixed(0)}ms`}
            color={stats.lastFrameAge > 150 ? KP.gold : KP.muted}
          />
        </div>

        {/* Interpolation */}
        <div
          className="space-y-0.5 pt-1.5"
          style={{ borderTop: `1px solid ${KP.cardBorder}` }}
        >
          <span className="text-[8px] uppercase tracking-wider" style={{ color: KP.dim }}>
            Surface Interpolation
          </span>
          <StatRow
            label="running"
            value={stats.interpRunning ? "YES" : "no"}
            color={stats.interpRunning ? KP.green : KP.dim}
          />
          <StatRow
            label="kernel tick"
            value={`${stats.interpTickMs.toFixed(0)}ms`}
          />
          <div className="flex items-center gap-2">
            <span className="text-[10px]" style={{ color: KP.dim, fontFamily: "monospace", minWidth: 32 }}>
              phase
            </span>
            <Bar value={stats.interpPhase} color={`hsl(38, 40%, ${50 + stats.interpPhase * 20}%)`} />
            <span className="text-[9px]" style={{ color: KP.muted, fontFamily: "monospace", minWidth: 28, textAlign: "right" }}>
              {(stats.interpPhase * 100).toFixed(0)}%
            </span>
          </div>
          <StatRow
            label="blending"
            value={stats.interpHasPrev ? "lerp" : "snap"}
            color={stats.interpHasPrev ? KP.green : KP.gold}
          />
        </div>

        {/* Breathing Rhythm */}
        <div
          className="space-y-0.5 pt-1.5"
          style={{ borderTop: `1px solid ${KP.cardBorder}` }}
        >
          <span className="text-[8px] uppercase tracking-wider" style={{ color: KP.dim }}>
            Breathing Rhythm
          </span>
          <StatRow
            label="period"
            value={`${(stats.breathPeriodMs / 1000).toFixed(1)}s`}
            color={KP.purple}
          />
          <div className="flex items-center gap-2">
            <span className="text-[10px]" style={{ color: KP.dim, fontFamily: "monospace", minWidth: 32 }}>
              pace
            </span>
            <Bar
              value={stats.breathPeriodMs}
              max={8000}
              color={`hsl(${280 - (stats.breathPeriodMs / 8000) * 120}, 40%, 55%)`}
            />
          </div>
          <StatRow label="events" value={stats.breathEventCount.toLocaleString()} />
          <StatRow label="samples" value={`${stats.breathIntervalCount}/20`} />
          {stats.breathDwellMs > 0 && (
            <StatRow
              label="dwell"
              value={`${(stats.breathDwellMs / 1000).toFixed(1)}s`}
              color={stats.breathDwellMs > 5000 ? KP.gold : KP.muted}
            />
          )}
        </div>

        {/* Poll FPS */}
        <div
          className="pt-1.5 flex justify-between"
          style={{ borderTop: `1px solid ${KP.cardBorder}` }}
        >
          <span className="text-[8px]" style={{ color: KP.dim, fontFamily: "monospace" }}>
            poll fps
          </span>
          <span
            className="text-[9px]"
            style={{
              color: stats.measuredFps > 15 ? KP.green : KP.gold,
              fontFamily: "monospace",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {stats.measuredFps.toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  );
}
