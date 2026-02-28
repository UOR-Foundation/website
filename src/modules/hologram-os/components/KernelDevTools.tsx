/**
 * Kernel Task Manager — System monitor overlay inspired by Windows Task Manager.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Toggle with Ctrl+Shift+D. Centered modal with tabs:
 *   Processes · Performance · System · Details
 *
 * All labels are jargon-free. Designed for maximum familiarity.
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { getKernelProjector } from "@/modules/hologram-os/projection-engine";
import { getBrowserAdapter } from "@/modules/hologram-os/surface-adapter";
import { KP } from "@/modules/hologram-os/kernel-palette";
import { IconX, IconCpu, IconActivity, IconSettings, IconList } from "@tabler/icons-react";

// ─── Types ──────────────────────────────────────────────────────────────

type Tab = "processes" | "performance" | "system" | "details";

interface Stats {
  tickCount: number;
  dirty: boolean;
  streamRunning: boolean;
  isActive: boolean;
  tickRateHz: number;
  listenerCount: number;
  activeUntil: number;
  lastFrameAge: number;
  interpRunning: boolean;
  interpSleeping: boolean;
  interpTickMs: number;
  interpPhase: number;
  interpHasPrev: boolean;
  measuredFps: number;
  displayRefreshHz: number;
  displayDpr: number;
  displayGpuTier: string;
  breathPeriodMs: number;
  breathEventCount: number;
  breathIntervalCount: number;
  breathDwellMs: number;
}

// ─── Sparkline History ──────────────────────────────────────────────────

function useHistory(value: number, maxLen = 60) {
  const ref = useRef<number[]>([]);
  ref.current.push(value);
  if (ref.current.length > maxLen) ref.current.shift();
  return ref.current;
}

// ─── Shared Sub-components ──────────────────────────────────────────────

function Sparkline({ data, color, height = 48, label }: { data: number[]; color: string; height?: number; label?: string }) {
  const max = Math.max(...data, 1);
  const w = 280;
  const points = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * w;
    const y = height - (v / max) * (height - 4);
    return `${x},${y}`;
  }).join(" ");

  const fillPoints = `0,${height} ${points} ${w},${height}`;

  return (
    <div className="relative" style={{ width: w, height }}>
      <svg width={w} height={height} className="overflow-visible">
        <defs>
          <linearGradient id={`sg-${color.replace(/[^a-z0-9]/gi, "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <polygon points={fillPoints} fill={`url(#sg-${color.replace(/[^a-z0-9]/gi, "")})`} />
        <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} />
      </svg>
      {label && (
        <span className="absolute top-0 right-0 text-[9px] opacity-60" style={{ color: KP.muted, fontFamily: KP.font }}>
          {label}
        </span>
      )}
    </div>
  );
}

function MetricRow({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-xs" style={{ color: KP.muted }}>{label}</span>
      <span className="text-xs font-medium tabular-nums" style={{ color: accent ?? KP.text }}>
        {value}
      </span>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="text-[10px] uppercase tracking-widest mb-1.5 mt-3 first:mt-0" style={{ color: KP.dim }}>
      {children}
    </div>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
      style={{ background: active ? KP.green : KP.dim }}
    />
  );
}

function UsageBar({ value, max = 100, color, label }: { value: number; max?: number; color: string; label: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span style={{ color: KP.muted }}>{label}</span>
        <span className="tabular-nums" style={{ color }}>{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsla(30, 8%, 20%, 0.6)" }}>
        <div
          className="h-full rounded-full transition-all duration-200"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ─── Tab Panels ─────────────────────────────────────────────────────────

function ProcessesTab({ stats }: { stats: Stats }) {
  const projector = getKernelProjector();
  const frame = projector.projectFrame();
  const processes = frame.processes;

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="grid grid-cols-[1fr_70px_60px_60px_60px] gap-2 text-[10px] uppercase tracking-wider pb-1"
        style={{ color: KP.dim, borderBottom: `1px solid ${KP.cardBorder}` }}>
        <span>Name</span>
        <span className="text-right">Status</span>
        <span className="text-right">Score</span>
        <span className="text-right">CPU</span>
        <span className="text-right">Children</span>
      </div>

      {/* Process rows */}
      {processes.map((p) => {
        const zoneColor = p.zone === "convergent" ? KP.green : p.zone === "exploring" ? KP.gold : KP.red;
        return (
          <div
            key={p.pid}
            className="grid grid-cols-[1fr_70px_60px_60px_60px] gap-2 items-center text-xs py-0.5 rounded px-1 hover:bg-white/[0.02] transition-colors"
          >
            <span className="flex items-center gap-1.5" style={{ color: KP.text }}>
              <StatusDot active={p.state === "running"} />
              <span className="truncate">{p.name}</span>
              <span className="text-[9px] opacity-40">#{p.pid}</span>
            </span>
            <span className="text-right capitalize text-[11px]" style={{ color: zoneColor }}>
              {p.zone === "convergent" ? "Stable" : p.zone === "exploring" ? "Active" : "Unstable"}
            </span>
            <span className="text-right tabular-nums" style={{ color: KP.muted }}>
              {(p.hScore * 100).toFixed(0)}%
            </span>
            <span className="text-right tabular-nums" style={{ color: KP.muted }}>
              {p.cpuMs.toFixed(0)}ms
            </span>
            <span className="text-right tabular-nums" style={{ color: KP.muted }}>
              {p.childCount}
            </span>
          </div>
        );
      })}

      {processes.length === 0 && (
        <div className="text-center py-8 text-sm" style={{ color: KP.dim }}>No active processes</div>
      )}

      {/* Summary bar */}
      <div className="flex gap-4 pt-2 text-[11px]" style={{ borderTop: `1px solid ${KP.cardBorder}`, color: KP.muted }}>
        <span>Processes: <strong style={{ color: KP.text }}>{processes.length}</strong></span>
        <span>Listeners: <strong style={{ color: KP.text }}>{stats.listenerCount}</strong></span>
        <span>Frame rate: <strong style={{ color: KP.text }}>{stats.tickRateHz} Hz</strong></span>
      </div>
    </div>
  );
}

