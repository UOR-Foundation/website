import { useState, useCallback } from "react";
import Layout from "@/modules/core/components/Layout";
import { runConformanceSuite } from "../conformance";
import type { ConformanceSuiteResult } from "../conformance-types";
import type { ConformanceGroup, ConformanceResult } from "../conformance-types";

const ConformancePage = () => {
  const [result, setResult] = useState<ConformanceSuiteResult | null>(null);
  const [running, setRunning] = useState(false);

  const run = useCallback(async () => {
    setRunning(true);
    try {
      const r = await runConformanceSuite();
      setResult(r);
    } finally {
      setRunning(false);
    }
  }, []);

  return (
    <Layout>
      <section className="py-20 md:py-28">
        <div className="container max-w-4xl mx-auto px-6">
          {/* Header */}
          <div className="mb-12">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Module 9 — SHACL Conformance
            </p>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Conformance Suite
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl">
              Authoritative mathematical checkpoint for the UNS platform.
              7 test groups ({">"}35 assertions) verify full specification compliance
              against the UOR ontology source.
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4 mb-8">
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
                  ? `✓ ALL ${result.total} TESTS PASSED (${result.groups.length} groups)`
                  : `✗ ${result.failed} OF ${result.total} TEST(S) FAILED`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Total: {result.totalDurationMs}ms · {result.timestamp}
              </p>
            </div>
          )}

          {/* Results by group */}
          {result && (
            <div className="space-y-6">
              {result.groups.map((group) => (
                <GroupCard key={group.id} group={group} />
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

function GroupCard({ group }: { group: ConformanceGroup }) {
  const [expanded, setExpanded] = useState(false);
  const allPassed = group.results.every((r) => r.passed);
  const failCount = group.results.filter((r) => !r.passed).length;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
      >
        <span
          className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
            allPassed
              ? "bg-green-500/20 text-green-400 border border-green-500/30"
              : "bg-red-500/20 text-red-400 border border-red-500/30"
          }`}
        >
          {allPassed ? "✓" : "✗"}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{group.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {group.fixtureRef} · {group.results.length} test{group.results.length !== 1 ? "s" : ""}
          </p>
        </div>
        {failCount > 0 && (
          <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">
            {failCount} failed
          </span>
        )}
        <span className="text-xs text-muted-foreground">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="border-t border-border p-4 bg-muted/20 space-y-2">
          {group.results.map((r) => (
            <ResultRow key={r.testId} result={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function ResultRow({ result: r }: { result: ConformanceResult }) {
  return (
    <div className="flex items-start gap-2 text-xs font-mono">
      <span className={r.passed ? "text-green-400" : "text-destructive"}>
        {r.passed ? "✓" : "✗"}
      </span>
      <span className="text-foreground font-semibold w-10 flex-shrink-0">{r.testId}</span>
      <span className="text-muted-foreground flex-1">
        {r.uorClassRef} — expected: {JSON.stringify(r.expected)}, actual: {JSON.stringify(r.actual)}
      </span>
    </div>
  );
}

export default ConformancePage;
