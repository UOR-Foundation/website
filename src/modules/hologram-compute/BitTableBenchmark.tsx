/**
 * BIT_TABLE Benchmark — Memory Reduction & Quantized Inference
 * ═════════════════════════════════════════════════════════════
 *
 * Demonstrates the 64× memory reduction of BIT_TABLE (1KB) vs MUL_TABLE (64KB)
 * and compares quantized inference speed at Q4/Q8 precision.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  IconPlayerPlay,
  IconCheck,
  IconX,
  IconTable,
} from "@tabler/icons-react";
import {
  MUL_TABLE,
  MUL_TABLE_BYTES,
  BIT_TABLE,
  BIT_TABLE_Q4_BYTES,
  seededMatrix,
} from "./hologram-matmul";

// ── Palette (matches ConstantTimeBenchmark) ──────────────────────────────────

const P = {
  bg: "hsl(30 6% 9%)",
  card: "hsl(30 5% 11%)",
  cardBorder: "hsl(30 4% 18%)",
  text: "hsl(38 20% 85%)",
  muted: "hsl(38 8% 55%)",
  dim: "hsl(38 6% 40%)",
  gold: "hsl(38 40% 65%)",
  green: "hsl(152 44% 50%)",
  red: "hsl(0 55% 55%)",
  blue: "hsl(210 50% 60%)",
  font: "'DM Sans', system-ui, sans-serif",
};

// ── Types ────────────────────────────────────────────────────────────────────

interface BenchResult {
  label: string;
  bits: number;
  tableBytes: number;
  mulTableMs: number;
  bitTableMs: number;
  speedup: number;
  correctness: boolean;
  opsCount: number;
  mulTableOpsPerSec: number;
  bitTableOpsPerSec: number;
}

// ── Benchmark logic ──────────────────────────────────────────────────────────

function runSingleBench(dim: number, bits: 4 | 8, samples: number): BenchResult {
  const weights = seededMatrix(dim, 42 + dim);
  const activations = new Uint8Array(dim);
  for (let i = 0; i < dim; i++) activations[i] = ((i * 137 + 73) & 0xff);

  // Quantize weights to `bits` range
  const maxVal = (1 << bits) - 1;
  const qWeights = new Uint8Array(dim * dim);
  for (let i = 0; i < dim * dim; i++) qWeights[i] = weights[i] & maxVal;

  const opsCount = dim * dim; // One matVec = rows × cols multiply-adds

  // Warmup
  for (let w = 0; w < 3; w++) {
    // MUL_TABLE path
    for (let r = 0; r < dim; r++) {
      let sum = 0;
      for (let c = 0; c < dim; c++) sum = (sum + MUL_TABLE[(activations[c] << 8) | qWeights[r * dim + c]]) & 0xff;
    }
    // BIT_TABLE path
    BIT_TABLE.quantizedMatVec(qWeights, activations, dim, dim, bits as any);
  }

  // MUL_TABLE timing
  const mulSamples: number[] = [];
  let mulResult: Uint8Array<ArrayBuffer> = new Uint8Array(dim);
  for (let s = 0; s < samples; s++) {
    const t0 = performance.now();
    for (let r = 0; r < dim; r++) {
      let sum = 0;
      for (let c = 0; c < dim; c++) sum = (sum + MUL_TABLE[(activations[c] << 8) | qWeights[r * dim + c]]) & 0xff;
      mulResult[r] = sum;
    }
    mulSamples.push(performance.now() - t0);
  }

  // BIT_TABLE timing
  const bitSamples: number[] = [];
  let bitResult = new Uint8Array(0) as Uint8Array<ArrayBuffer>;
  for (let s = 0; s < samples; s++) {
    const t0 = performance.now();
    bitResult = BIT_TABLE.quantizedMatVec(qWeights, activations, dim, dim, bits as any) as Uint8Array<ArrayBuffer>;
    bitSamples.push(performance.now() - t0);
  }

  const mulMs = median(mulSamples);
  const bitMs = median(bitSamples);

  // Verify correctness
  let correct = mulResult.length === bitResult.length;
  if (correct) {
    for (let i = 0; i < mulResult.length; i++) {
      if (mulResult[i] !== bitResult[i]) { correct = false; break; }
    }
  }

  return {
    label: `${dim}×${dim}`,
    bits,
    tableBytes: bits <= 4 ? BIT_TABLE_Q4_BYTES : BIT_TABLE.totalBytes,
    mulTableMs: round(mulMs),
    bitTableMs: round(bitMs),
    speedup: mulMs / Math.max(bitMs, 0.001),
    correctness: correct,
    opsCount,
    mulTableOpsPerSec: Math.round(opsCount / (mulMs / 1000)),
    bitTableOpsPerSec: Math.round(opsCount / (bitMs / 1000)),
  };
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function round(v: number): number {
  return Math.round(v * 1000) / 1000;
}

function formatOps(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return `${n}`;
}

// ── Sizes ────────────────────────────────────────────────────────────────────

const BENCH_SIZES = [32, 64, 128, 256, 512];
const SAMPLES = 10;

// ── Component ────────────────────────────────────────────────────────────────

export default function BitTableBenchmark() {
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  const [results, setResults] = useState<BenchResult[]>([]);
  const [currentLabel, setCurrentLabel] = useState("");
  const cancelRef = useRef(false);

  useEffect(() => () => { cancelRef.current = true; }, []);

  const run = useCallback(async () => {
    cancelRef.current = false;
    setState("running");
    setResults([]);

    for (const dim of BENCH_SIZES) {
      if (cancelRef.current) break;
      setCurrentLabel(`${dim}×${dim} Q4`);
      await new Promise(r => setTimeout(r, 30));
      const q4 = runSingleBench(dim, 4, SAMPLES);
      setResults(prev => [...prev, q4]);

      if (cancelRef.current) break;
      setCurrentLabel(`${dim}×${dim} Q8`);
      await new Promise(r => setTimeout(r, 30));
      const q8 = runSingleBench(dim, 8, SAMPLES);
      setResults(prev => [...prev, q8]);
    }

    setState("done");
  }, []);

  // Verification badge
  const verifyResult = BIT_TABLE.verify();
  const allCorrect = results.length > 0 && results.every(r => r.correctness);
  const memoryReduction = MUL_TABLE_BYTES / BIT_TABLE_Q4_BYTES;

  return (
    <div className="space-y-4" style={{ fontFamily: P.font }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <IconTable size={16} style={{ color: P.gold }} />
          <span className="text-sm font-semibold tracking-wide" style={{ color: P.text }}>
            BIT_TABLE — Memory &amp; Inference Benchmark
          </span>
        </div>
        <button
          onClick={run}
          disabled={state === "running"}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-semibold transition-all duration-300 disabled:opacity-50"
          style={{ background: P.gold, color: "white" }}
        >
          {state === "running" ? (
            <><div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />{currentLabel}</>
          ) : (
            <><IconPlayerPlay size={13} />{state === "done" ? "Run Again" : "Run Benchmark"}</>
          )}
        </button>
      </div>

      {/* Memory Comparison Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* MUL_TABLE */}
        <div className="rounded-xl p-4 space-y-2" style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: P.blue }} />
            <h3 className="text-[13px] font-bold" style={{ color: P.blue }}>MUL_TABLE</h3>
          </div>
          <p className="text-2xl font-light font-mono leading-none" style={{ color: P.blue }}>64 KB</p>
          <p className="text-[12px] leading-relaxed" style={{ color: P.muted }}>
            Full lookup table. Every possible product of two bytes stored directly. Fast, but uses 64× more memory.
          </p>
        </div>

        {/* BIT_TABLE Q4 */}
        <div className="rounded-xl p-4 space-y-2" style={{ background: P.card, border: `1px solid hsla(38, 40%, 65%, 0.12)` }}>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: P.gold, boxShadow: "0 0 8px hsla(38, 40%, 65%, 0.4)" }} />
            <h3 className="text-[13px] font-bold" style={{ color: P.gold }}>BIT_TABLE (Q4)</h3>
          </div>
          <p className="text-2xl font-light font-mono leading-none" style={{ color: P.gold }}>1 KB</p>
          <p className="text-[12px] leading-relaxed" style={{ color: P.muted }}>
            Bit-plane decomposition for 4-bit quantized weights. Same results, fits in a single cache line block.
          </p>
        </div>

        {/* Savings */}
        <div className="rounded-xl p-4 space-y-2" style={{ background: `${P.green}08`, border: `1px solid ${P.green}15` }}>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: P.green }} />
            <h3 className="text-[13px] font-bold" style={{ color: P.green }}>Memory Saved</h3>
          </div>
          <p className="text-2xl font-light font-mono leading-none" style={{ color: P.green }}>{memoryReduction}×</p>
          <p className="text-[12px] leading-relaxed" style={{ color: P.muted }}>
            {memoryReduction}× less memory. Verified correct across all 65,536 possible products:{" "}
            <span style={{ color: verifyResult.ok ? P.green : P.red }}>{verifyResult.ok ? "✓ 0 mismatches" : `✗ ${verifyResult.mismatches} mismatches`}</span>
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-xl p-4 space-y-2" style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}>
        <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: P.text }}>How It Works</h4>
        <p className="text-[13px] leading-relaxed" style={{ color: P.muted }}>
          Instead of storing every possible answer (64KB), BIT_TABLE breaks multiplication into <strong style={{ color: P.text }}>bit-shifts and additions</strong>.
          For a 4-bit weight, that's at most <strong style={{ color: P.gold }}>4 table reads + 3 additions</strong> — no multiply instructions at all.
          This is the same math used by modern quantized AI models (GPTQ, AWQ, BitNet).
        </p>
      </div>

      {/* Results Table */}
      {results.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${P.cardBorder}`, maxHeight: "320px", overflowY: "auto" }}>
          <table className="w-full text-[12px] font-mono" style={{ fontFamily: "'DM Sans', monospace" }}>
            <thead>
              <tr style={{ background: P.card, position: "sticky", top: 0, zIndex: 1 }}>
                <th className="text-left py-1.5 px-3 font-semibold" style={{ color: P.muted, borderBottom: `1px solid ${P.cardBorder}` }}>Size</th>
                <th className="text-center py-1.5 px-3 font-semibold" style={{ color: P.muted, borderBottom: `1px solid ${P.cardBorder}` }}>Bits</th>
                <th className="text-right py-1.5 px-3 font-semibold" style={{ color: P.blue, borderBottom: `1px solid ${P.cardBorder}` }}>MUL_TABLE ms</th>
                <th className="text-right py-1.5 px-3 font-semibold" style={{ color: P.gold, borderBottom: `1px solid ${P.cardBorder}` }}>BIT_TABLE ms</th>
                <th className="text-right py-1.5 px-3 font-semibold" style={{ color: P.blue, borderBottom: `1px solid ${P.cardBorder}` }}>MUL ops/s</th>
                <th className="text-right py-1.5 px-3 font-semibold" style={{ color: P.gold, borderBottom: `1px solid ${P.cardBorder}` }}>BIT ops/s</th>
                <th className="text-center py-1.5 px-3 font-semibold" style={{ color: P.green, borderBottom: `1px solid ${P.cardBorder}` }}>Match</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : `${P.card}80`, borderBottom: `1px solid ${P.cardBorder}40` }}>
                  <td className="py-1.5 px-3 font-medium" style={{ color: P.text }}>{r.label}</td>
                  <td className="py-1.5 px-3 text-center" style={{ color: r.bits === 4 ? P.gold : P.muted }}>Q{r.bits}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums" style={{ color: P.blue }}>{r.mulTableMs.toFixed(3)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums" style={{ color: P.gold }}>{r.bitTableMs.toFixed(3)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums" style={{ color: P.blue }}>{formatOps(r.mulTableOpsPerSec)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums" style={{ color: P.gold }}>{formatOps(r.bitTableOpsPerSec)}</td>
                  <td className="py-1.5 px-3 text-center">
                    {r.correctness
                      ? <IconCheck size={13} style={{ color: P.green, display: "inline" }} />
                      : <IconX size={13} style={{ color: P.red, display: "inline" }} />
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary stats */}
      {state === "done" && results.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-3 text-center" style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}>
            <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: P.gold }}>Memory Reduction</p>
            <p className="text-xl font-mono font-light mt-0.5" style={{ color: P.gold }}>{memoryReduction}×</p>
            <p className="text-[10px] mt-0.5" style={{ color: P.muted }}>64KB → 1KB (Q4 weights)</p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}>
            <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: P.green }}>Correctness</p>
            <p className="text-xl font-mono font-light mt-0.5" style={{ color: allCorrect ? P.green : P.red }}>
              {allCorrect ? "100% Match" : "Mismatch Found"}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: P.muted }}>
              {results.filter(r => r.correctness).length}/{results.length} tests verified byte-identical
            </p>
          </div>
        </div>
      )}

      {/* Idle state */}
      {state === "idle" && (
        <div className="rounded-xl p-4 text-center" style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}>
          <p className="text-[13px]" style={{ color: P.muted }}>
            Click <strong style={{ color: P.gold }}>Run Benchmark</strong> to compare MUL_TABLE (64KB full lookup) vs BIT_TABLE (1KB bit-plane decomposition) across matrix sizes {BENCH_SIZES.join(", ")} at Q4 and Q8 precision.
          </p>
        </div>
      )}
    </div>
  );
}