function PerformanceTab({ stats }: { stats: Stats }) {
  const fpsHistory = useHistory(stats.measuredFps);
  const frameAgeHistory = useHistory(stats.lastFrameAge);
  const interpHistory = useHistory(stats.interpPhase * 100);

  return (
    <div className="grid grid-cols-[140px_1fr] gap-4" style={{ minHeight: 280 }}>
      {/* Left sidebar — resource list */}
      <div className="space-y-1.5 pr-3" style={{ borderRight: `1px solid ${KP.cardBorder}` }}>
        {[
          { label: "Frame Rate", detail: `${stats.measuredFps.toFixed(0)} fps`, color: KP.green },
          { label: "Rendering", detail: stats.isActive ? "Active" : "Idle", color: stats.isActive ? KP.green : KP.dim },
          { label: "Display", detail: `${stats.displayRefreshHz}Hz`, color: KP.purple },
          { label: "Smoothing", detail: stats.interpSleeping ? "Sleeping" : "Running", color: stats.interpSleeping ? KP.gold : KP.green },
          { label: "Breathing", detail: `${(stats.breathPeriodMs / 1000).toFixed(1)}s`, color: KP.purple },
        ].map(({ label, detail, color }) => (
          <div key={label} className="rounded-md px-2.5 py-2 cursor-default hover:bg-white/[0.03] transition-colors">
            <div className="text-xs font-medium" style={{ color: KP.text }}>{label}</div>
            <div className="text-[10px] mt-0.5" style={{ color }}>{detail}</div>
          </div>
        ))}
      </div>

      {/* Right — charts & detail */}
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-sm font-medium" style={{ color: KP.text }}>Frame Rate</span>
            <span className="text-lg tabular-nums font-semibold" style={{ color: KP.green }}>
              {stats.measuredFps.toFixed(1)} <span className="text-xs font-normal" style={{ color: KP.muted }}>fps</span>
            </span>
          </div>
          <Sparkline data={fpsHistory} color="hsl(152, 44%, 50%)" label="60 seconds" />
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-1 pt-2" style={{ borderTop: `1px solid ${KP.cardBorder}` }}>
          <MetricRow label="Display refresh" value={`${stats.displayRefreshHz} Hz`} />
          <MetricRow label="Pixel density" value={`${stats.displayDpr.toFixed(1)}x`} />
          <MetricRow label="Graphics quality" value={stats.displayGpuTier === "high" ? "High" : stats.displayGpuTier === "mid" ? "Medium" : "Basic"} accent={stats.displayGpuTier === "high" ? KP.green : stats.displayGpuTier === "mid" ? KP.gold : KP.dim} />
          <MetricRow label="Frame age" value={`${stats.lastFrameAge.toFixed(0)} ms`} accent={stats.lastFrameAge > 150 ? KP.gold : KP.muted} />
          <MetricRow label="Smoothing phase" value={`${(stats.interpPhase * 100).toFixed(0)}%`} />
          <MetricRow label="Blend mode" value={stats.interpHasPrev ? "Smooth" : "Instant"} accent={stats.interpHasPrev ? KP.green : KP.gold} />
        </div>

        <div className="pt-2" style={{ borderTop: `1px solid ${KP.cardBorder}` }}>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-xs" style={{ color: KP.muted }}>Frame Timing</span>
          </div>
          <Sparkline data={frameAgeHistory} color="hsl(38, 60%, 55%)" height={32} label="age (ms)" />
        </div>
      </div>
    </div>
  );
}

