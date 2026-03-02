/**
 * System Monitor — Warm, readable system diagnostics
 * ═══════════════════════════════════════════════════
 *
 * Toggle with Ctrl+Shift+D. Optimized for 60fps even while
 * polling at animation-frame cadence. All sub-components are
 * memoized; tabs lazy-render only when active; hardware detection
 * splits static (GPU, browser) from dynamic (heap, battery) to
 * avoid redundant async work.
 */

import { useState, useEffect, useRef, useMemo, useCallback, memo, lazy, Suspense } from "react";
import { getKernelProjector } from "@/modules/hologram-os/projection-engine";
import { getBrowserAdapter } from "@/modules/hologram-os/surface-adapter";
import { IconX, IconCpu, IconActivity, IconSettings, IconList, IconColumns } from "@tabler/icons-react";

// ─── Types ──────────────────────────────────────────────────────────────

type Tab = "processes" | "performance" | "system" | "compare" | "details";

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

// ─── Design Tokens (Warm Hologram Palette) ──────────────────────────────

const DT = {
  panelBg: "hsla(28, 10%, 8%, 0.97)",
  panelBorder: "hsla(30, 12%, 25%, 0.3)",
  sectionBg: "hsla(28, 8%, 11%, 0.7)",
  sectionBorder: "hsla(30, 10%, 28%, 0.2)",
  insetBg: "hsla(28, 10%, 7%, 0.8)",
  insetBorder: "hsla(30, 8%, 22%, 0.25)",
  gold: "hsl(38, 55%, 58%)",
  goldDim: "hsl(38, 30%, 38%)",
  green: "hsl(152, 45%, 52%)",
  red: "hsl(0, 50%, 55%)",
  amber: "hsl(38, 60%, 50%)",
  purple: "hsl(270, 40%, 62%)",
  textBright: "hsl(35, 15%, 92%)",
  textLabel: "hsl(30, 8%, 62%)",
  textDim: "hsl(30, 6%, 42%)",
  textValue: "hsl(38, 50%, 75%)",
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

// ─── Shared Sub-components (all memoized) ───────────────────────────────

const SegmentedBar = memo(function SegmentedBar({ value, max, segments = 20, color, label, unit, showValue = true }: {
  value: number; max: number; segments?: number; color: string; label: string; unit: string; showValue?: boolean;
}) {
  const filled = Math.round((value / Math.max(max, 1)) * segments);
  const displayVal = typeof value === "number" ? (value >= 1000 ? Math.round(value).toLocaleString() : value.toFixed(value < 10 ? 1 : 0)) : value;
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-[12px] uppercase tracking-[0.1em] w-16 shrink-0 text-right font-medium" style={{ color: DT.textLabel, fontFamily: DT.mono }}>{label}</span>
      <div className="flex gap-[2px] flex-1">
        {Array.from({ length: segments }).map((_, i) => (
          <div key={i} className="h-3.5 flex-1 rounded-[2px]" style={{
            background: i < filled ? color : "hsla(30, 6%, 18%, 0.5)",
            boxShadow: i < filled ? `0 0 4px ${color}40` : "none",
            opacity: i < filled ? (0.5 + (i / segments) * 0.5) : 0.3,
            transition: "background 120ms, opacity 120ms",
          }} />
        ))}
      </div>
      {showValue && (
        <div className="flex items-baseline gap-1 min-w-[80px] justify-end">
          <span className="text-xl font-bold tabular-nums" style={{ color: DT.textBright, fontFamily: DT.mono }}>{displayVal}</span>
          <span className="text-[11px] uppercase font-medium" style={{ color: DT.textDim }}>{unit}</span>
        </div>
      )}
    </div>
  );
});

const Readout = memo(function Readout({ label, value, unit, color = DT.textBright, size = "lg", sub }: {
  label: string; value: string | number; unit: string; color?: string; size?: "sm" | "lg"; sub?: string;
}) {
  return (
    <div className="text-center">
      <div className="text-[11px] uppercase tracking-[0.15em] mb-1.5 font-medium" style={{ color: DT.textLabel, fontFamily: DT.mono }}>{label}</div>
      <div className="flex items-baseline justify-center gap-1">
        <span className={`font-bold tabular-nums ${size === "lg" ? "text-2xl" : "text-xl"}`} style={{ color, fontFamily: DT.mono }}>{value}</span>
        {unit && <span className="text-[11px] uppercase font-medium" style={{ color: DT.textDim }}>{unit}</span>}
      </div>
      {sub && <div className="text-[11px] mt-1" style={{ color: DT.textDim }}>{sub}</div>}
    </div>
  );
});

const InsetPanel = memo(function InsetPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl p-4 ${className}`} style={{
      background: DT.insetBg, border: `1px solid ${DT.insetBorder}`,
      boxShadow: `inset 0 1px 3px hsla(28, 15%, 0%, 0.3), 0 1px 0 hsla(30, 10%, 30%, 0.05)`,
      contain: "layout style",
    }}>{children}</div>
  );
});

const Section = memo(function Section({ title, children, color, description }: { title: string; children: React.ReactNode; color?: string; description?: string }) {
  const c = color || DT.gold;
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[12px] uppercase tracking-[0.15em] font-semibold" style={{ color: c, fontFamily: DT.mono }}>{title}</span>
        <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${c}40, transparent)` }} />
      </div>
      {description && <p className="text-[12px] leading-relaxed mb-3" style={{ color: DT.textLabel }}>{description}</p>}
      {children}
    </div>
  );
});

