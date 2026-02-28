/**
 * Quantum Workspace — First-Principles Quantum Circuit Lab
 * ═══════════════════════════════════════════════════════════
 *
 * A PennyLane-inspired interactive environment for building and testing
 * quantum circuits using Hologram's native statevector simulator.
 *
 * Key features:
 *   - Visual wire-based circuit builder (drag-and-drop gates)
 *   - Exact expectation value computation ⟨ψ|O|ψ⟩
 *   - Full statevector transparency
 *   - PennyLane-style Python code generation
 *   - Scalable from 1 to 20+ qubits
 */

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { X, Plus, Minus, Play, RotateCcw, ChevronDown, Download, Copy, Check, Trash2, Atom } from "lucide-react";
import {
  createState,
  simulateCircuit,
  measure,
  expectationValue,
  expectationValuePauliString,
  getStateProbabilities,
  vonNeumannEntropy,
  entanglementMap,
  toOpenQASM,
  drawCircuitASCII,
  type SimulatorState,
  type SimOp,
  type PauliOp,
  type Complex,
} from "@/hologram/kernel/q-simulator";

/* ── Types ─────────────────────────────────────────────── */

interface GateDef {
  id: string;
  label: string;
  qubits: number; // how many wires it acts on
  parameterized?: boolean;
  description: string;
  color: string;
}

const GATE_PALETTE: GateDef[] = [
  { id: "h",    label: "H",    qubits: 1, description: "Hadamard — creates superposition",       color: "hsl(200, 60%, 55%)" },
  { id: "x",    label: "X",    qubits: 1, description: "Pauli-X — bit flip (NOT gate)",          color: "hsl(340, 55%, 55%)" },
  { id: "y",    label: "Y",    qubits: 1, description: "Pauli-Y — bit + phase flip",             color: "hsl(280, 50%, 55%)" },
  { id: "z",    label: "Z",    qubits: 1, description: "Pauli-Z — phase flip",                   color: "hsl(160, 50%, 45%)" },
  { id: "s",    label: "S",    qubits: 1, description: "S gate — √Z phase gate (π/2)",           color: "hsl(45, 55%, 50%)" },
  { id: "t",    label: "T",    qubits: 1, description: "T gate — π/8 phase gate",                color: "hsl(30, 60%, 50%)" },
  { id: "ry",   label: "RY",   qubits: 1, parameterized: true, description: "Y-rotation by angle θ",   color: "hsl(280, 50%, 55%)" },
  { id: "rx",   label: "RX",   qubits: 1, parameterized: true, description: "X-rotation by angle θ",   color: "hsl(340, 55%, 55%)" },
  { id: "rz",   label: "RZ",   qubits: 1, parameterized: true, description: "Z-rotation by angle θ",   color: "hsl(160, 50%, 45%)" },
  { id: "cx",   label: "CNOT", qubits: 2, description: "Controlled-NOT — entangles two qubits",  color: "hsl(220, 55%, 55%)" },
  { id: "cz",   label: "CZ",   qubits: 2, description: "Controlled-Z — controlled phase flip",   color: "hsl(160, 50%, 45%)" },
  { id: "swap", label: "SWAP", qubits: 2, description: "Swap two qubit states",                  color: "hsl(30, 55%, 50%)" },
];

interface CircuitGate {
  id: string;
  gateId: string;
  wires: number[];
  params?: number[];
}

interface MeasurementConfig {
  qubit: number;
  observable: PauliOp;
}

/* ── Helpers ───────────────────────────────────────────── */

function fmtComplex(c: Complex): string {
  const [r, im] = c;
  if (Math.abs(im) < 1e-10) return r.toFixed(4);
  if (Math.abs(r) < 1e-10) return `${im.toFixed(4)}i`;
  return im >= 0 ? `${r.toFixed(4)}+${im.toFixed(4)}i` : `${r.toFixed(4)}${im.toFixed(4)}i`;
}

function fmtPhase(c: Complex): string {
  const phase = Math.atan2(c[1], c[0]);
  if (Math.abs(phase) < 1e-10) return "0";
  if (Math.abs(phase - Math.PI) < 1e-10) return "π";
  if (Math.abs(phase + Math.PI) < 1e-10) return "-π";
  if (Math.abs(phase - Math.PI / 2) < 1e-10) return "π/2";
  if (Math.abs(phase + Math.PI / 2) < 1e-10) return "-π/2";
  return `${(phase / Math.PI).toFixed(3)}π`;
}

let gateCounter = 0;
function nextGateId() { return `g${++gateCounter}`; }

/* ── Main Component ────────────────────────────────────── */

