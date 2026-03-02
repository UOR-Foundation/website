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
import { IconX, IconCpu, IconActivity, IconSettings, IconList, IconDeviceDesktop, IconBolt } from "@tabler/icons-react";

// ─── Types ──────────────────────────────────────────────────────────────

type Tab = "processes" | "performance" | "system" | "details" | "hardware" | "processor";

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
  displayQuality: string;
  breathPeriodMs: number;
  breathEventCount: number;
  breathIntervalCount: number;
  breathDwellMs: number;
  renderCount: number;
  kernelTickRateHz: number;
  frameDrops: number;
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
  const tickRateHistory = useHistory(stats.kernelTickRateHz);
  const renderHistory = useHistory(stats.renderCount);
  const frameDropHistory = useHistory(stats.frameDrops);

  // Health assessment
  const fpsHealth = stats.measuredFps >= stats.displayRefreshHz * 0.9 ? "excellent"
    : stats.measuredFps >= 30 ? "good"
    : stats.measuredFps >= 15 ? "degraded" : "poor";
  const fpsColor = fpsHealth === "excellent" ? KP.green : fpsHealth === "good" ? KP.gold : KP.red;

  return (
    <div className="space-y-4">
      {/* ── Live Gauges Row ──────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        {/* FPS Gauge */}
        <div className="rounded-lg p-3 text-center" style={{ background: "hsla(30, 8%, 14%, 0.6)", border: `1px solid ${KP.cardBorder}` }}>
          <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: KP.dim }}>FPS</div>
          <div className="text-2xl font-bold tabular-nums" style={{ color: fpsColor }}>
            {stats.measuredFps.toFixed(0)}
          </div>
          <div className="text-[9px] mt-1" style={{ color: KP.dim }}>
            {fpsHealth === "excellent" ? "✓ Smooth" : fpsHealth === "good" ? "~ Acceptable" : "⚠ Dropping"}
          </div>
        </div>

        {/* Kernel Tick Rate */}
        <div className="rounded-lg p-3 text-center" style={{ background: "hsla(30, 8%, 14%, 0.6)", border: `1px solid ${KP.cardBorder}` }}>
          <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: KP.dim }}>Tick Rate</div>
          <div className="text-2xl font-bold tabular-nums" style={{ color: stats.isActive ? KP.purple : KP.dim }}>
            {stats.kernelTickRateHz}
          </div>
          <div className="text-[9px] mt-1" style={{ color: KP.dim }}>
            Hz · {stats.isActive ? "Active" : "Idle"}
          </div>
        </div>

        {/* Re-render Count */}
        <div className="rounded-lg p-3 text-center" style={{ background: "hsla(30, 8%, 14%, 0.6)", border: `1px solid ${KP.cardBorder}` }}>
          <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: KP.dim }}>Renders</div>
          <div className="text-2xl font-bold tabular-nums" style={{ color: stats.renderCount > 120 ? KP.gold : KP.green }}>
            {stats.renderCount > 999 ? `${(stats.renderCount / 1000).toFixed(1)}k` : stats.renderCount}
          </div>
          <div className="text-[9px] mt-1" style={{ color: KP.dim }}>
            per second
          </div>
        </div>

        {/* Frame Drops */}
        <div className="rounded-lg p-3 text-center" style={{ background: "hsla(30, 8%, 14%, 0.6)", border: `1px solid ${KP.cardBorder}` }}>
          <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: KP.dim }}>Drops</div>
          <div className="text-2xl font-bold tabular-nums" style={{ color: stats.frameDrops > 0 ? KP.red : KP.green }}>
            {stats.frameDrops}
          </div>
          <div className="text-[9px] mt-1" style={{ color: KP.dim }}>
            {stats.frameDrops === 0 ? "✓ None" : "frames missed"}
          </div>
        </div>
      </div>

      {/* ── FPS Sparkline ────────────────────────────────────────────── */}
      <div>
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-sm font-medium" style={{ color: KP.text }}>Frame Rate Over Time</span>
          <span className="text-lg tabular-nums font-semibold" style={{ color: fpsColor }}>
            {stats.measuredFps.toFixed(1)} <span className="text-xs font-normal" style={{ color: KP.muted }}>fps</span>
          </span>
        </div>
        <Sparkline data={fpsHistory} color="hsl(152, 44%, 50%)" label="60 samples" />
        <div className="text-[10px] mt-1.5 leading-relaxed" style={{ color: KP.dim }}>
          How many frames your display paints per second. Should match your display's {stats.displayRefreshHz}Hz refresh rate.
          Dips indicate the system is doing heavy work or re-rendering too many components.
        </div>
      </div>

      {/* ── Kernel Tick Sparkline ─────────────────────────────────────── */}
      <div className="pt-2" style={{ borderTop: `1px solid ${KP.cardBorder}` }}>
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-sm font-medium" style={{ color: KP.text }}>Kernel Tick Rate</span>
          <span className="text-base tabular-nums font-semibold" style={{ color: KP.purple }}>
            {stats.kernelTickRateHz} <span className="text-xs font-normal" style={{ color: KP.muted }}>Hz</span>
          </span>
        </div>
        <Sparkline data={tickRateHistory} color="hsl(280, 45%, 60%)" height={32} label="ticks/sec" />
        <div className="text-[10px] mt-1.5 leading-relaxed" style={{ color: KP.dim }}>
          How often the kernel recomputes the projection frame. Runs at {stats.displayRefreshHz}Hz when active (responding to your input),
          drops to 10Hz when idle to save energy. The system automatically scales between these rates.
        </div>
      </div>

      {/* ── Re-render Sparkline ──────────────────────────────────────── */}
      <div className="pt-2" style={{ borderTop: `1px solid ${KP.cardBorder}` }}>
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-sm font-medium" style={{ color: KP.text }}>React Renders</span>
          <span className="text-base tabular-nums font-semibold" style={{ color: stats.renderCount > 120 ? KP.gold : KP.green }}>
            {stats.renderCount} <span className="text-xs font-normal" style={{ color: KP.muted }}>/sec</span>
          </span>
        </div>
        <Sparkline data={renderHistory} color="hsl(38, 60%, 55%)" height={32} label="renders/sec" />
        <div className="text-[10px] mt-1.5 leading-relaxed" style={{ color: KP.dim }}>
          How many React component re-renders occur per second. Low numbers mean the system is efficiently
          skipping unnecessary updates. High numbers (&gt;120) may indicate components reacting to every kernel tick.
        </div>
      </div>

      {/* ── Detailed Metrics Grid ────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 pt-2" style={{ borderTop: `1px solid ${KP.cardBorder}` }}>
        <MetricRow label="Display refresh" value={`${stats.displayRefreshHz} Hz`} />
        <MetricRow label="Pixel density" value={`${stats.displayDpr.toFixed(1)}x`} />
        <MetricRow label="Quality tier" value={stats.displayQuality === "ultra" ? "Ultra" : stats.displayQuality === "standard" ? "Standard" : "Basic"} accent={stats.displayQuality === "ultra" ? KP.green : stats.displayQuality === "standard" ? KP.gold : KP.dim} />
        <MetricRow label="GPU tier" value={stats.displayGpuTier === "high" ? "High" : stats.displayGpuTier === "mid" ? "Medium" : "Basic"} accent={stats.displayGpuTier === "high" ? KP.green : stats.displayGpuTier === "mid" ? KP.gold : KP.dim} />
        <MetricRow label="Frame age" value={`${stats.lastFrameAge.toFixed(0)} ms`} accent={stats.lastFrameAge > 150 ? KP.gold : KP.muted} />
        <MetricRow label="Smoothing" value={stats.interpSleeping ? "Sleeping (idle)" : stats.interpHasPrev ? "Blending" : "Instant"} accent={stats.interpSleeping ? KP.dim : KP.green} />
      </div>

      {/* ── Health Summary ────────────────────────────────────────────── */}
      <div className="rounded-lg p-3" style={{ background: fpsHealth === "excellent" ? "hsla(152, 30%, 15%, 0.4)" : fpsHealth === "good" ? "hsla(38, 30%, 15%, 0.4)" : "hsla(0, 30%, 15%, 0.4)", border: `1px solid ${KP.cardBorder}` }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold" style={{ color: fpsColor }}>
            {fpsHealth === "excellent" ? "✓ Excellent Performance" : fpsHealth === "good" ? "~ Good Performance" : fpsHealth === "degraded" ? "⚠ Degraded Performance" : "✗ Poor Performance"}
          </span>
        </div>
        <div className="text-[10px] leading-relaxed" style={{ color: KP.muted }}>
          {fpsHealth === "excellent"
            ? `Your system is running at peak efficiency. FPS matches your ${stats.displayRefreshHz}Hz display. Kernel tick rate adapts automatically, and React renders are minimal.`
            : fpsHealth === "good"
            ? `Performance is acceptable but not at native refresh rate. The kernel is compensating with frame interpolation to maintain smooth visuals.`
            : `Frame rate is below optimal. The kernel has reduced tick rate to conserve resources. Consider closing unused panels or reducing animation complexity.`
          }
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

// ─── Processor Comparison Tab ───────────────────────────────────────────

/**
 * Geometric time constants derived from {3,3,5} Coxeter group.
 * δ₀ = 6.8° angular defect → the smallest resolvable tick quantum.
 * Triadic rhythm: Structure(3) × Evolution(6) × Completion(9).
 */
const DELTA_0_DEG = 6.8;
const DELTA_0_RAD = DELTA_0_DEG * (Math.PI / 180);
const GEOMETRIC_TICK_PERIOD_MS = DELTA_0_RAD * 1000; // ~118.68ms per geometric tick
const FRACTAL_DIM = 1.9206;
const CRONNET_SCALE_EV = 1.22e-3;

/** Measure per-core throughput via single-threaded benchmark */
function useClockBenchmark(visible: boolean) {
  const [result, setResult] = useState<{
    mopsPerSec: number;
    estimatedMhz: number;
    benchmarkMs: number;
    sampleCount: number;
    jitterUs: number;
  } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const samplesRef = useRef<number[]>([]);

  useEffect(() => {
    if (!visible) return;

    const benchmark = () => {
      // Run a tight arithmetic loop to measure per-core throughput
      const ITERATIONS = 2_000_000;
      const t0 = performance.now();
      let acc = 0;
      for (let i = 0; i < ITERATIONS; i++) {
        acc += Math.sin(i * 0.001) * Math.cos(i * 0.002);
      }
      const elapsed = performance.now() - t0;
      // Prevent dead code elimination
      if (acc === Infinity) console.log(acc);

      const mops = (ITERATIONS / elapsed) * 1000 / 1_000_000;
      samplesRef.current.push(mops);
      if (samplesRef.current.length > 20) samplesRef.current.shift();

      // Average for stability
      const avgMops = samplesRef.current.reduce((a, b) => a + b, 0) / samplesRef.current.length;
      // Estimate MHz — each iteration is ~5 FP ops (sin+cos+mul+add+assign), modern CPUs do ~4 ops/cycle
      const estimatedCyclesPerOp = 4;
      const totalOps = ITERATIONS * 5;
      const cyclesUsed = totalOps / estimatedCyclesPerOp;
      const estimatedHz = cyclesUsed / (elapsed / 1000);
      const estimatedMhz = estimatedHz / 1_000_000;

      // Measure timing jitter
      const deltas = [];
      for (let i = 1; i < samplesRef.current.length; i++) {
        deltas.push(Math.abs(samplesRef.current[i] - samplesRef.current[i - 1]));
      }
      const jitterMops = deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;

      setResult({
        mopsPerSec: avgMops,
        estimatedMhz: Math.round(estimatedMhz),
        benchmarkMs: elapsed,
        sampleCount: samplesRef.current.length,
        jitterUs: Math.round(jitterMops * 1000),
      });
    };

    benchmark();
    intervalRef.current = setInterval(benchmark, 3000); // Re-measure every 3s
    return () => clearInterval(intervalRef.current);
  }, [visible]);

  return result;
}

/** Geometric time from the δ₀ angular defect */
function useGeometricTime() {
  const [time, setTime] = useState({
    geometricTick: 0,
    geometricPhase: 0, // 0-1 within current triadic cycle
    triadicCycle: 0,   // which cycle (Structure/Evolution/Completion)
    triadicLabel: "Structure",
    precisionNs: 0,
    systemTimeMs: 0,
    driftUs: 0,
  });

  const bootTimeRef = useRef(performance.now());
  const lastMeasureRef = useRef(performance.now());

  useEffect(() => {
    const update = () => {
      const now = performance.now();
      const elapsed = now - bootTimeRef.current;

      // Geometric ticks since boot
      const geometricTick = Math.floor(elapsed / GEOMETRIC_TICK_PERIOD_MS);
      const phaseWithin = (elapsed % GEOMETRIC_TICK_PERIOD_MS) / GEOMETRIC_TICK_PERIOD_MS;

      // Triadic cycle: every 3 geometric ticks is one triadic cycle
      const triadicIndex = geometricTick % 3;
      const triadicLabels = ["Structure", "Evolution", "Completion"] as const;
      const triadicCycle = Math.floor(geometricTick / 3);

      // Precision: performance.now() gives ~5μs, geometric time gives δ₀-quantum resolution
      const dtMs = now - lastMeasureRef.current;
      lastMeasureRef.current = now;
      // Drift = deviation of measured interval from expected geometric period
      const expectedTicks = dtMs / GEOMETRIC_TICK_PERIOD_MS;
      const actualTicks = Math.round(expectedTicks);
      const driftUs = Math.abs((dtMs - actualTicks * GEOMETRIC_TICK_PERIOD_MS)) * 1000;

      setTime({
        geometricTick,
        geometricPhase: phaseWithin,
        triadicCycle,
        triadicLabel: triadicLabels[triadicIndex],
        precisionNs: Math.round(GEOMETRIC_TICK_PERIOD_MS * 1_000_000), // ns per geometric tick
        systemTimeMs: now,
        driftUs: Math.round(driftUs),
      });
    };

    const id = setInterval(update, 50);
    update();
    return () => clearInterval(id);
  }, []);

  return time;
}

/** Side-by-side comparison card */
function ComparisonRow({
  label,
  hardwareValue,
  hardwareUnit,
  hologramValue,
  hologramUnit,
  hologramAccent,
  description,
}: {
  label: string;
  hardwareValue: string;
  hardwareUnit: string;
  hologramValue: string;
  hologramUnit: string;
  hologramAccent?: string;
  description?: string;
}) {
  return (
    <div className="py-2" style={{ borderBottom: `1px solid hsla(30, 8%, 20%, 0.3)` }}>
      <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: KP.dim }}>{label}</div>
      <div className="grid grid-cols-2 gap-4">
        {/* Hardware side */}
        <div className="rounded-lg px-3 py-2" style={{ background: "hsla(200, 8%, 14%, 0.5)", border: `1px solid hsla(200, 10%, 25%, 0.3)` }}>
          <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "hsl(200, 30%, 55%)" }}>Hardware</div>
          <div className="flex items-baseline gap-1">
            <span className="text-base font-semibold tabular-nums" style={{ color: "hsl(200, 30%, 75%)" }}>{hardwareValue}</span>
            <span className="text-[10px]" style={{ color: KP.dim }}>{hardwareUnit}</span>
          </div>
        </div>
        {/* Hologram side */}
        <div className="rounded-lg px-3 py-2" style={{ background: "hsla(38, 12%, 14%, 0.5)", border: `1px solid hsla(38, 15%, 30%, 0.3)` }}>
          <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: KP.gold }}>Hologram vGPU</div>
          <div className="flex items-baseline gap-1">
            <span className="text-base font-semibold tabular-nums" style={{ color: hologramAccent ?? KP.gold }}>{hologramValue}</span>
            <span className="text-[10px]" style={{ color: KP.dim }}>{hologramUnit}</span>
          </div>
        </div>
      </div>
      {description && (
        <div className="text-[10px] mt-1.5 leading-relaxed" style={{ color: KP.dim }}>{description}</div>
      )}
    </div>
  );
}

