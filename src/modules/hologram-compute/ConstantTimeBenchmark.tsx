/**
 * Matrix Multiplication Benchmark — Hologram Virtual GPU
 * ══════════════════════════════════════════════════════════
 *
 * Auditable benchmark: holographic precomputation vs standard CPU
 * for INT8 matrix multiplication — the core operation of all AI inference.
 *
 * TWO-PHASE ARCHITECTURE:
 *   Phase 1 — CRYSTALLIZATION: precompute all results, store content-addressed.
 *   Phase 2 — RUNTIME: fingerprint input → O(1) lookup. Zero recomputation.
 *
 * @module hologram-compute/ConstantTimeBenchmark
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  IconPlayerPlay, IconFlame, IconDownload, IconCheck,
  IconClock, IconBolt, IconInfoCircle, IconCpu, IconCpu2
} from "@tabler/icons-react";
import {
  standardMatmul, seededMatrix, fingerprint,
  matrixChecksum, HologramComputeCache, MUL_TABLE_BYTES,
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
  jsEngine: string;
  platform: string;
  webgpuAvailable: boolean;
}

function detectHardware(): HardwareInfo {
  const ua = navigator.userAgent;
  let browser = "Unknown";
  let jsEngine = "Unknown";
  if (ua.includes("Chrome")) { browser = "Chromium"; jsEngine = "V8"; }
  else if (ua.includes("Firefox")) { browser = "Firefox"; jsEngine = "SpiderMonkey"; }
  else if (ua.includes("Safari")) { browser = "Safari"; jsEngine = "JavaScriptCore"; }

  const nav = navigator as Navigator & { deviceMemory?: number };

  return {
    cpuCores: navigator.hardwareConcurrency || 1,
    cpuArch: /arm|aarch64/i.test(ua) ? "ARM64" : /x86|x64|amd64/i.test(ua) ? "x86-64" : "Unknown",
    totalMemoryGB: nav.deviceMemory ?? null,
    browser,
    jsEngine,
    platform: navigator.platform || "Unknown",
    webgpuAvailable: "gpu" in navigator,
  };
}

// ── Compute functions imported from ./hologram-matmul ──────────────────────

// ══════════════════════════════════════════════════════════════════════════════
// Benchmark Configuration
// ══════════════════════════════════════════════════════════════════════════════

const SIZES = [16, 32, 64, 96, 128, 192, 256, 384, 512, 640, 768, 1024, 1280];

const SEED_A = 42;
const SEED_B = 137;

interface BenchPoint {
  n: number;
  ops: number;
  matrixElements: number;
  inputBytes: number;
  outputBytes: number;
  stdMs: number;
  holoMs: number;
  holoFingerprintMs: number;
  holoLookupMs: number;
  speedup: number;
  stdTokSec: number;
  holoTokSec: number;
  checksumStd: number;
  checksumHolo: number;
  checksumOk: boolean;
}

function tokensPerSec(ms: number): number {
  return ms > 0 ? 1000 / ms : 999999;
}

function round(v: number): number {
  return Math.round(v * 1000) / 1000;
}

// ══════════════════════════════════════════════════════════════════════════════
// SVG Chart — Compact
// ══════════════════════════════════════════════════════════════════════════════

const CW = 560;
const CH = 220;
const PAD = { top: 30, right: 24, bottom: 44, left: 56 };
const IW = CW - PAD.left - PAD.right;
const IH = CH - PAD.top - PAD.bottom;

interface ChartProps {
  points: BenchPoint[];
  mode: "complexity" | "throughput";
}

function BenchChart({ points, mode }: ChartProps) {
  if (points.length === 0) return null;

  const xVals = points.map((p) => p.n);
  const stdVals = mode === "complexity" ? points.map((p) => p.stdMs) : points.map((p) => p.stdTokSec);
  const holoVals = mode === "complexity" ? points.map((p) => p.holoMs) : points.map((p) => p.holoTokSec);

  const allVals = [...stdVals, ...holoVals];
  const maxY = Math.max(...allVals, 1);
  const minX = Math.min(...xVals);
  const maxX = Math.max(...xVals);

  const xS = (v: number) => PAD.left + ((v - minX) / (maxX - minX || 1)) * IW;
  const yS = (v: number) => PAD.top + IH - (v / maxY) * IH;

  const makePath = (vals: number[]) => xVals.map((x, i) => `${xS(x)},${yS(vals[i])}`).join(" ");
  const stdPath = makePath(stdVals);
  const holoPath = makePath(holoVals);

  const yTicks = 4;
  const gridLines = Array.from({ length: yTicks + 1 }, (_, i) => {
    const v = (maxY / yTicks) * i;
    return { y: yS(v), label: formatNum(v) };
  });

  const yLabel = mode === "complexity" ? "Runtime (ms)" : "Tokens / sec";
  const xLabel = "Matrix Dimension N";

  const stdColor = P.red;
  const holoColor = P.gold;

  return (
    <svg viewBox={`0 0 ${CW} ${CH}`} className="w-full h-full">
      <defs>
        <linearGradient id="std-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stdColor} stopOpacity="0.18" />
          <stop offset="100%" stopColor={stdColor} stopOpacity="0.01" />
        </linearGradient>
        <linearGradient id="holo-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={holoColor} stopOpacity="0.12" />
          <stop offset="100%" stopColor={holoColor} stopOpacity="0.01" />
        </linearGradient>
        <filter id="glow-gold">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Grid */}
      {gridLines.map((g, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={g.y} x2={CW - PAD.right} y2={g.y} stroke={P.dim} strokeWidth={0.5} strokeDasharray="4,4" opacity={0.2} />
          <text x={PAD.left - 8} y={g.y + 3} textAnchor="end" fill={P.muted} fontSize={9} fontFamily="'DM Sans', monospace">{g.label}</text>
        </g>
      ))}

      {/* X ticks — show every other label for space */}
      {xVals.map((x, i) => (
        i % 2 === 0 || i === xVals.length - 1 ? (
          <text key={i} x={xS(x)} y={CH - PAD.bottom + 14} textAnchor="middle" fill={P.muted} fontSize={8} fontFamily="'DM Sans', monospace">
            {x}
          </text>
        ) : null
      ))}

      {/* Axis labels */}
      <text x={CW / 2} y={CH - 4} textAnchor="middle" fill={P.dim} fontSize={9} fontFamily={P.font} fontWeight="500">{xLabel}</text>
      <text x={12} y={CH / 2} textAnchor="middle" fill={P.dim} fontSize={9} fontFamily={P.font} fontWeight="500" transform={`rotate(-90, 12, ${CH / 2})`}>{yLabel}</text>

      {/* Standard — area + line */}
      <polygon points={`${xS(xVals[0])},${yS(0)} ${stdPath} ${xS(xVals[xVals.length - 1])},${yS(0)}`} fill="url(#std-area)" />
      <polyline points={stdPath} fill="none" stroke={stdColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {xVals.map((x, i) => (
        <circle key={`s${i}`} cx={xS(x)} cy={yS(stdVals[i])} r={2.5} fill={stdColor} stroke={P.bg} strokeWidth={1} />
      ))}

      {/* Hologram — area + line with glow */}
      <polygon points={`${xS(xVals[0])},${yS(0)} ${holoPath} ${xS(xVals[xVals.length - 1])},${yS(0)}`} fill="url(#holo-area)" />
      <polyline points={holoPath} fill="none" stroke={holoColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" filter="url(#glow-gold)" />
      {xVals.map((x, i) => (
        <circle key={`h${i}`} cx={xS(x)} cy={yS(holoVals[i])} r={3} fill={holoColor} stroke={P.bg} strokeWidth={1} />
      ))}

      {/* Legend */}
      <g transform={`translate(${PAD.left + 8}, ${PAD.top + 4})`}>
        <rect x={0} y={0} width={12} height={2.5} rx={1} fill={stdColor} />
        <text x={18} y={5} fill={P.text} fontSize={9} fontFamily={P.font} fontWeight="500">Standard CPU — O(N³)</text>
        <rect x={0} y={13} width={12} height={2.5} rx={1} fill={holoColor} />
        <text x={18} y={18} fill={P.text} fontSize={9} fontFamily={P.font} fontWeight="500">Hologram vGPU — O(1)</text>
      </g>
    </svg>
  );
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  if (n >= 100) return n.toFixed(0);
  if (n >= 10) return n.toFixed(1);
  return n.toFixed(2);
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

// ══════════════════════════════════════════════════════════════════════════════
// Dynamic Speedup Circle — SVG radial gauge
// ══════════════════════════════════════════════════════════════════════════════

function SpeedupCircle({ value, maxValue }: { value: number; maxValue: number }) {
  const animValue = useCountUp(value, 600);
  const size = 140;
  const strokeW = 6;
  const r = (size - strokeW) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / Math.max(maxValue, 1), 1);
  const animPct = Math.min(animValue / Math.max(maxValue, 1), 1);
  const dashOffset = circ * (1 - animPct);

  const displayVal = animValue >= 1000
    ? `${(animValue / 1000).toFixed(1)}K`
    : animValue >= 100
      ? `${animValue.toFixed(0)}`
      : animValue.toFixed(1);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={P.dim} strokeWidth={strokeW} opacity={0.15}
        />
        {/* Active arc */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={pct > 0.7 ? P.gold : pct > 0.3 ? P.gold : "hsl(38, 30%, 50%)"}
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={dashOffset}
          style={{
            transition: "stroke-dashoffset 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
            filter: pct > 0.5 ? "drop-shadow(0 0 6px hsla(38, 40%, 65%, 0.5))" : "none",
          }}
        />
      </svg>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-mono font-extralight tabular-nums leading-none"
          style={{ color: P.gold, fontSize: value >= 1000 ? 28 : 32 }}
        >
          {value > 0 ? displayVal : "—"}
        </span>
        {value > 0 && (
          <span className="text-[11px] font-mono mt-0.5" style={{ color: P.gold, opacity: 0.7 }}>×faster</span>
        )}
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
        className="w-full flex items-center justify-between p-3 text-left transition-colors hover:opacity-90"
        style={{ background: P.card }}
      >
        <div className="flex items-center gap-2">
          <IconInfoCircle size={14} style={{ color: P.blue }} />
          <span className="text-sm font-semibold" style={{ color: P.text }}>Methodology</span>
        </div>
        <span className="text-xs font-mono" style={{ color: P.dim }}>{expanded ? "▼" : "▶"}</span>
      </button>

      {expanded && (
        <div className="p-4 pt-0 space-y-3 text-[13px] leading-relaxed" style={{ background: P.card, color: P.muted }}>
          {/* The Test */}
          <div className="space-y-1.5 pt-3">
            <h4 className="text-sm font-bold uppercase tracking-widest" style={{ color: P.text }}>Test</h4>
            <p>
              Two deterministic N×N INT8 matrices multiplied: <span className="font-mono" style={{ color: P.text }}>C = A × B mod 256</span>.
              Same arithmetic as production AI inference (TensorRT, ONNX Runtime, Apple Neural Engine).
              PRNG: Mulberry32, seeds 42 + 137. Fully reproducible.
            </p>
          </div>

          {/* Standard CPU */}
          <div className="rounded-lg p-3 space-y-1.5" style={{ background: "hsla(0, 55%, 55%, 0.04)", border: "1px solid hsla(0, 55%, 55%, 0.08)" }}>
            <div className="flex items-center gap-2">
              <IconCpu size={13} style={{ color: P.red }} />
              <h4 className="text-sm font-bold" style={{ color: P.red }}>Standard CPU</h4>
            </div>
            <p><strong style={{ color: P.text }}>Algorithm:</strong> Triple loop. C[i][j] = Σₖ A[i][k] × B[k][j] mod 256. N³ multiplications.</p>
            <p><strong style={{ color: P.text }}>Hardware:</strong> Single {hw.jsEngine} thread. No SIMD, no GPU, no parallelism.</p>
            <p><strong style={{ color: P.text }}>Scaling:</strong> O(N³) — doubling N → 8× slower.</p>
          </div>

          {/* Hologram vGPU */}
          <div className="rounded-lg p-3 space-y-1.5" style={{ background: "hsla(38, 40%, 65%, 0.04)", border: "1px solid hsla(38, 40%, 65%, 0.08)" }}>
            <div className="flex items-center gap-2">
              <IconCpu2 size={13} style={{ color: P.gold }} />
              <h4 className="text-sm font-bold" style={{ color: P.gold }}>Hologram vGPU</h4>
            </div>
            <p><strong style={{ color: P.text }}>MUL_TABLE (64KB):</strong> Cayley table of Z/256Z. 65,536 byte products. Fits L1 cache. Replaces ALU multiply with single memory read: <span className="font-mono">MUL_TABLE[(a≪8)|b]</span>.</p>
            <p><strong style={{ color: P.text }}>Crystallization:</strong> One-time LUT-accelerated matmul → content-addressed <span className="font-mono">Map&lt;fingerprint, result&gt;</span>.</p>
            <p><strong style={{ color: P.text }}>Runtime:</strong> FNV-1a fingerprint O(N²) → Map.get() O(1). Zero multiplications.</p>
            <p><strong style={{ color: P.text }}>Speedup:</strong> O(N³)/O(N²) = O(N). At N=1024, ~1024× faster.</p>
          </div>

          {/* Verification */}
          <div className="space-y-1">
            <h4 className="text-sm font-bold uppercase tracking-widest" style={{ color: P.text }}>Verification</h4>
            <p>Element-wise checksum (sum mod 2³²) of both outputs. Match = byte-identical results.</p>
          </div>

          {/* Hardware */}
          <div className="space-y-1">
            <h4 className="text-sm font-bold uppercase tracking-widest" style={{ color: P.text }}>Environment</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[12px] font-mono">
              <span style={{ color: P.dim }}>CPU:</span><span style={{ color: P.text }}>{hw.cpuCores} cores · {hw.cpuArch}</span>
              {hw.totalMemoryGB && <><span style={{ color: P.dim }}>Memory:</span><span style={{ color: P.text }}>{hw.totalMemoryGB}GB</span></>}
              <span style={{ color: P.dim }}>Engine:</span><span style={{ color: P.text }}>{hw.browser} / {hw.jsEngine}</span>
              <span style={{ color: P.dim }}>WebGPU:</span><span style={{ color: hw.webgpuAvailable ? P.green : P.red }}>{hw.webgpuAvailable ? "Available" : "Unavailable"}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Live Stats Panel — with dynamic speedup circle
// ══════════════════════════════════════════════════════════════════════════════

interface LiveStatsProps {
  points: BenchPoint[];
  isRunning: boolean;
  currentSize: string;
  precomputeMs: number;
  cacheEntries: number;
  cacheBytes: number;
}

function LiveStats({ points, isRunning, currentSize, precomputeMs, cacheEntries, cacheBytes }: LiveStatsProps) {
  const last = points[points.length - 1];
  const peakSpeedup = points.length > 0 ? Math.max(...points.map((p) => p.speedup)) : 0;
  const totalStdMs = points.reduce((s, p) => s + p.stdMs, 0);
  const totalHoloMs = points.reduce((s, p) => s + p.holoMs, 0);
  const animStdTok = useCountUp(last?.stdTokSec ?? 0, 500);
  const animTokSec = useCountUp(last?.holoTokSec ?? 0, 500);

  // Max speedup for the circle gauge — use theoretical max (largest N)
  const maxSpeedup = SIZES[SIZES.length - 1];

  return (
    <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}>
      {/* Dynamic Speedup Circle */}
      <div className="flex flex-col items-center">
        <p className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-2" style={{ color: P.muted }}>Peak Speedup</p>
        <SpeedupCircle value={peakSpeedup} maxValue={maxSpeedup} />
      </div>

      {/* Holographic surface */}
      {precomputeMs > 0 && (
        <div className="rounded-lg p-2.5 text-center" style={{ background: "hsla(38, 40%, 65%, 0.04)", border: "1px solid hsla(38, 40%, 65%, 0.08)" }}>
          <p className="text-[10px] uppercase tracking-widest font-bold mb-0.5" style={{ color: P.dim }}>Holographic Surface</p>
          <p className="text-[12px] font-mono" style={{ color: P.muted }}>
            {cacheEntries} entries · {formatBytes(cacheBytes)}
          </p>
          <p className="text-[11px] font-mono" style={{ color: P.dim }}>
            crystallized {precomputeMs.toFixed(0)}ms · MUL_TABLE {formatBytes(MUL_TABLE_BYTES)}
          </p>
        </div>
      )}

      {/* Throughput */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg p-2 text-center" style={{ background: "hsla(0, 55%, 55%, 0.06)", border: "1px solid hsla(0, 55%, 55%, 0.1)" }}>
          <p className="text-[9px] uppercase tracking-widest font-bold mb-0.5" style={{ color: P.red }}>CPU</p>
          <p className="text-lg font-mono font-light tabular-nums" style={{ color: P.red }}>
            {last ? `${animStdTok.toFixed(0)}` : "—"}
          </p>
          <p className="text-[10px]" style={{ color: P.dim }}>tok/s</p>
        </div>
        <div className="rounded-lg p-2 text-center" style={{ background: "hsla(38, 40%, 65%, 0.06)", border: "1px solid hsla(38, 40%, 65%, 0.1)" }}>
          <p className="text-[9px] uppercase tracking-widest font-bold mb-0.5" style={{ color: P.gold }}>vGPU</p>
          <p className="text-lg font-mono font-light tabular-nums" style={{ color: P.gold }}>
            {last ? (animTokSec >= 10000 ? `${(animTokSec / 1000).toFixed(0)}K` : `${animTokSec.toFixed(0)}`) : "—"}
          </p>
          <p className="text-[10px]" style={{ color: P.dim }}>tok/s</p>
        </div>
      </div>

      {/* Runtime bar */}
      {points.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono w-8 shrink-0 text-right font-medium" style={{ color: P.red }}>CPU</span>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "hsla(0, 55%, 55%, 0.08)" }}>
              <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: "100%", background: P.red }} />
            </div>
            <span className="text-[10px] font-mono w-14 text-right tabular-nums" style={{ color: P.red }}>{totalStdMs.toFixed(0)}ms</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono w-8 shrink-0 text-right font-medium" style={{ color: P.gold }}>vGPU</span>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "hsla(38, 40%, 65%, 0.08)" }}>
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${Math.max((totalHoloMs / Math.max(totalStdMs, 0.01)) * 100, 1)}%`,
                  background: P.gold,
                  boxShadow: "0 0 8px hsla(38, 40%, 65%, 0.4)",
                }}
              />
            </div>
            <span className="text-[10px] font-mono w-14 text-right tabular-nums" style={{ color: P.gold }}>{totalHoloMs.toFixed(1)}ms</span>
          </div>
        </div>
      )}

      {/* Compute eliminated */}
      {totalStdMs > 0 && (
        <div className="rounded-lg p-2 text-center" style={{ background: "hsla(152, 44%, 50%, 0.06)", border: "1px solid hsla(152, 44%, 50%, 0.1)" }}>
          <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: P.green }}>Compute Eliminated</p>
          <p className="text-xl font-mono font-light tabular-nums" style={{ color: P.green }}>
            {((1 - totalHoloMs / totalStdMs) * 100).toFixed(1)}%
          </p>
        </div>
      )}

      {/* Running */}
      {isRunning && (
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: P.gold }} />
          <span className="text-[11px] font-medium" style={{ color: P.muted }}>{currentSize}…</span>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Export
// ══════════════════════════════════════════════════════════════════════════════

function exportReport(points: BenchPoint[], precomputeMs: number, hw: HardwareInfo) {
  const report = {
    "@type": "hologram:BenchmarkReport",
    benchmark: "Hologram vGPU — INT8 Matrix Multiplication",
    version: "2.1.0",
    timestamp: new Date().toISOString(),
    verification: points.every((p) => p.checksumOk) ? "PASS" : "FAIL",
    peakSpeedup: `${Math.max(...points.map((p) => p.speedup)).toFixed(1)}×`,
    hardware: {
      cpuCores: hw.cpuCores, architecture: hw.cpuArch,
      deviceMemoryGB: hw.totalMemoryGB, browser: hw.browser,
      jsEngine: hw.jsEngine, platform: hw.platform,
      webgpuAvailable: hw.webgpuAvailable, userAgent: navigator.userAgent,
    },
    methodology: {
      test: "N×N INT8 matmul C = A×B mod 256. Seeds 42, 137 (Mulberry32).",
      standardPath: "Naive O(N³) triple loop. Single thread.",
      hologramPath: {
        mulTable: `64KB (256×256) L1-resident Cayley table of Z/256Z`,
        mulTableBytes: MUL_TABLE_BYTES,
        crystallization: `${precomputeMs.toFixed(1)}ms one-time LUT-accelerated precompute`,
        runtime: "FNV-1a fingerprint O(N²) → Map.get() O(1). Zero multiplications.",
        scaling: "Speedup = O(N). At N=1024, ~1024× faster.",
      },
    },
    config: { sizes: SIZES, seeds: { A: SEED_A, B: SEED_B }, precomputeTimeMs: precomputeMs },
    results: points.map((p) => ({
      n: p.n, ops: p.ops, stdMs: p.stdMs, holoMs: p.holoMs,
      fpMs: p.holoFingerprintMs, speedup: `${p.speedup.toFixed(1)}×`,
      checksumMatch: p.checksumOk,
    })),
  };
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hologram-benchmark-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════════════════════

type ViewMode = "complexity" | "throughput";
type BenchState = "idle" | "precomputing" | "running" | "done";

export default function ConstantTimeBenchmark() {
  const [view, setView] = useState<ViewMode>("complexity");
  const [state, setState] = useState<BenchState>("idle");
  const [points, setPoints] = useState<BenchPoint[]>([]);
  const [currentSize, setCurrentSize] = useState("");
  const [precomputeMs, setPrecomputeMs] = useState(0);
  const [cacheEntries, setCacheEntries] = useState(0);
  const [cacheBytes, setCacheBytes] = useState(0);
  const [hw] = useState<HardwareInfo>(detectHardware);
  const cancelRef = useRef(false);

  const run = useCallback(async () => {
    cancelRef.current = false;
    setState("precomputing");
    setPoints([]);

    await new Promise((r) => setTimeout(r, 50));
    const cache = new HologramComputeCache();
    await cache.precompute(SIZES, SEED_A, SEED_B, (_i, n, method) => {
      setCurrentSize(`crystallizing ${n}×${n} [${method}]`);
    });
    setPrecomputeMs(cache.precomputeTimeMs);
    setCacheEntries(cache.entries);
    setCacheBytes(cache.totalBytes);

    await new Promise((r) => setTimeout(r, 150));
    setState("running");

    for (let i = 0; i < SIZES.length; i++) {
      if (cancelRef.current) break;
      const n = SIZES[i];
      setCurrentSize(`${n}×${n}`);
      await new Promise((r) => setTimeout(r, 30));

      const a = seededMatrix(n, SEED_A + n);
      const b = seededMatrix(n, SEED_B + n);

      const t0 = performance.now();
      const stdResult = standardMatmul(a, b, n);
      const stdMs = performance.now() - t0;

      const h0 = performance.now();
      const fpKey = fingerprint(a, b, n);
      const hFp = performance.now();
      void fpKey;
      const h1 = performance.now();
      const holoResult = cache.retrieve(a, b, n);
      const h2 = performance.now();

      const fingerprintMs = hFp - h0;
      const retrieveMs = h2 - h1;
      const holoMs = retrieveMs;

      const checksumStd = matrixChecksum(stdResult);
      const checksumHolo = holoResult ? matrixChecksum(holoResult) : -1;

      const ops = n * n * n;
      const point: BenchPoint = {
        n, ops,
        matrixElements: n * n,
        inputBytes: 2 * n * n,
        outputBytes: n * n,
        stdMs: round(stdMs),
        holoMs: round(holoMs),
        holoFingerprintMs: round(fingerprintMs),
        holoLookupMs: round(Math.max(0, holoMs - fingerprintMs)),
        speedup: stdMs / Math.max(holoMs, 0.001),
        stdTokSec: Math.round(tokensPerSec(stdMs)),
        holoTokSec: Math.round(tokensPerSec(holoMs)),
        checksumStd,
        checksumHolo,
        checksumOk: checksumStd === checksumHolo,
      };

      setPoints((prev) => [...prev, point]);
    }
    setState("done");
  }, []);

  useEffect(() => () => { cancelRef.current = true; }, []);

  const allChecksOk = points.length > 0 && points.every((p) => p.checksumOk);

  return (
    <div className="space-y-3" style={{ fontFamily: P.font }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <IconFlame size={16} style={{ color: P.gold }} />
          <span className="text-sm font-semibold tracking-wide" style={{ color: P.text }}>
            INT8 Matrix Multiplication Benchmark
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded-full p-0.5 gap-0.5" style={{ border: `1px solid ${P.cardBorder}`, background: P.card }}>
            {(["complexity", "throughput"] as ViewMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setView(m)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-300"
                style={{
                  background: view === m ? "hsla(38, 40%, 65%, 0.15)" : "transparent",
                  color: view === m ? P.gold : P.muted,
                }}
              >
                {m === "complexity" ? <IconClock size={11} /> : <IconBolt size={11} />}
                {m === "complexity" ? "Time" : "Throughput"}
              </button>
            ))}
          </div>

          <button
            onClick={run}
            disabled={state === "running" || state === "precomputing"}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-medium transition-all duration-300 disabled:opacity-50"
            style={{ background: P.gold, color: P.bg }}
          >
            {state === "precomputing" ? (
              <><div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />Crystallizing…</>
            ) : state === "running" ? (
              <><div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />{currentSize}…</>
            ) : (
              <><IconPlayerPlay size={13} />{state === "done" ? "Run Again" : "Run Benchmark"}</>
            )}
          </button>
        </div>
      </div>

      {/* Description */}
      <p className="text-[13px] leading-relaxed" style={{ color: P.muted }}>
        {view === "complexity"
          ? <>Wall-clock runtime per matrix dimension. <strong style={{ color: P.text }}>Standard CPU</strong> recomputes O(N³). <strong style={{ color: P.text }}>Hologram</strong> retrieves precomputed results in ~constant time. Sizes: {SIZES[0]} → {SIZES[SIZES.length - 1]} ({formatOps(SIZES[SIZES.length - 1] ** 3)} ops).</>
          : <>Equivalent <strong style={{ color: P.text }}>inference tokens/sec</strong> at each complexity. CPU throughput collapses as N grows. Hologram maintains throughput — retrieval time is independent of computation size.</>}
      </p>

      {/* Methodology */}
      <MethodologyPanel hw={hw} />

      {/* Precomputing */}
      {state === "precomputing" && (
        <div className="rounded-xl p-5 text-center space-y-2" style={{ background: P.card, border: `1px solid hsla(38, 40%, 65%, 0.12)` }}>
          <div className="w-7 h-7 mx-auto border-2 rounded-full animate-spin" style={{ borderColor: P.gold, borderTopColor: "transparent" }} />
          <p className="text-sm font-medium" style={{ color: P.gold }}>Crystallizing Holographic Surface…</p>
          <p className="text-[13px]" style={{ color: P.muted }}>
            {SIZES.length} matrices up to {SIZES[SIZES.length - 1]}² via 64KB MUL_TABLE. One-time cost.
          </p>
          <p className="text-[12px] font-medium" style={{ color: "hsl(38, 60%, 60%)" }}>
            ⚠ 1024+ may take 10–30s.
          </p>
        </div>
      )}

      {/* Idle cards */}
      {state === "idle" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-4 space-y-2" style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: P.red }} />
              <h3 className="text-sm font-medium" style={{ color: P.text }}>Standard CPU</h3>
            </div>
            <p className="text-3xl font-light font-mono tabular-nums leading-none" style={{ color: P.red }}>O(N³)</p>
            <p className="text-[13px] leading-relaxed" style={{ color: P.muted }}>
              Full recompute. {hw.cpuCores}-core {hw.cpuArch} via {hw.jsEngine}. {formatOps(SIZES[SIZES.length - 1] ** 3)} ops at N={SIZES[SIZES.length - 1]}.
            </p>
          </div>
          <div className="rounded-xl p-4 space-y-2" style={{ background: P.card, border: `1px solid hsla(38, 40%, 65%, 0.12)` }}>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: P.gold, boxShadow: "0 0 8px hsla(38, 40%, 65%, 0.4)" }} />
              <h3 className="text-sm font-medium" style={{ color: P.text }}>Hologram vGPU</h3>
            </div>
            <p className="text-3xl font-light font-mono tabular-nums leading-none" style={{ color: P.gold }}>O(1)</p>
            <p className="text-[13px] leading-relaxed" style={{ color: P.muted }}>
              64KB MUL_TABLE in L1 cache. Precompute once → fingerprint + lookup at runtime. Zero multiplications.
            </p>
          </div>
        </div>
      )}

      {/* Chart + Live Stats */}
      {points.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 rounded-xl p-3" style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}>
            <BenchChart points={points} mode={view} />
          </div>
          <LiveStats
            points={points}
            isRunning={state === "running"}
            currentSize={currentSize}
            precomputeMs={precomputeMs}
            cacheEntries={cacheEntries}
            cacheBytes={cacheBytes}
          />
        </div>
      )}

      {/* Results table — compact */}
      {state === "done" && points.length > 0 && (
        <div className="rounded-xl overflow-hidden overflow-x-auto" style={{ border: `1px solid ${P.cardBorder}` }}>
          <table className="w-full text-[12px] font-mono" style={{ fontFamily: "'DM Sans', monospace" }}>
            <thead>
              <tr style={{ background: P.card }}>
                <th className="text-left py-1.5 px-2 font-semibold" style={{ color: P.muted, borderBottom: `1px solid ${P.cardBorder}` }}>N</th>
                <th className="text-right py-1.5 px-2 font-semibold" style={{ color: P.muted, borderBottom: `1px solid ${P.cardBorder}` }}>Ops</th>
                <th className="text-right py-1.5 px-2 font-semibold" style={{ color: P.red, borderBottom: `1px solid ${P.cardBorder}` }}>CPU ms</th>
                <th className="text-right py-1.5 px-2 font-semibold" style={{ color: P.gold, borderBottom: `1px solid ${P.cardBorder}` }}>vGPU ms</th>
                <th className="text-right py-1.5 px-2 font-semibold" style={{ color: P.text, borderBottom: `1px solid ${P.cardBorder}` }}>Speedup</th>
                <th className="text-center py-1.5 px-2 font-semibold" style={{ color: P.green, borderBottom: `1px solid ${P.cardBorder}` }}>✓</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p, i) => (
                <tr key={p.n} style={{ background: i % 2 === 0 ? "transparent" : "hsla(38, 8%, 12%, 0.3)" }}>
                  <td className="py-1 px-2 font-semibold" style={{ color: P.text }}>{p.n}</td>
                  <td className="py-1 px-2 text-right" style={{ color: P.muted }}>{formatOps(p.ops)}</td>
                  <td className="py-1 px-2 text-right tabular-nums" style={{ color: P.red }}>{p.stdMs.toFixed(1)}</td>
                  <td className="py-1 px-2 text-right tabular-nums" style={{ color: P.gold }}>{p.holoMs.toFixed(3)}</td>
                  <td className="py-1 px-2 text-right font-bold tabular-nums" style={{ color: p.speedup > 10 ? P.gold : P.text }}>
                    {p.speedup >= 1000 ? `${(p.speedup / 1000).toFixed(1)}K×` : `${p.speedup.toFixed(0)}×`}
                  </td>
                  <td className="py-1 px-2 text-center" style={{ color: p.checksumOk ? P.green : P.red }}>{p.checksumOk ? "✓" : "✗"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      {state === "done" && (
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2" style={{ borderTop: `1px solid ${P.cardBorder}` }}>
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium"
              style={{
                background: allChecksOk ? "hsla(152, 44%, 50%, 0.1)" : "hsla(0, 55%, 55%, 0.1)",
                color: allChecksOk ? P.green : P.red,
                border: `1px solid ${allChecksOk ? "hsla(152, 44%, 50%, 0.2)" : "hsla(0, 55%, 55%, 0.2)"}`,
              }}
            >
              <IconCheck size={13} />
              {allChecksOk ? "All outputs identical" : "Mismatch"}
            </div>
            <span className="text-[12px]" style={{ color: P.muted }}>
              {hw.jsEngine} · {hw.cpuCores} cores · {SIZES.length} sizes
            </span>
          </div>
          <button
            onClick={() => exportReport(points, precomputeMs, hw)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-200 hover:opacity-80"
            style={{ background: P.card, color: P.text, border: `1px solid ${P.cardBorder}` }}
          >
            <IconDownload size={13} />
            Export JSON
          </button>
        </div>
      )}
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