const MetricRow = memo(function MetricRow({ label, value, accent, hint }: { label: string; value: string | number; accent?: string; hint?: string }) {
  return (
    <div className="flex justify-between items-center py-[5px]">
      <span className="text-[13px]" style={{ color: DT.textLabel, fontFamily: DT.font }} title={hint}>{label}</span>
      <span className="text-[13px] font-medium tabular-nums" style={{ color: accent ?? DT.textBright, fontFamily: DT.mono }}>{value}</span>
    </div>
  );
});

const StatusDot = memo(function StatusDot({ active }: { active: boolean }) {
  return (
    <span className="inline-block w-2 h-2 rounded-full mr-2" style={{
      background: active ? DT.green : DT.textDim,
      boxShadow: active ? `0 0 6px ${DT.green}60` : "none",
    }} />
  );
});

const Sparkline = memo(function Sparkline({ data, color, height = 52, label }: { data: number[]; color: string; height?: number; label?: string }) {
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
        {data.length > 0 && (() => {
          const lastX = w;
          const lastY = height - (data[data.length - 1] / max) * (height - 4);
          return <circle cx={lastX} cy={lastY} r={3} fill={color} style={{ filter: `drop-shadow(0 0 3px ${color})` }} />;
        })()}
      </svg>
      {label && (
        <span className="absolute top-0 right-1 text-[10px] tracking-wider uppercase font-medium" style={{ color: DT.textDim, fontFamily: DT.mono }}>{label}</span>
      )}
    </div>
  );
});

const SliderGauge = memo(function SliderGauge({ value, max, color, label, displayValue }: { value: number; max: number; color: string; label: string; displayValue: string }) {
  const pct = Math.min(100, (value / Math.max(max, 1)) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[12px]" style={{ fontFamily: DT.font }}>
        <span style={{ color: DT.textLabel }}>{label}</span>
        <span className="tabular-nums font-medium" style={{ color: DT.textBright }}>{displayValue}</span>
      </div>
      <div className="h-[7px] rounded-full overflow-hidden relative" style={{ background: "hsla(30, 6%, 15%, 0.8)", boxShadow: "inset 0 1px 2px hsla(0,0%,0%,0.3)" }}>
        <div className="h-full rounded-full" style={{
          width: `${pct}%`, background: `linear-gradient(90deg, ${color}90, ${color})`, boxShadow: `0 0 8px ${color}40`,
          transition: "width 200ms ease-out",
        }} />
        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2" style={{
          left: `calc(${pct}% - 6px)`, background: DT.panelBg, borderColor: color, boxShadow: `0 0 6px ${color}60`,
          transition: "left 200ms ease-out",
        }} />
      </div>
    </div>
  );
});

// ─── Hardware Detection (split static/dynamic) ─────────────────────────

interface StaticHwInfo {
  logicalCores: number;
  deviceMemoryGb: number | null;
  screenWidth: number;
  screenHeight: number;
  dpr: number;
  colorDepth: number;
  colorGamut: string;
  hdr: boolean;
  touchPoints: number;
  gpuRenderer: string;
  gpuVendor: string;
  gpuTier: string;
  webglVersion: string;
  maxViewportDims: string;
  maxTextureSize: number | null;
  maxRenderbufferSize: number | null;
  browserName: string;
  browserVersion: string;
  osName: string;
  prefersReducedMotion: boolean;
  prefersColorScheme: string;
  mediaCapabilities: string;
}

