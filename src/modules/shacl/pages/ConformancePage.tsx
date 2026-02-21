import { useState, useCallback } from "react";
import Layout from "@/modules/core/components/Layout";
import { runConformanceSuite } from "../conformance";
import type { ConformanceSuiteResult, ConformanceTest } from "../conformance";
import { Q0, Q1 } from "@/modules/ring-core/ring";

const QUANTUM_OPTIONS = [
  { label: "Q0 (8-bit)", quantum: 0 },
  { label: "Q1 (16-bit)", quantum: 1 },
] as const;

const ConformancePage = () => {
  const [quantumIdx, setQuantumIdx] = useState(0);
  const [result, setResult] = useState<ConformanceSuiteResult | null>(null);
  const [running, setRunning] = useState(false);

  const run = useCallback(() => {
    setRunning(true);
    // Use requestAnimationFrame to allow UI to update
    requestAnimationFrame(() => {
      const ring = quantumIdx === 0 ? Q0() : Q1();
      const r = runConformanceSuite(ring);
      setResult(r);
      setRunning(false);
    });
  }, [quantumIdx]);

  return (
    <Layout>
      <section className="py-20 md:py-28">
        <div className="container max-w-4xl mx-auto px-6">
          {/* Header */}
          <div className="mb-12">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Module 9 — SHACL Validation
            </p>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Conformance Suite
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl">
              Runtime validation of all data against UOR shape constraints.
              7 conformance tests verify full specification compliance.
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4 mb-8">
            <div className="flex gap-1.5">
              {QUANTUM_OPTIONS.map((opt, i) => (
                <button
                  key={opt.quantum}
                  onClick={() => { setQuantumIdx(i); setResult(null); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    quantumIdx === i
                      ? "bg-foreground text-background"
                      : "border border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              onClick={run}
              disabled={running}
              className="btn-primary text-sm"
            >
              {running ? "Running…" : "Run Full Conformance Suite"}
            </button>
          </div>

          {/* Overall status */}
          {result && (
            <div
              className={`rounded-lg border p-5 mb-8 ${
                result.allPassed
                  ? "border-green-500/30 bg-green-500/10"
                  : "border-destructive/30 bg-destructive/10"
              }`}
            >
              <p className={`text-sm font-bold ${result.allPassed ? "text-green-400" : "text-destructive"}`}>
                {result.allPassed
                  ? "✓ ALL 7 CONFORMANCE TESTS PASSED"
                  : `✗ ${result.tests.filter((t) => !t.passed).length} TEST(S) FAILED`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Total: {result.totalDurationMs}ms · {result.timestamp}
              </p>
            </div>
          )}

          {/* Results grid */}
          {result && (
            <div className="space-y-3">
              {result.tests.map((test) => (
                <TestCard key={test.id} test={test} />
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

function TestCard({ test }: { test: ConformanceTest }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
      >
        <span
          className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
            test.passed
              ? "bg-green-500/20 text-green-400 border border-green-500/30"
              : "bg-red-500/20 text-red-400 border border-red-500/30"
          }`}
        >
          {test.passed ? "✓" : "✗"}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{test.name}</p>
          <p className="text-xs text-muted-foreground truncate">{test.description}</p>
        </div>
        <span className="text-xs font-mono text-muted-foreground flex-shrink-0">
          {test.durationMs.toFixed(1)}ms
        </span>
        {test.violations.length > 0 && (
          <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">
            {test.violations.length}
          </span>
        )}
      </button>

      {expanded && test.violations.length > 0 && (
        <div className="border-t border-border p-4 bg-muted/20">
          <div className="space-y-1.5">
            {test.violations.slice(0, 20).map((v, i) => (
              <p key={i} className="text-xs font-mono text-muted-foreground">
                <span className={v.severity === "error" ? "text-destructive" : "text-yellow-400"}>
                  [{v.severity}]
                </span>{" "}
                {v.property}: {v.message}
              </p>
            ))}
            {test.violations.length > 20 && (
              <p className="text-xs text-muted-foreground">
                …and {test.violations.length - 20} more
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ConformancePage;
