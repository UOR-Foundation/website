import { useState, useCallback, useEffect } from "react";
import Layout from "@/modules/core/components/Layout";
import { UORRing, Q0, Q1, Q2, fromBytes } from "../ring";
import { verifyQ0Exhaustive } from "../coherence";
import type { CoherenceResult } from "../coherence";
import { bytePopcount, byteBasis } from "@/lib/uor-ring";

const QUANTUM_OPTIONS = [
  { label: "Q0 (8-bit)", quantum: 0, max: 255 },
  { label: "Q1 (16-bit)", quantum: 1, max: 65535 },
  { label: "Q2 (24-bit)", quantum: 2, max: 16777215 },
] as const;

interface ApiResult {
  loading: boolean;
  error: string | null;
  data: Record<string, unknown> | null;
  matches: boolean | null;
}

const RingExplorerPage = () => {
  const [quantumIdx, setQuantumIdx] = useState(0);
  const [inputValue, setInputValue] = useState("42");
  const [coherenceResult, setCoherenceResult] = useState<CoherenceResult | null>(null);
  const [coherenceRunning, setCoherenceRunning] = useState(false);
  const [apiResult, setApiResult] = useState<ApiResult>({
    loading: false, error: null, data: null, matches: null,
  });

  const qOpt = QUANTUM_OPTIONS[quantumIdx];
  const ring = quantumIdx === 0 ? Q0() : quantumIdx === 1 ? Q1() : Q2();
  const value = Math.max(0, Math.min(qOpt.max, parseInt(inputValue) || 0));
  const bytes = ring.toBytes(value);

  // Computed operations
  const negResult = ring.neg(bytes);
  const bnotResult = ring.bnot(bytes);
  const succResult = ring.succ(bytes);
  const predResult = ring.pred(bytes);
  const stratum = bytes.reduce((s, b) => s + bytePopcount(b), 0);
  const spectrum = bytes.map(byteBasis);

  // Verify coherence
  const runCoherence = useCallback(() => {
    setCoherenceRunning(true);
    // Run in a timeout to let UI update
    setTimeout(() => {
      try {
        const result = verifyQ0Exhaustive();
        setCoherenceResult(result);
      } catch (e) {
        setCoherenceResult({
          verified: false,
          lawsChecked: 8,
          totalChecks: 0,
          failures: [String(e)],
          fullCycleVerified: false,
          timestamp: new Date().toISOString(),
        });
      }
      setCoherenceRunning(false);
    }, 50);
  }, []);

  // Call live API for comparison (Q0 only, max 255)
  useEffect(() => {
    if (qOpt.quantum !== 0 || value > 255) {
      setApiResult({ loading: false, error: null, data: null, matches: null });
      return;
    }

    setApiResult({ loading: true, error: null, data: null, matches: null });

    const controller = new AbortController();
    fetch(
      `https://api.uor.foundation/v1/kernel/op/verify?x=${value}`,
      { signal: controller.signal }
    )
      .then((r) => r.json())
      .then((data) => {
        const apiSucc = data?.proof?.witness?.["proof:succ_x"] ?? data?.["proof:witness"]?.["proof:succ_x"];
        const localSucc = fromBytes(succResult);
        const matches = apiSucc !== undefined ? apiSucc === localSucc : null;
        setApiResult({ loading: false, error: null, data, matches });
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setApiResult({ loading: false, error: String(e), data: null, matches: null });
        }
      });

    return () => controller.abort();
  }, [value, qOpt.quantum]);

  const formatHex = (b: number[]) => b.map((v) => v.toString(16).padStart(2, "0")).join(" ");
  const formatBin = (b: number[]) => b.map((v) => v.toString(2).padStart(8, "0")).join(" ");

  return (
    <Layout>
      <section className="py-20 md:py-28">
        <div className="container max-w-4xl mx-auto px-6">
          {/* Header */}
          <div className="mb-12">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Module 1 — Ring Arithmetic Core
            </p>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Ring Explorer</h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl">
              Explore the algebraic foundation of the UOR Framework — Z/(2<sup>n</sup>)Z ring
              operations with live coherence verification and API cross-validation.
            </p>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* Quantum selector */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Quantum Level
              </label>
              <div className="flex gap-2">
                {QUANTUM_OPTIONS.map((opt, i) => (
                  <button
                    key={opt.quantum}
                    onClick={() => {
                      setQuantumIdx(i);
                      setInputValue("42");
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      quantumIdx === i
                        ? "bg-foreground text-background"
                        : "border border-border text-muted-foreground hover:text-foreground hover:border-foreground/25"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Value input */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Value (0–{qOpt.max.toLocaleString()})
              </label>
              <input
                type="number"
                min={0}
                max={qOpt.max}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Results grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <ResultCard label="Value" value={String(value)} />
            <ResultCard label="Hex" value={formatHex(bytes)} mono />
            <ResultCard label="Binary" value={formatBin(bytes)} mono />
            <ResultCard label="neg(x)" value={`${fromBytes(negResult)} [${formatHex(negResult.slice())}]`} mono />
            <ResultCard label="bnot(x)" value={`${fromBytes(bnotResult)} [${formatHex(bnotResult.slice())}]`} mono />
            <ResultCard label="succ(x) = neg(bnot(x))" value={`${fromBytes(succResult)}`} mono highlight />
            <ResultCard label="pred(x) = bnot(neg(x))" value={`${fromBytes(predResult)}`} mono />
            <ResultCard label="Stratum (popcount)" value={String(stratum)} />
            <ResultCard
              label="Spectrum (active bits)"
              value={spectrum.map((s) => `[${s.join(",")}]`).join(" ")}
              mono
            />
            {/* Critical identity check */}
            <div className="md:col-span-2 rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Critical Identity: neg(bnot({value})) = succ({value})
              </p>
              <p className="font-mono text-sm">
                neg(bnot({value})) = {fromBytes(negResult.length ? ring.neg(ring.bnot(bytes)) : [0])}
                {" = "}succ({value}) = {fromBytes(succResult)}
                {" → "}
                <span className={fromBytes(ring.neg(ring.bnot(bytes))) === fromBytes(succResult) ? "text-green-600 font-bold" : "text-destructive font-bold"}>
                  {fromBytes(ring.neg(ring.bnot(bytes))) === fromBytes(succResult) ? "✓ HOLDS" : "✗ FAILED"}
                </span>
              </p>
            </div>
          </div>

          {/* API Cross-Validation */}
          {qOpt.quantum === 0 && (
            <div className="rounded-lg border border-border bg-card p-5 mb-8">
              <h3 className="text-sm font-semibold mb-3">Live API Cross-Validation</h3>
              <p className="text-xs text-muted-foreground mb-2 font-mono">
                GET https://api.uor.foundation/v1/kernel/op/verify?x={value}
              </p>
              {apiResult.loading && (
                <p className="text-sm text-muted-foreground">Querying live API…</p>
              )}
              {apiResult.error && (
                <p className="text-sm text-destructive">{apiResult.error}</p>
              )}
              {apiResult.data && (
                <div>
                  {apiResult.matches === true && (
                    <p className="text-sm font-bold text-green-600 mb-2">
                      ✓ Local computation matches live API
                    </p>
                  )}
                  {apiResult.matches === false && (
                    <p className="text-sm font-bold text-destructive mb-2">
                      ✗ Mismatch between local and API result
                    </p>
                  )}
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      View raw API response
                    </summary>
                    <pre className="mt-2 p-3 rounded bg-muted text-muted-foreground overflow-auto max-h-48 text-[10px] leading-tight">
                      {JSON.stringify(apiResult.data, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          )}

          {/* Coherence verification */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-semibold mb-3">Coherence Verification (Q0 Exhaustive)</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Verifies 8 algebraic laws across all 256 elements + full cycle check.
            </p>
            <button
              onClick={runCoherence}
              disabled={coherenceRunning}
              className="btn-primary text-sm mb-4"
            >
              {coherenceRunning ? "Verifying…" : "Verify Coherence"}
            </button>

            {coherenceResult && (
              <div>
                <p className={`text-sm font-bold mb-2 ${coherenceResult.verified ? "text-green-600" : "text-destructive"}`}>
                  {coherenceResult.verified
                    ? "✓ ALL COHERENCE CHECKS PASSED"
                    : `✗ ${coherenceResult.failures.length} FAILURE(S)`}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <Stat label="Laws checked" value={String(coherenceResult.lawsChecked)} />
                  <Stat label="Total checks" value={coherenceResult.totalChecks.toLocaleString()} />
                  <Stat label="Full cycle" value={coherenceResult.fullCycleVerified ? "✓" : "✗"} />
                  <Stat label="Timestamp" value={coherenceResult.timestamp.split("T")[1]?.slice(0, 8) ?? ""} />
                </div>
                {coherenceResult.failures.length > 0 && (
                  <div className="mt-3 p-3 rounded bg-destructive/10 text-destructive text-xs font-mono">
                    {coherenceResult.failures.map((f, i) => (
                      <p key={i}>{f}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
};

// ── Subcomponents ───────────────────────────────────────────────────────────

function ResultCard({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        highlight ? "border-primary/30 bg-primary/5" : "border-border bg-card"
      }`}
    >
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <p className={`text-sm ${mono ? "font-mono" : ""} text-foreground break-all`}>
        {value}
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-muted p-2">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  );
}

export default RingExplorerPage;
