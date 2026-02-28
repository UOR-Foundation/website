/**
 * Quantum Workspace — First-Principles Quantum Validation Lab
 * ════════════════════════════════════════════════════════════
 *
 * An interactive environment for rigorous validation of Hologram's
 * virtual qubit implementation. Includes both a visual circuit builder
 * and a PennyLane code editor for writing and executing custom circuits.
 *
 * Powered entirely by the Q-Simulator (statevector engine).
 */

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { X, Plus, Minus, Play, RotateCcw, Copy, Check, Trash2, Atom, Zap, Timer, Layers, FlaskConical, Info, TrendingUp, Code2, FileDown, FileText, Braces, ChevronDown } from "lucide-react";
import {
  createState,
  simulateCircuit,
  measure,
  expectationValue,
  getStateProbabilities,
  vonNeumannEntropy,
  entanglementMap,
  toOpenQASM,
  drawCircuitASCII,
  type SimOp,
  type PauliOp,
  type Complex,
} from "@/hologram/kernel/q-simulator";
import {
  executePennyLane,
  generateReport,
  PENNYLANE_EXAMPLES,
  type PennyLaneResult,
} from "@/modules/hologram-ui/quantum/pennylane-interpreter";

/* ── Types ─────────────────────────────────────────────── */

interface GateDef {
  id: string;
  label: string;
  qubits: number;
  parameterized?: boolean;
  description: string;
  color: string;
  category: "pauli" | "phase" | "rotation" | "entangling";
}

const GATE_PALETTE: GateDef[] = [
  { id: "h",    label: "H",    qubits: 1, description: "Hadamard — creates equal superposition of |0⟩ and |1⟩", color: "hsl(200, 60%, 55%)", category: "pauli" },
  { id: "x",    label: "X",    qubits: 1, description: "Pauli-X — bit flip (quantum NOT gate)", color: "hsl(340, 55%, 55%)", category: "pauli" },
  { id: "y",    label: "Y",    qubits: 1, description: "Pauli-Y — combined bit and phase flip", color: "hsl(280, 50%, 55%)", category: "pauli" },
  { id: "z",    label: "Z",    qubits: 1, description: "Pauli-Z — phase flip (leaves |0⟩, flips |1⟩ sign)", color: "hsl(160, 50%, 50%)", category: "pauli" },
  { id: "s",    label: "S",    qubits: 1, description: "S gate — √Z, applies π/2 phase rotation", color: "hsl(45, 55%, 50%)", category: "phase" },
  { id: "t",    label: "T",    qubits: 1, description: "T gate — π/8 phase gate, key for universal computation", color: "hsl(30, 60%, 50%)", category: "phase" },
  { id: "ry",   label: "RY",   qubits: 1, parameterized: true, description: "Y-axis rotation by angle θ", color: "hsl(280, 50%, 55%)", category: "rotation" },
  { id: "rx",   label: "RX",   qubits: 1, parameterized: true, description: "X-axis rotation by angle θ", color: "hsl(340, 55%, 55%)", category: "rotation" },
  { id: "rz",   label: "RZ",   qubits: 1, parameterized: true, description: "Z-axis rotation by angle θ", color: "hsl(160, 50%, 50%)", category: "rotation" },
  { id: "cx",   label: "CNOT", qubits: 2, description: "Controlled-NOT — flips target when control is |1⟩", color: "hsl(220, 55%, 55%)", category: "entangling" },
  { id: "cz",   label: "CZ",   qubits: 2, description: "Controlled-Z — applies phase flip when both qubits are |1⟩", color: "hsl(160, 50%, 50%)", category: "entangling" },
  { id: "swap", label: "SWAP", qubits: 2, description: "Swap — exchanges the quantum states of two qubits", color: "hsl(30, 55%, 50%)", category: "entangling" },
];

interface CircuitGate { id: string; gateId: string; wires: number[]; params?: number[] }
interface MeasurementConfig { qubit: number; observable: PauliOp }

/* ── Helpers ───────────────────────────────────────────── */

function fmtComplex(c: Complex): string {
  const [r, im] = c;
  if (Math.abs(im) < 1e-10) return r.toFixed(4);
  if (Math.abs(r) < 1e-10) return `${im.toFixed(4)}i`;
  return im >= 0 ? `${r.toFixed(4)} + ${im.toFixed(4)}i` : `${r.toFixed(4)} − ${Math.abs(im).toFixed(4)}i`;
}

let gateCounter = 0;
function nextGateId() { return `g${++gateCounter}`; }

function parseAngle(input: string): number {
  const s = input.trim();
  if (s === "π" || s === "pi") return Math.PI;
  if (s === "π/2" || s === "pi/2") return Math.PI / 2;
  if (s === "π/4" || s === "pi/4") return Math.PI / 4;
  if (s === "π/3" || s === "pi/3") return Math.PI / 3;
  if (s === "π/6" || s === "pi/6") return Math.PI / 6;
  if (s === "2π" || s === "2pi") return 2 * Math.PI;
  if (s === "-π" || s === "-pi") return -Math.PI;
  if (s === "-π/2" || s === "-pi/2") return -Math.PI / 2;
  const n = parseFloat(s);
  return isNaN(n) ? Math.PI / 4 : n;
}

/* ── Shared Styles ─────────────────────────────────────── */

const FONT = "'DM Sans', system-ui, sans-serif";
const MONO = "'SF Mono', 'Fira Code', 'Cascadia Code', monospace";
const C = {
  bg: "hsl(220, 14%, 8%)",
  surface: "hsl(220, 14%, 10%)",
  surfaceAlt: "hsl(220, 12%, 12%)",
  border: "hsla(200, 30%, 50%, 0.1)",
  borderLight: "hsla(200, 30%, 50%, 0.06)",
  accent: "hsl(200, 60%, 55%)",
  accentMuted: "hsl(200, 40%, 45%)",
  text: "hsl(0, 0%, 92%)",
  textSecondary: "hsl(0, 0%, 70%)",
  textMuted: "hsl(0, 0%, 52%)",
  textDim: "hsl(0, 0%, 38%)",
  green: "hsl(152, 55%, 52%)",
  red: "hsl(340, 55%, 55%)",
  gold: "hsl(38, 60%, 60%)",
} as const;

type WorkspaceMode = "visual" | "code";

/* ── Main Component ────────────────────────────────────── */

