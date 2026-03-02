/**
 * Kernel Task Manager — Afterburner-inspired system monitor
 * ═══════════════════════════════════════════════════════════
 *
 * Toggle with Ctrl+Shift+D. Futuristic hardware monitoring aesthetic
 * inspired by MSI Afterburner — segmented bars, large readouts,
 * beveled panels — adapted to the Hologram OS warm palette.
 *
 * Designed to be instantly intuitive for anyone who has ever used
 * a system monitor on any platform.
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

// ─── Design Tokens ──────────────────────────────────────────────────────

const DT = {
  // Afterburner-inspired palette layered onto Hologram warmth
  panelBg: "hsla(220, 12%, 7%, 0.97)",
  panelBorder: "hsla(200, 15%, 25%, 0.35)",
  sectionBg: "hsla(210, 10%, 10%, 0.7)",
  sectionBorder: "hsla(200, 12%, 30%, 0.2)",
  insetBg: "hsla(210, 12%, 6%, 0.8)",
  insetBorder: "hsla(200, 10%, 22%, 0.25)",
  // Accents
  cyan: "hsl(185, 70%, 50%)",
  cyanDim: "hsl(185, 40%, 30%)",
  cyanGlow: "hsla(185, 70%, 50%, 0.15)",
  gold: "hsl(38, 60%, 55%)",
  goldDim: "hsl(38, 30%, 35%)",
  green: "hsl(152, 55%, 50%)",
  red: "hsl(0, 60%, 55%)",
  purple: "hsl(270, 50%, 60%)",
  // Text
  textBright: "hsl(200, 15%, 90%)",
  textLabel: "hsl(200, 8%, 55%)",
  textDim: "hsl(210, 6%, 35%)",
  textValue: "hsl(185, 60%, 75%)",
  // Font
  mono: "'DM Sans', 'SF Mono', 'Consolas', monospace",
  font: "'DM Sans', system-ui, sans-serif",
} as const;

// ─── Sparkline History ──────────────────────────────────────────────────

function useHistory(value: number, maxLen = 60) {
  const ref = useRef<number[]>([]);
  ref.current.push(value);
  if (ref.current.length > maxLen) ref.current.shift();
  return ref.current;
}

// ─── Shared Sub-components — Afterburner Style ──────────────────────────

/** Segmented bar graph like MSI Afterburner's frequency/temp bars */
function SegmentedBar({
  value,
  max,
  segments = 20,
  color,
  label,
  unit,
  showValue = true,
}: {
  value: number;
  max: number;
  segments?: number;
  color: string;
  label: string;
  unit: string;
  showValue?: boolean;
}) {
  const filled = Math.round((value / Math.max(max, 1)) * segments);
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-[10px] uppercase tracking-[0.15em] w-14 shrink-0 text-right" style={{ color: DT.textLabel, fontFamily: DT.mono }}>
        {label}
      </span>
      <div className="flex gap-[2px] flex-1">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className="h-3 flex-1 rounded-[1px] transition-all duration-150"
            style={{
              background: i < filled ? color : "hsla(210, 8%, 18%, 0.5)",
              boxShadow: i < filled ? `0 0 4px ${color}40` : "none",
              opacity: i < filled ? (0.5 + (i / segments) * 0.5) : 0.3,
            }}
          />
        ))}
      </div>
      {showValue && (
        <div className="flex items-baseline gap-1 min-w-[72px] justify-end">
          <span className="text-lg font-bold tabular-nums" style={{ color: DT.textBright, fontFamily: DT.mono }}>
            {typeof value === "number" ? (value >= 1000 ? Math.round(value).toLocaleString() : value.toFixed(value < 10 ? 1 : 0)) : value}
          </span>
          <span className="text-[9px] uppercase" style={{ color: DT.textDim }}>{unit}</span>
        </div>
      )}
    </div>
  );
}

/** Large readout with label — like MSI's primary readings */
function Readout({
  label,
  value,
  unit,
  color = DT.textBright,
  size = "lg",
  sub,
}: {
  label: string;
  value: string | number;
  unit: string;
  color?: string;
  size?: "sm" | "lg";
  sub?: string;
}) {
  return (
    <div className="text-center">
      <div className="text-[9px] uppercase tracking-[0.2em] mb-1" style={{ color: DT.textDim, fontFamily: DT.mono }}>
        {label}
      </div>
      <div className="flex items-baseline justify-center gap-1">
        <span
          className={`font-bold tabular-nums ${size === "lg" ? "text-2xl" : "text-lg"}`}
          style={{ color, fontFamily: DT.mono }}
        >
          {value}
        </span>
        <span className="text-[10px] uppercase" style={{ color: DT.textDim }}>{unit}</span>
      </div>
      {sub && <div className="text-[9px] mt-0.5" style={{ color: DT.textDim }}>{sub}</div>}
    </div>
  );
}

/** Inset panel with beveled look */
function InsetPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-lg p-3 ${className}`}
      style={{
        background: DT.insetBg,
        border: `1px solid ${DT.insetBorder}`,
        boxShadow: `inset 0 1px 3px hsla(210, 15%, 0%, 0.4), 0 1px 0 hsla(200, 10%, 30%, 0.06)`,
      }}
    >
      {children}
    </div>
  );
}

/** Section with header — like Afterburner's VOLTAGE / CLOCK / FAN tabs */
function Section({ icon, title, children }: { icon?: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        {icon && <span style={{ color: DT.cyan }}>{icon}</span>}
        <span className="text-[10px] uppercase tracking-[0.2em] font-semibold" style={{ color: DT.cyan, fontFamily: DT.mono }}>
          {title}
        </span>
        <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${DT.cyanDim}, transparent)` }} />
      </div>
      {children}
    </div>
  );
}