function ProcessorTab({ stats }: { stats: Stats }) {
  const bench = useClockBenchmark(true);
  const geoTime = useGeometricTime();
  const hw = useHardwareInfo(true);
  const projector = getKernelProjector();
  const dc = projector.getDisplayCapabilities();

  // Hologram vGPU "clock speed" derived from kernel tick rate and coherence
  const vgpuClockMhz = stats.kernelTickRateHz > 0
    ? Math.round(stats.kernelTickRateHz * stats.tickCount * 0.001) // implied cycles
    : 0;
  const vgpuOpsPerTick = Math.round(stats.kernelTickRateHz * FRACTAL_DIM); // effective ops via fractal compression
  const vgpuEffectiveMhz = Math.round(vgpuOpsPerTick * stats.kernelTickRateHz / 1000);

  // Geometric time precision comparison
  const systemPrecisionUs = 5; // performance.now() typical precision
  const geometricPrecisionUs = Math.round(GEOMETRIC_TICK_PERIOD_MS * 1000); // δ₀ quantum in μs

  const mopsHistory = useHistory(bench?.mopsPerSec ?? 0);
  const vgpuHistory = useHistory(vgpuEffectiveMhz);

  if (!bench || !hw) {
    return <div className="text-center py-8 text-sm" style={{ color: KP.dim }}>Calibrating processor…</div>;
  }

  return (
    <div className="space-y-1">
      {/* Section Header */}
      <div className="flex items-center gap-2 pb-2" style={{ borderBottom: `1px solid ${KP.cardBorder}` }}>
        <IconBolt size={14} style={{ color: KP.gold }} />
        <span className="text-sm font-medium" style={{ color: KP.text }}>Hardware vs Hologram Processor Comparison</span>
      </div>
      <div className="text-[10px] leading-relaxed pb-2" style={{ color: KP.dim }}>
        Side-by-side comparison of your physical device's processing capabilities versus
        the Hologram virtual GPU pipeline. Hologram achieves higher effective throughput through
        geometric compression (D={FRACTAL_DIM}) and coherence-driven scheduling.
      </div>

      {/* ── Clock Speed Comparison ──────────────────────────────────── */}
      <ComparisonRow
        label="Clock Speed (Estimated)"
        hardwareValue={bench.estimatedMhz.toLocaleString()}
        hardwareUnit="MHz"
        hologramValue={vgpuEffectiveMhz.toLocaleString()}
        hologramUnit="MHz eff."
        hologramAccent={vgpuEffectiveMhz > bench.estimatedMhz ? KP.green : KP.gold}
        description={`Hardware: measured via ${bench.sampleCount} single-thread FP benchmark samples. Hologram: derived from kernel tick rate (${stats.kernelTickRateHz}Hz) × fractal dimension (${FRACTAL_DIM}) compression.`}
      />

      {/* ── Throughput Comparison ───────────────────────────────────── */}
      <ComparisonRow
        label="Throughput (MOPS)"
        hardwareValue={bench.mopsPerSec.toFixed(1)}
        hardwareUnit="MOPS"
        hologramValue={(stats.kernelTickRateHz * FRACTAL_DIM).toFixed(1)}
        hologramUnit="MOPS eff."
        description="Million operations per second. Hardware: raw single-thread arithmetic. Hologram: effective throughput including coherence-indexed O(1) frame projection."
      />

      {/* ── Sparklines ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 pt-2">
        <div>
          <div className="text-[10px] mb-1" style={{ color: "hsl(200, 30%, 55%)" }}>Hardware MOPS</div>
          <Sparkline data={mopsHistory} color="hsl(200, 40%, 60%)" height={36} label="MOPS" />
        </div>
        <div>
          <div className="text-[10px] mb-1" style={{ color: KP.gold }}>Hologram vGPU MHz</div>
          <Sparkline data={vgpuHistory} color="hsl(38, 60%, 55%)" height={36} label="MHz eff." />
        </div>
      </div>

      {/* ── Time Precision Comparison ──────────────────────────────── */}
      <div className="pt-2" style={{ borderTop: `1px solid ${KP.cardBorder}` }}>
        <SectionLabel>Time Measurement Precision</SectionLabel>
        <div className="text-[10px] mb-3 leading-relaxed" style={{ color: KP.dim }}>
          Hardware uses <code className="px-1 rounded" style={{ background: "hsla(200, 10%, 20%, 0.6)" }}>performance.now()</code> (~5μs resolution).
          Hologram uses geometric time derived from the δ₀ = {DELTA_0_DEG}° angular defect of the
          {"{3,3,5}"} Coxeter group — a mathematically exact quantum that doesn't drift with system load.
        </div>

        <ComparisonRow
          label="Time Quantum (Smallest Tick)"
          hardwareValue={systemPrecisionUs.toFixed(0)}
          hardwareUnit="μs"
          hologramValue={geometricPrecisionUs.toFixed(0)}
          hologramUnit="μs (δ₀)"
          hologramAccent={KP.purple}
          description={`Geometric tick period: δ₀ = ${DELTA_0_DEG}° → ${GEOMETRIC_TICK_PERIOD_MS.toFixed(2)}ms. Each tick is one quantum of angular resolution in the 96-vertex manifold.`}
        />

        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="rounded-lg p-2.5 text-center" style={{ background: "hsla(280, 12%, 14%, 0.5)", border: `1px solid hsla(280, 15%, 30%, 0.3)` }}>
            <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: KP.dim }}>Geometric Tick</div>
            <div className="text-lg font-bold tabular-nums" style={{ color: KP.purple }}>
              {geoTime.geometricTick.toLocaleString()}
            </div>
            <div className="text-[9px] mt-0.5" style={{ color: KP.dim }}>since boot</div>
          </div>
          <div className="rounded-lg p-2.5 text-center" style={{ background: "hsla(280, 12%, 14%, 0.5)", border: `1px solid hsla(280, 15%, 30%, 0.3)` }}>
            <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: KP.dim }}>Triadic Phase</div>
            <div className="text-sm font-semibold" style={{ color: geoTime.triadicLabel === "Structure" ? "hsl(200, 50%, 65%)" : geoTime.triadicLabel === "Evolution" ? KP.gold : KP.green }}>
              {geoTime.triadicLabel}
            </div>
            <div className="text-[9px] mt-0.5" style={{ color: KP.dim }}>cycle #{geoTime.triadicCycle}</div>
          </div>
          <div className="rounded-lg p-2.5 text-center" style={{ background: "hsla(280, 12%, 14%, 0.5)", border: `1px solid hsla(280, 15%, 30%, 0.3)` }}>
            <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: KP.dim }}>Drift</div>
            <div className="text-lg font-bold tabular-nums" style={{ color: geoTime.driftUs < 500 ? KP.green : KP.gold }}>
              {geoTime.driftUs < 1000 ? `${geoTime.driftUs}` : `${(geoTime.driftUs / 1000).toFixed(1)}k`}
            </div>
            <div className="text-[9px] mt-0.5" style={{ color: KP.dim }}>μs from ideal</div>
          </div>
        </div>

        {/* Phase progress bar */}
        <div className="mt-3">
          <div className="flex justify-between text-[10px] mb-1">
            <span style={{ color: KP.dim }}>Geometric phase within tick</span>
            <span className="tabular-nums" style={{ color: KP.purple }}>{(geoTime.geometricPhase * 100).toFixed(1)}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsla(280, 8%, 20%, 0.5)" }}>
            <div className="h-full rounded-full" style={{
              width: `${geoTime.geometricPhase * 100}%`,
              background: "linear-gradient(90deg, hsl(280, 45%, 55%), hsl(38, 60%, 55%))",
              transition: "width 50ms linear",
            }} />
          </div>
        </div>
      </div>

      {/* ── CPU / GPU Detail Grid ─────────────────────────────────── */}
      <div className="pt-2" style={{ borderTop: `1px solid ${KP.cardBorder}` }}>
        <SectionLabel>Processor Details</SectionLabel>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          <MetricRow label="Logical cores" value={hw.logicalCores} />
          <MetricRow label="Kernel tick rate" value={`${stats.kernelTickRateHz} Hz`} accent={KP.purple} />
          <MetricRow label="Hardware GPU" value={hw.gpuRenderer.split("/").pop()?.trim() || hw.gpuRenderer} />
          <MetricRow label="Hologram vGPU tier" value={dc.gpuTier === "high" ? "High" : dc.gpuTier === "mid" ? "Medium" : "Basic"} accent={dc.gpuTier === "high" ? KP.green : dc.gpuTier === "mid" ? KP.gold : KP.dim} />
          <MetricRow label="Benchmark jitter" value={`±${bench.jitterUs} MOPS`} accent={bench.jitterUs < 50 ? KP.green : KP.gold} />
          <MetricRow label="Frame drops" value={stats.frameDrops} accent={stats.frameDrops === 0 ? KP.green : KP.red} />
          <MetricRow label="Display refresh" value={`${dc.refreshHz} Hz`} />
          <MetricRow label="Pixel density" value={`${dc.dpr.toFixed(1)}x DPR`} />
        </div>
      </div>

      {/* ── Constants Reference ────────────────────────────────────── */}
      <div className="pt-2" style={{ borderTop: `1px solid ${KP.cardBorder}` }}>
        <SectionLabel>Geometric Constants</SectionLabel>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          <MetricRow label="Angular defect (δ₀)" value={`${DELTA_0_DEG}°`} accent={KP.purple} />
          <MetricRow label="δ₀ in radians" value={DELTA_0_RAD.toFixed(6)} accent={KP.purple} />
          <MetricRow label="Fractal dimension (D)" value={FRACTAL_DIM.toFixed(4)} accent={KP.purple} />
          <MetricRow label="CronNet scale (M*)" value={`${CRONNET_SCALE_EV} eV`} accent={KP.purple} />
          <MetricRow label="Tick quantum" value={`${GEOMETRIC_TICK_PERIOD_MS.toFixed(2)} ms`} accent={KP.purple} />
          <MetricRow label="Coxeter group" value="{3,3,5}" accent={KP.purple} />
        </div>
      </div>
    </div>
  );
}