export default function QuantumWorkspace({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<WorkspaceMode>("visual");

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: FONT, background: C.bg }}>
      {/* ── Header ───────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-6 py-4 shrink-0"
        style={{ background: C.surface, borderBottom: `1px solid ${C.border}` }}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "hsla(200, 60%, 55%, 0.12)" }}>
            <Atom className="w-5 h-5" style={{ color: C.accent }} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight" style={{ color: C.text }}>
              Quantum Workspace
            </h1>
            <p className="text-sm" style={{ color: C.textMuted }}>
              First-Principles Validation · Hologram Virtual Qubits
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Mode toggle */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
            <button
              onClick={() => setMode("visual")}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors"
              style={{
                background: mode === "visual" ? "hsla(200, 60%, 55%, 0.15)" : "transparent",
                color: mode === "visual" ? C.accent : C.textMuted,
              }}
            >
              <FlaskConical className="w-4 h-4" /> Visual Builder
            </button>
            <button
              onClick={() => setMode("code")}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors"
              style={{
                background: mode === "code" ? "hsla(200, 60%, 55%, 0.15)" : "transparent",
                color: mode === "code" ? C.accent : C.textMuted,
              }}
            >
              <Code2 className="w-4 h-4" /> PennyLane Code
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors"
            style={{ color: C.textMuted }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── Content ──────────────────────────────────── */}
      {mode === "visual" ? <VisualBuilder onClose={onClose} /> : <CodeLab />}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   CODE LAB — PennyLane Code Editor & Executor
   ════════════════════════════════════════════════════════════ */

function CodeLab() {
  const [code, setCode] = useState(PENNYLANE_EXAMPLES[0].code);
  const [result, setResult] = useState<PennyLaneResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [exampleMenuOpen, setExampleMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const runCode = useCallback(() => {
    setIsRunning(true);
    // Use setTimeout to let UI update
    setTimeout(() => {
      const r = executePennyLane(code);
      setResult(r);
      setIsRunning(false);
    }, 10);
  }, [code]);

  const handleExport = useCallback((format: "markdown" | "json") => {
    if (!result) return;
    const content = generateReport(result, format);
    const ext = format === "json" ? "json" : "md";
    const mimeType = format === "json" ? "application/json" : "text/markdown";
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quantum-report-${result.numQubits}q-${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    setExportMenuOpen(false);
  }, [result]);

  const loadExample = useCallback((idx: number) => {
    setCode(PENNYLANE_EXAMPLES[idx].code);
    setResult(null);
    setExampleMenuOpen(false);
  }, []);

  // Handle Tab key in textarea
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newVal = code.substring(0, start) + "    " + code.substring(end);
      setCode(newVal);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      }, 0);
    }
    // Ctrl/Cmd+Enter to run
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      runCode();
    }
  }, [code, runCode]);

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* ─── LEFT: Code Editor ──────────────────────── */}
      <div className="flex flex-col" style={{ width: "48%", borderRight: `1px solid ${C.borderLight}` }}>
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: `1px solid ${C.borderLight}` }}>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold" style={{ color: C.textSecondary }}>
              PennyLane Python
            </span>
            <span className="text-xs px-2 py-0.5 rounded" style={{ background: "hsla(200, 40%, 50%, 0.1)", color: C.accentMuted }}>
              Executed via Q-Simulator
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Examples dropdown */}
            <div className="relative">
              <button
                onClick={() => setExampleMenuOpen(v => !v)}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors hover:bg-white/5"
                style={{ color: C.accent, border: `1px solid ${C.borderLight}` }}
              >
                Examples <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {exampleMenuOpen && (
                <>
                  <div className="fixed inset-0 z-[10]" onClick={() => setExampleMenuOpen(false)} />
                  <div
                    className="absolute right-0 top-full mt-1 w-80 rounded-xl overflow-hidden z-[11] shadow-xl"
                    style={{ background: C.surfaceAlt, border: `1px solid ${C.border}` }}
                  >
                    {PENNYLANE_EXAMPLES.map((ex, i) => (
                      <button
                        key={i}
                        onClick={() => loadExample(i)}
                        className="w-full text-left px-4 py-3 transition-colors hover:bg-white/5"
                        style={{ borderBottom: i < PENNYLANE_EXAMPLES.length - 1 ? `1px solid ${C.borderLight}` : "none" }}
                      >
                        <span className="text-sm font-medium block" style={{ color: C.text }}>{ex.name}</span>
                        <span className="text-xs" style={{ color: C.textMuted }}>{ex.description}</span>
                        {ex.hint && (
                          <span className="text-xs block mt-1" style={{ color: C.gold }}>💡 {ex.hint}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Code textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={code}
            onChange={e => setCode(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full h-full resize-none p-5 outline-none"
            style={{
              fontFamily: MONO,
              fontSize: "14px",
              lineHeight: "1.7",
              background: "hsla(220, 15%, 5%, 0.5)",
              color: C.textSecondary,
              caretColor: C.accent,
              tabSize: 4,
            }}
            spellCheck={false}
            placeholder="Write your PennyLane code here..."
          />
        </div>

        {/* Run bar */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderTop: `1px solid ${C.borderLight}` }}>
          <button
            onClick={runCode}
            disabled={isRunning}
            className="flex items-center gap-2.5 px-6 py-3 rounded-xl text-base font-semibold transition-all duration-200 hover:brightness-110 disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, hsl(200, 60%, 50%), hsl(220, 60%, 50%))",
              color: "hsl(0, 0%, 100%)",
              boxShadow: "0 4px 20px hsla(200, 60%, 50%, 0.3)",
            }}
          >
            {isRunning ? (
              <><Timer className="w-5 h-5 animate-spin" /> Executing…</>
            ) : (
              <><Play className="w-5 h-5" /> Run Code</>
            )}
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: C.textDim }}>
              ⌘+Enter to run
            </span>

            {/* Export */}
            {result && result.success && (
              <div className="relative">
                <button
                  onClick={() => setExportMenuOpen(v => !v)}
                  className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg transition-colors hover:bg-white/5"
                  style={{ color: C.gold, border: `1px solid hsla(38, 50%, 50%, 0.2)` }}
                >
                  <FileDown className="w-4 h-4" /> Export
                </button>
                {exportMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-[10]" onClick={() => setExportMenuOpen(false)} />
                    <div
                      className="absolute right-0 bottom-full mb-1 w-56 rounded-xl overflow-hidden z-[11] shadow-xl"
                      style={{ background: C.surfaceAlt, border: `1px solid ${C.border}` }}
                    >
                      <button
                        onClick={() => handleExport("markdown")}
                        className="w-full flex items-center gap-3 text-left px-4 py-3 transition-colors hover:bg-white/5"
                        style={{ borderBottom: `1px solid ${C.borderLight}` }}
                      >
                        <FileText className="w-4 h-4" style={{ color: C.accent }} />
                        <div>
                          <span className="text-sm font-medium block" style={{ color: C.text }}>Markdown Report</span>
                          <span className="text-xs" style={{ color: C.textMuted }}>Full audit trail (.md)</span>
                        </div>
                      </button>
                      <button
                        onClick={() => handleExport("json")}
                        className="w-full flex items-center gap-3 text-left px-4 py-3 transition-colors hover:bg-white/5"
                      >
                        <Braces className="w-4 h-4" style={{ color: C.accent }} />
                        <div>
                          <span className="text-sm font-medium block" style={{ color: C.text }}>JSON Data</span>
                          <span className="text-xs" style={{ color: C.textMuted }}>Machine-readable (.json)</span>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── RIGHT: Results ─────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {result ? (
          <CodeLabResults result={result} />
        ) : (
          <CodeLabEmpty />
        )}
      </div>
    </div>
  );
}

/* ── Code Lab Results ──────────────────────────────────── */

function CodeLabResults({ result }: { result: PennyLaneResult }) {
  const [activeSection, setActiveSection] = useState<"output" | "state" | "qasm">("output");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tabs */}
      <div className="flex items-center px-5 shrink-0" style={{ borderBottom: `1px solid ${C.borderLight}` }}>
        {([
          { key: "output" as const, label: "Output & Analysis" },
          { key: "state" as const, label: "Statevector" },
          { key: "qasm" as const, label: "OpenQASM" },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveSection(tab.key)}
            className="px-5 py-3.5 text-sm font-medium transition-colors"
            style={{
              color: activeSection === tab.key ? C.accent : C.textMuted,
              borderBottom: activeSection === tab.key ? `2px solid ${C.accent}` : "2px solid transparent",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: "thin" }}>
        {activeSection === "output" && (
          <div className="space-y-6">
            {/* Status */}
            <div
              className="px-4 py-3 rounded-xl"
              style={{
                background: result.success ? "hsla(152, 40%, 50%, 0.06)" : "hsla(340, 40%, 50%, 0.06)",
                border: `1px solid ${result.success ? "hsla(152, 40%, 50%, 0.1)" : "hsla(340, 40%, 50%, 0.1)"}`,
              }}
            >
              <div className="flex items-center gap-3 mb-1">
                <span className="text-sm font-semibold" style={{ color: result.success ? C.green : C.red, fontFamily: MONO }}>
                  {result.success ? "✓ Executed Successfully" : "✗ Execution Failed"}
                </span>
              </div>
              <div className="flex items-center gap-5 text-sm" style={{ color: C.textMuted }}>
                <span>{result.numQubits} qubit{result.numQubits > 1 ? "s" : ""}</span>
                <span>{(1 << result.numQubits).toLocaleString()} amplitudes</span>
                <span>{result.gateCount} gates</span>
                <span style={{ color: result.executionTimeMs < 10 ? C.green : result.executionTimeMs < 100 ? C.gold : C.textMuted }}>
                  {result.executionTimeMs < 1 ? `${(result.executionTimeMs * 1000).toFixed(0)}µs` : `${result.executionTimeMs.toFixed(2)}ms`}
                </span>
              </div>
            </div>

            {/* Console output */}
            <div>
              <h3 className="text-base font-semibold mb-3" style={{ color: C.accent }}>Console Output</h3>
              <pre
                className="text-sm p-4 rounded-xl overflow-x-auto leading-relaxed"
                style={{ background: "hsla(220, 15%, 5%, 0.5)", color: C.textSecondary, fontFamily: MONO }}
              >
                {result.output.join("\n")}
              </pre>
            </div>

            {/* Expectation Values */}
            {result.expectations.length > 0 && (
              <div>
                <h3 className="text-base font-semibold mb-3" style={{ color: C.accent }}>
                  Expectation Values — Exact ⟨ψ|O|ψ⟩
                </h3>
                <div className="space-y-3">
                  {result.expectations.map((exp, i) => (
                    <div key={i} className="p-4 rounded-xl" style={{ background: "hsla(200, 30%, 50%, 0.04)", border: `1px solid ${C.borderLight}` }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm" style={{ color: C.textSecondary, fontFamily: MONO }}>
                          ⟨Pauli{exp.observable}⟩ on qubit {exp.qubit}
                        </span>
                        <span className="text-2xl font-bold" style={{
                          color: exp.value > 0.01 ? C.green : exp.value < -0.01 ? C.red : C.textMuted,
                          fontFamily: MONO,
                        }}>
                          {exp.value >= 0 ? "+" : ""}{exp.value.toFixed(8)}
                        </span>
                      </div>
                      <ExpectationBar value={exp.value} />
                      <p className="text-sm mt-2" style={{ color: C.textDim }}>
                        {exp.observable === "Z" && "Computational basis: +1 → |0⟩, −1 → |1⟩, 0 → equal superposition"}
                        {exp.observable === "X" && "Superposition coherence: +1 → |+⟩, −1 → |−⟩"}
                        {exp.observable === "Y" && "Circular polarization: +1 → |+i⟩, −1 → |−i⟩"}
                        {exp.observable === "I" && "Identity: always 1.0 (normalization check)"}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-4 rounded-xl text-sm leading-relaxed" style={{ background: "hsla(200, 20%, 50%, 0.03)", color: C.textMuted }}>
                  <div className="flex gap-2.5 items-start">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: C.accent }} />
                    <div>
                      <strong style={{ color: C.accent }}>Precision note:</strong> These are <em>exact</em> analytical
                      values computed via statevector inner product ⟨ψ|O|ψ⟩, not statistical estimates.
                      On physical hardware, achieving 8-digit precision would require &gt;10<sup>16</sup> measurement shots.
                      Hologram computes this in {result.executionTimeMs < 1 ? "sub-millisecond" : `${result.executionTimeMs.toFixed(1)}ms`} time
                      across {(1 << result.numQubits).toLocaleString()} amplitudes.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Measurement Histogram */}
            {result.counts && (
              <div>
                <h3 className="text-base font-semibold mb-3" style={{ color: C.accent }}>Measurement Histogram</h3>
                <p className="text-sm mb-3" style={{ color: C.textDim }}>
                  Born-rule sampling · {Object.values(result.counts).reduce((a, b) => a + b, 0).toLocaleString()} shots
                </p>
                <div className="space-y-1.5">
                  {Object.entries(result.counts)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 32)
                    .map(([bits, count]) => {
                      const total = Object.values(result.counts!).reduce((a, b) => a + b, 0);
                      const pct = (count / total) * 100;
                      return (
                        <div key={bits} className="flex items-center gap-3 px-3 py-1.5">
                          <span className="text-sm w-20 shrink-0" style={{ color: C.accent, fontFamily: MONO }}>|{bits}⟩</span>
                          <div className="flex-1 h-6 rounded-lg overflow-hidden" style={{ background: "hsla(200, 20%, 50%, 0.05)" }}>
                            <div className="h-full rounded-lg flex items-center px-3"
                              style={{ width: `${Math.max(pct, 3)}%`, background: "hsl(200, 55%, 48%)", minWidth: 28 }}
                            >
                              <span className="text-xs font-semibold" style={{ color: "hsl(0, 0%, 100%)", fontFamily: MONO }}>{count}</span>
                            </div>
                          </div>
                          <span className="text-sm w-16 text-right" style={{ color: C.textMuted, fontFamily: MONO }}>{pct.toFixed(1)}%</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Quantum Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl" style={{ background: "hsla(200, 20%, 50%, 0.03)", border: `1px solid ${C.borderLight}` }}>
                <span className="text-sm block mb-2" style={{ color: C.textMuted }}>Von Neumann Entropy</span>
                <span className="text-xl font-semibold" style={{ color: C.accent, fontFamily: MONO }}>S = {result.entropy.toFixed(6)}</span>
                <span className="text-sm ml-1" style={{ color: C.textDim }}>bits</span>
              </div>
              {result.entanglement.length > 0 && (
                <div className="p-4 rounded-xl" style={{ background: "hsla(200, 20%, 50%, 0.03)", border: `1px solid ${C.borderLight}` }}>
                  <span className="text-sm block mb-2" style={{ color: C.textMuted }}>Entanglement (Purity)</span>
                  <div className="space-y-1">
                    {result.entanglement.map(e => (
                      <div key={e.qubit} className="flex items-center justify-between">
                        <span className="text-sm" style={{ fontFamily: MONO, color: C.textSecondary }}>q{e.qubit}</span>
                        <span className="text-sm font-medium" style={{ fontFamily: MONO, color: e.entangled ? C.red : C.green }}>
                          {e.purity.toFixed(4)} {e.entangled ? "⚡" : "○"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className="p-4 rounded-xl" style={{ background: "hsla(38, 40%, 50%, 0.06)", border: "1px solid hsla(38, 40%, 50%, 0.1)" }}>
                <span className="text-sm font-semibold block mb-2" style={{ color: C.gold }}>⚠ Parser Warnings</span>
                {result.warnings.map((w, i) => (
                  <p key={i} className="text-sm" style={{ color: C.textMuted }}>{w}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === "state" && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold" style={{ color: C.accent }}>Full Statevector |ψ⟩</h3>
            <p className="text-sm" style={{ color: C.textDim }}>
              {result.statevector.length.toLocaleString()} non-zero amplitudes out of {(1 << result.numQubits).toLocaleString()} total
            </p>
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.borderLight}` }}>
              <div className="grid grid-cols-[80px_1fr_100px_150px] gap-2 px-4 py-2 text-xs font-medium" style={{ background: "hsla(200, 20%, 50%, 0.05)", color: C.textDim }}>
                <span>Basis</span><span>Probability</span><span className="text-right">P(%)</span><span className="text-right">Amplitude</span>
              </div>
              {result.statevector.slice(0, 128).map((sv, i) => (
                <div key={i} className="grid grid-cols-[80px_1fr_100px_150px] gap-2 items-center px-4 py-2.5" style={{ background: i % 2 === 0 ? "hsla(200, 20%, 50%, 0.02)" : "transparent" }}>
                  <span className="text-sm" style={{ color: C.accent, fontFamily: MONO }}>|{sv.state}⟩</span>
                  <div className="h-3 rounded-full overflow-hidden" style={{ background: "hsla(200, 20%, 50%, 0.06)" }}>
                    <div className="h-full rounded-full" style={{ width: `${sv.probability * 100}%`, background: "linear-gradient(90deg, hsl(200, 60%, 50%), hsl(220, 60%, 50%))" }} />
                  </div>
                  <span className="text-sm text-right" style={{ color: C.textSecondary, fontFamily: MONO }}>{(sv.probability * 100).toFixed(2)}%</span>
                  <span className="text-sm text-right" style={{ color: C.textMuted, fontFamily: MONO }}>{fmtComplex(sv.amplitude)}</span>
                </div>
              ))}
              {result.statevector.length > 128 && (
                <div className="px-4 py-3 text-sm" style={{ color: C.textDim }}>Showing first 128 of {result.statevector.length.toLocaleString()} amplitudes</div>
              )}
            </div>
          </div>
        )}

        {activeSection === "qasm" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold mb-3" style={{ color: C.accent }}>OpenQASM 3.0</h3>
              <pre className="text-sm p-4 rounded-xl overflow-x-auto leading-relaxed" style={{ background: "hsla(200, 15%, 50%, 0.04)", color: C.textSecondary, fontFamily: MONO }}>
                {result.qasm.join("\n")}
              </pre>
            </div>
            <div>
              <h3 className="text-base font-semibold mb-3" style={{ color: C.accent }}>ASCII Circuit</h3>
              <pre className="text-sm p-4 rounded-xl overflow-x-auto" style={{ background: "hsla(200, 15%, 50%, 0.04)", color: C.textSecondary, fontFamily: MONO }}>
                {result.ascii.join("\n")}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Code Lab Empty State ──────────────────────────────── */

function CodeLabEmpty() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 px-8" style={{ color: C.textDim }}>
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: "hsla(200, 40%, 50%, 0.06)" }}>
        <Code2 className="w-10 h-10" style={{ color: "hsla(200, 40%, 50%, 0.25)" }} strokeWidth={1} />
      </div>
      <div className="text-center space-y-4 max-w-lg">
        <p className="text-lg font-medium" style={{ color: C.textSecondary }}>Write PennyLane code, run it here</p>
        <p className="text-sm leading-relaxed" style={{ color: C.textMuted }}>
          Write or paste any PennyLane circuit in the editor. Your code is transpiled and executed
          on Hologram's statevector engine — the same mathematical operations as <code style={{ fontFamily: MONO }}>default.qubit</code>,
          producing identical results with exact expectation values.
        </p>
        <div className="p-4 rounded-xl text-left" style={{ background: "hsla(38, 30%, 50%, 0.05)", border: "1px solid hsla(38, 30%, 50%, 0.08)" }}>
          <span className="text-sm font-medium block mb-2" style={{ color: C.gold }}>💡 Discovery hints</span>
          <ul className="text-sm space-y-1.5 list-disc list-inside" style={{ color: C.textMuted }}>
            <li>Start with 1 qubit to validate fundamentals (H gate → ⟨Z⟩ = 0)</li>
            <li>Try the Bell state to confirm entanglement detection</li>
            <li>Then scale to 10, 16, 20+ qubits — and notice what happens to execution time</li>
            <li>Compare exported results with your PennyLane installation</li>
          </ul>
        </div>
        <p className="text-sm" style={{ color: C.textDim }}>
          Press <strong>⌘+Enter</strong> to run · Results are exportable as Markdown or JSON
        </p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   VISUAL BUILDER (original circuit builder, now as a sub-component)
   ════════════════════════════════════════════════════════════ */

function VisualBuilder({ onClose }: { onClose: () => void }) {
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
  const [scalingBenchmark, setScalingBenchmark] = useState<{ qubits: number; amplitudes: number; timeMs: number }[] | null>(null);
  const [runningBenchmark, setRunningBenchmark] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

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

  const clearCircuit = useCallback(() => { setCircuit([]); setResults(null); }, []);

  const handleQubitChange = useCallback((delta: number) => {
    setNumQubits(prev => {
      const next = Math.max(1, Math.min(24, prev + delta));
      setCircuit(c => c.filter(g => g.wires.every(w => w < next)));
      setMeasurements(m => m.filter(mm => mm.qubit < next));
      setResults(null);
      return next;
    });
  }, []);

  const handleGatePaletteClick = useCallback((gateDef: GateDef) => {
    if (gateDef.qubits === 1 && numQubits === 1) {
      if (gateDef.parameterized) { setAddingGate(gateDef.id); setSelectedWires([0]); }
      else addGate(gateDef.id, [0]);
    } else { setAddingGate(gateDef.id); setSelectedWires([]); }
  }, [numQubits, addGate]);

  const handleWireClick = useCallback((wire: number) => {
    if (!addingGate) return;
    const gateDef = GATE_PALETTE.find(g => g.id === addingGate);
    if (!gateDef) return;
    const newWires = [...selectedWires, wire];
    if (newWires.length === gateDef.qubits) {
      if (gateDef.parameterized) addGate(gateDef.id, newWires, [parseAngle(paramInput)]);
      else addGate(gateDef.id, newWires);
    } else setSelectedWires(newWires);
  }, [addingGate, selectedWires, paramInput, addGate]);

  const runCircuit = useCallback(() => {
    const t0 = performance.now();
    const state = createState(numQubits);
    state.ops = circuit.map(g => ({ gate: g.gateId, qubits: g.wires, params: g.params }));
    simulateCircuit(state);
    const statevector = getStateProbabilities(state);
    const expectations = measurements.map(m => ({ qubit: m.qubit, observable: m.observable, value: expectationValue(state, m.qubit, m.observable) }));
    const counts = measure(state, shots);
    const entropy = vonNeumannEntropy(state);
    const ent = numQubits > 1 ? entanglementMap(state) : [];
    const qasm = toOpenQASM(state);
    const ascii = drawCircuitASCII(state);
    const executionTime = performance.now() - t0;
    simulateCircuit(state);
    setResults({ statevector, expectations, counts, entropy, entanglement: ent, executionTime, qasm, ascii });
    setActiveTab("results");
  }, [numQubits, circuit, measurements, shots]);

  const runScalingBenchmark = useCallback(() => {
    setRunningBenchmark(true);
    const benchResults: { qubits: number; amplitudes: number; timeMs: number }[] = [];
    const schedule = [1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22];
    let i = 0;
    function runNext() {
      if (i >= schedule.length) { setScalingBenchmark(benchResults); setRunningBenchmark(false); return; }
      const q = schedule[i];
      const t0 = performance.now();
      const state = createState(q);
      for (let j = 0; j < q; j++) state.ops.push({ gate: "h", qubits: [j] });
      if (q >= 2) for (let j = 0; j < q - 1; j++) state.ops.push({ gate: "cx", qubits: [j, j + 1] });
      simulateCircuit(state);
      expectationValue(state, 0, "Z");
      const timeMs = performance.now() - t0;
      benchResults.push({ qubits: q, amplitudes: 1 << q, timeMs });
      i++;
      if (timeMs > 3000) { setScalingBenchmark(benchResults); setRunningBenchmark(false); return; }
      setTimeout(runNext, 5);
    }
    runNext();
  }, []);

  /* Export from visual builder */
  const handleVisualExport = useCallback((format: "markdown" | "json") => {
    if (!results) return;
    // Build a PennyLaneResult-compatible object
    const plResult: PennyLaneResult = {
      success: true,
      output: [`Circuit: ${numQubits} qubits, ${circuit.length} gates, ${results.executionTime.toFixed(2)}ms`],
      numQubits,
      gateCount: circuit.length,
      gateDepth: circuit.length,
      executionTimeMs: results.executionTime,
      statevector: results.statevector,
      expectations: results.expectations.map(e => ({ observable: e.observable, qubit: e.qubit, value: e.value })),
      counts: results.counts,
      entropy: results.entropy,
      entanglement: results.entanglement,
      qasm: results.qasm,
      ascii: results.ascii,
      circuitOps: circuit.map(g => ({ gate: g.gateId, qubits: g.wires, params: g.params })),
      warnings: [],
      sourceCode: pennyLaneCode,
      timestamp: new Date().toISOString(),
      engineVersion: "Q-Simulator v1.0 (Hologram Virtual Qubits)",
    };
    const content = generateReport(plResult, format);
    const ext = format === "json" ? "json" : "md";
    const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quantum-report-${numQubits}q-${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    setExportMenuOpen(false);
  }, [results, numQubits, circuit]);

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
        const nm = gateName === "Ry" ? "RY" : gateName === "Rx" ? "RX" : gateName === "Rz" ? "RZ" : gateName;
        lines.push(`    qml.${nm}(${paramStr}, wires=${g.wires.length === 1 ? g.wires[0] : JSON.stringify(g.wires)})`);
      } else if (g.wires.length === 1) {
        lines.push(`    qml.${gateName === "H" ? "Hadamard" : gateName}(wires=${g.wires[0]})`);
      } else {
        lines.push(`    qml.${gateName}(wires=${JSON.stringify(g.wires)})`);
      }
    }
    if (measurements.length > 0) {
      const measStrs = measurements.map(m => `qml.expval(qml.Pauli${m.observable}(${m.qubit}))`);
      lines.push(`    return ${measStrs.length === 1 ? measStrs[0] : measStrs.join(", ")}`);
    } else lines.push("    return qml.state()");
    lines.push("", "# Execute", `result = circuit(${circuit.some(g => g.params) ? "" : ""})`, 'print(f"Result: {result}")');
    return lines.join("\n");
  }, [circuit, numQubits, measurements]);

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(pennyLaneCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [pennyLaneCode]);

  const addMeasurement = useCallback(() => setMeasurements(prev => [...prev, { qubit: 0, observable: "Z" }]), []);
  const removeMeasurement = useCallback((idx: number) => setMeasurements(prev => prev.filter((_, i) => i !== idx)), []);
  const updateMeasurement = useCallback((idx: number, field: "qubit" | "observable", value: number | PauliOp) => {
    setMeasurements(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  }, []);

  const loadExample = useCallback((name: string) => {
    setResults(null);
    if (name === "bell") { setNumQubits(2); setCircuit([{ id: nextGateId(), gateId: "h", wires: [0] }, { id: nextGateId(), gateId: "cx", wires: [0, 1] }]); setMeasurements([{ qubit: 0, observable: "Z" }, { qubit: 1, observable: "Z" }]); }
    else if (name === "superposition") { setNumQubits(1); setCircuit([{ id: nextGateId(), gateId: "h", wires: [0] }]); setMeasurements([{ qubit: 0, observable: "Z" }, { qubit: 0, observable: "X" }]); }
    else if (name === "phase") { setNumQubits(1); setCircuit([{ id: nextGateId(), gateId: "h", wires: [0] }, { id: nextGateId(), gateId: "z", wires: [0] }, { id: nextGateId(), gateId: "h", wires: [0] }]); setMeasurements([{ qubit: 0, observable: "Z" }]); }
    else if (name === "ghz") { setNumQubits(3); setCircuit([{ id: nextGateId(), gateId: "h", wires: [0] }, { id: nextGateId(), gateId: "cx", wires: [0, 1] }, { id: nextGateId(), gateId: "cx", wires: [0, 2] }]); setMeasurements([{ qubit: 0, observable: "Z" }, { qubit: 1, observable: "Z" }, { qubit: 2, observable: "Z" }]); }
  }, []);

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* LEFT: Circuit Builder */}
      <div className="flex flex-col overflow-y-auto" ref={scrollRef} style={{ width: "48%", borderRight: `1px solid ${C.borderLight}`, scrollbarWidth: "thin" }}>
        <Section title="Qubits" icon={<Layers className="w-4 h-4" />}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <IconButton onClick={() => handleQubitChange(-1)} disabled={numQubits <= 1}><Minus className="w-3.5 h-3.5" /></IconButton>
                <span className="w-10 text-center text-lg font-semibold" style={{ color: C.accent, fontFamily: MONO }}>{numQubits}</span>
                <IconButton onClick={() => handleQubitChange(1)} disabled={numQubits >= 24}><Plus className="w-3.5 h-3.5" /></IconButton>
              </div>
              <div className="text-sm" style={{ color: C.textMuted }}>
                <span style={{ fontFamily: MONO }}>2</span><sup>{numQubits}</sup>
                <span className="ml-1">= {(1 << Math.min(numQubits, 24)).toLocaleString()} amplitudes</span>
              </div>
            </div>
            <button onClick={clearCircuit} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors hover:bg-white/5" style={{ color: C.red }}>
              <RotateCcw className="w-3.5 h-3.5" /> Clear
            </button>
          </div>
        </Section>

        <Section title="Circuit" icon={<FlaskConical className="w-4 h-4" />}>
          <CircuitDiagram numQubits={numQubits} circuit={circuit} addingGate={addingGate} selectedWires={selectedWires} onWireClick={handleWireClick} onRemoveGate={removeGate} />
          {circuit.length === 0 && <p className="text-sm mt-3" style={{ color: C.textDim }}>Select a gate below, then click a wire to place it.</p>}
        </Section>

        <Section title="Gate Palette" icon={<Zap className="w-4 h-4" />}
          action={addingGate ? <span className="text-sm px-3 py-1 rounded-lg" style={{ background: "hsla(200, 60%, 50%, 0.12)", color: C.accent }}>Placing {GATE_PALETTE.find(g => g.id === addingGate)?.label} — click wire{GATE_PALETTE.find(g => g.id === addingGate)?.qubits === 2 ? "s" : ""}</span> : null}
        >
          {(["pauli", "phase", "rotation", "entangling"] as const).map(cat => (
            <div key={cat} className="mb-3 last:mb-0">
              <span className="text-xs font-medium uppercase tracking-widest mb-2 block" style={{ color: C.textDim }}>
                {cat === "pauli" ? "Pauli Gates" : cat === "phase" ? "Phase Gates" : cat === "rotation" ? "Rotation Gates" : "Entangling Gates"}
              </span>
              <div className="flex flex-wrap gap-2">
                {GATE_PALETTE.filter(g => g.category === cat).map(g => (
                  <button key={g.id} onClick={() => handleGatePaletteClick(g)} className="rounded-lg text-sm font-semibold transition-all duration-150"
                    style={{ padding: "8px 14px", background: addingGate === g.id ? g.color : "hsla(200, 20%, 50%, 0.06)", color: addingGate === g.id ? "hsl(0, 0%, 100%)" : g.color, border: `1px solid ${addingGate === g.id ? g.color : "hsla(200, 20%, 50%, 0.1)"}`, fontFamily: MONO }}
                    title={g.description}
                  >{g.label}</button>
                ))}
              </div>
            </div>
          ))}
          {addingGate && GATE_PALETTE.find(g => g.id === addingGate)?.parameterized && (
            <div className="flex items-center gap-3 mt-3 p-3 rounded-lg" style={{ background: "hsla(200, 20%, 50%, 0.04)" }}>
              <span className="text-sm font-medium" style={{ color: C.textSecondary }}>θ =</span>
              <input value={paramInput} onChange={e => setParamInput(e.target.value)} className="text-sm px-3 py-2 rounded-lg w-24" style={{ background: "hsla(200, 20%, 50%, 0.08)", border: `1px solid ${C.border}`, color: C.text, fontFamily: MONO }} placeholder="π/4" />
              <span className="text-xs" style={{ color: C.textDim }}>π, π/2, π/4, π/3, etc.</span>
            </div>
          )}
        </Section>

        <Section title="Observables" subtitle="⟨ψ|O|ψ⟩" icon={<TrendingUp className="w-4 h-4" />}
          action={<button onClick={addMeasurement} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg hover:bg-white/5" style={{ color: C.accent }}><Plus className="w-3.5 h-3.5" /> Add</button>}
        >
          <div className="space-y-2">
            {measurements.map((m, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "hsla(200, 20%, 50%, 0.03)" }}>
                <span className="text-sm" style={{ color: C.textSecondary, fontFamily: MONO }}>⟨</span>
                <select value={m.observable} onChange={e => updateMeasurement(idx, "observable", e.target.value as PauliOp)} className="text-sm px-2 py-1.5 rounded-lg" style={{ background: "hsla(200, 20%, 50%, 0.06)", border: `1px solid ${C.border}`, color: C.text, fontFamily: MONO }}>
                  <option value="Z">Pauli Z</option><option value="X">Pauli X</option><option value="Y">Pauli Y</option><option value="I">Identity</option>
                </select>
                <span className="text-sm" style={{ color: C.textSecondary, fontFamily: MONO }}>⟩</span>
                <span className="text-sm" style={{ color: C.textMuted }}>on</span>
                <select value={m.qubit} onChange={e => updateMeasurement(idx, "qubit", parseInt(e.target.value))} className="text-sm px-2 py-1.5 rounded-lg" style={{ background: "hsla(200, 20%, 50%, 0.06)", border: `1px solid ${C.border}`, color: C.text, fontFamily: MONO }}>
                  {Array.from({ length: numQubits }, (_, i) => <option key={i} value={i}>qubit {i}</option>)}
                </select>
                {measurements.length > 1 && <button onClick={() => removeMeasurement(idx)} className="ml-auto hover:bg-white/5 p-1 rounded" style={{ color: C.red }}><Trash2 className="w-3.5 h-3.5" /></button>}
              </div>
            ))}
          </div>
        </Section>

        <div className="px-6 py-5" style={{ borderBottom: `1px solid ${C.borderLight}` }}>
          <div className="flex items-center gap-4">
            <button onClick={runCircuit} className="flex items-center gap-2.5 px-6 py-3 rounded-xl text-base font-semibold transition-all hover:brightness-110"
              style={{ background: "linear-gradient(135deg, hsl(200, 60%, 50%), hsl(220, 60%, 50%))", color: "hsl(0, 0%, 100%)", boxShadow: "0 4px 20px hsla(200, 60%, 50%, 0.3)" }}>
              <Play className="w-5 h-5" /> Run Circuit
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: C.textMuted }}>Shots:</span>
              <input type="number" value={shots} onChange={e => setShots(Math.max(1, parseInt(e.target.value) || 1))} className="w-20 text-sm px-3 py-2 rounded-lg"
                style={{ background: "hsla(200, 20%, 50%, 0.06)", border: `1px solid ${C.border}`, color: C.text, fontFamily: MONO }} />
            </div>
            {/* Export */}
            {results && (
              <div className="relative ml-auto">
                <button onClick={() => setExportMenuOpen(v => !v)} className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg hover:bg-white/5"
                  style={{ color: C.gold, border: `1px solid hsla(38, 50%, 50%, 0.2)` }}>
                  <FileDown className="w-4 h-4" /> Export
                </button>
                {exportMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-[10]" onClick={() => setExportMenuOpen(false)} />
                    <div className="absolute right-0 bottom-full mb-1 w-56 rounded-xl overflow-hidden z-[11] shadow-xl" style={{ background: C.surfaceAlt, border: `1px solid ${C.border}` }}>
                      <button onClick={() => handleVisualExport("markdown")} className="w-full flex items-center gap-3 text-left px-4 py-3 hover:bg-white/5" style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                        <FileText className="w-4 h-4" style={{ color: C.accent }} />
                        <div><span className="text-sm font-medium block" style={{ color: C.text }}>Markdown Report</span><span className="text-xs" style={{ color: C.textMuted }}>Full audit trail (.md)</span></div>
                      </button>
                      <button onClick={() => handleVisualExport("json")} className="w-full flex items-center gap-3 text-left px-4 py-3 hover:bg-white/5">
                        <Braces className="w-4 h-4" style={{ color: C.accent }} />
                        <div><span className="text-sm font-medium block" style={{ color: C.text }}>JSON Data</span><span className="text-xs" style={{ color: C.textMuted }}>Machine-readable (.json)</span></div>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <Section title="Scaling Discovery" subtitle="Benchmark beyond classical limits" icon={<TrendingUp className="w-4 h-4" />}>
          <p className="text-sm leading-relaxed mb-4" style={{ color: C.textMuted }}>
            Traditional simulators hit a wall at ~30 qubits. Run this to see how Hologram scales with full superposition + entanglement.
          </p>
          <button onClick={runScalingBenchmark} disabled={runningBenchmark} className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: "hsla(38, 60%, 55%, 0.12)", color: C.gold, border: "1px solid hsla(38, 50%, 50%, 0.2)" }}>
            {runningBenchmark ? <><Timer className="w-4 h-4 animate-spin" /> Running…</> : <><Zap className="w-4 h-4" /> Run Scaling Benchmark</>}
          </button>
          {scalingBenchmark && (
            <div className="mt-4 space-y-2">
              <div className="grid grid-cols-3 gap-1 text-xs font-medium py-2 px-3 rounded-t-lg" style={{ background: "hsla(200, 20%, 50%, 0.06)", color: C.textDim }}>
                <span>Qubits</span><span>Amplitudes</span><span>Time</span>
              </div>
              {scalingBenchmark.map((b, i) => (
                <div key={i} className="grid grid-cols-3 gap-1 text-sm px-3 py-2 rounded-lg" style={{ background: i % 2 === 0 ? "hsla(200, 20%, 50%, 0.02)" : "transparent", fontFamily: MONO }}>
                  <span style={{ color: C.text }}>{b.qubits}</span>
                  <span style={{ color: C.textSecondary }}>{b.amplitudes.toLocaleString()}</span>
                  <span style={{ color: b.timeMs < 100 ? C.green : b.timeMs < 1000 ? C.gold : C.red }}>
                    {b.timeMs < 1 ? `${(b.timeMs * 1000).toFixed(0)}µs` : `${b.timeMs.toFixed(1)}ms`}
                  </span>
                </div>
              ))}
              <div className="p-3 rounded-lg text-sm leading-relaxed" style={{ background: "hsla(38, 30%, 50%, 0.06)", color: C.textMuted }}>
                <strong style={{ color: C.gold }}>Key insight:</strong> Hologram computes <em>exact</em> amplitudes — no sampling noise. The 2<sup>n</sup> scaling is fundamental to quantum mechanics itself.
              </div>
            </div>
          )}
        </Section>
      </div>

      {/* RIGHT: Results */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-0 px-5 shrink-0" style={{ borderBottom: `1px solid ${C.borderLight}` }}>
          {([{ key: "results" as const, label: "Results" }, { key: "code" as const, label: "PennyLane Code" }, { key: "circuit" as const, label: "OpenQASM" }]).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className="px-5 py-3.5 text-sm font-medium transition-colors"
              style={{ color: activeTab === tab.key ? C.accent : C.textMuted, borderBottom: activeTab === tab.key ? `2px solid ${C.accent}` : "2px solid transparent" }}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: "thin" }}>
          {activeTab === "results" && (results ? <VisualResultsPanel results={results} numQubits={numQubits} /> : <EmptyState />)}
          {activeTab === "code" && <CodePanel code={pennyLaneCode} onCopy={copyCode} copied={copied} />}
          {activeTab === "circuit" && (results ? (
            <div className="space-y-6">
              <div><h3 className="text-sm font-semibold mb-3" style={{ color: C.accent }}>OpenQASM 3.0</h3><pre className="text-sm p-4 rounded-xl overflow-x-auto leading-relaxed" style={{ background: "hsla(200, 15%, 50%, 0.04)", color: C.textSecondary, fontFamily: MONO }}>{results.qasm.join("\n")}</pre></div>
              <div><h3 className="text-sm font-semibold mb-3" style={{ color: C.accent }}>ASCII Circuit</h3><pre className="text-sm p-4 rounded-xl overflow-x-auto" style={{ background: "hsla(200, 15%, 50%, 0.04)", color: C.textSecondary, fontFamily: MONO }}>{results.ascii.join("\n")}</pre></div>
            </div>
          ) : <EmptyState />)}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   Shared Sub-components
   ════════════════════════════════════════════════════════════ */

function Section({ title, subtitle, icon, action, children }: { title: string; subtitle?: string; icon: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="px-6 py-5" style={{ borderBottom: `1px solid ${C.borderLight}` }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span style={{ color: C.accent }}>{icon}</span>
          <div>
            <span className="text-sm font-semibold" style={{ color: C.textSecondary }}>{title}</span>
            {subtitle && <span className="text-xs ml-2" style={{ color: C.textDim }}>{subtitle}</span>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function IconButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5 disabled:opacity-30"
      style={{ background: "hsla(200, 30%, 50%, 0.08)", color: C.textSecondary }}>{children}</button>
  );
}

function CircuitDiagram({ numQubits, circuit, addingGate, selectedWires, onWireClick, onRemoveGate }: {
  numQubits: number; circuit: CircuitGate[]; addingGate: string | null; selectedWires: number[]; onWireClick: (wire: number) => void; onRemoveGate: (id: string) => void;
}) {
  const wireH = 48; const gateW = 48; const padding = 72;
  const svgW = Math.max(450, padding + circuit.length * (gateW + 14) + 120);
  const svgH = numQubits * wireH + 24;
  return (
    <div className="overflow-x-auto rounded-xl" style={{ background: "hsla(220, 15%, 5%, 0.5)" }}>
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ minWidth: svgW }}>
        {Array.from({ length: numQubits }, (_, q) => {
          const y = 12 + q * wireH + wireH / 2;
          const isSelected = selectedWires.includes(q);
          return (
            <g key={q}>
              <line x1={padding} x2={svgW - 24} y1={y} y2={y} stroke={isSelected ? C.accent : "hsla(200, 20%, 50%, 0.18)"} strokeWidth={isSelected ? 2 : 1} />
              <text x={14} y={y + 1} dominantBaseline="middle" fill={C.textMuted} fontSize={14} fontFamily="monospace">q{q}</text>
              <text x={padding - 10} y={y + 1} dominantBaseline="middle" textAnchor="end" fill={C.textDim} fontSize={13} fontFamily="monospace">|0⟩</text>
              {addingGate && <rect x={0} y={y - wireH / 2} width={svgW} height={wireH} fill={!selectedWires.includes(q) ? "hsla(200, 60%, 50%, 0.03)" : "transparent"} style={{ cursor: "pointer" }} onClick={() => onWireClick(q)} />}
            </g>
          );
        })}
        {circuit.map((g, idx) => {
          const x = padding + 12 + idx * (gateW + 14);
          const gateDef = GATE_PALETTE.find(gd => gd.id === g.gateId);
          const color = gateDef?.color || "hsl(200, 50%, 50%)";
          if (g.wires.length === 1) {
            const y = 12 + g.wires[0] * wireH + wireH / 2;
            const label = gateDef?.label || g.gateId.toUpperCase();
            const fullLabel = g.params ? `${label}(${(g.params[0] / Math.PI).toFixed(2)}π)` : label;
            return (<g key={g.id} style={{ cursor: "pointer" }} onClick={() => onRemoveGate(g.id)}><rect x={x - gateW / 2 + 4} y={y - 16} width={gateW - 8 + (g.params ? 24 : 0)} height={32} rx={6} fill={color} opacity={0.9} /><text x={x + 4 + (g.params ? 12 : 0)} y={y + 1} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={g.params ? 10 : 13} fontFamily="monospace" fontWeight="bold">{fullLabel}</text></g>);
          }
          const y0 = 12 + g.wires[0] * wireH + wireH / 2;
          const y1 = 12 + g.wires[1] * wireH + wireH / 2;
          const cx = x + 4;
          if (g.gateId === "cx" || g.gateId === "cnot") {
            return (<g key={g.id} style={{ cursor: "pointer" }} onClick={() => onRemoveGate(g.id)}><line x1={cx} y1={y0} x2={cx} y2={y1} stroke={color} strokeWidth={2} /><circle cx={cx} cy={y0} r={6} fill={color} /><circle cx={cx} cy={y1} r={12} fill="none" stroke={color} strokeWidth={2} /><line x1={cx} y1={y1 - 12} x2={cx} y2={y1 + 12} stroke={color} strokeWidth={2} /><line x1={cx - 12} y1={y1} x2={cx + 12} y2={y1} stroke={color} strokeWidth={2} /></g>);
          }
          return (<g key={g.id} style={{ cursor: "pointer" }} onClick={() => onRemoveGate(g.id)}><line x1={cx} y1={y0} x2={cx} y2={y1} stroke={color} strokeWidth={2} /><rect x={cx - 18} y={Math.min(y0, y1) - 14} width={36} height={Math.abs(y1 - y0) + 28} rx={6} fill={color} opacity={0.12} stroke={color} strokeWidth={1} /><text x={cx} y={(y0 + y1) / 2 + 1} textAnchor="middle" dominantBaseline="middle" fill={color} fontSize={12} fontFamily="monospace" fontWeight="bold">{gateDef?.label || g.gateId.toUpperCase()}</text></g>);
        })}
      </svg>
    </div>
  );
}

function VisualResultsPanel({ results, numQubits }: { results: any; numQubits: number }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-5 px-4 py-3 rounded-xl" style={{ background: "hsla(152, 40%, 50%, 0.06)", border: "1px solid hsla(152, 40%, 50%, 0.1)" }}>
        <span className="text-sm font-semibold" style={{ color: C.green, fontFamily: MONO }}>✓ Executed</span>
        <span className="text-sm" style={{ color: C.textMuted }}>{results.executionTime.toFixed(2)}ms · {numQubits} qubit{numQubits > 1 ? "s" : ""} · {(1 << numQubits).toLocaleString()} amplitudes</span>
      </div>
      {results.expectations.length > 0 && (
        <div>
          <h3 className="text-base font-semibold mb-3" style={{ color: C.accent }}>Expectation Values ⟨ψ|O|ψ⟩</h3>
          <div className="space-y-3">
            {results.expectations.map((exp: any, i: number) => (
              <div key={i} className="p-4 rounded-xl" style={{ background: "hsla(200, 30%, 50%, 0.04)", border: `1px solid ${C.borderLight}` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm" style={{ color: C.textSecondary, fontFamily: MONO }}>⟨Pauli{exp.observable}⟩ on qubit {exp.qubit}</span>
                  <span className="text-2xl font-bold" style={{ color: exp.value > 0.01 ? C.green : exp.value < -0.01 ? C.red : C.textMuted, fontFamily: MONO }}>
                    {exp.value >= 0 ? "+" : ""}{exp.value.toFixed(6)}
                  </span>
                </div>
                <ExpectationBar value={exp.value} />
                <p className="text-sm mt-2" style={{ color: C.textDim }}>
                  {exp.observable === "Z" && "Computational basis: +1 → |0⟩, −1 → |1⟩, 0 → equal superposition"}
                  {exp.observable === "X" && "Superposition coherence: +1 → |+⟩, −1 → |−⟩"}
                  {exp.observable === "Y" && "Circular polarization: +1 → |+i⟩, −1 → |−i⟩"}
                  {exp.observable === "I" && "Identity: always 1.0 (normalization)"}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 rounded-xl text-sm leading-relaxed" style={{ background: "hsla(200, 20%, 50%, 0.03)", color: C.textMuted }}>
            <div className="flex gap-2.5 items-start">
              <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: C.accent }} />
              <span><strong style={{ color: C.accent }}>Precision:</strong> Exact analytical values via ⟨ψ|O|ψ⟩. No sampling noise. {(1 << numQubits).toLocaleString()} operations in {results.executionTime < 1 ? "sub-ms" : `${results.executionTime.toFixed(1)}ms`}.</span>
            </div>
          </div>
        </div>
      )}
      <div>
        <h3 className="text-base font-semibold mb-3" style={{ color: C.accent }}>Statevector |ψ⟩</h3>
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.borderLight}` }}>
          <div className="grid grid-cols-[80px_1fr_100px_150px] gap-2 px-4 py-2 text-xs font-medium" style={{ background: "hsla(200, 20%, 50%, 0.05)", color: C.textDim }}>
            <span>Basis</span><span>Probability</span><span className="text-right">P(%)</span><span className="text-right">Amplitude</span>
          </div>
          {results.statevector.slice(0, 64).map((sv: any, i: number) => (
            <div key={i} className="grid grid-cols-[80px_1fr_100px_150px] gap-2 items-center px-4 py-2.5" style={{ background: i % 2 === 0 ? "hsla(200, 20%, 50%, 0.02)" : "transparent" }}>
              <span className="text-sm" style={{ color: C.accent, fontFamily: MONO }}>|{sv.state}⟩</span>
              <div className="h-3 rounded-full overflow-hidden" style={{ background: "hsla(200, 20%, 50%, 0.06)" }}>
                <div className="h-full rounded-full" style={{ width: `${sv.probability * 100}%`, background: "linear-gradient(90deg, hsl(200, 60%, 50%), hsl(220, 60%, 50%))" }} />
              </div>
              <span className="text-sm text-right" style={{ color: C.textSecondary, fontFamily: MONO }}>{(sv.probability * 100).toFixed(2)}%</span>
              <span className="text-sm text-right" style={{ color: C.textMuted, fontFamily: MONO }}>{fmtComplex(sv.amplitude)}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-base font-semibold mb-3" style={{ color: C.accent }}>Measurement Histogram</h3>
        <div className="space-y-1.5">
          {Object.entries(results.counts).sort(([, a], [, b]) => (b as number) - (a as number)).slice(0, 32).map(([bits, count]) => {
            const total = (Object.values(results.counts) as number[]).reduce((a, b) => a + b, 0);
            const pct = ((count as number) / total) * 100;
            return (
              <div key={bits} className="flex items-center gap-3 px-3 py-1.5">
                <span className="text-sm w-20 shrink-0" style={{ color: C.accent, fontFamily: MONO }}>|{bits}⟩</span>
                <div className="flex-1 h-6 rounded-lg overflow-hidden" style={{ background: "hsla(200, 20%, 50%, 0.05)" }}>
                  <div className="h-full rounded-lg flex items-center px-3" style={{ width: `${Math.max(pct, 3)}%`, background: "hsl(200, 55%, 48%)", minWidth: 28 }}>
                    <span className="text-xs font-semibold" style={{ color: "hsl(0, 0%, 100%)", fontFamily: MONO }}>{count as number}</span>
                  </div>
                </div>
                <span className="text-sm w-16 text-right" style={{ color: C.textMuted, fontFamily: MONO }}>{pct.toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl" style={{ background: "hsla(200, 20%, 50%, 0.03)", border: `1px solid ${C.borderLight}` }}>
          <span className="text-sm block mb-2" style={{ color: C.textMuted }}>Von Neumann Entropy</span>
          <span className="text-xl font-semibold" style={{ color: C.accent, fontFamily: MONO }}>S = {results.entropy.toFixed(4)}</span>
          <span className="text-sm ml-1" style={{ color: C.textDim }}>bits</span>
        </div>
        {results.entanglement.length > 0 && (
          <div className="p-4 rounded-xl" style={{ background: "hsla(200, 20%, 50%, 0.03)", border: `1px solid ${C.borderLight}` }}>
            <span className="text-sm block mb-2" style={{ color: C.textMuted }}>Entanglement (Purity)</span>
            <div className="space-y-1">
              {results.entanglement.map((e: any) => (
                <div key={e.qubit} className="flex items-center justify-between">
                  <span className="text-sm" style={{ fontFamily: MONO, color: C.textSecondary }}>q{e.qubit}</span>
                  <span className="text-sm font-medium" style={{ fontFamily: MONO, color: e.entangled ? C.red : C.green }}>{e.purity.toFixed(4)} {e.entangled ? "⚡" : "○"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ExpectationBar({ value }: { value: number }) {
  const pct = ((value + 1) / 2) * 100;
  return (
    <div className="relative h-4 rounded-full overflow-hidden" style={{ background: "hsla(200, 20%, 50%, 0.06)" }}>
      <div className="absolute left-1/2 top-0 bottom-0 w-px" style={{ background: "hsla(0, 0%, 50%, 0.25)" }} />
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px]" style={{ color: C.textDim, fontFamily: MONO }}>−1</span>
      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px]" style={{ color: C.textDim, fontFamily: MONO }}>+1</span>
      <div className="absolute top-1 bottom-1 w-3 rounded-full" style={{
        left: `calc(${pct}% - 6px)`,
        background: value > 0.01 ? C.green : value < -0.01 ? C.red : C.accent,
        boxShadow: `0 0 8px ${value > 0.01 ? "hsla(152, 55%, 52%, 0.5)" : value < -0.01 ? "hsla(340, 55%, 55%, 0.5)" : "hsla(200, 60%, 55%, 0.5)"}`,
      }} />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5" style={{ color: C.textDim }}>
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: "hsla(200, 40%, 50%, 0.06)" }}>
        <Atom className="w-10 h-10" style={{ color: "hsla(200, 40%, 50%, 0.25)" }} strokeWidth={1} />
      </div>
      <div className="text-center space-y-4 max-w-md">
        <p className="text-lg font-medium" style={{ color: C.textSecondary }}>Build a circuit, then click Run</p>
        <div className="text-sm leading-relaxed space-y-2" style={{ color: C.textMuted }}>
          {["Choose number of qubits (start with 1)", "Click a gate, then click a wire to place it", "Set your observable (Pauli Z, X, Y)", "Click Run Circuit for exact expectation values"].map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0" style={{ background: "hsla(200, 60%, 55%, 0.1)", color: C.accent }}>{i + 1}</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CodePanel({ code, onCopy, copied }: { code: string; onCopy: () => void; copied: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold" style={{ color: C.accent }}>PennyLane Equivalent</h3>
          <p className="text-sm mt-1" style={{ color: C.textMuted }}>Same circuit in PennyLane syntax. Copy and run on any quantum hardware.</p>
        </div>
        <button onClick={onCopy} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: "hsla(200, 30%, 50%, 0.08)", color: copied ? C.green : C.accent, border: `1px solid ${C.borderLight}` }}>
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? "Copied!" : "Copy Code"}
        </button>
      </div>
      <pre className="text-sm p-5 rounded-xl overflow-x-auto leading-relaxed" style={{ background: "hsla(220, 15%, 5%, 0.6)", color: C.textSecondary, border: `1px solid ${C.borderLight}`, fontFamily: MONO }}>
        {highlightPython(code)}
      </pre>
    </div>
  );
}

function highlightPython(code: string): React.ReactNode {
  return code.split("\n").map((line, i) => {
    if (line.trimStart().startsWith("#")) return <div key={i}><span style={{ color: "hsl(120, 25%, 50%)" }}>{line}</span></div>;
    let rest = line;
    rest = rest.replace(/\b(import|from|def|return|as|for|in|range)\b/g, m => `\x01kw:${m}\x02`);
    rest = rest.replace(/@\w+/g, m => `\x01dec:${m}\x02`);
    rest = rest.replace(/"[^"]*"/g, m => `\x01str:${m}\x02`);
    rest = rest.replace(/\b(\d+\.?\d*)\b/g, m => `\x01num:${m}\x02`);
    let key = 0;
    const parts = rest.split(/(\x01[^:]+:[^\x02]+\x02)/g).map(token => {
      const m = token.match(/\x01([^:]+):([^\x02]+)\x02/);
      if (m) {
        const colors: Record<string, string> = { kw: "hsl(280, 50%, 65%)", dec: "hsl(45, 60%, 55%)", str: "hsl(120, 40%, 55%)", num: "hsl(200, 60%, 65%)" };
        return <span key={key++} style={{ color: colors[m[1]] || C.textSecondary }}>{m[2]}</span>;
      }
      return <span key={key++}>{token}</span>;
    });
    return <div key={i}>{parts}</div>;
  });
}
