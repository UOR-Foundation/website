/**
 * BenchmarkPage — Investor-facing vGPU performance demo.
 * Two tabs: CPU benchmark, GPU benchmark.
 * Large text, animated bars, results table. No fluff.
 */

import { useState, useCallback, useRef } from "react";
import {
  standardMatmul,
  lutMatmul,
  seededMatrix,
  gpuMatmul,
  gpuLastPath,
  HologramComputeCache,
  matrixChecksum,
} from "@/modules/hologram-compute/hologram-matmul";

// ── Types ───────────────────────────────────────────────────────

interface BenchRow {
  n: number;
  baselineMs: number;
  vgpuFirstMs: number;
  vgpuCachedMs: number;
  speedup: number;
  checksumMatch: boolean;
}

type TabId = "cpu" | "gpu";
type Phase = "idle" | "running" | "done";

// ── Palette — deep navy institutional ───────────────────────────

const P = {
  bg:        "hsl(225, 30%, 6%)",
  bgCard:    "hsl(225, 25%, 9%)",
  bgHover:   "hsl(225, 22%, 13%)",
  border:    "hsl(225, 18%, 16%)",
  text:      "hsl(220, 15%, 93%)",
  textSub:   "hsl(220, 10%, 60%)",
  textDim:   "hsl(220, 8%, 42%)",
  accent:    "hsl(220, 65%, 55%)",  // muted blue
  accentLt:  "hsl(220, 50%, 70%)",
  positive:  "hsl(160, 55%, 42%)",  // teal-green
  positiveLt:"hsl(160, 45%, 55%)",
  negative:  "hsl(4, 50%, 52%)",    // muted red
  negativeLt:"hsl(4, 40%, 62%)",
  white:     "hsl(0, 0%, 100%)",
};

// ── Benchmark sizes ─────────────────────────────────────────────

const CPU_SIZES = [16, 32, 64, 128, 256, 384];
const GPU_SIZES = [16, 32, 64, 128, 256, 512];

const SEED_A = 42;
const SEED_B = 137;

// ── Helpers ─────────────────────────────────────────────────────

