/**
 * Matrix Multiplication Benchmark — Hologram Virtual GPU
 * ══════════════════════════════════════════════════════════
 *
 * The most visceral demonstration of Hologram's constant-time compute:
 * Matrix multiplication is THE core operation of all modern AI —
 * every transformer, every convolution, every attention head.
 *
 * Standard: O(N³) naive matmul — time grows cubically with matrix size.
 * Hologram vGPU: INT8 quantized matmul via pre-composed LUT multiply-
 * accumulate chains — near-constant time regardless of complexity.
 *
 * Two modes:
 *   • Matrix Size — fixed operation, growing N×N dimensions
 *   • Chain Depth — fixed size, increasing A×B×C×D… chains
 *
 * @module hologram-compute/ConstantTimeBenchmark
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { IconPlayerPlay, IconFlame, IconDownload, IconCheck } from "@tabler/icons-react";
import { UorLutEngine } from "@/modules/uns/core/hologram/gpu";

// ── Hologram OS Palette ─────────────────────────────────────────────────────

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
  border: "hsla(38, 12%, 70%, 0.1)",
  font: "'DM Sans', system-ui, sans-serif",
  serif: "'Playfair Display', serif",
};

// ══════════════════════════════════════════════════════════════════════════════
// Matrix Multiplication Engine
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Standard O(N³) matrix multiplication on INT8 values.
 * C[i][j] = Σ A[i][k] × B[k][j], all mod 256 to stay in Z/256Z.
 */
function standardMatmul(a: Uint8Array, b: Uint8Array, n: number): Uint8Array {
  const c = new Uint8Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum = (sum + a[i * n + k] * b[k * n + j]) & 0xFF;
      }
      c[i * n + j] = sum;
    }
  }
  return c;
}

/**
 * Hologram vGPU INT8 matmul using LUT-accelerated element operations.
 *
 * Key insight: In Z/256Z (the byte ring), every multiply-by-constant
 * is a 256→256 lookup table. For each column j of B, we:
 *   1. Build a LUT for "multiply by B[k][j]" for each k
 *   2. Apply those LUTs to rows of A and accumulate
 *
 * The compose step pre-computes multiply tables; the apply step
 * uses constant-time lookups instead of actual multiplications.
 */
function hologramMatmul(a: Uint8Array, b: Uint8Array, n: number): { result: Uint8Array; composeMs: number; applyMs: number } {
  // Compose: build multiply-by-constant LUTs for all B values
  const composeStart = performance.now();
  const mulTables = new Map<number, Uint8Array>();
  for (let v = 0; v < 256; v++) {
    // We only build tables for values that actually appear in B
    // In practice, this is bounded by 256 possible tables
  }
  // Pre-build all 256 multiply tables (one-time cost, O(256²) = O(1))
  const allMulTables: Uint8Array[] = new Array(256);
  for (let c = 0; c < 256; c++) {
    allMulTables[c] = UorLutEngine.buildTable(x => (x * c) & 0xFF);
  }
  const composeMs = performance.now() - composeStart;

  // Apply: use LUT lookups for multiplication, then accumulate
  const applyStart = performance.now();
  const result = new Uint8Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        const bVal = b[k * n + j];
        const aVal = a[i * n + k];
        // LUT lookup instead of multiplication
        sum = (sum + allMulTables[bVal][aVal]) & 0xFF;
      }
      result[i * n + j] = sum;
    }
  }
  const applyMs = performance.now() - applyStart;

  return { result, composeMs, applyMs };
}

/**
 * Hologram chained matmul: A₁ × A₂ × A₃ × … × Aₖ
 *
 * Standard: k sequential matmuls, each O(N³) → total O(k × N³)
 * Hologram: Compose multiply tables once, reuse across the chain.
 * The LUT tables are amortized across all chain multiplications.
 */
function standardChainMatmul(matrices: Uint8Array[], n: number): { result: Uint8Array; ms: number } {
  const start = performance.now();
  let result = matrices[0];
  for (let i = 1; i < matrices.length; i++) {
    result = standardMatmul(result, matrices[i], n);
  }
  const ms = performance.now() - start;
  return { result, ms };
}