function MetricRow({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="flex justify-between items-center py-[3px]">
      <span className="text-[11px]" style={{ color: DT.textLabel, fontFamily: DT.mono }}>{label}</span>
      <span className="text-[11px] font-medium tabular-nums" style={{ color: accent ?? DT.textBright, fontFamily: DT.mono }}>
        {value}
      </span>
    </div>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
      style={{
        background: active ? DT.green : DT.textDim,
        boxShadow: active ? `0 0 6px ${DT.green}60` : "none",
      }}
    />
  );
}

/** Sparkline with gradient fill */
function Sparkline({ data, color, height = 48, label }: { data: number[]; color: string; height?: number; label?: string }) {
  const max = Math.max(...data, 1);
  const w = 320;
  const points = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * w;
    const y = height - (v / max) * (height - 4);
    return `${x},${y}`;
  }).join(" ");

  const fillPoints = `0,${height} ${points} ${w},${height}`;
  const gradId = `sg-${color.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <div className="relative" style={{ width: "100%", height }}>
      <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="overflow-visible">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <polygon points={fillPoints} fill={`url(#${gradId})`} />
        <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} />
        {/* Latest value dot */}
        {data.length > 0 && (() => {
          const lastX = w;
          const lastY = height - (data[data.length - 1] / max) * (height - 4);
          return <circle cx={lastX} cy={lastY} r={2.5} fill={color} style={{ filter: `drop-shadow(0 0 3px ${color})` }} />;
        })()}
      </svg>
      {label && (
        <span className="absolute top-0 right-1 text-[8px] tracking-wider uppercase" style={{ color: DT.textDim, fontFamily: DT.mono }}>
          {label}
        </span>
      )}
    </div>
  );
}

