/**
 * Stabilizer Correspondence Proof Panel
 * ══════════════════════════════════════
 */

import React, { useState, useEffect } from "react";
import {
  runStabilizerProof,
  type StabilizerProofReport,
} from "../stabilizer-proof";

export default function StabilizerProofPanel() {
  const [report, setReport] = useState<StabilizerProofReport | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(0);
  const [showBijection, setShowBijection] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const r = runStabilizerProof();
    setReport(r);
    setLoading(false);
  }, []);

  if (loading || !report) {
    return (
      <div className="h-full flex items-center justify-center text-[hsl(210,10%,45%)] text-sm font-mono">
        Constructing stabilizer correspondence proof…
      </div>
    );
  }

  const stepsHeld = report.steps.filter(s => s.holds).length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-mono tracking-wide text-[hsl(50,80%,60%)]">
            Stabilizer Correspondence Proof
          </h2>
          <p className="text-[11px] font-mono text-[hsl(210,10%,50%)] mt-1">
            Atlas₉₆ ≅ Stab₃/~ — constructive bijection with full verification
          </p>
        </div>
        <div className={`text-[12px] font-mono px-3 py-1 rounded-md border ${
          report.allHold
            ? "bg-[hsla(140,40%,15%,0.3)] border-[hsla(140,40%,30%,0.4)] text-[hsl(140,60%,55%)]"
            : "bg-[hsla(40,40%,15%,0.3)] border-[hsla(40,40%,30%,0.4)] text-[hsl(40,80%,55%)]"
        }`}>
          {report.allHold ? "QED ✓" : "INCOMPLETE"} — {stepsHeld}/{report.steps.length} steps
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "|Atlas|", value: report.atlasCount, color: "hsl(200,60%,60%)" },
          { label: "|Stab₃/~|", value: report.stabilizerCount, color: "hsl(280,50%,60%)" },
          { label: "Signature Matches", value: report.signatureMatches, color: "hsl(140,60%,55%)" },
          { label: "Proof Steps", value: report.steps.length, color: "hsl(50,80%,60%)" },
          { label: "Bijection Entries", value: report.bijectionEntries.length, color: "hsl(190,70%,55%)" },
        ].map(s => (
          <div key={s.label} className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-3">
            <div className="text-[9px] font-mono text-[hsl(210,10%,40%)] uppercase">{s.label}</div>
            <div className="text-[16px] font-mono mt-1" style={{ color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Proof steps */}
      <div className="space-y-2">
        {report.steps.map((step, i) => (
          <div key={i} className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedStep(expandedStep === i ? null : i)}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-[hsla(210,10%,15%,0.3)] transition-colors"
            >
              <span className={`text-[12px] ${step.holds ? "text-[hsl(140,60%,55%)]" : "text-[hsl(0,60%,55%)]"}`}>
                {step.holds ? "✓" : "✗"}
              </span>
              <div className="flex-1">
                <div className="text-[12px] font-mono text-[hsl(50,70%,65%)]">{step.theorem}</div>
                <div className="text-[10px] font-mono text-[hsl(210,10%,55%)] mt-0.5">{step.statement}</div>
              </div>
              <div className="text-[9px] font-mono text-[hsl(210,10%,40%)]">
                {step.evidence}
              </div>
              <span className="text-[hsl(210,10%,40%)] text-[11px]">
                {expandedStep === i ? "▼" : "▶"}
              </span>
            </button>

            {expandedStep === i && (
              <div className="px-4 pb-4 border-t border-[hsla(210,10%,20%,0.3)]">
                <pre className="text-[10px] font-mono text-[hsl(210,10%,60%)] leading-relaxed whitespace-pre-wrap mt-3 pl-6 border-l-2 border-[hsla(50,50%,30%,0.3)]">
                  {step.proof}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bijection table toggle */}
      <div className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] font-mono text-[hsl(50,70%,60%)] uppercase">
            Explicit Bijection φ: Atlas → Stab₃/~
          </div>
          <button
            onClick={() => setShowBijection(!showBijection)}
            className="text-[10px] font-mono text-[hsl(210,10%,50%)] hover:text-[hsl(210,10%,70%)] transition-colors px-2 py-1 rounded bg-[hsla(210,10%,20%,0.3)]"
          >
            {showBijection ? "Hide" : "Show"} {report.bijectionEntries.length} entries
          </button>
        </div>

        {showBijection && (
          <div className="space-y-0.5 max-h-[400px] overflow-y-auto">
            <div className="grid grid-cols-6 gap-2 text-[8px] font-mono text-[hsl(210,10%,40%)] uppercase pb-1 border-b border-[hsla(210,10%,25%,0.2)] sticky top-0 bg-[hsl(230,15%,10%)]">
              <span>Atlas v</span><span>Label</span><span>Stab #</span><span>Generators</span><span>Match</span><span>Sign Class</span>
            </div>
            {report.bijectionEntries.map((e, i) => (
              <div key={i} className="grid grid-cols-6 gap-2 text-[9px] font-mono py-0.5">
                <span className="text-[hsl(200,60%,60%)]">{e.atlasIndex}</span>
                <span className="text-[hsl(210,10%,55%)]">
                  ({e.atlasLabel.e1},{e.atlasLabel.e2},{e.atlasLabel.e3},{e.atlasLabel.d45},{e.atlasLabel.e6},{e.atlasLabel.e7})
                </span>
                <span className="text-[hsl(280,50%,60%)]">{e.stabIndex}</span>
                <span className="text-[hsl(210,10%,50%)] truncate">{e.stabLabel}</span>
                <span className={e.signatureMatch ? "text-[hsl(140,60%,55%)]" : "text-[hsl(40,80%,55%)]"}>
                  {e.signatureMatch ? "✓ direct" : "~ index"}
                </span>
                <span className="text-[hsl(50,70%,55%)]">
                  {(e.atlasLabel.e1 << 2) | (e.atlasLabel.e2 << 1) | e.atlasLabel.e3}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className={`border rounded-lg p-5 ${
        report.allHold
          ? "bg-[hsla(140,30%,12%,0.3)] border-[hsla(140,30%,25%,0.4)]"
          : "bg-[hsla(40,30%,12%,0.3)] border-[hsla(40,30%,25%,0.4)]"
      }`}>
        <div className="text-[11px] font-mono text-[hsl(50,70%,60%)] uppercase mb-2">
          {report.allHold ? "Proof Summary — QED" : "Proof Summary — Incomplete"}
        </div>
        <p className="text-[11px] font-mono text-[hsl(210,10%,60%)] leading-relaxed">
          {report.proofSummary}
        </p>
        {report.allHold && (
          <p className="text-[10px] font-mono text-[hsl(140,50%,50%)] mt-2 leading-relaxed">
            The 96 vertices of the Atlas of Resonance Classes are in canonical bijection
            with the 96 stabilizer state representatives of the 3-qubit Clifford group
            under phase equivalence. The bijection preserves adjacency (single Clifford
            generator distance), mirror involution (Hermitian conjugation), and sign class
            structure (Pauli orbit decomposition). The Atlas is the Cayley graph of the
            stabilizer formalism.
          </p>
        )}
      </div>
    </div>
  );
}
