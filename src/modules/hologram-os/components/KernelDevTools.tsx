/**
 * Kernel Task Manager — MSI Afterburner-inspired system monitor
 * ═══════════════════════════════════════════════════════════════
 *
 * Toggle with Ctrl+Shift+D. Futuristic hardware monitoring aesthetic
 * with mirrored Hardware ↔ Hologram tabs for instant comparison.
 *
 * Design: MSI Afterburner's segmented bars, large readouts, beveled
 * panels — adapted to the Hologram OS warm palette.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { getKernelProjector } from "@/modules/hologram-os/projection-engine";
import { getBrowserAdapter } from "@/modules/hologram-os/surface-adapter";
import { IconX, IconCpu, IconActivity, IconSettings, IconList, IconDeviceDesktop, IconBolt, IconCube } from "@tabler/icons-react";

// ─── Types ──────────────────────────────────────────────────────────────

type Tab = "processes" | "performance" | "system" | "hardware" | "hologram" | "details";

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
  panelBg: "hsla(220, 12%, 7%, 0.97)",
  panelBorder: "hsla(200, 15%, 25%, 0.35)",
  sectionBg: "hsla(210, 10%, 10%, 0.7)",
  sectionBorder: "hsla(200, 12%, 30%, 0.2)",
  insetBg: "hsla(210, 12%, 6%, 0.8)",
  insetBorder: "hsla(200, 10%, 22%, 0.25)",
  cyan: "hsl(185, 70%, 50%)",
  cyanDim: "hsl(185, 40%, 30%)",
  gold: "hsl(38, 60%, 55%)",
  green: "hsl(152, 55%, 50%)",
  red: "hsl(0, 60%, 55%)",
  purple: "hsl(270, 50%, 60%)",
  textBright: "hsl(200, 15%, 90%)",
  textLabel: "hsl(200, 8%, 55%)",
  textDim: "hsl(210, 6%, 35%)",
  textValue: "hsl(185, 60%, 75%)",
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

// ─── Shared Sub-components ──────────────────────────────────────────────

function SegmentedBar({ value, max, segments = 20, color, label, unit, showValue = true }: {
  value: number; max: number; segments?: number; color: string; label: string; unit: string; showValue?: boolean;
}) {
  const filled = Math.round((value / Math.max(max, 1)) * segments);
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-[10px] uppercase tracking-[0.15em] w-14 shrink-0 text-right" style={{ color: DT.textLabel, fontFamily: DT.mono }}>{label}</span>
      <div className="flex gap-[2px] flex-1">
        {Array.from({ length: segments }).map((_, i) => (
          <div key={i} className="h-3 flex-1 rounded-[1px] transition-all duration-150" style={{
            background: i < filled ? color : "hsla(210, 8%, 18%, 0.5)",
            boxShadow: i < filled ? `0 0 4px ${color}40` : "none",
            opacity: i < filled ? (0.5 + (i / segments) * 0.5) : 0.3,
          }} />
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

function Readout({ label, value, unit, color = DT.textBright, size = "lg", sub }: {
  label: string; value: string | number; unit: string; color?: string; size?: "sm" | "lg"; sub?: string;
}) {
  return (
    <div className="text-center">
      <div className="text-[9px] uppercase tracking-[0.2em] mb-1" style={{ color: DT.textDim, fontFamily: DT.mono }}>{label}</div>
      <div className="flex items-baseline justify-center gap-1">
        <span className={`font-bold tabular-nums ${size === "lg" ? "text-2xl" : "text-lg"}`} style={{ color, fontFamily: DT.mono }}>{value}</span>
        <span className="text-[10px] uppercase" style={{ color: DT.textDim }}>{unit}</span>
      </div>
      {sub && <div className="text-[9px] mt-0.5" style={{ color: DT.textDim }}>{sub}</div>}
    </div>
  );
}

function InsetPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg p-3 ${className}`} style={{
      background: DT.insetBg, border: `1px solid ${DT.insetBorder}`,
      boxShadow: `inset 0 1px 3px hsla(210, 15%, 0%, 0.4), 0 1px 0 hsla(200, 10%, 30%, 0.06)`,
    }}>{children}</div>
  );
}

function Section({ title, children, color }: { title: string; children: React.ReactNode; color?: string }) {
  const c = color || DT.cyan;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-[10px] uppercase tracking-[0.2em] font-semibold" style={{ color: c, fontFamily: DT.mono }}>{title}</span>
        <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${c}50, transparent)` }} />
      </div>
      {children}
    </div>
  );
}

function MetricRow({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="flex justify-between items-center py-[3px]">
      <span className="text-[11px]" style={{ color: DT.textLabel, fontFamily: DT.mono }}>{label}</span>
      <span className="text-[11px] font-medium tabular-nums" style={{ color: accent ?? DT.textBright, fontFamily: DT.mono }}>{value}</span>
    </div>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style={{
      background: active ? DT.green : DT.textDim,
      boxShadow: active ? `0 0 6px ${DT.green}60` : "none",
    }} />
  );
}

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
        {data.length > 0 && (() => {
          const lastX = w;
          const lastY = height - (data[data.length - 1] / max) * (height - 4);
          return <circle cx={lastX} cy={lastY} r={2.5} fill={color} style={{ filter: `drop-shadow(0 0 3px ${color})` }} />;
        })()}
      </svg>
      {label && (
        <span className="absolute top-0 right-1 text-[8px] tracking-wider uppercase" style={{ color: DT.textDim, fontFamily: DT.mono }}>{label}</span>
      )}
    </div>
  );
}

function SliderGauge({ value, max, color, label, displayValue }: { value: number; max: number; color: string; label: string; displayValue: string }) {
  const pct = Math.min(100, (value / Math.max(max, 1)) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]" style={{ fontFamily: DT.mono }}>
        <span style={{ color: DT.textLabel }}>{label}</span>
        <span className="tabular-nums" style={{ color: DT.textBright }}>{displayValue}</span>
      </div>
      <div className="h-[6px] rounded-full overflow-hidden relative" style={{ background: "hsla(210, 8%, 15%, 0.8)", boxShadow: "inset 0 1px 2px hsla(0,0%,0%,0.4)" }}>
        <div className="h-full rounded-full transition-all duration-300" style={{
          width: `${pct}%`, background: `linear-gradient(90deg, ${color}90, ${color})`, boxShadow: `0 0 8px ${color}40`,
        }} />
        <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 transition-all duration-300" style={{
          left: `calc(${pct}% - 5px)`, background: DT.panelBg, borderColor: color, boxShadow: `0 0 6px ${color}60`,
        }} />
      </div>
    </div>
  );
}

// ─── Hardware Detection ─────────────────────────────────────────────────

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
  // Extended
  browserName: string;
  browserVersion: string;
  osName: string;
  maxTextureSize: number | null;
  maxRenderbufferSize: number | null;
  webglVersion: string;
  maxViewportDims: string;
  prefersReducedMotion: boolean;
  prefersColorScheme: string;
  mediaCapabilities: string;
}

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

function useHardwareInfo(visible: boolean): HardwareInfo | null {
  const [info, setInfo] = useState<HardwareInfo | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!visible) return;
    const detect = async () => {
      const nav = navigator as any;
      let gpuRenderer = "Unknown", gpuVendor = "Unknown";
      let maxTextureSize: number | null = null;
      let maxRenderbufferSize: number | null = null;
      let webglVersion = "None";
      let maxViewportDims = "N/A";
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
      const hdr = window.matchMedia?.("(dynamic-range: high)")?.matches || false;
      const orientation = screen?.orientation?.type?.includes("landscape") ? "landscape" : "portrait";

      let storageEstimate: { usage: number; quota: number } | null = null;
      try {
        if (nav.storage?.estimate) {
          const est = await nav.storage.estimate();
          storageEstimate = { usage: est.usage || 0, quota: est.quota || 0 };
        }
      } catch {}

      let batteryLevel: number | null = null, batteryCharging: boolean | null = null;
      try {
        if (nav.getBattery) {
          const bat = await nav.getBattery();
          batteryLevel = bat.level;
          batteryCharging = bat.charging;
        }
      } catch {}

      let audioOutputs = 0, videoInputs = 0;
      try {
        if (nav.mediaDevices?.enumerateDevices) {
          const devices = await nav.mediaDevices.enumerateDevices();
          audioOutputs = devices.filter((d: MediaDeviceInfo) => d.kind === "audiooutput").length;
          videoInputs = devices.filter((d: MediaDeviceInfo) => d.kind === "videoinput").length;
        }
      } catch {}

      const perf = performance as any;
      const memory = perf.memory;

      const { browser: browserName, version: browserVersion, os: osName } = parseBrowserInfo(navigator.userAgent);
      const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false;
      const prefersColorScheme = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";

      setInfo({
        platform: nav.platform || "Unknown",
        userAgent: navigator.userAgent,
        language: navigator.language,
        cookiesEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        logicalCores: nav.hardwareConcurrency || 1,
        deviceMemoryGb: nav.deviceMemory || null,
        jsHeapUsedMb: memory ? Math.round(memory.usedJSHeapSize / 1048576 * 10) / 10 : null,
        jsHeapTotalMb: memory ? Math.round(memory.totalJSHeapSize / 1048576 * 10) / 10 : null,
        jsHeapLimitMb: memory ? Math.round(memory.jsHeapSizeLimit / 1048576 * 10) / 10 : null,
        screenWidth: screen.width * (window.devicePixelRatio || 1),
        screenHeight: screen.height * (window.devicePixelRatio || 1),
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        dpr: window.devicePixelRatio || 1,
        colorDepth: screen.colorDepth || 24,
        colorGamut, hdr, orientation,
        refreshHz: (window as any).__hologramRefreshHz || 60,
        touchPoints: nav.maxTouchPoints || 0,
        gpuRenderer, gpuVendor, gpuTier,
        storageEstimate,
        connectionType: nav.connection?.effectiveType || null,
        downlinkMbps: nav.connection?.downlink || null,
        rtt: nav.connection?.rtt || null,
        saveData: nav.connection?.saveData || false,
        batteryLevel, batteryCharging,
        audioOutputs, videoInputs,
        browserName, browserVersion, osName,
        maxTextureSize, maxRenderbufferSize, webglVersion, maxViewportDims,
        prefersReducedMotion, prefersColorScheme,
        mediaCapabilities: "MediaRecorder" in window ? "Full" : "Partial",
      });
    };
    detect();
    intervalRef.current = setInterval(detect, 2000);
    return () => clearInterval(intervalRef.current);
  }, [visible]);

  return info;
}

function useClockBenchmark(visible: boolean) {
  const [result, setResult] = useState<{
    mopsPerSec: number; estimatedMhz: number; benchmarkMs: number; sampleCount: number; jitterUs: number;
  } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const samplesRef = useRef<number[]>([]);

  useEffect(() => {
    if (!visible) return;
    const benchmark = () => {
      const ITERATIONS = 2_000_000;
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
      const deltas = [];
      for (let i = 1; i < samplesRef.current.length; i++) deltas.push(Math.abs(samplesRef.current[i] - samplesRef.current[i - 1]));
      const jitterMops = deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
      setResult({
        mopsPerSec: avgMops,
        estimatedMhz: Math.round(estimatedHz / 1_000_000),
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ─── Tab Panels ─────────────────────────────────────────────────────────

function ProcessesTab({ stats }: { stats: Stats }) {
  const projector = getKernelProjector();
  const frame = projector.projectFrame();
  const processes = frame.processes;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_70px_60px_60px_60px] gap-2 text-[9px] uppercase tracking-[0.15em] pb-2"
        style={{ color: DT.textDim, borderBottom: `1px solid ${DT.sectionBorder}`, fontFamily: DT.mono }}>
        <span>Process</span><span className="text-right">Status</span><span className="text-right">H-Score</span>
        <span className="text-right">CPU</span><span className="text-right">Sub</span>
      </div>
      {processes.map((p) => {
        const zoneColor = p.zone === "convergent" ? DT.green : p.zone === "exploring" ? DT.gold : DT.red;
        return (
          <div key={p.pid} className="grid grid-cols-[1fr_70px_60px_60px_60px] gap-2 items-center text-[11px] py-1 rounded px-2 transition-colors"
            style={{ fontFamily: DT.mono }}
            onMouseEnter={e => (e.currentTarget.style.background = "hsla(185, 10%, 15%, 0.3)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <span className="flex items-center gap-1.5" style={{ color: DT.textBright }}>
              <StatusDot active={p.state === "running"} /><span className="truncate">{p.name}</span>
              <span className="text-[8px]" style={{ color: DT.textDim }}>#{p.pid}</span>
            </span>
            <span className="text-right capitalize" style={{ color: zoneColor }}>
              {p.zone === "convergent" ? "Stable" : p.zone === "exploring" ? "Active" : "Unstable"}
            </span>
            <span className="text-right tabular-nums" style={{ color: DT.textLabel }}>{(p.hScore * 100).toFixed(0)}%</span>
            <span className="text-right tabular-nums" style={{ color: DT.textLabel }}>{p.cpuMs.toFixed(0)}ms</span>
            <span className="text-right tabular-nums" style={{ color: DT.textLabel }}>{p.childCount}</span>
          </div>
        );
      })}
      {processes.length === 0 && <div className="text-center py-8 text-sm" style={{ color: DT.textDim }}>No active processes</div>}
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
  const fpsHealth = stats.measuredFps >= stats.displayRefreshHz * 0.9 ? "excellent"
    : stats.measuredFps >= 30 ? "good" : stats.measuredFps >= 15 ? "degraded" : "poor";
  const fpsColor = fpsHealth === "excellent" ? DT.green : fpsHealth === "good" ? DT.gold : DT.red;

  return (
    <div className="space-y-4">
      <InsetPanel>
        <SegmentedBar value={stats.measuredFps} max={stats.displayRefreshHz} segments={24} color={fpsColor} label="FPS" unit="fps" />
        <SegmentedBar value={stats.kernelTickRateHz} max={stats.displayRefreshHz} segments={24} color={DT.purple} label="TICK" unit="Hz" />
        <SegmentedBar value={stats.renderCount} max={200} segments={24} color={DT.gold} label="RNDR" unit="/s" />
        <SegmentedBar value={stats.frameDrops} max={10} segments={24} color={stats.frameDrops > 0 ? DT.red : DT.green} label="DROP" unit="frames" />
      </InsetPanel>
      <div className="grid grid-cols-2 gap-3">
        <InsetPanel>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-[9px] uppercase tracking-[0.15em]" style={{ color: DT.textDim, fontFamily: DT.mono }}>Frame Rate</span>
            <span className="text-sm tabular-nums font-bold" style={{ color: fpsColor, fontFamily: DT.mono }}>{stats.measuredFps.toFixed(0)}</span>
          </div>
          <Sparkline data={fpsHistory} color={fpsColor} height={40} />
        </InsetPanel>
        <InsetPanel>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-[9px] uppercase tracking-[0.15em]" style={{ color: DT.textDim, fontFamily: DT.mono }}>Kernel Tick</span>
            <span className="text-sm tabular-nums font-bold" style={{ color: DT.purple, fontFamily: DT.mono }}>{stats.kernelTickRateHz}Hz</span>
          </div>
          <Sparkline data={tickRateHistory} color={DT.purple} height={40} />
        </InsetPanel>
      </div>
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
    </div>
  );
}

function SystemTab({ stats }: { stats: Stats }) {
  const projector = getKernelProjector();
  const frame = projector.projectFrame();

  return (
    <div className="space-y-4">
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
      <InsetPanel>
        <Section title="Your Rhythm">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <MetricRow label="Breathing pace" value={`${(stats.breathPeriodMs / 1000).toFixed(1)}s`} accent={DT.purple} />
            <MetricRow label="Interactions" value={stats.breathEventCount.toLocaleString()} />
            <MetricRow label="Rhythm samples" value={`${stats.breathIntervalCount} / 20`} />
            {stats.breathDwellMs > 0 && <MetricRow label="Idle time" value={`${(stats.breathDwellMs / 1000).toFixed(1)}s`} accent={stats.breathDwellMs > 5000 ? DT.gold : DT.textLabel} />}
          </div>
        </Section>
      </InsetPanel>
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

// ─── Mirrored Hardware / Hologram Tab ───────────────────────────────────
// Identical layout for both — only the values change.

const FRACTAL_DIM = 1.9206;

interface UnifiedMetrics {
  // Top cards
  cores: { value: string | number; sub: string };
  memory: { value: string; sub: string };
  display: { value: string; sub: string };
  // GPU
  gpuName: string;
  gpuVendor: string;
  gpuTier: string;
  colorSpace: string;
  hdr: boolean;
  // Memory
  heapUsed: string;
  heapLimit: string;
  heapPct: number;
  storageUsed: string;
  storagePct: number;
  // Display & Input
  resolution: string;
  viewport: string;
  colorDepth: string;
  orientation: string;
  touchPoints: string;
  cameras: string;
  audioOutputs: string;
  // Network
  status: string;
  statusOnline: boolean;
  connectionType: string;
  speed: string;
  latency: string;
  // Battery
  batteryLevel: number | null;
  batteryCharging: boolean;
  batteryText: string;
  // Platform
  platformLine: string;
  userAgentLine: string;
  // Extra
  webglVersion: string;
  maxTexture: string;
  maxViewport: string;
  prefersMotion: string;
  colorScheme: string;
}

function buildHardwareMetrics(hw: HardwareInfo): UnifiedMetrics {
  return {
    cores: { value: hw.logicalCores, sub: "logical threads" },
    memory: { value: hw.deviceMemoryGb ? `${hw.deviceMemoryGb} GB` : "N/A", sub: "device RAM" },
    display: { value: `${hw.refreshHz} Hz`, sub: `${hw.dpr}x · ${hw.screenWidth}×${hw.screenHeight}` },
    gpuName: hw.gpuRenderer,
    gpuVendor: hw.gpuVendor,
    gpuTier: hw.gpuTier,
    colorSpace: hw.colorGamut,
    hdr: hw.hdr,
    heapUsed: hw.jsHeapUsedMb ? `${hw.jsHeapUsedMb.toFixed(1)} MB` : "N/A",
    heapLimit: hw.jsHeapLimitMb ? `${hw.jsHeapLimitMb.toFixed(0)} MB` : "N/A",
    heapPct: hw.jsHeapUsedMb && hw.jsHeapLimitMb ? (hw.jsHeapUsedMb / hw.jsHeapLimitMb) * 100 : 0,
    storageUsed: hw.storageEstimate ? `${formatBytes(hw.storageEstimate.usage)} / ${formatBytes(hw.storageEstimate.quota)}` : "N/A",
    storagePct: hw.storageEstimate ? (hw.storageEstimate.usage / hw.storageEstimate.quota) * 100 : 0,
    resolution: `${hw.screenWidth}×${hw.screenHeight}`,
    viewport: `${hw.viewportWidth}×${hw.viewportHeight}`,
    colorDepth: `${hw.colorDepth}-bit`,
    orientation: hw.orientation,
    touchPoints: hw.touchPoints > 0 ? `${hw.touchPoints} points` : "None",
    cameras: `${hw.videoInputs}`,
    audioOutputs: `${hw.audioOutputs}`,
    status: hw.onLine ? "Online" : "Offline",
    statusOnline: hw.onLine,
    connectionType: hw.connectionType?.toUpperCase() || "Unknown",
    speed: hw.downlinkMbps !== null ? `${hw.downlinkMbps} Mbps` : "N/A",
    latency: hw.rtt !== null ? `${hw.rtt}ms` : "N/A",
    batteryLevel: hw.batteryLevel,
    batteryCharging: hw.batteryCharging || false,
    batteryText: hw.batteryLevel !== null
      ? `${(hw.batteryLevel * 100).toFixed(0)}%${hw.batteryCharging ? " · Charging" : ""}`
      : "N/A",
    platformLine: `${hw.osName} · ${hw.browserName} ${hw.browserVersion}`,
    userAgentLine: hw.userAgent,
    webglVersion: hw.webglVersion,
    maxTexture: hw.maxTextureSize ? `${hw.maxTextureSize}` : "N/A",
    maxViewport: hw.maxViewportDims,
    prefersMotion: hw.prefersReducedMotion ? "Reduced" : "Normal",
    colorScheme: hw.prefersColorScheme === "dark" ? "Dark" : "Light",
  };
}

function buildHologramMetrics(hw: HardwareInfo, stats: Stats, bench: { mopsPerSec: number; estimatedMhz: number } | null): UnifiedMetrics {
  const vgpuMhz = Math.round((stats.kernelTickRateHz * FRACTAL_DIM * stats.kernelTickRateHz) / 1000);
  const projector = getKernelProjector();
  const frame = projector.projectFrame();
  const processCount = frame.processes.length;

  return {
    cores: { value: processCount || 1, sub: "virtual processes" },
    memory: { value: `${stats.tickCount.toLocaleString()}`, sub: "kernel frames" },
    display: { value: `${stats.kernelTickRateHz} Hz`, sub: `${stats.displayDpr}x · Adaptive` },
    gpuName: `Hologram vGPU · Fractal D=${FRACTAL_DIM}`,
    gpuVendor: "Q-Linux Kernel Engine",
    gpuTier: stats.displayGpuTier,
    colorSpace: hw.colorGamut === "Display P3" ? "P3 Enhanced" : hw.colorGamut === "Rec. 2020" ? "2020 Enhanced" : "sRGB Projected",
    hdr: hw.hdr,
    heapUsed: bench ? `${bench.mopsPerSec.toFixed(1)} MOPS` : "Calibrating…",
    heapLimit: bench ? `${bench.estimatedMhz.toLocaleString()} MHz` : "…",
    heapPct: bench ? Math.min(100, (bench.mopsPerSec / 100) * 100) : 0,
    storageUsed: `${stats.renderCount}/s renders`,
    storagePct: Math.min(100, (stats.renderCount / 200) * 100),
    resolution: `${stats.displayRefreshHz}Hz native`,
    viewport: `${stats.measuredFps.toFixed(0)} FPS actual`,
    colorDepth: `${(frame.systemCoherence.meanH * 100).toFixed(0)}% H-score`,
    orientation: frame.attention.preset === "focus" ? "focused" : "diffuse",
    touchPoints: `${stats.breathIntervalCount} rhythm samples`,
    cameras: `${stats.listenerCount} listeners`,
    audioOutputs: `${stats.frameDrops} drops`,
    status: stats.isActive ? "Active" : "Idle",
    statusOnline: stats.isActive,
    connectionType: stats.interpSleeping ? "SLEEPING" : stats.interpRunning ? "STREAMING" : "IDLE",
    speed: `${stats.kernelTickRateHz} tick/s`,
    latency: `${stats.lastFrameAge.toFixed(0)}ms frame age`,
    batteryLevel: null,
    batteryCharging: false,
    batteryText: `${(frame.systemCoherence.meanH * 100).toFixed(0)}% coherence`,
    platformLine: `Q-Linux · Hologram OS · Kernel v1.0`,
    userAgentLine: `Projection Engine · ${processCount} processes · δ₀ = 6.8°`,
    webglVersion: "Holographic Surface",
    maxTexture: `${vgpuMhz} vMHz`,
    maxViewport: `${Math.round(stats.kernelTickRateHz * FRACTAL_DIM)} ops/tick`,
    prefersMotion: stats.interpSleeping ? "Eco (sleeping)" : "Full",
    colorScheme: frame.attention.preset === "focus" ? "Focused" : "Ambient",
  };
}

/** Shared layout for both Hardware and Hologram tabs */
function UnifiedDeviceTab({ metrics, accentColor, tabLabel }: { metrics: UnifiedMetrics; accentColor: string; tabLabel: string }) {
  return (
    <div className="space-y-4">
      {/* ── Top readout cards ──────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <InsetPanel className="text-center">
          <Readout label="Cores" value={metrics.cores.value} unit="" color={accentColor} sub={metrics.cores.sub} />
        </InsetPanel>
        <InsetPanel className="text-center">
          <Readout label="Memory" value={metrics.memory.value} unit="" color={DT.gold} sub={metrics.memory.sub} />
        </InsetPanel>
        <InsetPanel className="text-center">
          <Readout label="Display" value={metrics.display.value} unit="" color={DT.purple} sub={metrics.display.sub} />
        </InsetPanel>
      </div>

      {/* ── Graphics Processing Unit ──────────────────────────── */}
      <InsetPanel>
        <Section title="Graphics Processing Unit" color={accentColor}>
          <div className="text-[11px] break-all leading-relaxed mb-1" style={{ color: DT.textBright, fontFamily: DT.mono }}>{metrics.gpuName}</div>
          <div className="text-[10px] mb-3" style={{ color: DT.textLabel, fontFamily: DT.mono }}>{metrics.gpuVendor}</div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-[8px] uppercase tracking-wider" style={{ color: DT.textDim }}>Quality tier</div>
              <div className="text-sm font-bold" style={{ color: metrics.gpuTier === "high" ? DT.green : metrics.gpuTier === "mid" ? DT.gold : DT.textDim, fontFamily: DT.mono }}>
                {metrics.gpuTier === "high" ? "High" : metrics.gpuTier === "mid" ? "Medium" : "Basic"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-[8px] uppercase tracking-wider" style={{ color: DT.textDim }}>Color</div>
              <div className="text-sm font-bold" style={{ color: DT.textBright, fontFamily: DT.mono }}>{metrics.colorSpace}</div>
            </div>
            <div className="text-center">
              <div className="text-[8px] uppercase tracking-wider" style={{ color: DT.textDim }}>HDR</div>
              <div className="text-sm font-bold" style={{ color: metrics.hdr ? DT.green : DT.textDim, fontFamily: DT.mono }}>{metrics.hdr ? "ON" : "OFF"}</div>
            </div>
          </div>
        </Section>
      </InsetPanel>

      {/* ── JavaScript Memory / Compute ───────────────────────── */}
      <InsetPanel>
        <Section title={tabLabel === "Hardware" ? "JavaScript Memory (Live)" : "Compute Throughput (Live)"} color={accentColor}>
          <div className="text-[11px] mb-2" style={{ color: DT.textLabel, fontFamily: DT.mono }}>
            {tabLabel === "Hardware" ? `Heap: ${metrics.heapUsed} / ${metrics.heapLimit}` : `Throughput: ${metrics.heapUsed} · Clock: ${metrics.heapLimit}`}
          </div>
          <SliderGauge value={metrics.heapPct} max={100} color={accentColor} label={tabLabel === "Hardware" ? "Used" : "Load"} displayValue={metrics.heapUsed} />
          <div className="mt-2">
            <SliderGauge value={metrics.storagePct} max={100} color="hsl(200, 50%, 55%)" label={tabLabel === "Hardware" ? "Local Storage" : "Render Pipeline"} displayValue={metrics.storageUsed} />
          </div>
        </Section>
      </InsetPanel>

      {/* ── Display & Input ───────────────────────────────────── */}
      <InsetPanel>
        <Section title="Display & Input" color={accentColor}>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <MetricRow label={tabLabel === "Hardware" ? "Screen resolution" : "Native refresh"} value={metrics.resolution} accent={DT.textBright} />
            <MetricRow label={tabLabel === "Hardware" ? "Viewport" : "Measured output"} value={metrics.viewport} accent={DT.textBright} />
            <MetricRow label={tabLabel === "Hardware" ? "Color depth" : "Coherence"} value={metrics.colorDepth} />
            <MetricRow label="Orientation" value={metrics.orientation} />
            <MetricRow label={tabLabel === "Hardware" ? "Touch support" : "Rhythm samples"} value={metrics.touchPoints} accent={metrics.touchPoints !== "None" ? DT.green : DT.textDim} />
            <MetricRow label={tabLabel === "Hardware" ? "Cameras" : "Listeners"} value={metrics.cameras} />
            <MetricRow label={tabLabel === "Hardware" ? "Audio outputs" : "Frame drops"} value={metrics.audioOutputs} />
          </div>
        </Section>
      </InsetPanel>

      {/* ── Network / Connection ──────────────────────────────── */}
      <InsetPanel>
        <Section title="Network" color={accentColor}>
          <div className="space-y-1">
            <MetricRow label="Status" value={metrics.status} accent={metrics.statusOnline ? DT.green : DT.red} />
            <MetricRow label="Type" value={metrics.connectionType} accent={DT.cyan} />
            <MetricRow label="Speed" value={metrics.speed} />
            <MetricRow label="Latency" value={metrics.latency} />
          </div>
        </Section>
      </InsetPanel>

      {/* ── Battery / Coherence ───────────────────────────────── */}
      <InsetPanel>
        <Section title={tabLabel === "Hardware" ? "Battery" : "Coherence"} color={accentColor}>
          <div className="flex justify-between items-center text-[11px]" style={{ fontFamily: DT.mono }}>
            <span style={{ color: DT.textLabel }}>{metrics.batteryText}</span>
            {metrics.batteryLevel !== null && (
              <span className="tabular-nums font-bold" style={{ color: metrics.batteryLevel > 0.2 ? DT.green : DT.red }}>
                {(metrics.batteryLevel * 100).toFixed(0)}%
              </span>
            )}
          </div>
          {metrics.batteryLevel !== null && (
            <div className="mt-2 h-[6px] rounded-full overflow-hidden" style={{ background: "hsla(210, 8%, 15%, 0.8)" }}>
              <div className="h-full rounded-full transition-all duration-500" style={{
                width: `${metrics.batteryLevel * 100}%`,
                background: `linear-gradient(90deg, ${metrics.batteryLevel > 0.2 ? DT.green : DT.red}, ${metrics.batteryLevel > 0.5 ? DT.green : DT.gold})`,
              }} />
            </div>
          )}
        </Section>
      </InsetPanel>

      {/* ── Platform / Engine ─────────────────────────────────── */}
      <InsetPanel>
        <Section title="Platform" color={accentColor}>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <MetricRow label="Platform" value={metrics.platformLine} accent={DT.textBright} />
            <MetricRow label="Language" value={tabLabel === "Hardware" ? navigator.language : "Universal"} />
            <MetricRow label={tabLabel === "Hardware" ? "WebGL" : "Surface"} value={metrics.webglVersion} />
            <MetricRow label={tabLabel === "Hardware" ? "Max texture" : "vClock"} value={metrics.maxTexture} />
            <MetricRow label={tabLabel === "Hardware" ? "Max viewport" : "Ops/tick"} value={metrics.maxViewport} />
            <MetricRow label="Motion pref" value={metrics.prefersMotion} />
            <MetricRow label="Color scheme" value={metrics.colorScheme} />
          </div>
        </Section>
      </InsetPanel>

      {/* User agent / engine line */}
      <InsetPanel>
        <div className="text-[10px] break-all leading-relaxed" style={{ color: DT.textDim, fontFamily: DT.mono }}>
          {metrics.userAgentLine}
        </div>
      </InsetPanel>
    </div>
  );
}

function HardwareTab({ stats }: { stats: Stats }) {
  const hw = useHardwareInfo(true);
  if (!hw) return <div className="text-center py-8 text-sm" style={{ color: DT.textDim, fontFamily: DT.mono }}>Detecting hardware…</div>;
  const metrics = buildHardwareMetrics(hw);
  return <UnifiedDeviceTab metrics={metrics} accentColor={DT.cyan} tabLabel="Hardware" />;
}

function HologramTab({ stats }: { stats: Stats }) {
  const hw = useHardwareInfo(true);
  const bench = useClockBenchmark(true);
  if (!hw) return <div className="text-center py-8 text-sm" style={{ color: DT.textDim, fontFamily: DT.mono }}>Initializing hologram…</div>;
  const metrics = buildHologramMetrics(hw, stats, bench);
  return <UnifiedDeviceTab metrics={metrics} accentColor={DT.purple} tabLabel="Hologram" />;
}

// ─── Main Component ─────────────────────────────────────────────────────

const TAB_META: { id: Tab; label: string; icon: typeof IconCpu }[] = [
  { id: "processes", label: "Processes", icon: IconList },
  { id: "performance", label: "Performance", icon: IconActivity },
  { id: "system", label: "System", icon: IconCpu },
  { id: "hardware", label: "Hardware", icon: IconDeviceDesktop },
  { id: "hologram", label: "Hologram", icon: IconCube },
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "D") { e.preventDefault(); setVisible((v) => !v); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

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
    const id = setInterval(poll, 50);
    poll();
    return () => { unsub(); clearInterval(id); };
  }, [visible]);

  if (!visible || !stats) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center"
      style={{ background: "hsla(215, 15%, 3%, 0.75)", backdropFilter: "blur(12px)" }}>
      <div className="w-full max-w-[720px] rounded-xl overflow-hidden select-none" style={{
        background: DT.panelBg,
        border: `1px solid ${DT.panelBorder}`,
        boxShadow: `0 0 60px hsla(185, 40%, 15%, 0.15), 0 25px 50px -12px hsla(0, 0%, 0%, 0.5), inset 0 1px 0 hsla(200, 20%, 40%, 0.08)`,
        fontFamily: DT.font, maxHeight: "85vh",
      }}>
        {/* Title bar */}
        <div className="flex items-center justify-between px-5 py-3" style={{
          background: "hsla(210, 12%, 8%, 0.9)", borderBottom: `1px solid ${DT.panelBorder}`,
        }}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <IconCpu size={16} style={{ color: DT.cyan }} />
              <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full" style={{ background: stats.isActive ? DT.green : DT.textDim, boxShadow: stats.isActive ? `0 0 4px ${DT.green}` : "none" }} />
            </div>
            <span className="text-sm font-bold tracking-wide" style={{ color: DT.textBright, fontFamily: DT.mono }}>Task Manager</span>
          </div>
          <button onClick={() => setVisible(false)} className="p-1.5 rounded transition-colors" title="Close (Ctrl+Shift+D)"
            style={{ color: DT.textDim }}
            onMouseEnter={e => { e.currentTarget.style.background = "hsla(0, 60%, 40%, 0.2)"; e.currentTarget.style.color = DT.red; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = DT.textDim; }}>
            <IconX size={14} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex px-1 pt-0.5" style={{ background: "hsla(210, 10%, 7%, 0.8)", borderBottom: `1px solid ${DT.sectionBorder}` }}>
          {TAB_META.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            const isHologram = id === "hologram";
            const activeColor = isHologram ? DT.purple : DT.cyan;
            return (
              <button key={id} onClick={() => setTab(id)}
                className="flex items-center gap-1.5 px-3 py-2.5 text-[10px] uppercase tracking-[0.12em] rounded-t transition-all relative"
                style={{
                  color: active ? activeColor : DT.textDim,
                  background: active ? DT.sectionBg : "transparent",
                  fontFamily: DT.mono, fontWeight: active ? 700 : 500,
                  borderBottom: active ? `2px solid ${activeColor}` : "2px solid transparent",
                }}>
                <Icon size={12} /><span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: "calc(85vh - 100px)" }}>
          {tab === "processes" && <ProcessesTab stats={stats} />}
          {tab === "performance" && <PerformanceTab stats={stats} />}
          {tab === "system" && <SystemTab stats={stats} />}
          {tab === "hardware" && <HardwareTab stats={stats} />}
          {tab === "hologram" && <HologramTab stats={stats} />}
          {tab === "details" && <DetailsTab stats={stats} />}
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between px-5 py-2 text-[9px] tracking-[0.1em] uppercase" style={{
          background: "hsla(210, 12%, 6%, 0.9)", borderTop: `1px solid ${DT.panelBorder}`,
          color: DT.textDim, fontFamily: DT.mono,
        }}>
          <span className="flex items-center gap-1.5"><StatusDot active={stats.isActive} />{stats.isActive ? "Engine active" : "Idle"}</span>
          <span className="tabular-nums" style={{ color: DT.textLabel }}>
            {stats.measuredFps.toFixed(0)} fps · {stats.kernelTickRateHz}Hz tick · {stats.renderCount} renders/s · {stats.displayRefreshHz}Hz display
          </span>
          <span style={{ color: DT.textDim }}>Ctrl+Shift+D to close</span>
        </div>
      </div>
    </div>
  );
}