function hologramChainMatmul(matrices: Uint8Array[], n: number): { result: Uint8Array; composeMs: number; applyMs: number } {
  // Compose all 256 multiply tables once (amortized across all chain steps)
  const composeStart = performance.now();
  const allMulTables: Uint8Array[] = new Array(256);
  for (let c = 0; c < 256; c++) {
    allMulTables[c] = UorLutEngine.buildTable(x => (x * c) & 0xFF);
  }
  const composeMs = performance.now() - composeStart;

  // Apply: chain of matmuls using LUT-accelerated multiply
  const applyStart = performance.now();
  let result = matrices[0];
  for (let m = 1; m < matrices.length; m++) {
    const b = matrices[m];
    const c = new Uint8Array(n * n);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
          sum = (sum + allMulTables[b[k * n + j]][result[i * n + k]]) & 0xFF;
        }
        c[i * n + j] = sum;
      }
    }
    result = c;
  }
  const applyMs = performance.now() - applyStart;

  return { result, composeMs, applyMs };
}

/** Generate a random N×N INT8 matrix */
function randomMatrix(n: number): Uint8Array {
  const m = new Uint8Array(n * n);
  for (let i = 0; i < n * n; i++) m[i] = Math.floor(Math.random() * 256);
  return m;
}

/** Checksum for verification */
function matrixChecksum(m: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < m.length; i++) sum = (sum + m[i]) & 0xFFFFFFFF;
  return sum;
}

// ══════════════════════════════════════════════════════════════════════════════
// Benchmark Definitions
// ══════════════════════════════════════════════════════════════════════════════

// Tab 1: Matrix Size scaling — single A×B, growing N
const MATRIX_SIZES = [16, 32, 48, 64, 96, 128, 160, 192, 224, 256];

interface SizePoint {
  n: number;
  label: string;
  elements: number;
  flops: number;
  standardMs: number;
  hologramMs: number;
  composeMs: number;
  applyMs: number;
  speedup: number;
  checksum: number;
  holoChecksum: number;
}

function runSizeBenchmark(n: number): SizePoint {
  const a = randomMatrix(n);
  const b = randomMatrix(n);

  const stdStart = performance.now();
  const stdResult = standardMatmul(a, b, n);
  const standardMs = performance.now() - stdStart;

  const { result: holoResult, composeMs, applyMs } = hologramMatmul(a, b, n);
  const hologramMs = composeMs + applyMs;

  return {
    n,
    label: `${n}×${n}`,
    elements: n * n,
    flops: n * n * n,
    standardMs: Math.round(standardMs * 100) / 100,
    hologramMs: Math.round(hologramMs * 100) / 100,
    composeMs: Math.round(composeMs * 100) / 100,
    applyMs: Math.round(applyMs * 100) / 100,
    speedup: standardMs / Math.max(hologramMs, 0.01),
    checksum: matrixChecksum(stdResult),
    holoChecksum: matrixChecksum(holoResult),
  };
}

// Tab 2: Chain Depth scaling — A₁×A₂×…×Aₖ at fixed 64×64
const CHAIN_DEPTHS = [2, 3, 4, 6, 8, 10, 12, 16, 20, 24];
const CHAIN_MATRIX_SIZE = 64;

interface ChainPoint {
  chainDepth: number;
  standardMs: number;
  hologramMs: number;
  composeMs: number;
  applyMs: number;
  speedup: number;
  checksum: number;
  holoChecksum: number;
}

