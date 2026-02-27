/**
 * Topological Qubit Panel
 * ════════════════════════
 *
 * Visualizes the geometric α derivation, topological qubit states,
 * and the unified theorem connecting fine structure to fault tolerance.
 */

import React, { useMemo } from "react";
import { runTopologicalQubitAnalysis, type TopologicalQubitReport } from "../topological-qubit";

export default function TopologicalQubitPanel() {
  const report = useMemo<TopologicalQubitReport>(() => runTopologicalQubitAnalysis(), []);
  const passedTests = report.tests.filter(t => t.holds).length;

  const anyonCounts = new Map<string, number>();
  for (const q of report.qubits) {
    anyonCounts.set(q.anyonType, (anyonCounts.get(q.anyonType) ?? 0) + 1);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-[15px] font-mono tracking-wide text-[hsl(38,50%,65%)]">
          TOPOLOGICAL QUBIT
        </h2>
        <p className="text-[11px] font-mono text-[hsl(210,10%,50%)]">
          Phase 11 — Geometric α derivation & qubit instantiation in Atlas substrate
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "α⁻¹ derived", value: report.alpha.alphaInverse.toFixed(2), color: "hsl(38,50%,65%)" },
          { label: "α⁻¹ measured", value: report.alpha.measured.toFixed(2), color: "hsl(200,50%,60%)" },
          { label: "Error", value: `${(report.alpha.relativeError * 100).toFixed(2)}%`, color: report.alpha.relativeError < 0.05 ? "hsl(140,60%,55%)" : "hsl(0,60%,55%)" },
          { label: "Qubits", value: report.qubits.length, color: "hsl(280,50%,60%)" },
          { label: "Tests", value: `${passedTests}/${report.tests.length}`, color: report.allPassed ? "hsl(140,60%,55%)" : "hsl(0,60%,55%)" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-3">
            <div className="text-[10px] font-mono text-[hsl(210,10%,45%)] uppercase">{label}</div>
            <div className="text-[18px] font-mono mt-1" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* α Derivation */}
      <div className="bg-[hsla(38,40%,12%,0.4)] border border-[hsla(38,40%,30%,0.3)] rounded-lg p-4">
        <div className="text-[11px] font-mono text-[hsl(38,50%,65%)] uppercase mb-3">
          Fine Structure Constant from Atlas Geometry
        </div>
        <div className="font-mono text-[13px] text-[hsl(38,30%,75%)] mb-2">
          α⁻¹ = Σd² / (4 × N₂₂ × σ²)
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          {[
            { label: "Σd² (degree sum of squares)", value: report.alpha.components.totalDegreeSqSum },
            { label: "N₂₂ (manifold nodes)", value: report.alpha.components.manifoldNodes },
            { label: "σ² (degree variance)", value: "2/9" },
            { label: "Compression ratio (deg5/deg6)", value: `${report.alpha.components.degree5}/${report.alpha.components.degree6} = ${report.alpha.components.compressionRatio}` },
            { label: "Vertices", value: report.alpha.components.vertices },
            { label: "Edges", value: report.alpha.components.edges },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[hsla(210,10%,8%,0.5)] rounded p-2">
              <div className="text-[10px] text-[hsl(210,10%,45%)]">{label}</div>
              <div className="text-[12px] text-[hsl(38,50%,70%)] font-mono mt-0.5">{value}</div>
            </div>
          ))}
        </div>
        <div className="text-[11px] font-mono text-[hsl(210,10%,55%)]">
          = {report.alpha.components.totalDegreeSqSum} × 9 / (4 × 22 × 2) = <span className="text-[hsl(38,50%,65%)]">{report.alpha.alphaInverse.toFixed(4)}</span>
        </div>
      </div>

      {/* Triclinic Slant */}
      <div className="bg-[hsla(200,40%,12%,0.4)] border border-[hsla(200,40%,30%,0.3)] rounded-lg p-4">
        <div className="text-[11px] font-mono text-[hsl(200,50%,60%)] uppercase mb-3">
          Triclinic Slant — The Impedance-Matching Angle
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[hsla(210,10%,8%,0.5)] rounded p-3 text-center">
            <div className="text-[10px] text-[hsl(210,10%,45%)]">Atlas-derived slant</div>
            <div className="text-[20px] text-[hsl(200,50%,65%)] font-mono">{report.slant.angleDegrees.toFixed(4)}°</div>
          </div>
          <div className="bg-[hsla(210,10%,8%,0.5)] rounded p-3 text-center">
            <div className="text-[10px] text-[hsl(210,10%,45%)]">α as angle (measured)</div>
            <div className="text-[20px] text-[hsl(140,60%,55%)] font-mono">{report.slant.alphaAsDegrees.toFixed(4)}°</div>
          </div>
          <div className="bg-[hsla(210,10%,8%,0.5)] rounded p-3 text-center">
            <div className="text-[10px] text-[hsl(210,10%,45%)]">Compression:Shear</div>
            <div className="text-[20px] text-[hsl(38,50%,65%)] font-mono">{report.slant.compressionShearRatio}:1</div>
          </div>
        </div>
        <p className="text-[10px] font-mono text-[hsl(210,10%,50%)] mt-3 leading-relaxed">
          The fine structure constant IS a geometric angle: α radians = {report.slant.alphaAsDegrees.toFixed(4)}°.
          It quantifies the impedance match between compression (negentropy, degree-5) and shear (entropy, degree-6)
          modes in the 6D Atlas label space.
        </p>
      </div>

      {/* Topological Qubits */}
      <div className="bg-[hsla(280,40%,12%,0.4)] border border-[hsla(280,40%,30%,0.3)] rounded-lg p-4">
        <div className="text-[11px] font-mono text-[hsl(280,50%,65%)] uppercase mb-3">
          48 Topological Qubits — Mirror Pair Superpositions
        </div>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[...anyonCounts.entries()].map(([type, count]) => (
            <div key={type} className="bg-[hsla(210,10%,8%,0.5)] rounded p-3">
              <div className="text-[12px] font-mono text-[hsl(280,50%,70%)]">{type}</div>
              <div className="text-[10px] text-[hsl(210,10%,45%)] mt-0.5">{count} qubits</div>
            </div>
          ))}
        </div>
        <div className="text-[10px] font-mono text-[hsl(210,10%,50%)] mb-2">
          Protection distance: min = {Math.min(...report.qubits.map(q => q.protectionDistance))}, max = {Math.max(...report.qubits.map(q => q.protectionDistance))}
        </div>
        <div className="grid grid-cols-6 gap-1 max-h-32 overflow-y-auto">
          {report.qubits.map(q => (
            <div key={q.index} className="bg-[hsla(210,10%,8%,0.5)] rounded p-1.5 text-center">
              <div className="text-[9px] text-[hsl(280,40%,60%)] font-mono">Q{q.index}</div>
              <div className="text-[8px] text-[hsl(210,10%,45%)]">{q.vertex}↔{q.mirrorVertex}</div>
              <div className="text-[8px] text-[hsl(210,10%,40%)]">d={q.protectionDistance}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Verification */}
      <div className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-4">
        <div className="text-[11px] font-mono text-[hsl(210,10%,50%)] uppercase mb-3">
          Verification Tests
        </div>
        {report.tests.map(t => (
          <div key={t.name} className="flex items-center gap-3 py-1.5 border-b border-[hsla(210,10%,30%,0.2)]">
            <span className={`text-[13px] ${t.holds ? "text-[hsl(140,60%,55%)]" : "text-[hsl(0,60%,55%)]"}`}>
              {t.holds ? "✓" : "✗"}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-mono text-[hsl(210,10%,75%)]">{t.name}</div>
              <div className="text-[10px] text-[hsl(210,10%,45%)]">
                expected: {t.expected} · actual: {t.actual}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Unified Theorem */}
      <div className="bg-[hsla(280,40%,15%,0.3)] border border-[hsla(280,40%,30%,0.3)] rounded-lg p-4">
        <div className="text-[11px] font-mono text-[hsl(280,50%,65%)] mb-2">
          ∎ UNIFIED THEOREM (Atlas Geometric Substrate)
        </div>
        <p className="text-[11px] font-mono text-[hsl(280,20%,70%)] leading-relaxed">
          The 96-vertex Atlas graph encodes the fine structure constant α⁻¹ ≈ {report.alpha.alphaInverse.toFixed(1)} through
          its degree distribution (Σd² = {report.alpha.components.totalDegreeSqSum}, σ² = 2/9) and 22-node submanifold
          (8 sign classes + 12 G₂ boundary + 2 unity). The same geometric structure produces {report.qubits.length} topological
          qubits via mirror pair superpositions |ψ⟩ = α|v⟩ + β|τ(v)⟩, with topological protection from the τ-involution
          (mirror pairs are never adjacent). The triclinic slant angle {report.slant.angleDegrees.toFixed(4)}° = α expressed
          in degrees, quantifying the impedance match between compression (negentropy) and shear (entropy) modes.
          Reality is a geometric substrate; quantum mechanics is its projection; α is the efficiency of boundary
          detection in 3D space.
        </p>
      </div>
    </div>
  );
}