interface DynamicHwInfo {
  onLine: boolean;
  jsHeapUsedMb: number | null;
  jsHeapTotalMb: number | null;
  jsHeapLimitMb: number | null;
  viewportWidth: number;
  viewportHeight: number;
  refreshHz: number;
  orientation: string;
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

type HardwareInfo = StaticHwInfo & DynamicHwInfo;

function parseBrowserInfo(ua: string): { browser: string; version: string; os: string } {
  let browser = "Unknown", version = "", os = "Unknown";
  if (ua.includes("Firefox/")) { browser = "Firefox"; version = ua.match(/Firefox\/([\d.]+)/)?.[1] || ""; }
  else if (ua.includes("Edg/")) { browser = "Edge"; version = ua.match(/Edg\/([\d.]+)/)?.[1] || ""; }
  else if (ua.includes("Chrome/")) { browser = "Chrome"; version = ua.match(/Chrome\/([\d.]+)/)?.[1] || ""; }
  else if (ua.includes("Safari/") && !ua.includes("Chrome")) { browser = "Safari"; version = ua.match(/Version\/([\d.]+)/)?.[1] || ""; }
  if (ua.includes("Brave")) browser = "Brave";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  return { browser, version, os };
}

/** Detect GPU/browser/screen once; refresh heap/battery/network on interval */
function useHardwareInfo(visible: boolean): HardwareInfo | null {
  const [info, setInfo] = useState<HardwareInfo | null>(null);
  const staticRef = useRef<StaticHwInfo | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    // Static detection — runs once
    const detectStatic = async (): Promise<StaticHwInfo> => {
      if (staticRef.current) return staticRef.current;
      const nav = navigator as any;
      let gpuRenderer = "Unknown", gpuVendor = "Unknown";
      let maxTextureSize: number | null = null, maxRenderbufferSize: number | null = null;
      let webglVersion = "None", maxViewportDims = "N/A";
      try {
        const canvas = document.createElement("canvas");
        const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
        if (gl) {
          webglVersion = gl instanceof WebGL2RenderingContext ? "WebGL 2.0" : "WebGL 1.0";
          const ext = (gl as WebGLRenderingContext).getExtension("WEBGL_debug_renderer_info");
          if (ext) {
            gpuRenderer = (gl as WebGLRenderingContext).getParameter(ext.UNMASKED_RENDERER_WEBGL) || "Unknown";
            gpuVendor = (gl as WebGLRenderingContext).getParameter(ext.UNMASKED_VENDOR_WEBGL) || "Unknown";
          }
          maxTextureSize = (gl as WebGLRenderingContext).getParameter((gl as WebGLRenderingContext).MAX_TEXTURE_SIZE);
          maxRenderbufferSize = (gl as WebGLRenderingContext).getParameter((gl as WebGLRenderingContext).MAX_RENDERBUFFER_SIZE);
          const vp = (gl as WebGLRenderingContext).getParameter((gl as WebGLRenderingContext).MAX_VIEWPORT_DIMS);
          if (vp) maxViewportDims = `${vp[0]}×${vp[1]}`;
        }
      } catch {}

      const gpuTier = (() => {
        const r = gpuRenderer.toLowerCase();
        if (r.includes("nvidia") || r.includes("rtx") || r.includes("gtx") || r.includes("apple m") || r.includes("radeon pro")) return "high";
        if (r.includes("radeon") || r.includes("iris") || r.includes("intel uhd") || r.includes("adreno 6")) return "mid";
        return "basic";
      })();

      const colorGamut = window.matchMedia?.("(color-gamut: rec2020)")?.matches ? "Rec. 2020"
        : window.matchMedia?.("(color-gamut: p3)")?.matches ? "Display P3" : "sRGB";
      const { browser: browserName, version: browserVersion, os: osName } = parseBrowserInfo(navigator.userAgent);

      const result: StaticHwInfo = {
        logicalCores: nav.hardwareConcurrency || 1,
        deviceMemoryGb: nav.deviceMemory || null,
        screenWidth: screen.width * (window.devicePixelRatio || 1),
        screenHeight: screen.height * (window.devicePixelRatio || 1),
        dpr: window.devicePixelRatio || 1,
        colorDepth: screen.colorDepth || 24,
        colorGamut,
        hdr: window.matchMedia?.("(dynamic-range: high)")?.matches || false,
        touchPoints: nav.maxTouchPoints || 0,
        gpuRenderer, gpuVendor, gpuTier, webglVersion, maxViewportDims,
        maxTextureSize, maxRenderbufferSize,
        browserName, browserVersion, osName,
        prefersReducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false,
        prefersColorScheme: window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light",
        mediaCapabilities: "MediaRecorder" in window ? "Full" : "Partial",
      };
      staticRef.current = result;
      return result;
    };

    // Dynamic detection — runs on interval
    const detectDynamic = async (): Promise<DynamicHwInfo> => {
      const nav = navigator as any;
      const perf = performance as any;
      const memory = perf.memory;

      let storageEstimate: { usage: number; quota: number } | null = null;
      try { if (nav.storage?.estimate) { const est = await nav.storage.estimate(); storageEstimate = { usage: est.usage || 0, quota: est.quota || 0 }; } } catch {}

      let batteryLevel: number | null = null, batteryCharging: boolean | null = null;
      try { if (nav.getBattery) { const bat = await nav.getBattery(); batteryLevel = bat.level; batteryCharging = bat.charging; } } catch {}

      let audioOutputs = 0, videoInputs = 0;
      try {
        if (nav.mediaDevices?.enumerateDevices) {
          const devices = await nav.mediaDevices.enumerateDevices();
          audioOutputs = devices.filter((d: MediaDeviceInfo) => d.kind === "audiooutput").length;
          videoInputs = devices.filter((d: MediaDeviceInfo) => d.kind === "videoinput").length;
        }
      } catch {}

      return {
        onLine: navigator.onLine,
        jsHeapUsedMb: memory ? Math.round(memory.usedJSHeapSize / 1048576 * 10) / 10 : null,
        jsHeapTotalMb: memory ? Math.round(memory.totalJSHeapSize / 1048576 * 10) / 10 : null,
        jsHeapLimitMb: memory ? Math.round(memory.jsHeapSizeLimit / 1048576 * 10) / 10 : null,
        viewportWidth: window.innerWidth, viewportHeight: window.innerHeight,
        refreshHz: (window as any).__hologramRefreshHz || 60,
        orientation: screen?.orientation?.type?.includes("landscape") ? "Landscape" : "Portrait",
        storageEstimate,
        connectionType: nav.connection?.effectiveType || null,
        downlinkMbps: nav.connection?.downlink || null,
        rtt: nav.connection?.rtt || null,
        saveData: nav.connection?.saveData || false,
        batteryLevel, batteryCharging,
        audioOutputs, videoInputs,
      };
    };

    const refresh = async () => {
      if (cancelled) return;
      const [s, d] = await Promise.all([detectStatic(), detectDynamic()]);
      if (!cancelled) setInfo({ ...s, ...d });
    };

    refresh();
    const id = setInterval(refresh, 3000); // dynamic refresh at 3s (was 2s)
    return () => { cancelled = true; clearInterval(id); };
  }, [visible]);

  return info;
}

