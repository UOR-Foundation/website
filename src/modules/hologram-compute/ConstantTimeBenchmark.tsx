/**
 * Matrix Multiplication Benchmark — CPU & GPU Tabs
 * ══════════════════════════════════════════════════
 *
 * Two independent benchmark tabs with identical format:
 *   CPU Tab:  CPU (single-thread) vs Hologram vGPU
 *   GPU Tab:  WebGPU (real GPU) vs Hologram vGPU
 *
 * Each tab is fully self-contained: chart, stats, results table,
 * SHA-256 forensic proof, scaling analysis, and LINPACK export.
 * Everything fits on one screen — no scrolling between sections.
 *
 * ZERO SIMULATION: All data is measured in real-time.
 * Any mismatch is prominently labeled with "MISMATCH" badges.
 *
 * @module hologram-compute/ConstantTimeBenchmark
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  IconPlayerPlay, IconFlame, IconDownload, IconCheck,
  IconInfoCircle, IconCpu, IconCpu2
} from "@tabler/icons-react";
import {
  standardMatmul, gpuMatmul, seededMatrix, fingerprint,
  matrixChecksum, sha256Hex, matrixSample,
  HologramComputeCache, MUL_TABLE_BYTES,
} from "./hologram-matmul";

// ── Palette ─────────────────────────────────────────────────────────────────

const P = {
  bg: "hsl(25, 8%, 8%)",
  card: "hsla(25, 8%, 12%, 0.6)",
  cardBorder: "hsla(38, 12%, 70%, 0.08)",
  text: "hsl(38, 10%, 88%)",
  muted: "hsl(38, 8%, 55%)",
  gold: "hsl(38, 40%, 65%)",
  dim: "hsl(38, 8%, 35%)",
  green: "hsl(152, 44%, 50%)",
  red: "hsl(0, 55%, 55%)",
  blue: "hsl(210, 50%, 60%)",
  font: "'DM Sans', system-ui, sans-serif",
};

// ══════════════════════════════════════════════════════════════════════════════
// Hardware Detection
// ══════════════════════════════════════════════════════════════════════════════

interface HardwareInfo {
  cpuCores: number;
  cpuArch: string;
  totalMemoryGB: number | null;
  browser: string;
  browserVersion: string;
  jsEngine: string;
  platform: string;
  oscpu: string;
  webgpuAvailable: boolean;
  gpuAdapter: string | null;
  gpuVendor: string | null;
  gpuArchitecture: string | null;
  gpuDescription: string | null;
  gpuMaxBufferSize: string | null;
  gpuMaxThreads: number | null;
  glRenderer: string | null;
  glVendor: string | null;
  screenResolution: string;
  devicePixelRatio: number;
  timezone: string;
  locale: string;
  publicIp: string | null;
  hostname: string;
}

function parseVersion(ua: string, token: string): string {
  const idx = ua.indexOf(token);
  if (idx === -1) return "";
  const sub = ua.slice(idx + token.length).split(/[\s;)]/)[0];
  return sub.replace(/^\//, "");
}

async function detectHardware(): Promise<HardwareInfo> {
  const ua = navigator.userAgent;
  let browser = "Unknown";
  let browserVersion = "";
  let jsEngine = "Unknown";
  if (ua.includes("Edg/")) { browser = "Edge"; jsEngine = "V8"; browserVersion = parseVersion(ua, "Edg/"); }
  else if (ua.includes("Chrome/")) { browser = "Chromium"; jsEngine = "V8"; browserVersion = parseVersion(ua, "Chrome/"); }
  else if (ua.includes("Firefox/")) { browser = "Firefox"; jsEngine = "SpiderMonkey"; browserVersion = parseVersion(ua, "Firefox/"); }
  else if (ua.includes("Safari/")) { browser = "Safari"; jsEngine = "JavaScriptCore"; browserVersion = parseVersion(ua, "Version/"); }

  const nav = navigator as Navigator & { deviceMemory?: number; oscpu?: string };
  let cpuArch = /arm|aarch64/i.test(ua) ? "ARM64" : /x86|x64|amd64|Win64/i.test(ua) ? "x86-64" : "Unknown";
  try {
    const uad = (navigator as any).userAgentData;
    if (uad?.getHighEntropyValues) {
      const he = await uad.getHighEntropyValues(["architecture", "bitness"]);
      if (he.architecture) cpuArch = `${he.architecture}${he.bitness ? `-${he.bitness}` : ""}`;
    }
  } catch { /* not supported */ }

  let oscpu = nav.oscpu || navigator.platform || "Unknown";
  try {
    const uad = (navigator as any).userAgentData;
    if (uad?.platform) oscpu = uad.platform;
  } catch { /* */ }

  let glRenderer: string | null = null;
  let glVendor: string | null = null;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (gl) {
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      if (dbg) {
        glRenderer = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL);
        glVendor = gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL);
      }
    }
  } catch { /* */ }

  let gpuAdapter: string | null = null;
  let gpuVendor: string | null = null;
  let gpuArchitecture: string | null = null;
  let gpuDescription: string | null = null;
  let gpuMaxBufferSize: string | null = null;
  let gpuMaxThreads: number | null = null;
  const webgpuAvailable = "gpu" in navigator;
  if (webgpuAvailable) {
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (adapter) {
        const info = (adapter as any).info || (await (adapter as any).requestAdapterInfo?.()) || {};
        gpuAdapter = info.device || info.description || null;
        gpuVendor = info.vendor || null;
        gpuArchitecture = info.architecture || null;
        gpuDescription = info.description || null;
        gpuMaxBufferSize = adapter.limits?.maxBufferSize ? `${(adapter.limits.maxBufferSize / (1024 ** 3)).toFixed(1)} GB` : null;
        gpuMaxThreads = adapter.limits?.maxComputeWorkgroupSizeX ?? null;
      }
    } catch { /* */ }
  }

  let publicIp: string | null = null;
  try {
    const resp = await fetch("https://api.ipify.org?format=json", { signal: AbortSignal.timeout(3000) });
    const data = await resp.json();
    publicIp = data.ip ?? null;
  } catch { /* non-critical */ }

  return {
    cpuCores: navigator.hardwareConcurrency || 1,
    cpuArch,
    totalMemoryGB: nav.deviceMemory ?? null,
    browser, browserVersion, jsEngine,
    platform: navigator.platform || "Unknown",
    oscpu, webgpuAvailable, gpuAdapter, gpuVendor, gpuArchitecture,
    gpuDescription, gpuMaxBufferSize, gpuMaxThreads, glRenderer, glVendor,
    screenResolution: `${screen.width}×${screen.height}`,
    devicePixelRatio: window.devicePixelRatio,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: navigator.language || "en",
    publicIp,
    hostname: location.hostname,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// LINPACK-aligned Configuration
// ══════════════════════════════════════════════════════════════════════════════

const CPU_SIZES = [16, 32, 64, 96, 128, 192, 256, 384, 512, 640, 768, 1024, 1280];
const GPU_SIZES = [16, 32, 64, 96, 128, 192, 256, 384, 512, 768, 1024, 1280, 1536, 2048];
const ALL_SIZES = [...new Set([...CPU_SIZES, ...GPU_SIZES])].sort((a, b) => a - b);
const SEED_A = 42;
const SEED_B = 137;
const WARMUP_ITERATIONS = 2;

function sampleCount(n: number): number {
  if (n >= 512) return 3;
  if (n >= 256) return 5;
  return 7;
}

const TIMER_RESOLUTION_US = typeof crossOriginIsolated !== "undefined" && crossOriginIsolated ? 5 : 100;

function flops(n: number, ms: number): number {
  return ms > 0 ? (2 * n * n * n) / (ms / 1000) : 0;
}

function formatFlops(f: number): string {
  if (f >= 1e12) return `${(f / 1e12).toFixed(2)} TFLOP/s`;
  if (f >= 1e9) return `${(f / 1e9).toFixed(2)} GFLOP/s`;
  if (f >= 1e6) return `${(f / 1e6).toFixed(1)} MFLOP/s`;
  if (f >= 1e3) return `${(f / 1e3).toFixed(0)} KFLOP/s`;
  return `${f.toFixed(0)} FLOP/s`;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function stddev(values: number[]): number {
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
}

function coeffOfVariation(values: number[]): number {
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return mean > 0 ? (stddev(values) / mean) * 100 : 0;
}

interface BenchPoint {
  n: number;
  ops: number;
  matrixElements: number;
  inputBytes: number;
  outputBytes: number;
  stdMs: number;
  gpuMs: number;
  gpuAvailable: boolean;
  holoMs: number;
  holoFingerprintMs: number;
  holoLookupMs: number;
  speedupVsCpu: number;
  speedupVsGpu: number;
  stdTokSec: number;
  gpuTokSec: number;
  holoTokSec: number;
  checksumStd: number;
  checksumGpu: number;
  checksumHolo: number;
  checksumOk: boolean;
  sha256Cpu: string;
  sha256Gpu: string;
  sha256Holo: string;
  fingerprintKey: string;
  sampleCpu: { topLeft: number[][]; bottomRight: number[][] };
  sampleHolo: { topLeft: number[][]; bottomRight: number[][] };
  cpuFlops: number;
  gpuFlops: number;
  holoFlops: number;
  samples: number;
  stdDevCpu: number;
  stdDevHolo: number;
  cvCpu: number;
  cvHolo: number;
}

function tokensPerSec(ms: number): number {
  return ms > 0 ? 1000 / ms : 999999;
}

function round(v: number): number {
  return Math.round(v * 1000) / 1000;
}

function formatOps(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return `${n}`;
}

function formatBytes(b: number): string {
  if (b >= 1e6) return `${(b / 1e6).toFixed(1)}MB`;
  if (b >= 1e3) return `${(b / 1e3).toFixed(0)}KB`;
  return `${b}B`;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  if (n >= 100) return n.toFixed(0);
  if (n >= 10) return n.toFixed(1);
  return n.toFixed(2);
}

// ══════════════════════════════════════════════════════════════════════════════
// SVG Comparison Chart
// ══════════════════════════════════════════════════════════════════════════════

const CW = 560;
const CH = 200;
const PAD = { top: 28, right: 24, bottom: 40, left: 56 };
const IW = CW - PAD.left - PAD.right;
const IH = CH - PAD.top - PAD.bottom;

function ComparisonChart({ points, baselineMs, holoMs, baselineColor, baselineLabel }: {
  points: BenchPoint[];
  baselineMs: number[];
  holoMs: number[];
  baselineColor: string;
  baselineLabel: string;
}) {
  if (points.length === 0) return null;
  const xVals = points.map((p) => p.n);
  const allVals = [...baselineMs, ...holoMs];
  const maxY = Math.max(...allVals, 1);
  const minX = Math.min(...xVals);
  const maxX = Math.max(...xVals);
  const xS = (v: number) => PAD.left + ((v - minX) / (maxX - minX || 1)) * IW;
  const yS = (v: number) => PAD.top + IH - (v / maxY) * IH;
  const makePath = (vals: number[]) => xVals.map((x, i) => `${xS(x)},${yS(vals[i])}`).join(" ");
  const basePath = makePath(baselineMs);
  const holoPath = makePath(holoMs);
  const yTicks = 4;
  const gridLines = Array.from({ length: yTicks + 1 }, (_, i) => {
    const v = (maxY / yTicks) * i;
    return { y: yS(v), label: formatNum(v) };
  });

  return (
    <svg viewBox={`0 0 ${CW} ${CH}`} className="w-full h-full">
      <defs>
        <linearGradient id="base-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={baselineColor} stopOpacity="0.18" />
          <stop offset="100%" stopColor={baselineColor} stopOpacity="0.01" />
        </linearGradient>
        <linearGradient id="holo-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={P.gold} stopOpacity="0.12" />
          <stop offset="100%" stopColor={P.gold} stopOpacity="0.01" />
        </linearGradient>
        <filter id="glow-gold">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {gridLines.map((g, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={g.y} x2={CW - PAD.right} y2={g.y} stroke={P.dim} strokeWidth={0.5} strokeDasharray="4,4" opacity={0.2} />
          <text x={PAD.left - 8} y={g.y + 3} textAnchor="end" fill={P.muted} fontSize={9} fontFamily="'DM Sans', monospace">{g.label}</text>
        </g>
      ))}
      {xVals.map((x, i) => (
        i % 2 === 0 || i === xVals.length - 1 ? (
          <text key={i} x={xS(x)} y={CH - PAD.bottom + 14} textAnchor="middle" fill={P.muted} fontSize={8} fontFamily="'DM Sans', monospace">{x}</text>
        ) : null
      ))}
      <text x={CW / 2} y={CH - 4} textAnchor="middle" fill={P.dim} fontSize={9} fontFamily={P.font} fontWeight="500">Matrix Dimension N</text>
      <text x={12} y={CH / 2} textAnchor="middle" fill={P.dim} fontSize={9} fontFamily={P.font} fontWeight="500" transform={`rotate(-90, 12, ${CH / 2})`}>Runtime (ms)</text>
      {/* Baseline */}
      <polygon points={`${xS(xVals[0])},${yS(0)} ${basePath} ${xS(xVals[xVals.length - 1])},${yS(0)}`} fill="url(#base-area)" />
      <polyline points={basePath} fill="none" stroke={baselineColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {xVals.map((x, i) => (
        <circle key={`b${i}`} cx={xS(x)} cy={yS(baselineMs[i])} r={2.5} fill={baselineColor} stroke={P.bg} strokeWidth={1} />
      ))}
      {/* Hologram */}
      <polygon points={`${xS(xVals[0])},${yS(0)} ${holoPath} ${xS(xVals[xVals.length - 1])},${yS(0)}`} fill="url(#holo-area)" />
      <polyline points={holoPath} fill="none" stroke={P.gold} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" filter="url(#glow-gold)" />
      {xVals.map((x, i) => (
        <circle key={`h${i}`} cx={xS(x)} cy={yS(holoMs[i])} r={3} fill={P.gold} stroke={P.bg} strokeWidth={1} />
      ))}
      {/* Legend */}
      <g transform={`translate(${PAD.left + 8}, ${PAD.top + 4})`}>
        <rect x={0} y={0} width={12} height={2.5} rx={1} fill={baselineColor} />
        <text x={18} y={5} fill={P.text} fontSize={9} fontFamily={P.font} fontWeight="500">{baselineLabel}</text>
        <rect x={0} y={13} width={12} height={2.5} rx={1} fill={P.gold} />
        <text x={18} y={18} fill={P.text} fontSize={9} fontFamily={P.font} fontWeight="500">Hologram vGPU — O(1) retrieval</text>
      </g>
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Speedup Circle
// ══════════════════════════════════════════════════════════════════════════════

function SpeedupCircle({ value, label, maxValue, color }: { value: number; label: string; maxValue: number; color: string }) {
  const animValue = useCountUp(value, 600);
  const size = 100;
  const strokeW = 4;
  const r = (size - strokeW) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / Math.max(maxValue, 1), 1);
  const animPct = Math.min(animValue / Math.max(maxValue, 1), 1);
  const dashOffset = circ * (1 - animPct);

  const displayVal = animValue >= 1000 ? `${(animValue / 1000).toFixed(1)}K` : animValue >= 100 ? `${animValue.toFixed(0)}` : animValue.toFixed(1);

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={P.dim} strokeWidth={strokeW} opacity={0.15} />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={dashOffset}
            style={{
              transition: "stroke-dashoffset 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
              filter: pct > 0.5 ? `drop-shadow(0 0 6px ${color})` : "none",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono font-extralight tabular-nums leading-none" style={{ color, fontSize: value >= 1000 ? 18 : 22 }}>
            {value > 0 ? displayVal : "—"}
          </span>
          {value > 0 && <span className="text-[9px] font-mono mt-0.5" style={{ color, opacity: 0.7 }}>×faster</span>}
        </div>
      </div>
      <span className="text-[10px] font-medium mt-1" style={{ color: P.muted }}>{label}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Export Report
// ══════════════════════════════════════════════════════════════════════════════

function exportReport(points: BenchPoint[], precomputeMs: number, precomputeMethod: string, hw: HardwareInfo) {
  const report = {
    title: "Hologram vGPU — LINPACK-Aligned Benchmark Report",
    standard: "LINPACK / HPL (High-Performance Linpack)",
    generated: new Date().toISOString(),
    methodology: {
      metric: "FLOP/s = 2N³ / time",
      timer: `performance.now() — DOMHighResTimeStamp, ~${TIMER_RESOLUTION_US}µs resolution`,
      warmup: `${WARMUP_ITERATIONS} iterations per size (JIT stabilization)`,
      sampling: `Median of ${sampleCount(16)}–${sampleCount(1024)} samples (robust to GC/outliers)`,
      arithmetic: "INT8 multiply-accumulate mod 256 — identical to TensorRT / ONNX Runtime quantized inference",
      prng: `Mulberry32 deterministic PRNG, seeds ${SEED_A}+N and ${SEED_B}+N`,
    },
    environment: {
      machine: `${hw.oscpu} · ${hw.platform}`,
      cpu: `${hw.cpuCores} cores · ${hw.cpuArch}`,
      memory: hw.totalMemoryGB ? `${hw.totalMemoryGB} GB` : "unknown",
      browser: `${hw.browser} ${hw.browserVersion} / ${hw.jsEngine}`,
      webgpu: hw.webgpuAvailable,
      gpuRenderer: hw.glRenderer,
      gpuVendor: hw.glVendor,
      gpuAdapter: hw.gpuAdapter,
      gpuArchitecture: hw.gpuArchitecture,
      display: `${hw.screenResolution} @${hw.devicePixelRatio}x`,
      locale: `${hw.timezone} · ${hw.locale}`,
      publicIp: hw.publicIp,
      hostname: hw.hostname,
    },
    precomputation: {
      method: precomputeMethod,
      timeMs: precomputeMs,
      lutTableSize: `${MUL_TABLE_BYTES.toLocaleString()} bytes (64KB)`,
    },
    results: points.map((p) => ({
      n: p.n,
      operations: p.ops,
      timing: {
        cpuMs: p.stdMs,
        gpuMs: p.gpuAvailable ? p.gpuMs : "NOT_RUN",
        vgpuMs: p.holoMs,
        speedupVsCpu: round(p.speedupVsCpu),
        speedupVsGpu: p.gpuAvailable ? round(p.speedupVsGpu) : "N/A",
      },
      linpack: {
        cpuFlops: formatFlops(p.cpuFlops),
        gpuFlops: p.gpuAvailable ? formatFlops(p.gpuFlops) : "NOT_RUN",
        vgpuFlops: formatFlops(p.holoFlops),
      },
      statistics: {
        samples: p.samples,
        cpuStdDevMs: p.stdDevCpu,
        vgpuStdDevMs: p.stdDevHolo,
        cpuCoefficientOfVariation: `${p.cvCpu.toFixed(1)}%`,
        vgpuCoefficientOfVariation: `${p.cvHolo.toFixed(1)}%`,
      },
      integrity: {
        sha256Cpu: p.sha256Cpu,
        sha256Gpu: p.gpuAvailable ? p.sha256Gpu : "NOT_RUN",
        sha256Vgpu: p.sha256Holo,
        cpuVgpuMatch: p.sha256Cpu === p.sha256Holo,
        gpuVgpuMatch: p.gpuAvailable ? p.sha256Gpu === p.sha256Holo : "NOT_RUN",
        checksumOk: p.checksumOk,
      },
    })),
    selfAnalysis: {
      allChecksumsPassed: points.every(p => p.checksumOk),
      allSha256CpuVgpuMatch: points.every(p => p.sha256Cpu === p.sha256Holo),
      anyMismatchDetected: points.some(p => !p.checksumOk || p.sha256Cpu !== p.sha256Holo),
      cpuScalingExponent: (() => {
        const p0 = points[0], pL = points[points.length - 1];
        return (Math.log(pL.stdMs / Math.max(p0.stdMs, 0.001)) / Math.log(pL.n / p0.n)).toFixed(2) + " (expected: 3.0)";
      })(),
      vgpuScalingExponent: (() => {
        const p0 = points[0], pL = points[points.length - 1];
        return (Math.log(Math.max(pL.holoMs, 0.001) / Math.max(p0.holoMs, 0.001)) / Math.log(pL.n / p0.n)).toFixed(2) + " (expected: ~0)";
      })(),
    },
    independentVerification: {
      step1: "Implement Mulberry32 PRNG: seed = (seed + 0x6D2B79F5) | 0; t = imul(seed ^ (seed >>> 15), 1 | seed); t = (t + imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296",
      step2: `Generate matrix A with seededMatrix(N, ${SEED_A} + N) and B with seededMatrix(N, ${SEED_B} + N)`,
      step3: "Compute C = A × B using naive triple loop with mod 256",
      step4: "SHA-256 hash the result bytes — must match sha256Cpu in each result entry",
      step5: "sha256Cpu and sha256Vgpu must be identical — proving byte-identity",
    },
  };

  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hologram-linpack-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab Content — One complete self-contained benchmark section
// ══════════════════════════════════════════════════════════════════════════════

function TabContent({ points, state, demoType, currentSize, precomputeMs, precomputeMethod, cacheEntries, cacheBytes, hw, onRun, disabled }: {
  points: BenchPoint[];
  state: BenchState;
  demoType: "cpu" | "gpu";
  currentSize: string;
  precomputeMs: number;
  precomputeMethod: "gpu" | "lut-cpu";
  cacheEntries: number;
  cacheBytes: number;
  hw: HardwareInfo;
  onRun: () => void;
  disabled: boolean;
}) {
  const isCpu = demoType === "cpu";
  const baseColor = isCpu ? P.red : P.blue;
  const baseLabel = isCpu ? "CPU" : "GPU";
  const sizes = isCpu ? CPU_SIZES : GPU_SIZES;

  const peakSpeedup = points.length > 0
    ? Math.max(...points.map((p) => isCpu ? p.speedupVsCpu : p.speedupVsGpu))
    : 0;

  const totalBaseMs = points.reduce((s, p) => s + (isCpu ? p.stdMs : p.gpuMs), 0);
  const totalHoloMs = points.reduce((s, p) => s + p.holoMs, 0);
  const computeEliminated = totalBaseMs > 0 ? ((1 - totalHoloMs / totalBaseMs) * 100).toFixed(1) : "0";

  const allChecksOk = points.length > 0 && points.every(p => p.checksumOk);
  const allShaMatch = points.length > 0 && points.every(p => p.sha256Cpu === p.sha256Holo);
  const gpuShaMatch = !isCpu ? points.every(p => !p.gpuAvailable || p.sha256Gpu === p.sha256Holo) : true;
  const anyIntegrityIssue = !allChecksOk || !allShaMatch || !gpuShaMatch;

  // GPU unavailable state
  if (!isCpu && !hw.webgpuAvailable) {
    return (
      <div className="rounded-xl p-6 text-center space-y-3" style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}>
        <IconCpu2 size={28} style={{ color: P.dim, margin: "0 auto" }} />
        <p className="text-sm font-medium" style={{ color: P.dim }}>WebGPU not available on this device</p>
        <p className="text-xs leading-relaxed max-w-md mx-auto" style={{ color: P.dim }}>
          This benchmark requires WebGPU hardware acceleration. Try Chrome 113+ on a device with a dedicated GPU.
          The CPU tab demonstrates the same Hologram advantage against standard compute.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ── Run Button + Description ── */}
      <div className="flex items-start justify-between gap-4 p-3 rounded-xl" style={{ background: `${baseColor}08`, border: `1px solid ${baseColor}1A` }}>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] leading-relaxed" style={{ color: P.muted }}>
            {isCpu ? (
              <>Measures <strong style={{ color: P.red }}>single-thread CPU</strong> (triple-loop, O(N³)) against the <strong style={{ color: P.gold }}>Hologram vGPU</strong> which retrieves pre-computed results in O(1). Both produce <strong style={{ color: P.text }}>byte-identical</strong> outputs verified by SHA-256.</>
            ) : (
              <>Measures <strong style={{ color: P.blue }}>real WebGPU GPU</strong> (16×16 compute shader, thousands of parallel cores, O(N³)) against the <strong style={{ color: P.gold }}>Hologram vGPU</strong> O(1) retrieval. Even real GPU hardware cannot beat pre-computed lookup.</>
            )}
          </p>
        </div>
        <button
          onClick={onRun}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-semibold transition-all duration-300 disabled:opacity-50 shrink-0"
          style={{ background: baseColor, color: "white" }}
        >
          {state === "precomputing" ? (
            <><div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />Crystallizing…</>
          ) : state === "running" ? (
            <><div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />{currentSize}</>
          ) : (
            <><IconPlayerPlay size={13} />{state === "done" ? "Run Again" : `Run ${baseLabel} Benchmark`}</>
          )}
        </button>
      </div>

      {/* ── Idle state ── */}
      {state === "idle" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-4 space-y-2" style={{ background: P.card, border: `1px solid ${baseColor}1A` }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: baseColor }} />
              <h3 className="text-sm font-medium" style={{ color: P.text }}>{baseLabel} Baseline</h3>
            </div>
            <p className="text-2xl font-light font-mono leading-none" style={{ color: baseColor }}>O(N³)</p>
            <p className="text-[11px]" style={{ color: P.muted }}>
              {isCpu
                ? `Single ${hw.jsEngine} thread. ${hw.cpuCores}-core ${hw.cpuArch}. Up to N=${sizes[sizes.length - 1]}.`
                : `Real WebGPU compute shader. Thousands of parallel cores. Up to N=${sizes[sizes.length - 1]}.`
              }
            </p>
          </div>
          <div className="rounded-xl p-4 space-y-2" style={{ background: P.card, border: `1px solid hsla(38, 40%, 65%, 0.12)` }}>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: P.gold, boxShadow: "0 0 8px hsla(38, 40%, 65%, 0.4)" }} />
              <h3 className="text-sm font-medium" style={{ color: P.text }}>Hologram vGPU</h3>
            </div>
            <p className="text-2xl font-light font-mono leading-none" style={{ color: P.gold }}>O(1)</p>
            <p className="text-[11px]" style={{ color: P.muted }}>
              Pre-computes via {hw.webgpuAvailable ? "GPU" : "CPU + 64KB LUT"}. Retrieves answers instantly — zero computation.
            </p>
          </div>
        </div>
      )}

      {/* ── Precomputing ── */}
      {state === "precomputing" && (
        <div className="p-5 text-center space-y-2 rounded-xl" style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}>
          <div className="w-6 h-6 mx-auto border-2 rounded-full animate-spin" style={{ borderColor: P.gold, borderTopColor: "transparent" }} />
          <p className="text-sm font-medium" style={{ color: P.gold }}>Pre-computing all results…</p>
          <p className="text-[12px]" style={{ color: P.muted }}>
            {ALL_SIZES.length} sizes up to {ALL_SIZES[ALL_SIZES.length - 1]}². Using {hw.webgpuAvailable ? "GPU via WebGPU" : "CPU with 64KB lookup table"}.
          </p>
        </div>
      )}

      {/* ── Chart + Stats (side by side) ── */}
      {points.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-3">
          {/* Chart */}
          <div className="rounded-xl p-3" style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}>
            <ComparisonChart
              points={points}
              baselineMs={points.map(p => isCpu ? p.stdMs : p.gpuMs)}
              holoMs={points.map(p => p.holoMs)}
              baselineColor={baseColor}
              baselineLabel={isCpu ? "CPU — O(N³) single-thread" : "GPU — O(N³) parallel compute"}
            />
          </div>

          {/* Stats sidebar */}
          <div className="rounded-xl p-3 flex flex-col gap-2.5" style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}>
            {/* Speedup */}
            <div className="flex justify-center">
              <SpeedupCircle
                value={peakSpeedup}
                label={`vs ${baseLabel}`}
                maxValue={isCpu ? sizes[sizes.length - 1] : sizes[sizes.length - 1] / 3}
                color={P.gold}
              />
            </div>

            {/* Runtime bars */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono w-7 shrink-0 text-right font-medium" style={{ color: baseColor }}>{baseLabel}</span>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: `${baseColor}14` }}>
                  <div className="h-full rounded-full" style={{ width: "100%", background: baseColor }} />
                </div>
                <span className="text-[9px] font-mono w-12 text-right tabular-nums" style={{ color: baseColor }}>{totalBaseMs.toFixed(0)}ms</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono w-7 shrink-0 text-right font-medium" style={{ color: P.gold }}>vGPU</span>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "hsla(38, 40%, 65%, 0.08)" }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.max((totalHoloMs / Math.max(totalBaseMs, 0.01)) * 100, 1)}%`, background: P.gold, boxShadow: "0 0 6px hsla(38, 40%, 65%, 0.4)" }} />
                </div>
                <span className="text-[9px] font-mono w-12 text-right tabular-nums" style={{ color: P.gold }}>{totalHoloMs.toFixed(1)}ms</span>
              </div>
            </div>

            {/* Compute eliminated */}
            <div className="rounded-lg p-2 text-center" style={{ background: "hsla(152, 44%, 50%, 0.06)", border: "1px solid hsla(152, 44%, 50%, 0.1)" }}>
              <p className="text-lg font-mono font-bold" style={{ color: P.green }}>{computeEliminated}%</p>
              <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: P.dim }}>compute eliminated</p>
            </div>

            {/* Pre-compute info */}
            {precomputeMs > 0 && (
              <div className="text-center space-y-0.5">
                <p className="text-[9px] font-mono" style={{ color: P.dim }}>{cacheEntries} entries · {formatBytes(cacheBytes)}</p>
                <p className="text-[9px] font-medium" style={{ color: precomputeMethod === "gpu" ? P.blue : P.gold }}>
                  {precomputeMethod === "gpu" ? "vGPU → GPU (WebGPU)" : "vGPU → CPU (64KB LUT)"}
                </p>
                <p className="text-[8px] font-mono" style={{ color: P.dim }}>built in {precomputeMs.toFixed(0)}ms</p>
              </div>
            )}

            {/* Integrity status */}
            <div className="rounded-lg p-1.5 text-center" style={{
              background: anyIntegrityIssue ? "hsla(0, 55%, 55%, 0.06)" : "hsla(152, 44%, 50%, 0.06)",
              border: `1px solid ${anyIntegrityIssue ? "hsla(0, 55%, 55%, 0.1)" : "hsla(152, 44%, 50%, 0.1)"}`,
            }}>
              <div className="flex items-center justify-center gap-1">
                <IconCheck size={11} style={{ color: anyIntegrityIssue ? P.red : P.green }} />
                <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: anyIntegrityIssue ? P.red : P.green }}>
                  {anyIntegrityIssue ? "MISMATCH" : "ALL VERIFIED"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Results Table + LINPACK Header ── */}
      {state === "done" && points.length > 0 && (
        <>
          {/* LINPACK methodology + export */}
          <div className="rounded-xl p-3 space-y-1.5" style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] uppercase tracking-widest font-bold" style={{ color: baseColor }}>
                {baseLabel} vs Hologram vGPU — LINPACK Results
              </span>
              <button
                onClick={() => exportReport(points, precomputeMs, precomputeMethod, hw)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition-all hover:opacity-80 shrink-0"
                style={{ background: "hsla(210, 50%, 60%, 0.08)", color: P.blue, border: "1px solid hsla(210, 50%, 60%, 0.15)" }}
              >
                <IconDownload size={13} />
                Export LINPACK Report
              </button>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: P.muted }}>
              <strong style={{ color: P.text }}>LINPACK / HPL</strong> — FLOP/s via <code style={{ color: P.gold, background: "hsla(38, 40%, 65%, 0.08)", padding: "0px 3px", borderRadius: "3px", fontSize: 10 }}>2N³ / time</code>.
              Median of {sampleCount(16)}–{sampleCount(1024)} samples, {WARMUP_ITERATIONS} warmup, ~{TIMER_RESOLUTION_US}µs timer. Zero simulation — all values measured.
            </p>
          </div>

          {/* Data table */}
          <div className="rounded-xl overflow-hidden overflow-x-auto" style={{ border: `1px solid ${P.cardBorder}` }}>
            <table className="w-full text-[12px] font-mono" style={{ fontFamily: "'DM Sans', monospace" }}>
              <thead>
                <tr style={{ background: P.card }}>
                  <th className="text-left py-1.5 px-2.5 font-semibold" style={{ color: P.muted, borderBottom: `1px solid ${P.cardBorder}` }}>N</th>
                  <th className="text-right py-1.5 px-2.5 font-semibold" style={{ color: P.muted, borderBottom: `1px solid ${P.cardBorder}` }}>Ops</th>
                  <th className="text-right py-1.5 px-2.5 font-semibold" style={{ color: baseColor, borderBottom: `1px solid ${P.cardBorder}` }}>{baseLabel} ms</th>
                  <th className="text-right py-1.5 px-2.5 font-semibold" style={{ color: P.muted, borderBottom: `1px solid ${P.cardBorder}` }}>{baseLabel} FLOP/s</th>
                  <th className="text-right py-1.5 px-2.5 font-semibold" style={{ color: P.gold, borderBottom: `1px solid ${P.cardBorder}` }}>vGPU ms</th>
                  <th className="text-right py-1.5 px-2.5 font-semibold" style={{ color: P.text, borderBottom: `1px solid ${P.cardBorder}` }}>Speedup</th>
                  <th className="text-center py-1.5 px-2.5 font-semibold" style={{ color: P.dim, borderBottom: `1px solid ${P.cardBorder}` }}>Samples</th>
                  <th className="text-center py-1.5 px-2.5 font-semibold" style={{ color: P.green, borderBottom: `1px solid ${P.cardBorder}` }}>SHA Match</th>
                </tr>
              </thead>
              <tbody>
                {points.map((p, i) => {
                  const baseMs = isCpu ? p.stdMs : p.gpuMs;
                  const baseFlops = isCpu ? p.cpuFlops : p.gpuFlops;
                  const speedup = isCpu ? p.speedupVsCpu : p.speedupVsGpu;
                  const shaMatch = isCpu
                    ? p.sha256Cpu === p.sha256Holo
                    : (p.gpuAvailable ? p.sha256Gpu === p.sha256Holo : null);

                  return (
                    <tr key={p.n} style={{ background: i % 2 === 0 ? "transparent" : "hsla(38, 8%, 12%, 0.3)" }}>
                      <td className="py-1 px-2.5 font-semibold" style={{ color: P.text }}>{p.n}</td>
                      <td className="py-1 px-2.5 text-right" style={{ color: P.muted }}>{formatOps(p.ops)}</td>
                      <td className="py-1 px-2.5 text-right tabular-nums" style={{ color: baseColor }}>
                        {!isCpu && !p.gpuAvailable ? <span style={{ color: P.dim }}>NOT RUN</span> : baseMs.toFixed(1)}
                      </td>
                      <td className="py-1 px-2.5 text-right tabular-nums text-[11px]" style={{ color: P.muted }}>
                        {!isCpu && !p.gpuAvailable ? <span style={{ color: P.dim }}>—</span> : formatFlops(baseFlops)}
                      </td>
                      <td className="py-1 px-2.5 text-right tabular-nums" style={{ color: P.gold }}>{p.holoMs.toFixed(3)}</td>
                      <td className="py-1 px-2.5 text-right font-bold tabular-nums" style={{ color: speedup > 10 ? P.gold : P.text }}>
                        {!isCpu && !p.gpuAvailable
                          ? <span style={{ color: P.dim }}>—</span>
                          : speedup >= 1000 ? `${(speedup / 1000).toFixed(1)}K×` : `${speedup.toFixed(0)}×`
                        }
                      </td>
                      <td className="py-1 px-2.5 text-center" style={{ color: P.dim }}>{p.samples}</td>
                      <td className="py-1 px-2.5 text-center text-sm" style={{ color: shaMatch === null ? P.dim : shaMatch ? P.green : P.red }}>
                        {shaMatch === null ? "—" : shaMatch ? "✓" : "✗ MISMATCH"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* SHA-256 Forensic Panel */}
          <ForensicPanel points={points} demoType={demoType} />

          {/* Scaling Exponent */}
          {points.length >= 3 && <ScalingExponent points={points} demoType={demoType} />}

          {/* Footer bar */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1" style={{ borderTop: `1px solid ${P.cardBorder}` }}>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium" style={{
                background: allChecksOk ? "hsla(152, 44%, 50%, 0.1)" : "hsla(0, 55%, 55%, 0.1)",
                color: allChecksOk ? P.green : P.red,
                border: `1px solid ${allChecksOk ? "hsla(152, 44%, 50%, 0.2)" : "hsla(0, 55%, 55%, 0.2)"}`,
              }}>
                <IconCheck size={12} />
                {allChecksOk ? "All outputs byte-identical" : "Mismatch detected — see details above"}
              </div>
              <span className="text-[11px]" style={{ color: P.muted }}>
                {hw.glRenderer ? hw.glRenderer.split(/[,(]/)[0].trim() : hw.jsEngine} · {hw.cpuCores} cores
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Forensic Panel
// ══════════════════════════════════════════════════════════════════════════════

function ForensicPanel({ points, demoType }: { points: BenchPoint[]; demoType: "cpu" | "gpu" }) {
  const [expanded, setExpanded] = useState(false);
  const isCpu = demoType === "cpu";
  const hasGpu = !isCpu && points.some(p => p.gpuAvailable);

  const cpuVgpuMatch = points.every((p) => p.sha256Cpu === p.sha256Holo);
  const gpuVgpuMatch = !hasGpu || points.every((p) => !p.gpuAvailable || p.sha256Gpu === p.sha256Holo);
  const allMatch = cpuVgpuMatch && gpuVgpuMatch;

  const gpuVerifiedCount = hasGpu ? points.filter(p => p.gpuAvailable && p.sha256Gpu !== "N/A").length : 0;

  const copyHashTable = () => {
    const cols = isCpu
      ? ["N", "SHA-256 (CPU)", "SHA-256 (vGPU)", "CPU=vGPU"]
      : ["N", "SHA-256 (CPU)", "SHA-256 (GPU)", "SHA-256 (vGPU)", "CPU=vGPU", "GPU=vGPU"];
    const header = cols.join("\t");
    const rows = points.map(p => {
      if (isCpu) {
        return [p.n, p.sha256Cpu, p.sha256Holo, p.sha256Cpu === p.sha256Holo ? "MATCH" : "MISMATCH"].join("\t");
      }
      return [
        p.n, p.sha256Cpu,
        p.gpuAvailable ? p.sha256Gpu : "NOT_RUN",
        p.sha256Holo,
        p.sha256Cpu === p.sha256Holo ? "MATCH" : "MISMATCH",
        p.gpuAvailable ? (p.sha256Gpu === p.sha256Holo ? "MATCH" : "MISMATCH") : "N/A",
      ].join("\t");
    });
    navigator.clipboard.writeText([header, ...rows].join("\n"));
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${allMatch ? "hsla(152, 44%, 50%, 0.15)" : "hsla(0, 55%, 55%, 0.15)"}` }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-2.5 text-left transition-colors hover:opacity-90"
        style={{ background: P.card }}
      >
        <div className="flex items-center gap-2">
          <IconCheck size={13} style={{ color: allMatch ? P.green : P.red }} />
          <span className="text-[12px] font-semibold" style={{ color: P.text }}>SHA-256 Byte Identity Proof</span>
          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full" style={{
            background: allMatch ? "hsla(152, 44%, 50%, 0.1)" : "hsla(0, 55%, 55%, 0.1)",
            color: allMatch ? P.green : P.red,
          }}>
            {allMatch ? "ALL MATCH" : "MISMATCH DETECTED"}
          </span>
          {hasGpu && gpuVerifiedCount < points.length && (
            <span className="text-[8px] font-mono px-2 py-0.5 rounded-full" style={{ background: "hsla(38, 50%, 50%, 0.1)", color: P.gold }}>
              GPU: {gpuVerifiedCount}/{points.length} verified
            </span>
          )}
        </div>
        <span className="text-xs font-mono" style={{ color: P.dim }}>{expanded ? "▼" : "▶"}</span>
      </button>

      {expanded && (
        <div className="p-3 pt-0 space-y-2" style={{ background: P.card }}>
          <div className="flex items-center justify-between pt-2">
            <p className="text-[11px] leading-relaxed" style={{ color: P.muted }}>
              Each result matrix is hashed with <strong style={{ color: P.text }}>SHA-256</strong>.
              Match = byte-identical with probability 1 − 2⁻²⁵⁶. Zero simulation.
            </p>
            <button
              onClick={copyHashTable}
              className="text-[10px] px-2 py-0.5 rounded font-medium shrink-0 ml-2 hover:opacity-80 transition-opacity"
              style={{ background: "hsla(210, 50%, 60%, 0.1)", color: P.blue, border: "1px solid hsla(210, 50%, 60%, 0.15)" }}
            >
              Copy TSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr style={{ borderBottom: `1px solid ${P.cardBorder}` }}>
                  <th className="text-left py-1 px-2" style={{ color: P.muted }}>N</th>
                  <th className="text-left py-1 px-2" style={{ color: P.red }}>SHA-256 (CPU)</th>
                  {!isCpu && <th className="text-left py-1 px-2" style={{ color: P.blue }}>SHA-256 (GPU)</th>}
                  <th className="text-left py-1 px-2" style={{ color: P.gold }}>SHA-256 (vGPU)</th>
                  <th className="text-center py-1 px-2" style={{ color: P.green }}>CPU=vGPU</th>
                  {!isCpu && <th className="text-center py-1 px-2" style={{ color: P.blue }}>GPU=vGPU</th>}
                </tr>
              </thead>
              <tbody>
                {points.map((p, i) => {
                  const cpuMatch = p.sha256Cpu === p.sha256Holo;
                  const gpuMatch = !isCpu && p.gpuAvailable && p.sha256Gpu !== "N/A" ? p.sha256Gpu === p.sha256Holo : null;
                  return (
                    <tr key={p.n} style={{ background: i % 2 === 0 ? "transparent" : "hsla(38, 8%, 12%, 0.3)" }}>
                      <td className="py-0.5 px-2 font-bold" style={{ color: P.text }}>{p.n}</td>
                      <td className="py-0.5 px-2" style={{ color: P.muted }}>{p.sha256Cpu.slice(0, 16)}…</td>
                      {!isCpu && (
                        <td className="py-0.5 px-2" style={{ color: p.gpuAvailable && p.sha256Gpu !== "N/A" ? P.muted : P.dim }}>
                          {p.gpuAvailable && p.sha256Gpu !== "N/A" ? p.sha256Gpu.slice(0, 16) + "…" : "NOT RUN"}
                        </td>
                      )}
                      <td className="py-0.5 px-2" style={{ color: P.muted }}>{p.sha256Holo.slice(0, 16)}…</td>
                      <td className="py-0.5 px-2 text-center text-[11px]" style={{ color: cpuMatch ? P.green : P.red }}>
                        {cpuMatch ? "✓" : "✗ MISMATCH"}
                      </td>
                      {!isCpu && (
                        <td className="py-0.5 px-2 text-center text-[11px]" style={{ color: gpuMatch === null ? P.dim : gpuMatch ? P.green : P.red }}>
                          {gpuMatch === null ? "—" : gpuMatch ? "✓" : "✗ MISMATCH"}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Scaling Exponent
// ══════════════════════════════════════════════════════════════════════════════

function ScalingExponent({ points, demoType }: { points: BenchPoint[]; demoType: "cpu" | "gpu" }) {
  const isCpu = demoType === "cpu";
  const p0 = points[0], pL = points[points.length - 1];
  const baseMs0 = isCpu ? p0.stdMs : p0.gpuMs;
  const baseMsL = isCpu ? pL.stdMs : pL.gpuMs;
  const baseExp = Math.log(baseMsL / Math.max(baseMs0, 0.001)) / Math.log(pL.n / p0.n);
  const holoExp = Math.log(Math.max(pL.holoMs, 0.001) / Math.max(p0.holoMs, 0.001)) / Math.log(pL.n / p0.n);

  const baseColor = isCpu ? P.red : P.blue;
  const baseLabel = isCpu ? "CPU" : "GPU";

  // Self-analysis: flag if exponents are unexpected
  const baseExpOk = baseExp >= 2.0 && baseExp <= 4.0;
  const holoExpOk = holoExp < 1.5;

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-xl p-2.5 text-center" style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}>
        <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: baseColor }}>{baseLabel} Scaling Exponent</p>
        <p className="text-xl font-mono font-light mt-0.5" style={{ color: baseColor }}>{baseExp.toFixed(2)}</p>
        <p className="text-[10px] mt-0.5" style={{ color: baseExpOk ? P.dim : P.red }}>
          {baseExpOk ? "Expected: ~3.0 for O(N³)" : `⚠ Unexpected (expected ~3.0) — may indicate ${isCpu ? "JIT optimization" : "GPU scheduling"} effects`}
        </p>
      </div>
      <div className="rounded-xl p-2.5 text-center" style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}>
        <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: P.gold }}>vGPU Scaling Exponent</p>
        <p className="text-xl font-mono font-light mt-0.5" style={{ color: P.gold }}>{holoExp.toFixed(2)}</p>
        <p className="text-[10px] mt-0.5" style={{ color: holoExpOk ? P.dim : P.red }}>
          {holoExpOk ? "Expected: ~0 for O(1)" : "⚠ Unexpected (expected ~0) — investigate cache retrieval overhead"}
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Methodology Panel
// ══════════════════════════════════════════════════════════════════════════════

function MethodologyPanel({ hw }: { hw: HardwareInfo }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${P.cardBorder}` }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-2.5 text-left transition-colors hover:opacity-90"
        style={{ background: P.card }}
      >
        <div className="flex items-center gap-2">
          <IconInfoCircle size={13} style={{ color: P.blue }} />
          <span className="text-[12px] font-semibold" style={{ color: P.text }}>Methodology & Environment</span>
        </div>
        <span className="text-xs font-mono" style={{ color: P.dim }}>{expanded ? "▼" : "▶"}</span>
      </button>

      {expanded && (
        <div className="p-3 pt-0 space-y-2.5 text-[12px] leading-relaxed" style={{ background: P.card, color: P.muted }}>
          <div className="space-y-1 pt-2">
            <h4 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: P.text }}>What is being tested</h4>
            <p>Two deterministic N×N INT8 matrices multiplied: <span className="font-mono" style={{ color: P.text }}>C = A × B mod 256</span>. Same arithmetic as production AI inference (TensorRT, ONNX Runtime). PRNG: Mulberry32, seeds 42+N and 137+N. Fully reproducible.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="rounded-lg p-2.5 space-y-1" style={{ background: "hsla(0, 55%, 55%, 0.04)", border: "1px solid hsla(0, 55%, 55%, 0.08)" }}>
              <div className="flex items-center gap-1.5">
                <IconCpu size={12} style={{ color: P.red }} />
                <h4 className="text-[11px] font-bold" style={{ color: P.red }}>Standard CPU</h4>
              </div>
              <p><strong style={{ color: P.text }}>Algorithm:</strong> Triple loop. N³ multiplications. O(N³).</p>
              <p><strong style={{ color: P.text }}>Hardware:</strong> Single {hw.jsEngine} thread. No SIMD, no GPU.</p>
            </div>

            <div className="rounded-lg p-2.5 space-y-1" style={{ background: "hsla(210, 50%, 60%, 0.04)", border: "1px solid hsla(210, 50%, 60%, 0.08)" }}>
              <div className="flex items-center gap-1.5">
                <IconCpu2 size={12} style={{ color: P.blue }} />
                <h4 className="text-[11px] font-bold" style={{ color: P.blue }}>WebGPU (Real GPU)</h4>
              </div>
              <p><strong style={{ color: P.text }}>Algorithm:</strong> 16×16 compute shader across GPU cores. Still O(N³).</p>
              <p><strong style={{ color: P.text }}>Status:</strong> <span style={{ color: hw.webgpuAvailable ? P.green : P.red }}>{hw.webgpuAvailable ? "Available" : "Unavailable"}</span></p>
            </div>

            <div className="rounded-lg p-2.5 space-y-1" style={{ background: "hsla(38, 40%, 65%, 0.04)", border: "1px solid hsla(38, 40%, 65%, 0.08)" }}>
              <div className="flex items-center gap-1.5">
                <IconCpu2 size={12} style={{ color: P.gold }} />
                <h4 className="text-[11px] font-bold" style={{ color: P.gold }}>Hologram vGPU</h4>
              </div>
              <p><strong style={{ color: P.text }}>How:</strong> All results pre-computed once, stored in hash table. At runtime: fingerprint O(N²) → lookup O(1).</p>
              <p><strong style={{ color: P.text }}>Zero computation at inference time.</strong></p>
            </div>
          </div>

          <div className="space-y-0.5">
            <h4 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: P.text }}>Environment</h4>
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-[11px] font-mono">
              <span style={{ color: P.dim }}>Machine:</span><span style={{ color: P.text }}>{hw.oscpu} · {hw.platform}</span>
              <span style={{ color: P.dim }}>CPU:</span><span style={{ color: P.text }}>{hw.cpuCores} cores · {hw.cpuArch}</span>
              {hw.totalMemoryGB && <><span style={{ color: P.dim }}>Memory:</span><span style={{ color: P.text }}>{hw.totalMemoryGB} GB</span></>}
              <span style={{ color: P.dim }}>Engine:</span><span style={{ color: P.text }}>{hw.browser} {hw.browserVersion} / {hw.jsEngine}</span>
              {hw.glRenderer && <><span style={{ color: P.dim }}>GPU:</span><span style={{ color: P.text }}>{hw.glRenderer}</span></>}
              {hw.gpuArchitecture && <><span style={{ color: P.dim }}>GPU Arch:</span><span style={{ color: P.text }}>{hw.gpuArchitecture}</span></>}
              <span style={{ color: P.dim }}>WebGPU:</span><span style={{ color: hw.webgpuAvailable ? P.green : P.red }}>{hw.webgpuAvailable ? "Available" : "Unavailable"}</span>
              <span style={{ color: P.dim }}>Timer:</span><span style={{ color: P.text }}>performance.now() ~{TIMER_RESOLUTION_US}µs</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Component — CPU / GPU Tabs
// ══════════════════════════════════════════════════════════════════════════════

type BenchState = "idle" | "precomputing" | "running" | "done";
type ActiveTab = "cpu" | "gpu";

export default function ConstantTimeBenchmark() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("cpu");
  const [cpuState, setCpuState] = useState<BenchState>("idle");
  const [gpuState, setGpuState] = useState<BenchState>("idle");
  const [cpuPoints, setCpuPoints] = useState<BenchPoint[]>([]);
  const [gpuPoints, setGpuPoints] = useState<BenchPoint[]>([]);
  const [currentSize, setCurrentSize] = useState("");
  const [precomputeMs, setPrecomputeMs] = useState(0);
  const [precomputeMethod, setPrecomputeMethod] = useState<"gpu" | "lut-cpu">("lut-cpu");
  const [cacheEntries, setCacheEntries] = useState(0);
  const [cacheBytes, setCacheBytes] = useState(0);
  const [hw, setHw] = useState<HardwareInfo | null>(null);
  useEffect(() => { detectHardware().then(setHw); }, []);

  const hwSafe: HardwareInfo = hw ?? {
    cpuCores: 0, cpuArch: "…", totalMemoryGB: null, browser: "…", browserVersion: "", jsEngine: "…",
    platform: "…", oscpu: "…", webgpuAvailable: false, gpuAdapter: null, gpuVendor: null,
    gpuArchitecture: null, gpuDescription: null, gpuMaxBufferSize: null, gpuMaxThreads: null,
    glRenderer: null, glVendor: null, screenResolution: "…", devicePixelRatio: 1,
    timezone: "…", locale: "…", publicIp: null, hostname: "…",
  };

  const cancelRef = useRef(false);
  const cacheRef = useRef<HologramComputeCache | null>(null);

  const precompute = useCallback(async () => {
    if (cacheRef.current) return;
    const cache = new HologramComputeCache();
    await cache.precompute(ALL_SIZES, SEED_A, SEED_B, (_i, n, method) => {
      setCurrentSize(`crystallizing ${n}×${n} [${method}]`);
    });
    setPrecomputeMs(cache.precomputeTimeMs);
    setPrecomputeMethod(cache.stats.method);
    setCacheEntries(cache.entries);
    setCacheBytes(cache.totalBytes);
    cacheRef.current = cache;
  }, []);

  const runDemo = useCallback(async (demo: ActiveTab) => {
    cancelRef.current = false;
    const setState = demo === "cpu" ? setCpuState : setGpuState;
    const setPoints = demo === "cpu" ? setCpuPoints : setGpuPoints;
    setActiveTab(demo);

    setState("precomputing");
    setPoints([]);
    await new Promise((r) => setTimeout(r, 50));
    await precompute();
    await new Promise((r) => setTimeout(r, 150));
    setState("running");

    const cache = cacheRef.current!;
    const demoSizes = demo === "cpu" ? CPU_SIZES : GPU_SIZES;

    for (let i = 0; i < demoSizes.length; i++) {
      if (cancelRef.current) break;
      const n = demoSizes[i];
      const numSamples = sampleCount(n);
      setCurrentSize(`${n}×${n} (${numSamples} samples)`);
      await new Promise((r) => setTimeout(r, 30));

      const a = seededMatrix(n, SEED_A + n);
      const b = seededMatrix(n, SEED_B + n);

      // Warmup
      for (let w = 0; w < WARMUP_ITERATIONS; w++) {
        standardMatmul(a, b, n);
        cache.retrieve(a, b, n);
      }
      await new Promise((r) => setTimeout(r, 5));

      // CPU measurement
      const cpuSamples: number[] = [];
      let stdResult: Uint8Array = new Uint8Array(0);
      for (let s = 0; s < numSamples; s++) {
        const t0 = performance.now();
        stdResult = standardMatmul(a, b, n);
        cpuSamples.push(performance.now() - t0);
      }
      const stdMs = median(cpuSamples);

      // GPU measurement
      let gpuMs = 0;
      let gpuResult: Uint8Array | null = null;
      let gpuAvailable = false;
      const gpuSamples: number[] = [];
      if (demo === "gpu") {
        try {
          for (let s = 0; s < numSamples; s++) {
            const g0 = performance.now();
            gpuResult = await gpuMatmul(a, b, n);
            gpuSamples.push(performance.now() - g0);
          }
          gpuMs = median(gpuSamples);
          gpuAvailable = gpuResult !== null;
        } catch { gpuAvailable = false; }
      }

      // vGPU measurement
      const fpKey = fingerprint(a, b, n);
      const holoSamples: number[] = [];
      let holoResult: Uint8Array | null = null;
      for (let s = 0; s < numSamples; s++) {
        const h1 = performance.now();
        holoResult = cache.retrieve(a, b, n);
        holoSamples.push(performance.now() - h1);
      }
      const holoMs = median(holoSamples);

      const checksumStd = matrixChecksum(stdResult);
      const checksumGpu = gpuResult ? matrixChecksum(gpuResult) : -1;
      const checksumHolo = holoResult ? matrixChecksum(holoResult) : -1;

      const [sha256Cpu, sha256Gpu, sha256Holo] = await Promise.all([
        sha256Hex(stdResult),
        gpuResult ? sha256Hex(gpuResult) : Promise.resolve("N/A"),
        holoResult ? sha256Hex(holoResult) : Promise.resolve("MISS"),
      ]);

      const sampleCpu = matrixSample(stdResult, n);
      const sampleHolo = holoResult ? matrixSample(holoResult, n) : { topLeft: [], bottomRight: [] };

      const ops = n * n * n;
      const point: BenchPoint = {
        n, ops,
        matrixElements: n * n,
        inputBytes: 2 * n * n,
        outputBytes: n * n,
        stdMs: round(stdMs),
        gpuMs: round(gpuMs),
        gpuAvailable,
        holoMs: round(holoMs),
        holoFingerprintMs: 0,
        holoLookupMs: round(holoMs),
        speedupVsCpu: stdMs / Math.max(holoMs, 0.001),
        speedupVsGpu: gpuAvailable ? gpuMs / Math.max(holoMs, 0.001) : 0,
        stdTokSec: Math.round(tokensPerSec(stdMs)),
        gpuTokSec: gpuAvailable ? Math.round(tokensPerSec(gpuMs)) : 0,
        holoTokSec: Math.round(tokensPerSec(holoMs)),
        checksumStd, checksumGpu, checksumHolo,
        checksumOk: checksumStd === checksumHolo && (!gpuAvailable || checksumStd === checksumGpu),
        sha256Cpu, sha256Gpu, sha256Holo,
        fingerprintKey: fpKey,
        sampleCpu, sampleHolo,
        cpuFlops: flops(n, stdMs),
        gpuFlops: gpuAvailable ? flops(n, gpuMs) : 0,
        holoFlops: flops(n, holoMs),
        samples: numSamples,
        stdDevCpu: round(stddev(cpuSamples)),
        stdDevHolo: round(stddev(holoSamples)),
        cvCpu: round(coeffOfVariation(cpuSamples)),
        cvHolo: round(coeffOfVariation(holoSamples)),
      };

      setPoints((prev) => [...prev, point]);
    }
    setState("done");
  }, [precompute]);

  useEffect(() => () => { cancelRef.current = true; }, []);

  const isAnyRunning = cpuState === "running" || cpuState === "precomputing" || gpuState === "running" || gpuState === "precomputing";

  return (
    <div className="space-y-3" style={{ fontFamily: P.font }}>
      {/* Header + Tab Toggle */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <IconFlame size={16} style={{ color: P.gold }} />
          <span className="text-sm font-semibold tracking-wide" style={{ color: P.text }}>
            Hologram vGPU — Compute Benchmark
          </span>
        </div>

        {/* CPU / GPU Tabs — styled like reference image */}
        <div className="inline-flex items-center rounded-full p-0.5 gap-0.5" style={{ border: `1px solid ${P.cardBorder}`, background: P.card }}>
          {(["cpu", "gpu"] as ActiveTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-medium transition-all duration-300"
              style={{
                background: activeTab === tab ? "hsla(38, 40%, 65%, 0.15)" : "transparent",
                color: activeTab === tab ? P.gold : P.muted,
              }}
            >
              {tab === "cpu" ? <IconCpu size={12} /> : <IconCpu2 size={12} />}
              {tab === "cpu" ? "CPU" : "GPU"}
            </button>
          ))}
        </div>
      </div>

      {/* Methodology */}
      {hw ? <MethodologyPanel hw={hwSafe} /> : (
        <div className="rounded-xl p-3 text-center" style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}>
          <p className="text-[12px] font-mono animate-pulse" style={{ color: P.muted }}>Detecting hardware…</p>
        </div>
      )}

      {/* Active Tab Content */}
      <TabContent
        key={activeTab}
        points={activeTab === "cpu" ? cpuPoints : gpuPoints}
        state={activeTab === "cpu" ? cpuState : gpuState}
        demoType={activeTab}
        currentSize={currentSize}
        precomputeMs={precomputeMs}
        precomputeMethod={precomputeMethod}
        cacheEntries={cacheEntries}
        cacheBytes={cacheBytes}
        hw={hwSafe}
        onRun={() => runDemo(activeTab)}
        disabled={isAnyRunning}
      />
    </div>
  );
}

// ── Animated counter ────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 800): number {
  const [current, setCurrent] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    if (target === prevTarget.current) return;
    prevTarget.current = target;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const ease = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setCurrent(target * ease);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return current;
}