function SystemTab({ stats }: { stats: Stats }) {
  const projector = getKernelProjector();
  const frame = projector.projectFrame();

  return (
    <div className="space-y-4">
      {/* System Overview */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg p-3" style={{ background: "hsla(30, 8%, 14%, 0.6)", border: `1px solid ${KP.cardBorder}` }}>
          <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: KP.dim }}>Engine</div>
          <div className="text-lg font-semibold tabular-nums" style={{ color: stats.isActive ? KP.green : KP.muted }}>
            {stats.isActive ? "Active" : "Idle"}
          </div>
          <div className="text-[10px] mt-1" style={{ color: KP.dim }}>
            {stats.tickCount.toLocaleString()} frames rendered
          </div>
        </div>
        <div className="rounded-lg p-3" style={{ background: "hsla(30, 8%, 14%, 0.6)", border: `1px solid ${KP.cardBorder}` }}>
          <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: KP.dim }}>Coherence</div>
          <div className="text-lg font-semibold tabular-nums" style={{ color: frame.systemCoherence.zone === "convergent" ? KP.green : KP.gold }}>
            {(frame.systemCoherence.meanH * 100).toFixed(0)}%
          </div>
          <div className="text-[10px] mt-1 capitalize" style={{ color: KP.dim }}>
            {frame.systemCoherence.zone === "convergent" ? "Stable" : frame.systemCoherence.zone === "exploring" ? "Adapting" : "Unstable"}
          </div>
        </div>
        <div className="rounded-lg p-3" style={{ background: "hsla(30, 8%, 14%, 0.6)", border: `1px solid ${KP.cardBorder}` }}>
          <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: KP.dim }}>Focus</div>
          <div className="text-lg font-semibold tabular-nums" style={{ color: KP.purple }}>
            {(frame.attention.aperture * 100).toFixed(0)}%
          </div>
          <div className="text-[10px] mt-1" style={{ color: KP.dim }}>
            {frame.attention.preset === "focus" ? "Deep focus" : "Relaxed"}
          </div>
        </div>
      </div>

      {/* Breathing & Rhythm */}
      <div style={{ borderTop: `1px solid ${KP.cardBorder}` }} className="pt-3">
        <SectionLabel>Your Rhythm</SectionLabel>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          <MetricRow label="Breathing pace" value={`${(stats.breathPeriodMs / 1000).toFixed(1)}s per cycle`} accent={KP.purple} />
          <MetricRow label="Interactions" value={stats.breathEventCount.toLocaleString()} />
          <MetricRow label="Rhythm samples" value={`${stats.breathIntervalCount} of 20`} />
          {stats.breathDwellMs > 0 && (
            <MetricRow label="Time since last action" value={`${(stats.breathDwellMs / 1000).toFixed(1)}s`} accent={stats.breathDwellMs > 5000 ? KP.gold : KP.muted} />
          )}
        </div>
      </div>

      {/* Typography & Display */}
      <div style={{ borderTop: `1px solid ${KP.cardBorder}` }} className="pt-3">
        <SectionLabel>Display</SectionLabel>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          <MetricRow label="Refresh rate" value={`${stats.displayRefreshHz} Hz`} />
          <MetricRow label="Pixel density" value={`${stats.displayDpr.toFixed(1)}x`} />
          <MetricRow label="Graphics quality" value={stats.displayGpuTier === "high" ? "High" : stats.displayGpuTier === "mid" ? "Medium" : "Basic"} />
          <MetricRow label="Text scale" value={`${(frame.typography.userScale * 100).toFixed(0)}%`} />
        </div>
      </div>
    </div>
  );
}

