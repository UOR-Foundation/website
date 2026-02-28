/**
 * Coadjoint Orbit Classifier Panel
 * ═════════════════════════════════
 *
 * Visualizes which E₈ coadjoint orbits satisfy Neeb's
 * integrability condition for Gibbs ensembles.
 */

import React, { useState, useMemo } from "react";
import {
  runOrbitClassification,
  type IntegrabilityResult,
  type ClassificationReport,
} from "@/modules/atlas/coadjoint-orbit-classifier";
import { CheckCircle, XCircle, AlertTriangle, Orbit, Atom, Activity } from "lucide-react";

type ViewMode = "map" | "detail" | "invariants";

export default function CoadjointOrbitPanel() {
  const [report, setReport] = useState<ClassificationReport | null>(null);
  const [selected, setSelected] = useState<IntegrabilityResult | null>(null);
  const [view, setView] = useState<ViewMode>("map");
  const [computing, setComputing] = useState(false);

  const handleClassify = () => {
    setComputing(true);
    requestAnimationFrame(() => {
      const r = runOrbitClassification();
      setReport(r);
      setComputing(false);
    });
  };

  const allResults = useMemo(() => {
    if (!report) return [];
    return [...report.integrable, ...report.boundary, ...report.nonIntegrable]
      .sort((a, b) => a.orbit.index - b.orbit.index);
  }, [report]);

  const statusColor = (s: string) =>
    s === "integrable" ? "hsl(140,60%,55%)" :
    s === "boundary" ? "hsl(45,80%,55%)" :
    "hsl(0,60%,55%)";

  const statusIcon = (s: string) =>
    s === "integrable" ? <CheckCircle size={10} /> :
    s === "boundary" ? <AlertTriangle size={10} /> :
    <XCircle size={10} />;

  return (
    <div className="h-full p-6 space-y-5 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-mono text-[hsl(38,50%,60%)] flex items-center gap-2">
            <Orbit size={16} /> Coadjoint Orbit Classifier — E₈
          </h2>
          <p className="text-[10px] font-mono text-[hsl(210,10%,45%)] mt-1">
            Neeb's integrability condition: O_λ carries a Gibbs ensemble iff L(λ) converges, Q̄ is a diffeomorphism, g_ij {">"} 0
          </p>
        </div>
        <button
          onClick={handleClassify}
          disabled={computing}
          className="px-4 py-2 rounded-md text-[11px] font-mono bg-[hsla(38,50%,50%,0.2)] text-[hsl(38,50%,65%)] hover:bg-[hsla(38,50%,50%,0.3)] transition-colors disabled:opacity-40"
        >
          {computing ? "Classifying…" : report ? "Re-Classify" : "▸ Run Classification"}
        </button>
      </div>

      {!report && !computing && (
        <div className="h-64 flex items-center justify-center text-[hsl(210,10%,40%)] text-[12px] font-mono">
          Click "Run Classification" to test E₈ coadjoint orbits for Neeb integrability
        </div>
      )}

      {computing && (
        <div className="h-64 flex items-center justify-center text-[hsl(38,50%,60%)] text-[12px] font-mono animate-pulse">
          Testing integrability conditions on E₈ orbits…
        </div>
      )}

      {report && (
        <>
          {/* Summary bar */}
          <div className="grid grid-cols-5 gap-2">
            {[
              { label: "Total Orbits", value: report.totalOrbits, color: "hsl(210,10%,60%)" },
              { label: "Integrable", value: report.stats.integrableCount, color: "hsl(140,60%,55%)" },
              { label: "Boundary", value: report.stats.boundaryCount, color: "hsl(45,80%,55%)" },
              { label: "Non-Integrable", value: report.stats.nonIntegrableCount, color: "hsl(0,60%,55%)" },
              { label: "Mean Score", value: report.stats.meanScore.toFixed(3), color: "hsl(200,60%,60%)" },
            ].map(m => (
              <div key={m.label} className="bg-[hsla(210,10%,12%,0.6)] rounded-lg p-3 text-center">
                <div className="text-[8px] font-mono text-[hsl(210,10%,40%)] uppercase">{m.label}</div>
                <div className="text-[16px] font-mono mt-1" style={{ color: m.color }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Integrability ratio gauge */}
          <div className="bg-[hsla(210,10%,10%,0.5)] rounded-lg p-3">
            <div className="flex justify-between text-[9px] font-mono text-[hsl(210,10%,45%)] mb-1">
              <span>Integrability Ratio</span>
              <span style={{ color: "hsl(140,60%,55%)" }}>
                {(report.stats.integrableRatio * 100).toFixed(1)}%
              </span>
            </div>
            <div className="h-3 bg-[hsla(210,10%,15%,0.5)] rounded-full overflow-hidden flex">
              <div
                className="h-full rounded-l-full"
                style={{
                  width: `${report.stats.integrableRatio * 100}%`,
                  background: "hsl(140,60%,45%)",
                }}
              />
              <div
                className="h-full"
                style={{
                  width: `${(report.stats.boundaryCount / report.totalOrbits) * 100}%`,
                  background: "hsl(45,70%,45%)",
                }}
              />
              <div
                className="h-full rounded-r-full"
                style={{
                  width: `${(report.stats.nonIntegrableCount / report.totalOrbits) * 100}%`,
                  background: "hsl(0,50%,40%)",
                }}
              />
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 bg-[hsla(210,10%,12%,0.4)] rounded-md p-0.5 w-fit">
            {([["map", "Orbit Map"], ["detail", "Detail"], ["invariants", "Invariants"]] as const).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setView(k)}
                className={`px-3 py-1 rounded text-[10px] font-mono transition-colors ${
                  view === k
                    ? "bg-[hsla(38,50%,50%,0.2)] text-[hsl(38,50%,65%)]"
                    : "text-[hsl(210,10%,50%)] hover:text-[hsl(210,10%,70%)]"
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Orbit Map View */}
          {view === "map" && (
            <div className="space-y-3">
              <div className="text-[9px] font-mono text-[hsl(210,10%,45%)]">
                Each cell = one orbit O_λ. Click to inspect.
              </div>
              <div className="flex flex-wrap gap-1.5">
                {allResults.map(r => {
                  const isSelected = selected?.orbit.index === r.orbit.index;
                  return (
                    <button
                      key={r.orbit.index}
                      onClick={() => setSelected(r)}
                      className={`relative group w-10 h-10 rounded-md border transition-all flex items-center justify-center ${
                        isSelected ? "ring-2 ring-[hsl(38,50%,55%)]" : ""
                      }`}
                      style={{
                        borderColor: `${statusColor(r.status)}44`,
                        background: `${statusColor(r.status)}15`,
                      }}
                      title={r.orbit.label}
                    >
                      {/* Score fill */}
                      <div
                        className="absolute bottom-0 left-0 right-0 rounded-b-md transition-all"
                        style={{
                          height: `${r.integrabilityScore * 100}%`,
                          background: `${statusColor(r.status)}25`,
                        }}
                      />
                      <span className="relative text-[8px] font-mono" style={{ color: statusColor(r.status) }}>
                        {r.orbit.type === "zero" ? "0" :
                         r.orbit.type === "regular" ? "R" :
                         r.orbit.type === "minimal" ? "m" :
                         r.orbit.type === "subregular" ? "s" :
                         "σ"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex gap-4 text-[8px] font-mono text-[hsl(210,10%,45%)]">
                {[
                  ["R", "Regular"], ["s", "Subregular"], ["m", "Minimal"], ["σ", "Singular"], ["0", "Zero"],
                ].map(([sym, label]) => (
                  <span key={sym} className="flex items-center gap-1">
                    <span className="text-[hsl(38,50%,60%)]">{sym}</span> = {label}
                  </span>
                ))}
              </div>

              {/* Selected orbit detail */}
              {selected && (
                <div className="bg-[hsla(210,10%,10%,0.6)] border border-[hsla(210,15%,25%,0.4)] rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Atom size={14} style={{ color: statusColor(selected.status) }} />
                      <span className="text-[13px] font-mono" style={{ color: statusColor(selected.status) }}>
                        {selected.orbit.label}
                      </span>
                      <span className="text-[9px] font-mono text-[hsl(210,10%,45%)] bg-[hsla(210,10%,20%,0.5)] px-2 py-0.5 rounded">
                        {selected.orbit.type}
                      </span>
                    </div>
                    <span
                      className="text-[10px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1"
                      style={{
                        color: statusColor(selected.status),
                        background: `${statusColor(selected.status)}20`,
                      }}
                    >
                      {statusIcon(selected.status)} {selected.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[9px] font-mono">
                    <div>
                      <span className="text-[hsl(210,10%,40%)]">dim(O_λ)</span>
                      <span className="ml-2 text-[hsl(200,60%,60%)]">{selected.orbit.dimension}</span>
                    </div>
                    <div>
                      <span className="text-[hsl(210,10%,40%)]">dim(Stab)</span>
                      <span className="ml-2 text-[hsl(200,60%,60%)]">{selected.orbit.stabilizerDim}</span>
                    </div>
                    <div>
                      <span className="text-[hsl(210,10%,40%)]">Score</span>
                      <span className="ml-2" style={{ color: statusColor(selected.status) }}>
                        {selected.integrabilityScore.toFixed(4)}
                      </span>
                    </div>
                  </div>

                  {/* Three conditions */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Laplace L(λ)(x)", pass: selected.laplaceConverges, detail: `Z = ${selected.partitionZ.toExponential(2)}` },
                      { label: "Convexity Q̄", pass: selected.convexityHolds, detail: `|Q| = ${Math.sqrt(selected.geometricHeat.reduce((s, q) => s + q * q, 0)).toFixed(4)}` },
                      { label: "Fisher-Rao > 0", pass: selected.fisherRaoPositive, detail: `min(eig) = ${Math.min(...selected.fisherEigenvalues).toExponential(2)}` },
                    ].map(c => (
                      <div
                        key={c.label}
                        className="bg-[hsla(210,10%,8%,0.6)] rounded p-2 border"
                        style={{ borderColor: c.pass ? "hsla(140,60%,40%,0.3)" : "hsla(0,60%,40%,0.3)" }}
                      >
                        <div className="flex items-center gap-1 text-[9px] font-mono mb-1"
                          style={{ color: c.pass ? "hsl(140,60%,55%)" : "hsl(0,60%,55%)" }}
                        >
                          {c.pass ? <CheckCircle size={9} /> : <XCircle size={9} />} {c.label}
                        </div>
                        <div className="text-[8px] font-mono text-[hsl(210,10%,45%)]">{c.detail}</div>
                      </div>
                    ))}
                  </div>

                  {/* Fisher eigenvalue bars */}
                  <div>
                    <div className="text-[8px] font-mono text-[hsl(210,10%,40%)] mb-1">Fisher-Rao Eigenvalues (per Cartan direction)</div>
                    <div className="grid grid-cols-8 gap-1">
                      {selected.fisherEigenvalues.map((ev, i) => {
                        const maxEv = Math.max(...selected.fisherEigenvalues, 0.001);
                        const barH = Math.min(100, (ev / maxEv) * 100);
                        return (
                          <div key={i} className="flex flex-col items-center gap-0.5">
                            <div className="w-full h-8 bg-[hsla(210,10%,12%,0.5)] rounded-sm overflow-hidden flex items-end">
                              <div
                                className="w-full rounded-t-sm transition-all"
                                style={{
                                  height: `${barH}%`,
                                  background: ev > 1e-10 ? "hsl(140,60%,50%)" : "hsl(0,50%,40%)",
                                }}
                              />
                            </div>
                            <span className="text-[6px] font-mono text-[hsl(210,10%,40%)]">
                              {ev.toFixed(3)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Weight vector */}
                  <div className="text-[8px] font-mono text-[hsl(210,10%,40%)]">
                    λ = [{selected.orbit.weight.join(", ")}] &nbsp;|&nbsp; S_Casimir = {selected.casimirEntropy.toFixed(4)} nats
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Detail View (table) */}
          {view === "detail" && (
            <div className="overflow-x-auto">
              <table className="w-full text-[9px] font-mono">
                <thead>
                  <tr className="text-[hsl(210,10%,40%)] border-b border-[hsla(210,10%,25%,0.3)]">
                    <th className="text-left py-1 px-2">#</th>
                    <th className="text-left py-1 px-2">Orbit</th>
                    <th className="text-left py-1 px-2">Type</th>
                    <th className="text-left py-1 px-2">Dim</th>
                    <th className="text-center py-1 px-2">Laplace</th>
                    <th className="text-center py-1 px-2">Convex</th>
                    <th className="text-center py-1 px-2">Fisher</th>
                    <th className="text-left py-1 px-2">Score</th>
                    <th className="text-left py-1 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allResults.map(r => (
                    <tr
                      key={r.orbit.index}
                      className="border-b border-[hsla(210,10%,15%,0.3)] hover:bg-[hsla(210,10%,15%,0.2)] cursor-pointer"
                      onClick={() => { setSelected(r); setView("map"); }}
                    >
                      <td className="py-1.5 px-2 text-[hsl(210,10%,40%)]">{r.orbit.index}</td>
                      <td className="py-1.5 px-2 text-[hsl(200,60%,60%)]">{r.orbit.label}</td>
                      <td className="py-1.5 px-2 text-[hsl(210,10%,55%)]">{r.orbit.type}</td>
                      <td className="py-1.5 px-2 text-[hsl(280,50%,60%)]">{r.orbit.dimension}</td>
                      <td className="py-1.5 px-2 text-center">{r.laplaceConverges ? "✓" : "✗"}</td>
                      <td className="py-1.5 px-2 text-center">{r.convexityHolds ? "✓" : "✗"}</td>
                      <td className="py-1.5 px-2 text-center">{r.fisherRaoPositive ? "✓" : "✗"}</td>
                      <td className="py-1.5 px-2">
                        <div className="flex items-center gap-1">
                          <div className="w-12 h-1.5 bg-[hsla(210,10%,15%,0.5)] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${r.integrabilityScore * 100}%`,
                                background: statusColor(r.status),
                              }}
                            />
                          </div>
                          <span style={{ color: statusColor(r.status) }}>{r.integrabilityScore.toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="py-1.5 px-2">
                        <span className="flex items-center gap-1" style={{ color: statusColor(r.status) }}>
                          {statusIcon(r.status)} {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Invariants View */}
          {view === "invariants" && (
            <div className="space-y-2">
              <div className="text-[10px] font-mono text-[hsl(210,10%,45%)] mb-2 flex items-center gap-2">
                <Activity size={12} /> Structural Invariants of the Classification
              </div>
              {report.invariants.map((inv, i) => (
                <div
                  key={i}
                  className="bg-[hsla(210,10%,10%,0.5)] border rounded-lg p-3"
                  style={{ borderColor: inv.holds ? "hsla(140,50%,30%,0.4)" : "hsla(0,50%,30%,0.4)" }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {inv.holds
                      ? <CheckCircle size={12} className="text-[hsl(140,60%,55%)]" />
                      : <XCircle size={12} className="text-[hsl(0,60%,55%)]" />
                    }
                    <span className="text-[11px] font-mono" style={{ color: inv.holds ? "hsl(140,60%,55%)" : "hsl(0,60%,55%)" }}>
                      {inv.name}
                    </span>
                  </div>
                  <p className="text-[9px] font-mono text-[hsl(210,10%,50%)] ml-5">{inv.description}</p>
                  <p className="text-[8px] font-mono text-[hsl(210,10%,40%)] ml-5 mt-1 italic">{inv.evidence}</p>
                </div>
              ))}

              {/* Formula reference */}
              <div className="mt-4 pt-3 border-t border-[hsla(210,10%,20%,0.3)] text-[9px] font-mono text-[hsl(210,10%,45%)] leading-relaxed space-y-1">
                <div><span className="text-[hsl(38,50%,60%)]">Neeb (2000):</span> O_λ integrable ⟺ L(λ)(x) = ∫ e^{"{-⟨α,x⟩}"} dμ {"<"} ∞ for x ∈ Ω_λ</div>
                <div><span className="text-[hsl(38,50%,60%)]">Convexity:</span> Q̄: Ω_λ/z(g) → conv(O_λ)° is a C^∞ diffeomorphism</div>
                <div><span className="text-[hsl(38,50%,60%)]">Metric:</span> g_ij = ∂²(log Z)/∂β_i∂β_j = Var_λ(Ψ_i, Ψ_j) {">"} 0 (positive definite)</div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