export default function QuantumWorkspace({ onClose }: { onClose: () => void }) {
  const [numQubits, setNumQubits] = useState(1);
  const [circuit, setCircuit] = useState<CircuitGate[]>([]);
  const [measurements, setMeasurements] = useState<MeasurementConfig[]>([{ qubit: 0, observable: "Z" }]);
  const [results, setResults] = useState<{
    statevector: { state: string; probability: number; amplitude: Complex }[];
    expectations: { qubit: number; observable: PauliOp; value: number }[];
    counts: Record<string, number>;
    entropy: number;
    entanglement: { qubit: number; purity: number; entangled: boolean }[];
    executionTime: number;
    qasm: string[];
    ascii: string[];
  } | null>(null);
  const [shots, setShots] = useState(1024);
  const [addingGate, setAddingGate] = useState<string | null>(null);
  const [paramInput, setParamInput] = useState("π/4");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"results" | "code" | "circuit">("results");
  const [selectedWires, setSelectedWires] = useState<number[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);

  /* ── Circuit manipulation ──────────────────────────── */

  const addGate = useCallback((gateId: string, wires: number[], params?: number[]) => {
    setCircuit(prev => [...prev, { id: nextGateId(), gateId, wires, params }]);
    setAddingGate(null);
    setSelectedWires([]);
    setResults(null);
  }, []);

  const removeGate = useCallback((id: string) => {
    setCircuit(prev => prev.filter(g => g.id !== id));
    setResults(null);
  }, []);

  const clearCircuit = useCallback(() => {
    setCircuit([]);
    setResults(null);
  }, []);

  const handleQubitChange = useCallback((delta: number) => {
    setNumQubits(prev => {
      const next = Math.max(1, Math.min(20, prev + delta));
      // Remove gates that reference non-existent wires
      setCircuit(c => c.filter(g => g.wires.every(w => w < next)));
      setMeasurements(m => m.filter(mm => mm.qubit < next));
      setResults(null);
      return next;
    });
  }, []);

  /* ── Gate addition flow ───────────────────────────── */

  const handleGatePaletteClick = useCallback((gateDef: GateDef) => {
    if (gateDef.qubits === 1 && numQubits === 1) {
      // Auto-place on wire 0
      if (gateDef.parameterized) {
        setAddingGate(gateDef.id);
        setSelectedWires([0]);
      } else {
        addGate(gateDef.id, [0]);
      }
    } else if (gateDef.qubits === 1) {
      setAddingGate(gateDef.id);
      setSelectedWires([]);
    } else {
      setAddingGate(gateDef.id);
      setSelectedWires([]);
    }
  }, [numQubits, addGate]);

  const handleWireClick = useCallback((wire: number) => {
    if (!addingGate) return;
    const gateDef = GATE_PALETTE.find(g => g.id === addingGate);
    if (!gateDef) return;

    const newWires = [...selectedWires, wire];
    if (newWires.length === gateDef.qubits) {
      if (gateDef.parameterized) {
        // Parse parameter
        let val = Math.PI / 4;
        const input = paramInput.trim();
        if (input === "π" || input === "pi") val = Math.PI;
        else if (input === "π/2" || input === "pi/2") val = Math.PI / 2;
        else if (input === "π/4" || input === "pi/4") val = Math.PI / 4;
        else if (input === "π/3" || input === "pi/3") val = Math.PI / 3;
        else if (input === "π/6" || input === "pi/6") val = Math.PI / 6;
        else if (input === "2π" || input === "2pi") val = 2 * Math.PI;
        else if (input === "-π" || input === "-pi") val = -Math.PI;
        else if (input === "-π/2" || input === "-pi/2") val = -Math.PI / 2;
        else { const n = parseFloat(input); if (!isNaN(n)) val = n; }
        addGate(gateDef.id, newWires, [val]);
      } else {
        addGate(gateDef.id, newWires);
      }
    } else {
      setSelectedWires(newWires);
    }
  }, [addingGate, selectedWires, paramInput, addGate]);

  /* ── Run simulation ───────────────────────────────── */

  const runCircuit = useCallback(() => {
    const t0 = performance.now();
    const state = createState(numQubits);
    state.ops = circuit.map(g => ({
      gate: g.gateId,
      qubits: g.wires,
      params: g.params,
    }));

    simulateCircuit(state);

    const statevector = getStateProbabilities(state);
    const expectations = measurements.map(m => ({
      qubit: m.qubit,
      observable: m.observable,
      value: expectationValue(state, m.qubit, m.observable),
    }));
    const counts = measure(state, shots);
    const entropy = vonNeumannEntropy(state);
    const ent = numQubits > 1 ? entanglementMap(state) : [];
    const qasm = toOpenQASM(state);
    const ascii = drawCircuitASCII(state);
    const executionTime = performance.now() - t0;

    // Re-simulate since measure() re-runs the circuit
    simulateCircuit(state);

    setResults({ statevector, expectations, counts, entropy, entanglement: ent, executionTime, qasm, ascii });
    setActiveTab("results");
  }, [numQubits, circuit, measurements, shots]);

  /* ── PennyLane code generation ─────────────────────── */

  const pennyLaneCode = useMemo(() => {
    const lines: string[] = [
      "import pennylane as qml",
      "from pennylane import numpy as np",
      "",
      `dev = qml.device("default.qubit", wires=${numQubits})`,
      "",
      "@qml.qnode(dev)",
      `def circuit(${circuit.some(g => g.params) ? "params" : ""}):`,
    ];

    let paramIdx = 0;
    for (const g of circuit) {
      const gateDef = GATE_PALETTE.find(gd => gd.id === g.gateId);
      if (!gateDef) continue;
      const gateName = g.gateId.toUpperCase() === "CX" ? "CNOT" : g.gateId.charAt(0).toUpperCase() + g.gateId.slice(1);

      if (g.params && g.params.length > 0) {
        const paramStr = g.params.map(p => {
          if (Math.abs(p - Math.PI) < 1e-10) return "np.pi";
          if (Math.abs(p + Math.PI) < 1e-10) return "-np.pi";
          if (Math.abs(p - Math.PI / 2) < 1e-10) return "np.pi/2";
          if (Math.abs(p - Math.PI / 4) < 1e-10) return "np.pi/4";
          return p.toFixed(4);
        }).join(", ");
        lines.push(`    qml.${gateName === "Ry" ? "RY" : gateName === "Rx" ? "RX" : gateName === "Rz" ? "RZ" : gateName}(${paramStr}, wires=${g.wires.length === 1 ? g.wires[0] : JSON.stringify(g.wires)})`);
        paramIdx++;
      } else if (g.wires.length === 1) {
        lines.push(`    qml.${gateName === "H" ? "Hadamard" : gateName}(wires=${g.wires[0]})`);
      } else {
        lines.push(`    qml.${gateName}(wires=${JSON.stringify(g.wires)})`);
      }
    }

    if (measurements.length > 0) {
      const measStrs = measurements.map(m =>
        `qml.expval(qml.Pauli${m.observable}(${m.qubit}))`
      );
      if (measStrs.length === 1) {
        lines.push(`    return ${measStrs[0]}`);
      } else {
        lines.push(`    return ${measStrs.join(", ")}`);
      }
    } else {
      lines.push("    return qml.state()");
    }

    lines.push("");
    lines.push("# Execute");
    lines.push(`result = circuit(${circuit.some(g => g.params) ? "" : ""})`);
    lines.push('print(f"Result: {result}")');

    return lines.join("\n");
  }, [circuit, numQubits, measurements]);

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(pennyLaneCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [pennyLaneCode]);

  /* ── Measurement management ────────────────────────── */

  const addMeasurement = useCallback(() => {
    setMeasurements(prev => [...prev, { qubit: 0, observable: "Z" }]);
  }, []);

  const removeMeasurement = useCallback((idx: number) => {
    setMeasurements(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const updateMeasurement = useCallback((idx: number, field: "qubit" | "observable", value: number | PauliOp) => {
    setMeasurements(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  }, []);

  /* ── Preloaded example circuits ────────────────────── */

  const loadExample = useCallback((name: string) => {
    setResults(null);
    if (name === "bell") {
      setNumQubits(2);
      setCircuit([
        { id: nextGateId(), gateId: "h", wires: [0] },
        { id: nextGateId(), gateId: "cx", wires: [0, 1] },
      ]);
      setMeasurements([
        { qubit: 0, observable: "Z" },
        { qubit: 1, observable: "Z" },
      ]);
    } else if (name === "superposition") {
      setNumQubits(1);
      setCircuit([
        { id: nextGateId(), gateId: "h", wires: [0] },
      ]);
      setMeasurements([
        { qubit: 0, observable: "Z" },
        { qubit: 0, observable: "X" },
      ]);
    } else if (name === "phase") {
      setNumQubits(1);
      setCircuit([
        { id: nextGateId(), gateId: "h", wires: [0] },
        { id: nextGateId(), gateId: "z", wires: [0] },
        { id: nextGateId(), gateId: "h", wires: [0] },
      ]);
      setMeasurements([{ qubit: 0, observable: "Z" }]);
    } else if (name === "ghz") {
      setNumQubits(3);
      setCircuit([
        { id: nextGateId(), gateId: "h", wires: [0] },
        { id: nextGateId(), gateId: "cx", wires: [0, 1] },
        { id: nextGateId(), gateId: "cx", wires: [0, 2] },
      ]);
      setMeasurements([
        { qubit: 0, observable: "Z" },
        { qubit: 1, observable: "Z" },
        { qubit: 2, observable: "Z" },
      ]);
    }
  }, []);

  /* ── Render ────────────────────────────────────────── */

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* ── Header ───────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-5 py-3 shrink-0"
        style={{
          background: "hsl(220, 14%, 10%)",
          borderBottom: "1px solid hsla(200, 30%, 50%, 0.12)",
        }}
      >
        <div className="flex items-center gap-3">
          <Atom className="w-5 h-5" style={{ color: "hsl(200, 60%, 60%)" }} strokeWidth={1.5} />
          <div>
            <h1 className="text-sm font-medium" style={{ color: "hsl(0, 0%, 92%)" }}>
              Quantum Workspace
            </h1>
            <p className="text-[11px]" style={{ color: "hsl(0, 0%, 55%)" }}>
              First-principles circuit lab · Hologram Q-Simulator
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value=""
            onChange={e => { if (e.target.value) loadExample(e.target.value); }}
            className="text-xs px-2 py-1 rounded"
            style={{
              background: "hsla(200, 30%, 50%, 0.1)",
              border: "1px solid hsla(200, 30%, 50%, 0.2)",
              color: "hsl(200, 60%, 70%)",
            }}
          >
            <option value="">Load Example...</option>
            <option value="superposition">|+⟩ Superposition (1 qubit)</option>
            <option value="phase">Phase Kickback (1 qubit)</option>
            <option value="bell">Bell State (2 qubits)</option>
            <option value="ghz">GHZ State (3 qubits)</option>
          </select>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ color: "hsl(0, 0%, 55%)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Main content: 2-column layout ────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Circuit Builder */}
        <div
          className="flex flex-col overflow-y-auto"
          ref={scrollRef}
          style={{
            width: "50%",
            borderRight: "1px solid hsla(200, 30%, 50%, 0.08)",
            scrollbarWidth: "thin",
          }}
        >
          {/* Qubit count */}
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{ borderBottom: "1px solid hsla(200, 30%, 50%, 0.06)" }}
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium" style={{ color: "hsl(0, 0%, 70%)" }}>Qubits</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleQubitChange(-1)}
                  className="w-6 h-6 rounded flex items-center justify-center"
                  style={{ background: "hsla(200, 30%, 50%, 0.1)", color: "hsl(0, 0%, 65%)" }}
                  disabled={numQubits <= 1}
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span
                  className="w-8 text-center text-sm font-mono font-semibold"
                  style={{ color: "hsl(200, 60%, 70%)" }}
                >
                  {numQubits}
                </span>
                <button
                  onClick={() => handleQubitChange(1)}
                  className="w-6 h-6 rounded flex items-center justify-center"
                  style={{ background: "hsla(200, 30%, 50%, 0.1)", color: "hsl(0, 0%, 65%)" }}
                  disabled={numQubits >= 20}
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <span className="text-[10px]" style={{ color: "hsl(0, 0%, 45%)" }}>
                (2<sup>{numQubits}</sup> = {(1 << numQubits).toLocaleString()} amplitudes)
              </span>
            </div>
            <button
              onClick={clearCircuit}
              className="text-[10px] px-2 py-1 rounded"
              style={{ color: "hsl(0, 50%, 60%)", background: "hsla(0, 40%, 50%, 0.08)" }}
            >
              Clear
            </button>
          </div>

          {/* Wire visualization */}
          <div className="px-5 py-4" style={{ borderBottom: "1px solid hsla(200, 30%, 50%, 0.06)" }}>
            <CircuitDiagram
              numQubits={numQubits}
              circuit={circuit}
              addingGate={addingGate}
              selectedWires={selectedWires}
              onWireClick={handleWireClick}
              onRemoveGate={removeGate}
            />
          </div>

          {/* Gate palette */}
          <div className="px-5 py-3" style={{ borderBottom: "1px solid hsla(200, 30%, 50%, 0.06)" }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-medium" style={{ color: "hsl(0, 0%, 60%)" }}>Gate Palette</span>
              {addingGate && (
                <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: "hsla(200, 60%, 50%, 0.15)", color: "hsl(200, 60%, 70%)" }}>
                  Adding {GATE_PALETTE.find(g => g.id === addingGate)?.label} — click wire{GATE_PALETTE.find(g => g.id === addingGate)?.qubits === 2 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {GATE_PALETTE.map(g => (
                <button
                  key={g.id}
                  onClick={() => handleGatePaletteClick(g)}
                  className="group relative px-2.5 py-1.5 rounded-md text-xs font-mono font-semibold transition-all duration-150"
                  style={{
                    background: addingGate === g.id ? g.color : "hsla(200, 20%, 50%, 0.08)",
                    color: addingGate === g.id ? "hsl(0, 0%, 100%)" : g.color,
                    border: `1px solid ${addingGate === g.id ? g.color : "hsla(200, 20%, 50%, 0.12)"}`,
                  }}
                  title={g.description}
                >
                  {g.label}
                </button>
              ))}
            </div>
            {/* Parameter input for parameterized gates */}
            {addingGate && GATE_PALETTE.find(g => g.id === addingGate)?.parameterized && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px]" style={{ color: "hsl(0, 0%, 55%)" }}>θ =</span>
                <input
                  value={paramInput}
                  onChange={e => setParamInput(e.target.value)}
                  className="text-xs font-mono px-2 py-1 rounded w-20"
                  style={{
                    background: "hsla(200, 20%, 50%, 0.08)",
                    border: "1px solid hsla(200, 20%, 50%, 0.15)",
                    color: "hsl(0, 0%, 85%)",
                  }}
                  placeholder="π/4"
                />
                <span className="text-[9px]" style={{ color: "hsl(0, 0%, 40%)" }}>
                  (π, π/2, π/4, π/3, 0.5, etc.)
                </span>
              </div>
            )}
          </div>

          {/* Measurements */}
          <div className="px-5 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium" style={{ color: "hsl(0, 0%, 60%)" }}>
                Observables — ⟨ψ|O|ψ⟩
              </span>
              <button
                onClick={addMeasurement}
                className="text-[10px] px-2 py-0.5 rounded flex items-center gap-1"
                style={{ background: "hsla(200, 30%, 50%, 0.1)", color: "hsl(200, 60%, 70%)" }}
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            <div className="space-y-1.5">
              {measurements.map((m, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-[10px] font-mono" style={{ color: "hsl(0, 0%, 50%)" }}>⟨</span>
                  <select
                    value={m.observable}
                    onChange={e => updateMeasurement(idx, "observable", e.target.value as PauliOp)}
                    className="text-xs font-mono px-1.5 py-0.5 rounded"
                    style={{
                      background: "hsla(200, 20%, 50%, 0.08)",
                      border: "1px solid hsla(200, 20%, 50%, 0.12)",
                      color: "hsl(0, 0%, 85%)",
                    }}
                  >
                    <option value="Z">Z</option>
                    <option value="X">X</option>
                    <option value="Y">Y</option>
                    <option value="I">I</option>
                  </select>
                  <span className="text-[10px] font-mono" style={{ color: "hsl(0, 0%, 50%)" }}>⟩ on qubit</span>
                  <select
                    value={m.qubit}
                    onChange={e => updateMeasurement(idx, "qubit", parseInt(e.target.value))}
                    className="text-xs font-mono px-1.5 py-0.5 rounded"
                    style={{
                      background: "hsla(200, 20%, 50%, 0.08)",
                      border: "1px solid hsla(200, 20%, 50%, 0.12)",
                      color: "hsl(0, 0%, 85%)",
                    }}
                  >
                    {Array.from({ length: numQubits }, (_, i) => (
                      <option key={i} value={i}>q{i}</option>
                    ))}
                  </select>
                  {measurements.length > 1 && (
                    <button onClick={() => removeMeasurement(idx)} style={{ color: "hsl(0, 50%, 55%)" }}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Run button */}
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={runCircuit}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  background: "linear-gradient(135deg, hsl(200, 60%, 50%), hsl(220, 60%, 55%))",
                  color: "hsl(0, 0%, 100%)",
                  boxShadow: "0 2px 12px hsla(200, 60%, 50%, 0.3)",
                }}
              >
                <Play className="w-4 h-4" /> Run Circuit
              </button>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px]" style={{ color: "hsl(0, 0%, 50%)" }}>Shots:</span>
                <input
                  type="number"
                  value={shots}
                  onChange={e => setShots(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 text-xs font-mono px-2 py-1 rounded"
                  style={{
                    background: "hsla(200, 20%, 50%, 0.08)",
                    border: "1px solid hsla(200, 20%, 50%, 0.12)",
                    color: "hsl(0, 0%, 85%)",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Results */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div
            className="flex items-center gap-0 px-4 shrink-0"
            style={{ borderBottom: "1px solid hsla(200, 30%, 50%, 0.08)" }}
          >
            {(["results", "code", "circuit"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-4 py-2.5 text-xs font-medium capitalize transition-colors"
                style={{
                  color: activeTab === tab ? "hsl(200, 60%, 70%)" : "hsl(0, 0%, 50%)",
                  borderBottom: activeTab === tab ? "2px solid hsl(200, 60%, 60%)" : "2px solid transparent",
                }}
              >
                {tab === "code" ? "PennyLane Code" : tab === "circuit" ? "OpenQASM" : "Results"}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-5" style={{ scrollbarWidth: "thin" }}>
            {activeTab === "results" && (
              results ? (
                <ResultsPanel results={results} numQubits={numQubits} />
              ) : (
                <EmptyState />
              )
            )}
            {activeTab === "code" && (
              <CodePanel code={pennyLaneCode} onCopy={copyCode} copied={copied} />
            )}
            {activeTab === "circuit" && (
              results ? (
                <div className="space-y-4">
                  <div>
                    <span className="text-[11px] font-medium block mb-2" style={{ color: "hsl(0, 0%, 60%)" }}>OpenQASM 3.0</span>
                    <pre
                      className="text-xs font-mono p-3 rounded-lg overflow-x-auto"
                      style={{ background: "hsla(200, 15%, 50%, 0.05)", color: "hsl(0, 0%, 75%)" }}
                    >
                      {results.qasm.join("\n")}
                    </pre>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium block mb-2" style={{ color: "hsl(0, 0%, 60%)" }}>ASCII Circuit</span>
                    <pre
                      className="text-xs font-mono p-3 rounded-lg overflow-x-auto"
                      style={{ background: "hsla(200, 15%, 50%, 0.05)", color: "hsl(0, 0%, 75%)" }}
                    >
                      {results.ascii.join("\n")}
                    </pre>
                  </div>
                </div>
              ) : (
                <EmptyState />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Circuit Diagram ────────────────────────────────────── */

function CircuitDiagram({
  numQubits, circuit, addingGate, selectedWires, onWireClick, onRemoveGate,
}: {
  numQubits: number;
  circuit: CircuitGate[];
  addingGate: string | null;
  selectedWires: number[];
  onWireClick: (wire: number) => void;
  onRemoveGate: (id: string) => void;
}) {
  const wireH = 40;
  const gateW = 40;
  const padding = 60;
  const svgW = Math.max(400, padding + circuit.length * (gateW + 12) + 100);
  const svgH = numQubits * wireH + 20;

  return (
    <div className="overflow-x-auto rounded-lg" style={{ background: "hsla(220, 15%, 6%, 0.5)" }}>
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ minWidth: svgW }}>
        {/* Wires */}
        {Array.from({ length: numQubits }, (_, q) => {
          const y = 10 + q * wireH + wireH / 2;
          const isSelected = selectedWires.includes(q);
          const isTarget = addingGate !== null && !selectedWires.includes(q);
          return (
            <g key={q}>
              {/* Wire line */}
              <line
                x1={padding}
                x2={svgW - 20}
                y1={y}
                y2={y}
                stroke={isSelected ? "hsl(200, 60%, 55%)" : "hsla(200, 20%, 50%, 0.2)"}
                strokeWidth={isSelected ? 2 : 1}
              />
              {/* Wire label */}
              <text
                x={12}
                y={y + 1}
                dominantBaseline="middle"
                fill="hsl(0, 0%, 55%)"
                fontSize={12}
                fontFamily="monospace"
              >
                q{q}
              </text>
              {/* |0⟩ initial state */}
              <text
                x={padding - 8}
                y={y + 1}
                dominantBaseline="middle"
                textAnchor="end"
                fill="hsl(0, 0%, 45%)"
                fontSize={11}
                fontFamily="monospace"
              >
                |0⟩
              </text>
              {/* Click target */}
              {addingGate && (
                <rect
                  x={0}
                  y={y - wireH / 2}
                  width={svgW}
                  height={wireH}
                  fill={isTarget ? "hsla(200, 60%, 50%, 0.03)" : "transparent"}
                  style={{ cursor: "pointer" }}
                  onClick={() => onWireClick(q)}
                />
              )}
            </g>
          );
        })}

        {/* Gates */}
        {circuit.map((g, idx) => {
          const x = padding + 10 + idx * (gateW + 12);
          const gateDef = GATE_PALETTE.find(gd => gd.id === g.gateId);
          const color = gateDef?.color || "hsl(200, 50%, 50%)";

          if (g.wires.length === 1) {
            const y = 10 + g.wires[0] * wireH + wireH / 2;
            const label = gateDef?.label || g.gateId.toUpperCase();
            const fullLabel = g.params ? `${label}(${(g.params[0] / Math.PI).toFixed(2)}π)` : label;
            return (
              <g key={g.id} style={{ cursor: "pointer" }} onClick={() => onRemoveGate(g.id)}>
                <rect
                  x={x - gateW / 2 + 4}
                  y={y - 14}
                  width={gateW - 8 + (g.params ? 20 : 0)}
                  height={28}
                  rx={4}
                  fill={color}
                  opacity={0.9}
                />
                <text
                  x={x + 4 + (g.params ? 10 : 0)}
                  y={y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize={g.params ? 9 : 11}
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {fullLabel}
                </text>
              </g>
            );
          }

          // 2-qubit gate
          const y0 = 10 + g.wires[0] * wireH + wireH / 2;
          const y1 = 10 + g.wires[1] * wireH + wireH / 2;
          const cx = x + 4;

          if (g.gateId === "cx" || g.gateId === "cnot") {
            return (
              <g key={g.id} style={{ cursor: "pointer" }} onClick={() => onRemoveGate(g.id)}>
                <line x1={cx} y1={y0} x2={cx} y2={y1} stroke={color} strokeWidth={2} />
                <circle cx={cx} cy={y0} r={5} fill={color} />
                <circle cx={cx} cy={y1} r={10} fill="none" stroke={color} strokeWidth={2} />
                <line x1={cx} y1={y1 - 10} x2={cx} y2={y1 + 10} stroke={color} strokeWidth={2} />
                <line x1={cx - 10} y1={y1} x2={cx + 10} y2={y1} stroke={color} strokeWidth={2} />
              </g>
            );
          }

          return (
            <g key={g.id} style={{ cursor: "pointer" }} onClick={() => onRemoveGate(g.id)}>
              <line x1={cx} y1={y0} x2={cx} y2={y1} stroke={color} strokeWidth={2} />
              <rect x={cx - 16} y={Math.min(y0, y1) - 12} width={32} height={Math.abs(y1 - y0) + 24} rx={4} fill={color} opacity={0.15} stroke={color} strokeWidth={1} />
              <text x={cx} y={(y0 + y1) / 2 + 1} textAnchor="middle" dominantBaseline="middle" fill={color} fontSize={10} fontFamily="monospace" fontWeight="bold">
                {gateDef?.label || g.gateId.toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ── Results Panel ──────────────────────────────────────── */

function ResultsPanel({ results, numQubits }: {
  results: NonNullable<ReturnType<typeof useState<any>>[0]>;
  numQubits: number;
}) {
  return (
    <div className="space-y-5">
      {/* Execution info */}
      <div
        className="flex items-center gap-4 px-3 py-2 rounded-lg"
        style={{ background: "hsla(200, 30%, 50%, 0.06)" }}
      >
        <span className="text-[10px] font-mono" style={{ color: "hsl(120, 50%, 55%)" }}>✓ Executed</span>
        <span className="text-[10px] font-mono" style={{ color: "hsl(0, 0%, 50%)" }}>
          {results.executionTime.toFixed(2)}ms · {numQubits} qubit{numQubits > 1 ? "s" : ""} · {(1 << numQubits).toLocaleString()} amplitudes
        </span>
      </div>

      {/* Expectation Values — THE KEY SECTION */}
      {results.expectations.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold mb-2" style={{ color: "hsl(200, 60%, 70%)" }}>
            Expectation Values ⟨ψ|O|ψ⟩
          </h3>
          <div className="space-y-2">
            {results.expectations.map((exp: any, i: number) => (
              <div
                key={i}
                className="px-3 py-2.5 rounded-lg"
                style={{ background: "hsla(200, 30%, 50%, 0.06)" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono" style={{ color: "hsl(0, 0%, 70%)" }}>
                    ⟨Pauli{exp.observable}⟩ on q{exp.qubit}
                  </span>
                  <span
                    className="text-lg font-mono font-bold"
                    style={{ color: exp.value > 0 ? "hsl(160, 55%, 55%)" : exp.value < 0 ? "hsl(340, 55%, 55%)" : "hsl(0, 0%, 60%)" }}
                  >
                    {exp.value >= 0 ? "+" : ""}{exp.value.toFixed(6)}
                  </span>
                </div>
                <ExpectationBar value={exp.value} />
                <p className="text-[9px] mt-1" style={{ color: "hsl(0, 0%, 42%)" }}>
                  {exp.observable === "Z" && "Measures computational basis bias: +1 = |0⟩, -1 = |1⟩"}
                  {exp.observable === "X" && "Measures superposition coherence: +1 = |+⟩, -1 = |−⟩"}
                  {exp.observable === "Y" && "Measures circular polarization: +1 = |+i⟩, -1 = |−i⟩"}
                  {exp.observable === "I" && "Identity: always 1 (normalization check)"}
                </p>
              </div>
            ))}
          </div>
          <div
            className="mt-2 p-2.5 rounded-lg text-[10px] leading-relaxed"
            style={{ background: "hsla(200, 20%, 50%, 0.04)", color: "hsl(0, 0%, 48%)" }}
          >
            <strong style={{ color: "hsl(200, 60%, 65%)" }}>Why this matters:</strong> On real quantum hardware,
            estimating ⟨Z⟩ to precision ε requires O(1/ε²) measurement shots.
            Our statevector simulator computes the <em>exact</em> value in O(2<sup>n</sup>) time —
            no sampling noise. For {numQubits} qubit{numQubits > 1 ? "s" : ""}, that's {(1 << numQubits).toLocaleString()} operations.
            {numQubits <= 16 && " This is instantaneous. Try scaling to 16+ qubits to see where classical simulation hits its wall."}
          </div>
        </div>
      )}

      {/* Statevector */}
      <div>
        <h3 className="text-xs font-semibold mb-2" style={{ color: "hsl(200, 60%, 70%)" }}>
          Statevector |ψ⟩
        </h3>
        <div className="space-y-1">
          {results.statevector.map((sv: any, i: number) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-1.5 rounded"
              style={{ background: i % 2 === 0 ? "hsla(200, 20%, 50%, 0.03)" : "transparent" }}
            >
              <span className="text-xs font-mono w-16 shrink-0" style={{ color: "hsl(200, 55%, 65%)" }}>
                |{sv.state}⟩
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "hsla(200, 20%, 50%, 0.08)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${sv.probability * 100}%`,
                        background: `linear-gradient(90deg, hsl(200, 60%, 50%), hsl(220, 60%, 55%))`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-mono w-14 text-right" style={{ color: "hsl(0, 0%, 60%)" }}>
                    {(sv.probability * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono w-28 text-right" style={{ color: "hsl(0, 0%, 50%)" }}>
                {fmtComplex(sv.amplitude)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Measurement histogram */}
      <div>
        <h3 className="text-xs font-semibold mb-2" style={{ color: "hsl(200, 60%, 70%)" }}>
          Measurement Histogram ({(Object.values(results.counts) as number[]).reduce((a, b) => a + b, 0)} shots)
        </h3>
        <div className="space-y-1">
          {Object.entries(results.counts)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .map(([bits, count]) => {
              const total = (Object.values(results.counts) as number[]).reduce((a, b) => a + b, 0);
              const pct = ((count as number) / total) * 100;
              return (
                <div key={bits} className="flex items-center gap-2 px-3 py-1">
                  <span className="text-xs font-mono w-16 shrink-0" style={{ color: "hsl(200, 55%, 65%)" }}>
                    |{bits}⟩
                  </span>
                  <div className="flex-1 h-5 rounded overflow-hidden" style={{ background: "hsla(200, 20%, 50%, 0.06)" }}>
                    <div
                      className="h-full rounded flex items-center px-2"
                      style={{
                        width: `${pct}%`,
                        background: "hsl(200, 55%, 50%)",
                        minWidth: 24,
                      }}
                    >
                      <span className="text-[9px] font-mono font-medium" style={{ color: "hsl(0, 0%, 100%)" }}>
                        {count as number}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono w-12 text-right" style={{ color: "hsl(0, 0%, 55%)" }}>
                    {pct.toFixed(1)}%
                  </span>
                </div>
              );
            })}
        </div>
      </div>

      {/* Entropy & entanglement */}
      <div className="flex gap-4">
        <div
          className="flex-1 px-3 py-2 rounded-lg"
          style={{ background: "hsla(200, 30%, 50%, 0.04)" }}
        >
          <span className="text-[10px] block mb-1" style={{ color: "hsl(0, 0%, 50%)" }}>Von Neumann Entropy</span>
          <span className="text-sm font-mono font-semibold" style={{ color: "hsl(200, 60%, 65%)" }}>
            S = {results.entropy.toFixed(4)} bits
          </span>
        </div>
        {results.entanglement.length > 0 && (
          <div
            className="flex-1 px-3 py-2 rounded-lg"
            style={{ background: "hsla(200, 30%, 50%, 0.04)" }}
          >
            <span className="text-[10px] block mb-1" style={{ color: "hsl(0, 0%, 50%)" }}>Entanglement (Purity)</span>
            <div className="flex gap-3">
              {results.entanglement.map((e: any) => (
                <span key={e.qubit} className="text-[10px] font-mono" style={{ color: e.entangled ? "hsl(340, 55%, 60%)" : "hsl(120, 50%, 55%)" }}>
                  q{e.qubit}: {e.purity.toFixed(3)} {e.entangled ? "⚡" : "○"}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Expectation Value Bar ──────────────────────────────── */

function ExpectationBar({ value }: { value: number }) {
  // value ∈ [-1, 1], map to bar position
  const pct = ((value + 1) / 2) * 100;
  return (
    <div className="mt-1.5 relative h-3 rounded-full overflow-hidden" style={{ background: "hsla(200, 20%, 50%, 0.08)" }}>
      {/* Center line */}
      <div className="absolute left-1/2 top-0 bottom-0 w-px" style={{ background: "hsla(0, 0%, 50%, 0.3)" }} />
      {/* Labels */}
      <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[7px] font-mono" style={{ color: "hsl(0, 0%, 35%)" }}>-1</span>
      <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[7px] font-mono" style={{ color: "hsl(0, 0%, 35%)" }}>+1</span>
      {/* Indicator */}
      <div
        className="absolute top-0.5 bottom-0.5 w-2 rounded-full"
        style={{
          left: `calc(${pct}% - 4px)`,
          background: value > 0.01 ? "hsl(160, 55%, 50%)" : value < -0.01 ? "hsl(340, 55%, 50%)" : "hsl(200, 50%, 50%)",
          boxShadow: `0 0 6px ${value > 0.01 ? "hsla(160, 55%, 50%, 0.5)" : value < -0.01 ? "hsla(340, 55%, 50%, 0.5)" : "hsla(200, 50%, 50%, 0.5)"}`,
        }}
      />
    </div>
  );
}

/* ── Empty State ────────────────────────────────────────── */

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4" style={{ color: "hsl(0, 0%, 40%)" }}>
      <Atom className="w-12 h-12" style={{ color: "hsla(200, 40%, 50%, 0.25)" }} strokeWidth={1} />
      <div className="text-center space-y-2">
        <p className="text-sm font-medium" style={{ color: "hsl(0, 0%, 50%)" }}>Build a circuit, then click Run</p>
        <div className="text-[11px] leading-relaxed max-w-sm" style={{ color: "hsl(0, 0%, 40%)" }}>
          <p>1. Choose number of qubits (start with 1)</p>
          <p>2. Click a gate from the palette, then click a wire to place it</p>
          <p>3. Set your observable (Pauli Z, X, or Y)</p>
          <p>4. Click <strong>Run Circuit</strong> to see exact expectation values</p>
        </div>
        <p className="text-[10px] mt-3" style={{ color: "hsl(0, 0%, 35%)" }}>
          Tip: Try "Load Example → |+⟩ Superposition" to start
        </p>
      </div>
    </div>
  );
}

/* ── Code Panel ─────────────────────────────────────────── */

function CodePanel({ code, onCopy, copied }: { code: string; onCopy: () => void; copied: boolean }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold" style={{ color: "hsl(200, 60%, 70%)" }}>
            PennyLane Equivalent
          </span>
          <p className="text-[10px] mt-0.5" style={{ color: "hsl(0, 0%, 45%)" }}>
            This is the exact same circuit in PennyLane syntax. Copy and run on any quantum hardware.
          </p>
        </div>
        <button
          onClick={onCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs"
          style={{
            background: "hsla(200, 30%, 50%, 0.1)",
            color: copied ? "hsl(120, 50%, 55%)" : "hsl(200, 60%, 70%)",
          }}
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre
        className="text-xs font-mono p-4 rounded-lg overflow-x-auto leading-relaxed"
        style={{
          background: "hsla(220, 15%, 6%, 0.6)",
          color: "hsl(0, 0%, 80%)",
          border: "1px solid hsla(200, 20%, 50%, 0.08)",
        }}
      >
        {highlightPython(code)}
      </pre>
    </div>
  );
}

/* ── Python syntax highlighter ──────────────────────────── */

function highlightPython(code: string): React.ReactNode {
  const lines = code.split("\n");
  return lines.map((line, i) => {
    const parts: React.ReactNode[] = [];
    let rest = line;
    let key = 0;

    // Comments
    if (rest.trimStart().startsWith("#")) {
      return <div key={i}><span style={{ color: "hsl(120, 25%, 50%)" }}>{rest}</span></div>;
    }

    // Keywords
    rest = rest.replace(
      /\b(import|from|def|return|as)\b/g,
      (match) => `\x01kw:${match}\x02`
    );
    // Decorators
    rest = rest.replace(/@\w+/g, (match) => `\x01dec:${match}\x02`);
    // Strings
    rest = rest.replace(/"[^"]*"/g, (match) => `\x01str:${match}\x02`);
    // Numbers
    rest = rest.replace(/\b(\d+\.?\d*)\b/g, (match) => `\x01num:${match}\x02`);

    const tokens = rest.split(/(\x01[^:]+:[^\x02]+\x02)/g);
    for (const token of tokens) {
      const m = token.match(/\x01([^:]+):([^\x02]+)\x02/);
      if (m) {
        const [, type, text] = m;
        const colors: Record<string, string> = {
          kw: "hsl(280, 50%, 65%)",
          dec: "hsl(45, 60%, 55%)",
          str: "hsl(120, 40%, 55%)",
          num: "hsl(200, 60%, 65%)",
        };
        parts.push(<span key={key++} style={{ color: colors[type] || "hsl(0, 0%, 80%)" }}>{text}</span>);
      } else {
        parts.push(<span key={key++}>{token}</span>);
      }
    }

    return <div key={i}>{parts}</div>;
  });
}
