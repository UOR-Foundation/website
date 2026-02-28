/**
 * Alpha Refinement Panel — QED Loop Corrections from Atlas Graph Invariants
 * ═════════════════════════════════════════════════════════════════════════
 * Phase 12b: Lanczos spectral upgrade + refined QED coefficient mappings
 */

import React, { useState, useEffect } from "react";
import {
  runAlphaRefinement,
  type AlphaRefinement,
} from "../alpha-refinement";

export default function AlphaRefinementPanel() {
  const [report, setReport] = useState<AlphaRefinement | null>(null);
  const [expandedCorrection, setExpandedCorrection] = useState<number | null>(0);
  const [showInvariants, setShowInvariants] = useState(false);
  const [showTests, setShowTests] = useState(false);
  const [showSpectrum, setShowSpectrum] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      const r = runAlphaRefinement();
      setReport(r);
      setLoading(false);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  if (loading || !report) {
    return (
      <div className="h-full flex items-center justify-center text-[hsl(210,10%,45%)] text-sm font-mono">
        Running Lanczos algorithm on Atlas Laplacian (96×96)…
      </div>
    );
  }

  const passedTests = report.tests.filter(t => t.holds).length;
  const gapClosed = (1 - report.residualPercent / 2.62) * 100;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-mono tracking-wide text-[hsl(30,80%,60%)]">
            α⁻¹ Refinement — QED Loop Corrections
          </h2>
          <p className="text-[11px] font-mono text-[hsl(210,10%,50%)] mt-0.5">
            Lanczos spectral gap · Fiedler-optimal Cheeger · 6 QED-mapped corrections
          </p>
        </div>
        <div className={`text-[11px] font-mono px-3 py-1 rounded-md border ${
          report.residualPercent < 1.5
            ? "bg-[hsla(140,30%,15%,0.3)] border-[hsla(140,30%,25%,0.4)] text-[hsl(140,60%,55%)]"
            : report.residualPercent < 2.62
            ? "bg-[hsla(40,30%,15%,0.3)] border-[hsla(40,30%,25%,0.4)] text-[hsl(40,80%,55%)]"
            : "bg-[hsla(0,30%,15%,0.3)] border-[hsla(0,30%,25%,0.4)] text-[hsl(0,60%,55%)]"
        }`}>
          {passedTests}/{report.tests.length} tests — residual {report.residualPercent.toFixed(3)}%
        </div>
      </div>

      {/* Alpha comparison bar */}
      <div className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-5">
        <div className="flex items-end gap-8">
          <div className="flex-1">
            <div className="text-[9px] font-mono text-[hsl(210,10%,40%)] uppercase mb-1">Tree-level (bare)</div>
            <div className="text-[28px] font-mono text-[hsl(30,60%,60%)]">{report.bareAlpha.toFixed(3)}</div>
            <div className="text-[10px] font-mono text-[hsl(210,10%,45%)]">α⁻¹₀ = Σd² / (4N₂₂σ²)</div>
          </div>
          <div className="text-center pb-2">
            <div className="text-[9px] font-mono text-[hsl(140,50%,50%)] mb-1">
              − {(report.totalDelta * 100).toFixed(3)}%
            </div>
            <div className="text-[hsl(210,10%,35%)] text-lg">→</div>
            <div className="text-[9px] font-mono text-[hsl(210,10%,40%)]">6 corrections</div>
          </div>
          <div className="flex-1">
            <div className="text-[9px] font-mono text-[hsl(210,10%,40%)] uppercase mb-1">Corrected</div>
            <div className="text-[28px] font-mono text-[hsl(160,60%,55%)]">{report.correctedAlpha.toFixed(4)}</div>
            <div className="text-[10px] font-mono text-[hsl(210,10%,45%)]">α⁻¹ = α⁻¹₀ × (1 − Σδᵢ)</div>
          </div>
          <div className="text-center pb-2">
            <div className="text-[9px] font-mono text-[hsl(40,70%,55%)] mb-1">
              gap: {report.residualPercent.toFixed(3)}%
            </div>
            <div className="text-[hsl(210,10%,35%)] text-lg">→</div>
          </div>
          <div className="flex-1">
            <div className="text-[9px] font-mono text-[hsl(210,10%,40%)] uppercase mb-1">NIST Measured</div>
            <div className="text-[28px] font-mono text-[hsl(200,60%,60%)]">{report.measured.toFixed(6)}</div>
            <div className="text-[10px] font-mono text-[hsl(210,10%,45%)]">α⁻¹ = 137.035999084(21)</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 space-y-1">
          <div className="flex items-center justify-between text-[8px] font-mono text-[hsl(210,10%,40%)]">
            <span>Gap closed ({gapClosed.toFixed(1)}%)</span>
            <span>{report.bareAlpha.toFixed(1)} → {report.correctedAlpha.toFixed(3)} → {report.measured.toFixed(3)}</span>
          </div>
          <div className="h-2.5 bg-[hsla(210,10%,15%,0.5)] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, gapClosed)}%`,
                background: gapClosed > 80
                  ? "linear-gradient(90deg, hsl(30,70%,55%), hsl(140,60%,50%))"
                  : "linear-gradient(90deg, hsl(30,70%,55%), hsl(160,60%,50%))",
              }}
            />
          </div>
        </div>
      </div>

      {/* Lanczos Spectrum */}
      <div className="bg-[hsla(200,15%,12%,0.6)] border border-[hsla(200,20%,25%,0.3)] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-mono text-[hsl(200,60%,60%)] uppercase flex items-center gap-2">
            <span>Lanczos Eigenvalue Spectrum</span>
            <span className="text-[8px] text-[hsl(210,10%,45%)]">({report.spectrum.iterations} iterations, full reorthogonalization)</span>
          </div>
          <button onClick={() => setShowSpectrum(!showSpectrum)}
            className="text-[9px] font-mono text-[hsl(210,10%,50%)] hover:text-[hsl(210,10%,70%)] px-2 py-0.5 rounded bg-[hsla(210,10%,20%,0.3)]">
            {showSpectrum ? "Hide" : "Show"} spectrum
          </button>
        </div>

        {/* Key spectral values */}
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: "λ₁ (Fiedler)", value: report.invariants.spectralGap.toFixed(6), color: "hsl(200,60%,60%)" },
            { label: "λ₂", value: report.invariants.lambda2.toFixed(6), color: "hsl(200,50%,55%)" },
            { label: "λ_max", value: report.invariants.lambdaMax.toFixed(4), color: "hsl(30,70%,60%)" },
            { label: "λ₁/λ₂", value: report.invariants.spectralRatio.toFixed(6), color: "hsl(280,50%,60%)" },
            { label: "ln(λ_max/λ₁)", value: Math.log(report.invariants.lambdaMax / Math.max(report.invariants.spectralGap, 1e-10)).toFixed(4), color: "hsl(160,60%,55%)" },
          ].map(s => (
            <div key={s.label} className="bg-[hsla(210,10%,8%,0.5)] rounded p-2">
              <div className="text-[7px] font-mono text-[hsl(210,10%,40%)] uppercase">{s.label}</div>
              <div className="text-[12px] font-mono mt-0.5" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Spectrum visualization */}
        {showSpectrum && report.spectrum.eigenvalues.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="text-[9px] font-mono text-[hsl(210,10%,45%)]">
              First {report.spectrum.eigenvalues.length} eigenvalues (Sturm bisection):
            </div>
            <div className="flex items-end gap-1 h-[80px]">
              {report.spectrum.eigenvalues.map((eig, i) => {
                const maxEig = report.spectrum.eigenvalues[report.spectrum.eigenvalues.length - 1] || 1;
                const h = Math.max(2, (eig / maxEig) * 100);
                return (
                  <div key={i} className="flex-1 relative group">
                    <div className="absolute bottom-0 w-full rounded-t-sm bg-[hsl(200,50%,50%)] transition-all"
                      style={{ height: `${h}%`, opacity: 0.5 + (i / report.spectrum.eigenvalues.length) * 0.5 }} />
                    <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black text-white text-[7px] p-1 rounded whitespace-nowrap z-10">
                      λ_{i + 1} = {eig.toFixed(4)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Correction cards */}
      <div className="space-y-2">
        <div className="text-[10px] font-mono text-[hsl(210,10%,45%)] uppercase">
          Loop Corrections: QED ↔ Atlas Graph Invariants (6 terms)
        </div>

        {report.corrections.map((c, i) => {
          const colors = [
            "hsl(200,60%,55%)", "hsl(280,50%,60%)", "hsl(160,60%,50%)",
            "hsl(50,80%,55%)", "hsl(30,70%,55%)", "hsl(190,60%,55%)",
          ];
          const color = colors[i % colors.length];

          return (
            <div key={i} className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg overflow-hidden">
              <button onClick={() => setExpandedCorrection(expandedCorrection === i ? null : i)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-[hsla(210,10%,15%,0.3)] transition-colors">
                <div className="w-8 h-8 rounded-md flex items-center justify-center text-[12px] font-mono"
                  style={{ backgroundColor: `${color}15`, color }}>
                  δ{i + 1}
                </div>
                <div className="flex-1">
                  <div className="text-[12px] font-mono" style={{ color }}>{c.name}</div>
                  <div className="text-[9px] font-mono text-[hsl(210,10%,50%)] mt-0.5">
                    {c.qedAnalog} ↔ {c.graphInvariant}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[12px] font-mono" style={{ color }}>
                    −{(c.delta * 100).toFixed(4)}%
                  </div>
                  <div className="text-[9px] font-mono text-[hsl(210,10%,40%)]">
                    raw: {c.rawValue.toFixed(4)}
                  </div>
                </div>
                <span className="text-[hsl(210,10%,40%)] text-[11px] ml-2">
                  {expandedCorrection === i ? "▼" : "▶"}
                </span>
              </button>

              {expandedCorrection === i && (
                <div className="px-4 pb-4 border-t border-[hsla(210,10%,20%,0.3)] space-y-3">
                  <div className="mt-3 bg-[hsla(210,10%,8%,0.5)] rounded p-3">
                    <div className="text-[9px] font-mono text-[hsl(210,10%,40%)] uppercase mb-1">Formula</div>
                    <div className="text-[11px] font-mono text-[hsl(210,10%,65%)]">{c.formula}</div>
                  </div>
                  <pre className="text-[10px] font-mono text-[hsl(210,10%,55%)] leading-relaxed whitespace-pre-wrap pl-4 border-l-2"
                    style={{ borderColor: `${color}40` }}>
                    {c.explanation}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Graph Invariants */}
      <div className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-mono text-[hsl(30,70%,55%)] uppercase">Atlas Graph Invariants</div>
          <button onClick={() => setShowInvariants(!showInvariants)}
            className="text-[9px] font-mono text-[hsl(210,10%,50%)] hover:text-[hsl(210,10%,70%)] px-2 py-0.5 rounded bg-[hsla(210,10%,20%,0.3)]">
            {showInvariants ? "Hide" : "Show"} all
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {[
            { label: "λ₁ (Lanczos)", value: report.invariants.spectralGap.toFixed(4), color: "hsl(200,60%,55%)" },
            { label: "Cheeger h", value: report.invariants.cheegerEstimate.toFixed(4), color: "hsl(280,50%,60%)" },
            { label: "Chromatic χ", value: String(report.invariants.chromaticNumber), color: "hsl(160,60%,50%)" },
            { label: "Triangles", value: String(report.invariants.triangleCount), color: "hsl(50,80%,55%)" },
            { label: "4-Cycles", value: String(report.invariants.squareCount), color: "hsl(30,70%,55%)" },
            { label: "Girth", value: String(report.invariants.girth), color: "hsl(190,60%,55%)" },
            { label: "λ₁/λ₂", value: report.invariants.spectralRatio.toFixed(3), color: "hsl(280,50%,60%)" },
          ].map(s => (
            <div key={s.label} className="bg-[hsla(210,10%,8%,0.5)] rounded p-2">
              <div className="text-[7px] font-mono text-[hsl(210,10%,40%)] uppercase">{s.label}</div>
              <div className="text-[12px] font-mono mt-0.5" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {showInvariants && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {Object.entries(report.invariants).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between text-[9px] font-mono py-0.5 px-2 bg-[hsla(210,10%,8%,0.3)] rounded">
                <span className="text-[hsl(210,10%,45%)]">{key}</span>
                <span className="text-[hsl(210,10%,65%)]">{typeof value === "number" ? (Math.abs(value) < 0.01 ? value.toExponential(4) : value.toFixed(6)) : value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Thesis */}
      <div className="bg-[hsla(30,30%,12%,0.3)] border border-[hsla(30,30%,25%,0.3)] rounded-lg p-5">
        <div className="text-[10px] font-mono text-[hsl(30,70%,55%)] uppercase mb-2">Thesis (Phase 12b)</div>
        <p className="text-[11px] font-mono text-[hsl(30,20%,70%)] leading-relaxed">
          The tree-level Atlas derivation α⁻¹₀ = 140.73 encodes the bare fine structure constant.
          Using the <strong>Lanczos algorithm</strong> with full reorthogonalization, we now extract
          accurate spectral data from the Atlas Laplacian. The spectral dynamic range
          ln(λ_max/λ₁) directly maps to the QED vacuum polarization screening via the
          Schwinger coefficient (α₀/3π). The <strong>Fiedler-optimal Cheeger cut</strong> improves the vertex
          correction mapping. A new 6th correction from the <strong>spectral gap anisotropy</strong> (1−λ₁/λ₂)
          encodes the QED β-function (coupling running). Together, 6 corrections push α⁻¹
          from 140.73 toward 137.036.
        </p>
      </div>

      {/* Verification */}
      <div className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-mono text-[hsl(210,10%,45%)] uppercase">
            Verification — {passedTests}/{report.tests.length}
          </div>
          <button onClick={() => setShowTests(!showTests)}
            className="text-[9px] font-mono text-[hsl(210,10%,50%)] hover:text-[hsl(210,10%,70%)] px-2 py-0.5 rounded bg-[hsla(210,10%,20%,0.3)]">
            {showTests ? "Hide" : "Show"} tests
          </button>
        </div>

        {showTests && (
          <div className="space-y-1">
            {report.tests.map((t, i) => (
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
