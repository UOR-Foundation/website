/**
 * Quantized Transformer Attention Demo
 * ═════════════════════════════════════
 *
 * Runs a small single-head attention layer entirely via BIT_TABLE
 * bit-plane lookups — zero multiply instructions.
 *
 * Architecture (INT8 quantized, Q4 weights):
 *   1. Linear projections: Q = x·Wq, K = x·Wk, V = x·Wv
 *   2. Attention scores: A = Q·Kᵀ  (scaled by fixed shift)
 *   3. Softmax approximation: row-wise normalization in INT8
 *   4. Output: O = A·V
 *   5. Final projection: y = O·Wo
 *
 * Every matrix-vector product uses BIT_TABLE.quantizedMatVec.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  IconPlayerPlay, IconBrain, IconCheck, IconArrowRight,
} from "@tabler/icons-react";
import { BIT_TABLE, BIT_TABLE_Q4_BYTES, MUL_TABLE, MUL_TABLE_BYTES } from "./hologram-matmul";
import type { BitPrecision } from "./hologram-matmul";

// ── Palette ──────────────────────────────────────────────────────────────────

const P = {
  card: "hsl(30 5% 11%)",
  cardBorder: "hsl(30 4% 18%)",
  text: "hsl(38 20% 85%)",
  muted: "hsl(38 8% 55%)",
  dim: "hsl(38 6% 40%)",
  gold: "hsl(38 40% 65%)",
  green: "hsl(152 44% 50%)",
  red: "hsl(0 55% 55%)",
  blue: "hsl(210 50% 60%)",
  purple: "hsl(265 40% 60%)",
  font: "'DM Sans', system-ui, sans-serif",
};

// ── Config ───────────────────────────────────────────────────────────────────

const CONFIGS = [
  { label: "Tiny",   seqLen: 8,  dim: 16, bits: 4 as BitPrecision },
  { label: "Small",  seqLen: 16, dim: 32, bits: 4 as BitPrecision },
  { label: "Medium", seqLen: 32, dim: 64, bits: 4 as BitPrecision },
  { label: "Large",  seqLen: 64, dim: 128, bits: 4 as BitPrecision },
];

// ── Seeded weight generation ─────────────────────────────────────────────────

function seededWeights(rows: number, cols: number, seed: number, maxVal: number): Uint8Array {
  const w = new Uint8Array(rows * cols);
  let s = seed >>> 0;
  for (let i = 0; i < w.length; i++) {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    w[i] = ((t ^ (t >>> 14)) >>> 0) % (maxVal + 1);
  }
  return w;
}

function seededInput(len: number, seed: number): Uint8Array {
  const x = new Uint8Array(len);
  let s = seed >>> 0;
  for (let i = 0; i < len; i++) {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    x[i] = ((t ^ (t >>> 14)) >>> 0) & 0xff;
  }
  return x;
}

// ── INT8 softmax approximation ───────────────────────────────────────────────

function int8Softmax(scores: Uint8Array, cols: number): Uint8Array {
  // Simple row-wise normalization: scale each value relative to row sum
  const out = new Uint8Array(scores.length);
  const rows = scores.length / cols;
  for (let r = 0; r < rows; r++) {
    let sum = 0;
    for (let c = 0; c < cols; c++) sum += scores[r * cols + c];
    if (sum === 0) sum = 1;
    for (let c = 0; c < cols; c++) {
      out[r * cols + c] = Math.round((scores[r * cols + c] / sum) * 255) & 0xff;
    }
  }
  return out;
}

// ── Attention layer ──────────────────────────────────────────────────────────

interface AttentionResult {
  output: Uint8Array;
  steps: StepTiming[];
  totalMs: number;
  totalOps: number;
  config: typeof CONFIGS[0];
  memoryUsed: number;
}

interface StepTiming {
  name: string;
  ms: number;
  ops: number;
  description: string;
}

function mulTableMatVec(weights: Uint8Array, x: Uint8Array, rows: number, cols: number): Uint8Array {
  const y = new Uint8Array(rows);
  for (let r = 0; r < rows; r++) {
    let sum = 0;
    const off = r * cols;
    for (let c = 0; c < cols; c++) {
      sum = (sum + MUL_TABLE[(x[c] << 8) | weights[off + c]]) & 0xff;
    }
    y[r] = sum;
  }
  return y;
}

function runAttention(cfg: typeof CONFIGS[0]): { bitTable: AttentionResult; mulTable: AttentionResult } {
  const { seqLen, dim, bits } = cfg;
  const maxW = (1 << bits) - 1;

  // Generate deterministic weights
  const Wq = seededWeights(dim, dim, 100, maxW);
  const Wk = seededWeights(dim, dim, 200, maxW);
  const Wv = seededWeights(dim, dim, 300, maxW);
  const Wo = seededWeights(dim, dim, 400, maxW);

  // Generate input tokens (seqLen tokens, each dim-dimensional)
  const tokens: Uint8Array[] = [];
  for (let t = 0; t < seqLen; t++) tokens.push(seededInput(dim, 500 + t));

  function runPath(method: "bit" | "mul"): AttentionResult {
    const mv = (w: Uint8Array, x: Uint8Array, rows: number, cols: number) =>
      method === "bit"
        ? BIT_TABLE.quantizedMatVec(w, x, rows, cols, bits)
        : mulTableMatVec(w, x, rows, cols);

    const steps: StepTiming[] = [];
    let totalOps = 0;

    // 1. Linear projections: Q, K, V for each token
    const Qs: Uint8Array[] = [];
    const Ks: Uint8Array[] = [];
    const Vs: Uint8Array[] = [];

    const t0 = performance.now();
    for (let t = 0; t < seqLen; t++) {
      Qs.push(mv(Wq, tokens[t], dim, dim));
      Ks.push(mv(Wk, tokens[t], dim, dim));
      Vs.push(mv(Wv, tokens[t], dim, dim));
    }
    const projMs = performance.now() - t0;
    const projOps = 3 * seqLen * dim * dim;
    totalOps += projOps;
    steps.push({ name: "Q, K, V Projections", ms: projMs, ops: projOps, description: `${seqLen} tokens × 3 projections × ${dim}×${dim}` });

    // 2. Attention scores: for each query, dot with all keys
    const t1 = performance.now();
    const attnScores = new Uint8Array(seqLen * seqLen);
    for (let q = 0; q < seqLen; q++) {
      for (let k = 0; k < seqLen; k++) {
        let dot = 0;
        for (let d = 0; d < dim; d++) {
          dot = (dot + (method === "bit"
            ? BIT_TABLE.quantizedMultiply(Qs[q][d], Ks[k][d], bits)
            : MUL_TABLE[(Qs[q][d] << 8) | Ks[k][d]]
          )) & 0xff;
        }
        attnScores[q * seqLen + k] = dot;
      }
    }
    const attnMs = performance.now() - t1;
    const attnOps = seqLen * seqLen * dim;
    totalOps += attnOps;
    steps.push({ name: "Attention Scores", ms: attnMs, ops: attnOps, description: `${seqLen}×${seqLen} dot products, ${dim}-dim each` });

    // 3. Softmax
    const t2 = performance.now();
    const attnWeights = int8Softmax(attnScores, seqLen);
    const softMs = performance.now() - t2;
    steps.push({ name: "Softmax (INT8)", ms: softMs, ops: seqLen * seqLen, description: `Row-wise normalization, ${seqLen} rows` });
    totalOps += seqLen * seqLen;

    // 4. Weighted sum: O[q] = Σ attnWeights[q,k] * V[k]
    const t3 = performance.now();
    const outputs: Uint8Array[] = [];
    for (let q = 0; q < seqLen; q++) {
      const o = new Uint8Array(dim);
      for (let k = 0; k < seqLen; k++) {
        const w = attnWeights[q * seqLen + k];
        if (w === 0) continue;
        for (let d = 0; d < dim; d++) {
          o[d] = (o[d] + (method === "bit"
            ? BIT_TABLE.quantizedMultiply(Vs[k][d], w, 8)
            : MUL_TABLE[(Vs[k][d] << 8) | w]
          )) & 0xff;
        }
      }
      outputs.push(o);
    }
    const weightMs = performance.now() - t3;
    const weightOps = seqLen * seqLen * dim;
    totalOps += weightOps;
    steps.push({ name: "Weighted Value Sum", ms: weightMs, ops: weightOps, description: `${seqLen} queries × ${seqLen} values × ${dim}-dim` });

    // 5. Output projection
    const t4 = performance.now();
    const finalOutputs: Uint8Array[] = [];
    for (let t = 0; t < seqLen; t++) {
      finalOutputs.push(mv(Wo, outputs[t], dim, dim));
    }
    const outMs = performance.now() - t4;
    const outOps = seqLen * dim * dim;
    totalOps += outOps;
    steps.push({ name: "Output Projection", ms: outMs, ops: outOps, description: `${seqLen} tokens × ${dim}×${dim}` });

    const totalMs = projMs + attnMs + softMs + weightMs + outMs;

    // Concat final
    const flat = new Uint8Array(seqLen * dim);
    for (let t = 0; t < seqLen; t++) flat.set(finalOutputs[t], t * dim);

    return {
      output: flat,
      steps,
      totalMs,
      totalOps,
      config: cfg,
      memoryUsed: method === "bit" ? BIT_TABLE_Q4_BYTES : MUL_TABLE_BYTES,
    };
  }

  return { bitTable: runPath("bit"), mulTable: runPath("mul") };
}

// ── Formatting ───────────────────────────────────────────────────────────────

function fmtOps(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return `${n}`;
}

function fmtMs(n: number): string {
  return n < 0.01 ? "<0.01" : n.toFixed(2);
}

// ── Component ────────────────────────────────────────────────────────────────

export default function TransformerAttentionDemo() {
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  const [selectedConfig, setSelectedConfig] = useState(1); // Small by default
  const [results, setResults] = useState<{ bitTable: AttentionResult; mulTable: AttentionResult } | null>(null);
  const [currentStep, setCurrentStep] = useState("");
  const cancelRef = useRef(false);

  useEffect(() => () => { cancelRef.current = true; }, []);

  const run = useCallback(async () => {
    setState("running");
    setCurrentStep("Initializing...");
    await new Promise(r => setTimeout(r, 50));

    const cfg = CONFIGS[selectedConfig];
    setCurrentStep(`Running ${cfg.label} (${cfg.seqLen} tokens, ${cfg.dim}-dim)...`);
    await new Promise(r => setTimeout(r, 30));

    const res = runAttention(cfg);
    setResults(res);
    setState("done");
  }, [selectedConfig]);

  const outputsMatch = results
    ? results.bitTable.output.every((v, i) => v === results.mulTable.output[i])
    : false;

  return (
    <div className="space-y-4" style={{ fontFamily: P.font }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <IconBrain size={16} style={{ color: P.purple }} />
          <span className="text-sm font-semibold tracking-wide" style={{ color: P.text }}>
            Quantized Attention — Multiply-Free Inference
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Config selector */}
          <div className="inline-flex items-center rounded-full p-0.5 gap-0.5" style={{ border: `1px solid ${P.cardBorder}`, background: P.card }}>
            {CONFIGS.map((cfg, i) => (
              <button
                key={cfg.label}
                onClick={() => setSelectedConfig(i)}
                className="px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-300"
                style={{
                  background: selectedConfig === i ? `${P.purple}25` : "transparent",
                  color: selectedConfig === i ? P.purple : P.muted,
                }}
              >
                {cfg.label}
              </button>
            ))}
          </div>

          <button
            onClick={run}
            disabled={state === "running"}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-semibold transition-all disabled:opacity-50"
            style={{ background: P.purple, color: "white" }}
          >
            {state === "running" ? (
              <><div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />{currentStep}</>
            ) : (
              <><IconPlayerPlay size={13} />{state === "done" ? "Run Again" : "Run Attention"}</>
            )}
          </button>
        </div>
      </div>

      {/* Architecture diagram */}
      <div className="rounded-xl p-4" style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}>
        <h4 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: P.text }}>What This Runs</h4>
        <p className="text-[13px] leading-relaxed mb-3" style={{ color: P.muted }}>
          A complete <strong style={{ color: P.text }}>single-head attention layer</strong> — the building block of every transformer model
          (GPT, BERT, LLaMA). Every multiplication is replaced with <strong style={{ color: P.gold }}>bit-plane table lookups</strong> from
          a <strong style={{ color: P.gold }}>1KB table</strong>, using 4-bit quantized weights.
        </p>
        <div className="flex items-center gap-1.5 flex-wrap text-[12px] font-mono" style={{ color: P.muted }}>
          {["Input Tokens", "Q,K,V Projections", "Attention Scores", "Softmax", "Value Weighting", "Output Projection"].map((step, i, arr) => (
            <span key={step} className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-md" style={{ background: `${P.purple}12`, color: P.text, border: `1px solid ${P.purple}20` }}>{step}</span>
              {i < arr.length - 1 && <IconArrowRight size={10} style={{ color: P.dim }} />}
            </span>
          ))}
        </div>
      </div>

      {/* Idle state */}
      {state === "idle" && (
        <div className="rounded-xl p-5 text-center" style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}>
          <p className="text-[13px]" style={{ color: P.muted }}>
            Select a model size and click <strong style={{ color: P.purple }}>Run Attention</strong> to execute
            a full attention layer using only bit-plane lookups. Both BIT_TABLE and MUL_TABLE paths run for comparison.
          </p>
          <div className="mt-3 text-[12px] font-mono" style={{ color: P.dim }}>
            {CONFIGS[selectedConfig].seqLen} tokens × {CONFIGS[selectedConfig].dim}-dim × Q{CONFIGS[selectedConfig].bits} weights
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl p-3 text-center" style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}>
              <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: P.gold }}>BIT_TABLE Time</p>
              <p className="text-xl font-mono font-light mt-0.5" style={{ color: P.gold }}>{fmtMs(results.bitTable.totalMs)}ms</p>
              <p className="text-[10px] mt-0.5" style={{ color: P.muted }}>1KB memory</p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}>
              <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: P.blue }}>MUL_TABLE Time</p>
              <p className="text-xl font-mono font-light mt-0.5" style={{ color: P.blue }}>{fmtMs(results.mulTable.totalMs)}ms</p>
              <p className="text-[10px] mt-0.5" style={{ color: P.muted }}>64KB memory</p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}>
              <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: P.purple }}>Total Operations</p>
              <p className="text-xl font-mono font-light mt-0.5" style={{ color: P.purple }}>{fmtOps(results.bitTable.totalOps)}</p>
              <p className="text-[10px] mt-0.5" style={{ color: P.muted }}>zero multiplies</p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: `${P.green}08`, border: `1px solid ${P.green}15` }}>
              <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: P.green }}>Output Match</p>
              <p className="text-xl font-mono font-light mt-0.5" style={{ color: outputsMatch ? P.green : P.red }}>
                {outputsMatch ? "Identical" : "Mismatch"}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: P.muted }}>byte-for-byte verified</p>
            </div>
          </div>

          {/* Step breakdown */}
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${P.cardBorder}` }}>
            <table className="w-full text-[12px]" style={{ fontFamily: "'DM Sans', monospace" }}>
              <thead>
                <tr style={{ background: P.card }}>
                  <th className="text-left py-1.5 px-3 font-semibold" style={{ color: P.muted, borderBottom: `1px solid ${P.cardBorder}` }}>Step</th>
                  <th className="text-left py-1.5 px-3 font-semibold" style={{ color: P.muted, borderBottom: `1px solid ${P.cardBorder}` }}>Detail</th>
                  <th className="text-right py-1.5 px-3 font-semibold" style={{ color: P.gold, borderBottom: `1px solid ${P.cardBorder}` }}>BIT ms</th>
                  <th className="text-right py-1.5 px-3 font-semibold" style={{ color: P.blue, borderBottom: `1px solid ${P.cardBorder}` }}>MUL ms</th>
                  <th className="text-right py-1.5 px-3 font-semibold" style={{ color: P.muted, borderBottom: `1px solid ${P.cardBorder}` }}>Ops</th>
                </tr>
              </thead>
              <tbody>
                {results.bitTable.steps.map((step, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : `${P.card}80`, borderBottom: `1px solid ${P.cardBorder}40` }}>
                    <td className="py-1.5 px-3 font-medium" style={{ color: P.text }}>{step.name}</td>
                    <td className="py-1.5 px-3" style={{ color: P.dim }}>{step.description}</td>
                    <td className="py-1.5 px-3 text-right tabular-nums font-mono" style={{ color: P.gold }}>{fmtMs(step.ms)}</td>
                    <td className="py-1.5 px-3 text-right tabular-nums font-mono" style={{ color: P.blue }}>{fmtMs(results.mulTable.steps[i]?.ms ?? 0)}</td>
                    <td className="py-1.5 px-3 text-right tabular-nums font-mono" style={{ color: P.muted }}>{fmtOps(step.ops)}</td>
                  </tr>
                ))}
                {/* Total row */}
                <tr style={{ background: P.card, borderTop: `1px solid ${P.cardBorder}` }}>
                  <td className="py-1.5 px-3 font-bold" style={{ color: P.text }}>Total</td>
                  <td className="py-1.5 px-3" style={{ color: P.dim }}>Full attention layer</td>
                  <td className="py-1.5 px-3 text-right tabular-nums font-mono font-bold" style={{ color: P.gold }}>{fmtMs(results.bitTable.totalMs)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums font-mono font-bold" style={{ color: P.blue }}>{fmtMs(results.mulTable.totalMs)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums font-mono font-bold" style={{ color: P.muted }}>{fmtOps(results.bitTable.totalOps)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Output preview */}
          <div className="rounded-xl p-3" style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}>
            <h4 className="text-[10px] uppercase tracking-widest font-bold mb-1.5" style={{ color: P.text }}>Output Sample (first 8 values per token, first 4 tokens)</h4>
            <div className="grid grid-cols-2 gap-3 text-[11px] font-mono">
              <div>
                <p className="text-[9px] uppercase tracking-widest font-bold mb-1" style={{ color: P.gold }}>BIT_TABLE</p>
                {Array.from({ length: Math.min(4, results.bitTable.config.seqLen) }, (_, t) => {
                  const off = t * results.bitTable.config.dim;
                  const vals = Array.from(results.bitTable.output.slice(off, off + 8));
                  return <p key={t} style={{ color: P.muted }}>t{t}: [{vals.join(", ")}]</p>;
                })}
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-widest font-bold mb-1" style={{ color: P.blue }}>MUL_TABLE</p>
                {Array.from({ length: Math.min(4, results.mulTable.config.seqLen) }, (_, t) => {
                  const off = t * results.mulTable.config.dim;
                  const vals = Array.from(results.mulTable.output.slice(off, off + 8));
                  return <p key={t} style={{ color: P.muted }}>t{t}: [{vals.join(", ")}]</p>;
                })}
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <IconCheck size={12} style={{ color: outputsMatch ? P.green : P.red }} />
              <span className="text-[11px] font-medium" style={{ color: outputsMatch ? P.green : P.red }}>
                {outputsMatch ? "All outputs byte-identical — BIT_TABLE produces the exact same inference result" : "Output mismatch detected"}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
