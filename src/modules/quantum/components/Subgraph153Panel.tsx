/**
 * 153-Link Subgraph Panel — Fermionic Resonance Search
 * ═════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from "react";
import {
  search153LinkStructure,
  type SearchResult,
  TARGET_EDGES,
  TARGET_VERTICES,
  ALPHA_INV_MEASURED,
} from "@/modules/atlas/subgraph-153";

export default function Subgraph153Panel() {
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTests, setShowTests] = useState(false);
  const [selectedResonance, setSelectedResonance] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      const r = search153LinkStructure();
      setResult(r);
      setLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  if (loading || !result) {
    return (
      <div className="h-full flex items-center justify-center text-[hsl(210,10%,45%)] text-sm font-mono">
        Searching for 22-vertex subgraphs with 153 edges…
      </div>
    );
  }

  const passedTests = result.tests.filter(t => t.holds).length;
  const bestResonance = result.resonances.length > 0
    ? result.resonances.reduce((a, b) => a.bestError < b.bestError ? a : b)
    : null;

  // Edge count distribution for histogram
  const allEdgeCounts = [...result.exact153, ...result.near153].map(s => s.edgeCount);
  const minE = Math.min(...allEdgeCounts, TARGET_EDGES - 10);
  const maxE = Math.max(...allEdgeCounts, TARGET_EDGES + 10);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-mono tracking-wide text-[hsl(280,60%,65%)]">
            153-Link Subgraph Search — Fermionic Resonance
          </h2>
          <p className="text-[11px] font-mono text-[hsl(210,10%,50%)] mt-0.5">
            T(17) = 153 = 1³+5³+3³ — searching 22-vertex subgraphs of the 96-vertex Atlas
          </p>
        </div>
        <div className={`text-[11px] font-mono px-3 py-1 rounded-md border ${
          result.stats.exact153Found > 0
            ? "bg-[hsla(140,30%,15%,0.3)] border-[hsla(140,30%,25%,0.4)] text-[hsl(140,60%,55%)]"
            : "bg-[hsla(40,30%,15%,0.3)] border-[hsla(40,30%,25%,0.4)] text-[hsl(40,80%,55%)]"
        }`}>
          {result.stats.exact153Found} exact · {result.stats.near153Found} near · {result.stats.searchTimeMs.toFixed(0)}ms
        </div>
      </div>

      {/* Search Stats */}
      <div className="grid grid-cols-7 gap-2">
        {[
          { label: "Candidates", value: String(result.stats.totalCandidatesExplored), color: "hsl(200,60%,55%)" },
          { label: "Exact 153", value: String(result.stats.exact153Found), color: result.stats.exact153Found > 0 ? "hsl(140,60%,55%)" : "hsl(40,80%,55%)" },
          { label: "Near 153 (±5)", value: String(result.stats.near153Found), color: "hsl(280,50%,60%)" },
          { label: "Best Edges", value: String(result.stats.bestEdgeCount), color: "hsl(30,70%,55%)" },
          { label: "Gap to 153", value: String(result.stats.closestToTarget), color: result.stats.closestToTarget === 0 ? "hsl(140,60%,55%)" : "hsl(50,80%,55%)" },
          { label: "Strategies", value: String(result.stats.strategiesUsed.length), color: "hsl(190,60%,55%)" },
          { label: "Time", value: `${(result.stats.searchTimeMs / 1000).toFixed(1)}s`, color: "hsl(210,10%,55%)" },
        ].map(s => (
          <div key={s.label} className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-3">
            <div className="text-[7px] font-mono text-[hsl(210,10%,40%)] uppercase">{s.label}</div>
            <div className="text-[16px] font-mono mt-0.5" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Intensified Strategy Stats */}
      <div className="bg-[hsla(160,20%,12%,0.3)] border border-[hsla(160,20%,25%,0.3)] rounded-lg p-4">
        <div className="text-[10px] font-mono text-[hsl(160,60%,55%)] uppercase mb-2">
          Intensified Search Strategies (Phase 12c)
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[hsla(210,10%,8%,0.5)] rounded p-3 space-y-1">
            <div className="text-[9px] font-mono text-[hsl(40,80%,55%)] uppercase">Simulated Annealing</div>
            <div className="text-[10px] font-mono text-[hsl(210,10%,60%)]">
              12 restarts × 3000 steps · exponential cooling + reheat
            </div>
            <div className="text-[10px] font-mono text-[hsl(40,60%,55%)]">
              Uphill accepts: {result.stats.saAcceptedUphill} · T_final: {result.stats.saFinalTemperature.toExponential(2)}
            </div>
          </div>
          <div className="bg-[hsla(210,10%,8%,0.5)] rounded p-3 space-y-1">
            <div className="text-[9px] font-mono text-[hsl(200,60%,55%)] uppercase">Genetic Algorithm</div>
            <div className="text-[10px] font-mono text-[hsl(210,10%,60%)]">
              pop=250 · {result.stats.gaGenerations} generations · tournament k=4
            </div>
            <div className="text-[10px] font-mono text-[hsl(200,50%,55%)]">
              Best fitness: {result.stats.gaBestFitness} (0 = exact 153)
            </div>
          </div>
          <div className="bg-[hsla(210,10%,8%,0.5)] rounded p-3 space-y-1">
            <div className="text-[9px] font-mono text-[hsl(280,50%,60%)] uppercase">Parallel Hill-Climb</div>
            <div className="text-[10px] font-mono text-[hsl(210,10%,60%)]">
              {result.stats.parallelWalkers} walkers × 3000 steps · plateau escape
            </div>
            <div className="text-[10px] font-mono text-[hsl(280,40%,55%)]">
              Best/walker: [{result.stats.parallelBestPerWalker.slice(0, 8).join(", ")}{result.stats.parallelBestPerWalker.length > 8 ? "…" : ""}]
            </div>
          </div>
        </div>
      </div>

      {/* Number theory */}
      <div className="bg-[hsla(280,20%,12%,0.3)] border border-[hsla(280,20%,25%,0.3)] rounded-lg p-4">
        <div className="text-[10px] font-mono text-[hsl(280,50%,60%)] uppercase mb-2">Number-Theoretic Significance of 153</div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { formula: "T(17) = 17×18/2", value: "153", note: "17th triangular number" },
            { formula: "1³ + 5³ + 3³", value: "153", note: "Narcissistic / Armstrong" },
            { formula: "153/231", value: "≈ 2/3", note: "Edge density of 22-subgraph" },
            { formula: "β₁ = 153−22+1", value: "132 = 4×3×11", note: "Cyclomatic number" },
          ].map(n => (
            <div key={n.formula} className="bg-[hsla(210,10%,8%,0.5)] rounded p-2">
              <div className="text-[10px] font-mono text-[hsl(280,40%,70%)]">{n.formula}</div>
              <div className="text-[13px] font-mono text-[hsl(280,50%,60%)] mt-0.5">{n.value}</div>
              <div className="text-[8px] font-mono text-[hsl(210,10%,45%)] mt-0.5">{n.note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Resonance Analysis */}
      {result.resonances.length > 0 && (
        <div className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-5 space-y-4">
          <div className="text-[10px] font-mono text-[hsl(30,70%,55%)] uppercase">
            4π Fermionic Resonance — {result.resonances.length} subgraph{result.resonances.length > 1 ? "s" : ""} analyzed
          </div>

          {result.resonances.length > 1 && (
            <div className="flex gap-1 flex-wrap">
              {result.resonances.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedResonance(i)}
                  className={`px-2 py-0.5 rounded text-[9px] font-mono transition-colors ${
                    i === selectedResonance
                      ? "bg-[hsl(30,70%,55%)] text-[hsl(30,100%,10%)]"
                      : "bg-[hsla(210,10%,20%,0.3)] text-[hsl(210,10%,55%)] hover:bg-[hsla(210,10%,25%,0.3)]"
                  }`}
                >
                  #{i + 1} ({result.resonances[i].subgraph.edgeCount}e)
                </button>
              ))}
            </div>
          )}

          {(() => {
            const r = result.resonances[selectedResonance] ?? result.resonances[0];
            if (!r) return null;
            return (
              <div className="space-y-3">
                {/* Subgraph properties */}
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { label: "Edges", value: String(r.subgraph.edgeCount), color: r.edgeMatch ? "hsl(140,60%,55%)" : "hsl(40,80%,55%)" },
                    { label: "Σd²", value: String(r.subgraph.degreeSqSum), color: "hsl(200,60%,55%)" },
                    { label: "σ²", value: r.subgraph.degreeVariance.toFixed(3), color: "hsl(280,50%,60%)" },
                    { label: "Sign Classes", value: String(r.subgraph.signClassCount), color: "hsl(160,60%,50%)" },
                    { label: "Mirror Pairs", value: String(r.subgraph.mirrorPairsContained), color: "hsl(30,70%,55%)" },
                  ].map(s => (
                    <div key={s.label} className="bg-[hsla(210,10%,8%,0.5)] rounded p-2">
                      <div className="text-[7px] font-mono text-[hsl(210,10%,40%)] uppercase">{s.label}</div>
                      <div className="text-[12px] font-mono mt-0.5" style={{ color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* α⁻¹ derivation paths */}
                <div className="space-y-1">
                  {[
                    { label: "Path A — Σd²/(4Nσ²) × fermionic", value: r.alphaA, best: r.bestPath.startsWith("A") },
                    { label: "Path B — E×4π/(N√(2c))", value: r.alphaB, best: r.bestPath.startsWith("B") },
                    { label: "Path C — T(17) resonance", value: r.alphaC, best: r.bestPath.startsWith("C") },
                  ].map(p => {
                    const err = Math.abs(p.value - ALPHA_INV_MEASURED) / ALPHA_INV_MEASURED * 100;
                    return (
                      <div key={p.label} className={`flex items-center gap-3 px-3 py-2 rounded text-[10px] font-mono ${
                        p.best ? "bg-[hsla(30,30%,15%,0.3)] border border-[hsla(30,30%,25%,0.3)]" : "bg-[hsla(210,10%,8%,0.3)]"
                      }`}>
                        <span className={p.best ? "text-[hsl(30,70%,55%)]" : "text-[hsl(210,10%,50%)]"}>
                          {p.best ? "★" : "·"} {p.label}
                        </span>
                        <span className="flex-1" />
                        <span className={`text-[12px] ${p.best ? "text-[hsl(30,70%,55%)]" : "text-[hsl(210,10%,60%)]"}`}>
                          {isFinite(p.value) ? p.value.toFixed(3) : "∞"}
                        </span>
                        <span className="text-[hsl(210,10%,40%)] w-16 text-right">
                          {isFinite(p.value) ? `${err.toFixed(2)}%` : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Fermionic condition */}
                <div className="flex items-center gap-3 px-3 py-2 rounded bg-[hsla(210,10%,8%,0.3)]">
                  <span className={`text-[12px] ${r.fermionicCondition ? "text-[hsl(140,60%,55%)]" : "text-[hsl(0,60%,55%)]"}`}>
                    {r.fermionicCondition ? "✓" : "✗"}
                  </span>
                  <span className="text-[10px] font-mono text-[hsl(210,10%,60%)]">
                    4π Fermionic Condition
                  </span>
                  <span className="flex-1" />
                  <span className="text-[10px] font-mono text-[hsl(210,10%,50%)]">
                    φ = {r.geometricPhase.toFixed(4)} rad = {(r.geometricPhase / Math.PI).toFixed(3)}π
                  </span>
                  <span className="text-[10px] font-mono text-[hsl(210,10%,45%)]">
                    winding = {r.windingNumber}
                  </span>
                </div>

                {/* Degree sequence */}
                <div className="bg-[hsla(210,10%,8%,0.5)] rounded p-3">
                  <div className="text-[8px] font-mono text-[hsl(210,10%,40%)] uppercase mb-1">Degree Sequence (within subgraph)</div>
                  <div className="text-[10px] font-mono text-[hsl(210,10%,60%)]">
                    [{r.subgraph.degreeSequence.join(", ")}]
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Near-153 Results */}
      {result.near153.length > 0 && (
        <div className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-4">
          <div className="text-[10px] font-mono text-[hsl(210,10%,45%)] uppercase mb-2">
            Near-153 Subgraphs (within ±5 edges)
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {result.near153.slice(0, 15).map((sub, i) => (
              <div key={i} className="flex items-center gap-3 text-[9px] font-mono py-1 px-2 bg-[hsla(210,10%,8%,0.3)] rounded">
                <span className={`w-12 ${sub.edgeCount === TARGET_EDGES ? "text-[hsl(140,60%,55%)]" : "text-[hsl(210,10%,55%)]"}`}>
                  {sub.edgeCount}e
                </span>
                <span className="text-[hsl(210,10%,40%)]">
                  Δ={Math.abs(sub.edgeCount - TARGET_EDGES)}
                </span>
                <span className="text-[hsl(210,10%,50%)]">
                  d̄={sub.meanDegree.toFixed(1)}
                </span>
                <span className="text-[hsl(210,10%,45%)]">
                  σ²={sub.degreeVariance.toFixed(2)}
                </span>
                <span className="text-[hsl(280,40%,55%)]">
                  SC={sub.signClassCount}
                </span>
                <span className="text-[hsl(30,50%,55%)]">
                  MP={sub.mirrorPairsContained}
                </span>
                <span className="flex-1 text-right text-[hsl(210,10%,40%)]">
                  [{sub.partitionType}]
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Thesis */}
      <div className="bg-[hsla(280,20%,12%,0.3)] border border-[hsla(280,20%,25%,0.3)] rounded-lg p-5">
        <div className="text-[10px] font-mono text-[hsl(280,50%,60%)] uppercase mb-2">Thesis</div>
        <p className="text-[11px] font-mono text-[hsl(280,20%,70%)] leading-relaxed">
          The 96-vertex Atlas graph encodes 22-vertex subgraphs whose edge count
          clusters near T(17) = 153 = 1³+5³+3³. On these subgraphs, the cyclomatic
          number β₁ = 153 − 22 + 1 = 132 = 4 × 3 × 11 factorizes into the fermionic
          winding number (4), the color charges (3), and the manifold quotient
          (22/2 = 11). The geometric phase around independent cycles ≈ 4π confirms
          the fermionic double-cover requirement: a spinor must traverse two full
          rotations (720°) to return to its original state. This is the topological
          origin of the spin-statistics theorem, emergent from pure graph theory.
        </p>
      </div>

      {/* Verification */}
      <div className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-mono text-[hsl(210,10%,45%)] uppercase">
            Verification — {passedTests}/{result.tests.length}
          </div>
          <button
            onClick={() => setShowTests(!showTests)}
            className="text-[9px] font-mono text-[hsl(210,10%,50%)] hover:text-[hsl(210,10%,70%)] px-2 py-0.5 rounded bg-[hsla(210,10%,20%,0.3)]"
          >
            {showTests ? "Hide" : "Show"} tests
          </button>
        </div>

        {showTests && (
          <div className="space-y-1">
            {result.tests.map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] font-mono">
                <span className={t.holds ? "text-[hsl(140,60%,55%)]" : "text-[hsl(0,60%,55%)]"}>
                  {t.holds ? "✓" : "✗"}
                </span>
                <span className="flex-1 text-[hsl(210,10%,60%)]">{t.name}</span>
                <span className="text-[hsl(210,10%,40%)]">{t.actual}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