function useClockBenchmark(visible: boolean) {
  const [result, setResult] = useState<{
    mopsPerSec: number; estimatedMhz: number; benchmarkMs: number; sampleCount: number; jitterUs: number;
  } | null>(null);
  const samplesRef = useRef<number[]>([]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    const benchmark = () => {
      if (cancelled) return;
      // Use requestIdleCallback to avoid blocking UI
      const run = () => {
        const ITERATIONS = 1_500_000; // reduced from 2M for less jank
        const t0 = performance.now();
        let acc = 0;
        for (let i = 0; i < ITERATIONS; i++) acc += Math.sin(i * 0.001) * Math.cos(i * 0.002);
        const elapsed = performance.now() - t0;
        if (acc === Infinity) console.log(acc);
        const mops = (ITERATIONS / elapsed) * 1000 / 1_000_000;
        samplesRef.current.push(mops);
        if (samplesRef.current.length > 20) samplesRef.current.shift();
        const avgMops = samplesRef.current.reduce((a, b) => a + b, 0) / samplesRef.current.length;
        const estimatedHz = (ITERATIONS * 5 / 4) / (elapsed / 1000);
        const deltas: number[] = [];
        for (let i = 1; i < samplesRef.current.length; i++) deltas.push(Math.abs(samplesRef.current[i] - samplesRef.current[i - 1]));
        const jitterMops = deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
        if (!cancelled) {
          setResult({
            mopsPerSec: avgMops, estimatedMhz: Math.round(estimatedHz / 1_000_000),
            benchmarkMs: elapsed, sampleCount: samplesRef.current.length, jitterUs: Math.round(jitterMops * 1000),
          });
        }
      };
      if ("requestIdleCallback" in window) {
        (window as any).requestIdleCallback(run, { timeout: 5000 });
      } else {
        setTimeout(run, 100);
      }
    };

    benchmark();
    const id = setInterval(benchmark, 4000); // reduced frequency
    return () => { cancelled = true; clearInterval(id); };
  }, [visible]);

  return result;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ─── Tab Panels ─────────────────────────────────────────────────────────

const ProcessesTab = memo(function ProcessesTab({ stats }: { stats: Stats }) {
  const projector = getKernelProjector();
  const frame = projector.projectFrame();
  const processes = frame.processes;

  return (
    <div className="space-y-4">
      <p className="text-[13px] leading-relaxed" style={{ color: DT.textLabel }}>
        Active tasks running inside the system. Each process has a health score and resource usage, similar to how your computer's task manager shows running programs.
      </p>
      <div className="grid grid-cols-[1fr_70px_60px_60px_60px] gap-2 text-[11px] uppercase tracking-[0.1em] pb-2"
        style={{ color: DT.textDim, borderBottom: `1px solid ${DT.sectionBorder}`, fontFamily: DT.mono }}>
        <span>Task</span><span className="text-right">State</span><span className="text-right">Health</span>
        <span className="text-right">Time</span><span className="text-right">Sub</span>
      </div>
      {processes.map((p) => {
        const zoneColor = p.zone === "convergent" ? DT.green : p.zone === "exploring" ? DT.gold : DT.red;
        return (
          <div key={p.pid} className="grid grid-cols-[1fr_70px_60px_60px_60px] gap-2 items-center text-[13px] py-1.5 rounded-lg px-2 hover:bg-[hsla(30,8%,15%,0.3)]"
            style={{ fontFamily: DT.font, transition: "background 100ms" }}>
            <span className="flex items-center gap-2" style={{ color: DT.textBright }}>
              <StatusDot active={p.state === "running"} /><span className="truncate">{p.name}</span>
              <span className="text-[10px]" style={{ color: DT.textDim }}>#{p.pid}</span>
            </span>
            <span className="text-right capitalize" style={{ color: zoneColor }}>
              {p.zone === "convergent" ? "Stable" : p.zone === "exploring" ? "Active" : "Unstable"}
            </span>
            <span className="text-right tabular-nums" style={{ color: DT.textLabel, fontFamily: DT.mono }}>{(p.hScore * 100).toFixed(0)}%</span>
            <span className="text-right tabular-nums" style={{ color: DT.textLabel, fontFamily: DT.mono }}>{p.cpuMs.toFixed(0)}ms</span>
            <span className="text-right tabular-nums" style={{ color: DT.textLabel, fontFamily: DT.mono }}>{p.childCount}</span>
          </div>
        );
      })}
      {processes.length === 0 && <div className="text-center py-8 text-[14px]" style={{ color: DT.textDim }}>No active tasks</div>}
      <InsetPanel>
        <div className="flex gap-6 text-[12px]" style={{ color: DT.textLabel, fontFamily: DT.font }}>
          <span>Tasks: <strong style={{ color: DT.gold }}>{processes.length}</strong></span>
          <span>Listeners: <strong style={{ color: DT.gold }}>{stats.listenerCount}</strong></span>
          <span>Update rate: <strong style={{ color: DT.gold }}>{stats.tickRateHz} Hz</strong></span>
        </div>
      </InsetPanel>
    </div>
  );
});

