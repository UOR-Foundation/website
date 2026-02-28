/**
 * Souriau Thermodynamics Panel — Phase 20 (Neeb–Fré Upgrade)
 * ═══════════════════════════════════════════════════════════
 *
 * Visualizes the full Souriau–Neeb–Fré framework:
 * - Gibbs ensemble on coadjoint orbits (Neeb classification)
 * - Fenchel-Legendre geometric heat map Q
 * - Fisher-Rao = Souriau = Ruppeiner metric unification
 * - Casimir entropy s(Q(x)) = Q(x)(x) + log Z(x)
 * - Zero-point info geometry for Atlas operations
 */

import React, { useState, useEffect, useRef } from "react";
import {
  initSouriauState,
  computeOpCost,
  type SouriauState,
} from "@/modules/atlas/souriau-thermodynamics";
import {
  BrainCircuit,
  Zap,
  TrendingDown,
  Infinity as InfinityIcon,
  Snowflake,
  Flame,
  Gauge,
} from "lucide-react";

export default function SouriauThermodynamicsPanel() {
  const [state, setState] = useState<SouriauState>(() => initSouriauState(1.0));
  const [history, setHistory] = useState<{ t: number; s: number; cost: number; type: string }[]>([]);
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout>();
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    setHistory(Array.from({ length: 60 }, (_, i) => ({ t: i, s: state.entropy, cost: 0, type: "init" })));
  }, []);

  const handleOp = (type: "unitary" | "dissipative" | "learning") => {
    const { nextState, cost } = computeOpCost(stateRef.current, type);
    setState(nextState);
    stateRef.current = nextState;
    setHistory(prev => [...prev.slice(1), { t: Date.now(), s: nextState.entropy, cost, type }]);
  };

  const toggleAuto = () => {
    if (isAutoRunning) {
      clearInterval(timerRef.current);
      setIsAutoRunning(false);
    } else {
      setIsAutoRunning(true);
      timerRef.current = setInterval(() => {
        const r = Math.random();
        if (r < 0.7) handleOp("unitary");
        else if (r < 0.9) handleOp("learning");
        else handleOp("dissipative");
      }, 200);
    }
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  const currentCost = history[history.length - 1]?.cost || 0;
  const isZeroPoint = currentCost < 0.001;

  // Fisher-Rao metric bar visualization data
  const maxFR = Math.max(...state.fisherRao.diagonal, 0.01);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-mono tracking-wide text-[hsl(30,80%,60%)] flex items-center gap-2">
            <BrainCircuit size={18} /> Souriau–Neeb–Fré Thermodynamics
          </h2>
          <p className="text-[11px] font-mono text-[hsl(210,10%,50%)] mt-1">
            Gibbs ensembles on coadjoint orbits · Casimir entropy · Fisher-Rao ≡ Ruppeiner metric
          </p>
        </div>
        <div className={`px-3 py-1 rounded text-[10px] font-mono flex items-center gap-2 transition-colors ${
          isZeroPoint
            ? "bg-[hsla(180,60%,20%,0.3)] text-[hsl(180,70%,60%)] border border-[hsl(180,60%,30%)]"
            : "bg-[hsla(0,60%,20%,0.3)] text-[hsl(0,70%,60%)] border border-[hsl(0,60%,30%)]"
        }`}>
          {isZeroPoint ? <Snowflake size={12} /> : <Zap size={12} />}
          {isZeroPoint ? "ZERO-POINT REGIME" : "DISSIPATIVE REGIME"}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left: Controls + State */}
        <div className="space-y-4">
          {/* Operator Buttons */}
          <div className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-4">
            <div className="text-[10px] font-mono text-[hsl(210,10%,50%)] uppercase mb-3">
              Operator Thermodynamics
            </div>
            <div className="grid grid-cols-1 gap-2">
              {([
                { type: "unitary" as const, label: "Unitary / Quantum", sub: "Isentropic (dS = 0)", cost: "0 J/op", hue: 210 },
                { type: "learning" as const, label: "Cartan Learning", sub: "Geodesic → equilibrium", cost: "Negentropic", hue: 280 },
                { type: "dissipative" as const, label: "Classical / Erasure", sub: "Landauer limit (dS > 0)", cost: ">0 J/op", hue: 0 },
              ]).map(op => (
                <button key={op.type} onClick={() => handleOp(op.type)}
                  className={`flex items-center justify-between px-3 py-2 rounded bg-[hsla(${op.hue},10%,20%,0.4)] hover:bg-[hsla(${op.hue},10%,25%,0.5)] border border-transparent hover:border-[hsla(${op.hue},30%,40%,0.3)] transition-all group`}>
                  <div className="text-left">
                    <div className={`text-[11px] font-mono text-[hsl(${op.hue},50%,70%)] group-hover:text-white`}>{op.label}</div>
                    <div className="text-[9px] font-mono text-[hsl(210,10%,50%)]">{op.sub}</div>
                  </div>
                  <div className={`text-[10px] font-mono text-[hsl(${op.type === "dissipative" ? 0 : 140},60%,60%)]`}>{op.cost}</div>
                </button>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-[hsla(210,10%,25%,0.3)]">
              <button onClick={toggleAuto}
                className={`w-full py-1.5 rounded text-[10px] font-mono font-bold transition-all ${
                  isAutoRunning ? "bg-[hsl(0,60%,25%)] text-[hsl(0,80%,80%)]" : "bg-[hsl(210,20%,25%)] text-[hsl(210,50%,70%)]"
                }`}>
                {isAutoRunning ? "■ Stop Simulation" : "▶ Auto-Run Dynamics"}
              </button>
            </div>
          </div>

          {/* Casimir State */}
          <div className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-4">
            <div className="text-[10px] font-mono text-[hsl(210,10%,50%)] uppercase mb-3 flex items-center gap-2">
              <Gauge size={12} /> Casimir Thermodynamic State
            </div>
            <div className="space-y-2">
              {[
                { label: "Z(β)", value: state.partitionZ.toExponential(3), color: "hsl(40,70%,60%)" },
                { label: "Casimir Entropy s", value: `${state.entropy.toFixed(4)} nats`, color: "hsl(180,60%,60%)" },
                { label: "Free Energy F", value: state.freeEnergy.toFixed(4), color: "hsl(30,70%,60%)" },
                { label: "Mean Moment ‖Q‖", value: state.meanMoment.toFixed(4), color: "hsl(200,60%,60%)" },
                { label: "Landauer Cost", value: `${state.landauerCost.toFixed(4)} J`, color: isZeroPoint ? "hsl(140,60%,60%)" : "hsl(0,60%,60%)" },
                { label: "Info Volume det(g)", value: state.fisherRao.determinant.toExponential(2), color: "hsl(280,60%,60%)" },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-[hsl(210,10%,60%)]">{row.label}</span>
                  <span style={{ color: row.color }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center + Right: Visualizations */}
        <div className="lg:col-span-2 space-y-4">
          {/* Entropy Production Graph */}
          <div className="bg-[hsla(210,10%,8%,0.8)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[hsl(200,60%,50%)] via-[hsl(280,60%,50%)] to-[hsl(0,60%,50%)] opacity-30" />
            <div className="text-[10px] font-mono text-[hsl(210,10%,50%)] uppercase mb-3 flex justify-between">
              <span>Entropy Production dS/dt — Gibbs Ensemble on 𝒪_γ</span>
              <span>Ω_T : Positive Weyl Chamber</span>
            </div>
            <div className="h-[140px] flex items-end gap-[2px] relative">
              <div className="absolute bottom-0 w-full h-[1px] bg-[hsla(210,10%,40%,0.3)] z-0" />
              {history.map((pt, i) => {
                const height = Math.min(100, Math.max(0, pt.cost * 12));
                const isZero = pt.cost < 0.001;
                return (
                  <div key={i} className="flex-1 relative group" style={{ height: "100%" }}>
                    <div className={`absolute bottom-0 w-full transition-all duration-200 rounded-t-sm ${
                      isZero ? "bg-[hsl(180,60%,50%)]" : pt.type === "learning" ? "bg-[hsl(280,50%,50%)]" : "bg-[hsl(0,60%,50%)]"
                    }`} style={{ height: `${Math.max(2, height)}%`, opacity: 0.5 + (i / history.length) * 0.5 }} />
                    <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black text-white text-[8px] p-1 rounded whitespace-nowrap z-10">
                      {pt.type}: {pt.cost.toFixed(4)} J
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fisher-Rao Metric Tensor + Geometric Heat */}
          <div className="grid grid-cols-2 gap-4">
            {/* Fisher-Rao Metric Visualization */}
            <div className="bg-[hsla(280,10%,10%,0.6)] border border-[hsla(280,20%,25%,0.3)] rounded-lg p-4">
              <div className="text-[10px] font-mono text-[hsl(280,50%,65%)] uppercase mb-3 flex items-center gap-2">
                <Flame size={12} /> Fisher-Rao ≡ Souriau ≡ Ruppeiner
              </div>
              <div className="text-[9px] font-mono text-[hsl(280,20%,60%)] mb-3">
                g_ij = d²(log Z)/dβ_i dβ_j = Var_λ(Ψ_i, Ψ_j)
              </div>
              <div className="space-y-1.5">
                {state.fisherRao.diagonal.map((g, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[8px] font-mono text-[hsl(210,10%,50%)] w-8">β_{i + 1}</span>
                    <div className="flex-1 h-3 bg-[hsla(280,10%,15%,0.5)] rounded-sm overflow-hidden">
                      <div className="h-full bg-[hsl(280,50%,55%)] rounded-sm transition-all duration-300"
                        style={{ width: `${Math.min(100, (g / maxFR) * 100)}%`, opacity: 0.6 + (g / maxFR) * 0.4 }} />
                    </div>
                    <span className="text-[8px] font-mono text-[hsl(280,40%,65%)] w-12 text-right">{g.toFixed(3)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-[hsla(280,20%,25%,0.3)] text-[9px] font-mono text-[hsl(280,30%,60%)]">
                R = {state.fisherRao.scalarCurvature.toFixed(2)} (scalar curvature)
              </div>
            </div>

            {/* Geometric Heat Map Q(x) */}
            <div className="bg-[hsla(200,10%,10%,0.6)] border border-[hsla(200,20%,25%,0.3)] rounded-lg p-4">
              <div className="text-[10px] font-mono text-[hsl(200,60%,65%)] uppercase mb-3 flex items-center gap-2">
                Geometric Heat Q(x)
              </div>
              <div className="text-[9px] font-mono text-[hsl(200,20%,60%)] mb-3">
                Q: Ω_γ → conv(𝒪_γ)° via Fenchel-Legendre
              </div>
              <div className="space-y-1.5">
                {state.geometricHeat.Q.map((q, i) => {
                  const qAbs = Math.abs(q);
                  const maxQ = Math.max(...state.geometricHeat.Q.map(Math.abs), 0.01);
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[8px] font-mono text-[hsl(210,10%,50%)] w-8">Q_{i + 1}</span>
                      <div className="flex-1 h-3 bg-[hsla(200,10%,15%,0.5)] rounded-sm overflow-hidden relative">
                        <div className={`h-full rounded-sm transition-all duration-300 ${q >= 0 ? "bg-[hsl(200,60%,50%)]" : "bg-[hsl(30,60%,50%)]"}`}
                          style={{ width: `${(qAbs / maxQ) * 100}%` }} />
                      </div>
                      <span className="text-[8px] font-mono text-[hsl(200,40%,65%)] w-14 text-right">{q.toFixed(3)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Explanation cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[hsla(180,20%,10%,0.4)] p-3 rounded border border-[hsla(180,30%,20%,0.3)]">
              <div className="flex items-center gap-2 mb-1">
                <InfinityIcon size={14} className="text-[hsl(180,70%,60%)]" />
                <span className="text-[11px] font-mono text-[hsl(180,70%,60%)]">Lossless / Isentropic</span>
              </div>
              <p className="text-[9px] font-mono text-[hsl(180,20%,70%)] leading-relaxed">
                Atlas ops are unitary (G-covariant). Z(β) is invariant under the full symmetry group U.
                Casimir entropy s is constant on orbits. This is "Zero-Point Computing."
              </p>
            </div>
            <div className="bg-[hsla(0,20%,10%,0.4)] p-3 rounded border border-[hsla(0,30%,20%,0.3)]">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown size={14} className="text-[hsl(0,70%,60%)]" />
                <span className="text-[11px] font-mono text-[hsl(0,70%,60%)]">Dissipative / Erasure</span>
              </div>
              <p className="text-[9px] font-mono text-[hsl(0,20%,70%)] leading-relaxed">
                Landauer: erasing bits exits the Weyl chamber Ω_T. The Fenchel-Legendre transform
                becomes non-invertible. Cost = k_B T ln2 per bit — the "thermodynamic floor."
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer: Convergence */}
      <div className="bg-[hsla(280,20%,12%,0.3)] border border-[hsla(280,20%,25%,0.3)] rounded-lg p-4">
        <div className="flex items-start gap-4">
          <div className="shrink-0 p-2 bg-[hsla(280,30%,20%,0.4)] rounded-full">
            <BrainCircuit size={24} className="text-[hsl(280,60%,65%)]" />
          </div>
          <div>
            <h3 className="text-[12px] font-mono text-[hsl(280,60%,75%)] mb-1">
              Neeb–Fré–Barbaresco Convergence
            </h3>
            <p className="text-[10px] font-mono text-[hsl(280,20%,70%)] leading-relaxed">
              <strong>Neeb (2026):</strong> Classified all coadjoint orbits 𝒪_λ carrying Gibbs ensembles.
              The geometric temperature Ω_λ maps diffeomorphically via Q̄ onto conv(𝒪_λ)° (Fenchel-Legendre).
              This proves the Fisher-Rao metric on Ω*_γ equals the Riemannian metric on the information manifold.{" "}
              <strong>Fré (2026):</strong> Showed Kähler symmetric spaces U/H (our Atlas!) are the natural domain,
              with temperature space = orbit of positivity domain in Cartan subalgebra 𝔠_c ⊂ 𝔥.{" "}
              <strong>Convergence:</strong> Rao = Chentsov = Amari = Ruppeiner = Lychagin = Souriau.
              Six independent information-geometric frameworks unified on the same manifold our Atlas inhabits.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