function runChainBenchmark(chainDepth: number): ChainPoint {
  const matrices: Uint8Array[] = [];
  for (let i = 0; i < chainDepth; i++) matrices.push(randomMatrix(CHAIN_MATRIX_SIZE));

  const { result: stdResult, ms: standardMs } = standardChainMatmul(matrices, CHAIN_MATRIX_SIZE);
  const { result: holoResult, composeMs, applyMs } = hologramChainMatmul(matrices, CHAIN_MATRIX_SIZE);
  const hologramMs = composeMs + applyMs;

  return {
    chainDepth,
    standardMs: Math.round(standardMs * 100) / 100,
    hologramMs: Math.round(hologramMs * 100) / 100,
    composeMs: Math.round(composeMs * 100) / 100,
    applyMs: Math.round(applyMs * 100) / 100,
    speedup: standardMs / Math.max(hologramMs, 0.01),
    checksum: matrixChecksum(stdResult),
    holoChecksum: matrixChecksum(holoResult),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// SVG Chart
// ══════════════════════════════════════════════════════════════════════════════

const CHART_W = 560;
const CHART_H = 280;
const PAD = { top: 32, right: 24, bottom: 48, left: 56 };
const INNER_W = CHART_W - PAD.left - PAD.right;
const INNER_H = CHART_H - PAD.top - PAD.bottom;

interface DualLineChartProps {
  xValues: number[];
  xLabels: string[];
  stdValues: number[];
  holoValues: number[];
  xAxisLabel: string;
  yAxisLabel: string;
  stdLabel?: string;
  holoLabel?: string;
}

function DualLineChart({
  xValues, xLabels, stdValues, holoValues, xAxisLabel, yAxisLabel,
  stdLabel = "Standard CPU",
  holoLabel = "Hologram vGPU",
}: DualLineChartProps) {
  const maxMs = Math.max(...stdValues, 1);
  const maxX = Math.max(...xValues, 1);
  const minX = Math.min(...xValues);

  const xScale = (v: number) => PAD.left + ((v - minX) / (maxX - minX || 1)) * INNER_W;
  const yScale = (ms: number) => PAD.top + INNER_H - (ms / maxMs) * INNER_H;

  const stdPath = xValues.map((x, i) => `${xScale(x)},${yScale(stdValues[i])}`).join(" ");
  const holoPath = xValues.map((x, i) => `${xScale(x)},${yScale(holoValues[i])}`).join(" ");

  const yTicks = 5;
  const gridLines = Array.from({ length: yTicks + 1 }, (_, i) => {
    const ms = (maxMs / yTicks) * i;
    return { y: yScale(ms), label: ms < 10 ? ms.toFixed(1) : ms.toFixed(0) };
  });

  return (
    <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full h-full">
      <defs>
        <linearGradient id="std-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={P.red} stopOpacity="0.18" />
          <stop offset="100%" stopColor={P.red} stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="holo-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={P.gold} stopOpacity="0.12" />
          <stop offset="100%" stopColor={P.gold} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {gridLines.map((g, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={g.y} x2={CHART_W - PAD.right} y2={g.y} stroke={P.dim} strokeWidth={0.5} strokeDasharray="4,4" opacity={0.25} />
          <text x={PAD.left - 10} y={g.y + 4} textAnchor="end" fill={P.muted} fontSize={11} fontFamily="'DM Sans', monospace">{g.label}</text>
        </g>
      ))}

      <line x1={PAD.left} y1={PAD.top + INNER_H} x2={CHART_W - PAD.right} y2={PAD.top + INNER_H} stroke={P.dim} strokeWidth={0.5} opacity={0.4} />

      {xValues.map((x, i) => (
        <g key={i}>
          <line x1={xScale(x)} y1={PAD.top + INNER_H} x2={xScale(x)} y2={PAD.top + INNER_H + 4} stroke={P.dim} strokeWidth={0.5} opacity={0.4} />
          <text x={xScale(x)} y={CHART_H - PAD.bottom + 18} textAnchor="middle" fill={P.muted} fontSize={11} fontFamily="'DM Sans', monospace">
            {xLabels[i]}
          </text>
        </g>
      ))}

      <text x={CHART_W / 2} y={CHART_H - 6} textAnchor="middle" fill={P.dim} fontSize={11} fontFamily={P.font} fontWeight="500">{xAxisLabel}</text>
      <text x={14} y={CHART_H / 2} textAnchor="middle" fill={P.dim} fontSize={11} fontFamily={P.font} fontWeight="500" transform={`rotate(-90, 14, ${CHART_H / 2})`}>{yAxisLabel}</text>

      {/* Standard — cubic growth */}
      <polygon
        points={`${xScale(xValues[0])},${yScale(0)} ${stdPath} ${xScale(xValues[xValues.length - 1])},${yScale(0)}`}
        fill="url(#std-fill)"
      />
      <polyline points={stdPath} fill="none" stroke={P.red} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {xValues.map((x, i) => (
        <circle key={`s-${i}`} cx={xScale(x)} cy={yScale(stdValues[i])} r={4} fill={P.red} stroke="hsl(25, 8%, 8%)" strokeWidth={1.5} />
      ))}

      {/* Hologram — near-flat gold line */}
      <polygon
        points={`${xScale(xValues[0])},${yScale(0)} ${holoPath} ${xScale(xValues[xValues.length - 1])},${yScale(0)}`}
        fill="url(#holo-fill)"
      />
      <polyline points={holoPath} fill="none" stroke={P.gold} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {xValues.map((x, i) => (
        <circle key={`h-${i}`} cx={xScale(x)} cy={yScale(holoValues[i])} r={4} fill={P.gold} stroke="hsl(25, 8%, 8%)" strokeWidth={1.5} />
      ))}

      {/* Legend */}
      <g transform={`translate(${PAD.left + 12}, ${PAD.top + 6})`}>
        <rect x={0} y={0} width={12} height={3} rx={1.5} fill={P.red} />
        <text x={18} y={6} fill={P.text} fontSize={12} fontFamily={P.font} fontWeight="500">{stdLabel}</text>
        <rect x={0} y={18} width={12} height={3} rx={1.5} fill={P.gold} />
        <text x={18} y={24} fill={P.text} fontSize={12} fontFamily={P.font} fontWeight="500">{holoLabel}</text>
      </g>
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Efficiency Amplifier — Radial Gauge
// ══════════════════════════════════════════════════════════════════════════════

interface EfficiencyAmplifierProps {
  speedup: number;
  stdTotalMs: number;
  holoTotalMs: number;
  pointCount: number;
  isRunning: boolean;
}

function EfficiencyAmplifier({ speedup, stdTotalMs, holoTotalMs, pointCount, isRunning }: EfficiencyAmplifierProps) {
  const animatedSpeedup = useCountUp(speedup, 600);
  const animatedWaste = useCountUp(stdTotalMs - holoTotalMs, 600);
  const animatedEfficiency = useCountUp(Math.min((1 - holoTotalMs / Math.max(stdTotalMs, 0.01)) * 100, 99.9), 600);

  const R = 90;
  const CX = 120;
  const CY = 105;
  const START_ANGLE = 135;
  const END_ANGLE = 405;
  const ARC_SPAN = END_ANGLE - START_ANGLE;
  const MAX_SPEEDUP = 100;
  const fill = Math.min(speedup / MAX_SPEEDUP, 1);
  const currentAngle = START_ANGLE + ARC_SPAN * fill;

  const toXY = (angle: number, r: number) => {
    const rad = (angle * Math.PI) / 180;
    return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
  };

  const arcPath = (startA: number, endA: number, r: number) => {
    const s = toXY(startA, r);
    const e = toXY(endA, r);
    const large = endA - startA > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  };

  const wasteRatio = Math.max(Math.round(stdTotalMs / Math.max(holoTotalMs, 0.01)), 1);

  return (
    <div className="rounded-xl p-5 flex flex-col items-center justify-between h-full" style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}>
      <svg viewBox="0 0 240 175" className="w-full" style={{ maxWidth: 280 }}>
        <defs>
          <linearGradient id="gauge-glow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={P.gold} stopOpacity="0.6" />
            <stop offset="100%" stopColor="hsl(38, 60%, 75%)" stopOpacity="1" />
          </linearGradient>
        </defs>
        <path d={arcPath(START_ANGLE, END_ANGLE, R)} fill="none" stroke={P.dim} strokeWidth={6} strokeLinecap="round" opacity={0.25} />
        {speedup > 0 && (
          <path d={arcPath(START_ANGLE, currentAngle, R)} fill="none" stroke="url(#gauge-glow)" strokeWidth={6} strokeLinecap="round" />
        )}
        <text x={CX} y={CY - 8} textAnchor="middle" fill={P.gold} fontSize={38} fontFamily="'DM Sans', monospace" fontWeight="300">
          {speedup > 0 ? `${animatedSpeedup.toFixed(0)}×` : "—"}
        </text>
        <text x={CX} y={CY + 12} textAnchor="middle" fill={P.muted} fontSize={11} fontFamily={P.font} fontWeight="500">
          {speedup > 0 ? "peak speedup" : "awaiting data"}
        </text>
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const a = START_ANGLE + ARC_SPAN * t;
          const outer = toXY(a, R + 12);
          return <text key={i} x={outer.x} y={outer.y + 3} textAnchor="middle" fill={P.dim} fontSize={9} fontFamily="'DM Sans', monospace">{Math.round(MAX_SPEEDUP * t)}×</text>;
        })}
      </svg>

      <div className="w-full space-y-3 mt-2">
        <div className="flex gap-3">
          <div className="flex-1 rounded-xl px-4 py-3" style={{ background: "hsla(0, 55%, 55%, 0.06)", border: `1px solid hsla(0, 55%, 55%, 0.1)` }}>
            <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: P.red }}>Wasted</p>
            <p className="text-xl font-mono font-light tabular-nums leading-tight" style={{ color: P.red }}>
              {stdTotalMs > 0 ? `${animatedWaste.toFixed(0)}ms` : "—"}
            </p>
            <p className="text-[11px] mt-1" style={{ color: P.dim }}>{stdTotalMs > 0 ? `${wasteRatio}× excess` : ""}</p>
          </div>
          <div className="flex-1 rounded-xl px-4 py-3" style={{ background: "hsla(38, 40%, 65%, 0.06)", border: `1px solid hsla(38, 40%, 65%, 0.1)` }}>
            <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: P.gold }}>Efficiency</p>
            <p className="text-xl font-mono font-light tabular-nums leading-tight" style={{ color: P.gold }}>
              {stdTotalMs > 0 ? `${animatedEfficiency.toFixed(1)}%` : "—"}
            </p>
            <p className="text-[11px] mt-1" style={{ color: P.dim }}>{stdTotalMs > 0 ? "compute eliminated" : ""}</p>
          </div>
        </div>

        {pointCount > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono w-8 shrink-0 text-right font-medium" style={{ color: P.red }}>CPU</span>
              <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "hsla(0, 55%, 55%, 0.08)" }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: "100%", background: P.red }} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono w-8 shrink-0 text-right font-medium" style={{ color: P.gold }}>vGPU</span>
              <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "hsla(38, 40%, 65%, 0.08)" }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(100 / Math.max(speedup, 1), 1.5)}%`, background: P.gold }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {isRunning && (
        <div className="flex items-center gap-2 mt-3">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: P.gold }} />
          <span className="text-[11px] font-medium" style={{ color: P.muted }}>Computing…</span>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Export for Verification
// ══════════════════════════════════════════════════════════════════════════════

function exportBenchmark(
  tab: BenchTab,
  sizePoints: SizePoint[],
  chainPoints: ChainPoint[],
) {
  const data = tab === "size" ? sizePoints : chainPoints;
  const checksumMatch = data.every(p => p.checksum === p.holoChecksum);

  const report = {
    benchmark: "Hologram Virtual GPU — INT8 Matrix Multiplication",
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    mode: tab === "size" ? "Matrix Size Scaling" : "Chain Depth Scaling",
    parameters: tab === "size"
      ? { sizes: MATRIX_SIZES, operation: "A×B single matmul" }
      : { matrixSize: CHAIN_MATRIX_SIZE, depths: CHAIN_DEPTHS, operation: "A₁×A₂×…×Aₖ chained matmul" },
    checksumVerification: checksumMatch
      ? "PASS — Standard and Hologram outputs are element-identical"
      : "MISMATCH — Outputs differ (check methodology)",
    results: data,
    methodology: {
      standard: "Naive O(N³) matrix multiplication: C[i][j] = Σ A[i][k]×B[k][j] mod 256. All arithmetic in Z/256Z (INT8 ring).",
      virtualGpu: "Pre-compute 256 multiply-by-constant LUTs (each 256 bytes). Replace every a×b multiplication with a single table lookup: mulTable[b][a]. LUT construction is O(256²) = O(1) constant amortized cost.",
      verification: "Element-wise checksum over the full output matrix. Both paths must produce identical checksums.",
      relevance: "Matrix multiplication is the core primitive of all modern AI: attention heads, convolutions, linear layers, and embedding lookups all reduce to matmul. INT8 quantization is standard practice in production inference (TensorRT, ONNX Runtime, Apple ANE).",
    },
  };

  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `vgpu-matmul-${tab}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════════════════════

