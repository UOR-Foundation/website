/**
 * Geometric Qubit Emulator Panel
 * ═══════════════════════════════
 *
 * Interactive projection of topological qubits from the Atlas geometric substrate.
 * Implements Souriau's program: "Quantique? Alors c'est Géométrique."
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  projectQubit,
  projectRegister,
  applyGate,
  measureQubit,
  blochProjection,
  executeBraid,
  computeEntanglementEntropy,
  runGeometricQuantizationVerification,
  HBAR_ATLAS,
  type QubitState,
  type QuantumRegister,
  type GateOperation,
  type BlochCoordinates,
  type BraidingResult,
  type Complex,
} from "@/modules/atlas/geometric-quantization";

// ── Bloch Sphere Canvas ───────────────────────────────────────────────────

function BlochSphere({ coords, size = 140 }: { coords: BlochCoordinates; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.38;

    ctx.clearRect(0, 0, size, size);

    // Sphere outline
    ctx.strokeStyle = "hsla(210, 10%, 35%, 0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.stroke();

    // Equator (ellipse)
    ctx.strokeStyle = "hsla(210, 10%, 30%, 0.4)";
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.3, 0, 0, 2 * Math.PI);
    ctx.stroke();

    // Vertical axis
    ctx.strokeStyle = "hsla(210, 10%, 30%, 0.4)";
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy + r);
    ctx.stroke();

    // Labels
    ctx.fillStyle = "hsl(200, 60%, 55%)";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("|0⟩", cx, cy - r - 6);
    ctx.fillText("|1⟩", cx, cy + r + 12);

    // State vector point
    const px = cx + coords.x * r;
    const py = cy - coords.z * r; // z is up
    const pSize = 5;

    // Line from center to point
    ctx.strokeStyle = "hsla(280, 60%, 65%, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(px, py);
    ctx.stroke();

    // Point
    ctx.fillStyle = "hsl(280, 60%, 65%)";
    ctx.beginPath();
    ctx.arc(px, py, pSize, 0, 2 * Math.PI);
    ctx.fill();

    // Shadow on equator
    const sx = cx + coords.x * r;
    const sy = cy;
    ctx.fillStyle = "hsla(280, 40%, 50%, 0.3)";
    ctx.beginPath();
    ctx.arc(sx, sy, 2, 0, 2 * Math.PI);
    ctx.fill();
  }, [coords, size]);

  return <canvas ref={canvasRef} width={size} height={size} className="block" />;
}

// ── Main Panel ────────────────────────────────────────────────────────────

export default function GeometricQubitPanel() {
  const [nQubits, setNQubits] = useState(2);
  const [register, setRegister] = useState<QuantumRegister | null>(null);
  const [history, setHistory] = useState<GateOperation[]>([]);
  const [measurements, setMeasurements] = useState<{ qubit: number; outcome: number }[]>([]);
  const [showVerification, setShowVerification] = useState(false);
  const [verification, setVerification] = useState<ReturnType<typeof runGeometricQuantizationVerification> | null>(null);

  // Initialize register
  const initRegister = useCallback((n: number) => {
    const indices = Array.from({ length: n }, (_, i) => i);
    const reg = projectRegister(indices);
    setRegister(reg);
    setHistory([]);
    setMeasurements([]);
  }, []);

  useEffect(() => { initRegister(nQubits); }, [nQubits, initRegister]);

  const handleGate = useCallback((gate: string, target: number, control?: number) => {
    if (!register) return;
    const { register: newReg, operation } = applyGate(register, gate, target, control);
    setRegister(newReg);
    setHistory(h => [...h, operation]);
  }, [register]);

  const handleMeasure = useCallback((qubitIdx: number) => {
    if (!register) return;
    const result = measureQubit(register, qubitIdx);
    setRegister(result.postState);
    setMeasurements(m => [...m, { qubit: qubitIdx, outcome: result.outcome }]);
  }, [register]);

  const handleVerify = useCallback(() => {
    if (!verification) {
      setVerification(runGeometricQuantizationVerification());
    }
    setShowVerification(v => !v);
  }, [verification]);

  if (!register) return null;

  const blochCoords = register.qubits.map(q => {
    // Compute single-qubit reduced state for Bloch sphere
    const n = register.nQubits;
    const idx = q.index;
    let p0 = 0;
    let p1 = 0;
    const dim = 1 << n;
    for (let s = 0; s < dim; s++) {
      const bit = (s >> (n - 1 - idx)) & 1;
      const amp2 = q.alpha.re ** 2 + q.alpha.im ** 2; // fallback
      if (bit === 0) p0 += register.amplitudes[s].re ** 2 + register.amplitudes[s].im ** 2;
      else p1 += register.amplitudes[s].re ** 2 + register.amplitudes[s].im ** 2;
    }
    const theta = 2 * Math.acos(Math.min(1, Math.sqrt(Math.max(0, p0))));
    return {
      theta,
      phi: q.geometricPhase,
      x: Math.sin(theta) * Math.cos(q.geometricPhase),
      y: Math.sin(theta) * Math.sin(q.geometricPhase),
      z: Math.cos(theta),
    } as BlochCoordinates;
  });

  const passedTests = verification?.tests.filter(t => t.holds).length ?? 0;
  const totalTests = verification?.tests.length ?? 0;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-mono tracking-wide text-[hsl(280,60%,65%)]">
            Geometric Qubit Emulator
          </h2>
          <p className="text-[11px] font-mono text-[hsl(210,10%,50%)] mt-0.5">
            Souriau's geometric quantization — qubits projected from Atlas mirror pairs, gates via braiding
          </p>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(n => (
            <button
              key={n}
              onClick={() => setNQubits(n)}
              className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                n === nQubits
                  ? "bg-[hsl(280,50%,45%)] text-white"
                  : "bg-[hsla(210,10%,20%,0.3)] text-[hsl(210,10%,55%)] hover:bg-[hsla(210,10%,25%,0.3)]"
              }`}
            >
              {n}Q
            </button>
          ))}
          <button
            onClick={() => initRegister(nQubits)}
            className="px-2 py-1 rounded text-[10px] font-mono bg-[hsla(210,10%,20%,0.3)] text-[hsl(210,10%,55%)] hover:bg-[hsla(210,10%,25%,0.3)]"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Souriau quote */}
      <div className="bg-[hsla(280,20%,12%,0.3)] border border-[hsla(280,20%,25%,0.3)] rounded-lg px-4 py-3">
        <p className="text-[10px] font-mono text-[hsl(280,30%,65%)] italic leading-relaxed">
          "Quantique? Alors c'est Géométrique." — J.M. Souriau (2003)
        </p>
        <p className="text-[9px] font-mono text-[hsl(210,10%,45%)] mt-1">
          Quantum states are sections of the prequantization line bundle over the Atlas symplectic manifold.
          Gates are holonomies of the connection. Measurement is projection onto Lagrangian leaves.
          ℏ_Atlas = 1/{8} = 1/(sign classes). Classical and quantum coexist — Landau-Lifshitz.
        </p>
      </div>

      {/* Qubit states + Bloch spheres */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {register.qubits.map((q, i) => (
          <div key={i} className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-mono text-[hsl(280,50%,60%)]">
                Q{i} — pair ({q.vertex0}, {q.vertex1})
              </div>
              <div className="text-[8px] font-mono text-[hsl(210,10%,40%)]">
                SC{q.signClass}
              </div>
            </div>

            <div className="flex justify-center mb-2">
              <BlochSphere coords={blochCoords[i]} size={120} />
            </div>

            <div className="grid grid-cols-2 gap-1 text-[8px] font-mono">
              <div className="bg-[hsla(210,10%,8%,0.5)] rounded px-2 py-1">
                <span className="text-[hsl(210,10%,40%)]">θ=</span>
                <span className="text-[hsl(200,60%,55%)]">{(blochCoords[i].theta * 180 / Math.PI).toFixed(1)}°</span>
              </div>
              <div className="bg-[hsla(210,10%,8%,0.5)] rounded px-2 py-1">
                <span className="text-[hsl(210,10%,40%)]">φ=</span>
                <span className="text-[hsl(160,60%,50%)]">{(blochCoords[i].phi * 180 / Math.PI).toFixed(1)}°</span>
              </div>
            </div>

            {/* Gate buttons */}
            <div className="flex gap-1 mt-2 flex-wrap">
              {["X", "Y", "Z", "H", "S", "T"].map(gate => (
                <button
                  key={gate}
                  onClick={() => handleGate(gate, i)}
                  className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[hsla(280,30%,20%,0.4)] text-[hsl(280,40%,65%)] hover:bg-[hsla(280,30%,30%,0.5)] transition-colors"
                >
                  {gate}
                </button>
              ))}
              <button
                onClick={() => handleMeasure(i)}
                className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[hsla(30,30%,20%,0.4)] text-[hsl(30,70%,55%)] hover:bg-[hsla(30,30%,30%,0.5)] transition-colors"
              >
                M
              </button>
            </div>

            {/* CNOT controls (for multi-qubit) */}
            {nQubits > 1 && (
              <div className="flex gap-1 mt-1">
                {register.qubits.map((_, j) => j !== i && (
                  <button
                    key={`cnot-${j}`}
                    onClick={() => handleGate("CNOT", i, j)}
                    className="px-1 py-0.5 rounded text-[8px] font-mono bg-[hsla(140,30%,20%,0.3)] text-[hsl(140,50%,55%)] hover:bg-[hsla(140,30%,25%,0.4)] transition-colors"
                  >
                    CX←Q{j}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* State vector + entanglement */}
      <div className="grid grid-cols-2 gap-3">
        {/* State vector */}
        <div className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-4">
          <div className="text-[9px] font-mono text-[hsl(210,10%,45%)] uppercase mb-2">State Vector |ψ⟩</div>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {register.amplitudes.map((amp, idx) => {
              const prob = amp.re ** 2 + amp.im ** 2;
              if (prob < 1e-6) return null;
              const label = idx.toString(2).padStart(nQubits, "0");
              return (
                <div key={idx} className="flex items-center gap-2 text-[10px] font-mono">
                  <span className="text-[hsl(280,50%,60%)] w-10">|{label}⟩</span>
                  <div className="flex-1 h-3 bg-[hsla(210,10%,8%,0.5)] rounded overflow-hidden">
                    <div
                      className="h-full rounded"
                      style={{
                        width: `${prob * 100}%`,
                        background: `hsl(${280 - idx * 40}, 50%, 55%)`,
                      }}
                    />
                  </div>
                  <span className="text-[hsl(210,10%,55%)] w-16 text-right">
                    {(prob * 100).toFixed(1)}%
                  </span>
                  <span className="text-[hsl(210,10%,40%)] w-24 text-right text-[8px]">
                    ({amp.re >= 0 ? "+" : ""}{amp.re.toFixed(3)}{amp.im >= 0 ? "+" : ""}{amp.im.toFixed(3)}i)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Entanglement + metrics */}
        <div className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-4">
          <div className="text-[9px] font-mono text-[hsl(210,10%,45%)] uppercase mb-2">Quantum Metrics</div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Entanglement", value: `${register.entanglementEntropy.toFixed(4)} bits`, color: register.entanglementEntropy > 0.5 ? "hsl(140,60%,55%)" : "hsl(210,10%,55%)" },
              { label: "Total Phase", value: `${register.totalPhase.toFixed(3)} rad`, color: "hsl(280,50%,60%)" },
              { label: "ℏ_Atlas", value: String(HBAR_ATLAS), color: "hsl(200,60%,55%)" },
              { label: "Gates Applied", value: String(history.length), color: "hsl(30,70%,55%)" },
              { label: "Measurements", value: String(measurements.length), color: "hsl(50,80%,55%)" },
              { label: "Dim(H)", value: String(1 << nQubits), color: "hsl(160,60%,50%)" },
            ].map(m => (
              <div key={m.label} className="bg-[hsla(210,10%,8%,0.5)] rounded p-2">
                <div className="text-[7px] font-mono text-[hsl(210,10%,40%)] uppercase">{m.label}</div>
                <div className="text-[12px] font-mono mt-0.5" style={{ color: m.color }}>{m.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gate history */}
      {history.length > 0 && (
        <div className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-4">
          <div className="text-[9px] font-mono text-[hsl(210,10%,45%)] uppercase mb-2">
            Circuit History — {history.length} operations
          </div>
          <div className="flex gap-1 flex-wrap">
            {history.map((op, i) => (
              <div key={i} className={`px-2 py-1 rounded text-[9px] font-mono ${
                op.type === "cnot"
                  ? "bg-[hsla(140,30%,15%,0.3)] text-[hsl(140,50%,55%)]"
                  : "bg-[hsla(280,20%,15%,0.3)] text-[hsl(280,40%,65%)]"
              }`}>
                {op.gate}(Q{op.targetQubit}{op.controlQubit !== undefined ? `,Q${op.controlQubit}` : ""})
                <span className="text-[hsl(210,10%,40%)] ml-1">
                  {op.braiding.statistics === "anyon" ? "∠" : op.braiding.statistics === "fermion" ? "−" : "+"}
                </span>
              </div>
            ))}
            {measurements.map((m, i) => (
              <div key={`m${i}`} className="px-2 py-1 rounded text-[9px] font-mono bg-[hsla(30,20%,15%,0.3)] text-[hsl(30,70%,55%)]">
                M(Q{m.qubit})→{m.outcome}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Particle Statistics */}
      <div className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-4">
        <div className="text-[9px] font-mono text-[hsl(30,70%,55%)] uppercase mb-2">
          Emergent Particle Statistics — Braiding Phase → Boson / Fermion / Anyon
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              type: "Boson",
              phase: "0 mod 2π",
              desc: "Symmetric under exchange. Trivial braiding representation. Emerge from Atlas paths with zero net symplectic area.",
              color: "hsl(200,60%,55%)",
              symbol: "γ",
            },
            {
              type: "Fermion",
              phase: "π mod 2π",
              desc: "Antisymmetric (sign flip). 4π = 720° for identity. Emerge from paths crossing odd sign class boundaries.",
              color: "hsl(30,70%,55%)",
              symbol: "ψ",
            },
            {
              type: "Anyon",
              phase: "θ ∈ (0,π)",
              desc: "Fractional statistics. Neither symmetric nor antisymmetric. The general case: bosons and fermions are limiting cases of anyons.",
              color: "hsl(280,50%,60%)",
              symbol: "σ",
            },
          ].map(p => (
            <div key={p.type} className="bg-[hsla(210,10%,8%,0.5)] rounded p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[14px] font-mono" style={{ color: p.color }}>{p.symbol}</span>
                <span className="text-[11px] font-mono" style={{ color: p.color }}>{p.type}</span>
              </div>
              <div className="text-[9px] font-mono text-[hsl(210,10%,50%)] mb-1">Phase: {p.phase}</div>
              <p className="text-[8px] font-mono text-[hsl(210,10%,45%)] leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Thesis */}
      <div className="bg-[hsla(280,20%,12%,0.3)] border border-[hsla(280,20%,25%,0.3)] rounded-lg p-5">
        <div className="text-[10px] font-mono text-[hsl(280,50%,60%)] uppercase mb-2">
          Geometric Quantization Thesis
        </div>
        <p className="text-[11px] font-mono text-[hsl(280,20%,70%)] leading-relaxed">
          Following Souriau (1970–2003) and Landau-Lifshitz: quantum and classical mechanics
          COEXIST, they do not succeed each other. The Atlas graph is a discrete symplectic
          manifold. Its adjacency encodes the symplectic 2-form ω. The mirror involution τ
          defines a real polarization. The 48 mirror pairs project exactly 48 topological
          qubits — sections of the prequantization line bundle constant along τ-leaves.
          Quantum gates are holonomies of the connection ∇ along braiding paths.
          Particle statistics (boson/fermion/anyon) emerge from the sign class structure
          of these paths. This is not simulation — the Atlas IS the quantum computer,
          and classical reality is its thermodynamic projection.
        </p>
      </div>

      {/* Verification */}
      <div className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-mono text-[hsl(210,10%,45%)] uppercase">
            Verification — Souriau's Program
          </div>
          <button
            onClick={handleVerify}
            className="text-[9px] font-mono text-[hsl(210,10%,50%)] hover:text-[hsl(210,10%,70%)] px-2 py-0.5 rounded bg-[hsla(210,10%,20%,0.3)]"
          >
            {showVerification ? "Hide" : "Run"} verification ({passedTests}/{totalTests})
          </button>
        </div>

        {showVerification && verification && (
          <div className="space-y-1 mt-3">
            {verification.tests.map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] font-mono">
                <span className={t.holds ? "text-[hsl(140,60%,55%)]" : "text-[hsl(0,60%,55%)]"}>
                  {t.holds ? "✓" : "✗"}
                </span>
                <span className="flex-1 text-[hsl(210,10%,60%)]">{t.name}</span>
                <span className="text-[hsl(210,10%,40%)] text-[9px]">{t.actual}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