const PerformanceTab = memo(function PerformanceTab({ stats }: { stats: Stats }) {
  const fpsHistory = useHistory(stats.measuredFps);
  const tickRateHistory = useHistory(stats.kernelTickRateHz);
  const fpsHealth = stats.measuredFps >= stats.displayRefreshHz * 0.9 ? "excellent"
    : stats.measuredFps >= 30 ? "good" : stats.measuredFps >= 15 ? "degraded" : "poor";
  const fpsColor = fpsHealth === "excellent" ? DT.green : fpsHealth === "good" ? DT.gold : DT.red;

  return (
    <div className="space-y-4">
      <p className="text-[13px] leading-relaxed" style={{ color: DT.textLabel }}>
        How smoothly everything is running. Frame rate is how many times per second your screen updates. Higher is smoother.
      </p>
      <InsetPanel>
        <SegmentedBar value={stats.measuredFps} max={stats.displayRefreshHz} segments={24} color={fpsColor} label="Frames" unit="fps" />
        <SegmentedBar value={stats.kernelTickRateHz} max={stats.displayRefreshHz} segments={24} color={DT.purple} label="Engine" unit="Hz" />
        <SegmentedBar value={stats.renderCount} max={200} segments={24} color={DT.gold} label="Draws" unit="/s" />
        <SegmentedBar value={stats.frameDrops} max={10} segments={24} color={stats.frameDrops > 0 ? DT.red : DT.green} label="Missed" unit="frames" />
      </InsetPanel>
      <div className="grid grid-cols-2 gap-3">
        <InsetPanel>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-[11px] uppercase tracking-[0.1em] font-medium" style={{ color: DT.textLabel, fontFamily: DT.mono }}>Frame Rate</span>
            <span className="text-base tabular-nums font-bold" style={{ color: fpsColor, fontFamily: DT.mono }}>{stats.measuredFps.toFixed(0)}</span>
          </div>
          <Sparkline data={fpsHistory} color={fpsColor} height={44} />
        </InsetPanel>
        <InsetPanel>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-[11px] uppercase tracking-[0.1em] font-medium" style={{ color: DT.textLabel, fontFamily: DT.mono }}>Engine Speed</span>
            <span className="text-base tabular-nums font-bold" style={{ color: DT.purple, fontFamily: DT.mono }}>{stats.kernelTickRateHz}Hz</span>
          </div>
          <Sparkline data={tickRateHistory} color={DT.purple} height={44} />
        </InsetPanel>
      </div>
      <InsetPanel>
        <Section title="Live Gauges" description="Real time resource utilization across key subsystems.">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <SliderGauge value={stats.measuredFps} max={stats.displayRefreshHz} color={fpsColor} label="Frame utilization" displayValue={`${((stats.measuredFps / stats.displayRefreshHz) * 100).toFixed(0)}%`} />
            <SliderGauge value={stats.interpPhase * 100} max={100} color={DT.gold} label="Smoothing progress" displayValue={`${(stats.interpPhase * 100).toFixed(0)}%`} />
            <SliderGauge value={stats.renderCount} max={200} color={DT.amber} label="Draw calls" displayValue={`${stats.renderCount}/s`} />
            <SliderGauge value={stats.lastFrameAge} max={100} color={stats.lastFrameAge > 50 ? DT.amber : DT.green} label="Frame freshness" displayValue={`${stats.lastFrameAge.toFixed(0)}ms`} />
          </div>
        </Section>
      </InsetPanel>
    </div>
  );
});

const SystemTab = memo(function SystemTab({ stats }: { stats: Stats }) {
  const projector = getKernelProjector();
  const frame = projector.projectFrame();

  return (
    <div className="space-y-4">
      <p className="text-[13px] leading-relaxed" style={{ color: DT.textLabel }}>
        The overall health and rhythm of the system. Coherence measures how well everything is working together. Focus reflects how the interface adapts to your attention.
      </p>
      <div className="grid grid-cols-3 gap-3">
        <InsetPanel className="text-center">
          <Readout label="Engine" value={stats.isActive ? "ON" : "IDLE"} unit="" color={stats.isActive ? DT.green : DT.textDim} size="sm" sub={`${stats.tickCount.toLocaleString()} updates`} />
        </InsetPanel>
        <InsetPanel className="text-center">
          <Readout label="Health" value={`${(frame.systemCoherence.meanH * 100).toFixed(0)}`} unit="%" color={frame.systemCoherence.zone === "convergent" ? DT.green : DT.gold} size="sm" sub={frame.systemCoherence.zone === "convergent" ? "Stable" : "Adapting"} />
        </InsetPanel>
        <InsetPanel className="text-center">
          <Readout label="Focus" value={`${(frame.attention.aperture * 100).toFixed(0)}`} unit="%" color={DT.purple} size="sm" sub={frame.attention.preset === "focus" ? "Deep focus" : "Relaxed"} />
        </InsetPanel>
      </div>
      <InsetPanel>
        <Section title="Your Rhythm" description="The system learns your pace and adapts its animation timing to match how you interact.">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <MetricRow label="Breathing pace" value={`${(stats.breathPeriodMs / 1000).toFixed(1)}s`} accent={DT.purple} />
            <MetricRow label="Interactions" value={stats.breathEventCount.toLocaleString()} />
            <MetricRow label="Rhythm samples" value={`${stats.breathIntervalCount} / 20`} />
            {stats.breathDwellMs > 0 && <MetricRow label="Idle time" value={`${(stats.breathDwellMs / 1000).toFixed(1)}s`} accent={stats.breathDwellMs > 5000 ? DT.amber : DT.textLabel} />}
          </div>
        </Section>
      </InsetPanel>
      <InsetPanel>
        <Section title="Display">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <MetricRow label="Refresh rate" value={`${stats.displayRefreshHz} Hz`} accent={DT.gold} />
            <MetricRow label="Pixel density" value={`${stats.displayDpr.toFixed(1)}x`} />
            <MetricRow label="Quality" value={stats.displayGpuTier === "high" ? "High" : stats.displayGpuTier === "mid" ? "Medium" : "Basic"} />
            <MetricRow label="Text size" value={`${(frame.typography.userScale * 100).toFixed(0)}%`} />
          </div>
        </Section>
      </InsetPanel>
    </div>
  );
});

