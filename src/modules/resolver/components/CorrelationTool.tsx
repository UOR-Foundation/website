import { useState, useCallback } from "react";
import { Q0 } from "@/modules/ring-core/ring";
import { correlate } from "@/modules/resolver/correlation";
import type { CorrelationResult } from "@/modules/resolver/correlation";

export function CorrelationTool() {
  const [valA, setValA] = useState("85");
  const [valB, setValB] = useState("170");
  const [result, setResult] = useState<CorrelationResult | null>(null);

  const ring = Q0();

  const run = useCallback(() => {
    const a = Math.max(0, Math.min(255, parseInt(valA) || 0));
    const b = Math.max(0, Math.min(255, parseInt(valB) || 0));
    setResult(correlate(ring, a, b));
  }, [valA, valB]);

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="text-sm font-semibold mb-3">Algebraic Correlation (Q0)</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Algebraic similarity via XOR-stratum Hamming distance — no embedding models needed.
      </p>

      <div className="flex gap-2 mb-4">
        <input
          type="number"
          min={0}
          max={255}
          value={valA}
          onChange={(e) => setValA(e.target.value)}
          className="w-24 px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="A"
        />
        <input
          type="number"
          min={0}
          max={255}
          value={valB}
          onChange={(e) => setValB(e.target.value)}
          className="w-24 px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="B"
        />
        <button onClick={run} className="btn-primary text-sm">
          Correlate
        </button>
      </div>

      {result && (
        <div>
          {/* Fidelity bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Fidelity</span>
              <span className="text-sm font-mono font-bold text-foreground">
                {(result.fidelity * 100).toFixed(1)}%
              </span>
            </div>
            <div className="h-4 bg-muted rounded-sm overflow-hidden">
              <div
                className="h-full bg-primary/70 rounded-sm transition-all duration-300"
                style={{ width: `${result.fidelity * 100}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="rounded bg-muted p-2">
              <p className="text-muted-foreground">Hamming dist</p>
              <p className="font-mono font-medium text-foreground">
                {result.totalDifference}/{result.maxBits} bits
              </p>
            </div>
            <div className="rounded bg-muted p-2">
              <p className="text-muted-foreground">Per-byte Δ</p>
              <p className="font-mono font-medium text-foreground">
                [{result.differenceStratum.join(", ")}]
              </p>
            </div>
            <div className="rounded bg-muted p-2">
              <p className="text-muted-foreground">Interpretation</p>
              <p className="font-medium text-foreground">
                {result.fidelity >= 0.9 ? "Near-identical" :
                 result.fidelity >= 0.6 ? "Similar" :
                 result.fidelity >= 0.3 ? "Divergent" : "Opposite"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