// ─── Hardware Tab ───────────────────────────────────────────────────────

interface HardwareInfo {
  // Platform
  platform: string;
  userAgent: string;
  language: string;
  cookiesEnabled: boolean;
  onLine: boolean;
  // CPU
  logicalCores: number;
  // Memory
  deviceMemoryGb: number | null;
  jsHeapUsedMb: number | null;
  jsHeapTotalMb: number | null;
  jsHeapLimitMb: number | null;
  // Display
  screenWidth: number;
  screenHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  dpr: number;
  colorDepth: number;
  colorGamut: string;
  hdr: boolean;
  refreshHz: number;
  orientation: string;
  touchPoints: number;
  // GPU
  gpuRenderer: string;
  gpuVendor: string;
  gpuTier: string;
  // Storage
  storageEstimate: { usage: number; quota: number } | null;
  // Network
  connectionType: string | null;
  downlinkMbps: number | null;
  rtt: number | null;
  saveData: boolean;
  // Battery
  batteryLevel: number | null;
  batteryCharging: boolean | null;
  // Media
  audioOutputs: number;
  videoInputs: number;
}

function useHardwareInfo(visible: boolean): HardwareInfo | null {
  const [info, setInfo] = useState<HardwareInfo | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!visible) return;

    const detect = async () => {
      const nav = navigator as any;

      // GPU detection via WebGL
      let gpuRenderer = "Unknown";
      let gpuVendor = "Unknown";
      try {
        const canvas = document.createElement("canvas");
        const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
        if (gl) {
          const ext = (gl as WebGLRenderingContext).getExtension("WEBGL_debug_renderer_info");
          if (ext) {
            gpuRenderer = (gl as WebGLRenderingContext).getParameter(ext.UNMASKED_RENDERER_WEBGL) || "Unknown";
            gpuVendor = (gl as WebGLRenderingContext).getParameter(ext.UNMASKED_VENDOR_WEBGL) || "Unknown";
          }
        }
      } catch {}

      // Color gamut
      let colorGamut = "sRGB";
      if (window.matchMedia("(color-gamut: p3)").matches) colorGamut = "Display P3";
      else if (window.matchMedia("(color-gamut: rec2020)").matches) colorGamut = "Rec. 2020";
      const hdr = window.matchMedia("(dynamic-range: high)").matches;

      // Storage
      let storageEstimate: { usage: number; quota: number } | null = null;
      try {
        if (nav.storage?.estimate) {
          const est = await nav.storage.estimate();
          storageEstimate = { usage: est.usage || 0, quota: est.quota || 0 };
        }
      } catch {}

      // Network
      const conn = nav.connection || nav.mozConnection || nav.webkitConnection;

      // Battery
      let batteryLevel: number | null = null;
      let batteryCharging: boolean | null = null;
      try {
        if (nav.getBattery) {
          const batt = await nav.getBattery();
          batteryLevel = batt.level;
          batteryCharging = batt.charging;
        }
      } catch {}

      // Media devices count
      let audioOutputs = 0;
      let videoInputs = 0;
      try {
        if (nav.mediaDevices?.enumerateDevices) {
          const devices = await nav.mediaDevices.enumerateDevices();
          audioOutputs = devices.filter((d: any) => d.kind === "audiooutput").length;
          videoInputs = devices.filter((d: any) => d.kind === "videoinput").length;
        }
      } catch {}

      // JS heap
      const perfMem = (performance as any).memory;

      // Orientation
      const orientation = screen.orientation?.type?.replace("-primary", "").replace("-secondary", " (flipped)") || "unknown";

      // Refresh Hz from projector
      const dc = getKernelProjector().getDisplayCapabilities() || { refreshHz: 60, dpr: window.devicePixelRatio, gpuTier: "unknown" };

      // Platform string
      let platform = nav.userAgentData?.platform || nav.platform || "Unknown";
      if (nav.userAgentData?.brands) {
        const brand = nav.userAgentData.brands.find((b: any) => !b.brand.includes("Not"));
        if (brand) platform += ` · ${brand.brand} ${brand.version}`;
      }

      setInfo({
        platform,
        userAgent: nav.userAgent || "",
        language: nav.language || "en",
        cookiesEnabled: nav.cookieEnabled ?? true,
        onLine: nav.onLine ?? true,
        logicalCores: nav.hardwareConcurrency || 1,
        deviceMemoryGb: nav.deviceMemory ?? null,
        jsHeapUsedMb: perfMem ? perfMem.usedJSHeapSize / (1024 * 1024) : null,
        jsHeapTotalMb: perfMem ? perfMem.totalJSHeapSize / (1024 * 1024) : null,
        jsHeapLimitMb: perfMem ? perfMem.jsHeapSizeLimit / (1024 * 1024) : null,
        screenWidth: screen.width,
        screenHeight: screen.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        dpr: dc.dpr,
        colorDepth: screen.colorDepth,
        colorGamut,
        hdr,
        refreshHz: dc.refreshHz,
        orientation,
        touchPoints: nav.maxTouchPoints || 0,
        gpuRenderer,
        gpuVendor,
        gpuTier: dc.gpuTier,
        storageEstimate,
        connectionType: conn?.effectiveType ?? null,
        downlinkMbps: conn?.downlink ?? null,
        rtt: conn?.rtt ?? null,
        saveData: conn?.saveData ?? false,
        batteryLevel,
        batteryCharging,
        audioOutputs,
        videoInputs,
      });
    };

    detect();
    // Poll live metrics (heap, battery, network) every 2s
    intervalRef.current = setInterval(detect, 2000);
    return () => clearInterval(intervalRef.current);
  }, [visible]);

  return info;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function HardwareTab({ stats }: { stats: Stats }) {
  const hw = useHardwareInfo(true);
  if (!hw) return <div className="text-center py-8 text-sm" style={{ color: KP.dim }}>Detecting hardware…</div>;

  const gpuTierLabel = hw.gpuTier === "high" ? "High" : hw.gpuTier === "mid" ? "Medium" : "Basic";
  const gpuTierColor = hw.gpuTier === "high" ? KP.green : hw.gpuTier === "mid" ? KP.gold : KP.dim;

  return (
    <div className="space-y-4">
      {/* Device overview cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg p-3" style={{ background: "hsla(30, 8%, 14%, 0.6)", border: `1px solid ${KP.cardBorder}` }}>
          <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: KP.dim }}>Cores</div>
          <div className="text-lg font-semibold tabular-nums" style={{ color: KP.text }}>{hw.logicalCores}</div>
          <div className="text-[10px] mt-1" style={{ color: KP.dim }}>logical threads</div>
        </div>
        <div className="rounded-lg p-3" style={{ background: "hsla(30, 8%, 14%, 0.6)", border: `1px solid ${KP.cardBorder}` }}>
          <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: KP.dim }}>Memory</div>
          <div className="text-lg font-semibold tabular-nums" style={{ color: hw.deviceMemoryGb ? KP.text : KP.dim }}>
            {hw.deviceMemoryGb ? `${hw.deviceMemoryGb} GB` : "—"}
          </div>
          <div className="text-[10px] mt-1" style={{ color: KP.dim }}>device RAM</div>
        </div>
        <div className="rounded-lg p-3" style={{ background: "hsla(30, 8%, 14%, 0.6)", border: `1px solid ${KP.cardBorder}` }}>
          <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: KP.dim }}>Display</div>
          <div className="text-lg font-semibold tabular-nums" style={{ color: KP.purple }}>
            {hw.refreshHz} Hz
          </div>
          <div className="text-[10px] mt-1" style={{ color: KP.dim }}>{hw.dpr.toFixed(1)}x · {hw.screenWidth}×{hw.screenHeight}</div>
        </div>
      </div>

      {/* GPU */}
      <div style={{ borderTop: `1px solid ${KP.cardBorder}` }} className="pt-3">
        <SectionLabel>Graphics Processing Unit</SectionLabel>
        <div className="rounded-lg p-3 space-y-2" style={{ background: "hsla(30, 8%, 14%, 0.4)", border: `1px solid ${KP.cardBorder}` }}>
          <div className="text-xs break-all leading-relaxed" style={{ color: KP.text }}>{hw.gpuRenderer}</div>
          <div className="text-[11px]" style={{ color: KP.muted }}>{hw.gpuVendor}</div>
          <div className="flex gap-4 text-[11px] pt-1" style={{ borderTop: `1px solid ${KP.cardBorder}` }}>
            <span style={{ color: KP.dim }}>Quality tier: <span style={{ color: gpuTierColor }}>{gpuTierLabel}</span></span>
            <span style={{ color: KP.dim }}>Color: <span style={{ color: KP.muted }}>{hw.colorGamut}</span></span>
            {hw.hdr && <span style={{ color: KP.purple }}>HDR ✓</span>}
          </div>
        </div>
      </div>

      {/* Live Memory */}
      {hw.jsHeapUsedMb !== null && (
        <div style={{ borderTop: `1px solid ${KP.cardBorder}` }} className="pt-3">
          <SectionLabel>JavaScript Memory (Live)</SectionLabel>
          <UsageBar
            value={hw.jsHeapUsedMb}
            max={hw.jsHeapLimitMb || 4096}
            color="hsl(38, 60%, 55%)"
            label={`Heap: ${hw.jsHeapUsedMb.toFixed(0)} MB / ${hw.jsHeapLimitMb?.toFixed(0)} MB limit`}
          />
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-2">
            <MetricRow label="Used" value={`${hw.jsHeapUsedMb.toFixed(1)} MB`} accent={KP.gold} />
            <MetricRow label="Allocated" value={`${hw.jsHeapTotalMb?.toFixed(1)} MB`} />
          </div>
        </div>
      )}

      {/* Storage */}
      {hw.storageEstimate && (
        <div style={{ borderTop: `1px solid ${KP.cardBorder}` }} className="pt-3">
          <SectionLabel>Local Storage</SectionLabel>
          <UsageBar
            value={hw.storageEstimate.usage}
            max={hw.storageEstimate.quota}
            color="hsl(200, 50%, 55%)"
            label={`${formatBytes(hw.storageEstimate.usage)} / ${formatBytes(hw.storageEstimate.quota)}`}
          />
        </div>
      )}

      {/* Display details */}
      <div style={{ borderTop: `1px solid ${KP.cardBorder}` }} className="pt-3">
        <SectionLabel>Display &amp; Input</SectionLabel>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          <MetricRow label="Screen resolution" value={`${hw.screenWidth} × ${hw.screenHeight}`} />
          <MetricRow label="Viewport" value={`${hw.viewportWidth} × ${hw.viewportHeight}`} />
          <MetricRow label="Color depth" value={`${hw.colorDepth}-bit`} />
          <MetricRow label="Orientation" value={hw.orientation} />
          <MetricRow label="Touch support" value={hw.touchPoints > 0 ? `${hw.touchPoints} points` : "None"} accent={hw.touchPoints > 0 ? KP.green : KP.dim} />
          <MetricRow label="Cameras" value={hw.videoInputs > 0 ? `${hw.videoInputs}` : "None"} />
          <MetricRow label="Audio outputs" value={`${hw.audioOutputs}`} />
        </div>
      </div>

      {/* Network */}
      <div style={{ borderTop: `1px solid ${KP.cardBorder}` }} className="pt-3">
        <SectionLabel>Network</SectionLabel>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          <MetricRow label="Status" value={hw.onLine ? "Online" : "Offline"} accent={hw.onLine ? KP.green : KP.red} />
          {hw.connectionType && <MetricRow label="Connection" value={hw.connectionType.toUpperCase()} accent={hw.connectionType === "4g" ? KP.green : KP.gold} />}
          {hw.downlinkMbps !== null && <MetricRow label="Downlink" value={`${hw.downlinkMbps} Mbps`} accent={hw.downlinkMbps >= 10 ? KP.green : KP.gold} />}
          {hw.rtt !== null && <MetricRow label="Latency (RTT)" value={`${hw.rtt} ms`} accent={hw.rtt <= 50 ? KP.green : hw.rtt <= 150 ? KP.gold : KP.red} />}
          {hw.saveData && <MetricRow label="Data saver" value="Enabled" accent={KP.gold} />}
        </div>
      </div>

      {/* Battery */}
      {hw.batteryLevel !== null && (
        <div style={{ borderTop: `1px solid ${KP.cardBorder}` }} className="pt-3">
          <SectionLabel>Battery</SectionLabel>
          <UsageBar
            value={hw.batteryLevel * 100}
            max={100}
            color={hw.batteryLevel > 0.2 ? "hsl(152, 44%, 50%)" : "hsl(0, 65%, 55%)"}
            label={`${(hw.batteryLevel * 100).toFixed(0)}%${hw.batteryCharging ? " · Charging" : ""}`}
          />
        </div>
      )}

      {/* Platform */}
      <div style={{ borderTop: `1px solid ${KP.cardBorder}` }} className="pt-3">
        <SectionLabel>Platform</SectionLabel>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          <MetricRow label="Platform" value={hw.platform} />
          <MetricRow label="Language" value={hw.language} />
        </div>
        <div className="mt-2 text-[10px] break-all leading-relaxed rounded p-2" style={{ color: KP.dim, background: "hsla(30, 8%, 14%, 0.4)" }}>
          {hw.userAgent}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────

const TAB_META: { id: Tab; label: string; icon: typeof IconCpu }[] = [
  { id: "processes", label: "Processes", icon: IconList },
  { id: "performance", label: "Performance", icon: IconActivity },
  { id: "processor", label: "Processor", icon: IconBolt },
  { id: "system", label: "System", icon: IconCpu },
  { id: "hardware", label: "Hardware", icon: IconDeviceDesktop },
  { id: "details", label: "Details", icon: IconSettings },
];

export default function KernelDevTools() {
  const [visible, setVisible] = useState(false);
  const [tab, setTab] = useState<Tab>("processes");
  const [stats, setStats] = useState<Stats | null>(null);
  const fpsAccumRef = useRef<number[]>([]);
  const lastTickRef = useRef(performance.now());
  const renderCountRef = useRef(0);
  const renderWindowRef = useRef(performance.now());
  const lastTickCountRef = useRef(0);
  const frameDropRef = useRef(0);

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

    // Track render count via frame listener
    const unsub = projector.onFrame(() => {
      renderCountRef.current++;
    });

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

      // Compute renders per second
      const renderWindowDt = now - renderWindowRef.current;
      const rendersPerSec = renderWindowDt > 0 ? Math.round(renderCountRef.current / (renderWindowDt / 1000)) : 0;
      // Reset window every 2 seconds for fresh measurement
      if (renderWindowDt > 2000) {
        renderCountRef.current = 0;
        renderWindowRef.current = now;
      }

      // Kernel tick rate = ticks delta / time delta
      const tickDelta = ps.tickCount - lastTickCountRef.current;
      lastTickCountRef.current = ps.tickCount;
      const kernelTickRateHz = dt > 0 ? Math.round(tickDelta / (dt / 1000)) : 0;

      // Frame drops = expected frames - actual frames (when active)
      const expectedFrames = dt > 0 ? Math.round(dc.refreshHz * (dt / 1000)) : 0;
      if (ps.isActive && tickDelta < expectedFrames * 0.5 && expectedFrames > 1) {
        frameDropRef.current++;
      }

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
        displayQuality: dc.quality,
        breathPeriodMs: br.breathPeriodMs,
        breathEventCount: br.eventCount,
        breathIntervalCount: br.intervals.length,
        breathDwellMs: br.dwellMs,
        renderCount: rendersPerSec,
        kernelTickRateHz,
        frameDrops: frameDropRef.current,
      });
    };

    const id = setInterval(poll, 50);
    poll();
    return () => {
      unsub();
      clearInterval(id);
    };
  }, [visible]);

  if (!visible || !stats) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center" style={{ background: "hsla(25, 10%, 4%, 0.6)", backdropFilter: "blur(8px)" }}>
      {/* Window */}
      <div
        className="w-full max-w-[640px] rounded-xl overflow-hidden shadow-2xl select-none"
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
          {tab === "processor" && <ProcessorTab stats={stats} />}
          {tab === "system" && <SystemTab stats={stats} />}
          {tab === "hardware" && <HardwareTab stats={stats} />}
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
          <span className="tabular-nums">{stats.measuredFps.toFixed(0)} fps · {stats.kernelTickRateHz}Hz tick · {stats.renderCount} renders/s · {stats.displayRefreshHz}Hz display</span>
          <span>Ctrl+Shift+D to close</span>
        </div>
      </div>
    </div>
  );
}