const DetailsTab = memo(function DetailsTab({ stats }: { stats: Stats }) {
  return (
    <div className="space-y-4">
      <p className="text-[13px] leading-relaxed" style={{ color: DT.textLabel }}>
        Under the hood: the rendering engine, smoothing pipeline, and timing details for advanced diagnostics.
      </p>
      <InsetPanel>
        <Section title="Rendering Engine">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <MetricRow label="Engine state" value={stats.streamRunning ? "Running" : "Stopped"} accent={stats.streamRunning ? DT.green : DT.red} />
            <MetricRow label="Update rate" value={`${stats.tickRateHz} Hz`} accent={DT.gold} />
            <MetricRow label="Total frames" value={stats.tickCount.toLocaleString()} />
            <MetricRow label="Pending updates" value={stats.dirty ? "Yes" : "None"} accent={stats.dirty ? DT.amber : DT.textLabel} />
            <MetricRow label="Active listeners" value={stats.listenerCount} />
            {stats.isActive && <MetricRow label="Running for" value={`${(stats.activeUntil / 1000).toFixed(1)}s`} accent={DT.green} />}
          </div>
        </Section>
      </InsetPanel>
      <InsetPanel>
        <Section title="Smoothing Pipeline" description="Interpolates between engine frames to keep animations fluid.">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <MetricRow label="State" value={stats.interpSleeping ? "Sleeping" : stats.interpRunning ? "Running" : "Off"} accent={stats.interpSleeping ? DT.amber : stats.interpRunning ? DT.green : DT.textDim} />
            <MetricRow label="Interval" value={`${stats.interpTickMs.toFixed(0)} ms`} />
            <MetricRow label="Progress" value={`${(stats.interpPhase * 100).toFixed(0)}%`} />
            <MetricRow label="Mode" value={stats.interpHasPrev ? "Blending" : "Snapping"} accent={stats.interpHasPrev ? DT.green : DT.amber} />
          </div>
        </Section>
      </InsetPanel>
      <InsetPanel>
        <Section title="Measured Performance">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <MetricRow label="Frames per second" value={`${stats.measuredFps.toFixed(1)}`} accent={stats.measuredFps > 15 ? DT.green : DT.amber} />
            <MetricRow label="Frame freshness" value={`${stats.lastFrameAge.toFixed(0)} ms`} accent={stats.lastFrameAge > 150 ? DT.amber : DT.textLabel} />
          </div>
        </Section>
      </InsetPanel>
    </div>
  );
});

// ─── Side-by-Side Compare Tab ───────────────────────────────────────────

const FRACTAL_DIM = 1.9206;

const CompareSection = memo(function CompareSection({ title, rows, color, description }: {
  title: string; rows: [string, string, string][]; color?: string; description?: string;
}) {
  return (
    <InsetPanel>
      <Section title={title} color={color} description={description}>
        <div className="grid grid-cols-[minmax(100px,1.2fr)_1fr_1fr] gap-3 pb-2 mb-1" style={{ borderBottom: `1px solid ${DT.sectionBorder}` }}>
          <span />
          <span className="text-[11px] uppercase tracking-[0.1em] font-medium text-right" style={{ color: DT.goldDim, fontFamily: DT.mono }}>Your Hardware</span>
          <span className="text-[11px] uppercase tracking-[0.1em] font-medium text-right" style={{ color: DT.purple, fontFamily: DT.mono }}>Hologram</span>
        </div>
        {rows.map(([label, hwVal, holoVal], i) => (
          <div key={i} className="grid grid-cols-[minmax(100px,1.2fr)_1fr_1fr] gap-3 py-[5px] items-center"
            style={{ borderBottom: i < rows.length - 1 ? `1px solid hsla(30, 6%, 20%, 0.15)` : "none" }}>
            <span className="text-[13px]" style={{ color: DT.textLabel }}>{label}</span>
            <span className="text-[13px] font-medium tabular-nums text-right" style={{ color: DT.textBright, fontFamily: DT.mono }}>{hwVal}</span>
            <span className="text-[13px] font-medium tabular-nums text-right" style={{ color: DT.textValue, fontFamily: DT.mono }}>{holoVal}</span>
          </div>
        ))}
      </Section>
    </InsetPanel>
  );
});

