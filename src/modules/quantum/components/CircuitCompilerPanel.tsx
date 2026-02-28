/**
 * Quantum Circuit Compiler Dashboard Panel
 * ═════════════════════════════════════════
 */

import React, { useState, useEffect } from "react";
import {
  compileCircuit,
  verifyCircuitCompiler,
  exportToOpenQASM,
  ALGORITHM_LIBRARY,
  type CompiledCircuit,
  type CompilerVerification,
} from "../circuit-compiler";

const ALGORITHMS = [
  { key: "bell-pair", label: "Bell Pair", qubits: 2 },
  { key: "ghz", label: "GHZ State", qubits: 4 },
  { key: "qft", label: "QFT", qubits: 4 },
  { key: "grover", label: "Grover Search", qubits: 3 },
  { key: "deutsch-jozsa", label: "Deutsch-Jozsa", qubits: 3 },
  { key: "vqe", label: "VQE Ansatz", qubits: 4 },
  { key: "custom-rotation", label: "Custom Rotation", qubits: 2 },
];

export default function CircuitCompilerPanel() {
  const [selected, setSelected] = useState("bell-pair");
  const [qubits, setQubits] = useState(2);
  const [result, setResult] = useState<CompiledCircuit | null>(null);
  const [verifications, setVerifications] = useState<CompilerVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQasm, setShowQasm] = useState(false);
  const [theta, setTheta] = useState(Math.PI / 4);
  const [rotAxis, setRotAxis] = useState<"Rx" | "Ry" | "Rz">("Ry");
  const [rotQubit, setRotQubit] = useState(0);

  useEffect(() => {
    const v = verifyCircuitCompiler();
    setVerifications(v);
    const spec = ALGORITHM_LIBRARY[selected](qubits);
    setResult(compileCircuit(spec));
    setLoading(false);
  }, []);

  const handleCompile = (key: string, n: number) => {
    setSelected(key);
    setQubits(n);
    if (key === "custom-rotation") {
      compileCustomRotation();
      return;
    }
    const factory = ALGORITHM_LIBRARY[key];
    if (factory) {
      const spec = factory(n);
      setResult(compileCircuit(spec));
    }
  };

  const compileCustomRotation = () => {
    const spec = {
      name: `${rotAxis}(${(theta * 180 / Math.PI).toFixed(1)}°)`,
      qubits: 2,
      description: `Custom ${rotAxis} rotation by θ=${theta.toFixed(4)} rad`,
      gates: [
        { name: "H" as const, qubits: [0], tier: 1 as const },
        { name: `${rotAxis}(θ)`, qubits: [rotQubit], params: [theta], tier: 3 as const },
        { name: "CNOT" as const, qubits: [0, 1], tier: 1 as const },
        { name: `${rotAxis}(θ)`, qubits: [1 - rotQubit], params: [theta / 2], tier: 3 as const },
      ],
    };
    setResult(compileCircuit(spec));
  };

  // Re-compile when rotation params change while custom-rotation is selected
  useEffect(() => {
    if (selected === "custom-rotation") compileCustomRotation();
  }, [theta, rotAxis, rotQubit]);

  const passed = verifications.filter(v => v.passed).length;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-[hsl(210,10%,45%)] text-sm font-mono">
        Initializing circuit compiler…
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-mono tracking-wide text-[hsl(160,60%,55%)]">
            Circuit Compiler
          </h2>
          <p className="text-[11px] font-mono text-[hsl(210,10%,50%)] mt-1">
            Algorithm → Atlas gate decomposition → mesh-optimized schedule
          </p>
        </div>
        <div className="flex items-center gap-3">
          {result && (
            <button
              onClick={() => setShowQasm(v => !v)}
              className="text-[10px] font-mono px-3 py-1.5 rounded-md border bg-[hsla(200,40%,20%,0.3)] border-[hsla(200,40%,40%,0.4)] text-[hsl(200,60%,60%)] hover:bg-[hsla(200,40%,25%,0.4)] transition-colors"
            >
              {showQasm ? "Hide QASM" : "Export OpenQASM 2.0"}
            </button>
          )}
          <div className="text-[10px] font-mono text-[hsl(210,10%,40%)]">
            Phase 15 • {Object.keys(ALGORITHM_LIBRARY).length} algorithms
          </div>
        </div>
      </div>

      {/* Algorithm selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {ALGORITHMS.map(alg => (
          <button
            key={alg.key}
            onClick={() => handleCompile(alg.key, alg.qubits)}
            className={`text-[10px] font-mono px-3 py-1.5 rounded-md border transition-colors ${
              selected === alg.key
                ? "bg-[hsla(160,50%,25%,0.3)] border-[hsla(160,50%,40%,0.5)] text-[hsl(160,60%,60%)]"
                : "bg-[hsla(210,10%,12%,0.5)] border-[hsla(210,10%,25%,0.3)] text-[hsl(210,10%,50%)] hover:text-[hsl(210,10%,70%)]"
            }`}
          >
            {alg.label}
          </button>
        ))}
      </div>

      {/* Rotation controls — visible when custom-rotation is selected */}
      {selected === "custom-rotation" && (
        <div className="bg-[hsla(280,20%,12%,0.4)] border border-[hsla(280,30%,35%,0.4)] rounded-lg p-4 space-y-3">
          <div className="text-[11px] font-mono text-[hsl(280,50%,65%)] uppercase">
            Arbitrary Rotation Gate Controls
          </div>
          <div className="grid grid-cols-3 gap-4">
            {/* Axis selector */}
            <div className="space-y-1.5">
              <div className="text-[9px] font-mono text-[hsl(210,10%,45%)] uppercase">Rotation Axis</div>
              <div className="flex gap-1.5">
                {(["Rx", "Ry", "Rz"] as const).map(axis => (
                  <button
                    key={axis}
                    onClick={() => setRotAxis(axis)}
                    className={`text-[10px] font-mono px-3 py-1.5 rounded border transition-colors ${
                      rotAxis === axis
                        ? "bg-[hsla(280,40%,25%,0.4)] border-[hsla(280,40%,45%,0.5)] text-[hsl(280,60%,70%)]"
                        : "bg-[hsla(210,10%,12%,0.5)] border-[hsla(210,10%,25%,0.3)] text-[hsl(210,10%,50%)] hover:text-[hsl(210,10%,70%)]"
                    }`}
                  >
                    {axis}
                  </button>
                ))}
              </div>
            </div>

            {/* Angle slider */}
            <div className="space-y-1.5">
              <div className="text-[9px] font-mono text-[hsl(210,10%,45%)] uppercase">
                θ = {(theta * 180 / Math.PI).toFixed(1)}° ({theta.toFixed(4)} rad)
              </div>
              <input
                type="range"
                min={0}
                max={Math.PI * 2}
                step={0.01}
                value={theta}
                onChange={e => setTheta(parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, hsl(280,50%,40%) ${(theta / (2 * Math.PI)) * 100}%, hsl(210,10%,20%) ${(theta / (2 * Math.PI)) * 100}%)`,
                }}
              />
              <div className="flex justify-between text-[8px] font-mono text-[hsl(210,10%,35%)]">
                <span>0</span>
                <span>π/2</span>
                <span>π</span>
                <span>3π/2</span>
                <span>2π</span>
              </div>
            </div>

            {/* Target qubit */}
            <div className="space-y-1.5">
              <div className="text-[9px] font-mono text-[hsl(210,10%,45%)] uppercase">Target Qubit</div>
              <div className="flex gap-1.5">
                {[0, 1].map(q => (
                  <button
                    key={q}
                    onClick={() => setRotQubit(q)}
                    className={`text-[10px] font-mono px-3 py-1.5 rounded border transition-colors ${
                      rotQubit === q
                        ? "bg-[hsla(200,40%,25%,0.4)] border-[hsla(200,40%,45%,0.5)] text-[hsl(200,60%,70%)]"
                        : "bg-[hsla(210,10%,12%,0.5)] border-[hsla(210,10%,25%,0.3)] text-[hsl(210,10%,50%)] hover:text-[hsl(210,10%,70%)]"
                    }`}
                  >
                    q{q}
                  </button>
                ))}
              </div>
              {/* Quick presets */}
              <div className="flex gap-1 mt-1">
                {[
                  { label: "π/8", val: Math.PI / 8 },
                  { label: "π/4", val: Math.PI / 4 },
                  { label: "π/2", val: Math.PI / 2 },
                  { label: "π", val: Math.PI },
                ].map(p => (
                  <button
                    key={p.label}
                    onClick={() => setTheta(p.val)}
                    className="text-[8px] font-mono px-2 py-0.5 rounded bg-[hsla(210,10%,15%,0.5)] border border-[hsla(210,10%,25%,0.3)] text-[hsl(210,10%,50%)] hover:text-[hsl(210,10%,70%)] transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {result && (
        <>
          {/* Compilation stats */}
          <div className="grid grid-cols-8 gap-2">
            {[
              { label: "Algorithm", value: result.algorithm, color: "hsl(160,60%,55%)" },
              { label: "Logical Q", value: result.logicalQubits, color: "hsl(200,60%,60%)" },
              { label: "Abstract", value: result.abstractGates.length, color: "hsl(210,10%,60%)" },
              { label: "Compiled", value: result.compiledGates.length, color: "hsl(280,50%,60%)" },
              { label: "Depth", value: result.depth, color: "hsl(40,80%,55%)" },
              { label: "T-count", value: result.tCount, color: "hsl(0,50%,60%)" },
              { label: "SWAPs", value: result.swapsInserted, color: "hsl(30,70%,55%)" },
              { label: "Nodes", value: result.meshNodesUsed.length, color: "hsl(190,70%,55%)" },
            ].map(s => (
              <div key={s.label} className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded p-2">
                <div className="text-[8px] font-mono text-[hsl(210,10%,40%)] uppercase">{s.label}</div>
                <div className="text-[13px] font-mono mt-0.5 truncate" style={{ color: s.color }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Compilation pipeline */}
            <div className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-4">
              <div className="text-[11px] font-mono text-[hsl(160,60%,55%)] uppercase mb-3">
                Compilation Pipeline
              </div>
              <div className="space-y-2">
                {[
                  { step: "1. PARSE", desc: `${result.abstractGates.length} abstract gates from ${result.algorithm}`, done: true },
                  { step: "2. DECOMPOSE", desc: `→ ${result.gateCountBefore} Atlas-native gates (tier-aware)`, done: true },
                  { step: "3. MAP", desc: `${result.logicalQubits} logical → ${result.physicalQubits} physical qubits`, done: true },
                  { step: "4. ROUTE", desc: `${result.swapsInserted} routing SWAPs inserted`, done: true },
                  { step: "5. OPTIMIZE", desc: `${result.optimizations.map(o => `${o.name}: -${o.reduction}`).join(", ") || "no reductions"}`, done: true },
                  { step: "6. SCHEDULE", desc: `${result.compiledGates.length} gates in ${result.depth} cycles`, done: true },
                ].map(p => (
                  <div key={p.step} className="flex items-start gap-2">
                    <span className="text-[10px] text-[hsl(140,60%,55%)] mt-0.5">✓</span>
                    <div>
                      <span className="text-[10px] font-mono text-[hsl(160,60%,60%)]">{p.step}</span>
                      <span className="text-[10px] font-mono text-[hsl(210,10%,50%)] ml-2">{p.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gate sequence (first 16) */}
            <div className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-4">
              <div className="text-[11px] font-mono text-[hsl(160,60%,55%)] uppercase mb-3">
                Compiled Gate Sequence
              </div>
              <div className="space-y-0.5">
                <div className="grid grid-cols-6 gap-2 text-[8px] font-mono text-[hsl(210,10%,40%)] uppercase pb-1 border-b border-[hsla(210,10%,25%,0.2)]">
                  <span>Cycle</span><span>Gate</span><span>Qubits</span><span>Atlas</span><span>Tier</span><span>Node</span>
                </div>
                {result.compiledGates.slice(0, 14).map((g, i) => (
                  <div key={i} className="grid grid-cols-6 gap-2 text-[9px] font-mono py-0.5">
                    <span className="text-[hsl(210,10%,50%)]">{g.cycle}</span>
                    <span className={g.isSwap ? "text-[hsl(30,70%,55%)]" : "text-[hsl(160,60%,60%)]"}>
                      {g.name}
                    </span>
                    <span className="text-[hsl(200,60%,60%)]">
                      [{g.physicalQubits.join(",")}]
                    </span>
                    <span className="text-[hsl(280,50%,60%)]">{g.atlasGate.name}</span>
                    <span className="text-[hsl(40,80%,55%)]">T{g.atlasGate.tier}</span>
                    <span className="text-[hsl(210,10%,45%)] truncate">{g.meshNode.split("::")[1]}</span>
                  </div>
                ))}
                {result.compiledGates.length > 14 && (
                  <div className="text-[9px] font-mono text-[hsl(210,10%,40%)] pt-1">
                    … +{result.compiledGates.length - 14} more gates
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Qubit mapping */}
          <div className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-4">
            <div className="text-[11px] font-mono text-[hsl(160,60%,55%)] uppercase mb-2">
              Qubit Mapping (Logical → Physical)
            </div>
            <div className="flex gap-4 flex-wrap">
              {result.qubitMap.map(m => (
                <div key={m.logical} className="flex items-center gap-2 bg-[hsla(210,10%,8%,0.5)] rounded px-3 py-1.5">
                  <span className="text-[10px] font-mono text-[hsl(200,60%,60%)]">q{m.logical}</span>
                  <span className="text-[9px] text-[hsl(210,10%,35%)]">→</span>
                  <span className="text-[10px] font-mono text-[hsl(280,50%,60%)]">v{m.physical}</span>
                  <span className="text-[8px] font-mono text-[hsl(210,10%,40%)]">{m.meshNode.split("::")[1]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* OpenQASM 2.0 Export Panel */}
          {showQasm && (
            <div className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(200,40%,35%,0.4)] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[11px] font-mono text-[hsl(200,60%,60%)] uppercase">
                  OpenQASM 2.0 Output
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(exportToOpenQASM(result));
                  }}
                  className="text-[9px] font-mono px-2 py-1 rounded border bg-[hsla(140,30%,20%,0.3)] border-[hsla(140,30%,40%,0.4)] text-[hsl(140,60%,55%)] hover:bg-[hsla(140,30%,25%,0.4)] transition-colors"
                >
                  Copy to Clipboard
                </button>
              </div>
              <pre className="text-[9px] font-mono text-[hsl(210,10%,65%)] bg-[hsla(210,10%,6%,0.8)] rounded p-3 overflow-auto max-h-[400px] whitespace-pre leading-relaxed">
                {exportToOpenQASM(result)}
              </pre>
            </div>
          )}
        </>
      )}

      {/* Verification tests */}
      <div className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] font-mono text-[hsl(160,60%,55%)] uppercase">
            Compiler Verification Suite
          </div>
          <div className={`text-[11px] font-mono ${passed === verifications.length ? "text-[hsl(140,60%,55%)]" : "text-[hsl(40,80%,55%)]"}`}>
            {passed}/{verifications.length} passed
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {verifications.map((v, i) => (
            <div key={i} className="flex items-start gap-2 py-0.5">
              <span className={`text-[10px] mt-0.5 ${v.passed ? "text-[hsl(140,60%,55%)]" : "text-[hsl(0,60%,55%)]"}`}>
                {v.passed ? "✓" : "✗"}
              </span>
              <div>
                <div className="text-[10px] font-mono text-[hsl(210,10%,65%)]">{v.name}</div>
                <div className="text-[9px] font-mono text-[hsl(210,10%,40%)]">{v.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