/** Horizontal slider-style gauge */
function SliderGauge({ value, max, color, label, displayValue }: { value: number; max: number; color: string; label: string; displayValue: string }) {
  const pct = Math.min(100, (value / Math.max(max, 1)) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]" style={{ fontFamily: DT.mono }}>
        <span style={{ color: DT.textLabel }}>{label}</span>
        <span className="tabular-nums" style={{ color: DT.textBright }}>{displayValue}</span>
      </div>
      <div className="h-[6px] rounded-full overflow-hidden relative" style={{ background: "hsla(210, 8%, 15%, 0.8)", boxShadow: "inset 0 1px 2px hsla(0,0%,0%,0.4)" }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}90, ${color})`,
            boxShadow: `0 0 8px ${color}40`,
          }}
        />
        {/* Thumb dot */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 transition-all duration-300"
          style={{
            left: `calc(${pct}% - 5px)`,
            background: DT.panelBg,
            borderColor: color,
            boxShadow: `0 0 6px ${color}60`,
          }}
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
      <div
        className="grid grid-cols-[1fr_70px_60px_60px_60px] gap-2 text-[9px] uppercase tracking-[0.15em] pb-2"
        style={{ color: DT.textDim, borderBottom: `1px solid ${DT.sectionBorder}`, fontFamily: DT.mono }}
      >
        <span>Process</span>
        <span className="text-right">Status</span>
        <span className="text-right">H-Score</span>
        <span className="text-right">CPU</span>
        <span className="text-right">Sub</span>
      </div>

      {/* Process rows */}
      {processes.map((p) => {
        const zoneColor = p.zone === "convergent" ? DT.green : p.zone === "exploring" ? DT.gold : DT.red;
        return (
          <div
            key={p.pid}
            className="grid grid-cols-[1fr_70px_60px_60px_60px] gap-2 items-center text-[11px] py-1 rounded px-2 transition-colors"
            style={{ fontFamily: DT.mono }}
            onMouseEnter={e => (e.currentTarget.style.background = "hsla(185, 10%, 15%, 0.3)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <span className="flex items-center gap-1.5" style={{ color: DT.textBright }}>
              <StatusDot active={p.state === "running"} />
              <span className="truncate">{p.name}</span>
              <span className="text-[8px]" style={{ color: DT.textDim }}>#{p.pid}</span>
            </span>
            <span className="text-right capitalize" style={{ color: zoneColor }}>
              {p.zone === "convergent" ? "Stable" : p.zone === "exploring" ? "Active" : "Unstable"}
            </span>
            <span className="text-right tabular-nums" style={{ color: DT.textLabel }}>
              {(p.hScore * 100).toFixed(0)}%
            </span>
            <span className="text-right tabular-nums" style={{ color: DT.textLabel }}>
              {p.cpuMs.toFixed(0)}ms
            </span>
            <span className="text-right tabular-nums" style={{ color: DT.textLabel }}>
              {p.childCount}
            </span>
          </div>
        );
      })}

      {processes.length === 0 && (
        <div className="text-center py-8 text-sm" style={{ color: DT.textDim }}>No active processes</div>
      )}

      {/* Summary bar */}
      <InsetPanel>
        <div className="flex gap-6 text-[10px]" style={{ color: DT.textLabel, fontFamily: DT.mono }}>
          <span>Processes: <strong style={{ color: DT.cyan }}>{processes.length}</strong></span>
          <span>Listeners: <strong style={{ color: DT.cyan }}>{stats.listenerCount}</strong></span>
          <span>Frame rate: <strong style={{ color: DT.cyan }}>{stats.tickRateHz} Hz</strong></span>
        </div>
      </InsetPanel>
    </div>
  );
}

function PerformanceTab({ stats }: { stats: Stats }) {
  const fpsHistory = useHistory(stats.measuredFps);
  const tickRateHistory = useHistory(stats.kernelTickRateHz);
  const renderHistory = useHistory(stats.renderCount);

  const fpsHealth = stats.measuredFps >= stats.displayRefreshHz * 0.9 ? "excellent"
    : stats.measuredFps >= 30 ? "good"
    : stats.measuredFps >= 15 ? "degraded" : "poor";
  const fpsColor = fpsHealth === "excellent" ? DT.green : fpsHealth === "good" ? DT.gold : DT.red;

  return (
    <div className="space-y-4">
      {/* ── Top readout bar — like Afterburner's GPU/MEM/VOLT/TEMP ─── */}
      <InsetPanel>
        <SegmentedBar value={stats.measuredFps} max={stats.displayRefreshHz} segments={24} color={fpsColor} label="FPS" unit="fps" />
        <SegmentedBar value={stats.kernelTickRateHz} max={stats.displayRefreshHz} segments={24} color={DT.purple} label="TICK" unit="Hz" />
        <SegmentedBar value={stats.renderCount} max={200} segments={24} color={DT.gold} label="RNDR" unit="/s" />
        <SegmentedBar value={stats.frameDrops} max={10} segments={24} color={stats.frameDrops > 0 ? DT.red : DT.green} label="DROP" unit="frames" />
      </InsetPanel>

      {/* ── Live sparklines ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <InsetPanel>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-[9px] uppercase tracking-[0.15em]" style={{ color: DT.textDim, fontFamily: DT.mono }}>Frame Rate</span>
            <span className="text-sm tabular-nums font-bold" style={{ color: fpsColor, fontFamily: DT.mono }}>
              {stats.measuredFps.toFixed(0)}
            </span>
          </div>
          <Sparkline data={fpsHistory} color={fpsColor} height={40} />
        </InsetPanel>
        <InsetPanel>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-[9px] uppercase tracking-[0.15em]" style={{ color: DT.textDim, fontFamily: DT.mono }}>Kernel Tick</span>
            <span className="text-sm tabular-nums font-bold" style={{ color: DT.purple, fontFamily: DT.mono }}>
              {stats.kernelTickRateHz}Hz
            </span>
          </div>
          <Sparkline data={tickRateHistory} color={DT.purple} height={40} />
        </InsetPanel>
      </div>

      {/* ── Gauges row ───────────────────────────────────────────── */}
      <InsetPanel>
        <Section title="System Gauges">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <SliderGauge value={stats.measuredFps} max={stats.displayRefreshHz} color={fpsColor} label="FPS Load" displayValue={`${((stats.measuredFps / stats.displayRefreshHz) * 100).toFixed(0)}%`} />
            <SliderGauge value={stats.interpPhase * 100} max={100} color={DT.cyan} label="Interp Phase" displayValue={`${(stats.interpPhase * 100).toFixed(0)}%`} />
            <SliderGauge value={stats.renderCount} max={200} color={DT.gold} label="Render Load" displayValue={`${stats.renderCount}/s`} />
            <SliderGauge value={stats.lastFrameAge} max={100} color={stats.lastFrameAge > 50 ? DT.gold : DT.green} label="Frame Age" displayValue={`${stats.lastFrameAge.toFixed(0)}ms`} />
          </div>
        </Section>
      </InsetPanel>

      {/* ── Detail grid ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 px-1">
        <MetricRow label="Display refresh" value={`${stats.displayRefreshHz} Hz`} accent={DT.cyan} />
        <MetricRow label="Pixel density" value={`${stats.displayDpr.toFixed(1)}x`} />
        <MetricRow label="Quality tier" value={stats.displayQuality === "ultra" ? "Ultra" : stats.displayQuality === "standard" ? "Standard" : "Basic"} accent={stats.displayQuality === "ultra" ? DT.green : DT.gold} />
        <MetricRow label="GPU tier" value={stats.displayGpuTier === "high" ? "High" : stats.displayGpuTier === "mid" ? "Medium" : "Basic"} accent={stats.displayGpuTier === "high" ? DT.green : DT.gold} />
        <MetricRow label="Smoothing" value={stats.interpSleeping ? "Sleeping" : stats.interpHasPrev ? "Blending" : "Instant"} accent={stats.interpSleeping ? DT.textDim : DT.green} />
        <MetricRow label="Frame drops" value={stats.frameDrops} accent={stats.frameDrops === 0 ? DT.green : DT.red} />
      </div>
    </div>
  );
}

function SystemTab({ stats }: { stats: Stats }) {
  const projector = getKernelProjector();
  const frame = projector.projectFrame();

  return (
    <div className="space-y-4">
      {/* Top readout cards */}
      <div className="grid grid-cols-3 gap-3">
        <InsetPanel className="text-center">
          <Readout label="Engine" value={stats.isActive ? "ON" : "IDLE"} unit="" color={stats.isActive ? DT.green : DT.textDim} size="sm" sub={`${stats.tickCount.toLocaleString()} frames`} />
        </InsetPanel>
        <InsetPanel className="text-center">
          <Readout label="Coherence" value={`${(frame.systemCoherence.meanH * 100).toFixed(0)}`} unit="%" color={frame.systemCoherence.zone === "convergent" ? DT.green : DT.gold} size="sm" sub={frame.systemCoherence.zone === "convergent" ? "Stable" : "Adapting"} />
        </InsetPanel>
        <InsetPanel className="text-center">
          <Readout label="Focus" value={`${(frame.attention.aperture * 100).toFixed(0)}`} unit="%" color={DT.purple} size="sm" sub={frame.attention.preset === "focus" ? "Deep focus" : "Relaxed"} />
        </InsetPanel>
      </div>

      {/* Rhythm */}
      <InsetPanel>
        <Section title="Your Rhythm">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <MetricRow label="Breathing pace" value={`${(stats.breathPeriodMs / 1000).toFixed(1)}s`} accent={DT.purple} />
            <MetricRow label="Interactions" value={stats.breathEventCount.toLocaleString()} />
            <MetricRow label="Rhythm samples" value={`${stats.breathIntervalCount} / 20`} />
            {stats.breathDwellMs > 0 && (
              <MetricRow label="Idle time" value={`${(stats.breathDwellMs / 1000).toFixed(1)}s`} accent={stats.breathDwellMs > 5000 ? DT.gold : DT.textLabel} />
            )}
          </div>
        </Section>
      </InsetPanel>

      {/* Display */}
      <InsetPanel>
        <Section title="Display">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <MetricRow label="Refresh rate" value={`${stats.displayRefreshHz} Hz`} accent={DT.cyan} />
            <MetricRow label="Pixel density" value={`${stats.displayDpr.toFixed(1)}x`} />
            <MetricRow label="Graphics quality" value={stats.displayGpuTier === "high" ? "High" : stats.displayGpuTier === "mid" ? "Medium" : "Basic"} />
            <MetricRow label="Text scale" value={`${(frame.typography.userScale * 100).toFixed(0)}%`} />
          </div>
        </Section>
      </InsetPanel>
    </div>
  );
}

function DetailsTab({ stats }: { stats: Stats }) {
  return (
    <div className="space-y-4">
      <InsetPanel>
        <Section title="Rendering Engine">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <MetricRow label="Engine" value={stats.streamRunning ? "Running" : "Stopped"} accent={stats.streamRunning ? DT.green : DT.red} />
            <MetricRow label="Tick rate" value={`${stats.tickRateHz} Hz`} accent={DT.cyan} />
            <MetricRow label="Total frames" value={stats.tickCount.toLocaleString()} />
            <MetricRow label="Pending" value={stats.dirty ? "Yes" : "None"} accent={stats.dirty ? DT.gold : DT.textLabel} />
            <MetricRow label="Listeners" value={stats.listenerCount} />
            {stats.isActive && <MetricRow label="Active for" value={`${(stats.activeUntil / 1000).toFixed(1)}s`} accent={DT.green} />}
          </div>
        </Section>
      </InsetPanel>

      <InsetPanel>
        <Section title="Smoothing Pipeline">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <MetricRow label="State" value={stats.interpSleeping ? "Sleeping" : stats.interpRunning ? "Running" : "Off"} accent={stats.interpSleeping ? DT.gold : stats.interpRunning ? DT.green : DT.textDim} />
            <MetricRow label="Interval" value={`${stats.interpTickMs.toFixed(0)} ms`} />
            <MetricRow label="Progress" value={`${(stats.interpPhase * 100).toFixed(0)}%`} />
            <MetricRow label="Mode" value={stats.interpHasPrev ? "Blend" : "Snap"} accent={stats.interpHasPrev ? DT.green : DT.gold} />
          </div>
        </Section>
      </InsetPanel>

      <InsetPanel>
        <Section title="Measured Performance">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <MetricRow label="FPS" value={`${stats.measuredFps.toFixed(1)}`} accent={stats.measuredFps > 15 ? DT.green : DT.gold} />
            <MetricRow label="Frame age" value={`${stats.lastFrameAge.toFixed(0)} ms`} accent={stats.lastFrameAge > 150 ? DT.gold : DT.textLabel} />
          </div>
        </Section>
      </InsetPanel>
    </div>
  );
}

// ─── Processor Comparison Tab ───────────────────────────────────────────

const DELTA_0_DEG = 6.8;
const DELTA_0_RAD = DELTA_0_DEG * (Math.PI / 180);
const GEOMETRIC_TICK_PERIOD_MS = DELTA_0_RAD * 1000;
const FRACTAL_DIM = 1.9206;
const CRONNET_SCALE_EV = 1.22e-3;

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
      const ITERATIONS = 2_000_000;
      const t0 = performance.now();
      let acc = 0;
      for (let i = 0; i < ITERATIONS; i++) {
        acc += Math.sin(i * 0.001) * Math.cos(i * 0.002);
      }
      const elapsed = performance.now() - t0;
      if (acc === Infinity) console.log(acc);
      const mops = (ITERATIONS / elapsed) * 1000 / 1_000_000;
      samplesRef.current.push(mops);
      if (samplesRef.current.length > 20) samplesRef.current.shift();
      const avgMops = samplesRef.current.reduce((a, b) => a + b, 0) / samplesRef.current.length;
      const estimatedCyclesPerOp = 4;
      const totalOps = ITERATIONS * 5;
      const cyclesUsed = totalOps / estimatedCyclesPerOp;
      const estimatedHz = cyclesUsed / (elapsed / 1000);
      const estimatedMhz = estimatedHz / 1_000_000;
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
    intervalRef.current = setInterval(benchmark, 3000);
    return () => clearInterval(intervalRef.current);
  }, [visible]);

  return result;
}

function useGeometricTime() {
  const [time, setTime] = useState({
    geometricTick: 0,
    geometricPhase: 0,
    triadicCycle: 0,
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
      const geometricTick = Math.floor(elapsed / GEOMETRIC_TICK_PERIOD_MS);
      const phaseWithin = (elapsed % GEOMETRIC_TICK_PERIOD_MS) / GEOMETRIC_TICK_PERIOD_MS;
      const triadicIndex = geometricTick % 3;
      const triadicLabels = ["Structure", "Evolution", "Completion"] as const;
      const triadicCycle = Math.floor(geometricTick / 3);
      const dtMs = now - lastMeasureRef.current;
      lastMeasureRef.current = now;
      const expectedTicks = dtMs / GEOMETRIC_TICK_PERIOD_MS;
      const actualTicks = Math.round(expectedTicks);
      const driftUs = Math.abs((dtMs - actualTicks * GEOMETRIC_TICK_PERIOD_MS)) * 1000;
      setTime({
        geometricTick,
        geometricPhase: phaseWithin,
        triadicCycle,
        triadicLabel: triadicLabels[triadicIndex],
        precisionNs: Math.round(GEOMETRIC_TICK_PERIOD_MS * 1_000_000),
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

function ProcessorTab({ stats }: { stats: Stats }) {
  const bench = useClockBenchmark(true);
  const geoTime = useGeometricTime();
  const hw = useHardwareInfo(true);
  const projector = getKernelProjector();
  const dc = projector.getDisplayCapabilities();

  const vgpuOpsPerTick = Math.round(stats.kernelTickRateHz * FRACTAL_DIM);
  const vgpuEffectiveMhz = Math.round(vgpuOpsPerTick * stats.kernelTickRateHz / 1000);
  const systemPrecisionUs = 5;
  const geometricPrecisionUs = Math.round(GEOMETRIC_TICK_PERIOD_MS * 1000);

  const mopsHistory = useHistory(bench?.mopsPerSec ?? 0);
  const vgpuHistory = useHistory(vgpuEffectiveMhz);

  if (!bench || !hw) {
    return <div className="text-center py-8 text-sm" style={{ color: DT.textDim, fontFamily: DT.mono }}>Calibrating processor…</div>;
  }

  return (
    <div className="space-y-4">
      {/* ── Top readout bar — Afterburner-style ──────────────────── */}
      <InsetPanel>
        <SegmentedBar value={bench.estimatedMhz} max={5000} segments={28} color="hsl(200, 50%, 60%)" label="CPU" unit="MHz" />
        <SegmentedBar value={vgpuEffectiveMhz} max={5000} segments={28} color={DT.cyan} label="vGPU" unit="MHz" />
        <SegmentedBar value={bench.mopsPerSec} max={100} segments={28} color={DT.gold} label="MOPS" unit="M/s" />
        <SegmentedBar value={geoTime.driftUs} max={2000} segments={28} color={geoTime.driftUs < 500 ? DT.green : DT.gold} label="DRIFT" unit="μs" />
      </InsetPanel>

      {/* ── Side-by-side comparison ──────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Hardware side */}
        <InsetPanel>
          <div className="text-[9px] uppercase tracking-[0.2em] text-center mb-3" style={{ color: "hsl(200, 40%, 55%)", fontFamily: DT.mono }}>
            ⬡ Hardware
          </div>
          <div className="space-y-3">
            <Readout label="Clock Speed" value={bench.estimatedMhz.toLocaleString()} unit="MHz" color="hsl(200, 50%, 75%)" />
            <Readout label="Throughput" value={bench.mopsPerSec.toFixed(1)} unit="MOPS" color="hsl(200, 40%, 65%)" size="sm" />
            <Readout label="Time Precision" value={systemPrecisionUs.toString()} unit="μs" color="hsl(200, 30%, 60%)" size="sm" />
          </div>
          <div className="mt-3">
            <Sparkline data={mopsHistory} color="hsl(200, 50%, 60%)" height={32} label="MOPS" />
          </div>
        </InsetPanel>

        {/* Hologram side */}
        <InsetPanel>
          <div className="text-[9px] uppercase tracking-[0.2em] text-center mb-3" style={{ color: DT.cyan, fontFamily: DT.mono }}>
            ◈ Hologram vGPU
          </div>
          <div className="space-y-3">
            <Readout label="Effective Clock" value={vgpuEffectiveMhz.toLocaleString()} unit="MHz" color={DT.cyan} />
            <Readout label="Throughput" value={(stats.kernelTickRateHz * FRACTAL_DIM).toFixed(1)} unit="MOPS" color={DT.gold} size="sm" />
            <Readout label="δ₀ Quantum" value={geometricPrecisionUs.toString()} unit="μs" color={DT.purple} size="sm" />
          </div>
          <div className="mt-3">
            <Sparkline data={vgpuHistory} color={DT.cyan} height={32} label="MHz" />
          </div>
        </InsetPanel>
      </div>

      {/* ── Geometric Time Section ───────────────────────────────── */}
      <InsetPanel>
        <Section title="Geometric Time">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="text-center">
              <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: DT.textDim, fontFamily: DT.mono }}>Tick</div>
              <div className="text-lg font-bold tabular-nums" style={{ color: DT.purple, fontFamily: DT.mono }}>
                {geoTime.geometricTick.toLocaleString()}
              </div>
            </div>
            <div className="text-center">
              <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: DT.textDim, fontFamily: DT.mono }}>Phase</div>
              <div className="text-sm font-semibold" style={{
                color: geoTime.triadicLabel === "Structure" ? "hsl(200, 50%, 65%)" : geoTime.triadicLabel === "Evolution" ? DT.gold : DT.green,
                fontFamily: DT.mono,
              }}>
                {geoTime.triadicLabel}
              </div>
              <div className="text-[8px] mt-0.5" style={{ color: DT.textDim }}>Cycle #{geoTime.triadicCycle}</div>
            </div>
            <div className="text-center">
              <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: DT.textDim, fontFamily: DT.mono }}>Drift</div>
              <div className="text-lg font-bold tabular-nums" style={{ color: geoTime.driftUs < 500 ? DT.green : DT.gold, fontFamily: DT.mono }}>
                {geoTime.driftUs}
              </div>
              <div className="text-[8px] mt-0.5" style={{ color: DT.textDim }}>μs</div>
            </div>
          </div>

          {/* Phase progress */}
          <SliderGauge
            value={geoTime.geometricPhase * 100}
            max={100}
            color={DT.purple}
            label="Phase within tick"
            displayValue={`${(geoTime.geometricPhase * 100).toFixed(1)}%`}
          />
        </Section>
      </InsetPanel>

      {/* ── Detail grid ──────────────────────────────────────────── */}
      <InsetPanel>
        <Section title="Processor Details">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <MetricRow label="Logical cores" value={hw.logicalCores} accent={DT.cyan} />
            <MetricRow label="Kernel tick rate" value={`${stats.kernelTickRateHz} Hz`} accent={DT.purple} />
            <MetricRow label="Hardware GPU" value={hw.gpuRenderer.split("/").pop()?.trim() || hw.gpuRenderer} />
            <MetricRow label="vGPU tier" value={dc.gpuTier === "high" ? "High" : dc.gpuTier === "mid" ? "Medium" : "Basic"} accent={dc.gpuTier === "high" ? DT.green : DT.gold} />
            <MetricRow label="Benchmark jitter" value={`±${bench.jitterUs} MOPS`} accent={bench.jitterUs < 50 ? DT.green : DT.gold} />
            <MetricRow label="Fractal dim (D)" value={FRACTAL_DIM.toFixed(4)} accent={DT.purple} />
            <MetricRow label="δ₀ angular defect" value={`${DELTA_0_DEG}°`} accent={DT.purple} />
            <MetricRow label="Tick quantum" value={`${GEOMETRIC_TICK_PERIOD_MS.toFixed(2)} ms`} accent={DT.purple} />
          </div>
        </Section>
      </InsetPanel>
    </div>
  );
}

// ─── Hardware Tab ───────────────────────────────────────────────────────

interface HardwareInfo {
  platform: string;
  userAgent: string;
  language: string;
  cookiesEnabled: boolean;
  onLine: boolean;
  logicalCores: number;
  deviceMemoryGb: number | null;
  jsHeapUsedMb: number | null;
  jsHeapTotalMb: number | null;
  jsHeapLimitMb: number | null;
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
  gpuRenderer: string;
  gpuVendor: string;
  gpuTier: string;
  storageEstimate: { usage: number; quota: number } | null;
  connectionType: string | null;
  downlinkMbps: number | null;
  rtt: number | null;
  saveData: boolean;
  batteryLevel: number | null;
  batteryCharging: boolean | null;
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
      let colorGamut = "sRGB";
      if (window.matchMedia("(color-gamut: p3)").matches) colorGamut = "Display P3";
      else if (window.matchMedia("(color-gamut: rec2020)").matches) colorGamut = "Rec. 2020";
      const hdr = window.matchMedia("(dynamic-range: high)").matches;
      let storageEstimate: { usage: number; quota: number } | null = null;
      try { if (nav.storage?.estimate) { const est = await nav.storage.estimate(); storageEstimate = { usage: est.usage || 0, quota: est.quota || 0 }; } } catch {}
      const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
      let batteryLevel: number | null = null;
      let batteryCharging: boolean | null = null;
      try { if (nav.getBattery) { const batt = await nav.getBattery(); batteryLevel = batt.level; batteryCharging = batt.charging; } } catch {}
      let audioOutputs = 0;
      let videoInputs = 0;
      try { if (nav.mediaDevices?.enumerateDevices) { const devices = await nav.mediaDevices.enumerateDevices(); audioOutputs = devices.filter((d: any) => d.kind === "audiooutput").length; videoInputs = devices.filter((d: any) => d.kind === "videoinput").length; } } catch {}
      const perfMem = (performance as any).memory;
      const orientation = screen.orientation?.type?.replace("-primary", "").replace("-secondary", " (flipped)") || "unknown";
      const dc = getKernelProjector().getDisplayCapabilities() || { refreshHz: 60, dpr: window.devicePixelRatio, gpuTier: "unknown" };
      let platform = nav.userAgentData?.platform || nav.platform || "Unknown";
      if (nav.userAgentData?.brands) { const brand = nav.userAgentData.brands.find((b: any) => !b.brand.includes("Not")); if (brand) platform += ` · ${brand.brand} ${brand.version}`; }
      setInfo({
        platform, userAgent: nav.userAgent || "", language: nav.language || "en",
        cookiesEnabled: nav.cookieEnabled ?? true, onLine: nav.onLine ?? true,
        logicalCores: nav.hardwareConcurrency || 1,
        deviceMemoryGb: nav.deviceMemory ?? null,
        jsHeapUsedMb: perfMem ? perfMem.usedJSHeapSize / (1024 * 1024) : null,
        jsHeapTotalMb: perfMem ? perfMem.totalJSHeapSize / (1024 * 1024) : null,
        jsHeapLimitMb: perfMem ? perfMem.jsHeapSizeLimit / (1024 * 1024) : null,
        screenWidth: screen.width, screenHeight: screen.height,
        viewportWidth: window.innerWidth, viewportHeight: window.innerHeight,
        dpr: dc.dpr, colorDepth: screen.colorDepth, colorGamut, hdr,
        refreshHz: dc.refreshHz, orientation,
        touchPoints: nav.maxTouchPoints || 0,
        gpuRenderer, gpuVendor, gpuTier: dc.gpuTier,
        storageEstimate,
        connectionType: conn?.effectiveType ?? null,
        downlinkMbps: conn?.downlink ?? null,
        rtt: conn?.rtt ?? null,
        saveData: conn?.saveData ?? false,
        batteryLevel, batteryCharging, audioOutputs, videoInputs,
      });
    };
    detect();
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
  if (!hw) return <div className="text-center py-8 text-sm" style={{ color: DT.textDim, fontFamily: DT.mono }}>Detecting hardware…</div>;

  return (
    <div className="space-y-4">
      {/* ── Top readout bar ──────────────────────────────────────── */}
      <InsetPanel>
        <SegmentedBar value={hw.logicalCores} max={32} segments={16} color={DT.cyan} label="CPU" unit="cores" />
        <SegmentedBar value={hw.deviceMemoryGb ?? 0} max={64} segments={16} color={DT.gold} label="MEM" unit="GB" />
        <SegmentedBar value={hw.refreshHz} max={240} segments={16} color={DT.purple} label="DISP" unit="Hz" />
        {hw.batteryLevel !== null && (
          <SegmentedBar value={hw.batteryLevel * 100} max={100} segments={16} color={hw.batteryLevel > 0.2 ? DT.green : DT.red} label="BATT" unit="%" />
        )}
      </InsetPanel>

      {/* GPU card */}
      <InsetPanel>
        <Section title="Graphics Processor">
          <div className="text-[11px] break-all leading-relaxed mb-1" style={{ color: DT.textBright, fontFamily: DT.mono }}>{hw.gpuRenderer}</div>
          <div className="text-[10px] mb-2" style={{ color: DT.textLabel, fontFamily: DT.mono }}>{hw.gpuVendor}</div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-[8px] uppercase tracking-wider" style={{ color: DT.textDim }}>Tier</div>
              <div className="text-sm font-bold" style={{ color: hw.gpuTier === "high" ? DT.green : hw.gpuTier === "mid" ? DT.gold : DT.textDim, fontFamily: DT.mono }}>
                {hw.gpuTier === "high" ? "HIGH" : hw.gpuTier === "mid" ? "MED" : "BASIC"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-[8px] uppercase tracking-wider" style={{ color: DT.textDim }}>Color</div>
              <div className="text-sm font-bold" style={{ color: DT.textBright, fontFamily: DT.mono }}>{hw.colorGamut === "Display P3" ? "P3" : hw.colorGamut === "Rec. 2020" ? "2020" : "sRGB"}</div>
            </div>
            <div className="text-center">
              <div className="text-[8px] uppercase tracking-wider" style={{ color: DT.textDim }}>HDR</div>
              <div className="text-sm font-bold" style={{ color: hw.hdr ? DT.green : DT.textDim, fontFamily: DT.mono }}>{hw.hdr ? "ON" : "OFF"}</div>
            </div>
          </div>
        </Section>
      </InsetPanel>

      {/* Memory gauges */}
      {hw.jsHeapUsedMb !== null && (
        <InsetPanel>
          <Section title="Memory">
            <SliderGauge value={hw.jsHeapUsedMb} max={hw.jsHeapLimitMb || 4096} color={DT.gold} label="JS Heap" displayValue={`${hw.jsHeapUsedMb.toFixed(0)} / ${hw.jsHeapLimitMb?.toFixed(0)} MB`} />
            {hw.storageEstimate && (
              <div className="mt-2">
                <SliderGauge value={hw.storageEstimate.usage} max={hw.storageEstimate.quota} color="hsl(200, 50%, 55%)" label="Storage" displayValue={`${formatBytes(hw.storageEstimate.usage)}`} />
              </div>
            )}
          </Section>
        </InsetPanel>
      )}

      {/* Display & Network */}
      <div className="grid grid-cols-2 gap-3">
        <InsetPanel>
          <Section title="Display">
            <div className="space-y-1">
              <MetricRow label="Resolution" value={`${hw.screenWidth}×${hw.screenHeight}`} />
              <MetricRow label="Viewport" value={`${hw.viewportWidth}×${hw.viewportHeight}`} />
              <MetricRow label="DPR" value={`${hw.dpr.toFixed(1)}x`} accent={DT.cyan} />
              <MetricRow label="Color depth" value={`${hw.colorDepth}-bit`} />
              <MetricRow label="Touch" value={hw.touchPoints > 0 ? `${hw.touchPoints}pt` : "No"} />
            </div>
          </Section>
        </InsetPanel>
        <InsetPanel>
          <Section title="Network">
            <div className="space-y-1">
              <MetricRow label="Status" value={hw.onLine ? "Online" : "Offline"} accent={hw.onLine ? DT.green : DT.red} />
              {hw.connectionType && <MetricRow label="Type" value={hw.connectionType.toUpperCase()} accent={DT.cyan} />}
              {hw.downlinkMbps !== null && <MetricRow label="Speed" value={`${hw.downlinkMbps} Mbps`} accent={hw.downlinkMbps >= 10 ? DT.green : DT.gold} />}
              {hw.rtt !== null && <MetricRow label="Latency" value={`${hw.rtt}ms`} accent={hw.rtt <= 50 ? DT.green : DT.gold} />}
            </div>
          </Section>
        </InsetPanel>
      </div>

      {/* Platform */}
      <InsetPanel>
        <div className="text-[10px] break-all leading-relaxed" style={{ color: DT.textDim, fontFamily: DT.mono }}>
          {hw.platform} · {hw.language}
        </div>
      </InsetPanel>
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
    const unsub = projector.onFrame(() => { renderCountRef.current++; });

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
      const measuredFps = fpsAccumRef.current.length > 0
        ? fpsAccumRef.current.reduce((a, b) => a + b, 0) / fpsAccumRef.current.length : 0;
      const br = projector.getBreathingRhythm();
      const dc = projector.getDisplayCapabilities();
      const renderWindowDt = now - renderWindowRef.current;
      const rendersPerSec = renderWindowDt > 0 ? Math.round(renderCountRef.current / (renderWindowDt / 1000)) : 0;
      if (renderWindowDt > 2000) { renderCountRef.current = 0; renderWindowRef.current = now; }
      const tickDelta = ps.tickCount - lastTickCountRef.current;
      lastTickCountRef.current = ps.tickCount;
      const kernelTickRateHz = dt > 0 ? Math.round(tickDelta / (dt / 1000)) : 0;
      const expectedFrames = dt > 0 ? Math.round(dc.refreshHz * (dt / 1000)) : 0;
      if (ps.isActive && tickDelta < expectedFrames * 0.5 && expectedFrames > 1) { frameDropRef.current++; }
      setStats({
        ...ps,
        interpRunning: is.running, interpSleeping: is.sleeping,
        interpTickMs: is.tickMs, interpPhase: is.phase, interpHasPrev: is.hasPrev,
        measuredFps,
        displayRefreshHz: dc.refreshHz, displayDpr: dc.dpr,
        displayGpuTier: dc.gpuTier, displayQuality: dc.quality,
        breathPeriodMs: br.breathPeriodMs, breathEventCount: br.eventCount,
        breathIntervalCount: br.intervals.length, breathDwellMs: br.dwellMs,
        renderCount: rendersPerSec, kernelTickRateHz, frameDrops: frameDropRef.current,
      });
    };
    const id = setInterval(poll, 50);
    poll();
    return () => { unsub(); clearInterval(id); };
  }, [visible]);

  if (!visible || !stats) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center"
      style={{ background: "hsla(215, 15%, 3%, 0.75)", backdropFilter: "blur(12px)" }}
    >
      {/* Window — Afterburner-style frame */}
      <div
        className="w-full max-w-[720px] rounded-xl overflow-hidden select-none"
        style={{
          background: DT.panelBg,
          border: `1px solid ${DT.panelBorder}`,
          boxShadow: `0 0 60px hsla(185, 40%, 15%, 0.15), 0 25px 50px -12px hsla(0, 0%, 0%, 0.5), inset 0 1px 0 hsla(200, 20%, 40%, 0.08)`,
          fontFamily: DT.font,
          maxHeight: "85vh",
        }}
      >
        {/* ── Title bar — dark metallic ───────────────────────────── */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{
            background: "hsla(210, 12%, 8%, 0.9)",
            borderBottom: `1px solid ${DT.panelBorder}`,
          }}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <IconCpu size={16} style={{ color: DT.cyan }} />
              <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full" style={{ background: stats.isActive ? DT.green : DT.textDim, boxShadow: stats.isActive ? `0 0 4px ${DT.green}` : "none" }} />
            </div>
            <span className="text-sm font-bold tracking-wide" style={{ color: DT.textBright, fontFamily: DT.mono }}>
              HOLOGRAM TASK MANAGER
            </span>
          </div>
          <button
            onClick={() => setVisible(false)}
            className="p-1.5 rounded transition-colors"
            title="Close (Ctrl+Shift+D)"
            style={{ color: DT.textDim }}
            onMouseEnter={e => { (e.currentTarget.style.background = "hsla(0, 60%, 40%, 0.2)"); (e.currentTarget.style.color = DT.red); }}
            onMouseLeave={e => { (e.currentTarget.style.background = "transparent"); (e.currentTarget.style.color = DT.textDim); }}
          >
            <IconX size={14} />
          </button>
        </div>

        {/* ── Tab bar — numbered tabs like MSI Afterburner's side panel ── */}
        <div className="flex px-1 pt-0.5" style={{ background: "hsla(210, 10%, 7%, 0.8)", borderBottom: `1px solid ${DT.sectionBorder}` }}>
          {TAB_META.map(({ id, label, icon: Icon }, idx) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="flex items-center gap-1.5 px-3 py-2.5 text-[10px] uppercase tracking-[0.12em] rounded-t transition-all relative"
                style={{
                  color: active ? DT.cyan : DT.textDim,
                  background: active ? DT.sectionBg : "transparent",
                  fontFamily: DT.mono,
                  fontWeight: active ? 700 : 500,
                  borderBottom: active ? `2px solid ${DT.cyan}` : "2px solid transparent",
                }}
              >
                <Icon size={12} />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{idx + 1}</span>
              </button>
            );
          })}
        </div>

        {/* ── Tab content ────────────────────────────────────────── */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: "calc(85vh - 100px)" }}>
          {tab === "processes" && <ProcessesTab stats={stats} />}
          {tab === "performance" && <PerformanceTab stats={stats} />}
          {tab === "processor" && <ProcessorTab stats={stats} />}
          {tab === "system" && <SystemTab stats={stats} />}
          {tab === "hardware" && <HardwareTab stats={stats} />}
          {tab === "details" && <DetailsTab stats={stats} />}
        </div>

        {/* ── Status bar — bottom strip with live readouts ────── */}
        <div
          className="flex items-center justify-between px-5 py-2 text-[9px] tracking-[0.1em] uppercase"
          style={{
            background: "hsla(210, 12%, 6%, 0.9)",
            borderTop: `1px solid ${DT.panelBorder}`,
            color: DT.textDim,
            fontFamily: DT.mono,
          }}
        >
          <span className="flex items-center gap-1.5">
            <StatusDot active={stats.isActive} />
            {stats.isActive ? "Active" : "Idle"}
          </span>
          <span className="tabular-nums" style={{ color: DT.textLabel }}>
            {stats.measuredFps.toFixed(0)} fps · {stats.kernelTickRateHz}Hz · {stats.renderCount}/s · {stats.displayRefreshHz}Hz
          </span>
          <span style={{ color: DT.textDim }}>Ctrl+Shift+D</span>
        </div>
      </div>
    </div>
  );
}