const CompareTab = memo(function CompareTab({ stats }: { stats: Stats }) {
  const hw = useHardwareInfo(true);
  const bench = useClockBenchmark(true);
  const projector = getKernelProjector();
  const frame = projector.projectFrame();

  if (!hw) return <div className="text-center py-8 text-[14px]" style={{ color: DT.textDim }}>Detecting your hardware…</div>;

  const vgpuMhz = Math.round((stats.kernelTickRateHz * FRACTAL_DIM * stats.kernelTickRateHz) / 1000);
  const processCount = frame.processes.length;

  type R = [string, string, string];

  const processorRows: R[] = [
    ["Processor cores", `${hw.logicalCores} threads`, `${processCount || 1} virtual tasks`],
    ["Clock speed", bench ? `${bench.estimatedMhz.toLocaleString()} MHz` : "Measuring…", `${vgpuMhz} vMHz`],
    ["Throughput", bench ? `${bench.mopsPerSec.toFixed(1)} MOPS` : "…", `${stats.kernelTickRateHz} ticks/s`],
  ];

  const memoryRows: R[] = [
    ["Memory", hw.deviceMemoryGb ? `${hw.deviceMemoryGb} GB RAM` : "N/A", `${stats.tickCount.toLocaleString()} frames buffered`],
    ["Heap usage", hw.jsHeapUsedMb ? `${hw.jsHeapUsedMb.toFixed(1)} MB` : "N/A", `${stats.renderCount}/s draws`],
    ["Storage", hw.storageEstimate ? formatBytes(hw.storageEstimate.usage) : "N/A", `${stats.listenerCount} active listeners`],
  ];

  const displayRows: R[] = [
    ["Refresh rate", `${hw.refreshHz} Hz native`, `${stats.kernelTickRateHz} Hz engine`],
    ["Resolution", `${hw.screenWidth}×${hw.screenHeight}`, `${stats.measuredFps.toFixed(0)} FPS output`],
    ["Pixel density", `${hw.dpr}x DPR`, `${hw.dpr}x (matched)`],
    ["Color space", hw.colorGamut, hw.colorGamut === "Display P3" ? "P3 Enhanced" : hw.colorGamut === "Rec. 2020" ? "2020 Enhanced" : "sRGB"],
    ["HDR", hw.hdr ? "Supported" : "No", hw.hdr ? "Active" : "N/A"],
  ];

  const graphicsRows: R[] = [
    ["GPU", hw.gpuRenderer.length > 40 ? hw.gpuRenderer.slice(0, 37) + "…" : hw.gpuRenderer, `Hologram Surface`],
    ["Quality tier", hw.gpuTier === "high" ? "High" : hw.gpuTier === "mid" ? "Medium" : "Basic", stats.displayGpuTier === "high" ? "High" : stats.displayGpuTier === "mid" ? "Medium" : "Basic"],
    ["Rendering API", hw.webglVersion, "Holographic Projection"],
  ];

  const networkRows: R[] = [
    ["Status", hw.onLine ? "Online" : "Offline", stats.isActive ? "Active" : "Idle"],
    ["Connection", hw.connectionType?.toUpperCase() || "Unknown", stats.interpSleeping ? "Sleeping" : "Streaming"],
    ["Speed", hw.downlinkMbps !== null ? `${hw.downlinkMbps} Mbps` : "N/A", `${stats.kernelTickRateHz} ops/s`],
    ["Latency", hw.rtt !== null ? `${hw.rtt}ms` : "N/A", `${stats.lastFrameAge.toFixed(0)}ms frame age`],
  ];

  const healthRows: R[] = [
    ["Battery", hw.batteryLevel !== null ? `${(hw.batteryLevel * 100).toFixed(0)}%${hw.batteryCharging ? " charging" : ""}` : "N/A", `${(frame.systemCoherence.meanH * 100).toFixed(0)}% system health`],
    ["Motion preference", hw.prefersReducedMotion ? "Reduced" : "Normal", stats.interpSleeping ? "Eco mode" : "Full motion"],
    ["Platform", `${hw.osName} · ${hw.browserName}`, `Hologram OS · Engine v1.0`],
  ];

  return (
    <div className="space-y-4">
      <p className="text-[13px] leading-relaxed" style={{ color: DT.textLabel }}>
        Your physical hardware and the holographic engine, side by side. Every capability on the left has a virtual equivalent on the right, showing how your device's resources power the system.
      </p>
      <CompareSection title="Processing Power" rows={processorRows} color={DT.gold}
        description="Your CPU threads become virtual tasks. The engine runs its own clock, tuned to the system's rhythm." />
      <CompareSection title="Memory & Storage" rows={memoryRows} color={DT.green}
        description="Physical memory holds your data. The engine tracks its own frame history and active connections." />
      <CompareSection title="Display" rows={displayRows} color={DT.purple}
        description="Your screen's native capabilities, and how the engine renders within them." />
      <CompareSection title="Graphics" rows={graphicsRows} color={DT.amber}
        description="Your GPU renders pixels. The holographic surface projects coherent state onto that output." />
      <CompareSection title="Network & Connectivity" rows={networkRows} color={DT.gold}
        description="External network status compared to the engine's internal streaming pipeline." />
      <CompareSection title="Health & Platform" rows={healthRows} color={DT.green}
        description="Battery level versus system coherence. Both measure how much capacity you have left." />
    </div>
  );
});

// ─── Main Component ─────────────────────────────────────────────────────

const TAB_META: { id: Tab; label: string; icon: typeof IconCpu }[] = [
  { id: "processes", label: "Tasks", icon: IconList },
  { id: "performance", label: "Performance", icon: IconActivity },
  { id: "system", label: "System", icon: IconCpu },
  { id: "compare", label: "Hardware ↔ Hologram", icon: IconColumns },
  { id: "details", label: "Details", icon: IconSettings },
];

