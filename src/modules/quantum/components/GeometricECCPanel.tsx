/**
 * Geometric Error Correction Panel
 * ═════════════════════════════════
 *
 * Visualizes the Atlas τ-mirror stabilizer code:
 * 48 generators, syndrome extraction, logical qubits, code distance.
 */

import React, { useMemo, useState } from "react";
import {
  runGeometricECC,
  extractSyndrome,
  signClassSyndromes,
  type GeometricECCReport,
  type StabilizerGenerator,
} from "@/modules/quantum/geometric-ecc";

export default function GeometricECCPanel() {
  const report = useMemo(() => runGeometricECC(), []);
  const [viewMode, setViewMode] = useState<"overview" | "generators" | "syndrome" | "logical" | "tests">("overview");
  const [errorQubit, setErrorQubit] = useState<number | null>(null);

  return (
    <div className="h-full flex flex-col bg-[hsl(230,15%,8%)]">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-[hsla(210,15%,30%,0.3)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-mono text-[hsl(140,50%,60%)]">
              Geometric Error Correction
            </h2>
            <p className="text-[10px] font-mono text-[hsl(210,10%,50%)] mt-1">
              Atlas τ-mirror stabilizer code [[{report.codeParams.n}, {report.codeParams.k}, {report.codeParams.d}]]
            </p>
          </div>
          <div className={`text-[11px] font-mono px-2 py-1 rounded ${
            report.allPassed
              ? "bg-[hsla(140,50%,30%,0.3)] text-[hsl(140,60%,55%)]"
              : "bg-[hsla(0,50%,30%,0.3)] text-[hsl(0,60%,55%)]"
          }`}>
            {report.tests.filter(t => t.holds).length}/{report.tests.length} tests ✓
          </div>
        </div>

        <div className="flex gap-1 mt-3">
          {(["overview", "generators", "syndrome", "logical", "tests"] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`text-[10px] font-mono px-3 py-1 rounded transition-colors ${
                viewMode === mode
                  ? "bg-[hsla(140,50%,50%,0.2)] text-[hsl(140,50%,65%)]"
                  : "text-[hsl(210,10%,50%)] hover:text-[hsl(210,10%,70%)]"
              }`}
            >
              {mode === "overview" ? "Overview" : mode === "generators" ? "Stabilizers" : mode === "syndrome" ? "Syndrome Sim" : mode === "logical" ? "Logical Qubits" : "Tests"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {viewMode === "overview" ? <OverviewView report={report} /> :
         viewMode === "generators" ? <GeneratorsView generators={report.generators} /> :
         viewMode === "syndrome" ? <SyndromeView errorQubit={errorQubit} setErrorQubit={setErrorQubit} /> :
         viewMode === "logical" ? <LogicalView report={report} /> :
         <TestsView report={report} />}
      </div>
    </div>
  );
}

function OverviewView({ report }: { report: GeometricECCReport }) {
  const { codeParams, stats, distance } = report;

  return (
    <div className="space-y-4">
      {/* Code parameters hero */}
      <div className="bg-[hsla(140,30%,12%,0.4)] rounded-lg border border-[hsla(140,30%,30%,0.3)] p-5 text-center">
        <div className="text-[28px] font-mono text-[hsl(140,50%,60%)] tracking-wider">
          [[{codeParams.n}, {codeParams.k}, {codeParams.d}]]
        </div>
        <p className="text-[10px] font-mono text-[hsl(210,10%,50%)] mt-2">
          {codeParams.n} physical qubits → {codeParams.k} logical qubits, distance {codeParams.d}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Stabilizers", value: `${stats.independentGenerators}`, sub: "Z⊗Z generators" },
          { label: "Overhead", value: `${stats.overhead.toFixed(1)}×`, sub: "physical/logical" },
          { label: "Detection", value: `${(stats.singleQubitCoverage * 100).toFixed(0)}%`, sub: "single-qubit errors" },
          { label: "Sign Layers", value: `${stats.signClassLayers}`, sub: "parity checks" },
          { label: "Homogeneous", value: `${(stats.homogeneousRatio * 100).toFixed(0)}%`, sub: "same-degree pairs" },
          { label: "Correctable", value: `${distance.correctableSingle}`, sub: "single-qubit patterns" },
          { label: "Min Undetected", value: `wt-${distance.minUndetectable}`, sub: "mirror pair error" },
          { label: "Method", value: "τ-mirror", sub: "e₇ flip involution" },
        ].map(s => (
          <div key={s.label} className="bg-[hsla(210,10%,12%,0.6)] rounded p-2.5 border border-[hsla(210,10%,25%,0.3)]">
            <div className="text-[9px] font-mono text-[hsl(210,10%,40%)] uppercase">{s.label}</div>
            <div className="text-[13px] font-mono text-[hsl(140,50%,60%)] mt-0.5">{s.value}</div>
            <div className="text-[8px] font-mono text-[hsl(210,10%,40%)] mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="bg-[hsla(210,10%,12%,0.6)] rounded-lg border border-[hsla(210,10%,25%,0.3)] p-4">
        <div className="text-[11px] font-mono text-[hsl(210,10%,50%)] uppercase mb-3">Architecture</div>
        <div className="space-y-2 text-[10px] font-mono text-[hsl(210,10%,60%)] leading-relaxed">
          <p><strong className="text-[hsl(140,50%,60%)]">Layer 1 — τ-Mirror Stabilizers:</strong> Each of 48 mirror pairs (v, τ(v)) defines a Z⊗Z stabilizer generator. The mirror involution τ flips e₇ (0↔1) and satisfies τ²=id, τ(v)∉N(v). Any single-qubit X error triggers exactly one stabilizer → 100% detection.</p>
          <p><strong className="text-[hsl(200,50%,60%)]">Layer 2 — Sign Class Parity:</strong> The 8 sign classes (12 vertices each) provide secondary syndrome bits. Errors crossing sign class boundaries produce additional detectable signatures.</p>
          <p><strong className="text-[hsl(280,50%,60%)]">Layer 3 — Degree Discrimination:</strong> Mixed-degree pairs (deg-5 ↔ deg-6) allow Z-error discrimination via degree measurement, enhancing the code beyond pure Z⊗Z detection.</p>
        </div>
      </div>

      {/* Mirror pair visual */}
      <div className="bg-[hsla(210,10%,12%,0.6)] rounded-lg border border-[hsla(210,10%,25%,0.3)] p-4">
        <div className="text-[11px] font-mono text-[hsl(210,10%,50%)] uppercase mb-3">
          Mirror Pair Map (48 stabilizer generators)
        </div>
        <div className="grid grid-cols-12 gap-1">
          {report.generators.map(g => (
            <div
              key={g.index}
              className="flex flex-col items-center gap-0.5"
              title={`S${g.index}: ${g.pauliString} | sc=${g.signClass} | ${g.type}`}
            >
              <div className={`w-4 h-4 rounded-sm text-[7px] font-mono flex items-center justify-center text-white ${
                g.type === "homogeneous" ? "bg-[hsl(140,40%,35%)]" : "bg-[hsl(30,50%,40%)]"
              }`}>
                {g.vertex}
              </div>
              <div className="w-px h-2 bg-[hsla(210,10%,30%,0.5)]" />
              <div className={`w-4 h-4 rounded-sm text-[7px] font-mono flex items-center justify-center text-white ${
                g.type === "homogeneous" ? "bg-[hsl(140,40%,35%)]" : "bg-[hsl(30,50%,40%)]"
              }`}>
                {g.mirror}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-2 text-[9px] font-mono text-[hsl(210,10%,45%)]">
          <span>■ Homogeneous (same degree)</span>
          <span style={{ color: "hsl(30,50%,55%)" }}>■ Mixed (different degree)</span>
        </div>
      </div>
    </div>
  );
}

function GeneratorsView({ generators }: { generators: StabilizerGenerator[] }) {
  return (
    <div className="space-y-3">
      <div className="text-[11px] font-mono text-[hsl(210,10%,50%)] uppercase">
        48 Stabilizer Generators — Z⊗Z from τ-Mirror Pairs
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] font-mono">
          <thead>
            <tr className="text-[hsl(210,10%,45%)] border-b border-[hsla(210,10%,25%,0.3)]">
              {["#", "v", "τ(v)", "Pauli", "Sign Class", "Deg(v)", "Deg(τ)", "Type", "Weight"].map(h => (
                <th key={h} className="text-left py-2 px-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {generators.map(g => (
              <tr key={g.index} className="border-b border-[hsla(210,10%,20%,0.3)] hover:bg-[hsla(140,20%,20%,0.15)]">
                <td className="py-1 px-2 text-[hsl(210,10%,45%)]">S{g.index}</td>
                <td className="py-1 px-2 text-[hsl(140,50%,60%)]">{g.vertex}</td>
                <td className="py-1 px-2 text-[hsl(140,50%,60%)]">{g.mirror}</td>
                <td className="py-1 px-2 text-[hsl(200,60%,65%)]">{g.pauliString}</td>
                <td className="py-1 px-2 text-[hsl(280,50%,65%)]">{g.signClass}</td>
                <td className="py-1 px-2 text-[hsl(210,10%,60%)]">{g.degreeV}</td>
                <td className="py-1 px-2 text-[hsl(210,10%,60%)]">{g.degreeMirror}</td>
                <td className="py-1 px-2">
                  <span className={g.type === "homogeneous" ? "text-[hsl(140,50%,55%)]" : "text-[hsl(30,60%,55%)]"}>
                    {g.type}
                  </span>
                </td>
                <td className="py-1 px-2 text-[hsl(210,10%,60%)]">{g.weight}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SyndromeView({ errorQubit, setErrorQubit }: {
  errorQubit: number | null;
  setErrorQubit: (q: number | null) => void;
}) {
  const syndrome = useMemo(
    () => errorQubit !== null ? extractSyndrome([errorQubit]) : extractSyndrome([]),
    [errorQubit]
  );
  const scSyndromes = useMemo(
    () => signClassSyndromes(errorQubit !== null ? [errorQubit] : []),
    [errorQubit]
  );

  return (
    <div className="space-y-4">
      <div className="text-[11px] font-mono text-[hsl(210,10%,50%)] uppercase">
        Interactive Syndrome Simulator
      </div>

      {/* Qubit selector */}
      <div className="bg-[hsla(210,10%,12%,0.6)] rounded-lg border border-[hsla(210,10%,25%,0.3)] p-4">
        <div className="text-[10px] font-mono text-[hsl(210,10%,50%)] mb-2">
          Click a qubit to inject an X error (bit flip):
        </div>
        <div className="grid grid-cols-16 gap-1">
          {Array.from({ length: 96 }, (_, i) => (
            <button
              key={i}
              onClick={() => setErrorQubit(errorQubit === i ? null : i)}
              className={`w-5 h-5 rounded-sm text-[7px] font-mono transition-colors ${
                errorQubit === i
                  ? "bg-[hsl(0,60%,45%)] text-white"
                  : "bg-[hsla(210,10%,20%,0.5)] text-[hsl(210,10%,50%)] hover:bg-[hsla(210,10%,25%,0.5)]"
              }`}
            >
              {i}
            </button>
          ))}
        </div>
        {errorQubit !== null && (
          <div className="mt-2 text-[10px] font-mono text-[hsl(0,60%,60%)]">
            ⚡ X error injected at qubit {errorQubit}
          </div>
        )}
      </div>

      {/* Syndrome readout */}
      <div className="bg-[hsla(210,10%,12%,0.6)] rounded-lg border border-[hsla(210,10%,25%,0.3)] p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="text-[11px] font-mono text-[hsl(210,10%,50%)] uppercase">Syndrome</div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
            syndrome.correctable
              ? "bg-[hsla(140,50%,30%,0.3)] text-[hsl(140,60%,55%)]"
              : "bg-[hsla(0,50%,30%,0.3)] text-[hsl(0,60%,55%)]"
          }`}>
            {syndrome.errorType} | {syndrome.correctable ? "correctable" : "uncorrectable"}
          </span>
        </div>
        <div className="flex gap-0.5 flex-wrap">
          {syndrome.bits.map((bit, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-sm text-[7px] font-mono flex items-center justify-center ${
                bit
                  ? "bg-[hsl(0,60%,45%)] text-white"
                  : "bg-[hsla(210,10%,20%,0.5)] text-[hsl(210,10%,35%)]"
              }`}
              title={`S${i}: ${bit ? "TRIGGERED" : "ok"}`}
            >
              {bit ? "1" : "0"}
            </div>
          ))}
        </div>
        <div className="mt-2 text-[9px] font-mono text-[hsl(210,10%,45%)]">
          Syndrome weight: {syndrome.weight}/48 stabilizers triggered
        </div>
      </div>

      {/* Sign class syndromes */}
      <div className="bg-[hsla(210,10%,12%,0.6)] rounded-lg border border-[hsla(210,10%,25%,0.3)] p-4">
        <div className="text-[11px] font-mono text-[hsl(210,10%,50%)] uppercase mb-3">
          Sign Class Parity (Layer 2)
        </div>
        <div className="grid grid-cols-8 gap-2">
          {scSyndromes.map(sc => (
            <div
              key={sc.signClass}
              className={`rounded p-2 text-center border ${
                sc.parityOK
                  ? "bg-[hsla(140,30%,15%,0.3)] border-[hsla(140,30%,30%,0.3)]"
                  : "bg-[hsla(0,30%,15%,0.3)] border-[hsla(0,30%,30%,0.3)]"
              }`}
            >
              <div className="text-[9px] text-[hsl(210,10%,40%)]">SC{sc.signClass}</div>
              <div className={`text-[11px] font-mono ${sc.parityOK ? "text-[hsl(140,50%,55%)]" : "text-[hsl(0,60%,55%)]"}`}>
                {sc.parityOK ? "✓" : "✗"}
              </div>
              <div className="text-[8px] text-[hsl(210,10%,40%)]">{sc.actualCount}/12</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LogicalView({ report }: { report: GeometricECCReport }) {
  const { logicalQubits } = report;

  // Group by sign class
  const bySignClass = Array.from({ length: 8 }, (_, sc) =>
    logicalQubits.filter(q => q.signClass === sc)
  );

  return (
    <div className="space-y-4">
      <div className="text-[11px] font-mono text-[hsl(210,10%,50%)] uppercase">
        48 Logical Qubits — Encoded via Mirror Pairs
      </div>

      <div className="bg-[hsla(210,10%,12%,0.6)] rounded-lg border border-[hsla(210,10%,25%,0.3)] p-4">
        <div className="text-[10px] font-mono text-[hsl(210,10%,55%)] mb-3">
          |0_L⟩ = |v⟩ (e₇=0) &nbsp;|&nbsp; |1_L⟩ = |τ(v)⟩ (e₇=1) &nbsp;|&nbsp; X_L = τ (mirror flip)
        </div>

        {bySignClass.map((group, sc) => (
          <div key={sc} className="mb-3">
            <div className="text-[9px] font-mono text-[hsl(280,50%,65%)] mb-1">
              Sign Class {sc} — {group.length} logical qubits
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {group.map(q => (
                <div
                  key={q.index}
                  className="bg-[hsla(210,10%,8%,0.5)] rounded p-1.5 border border-[hsla(210,10%,20%,0.3)]"
                >
                  <div className="text-[9px] font-mono text-[hsl(140,50%,60%)]">
                    L{q.index}
                  </div>
                  <div className="text-[8px] font-mono text-[hsl(210,10%,50%)]">
                    |0⟩={q.physicalZero} |1⟩={q.physicalOne}
                  </div>
                  <div className="text-[7px] font-mono text-[hsl(210,10%,40%)]">
                    iso={q.isolation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TestsView({ report }: { report: GeometricECCReport }) {
  return (
    <div className="space-y-4">
      <div className="text-[11px] font-mono text-[hsl(210,10%,50%)] uppercase">
        Structural Verification — {report.tests.filter(t => t.holds).length}/{report.tests.length} passed
      </div>
      <div className="space-y-1.5">
        {report.tests.map((t, i) => (
          <div
            key={i}
            className="flex items-start gap-2 bg-[hsla(210,10%,12%,0.6)] rounded p-2.5 border border-[hsla(210,10%,25%,0.3)]"
          >
            <span className={`text-[11px] mt-px ${t.holds ? "text-[hsl(140,60%,55%)]" : "text-[hsl(0,60%,55%)]"}`}>
              {t.holds ? "✓" : "✗"}
            </span>
            <div>
              <span className="text-[11px] font-mono text-[hsl(210,10%,70%)]">{t.name}</span>
              <div className="text-[9px] font-mono text-[hsl(210,10%,45%)] mt-0.5">{t.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