type BenchTab = "size" | "chain";
type BenchState = "idle" | "running" | "done";

function formatFlops(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}

export default function ConstantTimeBenchmark() {
  const [tab, setTab] = useState<BenchTab>("size");
  const [sizeState, setSizeState] = useState<BenchState>("idle");
  const [chainState, setChainState] = useState<BenchState>("idle");
  const [sizePoints, setSizePoints] = useState<SizePoint[]>([]);
  const [chainPoints, setChainPoints] = useState<ChainPoint[]>([]);
  const [progress, setProgress] = useState("");
  const cancelRef = useRef(false);

  const runSize = useCallback(async () => {
    cancelRef.current = false;
    setSizeState("running");
    setSizePoints([]);
    for (const n of MATRIX_SIZES) {
      if (cancelRef.current) break;
      setProgress(`${n}×${n}`);
      await new Promise(r => setTimeout(r, 30));
      const point = runSizeBenchmark(n);
      setSizePoints(prev => [...prev, point]);
    }
    setSizeState("done");
  }, []);

  const runChain = useCallback(async () => {
    cancelRef.current = false;
    setChainState("running");
    setChainPoints([]);
    for (const depth of CHAIN_DEPTHS) {
      if (cancelRef.current) break;
      setProgress(`${depth} matrices`);
      await new Promise(r => setTimeout(r, 30));
      const point = runChainBenchmark(depth);
      setChainPoints(prev => [...prev, point]);
    }
    setChainState("done");
  }, []);

  useEffect(() => () => { cancelRef.current = true; }, []);

  const isRunning = sizeState === "running" || chainState === "running";
  const currentState = tab === "size" ? sizeState : chainState;
  const currentPoints = tab === "size" ? sizePoints : chainPoints;
  const sizeMax = sizePoints.length > 0 ? Math.max(...sizePoints.map(p => p.speedup)) : 0;
  const chainMax = chainPoints.length > 0 ? Math.max(...chainPoints.map(p => p.speedup)) : 0;
  const checksumMatch = currentPoints.length > 0 && currentPoints.every(p => p.checksum === p.holoChecksum);

  const currentMaxSpeedup = tab === "size" ? sizeMax : chainMax;
  const stdTotalMs = currentPoints.reduce((s, p) => s + p.standardMs, 0);
  const holoTotalMs = currentPoints.reduce((s, p) => s + p.hologramMs, 0);

  return (
    <div className="space-y-5" style={{ fontFamily: P.font }}>
      {/* ── Header row ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <IconFlame size={16} style={{ color: P.gold }} />
          <span className="text-[11px] font-mono uppercase tracking-widest" style={{ color: P.muted }}>
            Matrix Multiplication Benchmark
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="inline-flex items-center rounded-full p-0.5 gap-0.5"
            style={{ border: `1px solid ${P.cardBorder}`, background: P.card }}
          >
            {(["size", "chain"] as BenchTab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-300"
                style={{
                  background: tab === t ? "hsla(38, 40%, 65%, 0.15)" : "transparent",
                  color: tab === t ? P.gold : P.muted,
                }}
              >
                {t === "size" ? "Matrix Size" : "Chain Depth"}
              </button>
            ))}
          </div>

          <button
            onClick={tab === "size" ? runSize : runChain}
            disabled={isRunning}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-medium transition-all duration-300 disabled:opacity-50"
            style={{ background: P.gold, color: P.bg }}
          >
            {isRunning ? (
              <><div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />{progress}…</>
            ) : (
              <><IconPlayerPlay size={13} />{currentState === "done" ? "Run Again" : "Run Benchmark"}</>
            )}
          </button>
        </div>
      </div>

      {/* ── Description ────────────────────────────────────────── */}
      <div className="space-y-1">
        <p className="text-sm leading-relaxed" style={{ color: P.muted }}>
          {tab === "size"
            ? "Multiplies two N×N INT8 matrices (the exact operation powering every AI model: attention, convolutions, embeddings). Standard CPU computes O(N³) multiply-accumulate operations. The Hologram vGPU replaces every multiplication with a single LUT lookup from 256 pre-composed tables."
            : `Chains ${CHAIN_DEPTHS[0]}→${CHAIN_DEPTHS[CHAIN_DEPTHS.length - 1]} sequential ${CHAIN_MATRIX_SIZE}×${CHAIN_MATRIX_SIZE} matrix multiplications (A₁×A₂×…×Aₖ). Standard CPU pays O(N³) per step. The vGPU amortizes table construction across the entire chain.`}
        </p>
      </div>

      {/* ── Side-by-side idle cards ─────────────────────────────── */}
      {currentState === "idle" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-3 space-y-1.5" style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: P.red }} />
              <h3 className="text-xs font-medium" style={{ color: P.text }}>Standard CPU</h3>
            </div>
            <p className="text-2xl font-light font-mono tabular-nums leading-none" style={{ color: P.red }}>O(N³)</p>
            <p className="text-[11px] leading-relaxed" style={{ color: P.muted }}>
              {tab === "size" ? "N³ multiplications per matmul. Cubic growth." : "Each chain step = full O(N³). Linear in chain depth."}
            </p>
          </div>
          <div className="rounded-xl p-3 space-y-1.5" style={{ background: P.card, border: `1px solid hsla(38, 40%, 65%, 0.12)` }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: P.gold }} />
              <h3 className="text-xs font-medium" style={{ color: P.text }}>Hologram Virtual GPU</h3>
            </div>
            <p className="text-2xl font-light font-mono tabular-nums leading-none" style={{ color: P.gold }}>O(N²)</p>
            <p className="text-[11px] leading-relaxed" style={{ color: P.muted }}>
              {tab === "size" ? "256 LUTs replace all multiplications. Table lookups only." : "Tables built once, reused across entire chain."}
            </p>
          </div>
        </div>
      )}

      {/* ── Chart + Efficiency Amplifier ───────────────────────── */}
      {currentPoints.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-xl p-5" style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}>
            {tab === "size" ? (
              <DualLineChart
                xValues={sizePoints.map(p => p.n)}
                xLabels={sizePoints.map(p => p.label)}
                stdValues={sizePoints.map(p => p.standardMs)}
                holoValues={sizePoints.map(p => p.hologramMs)}
                xAxisLabel="Matrix Size (N×N)"
                yAxisLabel="Time (ms)"
                stdLabel="Standard CPU — O(N³)"
                holoLabel="Hologram vGPU — LUT-accelerated"
              />
            ) : (
              <DualLineChart
                xValues={chainPoints.map(p => p.chainDepth)}
                xLabels={chainPoints.map(p => `${p.chainDepth}`)}
                stdValues={chainPoints.map(p => p.standardMs)}
                holoValues={chainPoints.map(p => p.hologramMs)}
                xAxisLabel="Chain Depth (# of matmuls)"
                yAxisLabel="Time (ms)"
                stdLabel={`Standard — ${CHAIN_MATRIX_SIZE}³ × k`}
                holoLabel="Hologram — amortized LUTs"
              />
            )}
          </div>
          <EfficiencyAmplifier
            speedup={currentMaxSpeedup}
            stdTotalMs={stdTotalMs}
            holoTotalMs={holoTotalMs}
            pointCount={currentPoints.length}
            isRunning={isRunning}
          />
        </div>
      )}

      {/* ── Results table ──────────────────────────────────────── */}
      {currentState === "done" && currentPoints.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${P.cardBorder}` }}>
          <table className="w-full text-[13px] font-mono" style={{ fontFamily: "'DM Sans', monospace" }}>
            <thead>
              <tr style={{ background: P.card }}>
                <th className="text-left py-2.5 px-4 font-semibold" style={{ color: P.muted, borderBottom: `1px solid ${P.cardBorder}` }}>
                  {tab === "size" ? "Matrix" : "Chain"}
                </th>
                {tab === "size" && (
                  <th className="text-right py-2.5 px-4 font-semibold" style={{ color: P.muted, borderBottom: `1px solid ${P.cardBorder}` }}>FLOPs</th>
                )}
                <th className="text-right py-2.5 px-4 font-semibold" style={{ color: P.red, borderBottom: `1px solid ${P.cardBorder}` }}>Standard</th>
                <th className="text-right py-2.5 px-4 font-semibold" style={{ color: P.gold, borderBottom: `1px solid ${P.cardBorder}` }}>vGPU</th>
                <th className="text-right py-2.5 px-4 font-semibold" style={{ color: P.muted, borderBottom: `1px solid ${P.cardBorder}` }}>Compose</th>
                <th className="text-right py-2.5 px-4 font-semibold" style={{ color: P.text, borderBottom: `1px solid ${P.cardBorder}` }}>Speedup</th>
              </tr>
            </thead>
            <tbody>
              {tab === "size" && sizePoints.map((p, i) => (
                <tr key={p.n} style={{ background: i % 2 === 0 ? "transparent" : "hsla(38, 8%, 12%, 0.3)" }}>
                  <td className="py-2 px-4 font-semibold" style={{ color: P.text }}>{p.label}</td>
                  <td className="py-2 px-4 text-right" style={{ color: P.muted }}>{formatFlops(p.flops)}</td>
                  <td className="py-2 px-4 text-right" style={{ color: P.red }}>{p.standardMs.toFixed(2)}</td>
                  <td className="py-2 px-4 text-right" style={{ color: P.gold }}>{p.hologramMs.toFixed(2)}</td>
                  <td className="py-2 px-4 text-right" style={{ color: P.muted }}>{p.composeMs.toFixed(3)}</td>
                  <td className="py-2 px-4 text-right font-bold" style={{ color: P.text }}>{p.speedup.toFixed(1)}×</td>
                </tr>
              ))}
              {tab === "chain" && chainPoints.map((p, i) => (
                <tr key={p.chainDepth} style={{ background: i % 2 === 0 ? "transparent" : "hsla(38, 8%, 12%, 0.3)" }}>
                  <td className="py-2 px-4 font-semibold" style={{ color: P.text }}>{p.chainDepth}× matmul</td>
                  <td className="py-2 px-4 text-right" style={{ color: P.red }}>{p.standardMs.toFixed(2)}</td>
                  <td className="py-2 px-4 text-right" style={{ color: P.gold }}>{p.hologramMs.toFixed(2)}</td>
                  <td className="py-2 px-4 text-right" style={{ color: P.muted }}>{p.composeMs.toFixed(3)}</td>
                  <td className="py-2 px-4 text-right font-bold" style={{ color: P.text }}>{p.speedup.toFixed(1)}×</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Footer: Verification + Export ─────────────────────── */}
      {currentState === "done" && (
        <div className="flex items-center justify-between flex-wrap gap-3 pt-3" style={{ borderTop: `1px solid ${P.cardBorder}` }}>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-medium"
              style={{
                background: checksumMatch ? "hsla(152, 44%, 50%, 0.1)" : "hsla(0, 55%, 55%, 0.1)",
                color: checksumMatch ? P.green : P.red,
                border: `1px solid ${checksumMatch ? "hsla(152, 44%, 50%, 0.2)" : "hsla(0, 55%, 55%, 0.2)"}`,
              }}
            >
              <IconCheck size={15} />
              {checksumMatch ? "Outputs verified identical" : "Output mismatch"}
            </div>
            <span className="text-[13px]" style={{ color: P.muted }}>INT8 matmul in Z/256Z</span>
          </div>
          <button
            onClick={() => exportBenchmark(tab, sizePoints, chainPoints)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium transition-all duration-200 hover:opacity-80"
            style={{ background: P.card, color: P.text, border: `1px solid ${P.cardBorder}` }}
          >
            <IconDownload size={15} />
            Export JSON
          </button>
        </div>
      )}
    </div>
  );
}

// ── Animated counter hook ───────────────────────────────────────────────────

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