export default memo(function KernelDevTools() {
  const [visible, setVisible] = useState(false);
  const [tab, setTab] = useState<Tab>("compare");
  const [stats, setStats] = useState<Stats | null>(null);
  const fpsAccumRef = useRef<number[]>([]);
  const lastTickRef = useRef(performance.now());
  const renderCountRef = useRef(0);
  const renderWindowRef = useRef(performance.now());
  const lastTickCountRef = useRef(0);
  const frameDropRef = useRef(0);

  // Keyboard toggle — stable callback
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "D") { e.preventDefault(); setVisible((v) => !v); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Stats polling — uses rAF-aligned interval for smoother updates
  useEffect(() => {
    if (!visible) return;
    const projector = getKernelProjector();
    const adapter = getBrowserAdapter();
    const unsub = projector.onFrame(() => { renderCountRef.current++; });

    let rafId: number;
    let lastPoll = 0;
    const POLL_INTERVAL = 66; // ~15Hz polling (was 50ms/20Hz) — sufficient for human reading

    const poll = (now: number) => {
      rafId = requestAnimationFrame(poll);
      if (now - lastPoll < POLL_INTERVAL) return;
      lastPoll = now;

      const ps = projector.getStreamStats();
      const is = adapter.getInterpStats();
      const dt = now - lastTickRef.current;
      lastTickRef.current = now;
      if (dt > 0 && dt < 200) { fpsAccumRef.current.push(1000 / dt); if (fpsAccumRef.current.length > 20) fpsAccumRef.current.shift(); }
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
      if (ps.isActive && tickDelta < expectedFrames * 0.5 && expectedFrames > 1) frameDropRef.current++;
      setStats({
        ...ps,
        interpRunning: is.running, interpSleeping: is.sleeping,
        interpTickMs: is.tickMs, interpPhase: is.phase, interpHasPrev: is.hasPrev,
        measuredFps, displayRefreshHz: dc.refreshHz, displayDpr: dc.dpr,
        displayGpuTier: dc.gpuTier, displayQuality: dc.quality,
        breathPeriodMs: br.breathPeriodMs, breathEventCount: br.eventCount,
        breathIntervalCount: br.intervals.length, breathDwellMs: br.dwellMs,
        renderCount: rendersPerSec, kernelTickRateHz, frameDrops: frameDropRef.current,
      });
    };

    rafId = requestAnimationFrame(poll);
    return () => { unsub(); cancelAnimationFrame(rafId); };
  }, [visible]);

  const handleClose = useCallback(() => setVisible(false), []);
  const handleTabChange = useCallback((id: Tab) => setTab(id), []);

  // Arrow-key tab navigation
  const handleTabKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    setTab(prev => {
      const idx = TAB_META.findIndex(t => t.id === prev);
      const next = e.key === "ArrowRight"
        ? (idx + 1) % TAB_META.length
        : (idx - 1 + TAB_META.length) % TAB_META.length;
      return TAB_META[next].id;
    });
  }, []);

  if (!visible || !stats) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center"
      style={{ background: "hsla(28, 12%, 3%, 0.8)", backdropFilter: "blur(16px)", contain: "strict" }}>
      <div className="w-full max-w-[780px] rounded-2xl overflow-hidden select-none" style={{
        background: DT.panelBg,
        border: `1px solid ${DT.panelBorder}`,
        boxShadow: `0 0 60px hsla(30, 30%, 15%, 0.12), 0 25px 50px -12px hsla(0, 0%, 0%, 0.5), inset 0 1px 0 hsla(30, 15%, 40%, 0.06)`,
        fontFamily: DT.font, maxHeight: "88vh",
        contain: "layout style paint",
      }}>
        {/* Title bar */}
        <div className="flex items-center justify-between px-5 py-3.5" style={{
          background: "hsla(28, 10%, 9%, 0.9)", borderBottom: `1px solid ${DT.panelBorder}`,
        }}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <IconCpu size={18} style={{ color: DT.gold }} />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full" style={{ background: stats.isActive ? DT.green : DT.textDim, boxShadow: stats.isActive ? `0 0 6px ${DT.green}` : "none" }} />
            </div>
            <span className="text-[15px] font-semibold tracking-wide" style={{ color: DT.textBright, fontFamily: DT.font }}>System Monitor</span>
          </div>
          <button onClick={handleClose} className="p-2 rounded-lg transition-colors hover:bg-[hsla(0,50%,40%,0.15)]" title="Close (Ctrl+Shift+D)"
            style={{ color: DT.textDim }}>
            <IconX size={16} />
          </button>
        </div>

        {/* Tab bar */}
        <div role="tablist" className="flex px-2 pt-1 gap-0.5" style={{ background: "hsla(28, 8%, 8%, 0.8)", borderBottom: `1px solid ${DT.sectionBorder}` }} onKeyDown={handleTabKeyDown}>
          {TAB_META.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            const isCompare = id === "compare";
            const activeColor = isCompare ? DT.purple : DT.gold;
            return (
              <button key={id} role="tab" aria-selected={active} tabIndex={active ? 0 : -1}
                onClick={() => handleTabChange(id)}
                className="flex items-center gap-2 px-3.5 py-3 text-[12px] uppercase tracking-[0.08em] rounded-t-lg relative"
                style={{
                  color: active ? activeColor : DT.textDim,
                  background: active ? DT.sectionBg : "transparent",
                  fontFamily: DT.font, fontWeight: active ? 600 : 400,
                  borderBottom: active ? `2px solid ${activeColor}` : "2px solid transparent",
                  transition: "color 100ms, background 100ms",
                }}>
                <Icon size={14} /><span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab content — only active tab renders */}
        <div className="p-5 overflow-y-auto" style={{ maxHeight: "calc(88vh - 110px)", scrollbarWidth: "thin", contain: "layout style" }}>
          {tab === "processes" && <ProcessesTab stats={stats} />}
          {tab === "performance" && <PerformanceTab stats={stats} />}
          {tab === "system" && <SystemTab stats={stats} />}
          {tab === "compare" && <CompareTab stats={stats} />}
          {tab === "details" && <DetailsTab stats={stats} />}
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between px-5 py-2.5 text-[11px] tracking-[0.05em]" style={{
          background: "hsla(28, 10%, 7%, 0.9)", borderTop: `1px solid ${DT.panelBorder}`,
          color: DT.textDim, fontFamily: DT.font,
        }}>
          <span className="flex items-center gap-1.5"><StatusDot active={stats.isActive} />{stats.isActive ? "Running" : "Idle"}</span>
          <span className="tabular-nums" style={{ color: DT.textLabel, fontFamily: DT.mono }}>
            {stats.measuredFps.toFixed(0)} fps · {stats.kernelTickRateHz}Hz · {stats.renderCount} draws/s · {stats.displayRefreshHz}Hz display
          </span>
          <span style={{ color: DT.textDim }}>Ctrl+Shift+D to close</span>
        </div>
      </div>
    </div>
  );
});