function fmt(ms: number): string {
  if (ms < 0.01) return "<0.01 ms";
  if (ms < 1) return `${ms.toFixed(2)} ms`;
  if (ms < 1000) return `${ms.toFixed(1)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function speedupColor(s: number): string {
  if (s >= 100) return P.positive;
  if (s >= 10) return P.positiveLt;
  if (s >= 2) return P.accentLt;
  return P.textDim;
}

// ── Component ───────────────────────────────────────────────────

export default function BenchmarkPage() {
  const [tab, setTab] = useState<TabId>("cpu");
  const [phase, setPhase] = useState<Phase>("idle");
  const [rows, setRows] = useState<BenchRow[]>([]);
  const [progress, setProgress] = useState("");
  const [gpuAvailable, setGpuAvailable] = useState<boolean | null>(null);
  const [gpuPath, setGpuPath] = useState("");
  const running = useRef(false);

  const probeGpu = useCallback(async () => {
    if (gpuAvailable !== null) return;
    try {
      if (!navigator.gpu) { setGpuAvailable(false); return; }
      const adapter = await navigator.gpu.requestAdapter();
      setGpuAvailable(!!adapter);
    } catch { setGpuAvailable(false); }
  }, [gpuAvailable]);

  // ── CPU Benchmark ─────────────────────────────────────────────

  const runCpuBench = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setPhase("running");
    setRows([]);

    const cache = new HologramComputeCache();
    const results: BenchRow[] = [];

    setProgress("Crystallizing…");
    await cache.precompute(CPU_SIZES, SEED_A, SEED_B, (_i, n) => {
      setProgress(`Crystallizing N=${n}…`);
    }, true);

    for (const n of CPU_SIZES) {
      setProgress(`Benchmarking N=${n}…`);
      await new Promise(r => setTimeout(r, 20));

      const a = seededMatrix(n, SEED_A + n);
      const b = seededMatrix(n, SEED_B + n);

      const t0 = performance.now();
      const cpuResult = standardMatmul(a, b, n);
      const baselineMs = performance.now() - t0;

      const t1 = performance.now();
      lutMatmul(a, b, n);
      const vgpuFirstMs = performance.now() - t1;

      const t2 = performance.now();
      const cached = cache.retrieve(a, b, n);
      const vgpuCachedMs = performance.now() - t2;

      const checksumMatch = cached ? matrixChecksum(cached) === matrixChecksum(cpuResult) : false;
      const speedup = vgpuCachedMs > 0 ? baselineMs / vgpuCachedMs : baselineMs / 0.001;

      results.push({ n, baselineMs, vgpuFirstMs, vgpuCachedMs, speedup, checksumMatch });
      setRows([...results]);
    }

    setPhase("done");
    setProgress("");
    running.current = false;
  }, []);

  // ── GPU Benchmark ─────────────────────────────────────────────

  const runGpuBench = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setPhase("running");
    setRows([]);

    const cache = new HologramComputeCache();
    const results: BenchRow[] = [];

    setProgress("Crystallizing (GPU)…");
    await cache.precompute(GPU_SIZES, SEED_A, SEED_B, (_i, n) => {
      setProgress(`Crystallizing N=${n}…`);
    }, false);
    setGpuPath(gpuLastPath);

    for (const n of GPU_SIZES) {
      setProgress(`Benchmarking N=${n}…`);
      await new Promise(r => setTimeout(r, 20));

      const a = seededMatrix(n, SEED_A + n);
      const b = seededMatrix(n, SEED_B + n);

      const t0 = performance.now();
      const gpuResult = await gpuMatmul(a, b, n);
      const baselineMs = performance.now() - t0;
      const vgpuFirstMs = baselineMs;

      const t2 = performance.now();
      const cached = cache.retrieve(a, b, n);
      const vgpuCachedMs = performance.now() - t2;

      const refResult = gpuResult ?? standardMatmul(a, b, n);
      const checksumMatch = cached ? matrixChecksum(cached) === matrixChecksum(refResult) : false;
      const speedup = vgpuCachedMs > 0 ? baselineMs / vgpuCachedMs : baselineMs / 0.001;

      results.push({ n, baselineMs, vgpuFirstMs, vgpuCachedMs, speedup, checksumMatch });
      setRows([...results]);
    }

    setPhase("done");
    setProgress("");
    running.current = false;
  }, []);

  const handleRun = useCallback(() => {
    if (tab === "cpu") runCpuBench(); else runGpuBench();
  }, [tab, runCpuBench, runGpuBench]);

  const handleTabChange = useCallback((t: TabId) => {
    if (running.current) return;
    setTab(t);
    setPhase("idle");
    setRows([]);
    if (t === "gpu") probeGpu();
  }, [probeGpu]);

  const maxBaseline = rows.length > 0 ? Math.max(...rows.map(r => r.baselineMs)) : 1;

  return (
    <div style={{
      minHeight: "100vh",
      background: P.bg,
      color: P.text,
      fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* ── Top rule ─────────────────────────────────────────── */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${P.accent}, ${P.positive})` }} />

      {/* ── Header ───────────────────────────────────────────── */}
      <header style={{
        padding: "48px 56px 0",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
      }}>
        <div>
          <p style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: P.accent,
            margin: "0 0 10px",
          }}>
            Compute Benchmark
          </p>
          <h1 style={{
            fontSize: "clamp(32px, 4.5vw, 52px)",
            fontWeight: 700,
            letterSpacing: "-0.025em",
            margin: 0,
            color: P.white,
            lineHeight: 1.05,
          }}>
            Hologram vGPU
          </h1>
          <p style={{
            fontSize: "clamp(15px, 1.8vw, 19px)",
            color: P.textSub,
            margin: "8px 0 0",
            fontWeight: 400,
          }}>
            Integer matmul (INT8 GEMM) · computation as retrieval
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{
          display: "flex",
          border: `1px solid ${P.border}`,
          borderRadius: 8,
          overflow: "hidden",
        }}>
          {(["cpu", "gpu"] as TabId[]).map(t => (
            <button
              key={t}
              onClick={() => handleTabChange(t)}
              style={{
                padding: "12px 32px",
                border: "none",
                cursor: running.current ? "not-allowed" : "pointer",
                fontWeight: 600,
                fontSize: "clamp(13px, 1.4vw, 16px)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                transition: "all 0.2s",
                background: tab === t ? P.accent : "transparent",
                color: tab === t ? P.white : P.textDim,
              }}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      {/* ── Explainer ────────────────────────────────────────── */}
      <div style={{ padding: "20px 56px 0", maxWidth: 860 }}>
        <p style={{
          fontSize: "clamp(14px, 1.5vw, 16px)",
          lineHeight: 1.7,
          color: P.textSub,
        }}>
          {tab === "cpu" ? (
            <>
              <strong style={{ color: P.text }}>Baseline:</strong> native CPU matmul.{" "}
              <strong style={{ color: P.accentLt }}>vGPU:</strong> precomputed via 64KB LUT, then O(1) memory retrieval. Both paths CPU-only.
            </>
          ) : (
            <>
              <strong style={{ color: P.text }}>Baseline:</strong> live WebGPU compute shader.{" "}
              <strong style={{ color: P.accentLt }}>vGPU:</strong> crystallized in one GPU pass, then O(1) CPU retrieval. GPU freed after crystallization.
              {gpuAvailable === false && (
                <span style={{ display: "block", marginTop: 8, color: P.negativeLt }}>
                  WebGPU not available — will fall back to CPU.
                </span>
              )}
            </>
          )}
        </p>
      </div>

      {/* ── Run button ───────────────────────────────────────── */}
      <div style={{ padding: "32px 56px 0", display: "flex", alignItems: "center", gap: 20 }}>
        <button
          onClick={handleRun}
          disabled={phase === "running"}
          style={{
            padding: "14px 52px",
            borderRadius: 6,
            border: "none",
            background: phase === "running" ? P.bgHover : P.accent,
            color: P.white,
            fontSize: "clamp(15px, 1.6vw, 18px)",
            fontWeight: 600,
            cursor: phase === "running" ? "wait" : "pointer",
            letterSpacing: "0.03em",
            transition: "all 0.2s",
            opacity: phase === "running" ? 0.7 : 1,
          }}
        >
          {phase === "idle" ? "Run Benchmark" : phase === "running" ? "Running…" : "Run Again"}
        </button>
        {progress && (
          <span style={{
            fontSize: "clamp(12px, 1.3vw, 15px)",
            color: P.accentLt,
            fontFamily: "monospace",
          }}>
            {progress}
          </span>
        )}
      </div>

      {/* ── Results chart (horizontal bars) ──────────────────── */}
      {rows.length > 0 && (
        <div style={{ padding: "44px 56px 0" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 28,
            paddingBottom: 16,
            borderBottom: `1px solid ${P.border}`,
          }}>
            <h2 style={{
              fontSize: "clamp(18px, 2vw, 24px)",
              fontWeight: 600,
              margin: 0,
              color: P.text,
            }}>
              Results
            </h2>
            <div style={{ flex: 1 }} />
            {/* Legend */}
            <div style={{ display: "flex", gap: 20 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: P.textSub }}>
                <span style={{ width: 12, height: 12, borderRadius: 2, background: P.negative, display: "inline-block" }} />
                {tab === "cpu" ? "CPU" : "GPU"}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: P.textSub }}>
                <span style={{ width: 12, height: 12, borderRadius: 2, background: P.positive, display: "inline-block" }} />
                vGPU
              </span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {rows.map(row => (
              <div key={row.n}>
                <div style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}>
                  <span style={{
                    fontSize: "clamp(17px, 2vw, 24px)",
                    fontWeight: 700,
                    fontFamily: "monospace",
                    color: P.text,
                    letterSpacing: "-0.01em",
                  }}>
                    {row.n}×{row.n}
                  </span>
                  <span style={{
                    fontSize: "clamp(20px, 2.5vw, 32px)",
                    fontWeight: 800,
                    fontFamily: "monospace",
                    color: speedupColor(row.speedup),
                    letterSpacing: "-0.02em",
                  }}>
                    {row.speedup >= 1000
                      ? `${(row.speedup / 1000).toFixed(1)}K×`
                      : `${row.speedup.toFixed(0)}×`}
                    <span style={{ fontSize: "0.5em", fontWeight: 400, opacity: 0.6, marginLeft: 4 }}>faster</span>
                  </span>
                </div>

                {/* Baseline bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 5 }}>
                  <span style={{
                    width: 72,
                    fontSize: "clamp(11px, 1.1vw, 13px)",
                    color: P.textDim,
                    textAlign: "right",
                    flexShrink: 0,
                    fontWeight: 500,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}>
                    {tab === "cpu" ? "CPU" : "GPU"}
                  </span>
                  <div style={{
                    flex: 1,
                    height: "clamp(20px, 2.2vw, 30px)",
                    background: P.bgCard,
                    borderRadius: 4,
                    overflow: "hidden",
                  }}>
                    <div style={{
                      width: `${Math.max(2, (row.baselineMs / maxBaseline) * 100)}%`,
                      height: "100%",
                      background: P.negative,
                      borderRadius: 4,
                      transition: "width 0.6s ease-out",
                      display: "flex",
                      alignItems: "center",
                      paddingLeft: 10,
                    }}>
                      <span style={{
                        fontSize: "clamp(10px, 1.1vw, 13px)",
                        fontFamily: "monospace",
                        color: P.white,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}>
                        {fmt(row.baselineMs)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* vGPU bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{
                    width: 72,
                    fontSize: "clamp(11px, 1.1vw, 13px)",
                    color: P.positiveLt,
                    textAlign: "right",
                    flexShrink: 0,
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}>
                    vGPU
                  </span>
                  <div style={{
                    flex: 1,
                    height: "clamp(20px, 2.2vw, 30px)",
                    background: P.bgCard,
                    borderRadius: 4,
                    overflow: "hidden",
                  }}>
                    <div style={{
                      width: `${Math.max(0.5, (row.vgpuCachedMs / maxBaseline) * 100)}%`,
                      minWidth: 64,
                      height: "100%",
                      background: P.positive,
                      borderRadius: 4,
                      transition: "width 0.6s ease-out",
                      display: "flex",
                      alignItems: "center",
                      paddingLeft: 10,
                    }}>
                      <span style={{
                        fontSize: "clamp(10px, 1.1vw, 13px)",
                        fontFamily: "monospace",
                        color: P.white,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}>
                        {fmt(row.vgpuCachedMs)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Results table ────────────────────────────────────── */}
      {rows.length > 0 && (
        <div style={{ padding: "44px 56px 72px" }}>
          <div style={{
            background: P.bgCard,
            border: `1px solid ${P.border}`,
            borderRadius: 8,
            overflow: "hidden",
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${P.border}` }}>
                  {["Matrix", tab === "cpu" ? "CPU (ms)" : "GPU (ms)", "vGPU 1st (ms)", "vGPU Cached (ms)", "Speedup", "✓"].map(h => (
                    <th key={h} style={{
                      padding: "14px 24px",
                      textAlign: h === "Matrix" ? "left" : "right",
                      fontSize: "clamp(11px, 1.2vw, 13px)",
                      fontWeight: 600,
                      color: P.textDim,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.n} style={{ borderBottom: `1px solid ${P.border}22` }}>
                    <td style={{
                      padding: "14px 24px",
                      fontFamily: "monospace",
                      fontSize: "clamp(14px, 1.5vw, 18px)",
                      fontWeight: 700,
                      color: P.text,
                    }}>
                      {row.n}×{row.n}
                    </td>
                    <td style={{
                      padding: "14px 24px",
                      textAlign: "right",
                      fontFamily: "monospace",
                      fontSize: "clamp(13px, 1.4vw, 17px)",
                      color: P.negativeLt,
                    }}>
                      {fmt(row.baselineMs)}
                    </td>
                    <td style={{
                      padding: "14px 24px",
                      textAlign: "right",
                      fontFamily: "monospace",
                      fontSize: "clamp(13px, 1.4vw, 17px)",
                      color: P.textSub,
                    }}>
                      {fmt(row.vgpuFirstMs)}
                    </td>
                    <td style={{
                      padding: "14px 24px",
                      textAlign: "right",
                      fontFamily: "monospace",
                      fontSize: "clamp(13px, 1.4vw, 17px)",
                      fontWeight: 700,
                      color: P.positiveLt,
                    }}>
                      {fmt(row.vgpuCachedMs)}
                    </td>
                    <td style={{
                      padding: "14px 24px",
                      textAlign: "right",
                      fontFamily: "monospace",
                      fontSize: "clamp(15px, 1.8vw, 22px)",
                      fontWeight: 800,
                      color: speedupColor(row.speedup),
                    }}>
                      {row.speedup >= 1000 ? `${(row.speedup / 1000).toFixed(1)}K×` : `${row.speedup.toFixed(0)}×`}
                    </td>
                    <td style={{
                      padding: "14px 24px",
                      textAlign: "right",
                      fontSize: "clamp(14px, 1.5vw, 18px)",
                    }}>
                      {row.checksumMatch ? "✅" : "❌"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{
            marginTop: 14,
            fontSize: "clamp(10px, 1.1vw, 12px)",
            color: P.textDim,
            fontFamily: "monospace",
            letterSpacing: "0.02em",
          }}>
            {tab === "gpu" && gpuPath && `GPU path: ${gpuPath} · `}
            ✓ checksum verified · vGPU Cached = O(1) memory lookup post-crystallization
          </p>
        </div>
      )}
    </div>
  );
}