function DetailsTab({ stats }: { stats: Stats }) {
  return (
    <div className="space-y-3">
      <SectionLabel>Rendering Engine</SectionLabel>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
        <MetricRow label="Engine status" value={stats.streamRunning ? "Running" : "Stopped"} accent={stats.streamRunning ? KP.green : KP.red} />
        <MetricRow label="Tick rate" value={`${stats.tickRateHz} Hz`} />
        <MetricRow label="Total frames" value={stats.tickCount.toLocaleString()} />
        <MetricRow label="Pending changes" value={stats.dirty ? "Yes" : "None"} accent={stats.dirty ? KP.gold : KP.muted} />
        <MetricRow label="Active listeners" value={stats.listenerCount} />
        {stats.isActive && (
          <MetricRow label="Active duration" value={`${(stats.activeUntil / 1000).toFixed(1)}s`} accent={KP.green} />
        )}
      </div>

      <SectionLabel>Smoothing Pipeline</SectionLabel>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
        <MetricRow label="Smoothing engine" value={stats.interpSleeping ? "Sleeping" : stats.interpRunning ? "Running" : "Off"} accent={stats.interpSleeping ? KP.gold : stats.interpRunning ? KP.green : KP.dim} />
        <MetricRow label="Update interval" value={`${stats.interpTickMs.toFixed(0)} ms`} />
        <MetricRow label="Progress" value={`${(stats.interpPhase * 100).toFixed(0)}%`} />
        <MetricRow label="Transition style" value={stats.interpHasPrev ? "Smooth blend" : "Instant snap"} accent={stats.interpHasPrev ? KP.green : KP.gold} />
      </div>

      <SectionLabel>Measured Performance</SectionLabel>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
        <MetricRow label="Actual frame rate" value={`${stats.measuredFps.toFixed(1)} fps`} accent={stats.measuredFps > 15 ? KP.green : KP.gold} />
        <MetricRow label="Last frame age" value={`${stats.lastFrameAge.toFixed(0)} ms`} accent={stats.lastFrameAge > 150 ? KP.gold : KP.muted} />
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────

const TAB_META: { id: Tab; label: string; icon: typeof IconCpu }[] = [
  { id: "processes", label: "Processes", icon: IconList },
  { id: "performance", label: "Performance", icon: IconActivity },
  { id: "system", label: "System", icon: IconCpu },
  { id: "details", label: "Details", icon: IconSettings },
];

export default function KernelDevTools() {
  const [visible, setVisible] = useState(false);
  const [tab, setTab] = useState<Tab>("processes");
  const [stats, setStats] = useState<Stats | null>(null);
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
      const dc = projector.getDisplayCapabilities();

      setStats({
        ...ps,
        interpRunning: is.running,
        interpSleeping: is.sleeping,
        interpTickMs: is.tickMs,
        interpPhase: is.phase,
        interpHasPrev: is.hasPrev,
        measuredFps,
        displayRefreshHz: dc.refreshHz,
        displayDpr: dc.dpr,
        displayGpuTier: dc.gpuTier,
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

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center" style={{ background: "hsla(25, 10%, 4%, 0.6)", backdropFilter: "blur(8px)" }}>
      {/* Window */}
      <div
        className="w-full max-w-[580px] rounded-xl overflow-hidden shadow-2xl select-none"
        style={{
          background: "hsla(25, 8%, 8%, 0.97)",
          border: `1px solid ${KP.cardBorder}`,
          fontFamily: KP.font,
          maxHeight: "80vh",
        }}
      >
        {/* Title bar */}
        <div
          className="flex items-center justify-between px-4 py-2.5"
          style={{ borderBottom: `1px solid ${KP.cardBorder}` }}
        >
          <div className="flex items-center gap-2">
            <IconCpu size={14} style={{ color: KP.gold }} />
            <span className="text-sm font-semibold" style={{ color: KP.text, fontFamily: KP.serif }}>
              Task Manager
            </span>
          </div>
          <button
            onClick={() => setVisible(false)}
            className="p-1 rounded hover:bg-white/[0.06] transition-colors"
            title="Close (Ctrl+Shift+D)"
          >
            <IconX size={14} style={{ color: KP.muted }} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex px-2 pt-1" style={{ borderBottom: `1px solid ${KP.cardBorder}` }}>
          {TAB_META.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-t transition-colors relative"
                style={{
                  color: active ? KP.text : KP.dim,
                  background: active ? "hsla(30, 8%, 14%, 0.8)" : "transparent",
                  borderBottom: active ? `2px solid hsl(38, 60%, 55%)` : "2px solid transparent",
                }}
              >
                <Icon size={13} />
                {label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: "calc(80vh - 88px)" }}>
          {tab === "processes" && <ProcessesTab stats={stats} />}
          {tab === "performance" && <PerformanceTab stats={stats} />}
          {tab === "system" && <SystemTab stats={stats} />}
          {tab === "details" && <DetailsTab stats={stats} />}
        </div>

        {/* Status bar */}
        <div
          className="flex items-center justify-between px-4 py-1.5 text-[10px]"
          style={{ borderTop: `1px solid ${KP.cardBorder}`, color: KP.dim }}
        >
          <span>
            <StatusDot active={stats.isActive} />
            {stats.isActive ? "Engine active" : "Engine idle"}
          </span>
          <span className="tabular-nums">{stats.measuredFps.toFixed(0)} fps · {stats.displayRefreshHz}Hz display</span>
          <span>Ctrl+Shift+D to close</span>
        </div>
      </div>
    </div>
  );
}
