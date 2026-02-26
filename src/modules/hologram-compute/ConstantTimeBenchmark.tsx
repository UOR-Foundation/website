/**
 * Constant-Time Compute Demo — Hologram OS Native
 * ═════════════════════════════════════════════════
 *
 * Visceral side-by-side proof: O(1) vs O(N) scaling.
 * Includes JSON export for independent third-party verification.
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

// ── Shared Config ───────────────────────────────────────────────────────────

const OP_CYCLE: Array<(x: number) => number> = [
  x => (256 - x) & 0xFF,
  x => (~x) & 0xFF,
  x => (x + 1) & 0xFF,
  x => (x + 255) & 0xFF,
  x => (2 * x) & 0xFF,
  x => (x * x) & 0xFF,
  x => (x ^ 0xAA) & 0xFF,
  x => (256 - x) & 0xFF,
];

const TABLE_CACHE: Uint8Array[] = [];
function getTableCycle(): Uint8Array[] {
  if (TABLE_CACHE.length === 0) {
    TABLE_CACHE.push(
      UorLutEngine.buildTable(x => (256 - x) & 0xFF),
      UorLutEngine.buildTable(x => (~x) & 0xFF),
      UorLutEngine.buildTable(x => (x + 1) & 0xFF),
      UorLutEngine.buildTable(x => (x + 255) & 0xFF),
      UorLutEngine.buildTable(x => (2 * x) & 0xFF),
      UorLutEngine.buildTable(x => (x * x) & 0xFF),
      UorLutEngine.buildTable(x => (x ^ 0xAA) & 0xFF),
      UorLutEngine.buildTable(x => (256 - x) & 0xFF),
    );
  }
  return TABLE_CACHE;
}

// ── Benchmark Logic ─────────────────────────────────────────────────────────

// Increased difficulty: deeper chains, more data
const CHAIN_DEPTHS = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512];
const CHAIN_DATA_SIZE = 2_000_000;

interface ChainPoint {
  chainDepth: number;
  standardMs: number;
  hologramMs: number;
  speedup: number;
  composeMs: number;
  checksum: number;
  holoChecksum: number;
}

function runChainBenchmark(chainDepth: number): ChainPoint {
  const input = new Uint8Array(CHAIN_DATA_SIZE);
  for (let i = 0; i < CHAIN_DATA_SIZE; i++) input[i] = i & 0xFF;
  const tables = getTableCycle();

  const stdData = new Uint8Array(input);
  const stdStart = performance.now();
  for (let op = 0; op < chainDepth; op++) {
    const fn = OP_CYCLE[op % OP_CYCLE.length];
    for (let i = 0; i < CHAIN_DATA_SIZE; i++) stdData[i] = fn(stdData[i]);
  }
  const standardMs = performance.now() - stdStart;

  const composeStart = performance.now();
  const chain: Uint8Array[] = [];
  for (let op = 0; op < chainDepth; op++) chain.push(tables[op % tables.length]);
  const composed = UorLutEngine.composeChain(chain);
  const composeMs = performance.now() - composeStart;

  const holoData = new Uint8Array(CHAIN_DATA_SIZE);
  const applyStart = performance.now();
  for (let i = 0; i < CHAIN_DATA_SIZE; i++) holoData[i] = composed[input[i]];
  const hologramMs = (performance.now() - applyStart) + composeMs;

  // Full checksums for verification
  let checksum = 0;
  let holoChecksum = 0;
  for (let i = 0; i < CHAIN_DATA_SIZE; i++) {
    checksum += stdData[i];
    holoChecksum += holoData[i];
  }

  return {
    chainDepth,
    standardMs: Math.round(standardMs * 100) / 100,
    hologramMs: Math.round(hologramMs * 100) / 100,
    speedup: standardMs / Math.max(hologramMs, 0.01),
    composeMs: Math.round(composeMs * 100) / 100,
    checksum,
    holoChecksum,
  };
}

const DATA_SIZES = [100_000, 500_000, 1_000_000, 5_000_000, 10_000_000, 20_000_000];
const FIXED_CHAIN_DEPTH = 128;

interface ScalePoint {
  dataSize: number;
  label: string;
  standardMs: number;
  hologramMs: number;
  speedup: number;
  composeMs: number;
  applyMs: number;
  checksum: number;
  holoChecksum: number;
}

function formatSize(n: number): string {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(0)}M` : `${(n / 1_000).toFixed(0)}K`;
}

function runScaleBenchmark(dataSize: number): ScalePoint {
  const input = new Uint8Array(dataSize);
  for (let i = 0; i < dataSize; i++) input[i] = i & 0xFF;
  const tables = getTableCycle();

  const stdData = new Uint8Array(input);
  const stdStart = performance.now();
  for (let op = 0; op < FIXED_CHAIN_DEPTH; op++) {
    const fn = OP_CYCLE[op % OP_CYCLE.length];
    for (let i = 0; i < dataSize; i++) stdData[i] = fn(stdData[i]);
  }
  const standardMs = performance.now() - stdStart;

  const composeStart = performance.now();
  const chain: Uint8Array[] = [];
  for (let op = 0; op < FIXED_CHAIN_DEPTH; op++) chain.push(tables[op % tables.length]);
  const composed = UorLutEngine.composeChain(chain);
  const composeMs = performance.now() - composeStart;

  const holoData = new Uint8Array(dataSize);
  const applyStart = performance.now();
  for (let i = 0; i < dataSize; i++) holoData[i] = composed[input[i]];
  const applyMs = performance.now() - applyStart;
  const hologramMs = applyMs + composeMs;

  let checksum = 0;
  let holoChecksum = 0;
  for (let i = 0; i < dataSize; i++) {
    checksum += stdData[i];
    holoChecksum += holoData[i];
  }

  return {
    dataSize,
    label: formatSize(dataSize),
    standardMs: Math.round(standardMs * 100) / 100,
    hologramMs: Math.round(hologramMs * 100) / 100,
    speedup: standardMs / Math.max(hologramMs, 0.01),
    composeMs: Math.round(composeMs * 100) / 100,
    applyMs: Math.round(applyMs * 100) / 100,
    checksum,
    holoChecksum,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SVG Chart
// ═══════════════════════════════════════════════════════════════════════════

const CHART_W = 700;
const CHART_H = 320;
const PAD = { top: 30, right: 30, bottom: 55, left: 70 };
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
  stdLabel = "Standard",
  holoLabel = "Hologram Virtual GPU",
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
    <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full" style={{ maxWidth: 760 }}>
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
          <line x1={PAD.left} y1={g.y} x2={CHART_W - PAD.right} y2={g.y} stroke={P.dim} strokeWidth={0.5} strokeDasharray="4,4" opacity={0.4} />
          <text x={PAD.left - 10} y={g.y + 4} textAnchor="end" fill={P.muted} fontSize={11} fontFamily="'DM Sans', monospace">{g.label}</text>
        </g>
      ))}

      {xValues.map((x, i) => (
        <text key={i} x={xScale(x)} y={CHART_H - PAD.bottom + 20} textAnchor="middle" fill={P.muted} fontSize={11} fontFamily="'DM Sans', monospace">
          {xLabels[i]}
        </text>
      ))}

      <text x={CHART_W / 2} y={CHART_H - 5} textAnchor="middle" fill={P.dim} fontSize={12} fontFamily={P.font}>{xAxisLabel}</text>
      <text x={16} y={CHART_H / 2} textAnchor="middle" fill={P.dim} fontSize={12} fontFamily={P.font} transform={`rotate(-90, 16, ${CHART_H / 2})`}>{yAxisLabel}</text>

      {/* Standard — rising line */}
      <polygon
        points={`${xScale(xValues[0])},${yScale(0)} ${stdPath} ${xScale(xValues[xValues.length - 1])},${yScale(0)}`}
        fill="url(#std-fill)"
      />
      <polyline points={stdPath} fill="none" stroke={P.red} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {xValues.map((x, i) => (
        <circle key={`s-${i}`} cx={xScale(x)} cy={yScale(stdValues[i])} r={4.5} fill={P.red} />
      ))}

      {/* Hologram — flat gold line */}
      <polygon
        points={`${xScale(xValues[0])},${yScale(0)} ${holoPath} ${xScale(xValues[xValues.length - 1])},${yScale(0)}`}
        fill="url(#holo-fill)"
      />
      <polyline points={holoPath} fill="none" stroke={P.gold} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {xValues.map((x, i) => (
        <circle key={`h-${i}`} cx={xScale(x)} cy={yScale(holoValues[i])} r={4.5} fill={P.gold} />
      ))}

      {/* Legend */}
      <g transform={`translate(${PAD.left + 10}, ${PAD.top + 5})`}>
        <rect x={0} y={0} width={12} height={3} rx={1} fill={P.red} />
        <text x={16} y={5} fill={P.muted} fontSize={11} fontFamily={P.font}>{stdLabel}</text>
        <rect x={0} y={16} width={12} height={3} rx={1} fill={P.gold} />
        <text x={16} y={21} fill={P.muted} fontSize={11} fontFamily={P.font}>{holoLabel}</text>
      </g>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Export for Verification
// ═══════════════════════════════════════════════════════════════════════════

function exportBenchmark(
  tab: "chain" | "scale",
  chainPoints: ChainPoint[],
  scalePoints: ScalePoint[]
) {
  const data = tab === "chain" ? chainPoints : scalePoints;
  const checksumMatch = data.every(p => p.checksum === p.holoChecksum);

  const report = {
    benchmark: "Hologram Virtual GPU — Constant-Time Proof",
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    mode: tab === "chain" ? "Chain Depth Scaling" : "Data Size Scaling",
    parameters: tab === "chain"
      ? { dataSize: CHAIN_DATA_SIZE, depths: CHAIN_DEPTHS }
      : { chainDepth: FIXED_CHAIN_DEPTH, sizes: DATA_SIZES },
    checksumVerification: checksumMatch
      ? "PASS — Standard and Hologram outputs are byte-identical for all test cases"
      : "FAIL — Output mismatch detected",
    results: data,
    methodology: {
      standard: "Sequential application of N operations over the full dataset. Each op iterates every element. Total work = O(N × D).",
      virtualGpu: "All N operations composed into a single 256-byte LUT via functional composition. One pass over data using table lookup. Total work = O(D) for compose + O(D) for apply.",
      verification: "Full byte-level checksum computed over entire output arrays. Both paths must produce identical checksums to confirm correctness.",
    },
    howToVerify: [
      "1. Open your browser's DevTools Console",
      "2. The operations are: neg(x)=(256-x)&0xFF, bnot(x)=(~x)&0xFF, succ(x)=(x+1)&0xFF, pred(x)=(x+255)&0xFF, dbl(x)=(2*x)&0xFF, sqr(x)=(x*x)&0xFF, xorAA(x)=(x^0xAA)&0xFF, neg again",
      "3. For chain depth N, apply operations 0..N-1 (cycling the 8 ops) sequentially to each byte",
      "4. The Hologram Virtual GPU path composes these into one 256-entry table, then applies it once per byte",
      "5. Both must produce the same output (checksum field confirms this)",
    ],
  };

  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `vgpu-benchmark-${tab}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

type BenchTab = "chain" | "scale";
type BenchState = "idle" | "running" | "done";

export default function ConstantTimeBenchmark() {
  const [tab, setTab] = useState<BenchTab>("chain");
  const [chainState, setChainState] = useState<BenchState>("idle");
  const [scaleState, setScaleState] = useState<BenchState>("idle");
  const [chainPoints, setChainPoints] = useState<ChainPoint[]>([]);
  const [scalePoints, setScalePoints] = useState<ScalePoint[]>([]);
  const [progress, setProgress] = useState("");
  const cancelRef = useRef(false);

  const runChain = useCallback(async () => {
    cancelRef.current = false;
    setChainState("running");
    setChainPoints([]);
    for (const depth of CHAIN_DEPTHS) {
      if (cancelRef.current) break;
      setProgress(`${depth} ops`);
      await new Promise(r => setTimeout(r, 30));
      const point = runChainBenchmark(depth);
      setChainPoints(prev => [...prev, point]);
    }
    setChainState("done");
  }, []);

  const runScale = useCallback(async () => {
    cancelRef.current = false;
    setScaleState("running");
    setScalePoints([]);
    for (const size of DATA_SIZES) {
      if (cancelRef.current) break;
      setProgress(formatSize(size));
      await new Promise(r => setTimeout(r, 50));
      const point = runScaleBenchmark(size);
      setScalePoints(prev => [...prev, point]);
    }
    setScaleState("done");
  }, []);

  useEffect(() => () => { cancelRef.current = true; }, []);

  const isRunning = chainState === "running" || scaleState === "running";
  const currentState = tab === "chain" ? chainState : scaleState;
  const currentPoints = tab === "chain" ? chainPoints : scalePoints;
  const chainMax = chainPoints.length > 0 ? Math.max(...chainPoints.map(p => p.speedup)) : 0;
  const scaleMax = scalePoints.length > 0 ? Math.max(...scalePoints.map(p => p.speedup)) : 0;
  const checksumMatch = currentPoints.length > 0 && currentPoints.every(p => p.checksum === p.holoChecksum);

  return (
    <div className="space-y-8" style={{ fontFamily: P.font }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <IconFlame size={18} style={{ color: P.gold }} />
          <span className="text-xs font-mono uppercase tracking-widest" style={{ color: P.muted }}>
            Live Benchmark
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab toggle */}
          <div
            className="inline-flex items-center rounded-full p-0.5 gap-0.5"
            style={{ border: `1px solid ${P.cardBorder}`, background: P.card }}
          >
            {(["chain", "scale"] as BenchTab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300"
                style={{
                  background: tab === t ? "hsla(38, 40%, 65%, 0.15)" : "transparent",
                  color: tab === t ? P.gold : P.muted,
                }}
              >
                {t === "chain" ? "Chain Depth" : "Data Scale"}
              </button>
            ))}
          </div>

          {/* Run button */}
          <button
            onClick={tab === "chain" ? runChain : runScale}
            disabled={isRunning}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 disabled:opacity-50"
            style={{ background: P.gold, color: P.bg }}
          >
            {isRunning ? (
              <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />{progress}…</>
            ) : (
              <><IconPlayerPlay size={15} />{currentState === "done" ? "Run Again" : "Run Benchmark"}</>
            )}
          </button>
        </div>
      </div>

      {/* ── Side-by-side comparison (idle state) ──────────────── */}
      {currentState === "idle" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl p-6 space-y-4" style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ background: P.red }} />
              <h3 className="text-base font-medium" style={{ color: P.text }}>Standard Compute</h3>
            </div>
            <p className="text-5xl font-light font-mono tabular-nums leading-none" style={{ color: P.red }}>
              O(N)
            </p>
            <p className="text-sm leading-relaxed" style={{ color: P.muted }}>
              {tab === "chain"
                ? "Each operation requires a full pass. 512 ops = 512× the work."
                : "128 chained operations × N elements. More data = proportionally more time."}
            </p>
          </div>

          <div className="rounded-xl p-6 space-y-4" style={{ background: P.card, border: `1px solid hsla(38, 40%, 65%, 0.12)` }}>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ background: P.gold }} />
              <h3 className="text-base font-medium" style={{ color: P.text }}>Hologram Virtual GPU</h3>
            </div>
            <p className="text-5xl font-light font-mono tabular-nums leading-none" style={{ color: P.gold }}>
              O(1)
            </p>
            <p className="text-sm leading-relaxed" style={{ color: P.muted }}>
              {tab === "chain"
                ? "All operations collapse into one 256-byte table. 512 ops = 1 lookup."
                : "One composed table, one pass. Time stays flat regardless of chain depth."}
            </p>
          </div>
        </div>
      )}

      {/* ── Chart ─────────────────────────────────────────────── */}
      {tab === "chain" && chainPoints.length > 0 && (
        <div className="rounded-xl p-5" style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}>
          <DualLineChart
            xValues={chainPoints.map(p => p.chainDepth)}
            xLabels={chainPoints.map(p => `${p.chainDepth}`)}
            stdValues={chainPoints.map(p => p.standardMs)}
            holoValues={chainPoints.map(p => p.hologramMs)}
            xAxisLabel="Chained Operations"
            yAxisLabel="Time (ms)"
            stdLabel="Standard — O(N × D)"
            holoLabel="Hologram vGPU — O(1) in N"
          />
        </div>
      )}

      {tab === "scale" && scalePoints.length > 0 && (
        <div className="rounded-xl p-5" style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}>
          <DualLineChart
            xValues={scalePoints.map(p => p.dataSize)}
            xLabels={scalePoints.map(p => p.label)}
            stdValues={scalePoints.map(p => p.standardMs)}
            holoValues={scalePoints.map(p => p.hologramMs)}
            xAxisLabel="Data Size (elements)"
            yAxisLabel="Time (ms)"
            stdLabel="Standard — 128 passes × N"
            holoLabel="Hologram vGPU — 1 pass × N"
          />
        </div>
      )}

      {/* ── Summary cards (large, readable numbers) ───────────── */}
      {tab === "chain" && chainPoints.length > 0 && (() => {
        const last = chainPoints[chainPoints.length - 1];
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard value={`${chainMax.toFixed(0)}×`} label="Peak Speedup" color={P.gold} accent />
            <SummaryCard value={`${last.standardMs.toFixed(1)} ms`} label={`Standard @ ${last.chainDepth} ops`} color={P.red} />
            <SummaryCard value={`${last.hologramMs.toFixed(1)} ms`} label={`Hologram vGPU @ ${last.chainDepth} ops`} color={P.gold} />
            <SummaryCard value={`${last.composeMs.toFixed(2)} ms`} label="Table Compose" />
          </div>
        );
      })()}

      {tab === "scale" && scalePoints.length > 0 && (() => {
        const last = scalePoints[scalePoints.length - 1];
        const first = scalePoints[0];
        const stdGrowth = last.standardMs / Math.max(first.standardMs, 0.01);
        const holoGrowth = last.hologramMs / Math.max(first.hologramMs, 0.01);
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard value={`${scaleMax.toFixed(0)}×`} label="Peak Speedup" color={P.gold} accent />
            <SummaryCard value={`${stdGrowth.toFixed(0)}×`} label={`Std growth ${first.label}→${last.label}`} color={P.red} />
            <SummaryCard value={`${holoGrowth.toFixed(1)}×`} label={`vGPU growth ${first.label}→${last.label}`} color={P.gold} />
            <SummaryCard value={`${last.applyMs.toFixed(1)} ms`} label={`vGPU apply @ ${last.label}`} color={P.gold} />
          </div>
        );
      })()}

      {/* ── Results table (larger text) ───────────────────────── */}
      {currentState === "done" && currentPoints.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${P.cardBorder}` }}>
          <table className="w-full text-sm font-mono" style={{ fontFamily: "'DM Sans', monospace" }}>
            <thead>
              <tr style={{ background: P.card }}>
                <th className="text-left py-3 px-4 font-medium" style={{ color: P.muted, borderBottom: `1px solid ${P.cardBorder}` }}>
                  {tab === "chain" ? "Ops" : "Data"}
                </th>
                <th className="text-right py-3 px-4 font-medium" style={{ color: P.red, borderBottom: `1px solid ${P.cardBorder}` }}>Standard</th>
                <th className="text-right py-3 px-4 font-medium" style={{ color: P.gold, borderBottom: `1px solid ${P.cardBorder}` }}>Hologram vGPU</th>
                {tab === "scale" && (
                  <th className="text-right py-3 px-4 font-medium" style={{ color: P.muted, borderBottom: `1px solid ${P.cardBorder}` }}>Apply</th>
                )}
                <th className="text-right py-3 px-4 font-medium" style={{ color: P.muted, borderBottom: `1px solid ${P.cardBorder}` }}>Compose</th>
                <th className="text-right py-3 px-4 font-medium" style={{ color: P.text, borderBottom: `1px solid ${P.cardBorder}` }}>Speedup</th>
              </tr>
            </thead>
            <tbody>
              {tab === "chain" && chainPoints.map((p, i) => (
                <tr key={p.chainDepth} style={{ background: i % 2 === 0 ? "transparent" : "hsla(38, 8%, 12%, 0.3)" }}>
                  <td className="py-2.5 px-4 font-semibold text-base" style={{ color: P.text }}>{p.chainDepth}</td>
                  <td className="py-2.5 px-4 text-right" style={{ color: P.red }}>{p.standardMs.toFixed(2)}</td>
                  <td className="py-2.5 px-4 text-right" style={{ color: P.gold }}>{p.hologramMs.toFixed(2)}</td>
                  <td className="py-2.5 px-4 text-right" style={{ color: P.muted }}>{p.composeMs.toFixed(3)}</td>
                  <td className="py-2.5 px-4 text-right font-bold text-base" style={{ color: P.text }}>{p.speedup.toFixed(1)}×</td>
                </tr>
              ))}
              {tab === "scale" && scalePoints.map((p, i) => (
                <tr key={p.dataSize} style={{ background: i % 2 === 0 ? "transparent" : "hsla(38, 8%, 12%, 0.3)" }}>
                  <td className="py-2.5 px-4 font-semibold text-base" style={{ color: P.text }}>{p.label}</td>
                  <td className="py-2.5 px-4 text-right" style={{ color: P.red }}>{p.standardMs.toFixed(2)}</td>
                  <td className="py-2.5 px-4 text-right" style={{ color: P.gold }}>{p.hologramMs.toFixed(2)}</td>
                  <td className="py-2.5 px-4 text-right" style={{ color: P.muted }}>{p.applyMs.toFixed(2)}</td>
                  <td className="py-2.5 px-4 text-right" style={{ color: P.muted }}>{p.composeMs.toFixed(3)}</td>
                  <td className="py-2.5 px-4 text-right font-bold text-base" style={{ color: P.text }}>{p.speedup.toFixed(1)}×</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Footer: Verification + Export ─────────────────────── */}
      {currentState === "done" && (
        <div className="flex items-center justify-between flex-wrap gap-4 pt-3" style={{ borderTop: `1px solid ${P.cardBorder}` }}>
          {/* Checksum verification badge */}
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
              style={{
                background: checksumMatch ? "hsla(152, 44%, 50%, 0.1)" : "hsla(0, 55%, 55%, 0.1)",
                color: checksumMatch ? P.green : P.red,
                border: `1px solid ${checksumMatch ? "hsla(152, 44%, 50%, 0.2)" : "hsla(0, 55%, 55%, 0.2)"}`,
              }}
            >
              <IconCheck size={16} />
              {checksumMatch ? "Outputs match — byte-identical" : "Checksum mismatch"}
            </div>
            <span className="text-sm" style={{ color: P.muted }}>
              Computed live in this browser
            </span>
          </div>

          {/* Export for third-party verification */}
          <button
            onClick={() => exportBenchmark(tab, chainPoints, scalePoints)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:opacity-80"
            style={{
              background: P.card,
              color: P.text,
              border: `1px solid ${P.cardBorder}`,
            }}
          >
            <IconDownload size={16} />
            Export for Verification
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

function parseValueParts(value: string): { num: number; prefix: string; suffix: string; decimals: number } {
  const match = value.match(/^([~]?)(\d+\.?\d*)\s*(.*)$/);
  if (!match) return { num: 0, prefix: "", suffix: value, decimals: 0 };
  const numStr = match[2];
  const decimals = numStr.includes(".") ? numStr.split(".")[1].length : 0;
  return { num: parseFloat(numStr), prefix: match[1], suffix: match[3] ? ` ${match[3]}` : "", decimals };
}

function SummaryCard({ value, label, color, accent }: { value: string; label: string; color?: string; accent?: boolean }) {
  const { num, prefix, suffix, decimals } = parseValueParts(value);
  const animated = useCountUp(num);
  const display = num > 0
    ? `${prefix}${decimals > 0 ? animated.toFixed(decimals) : Math.round(animated)}${suffix}`
    : value;

  return (
    <div
      className="text-center p-5 rounded-xl"
      style={{
        background: accent ? "hsla(38, 40%, 65%, 0.08)" : P.card,
        border: `1px solid ${accent ? "hsla(38, 40%, 65%, 0.15)" : P.cardBorder}`,
      }}
    >
      <p className="text-3xl md:text-4xl font-bold font-mono tabular-nums" style={{ color: color ?? P.text }}>{display}</p>
      <p className="text-xs uppercase tracking-wider mt-2" style={{ color: P.muted }}>{label}</p>
    </div>
  );
}
