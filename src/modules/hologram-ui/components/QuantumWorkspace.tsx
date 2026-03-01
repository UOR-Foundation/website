/**
 * Quantum Workspace — IBM Quantum Composer Replica
 * ═════════════════════════════════════════════════
 *
 * Canonical quantum circuit composer matching IBM's layout:
 *   Left:   Operations palette (gate library)
 *   Center: Circuit canvas with qubit wires & drag-drop gates
 *   Right:  OpenQASM code editor
 *   Bottom: Probabilities histogram + Q-sphere visualization
 *
 * All simulation powered by Q-Simulator (statevector engine).
 */

import React, { useState, useCallback, useMemo, useRef, useEffect, type DragEvent } from "react";
import {
  X, Play, Sun, Moon, Undo2, Redo2, Search, SlidersHorizontal, BarChart3,
  Save, Download, Settings, ChevronDown, ChevronRight, Trash2, Plus, Minus,
  Info, Eye, EyeOff, Copy, RotateCcw, Layers, Atom, Cpu, Zap,
} from "lucide-react";
import {
  createState,
  simulateCircuit,
  measure,
  getStateProbabilities,
  toOpenQASM,
  type SimOp,
  type Complex,
} from "@/hologram/kernel/q-simulator";
import { useScreenTheme } from "@/modules/hologram-ui/hooks/useScreenTheme";

/* ═══════════════════════════════════════════════════════════════════════════
   Theme
   ═══════════════════════════════════════════════════════════════════════════ */

interface Theme {
  bg: string; surface: string; surfaceAlt: string; panel: string;
  border: string; borderStrong: string;
  text: string; textSecondary: string; textMuted: string; textDim: string;
  accent: string; accentBg: string;
  wireColor: string; wireBg: string;
  gateH: string; gateCX: string; gatePhase: string; gateRot: string;
  gateSpecial: string; gateMeasure: string; gateMulti: string;
  green: string; red: string; gold: string; purple: string; blue: string;
  shadow: string;
  codeKeyword: string; codeString: string; codeComment: string; codeNumber: string;
  probBar: string;
  sphereBg: string; sphereWire: string; sphereState: string;
}

function makeTheme(dark: boolean): Theme {
  if (dark) return {
    bg: "hsl(220, 20%, 8%)", surface: "hsl(220, 18%, 11%)", surfaceAlt: "hsl(220, 16%, 14%)", panel: "hsl(220, 18%, 10%)",
    border: "hsla(220, 20%, 40%, 0.15)", borderStrong: "hsla(220, 20%, 40%, 0.25)",
    text: "hsl(0, 0%, 92%)", textSecondary: "hsl(0, 0%, 72%)", textMuted: "hsl(0, 0%, 52%)", textDim: "hsl(0, 0%, 38%)",
    accent: "hsl(210, 100%, 55%)", accentBg: "hsla(210, 100%, 55%, 0.12)",
    wireColor: "hsl(0, 0%, 50%)", wireBg: "hsl(220, 16%, 12%)",
    gateH: "hsl(200, 65%, 50%)", gateCX: "hsl(200, 65%, 50%)", gatePhase: "hsl(200, 50%, 55%)",
    gateRot: "hsl(330, 60%, 60%)", gateSpecial: "hsl(0, 0%, 50%)", gateMeasure: "hsl(0, 0%, 70%)",
    gateMulti: "hsl(280, 50%, 55%)",
    green: "hsl(152, 60%, 50%)", red: "hsl(0, 65%, 55%)", gold: "hsl(38, 65%, 55%)", purple: "hsl(280, 55%, 60%)", blue: "hsl(210, 70%, 55%)",
    shadow: "0 2px 12px hsla(0,0%,0%,0.4)",
    codeKeyword: "hsl(280, 60%, 72%)", codeString: "hsl(120, 40%, 60%)", codeComment: "hsl(0, 0%, 50%)", codeNumber: "hsl(30, 70%, 65%)",
    probBar: "hsl(210, 100%, 55%)",
    sphereBg: "hsl(220, 18%, 11%)", sphereWire: "hsla(0, 0%, 60%, 0.3)", sphereState: "hsl(210, 100%, 55%)",
  };
  return {
    bg: "hsl(0, 0%, 100%)", surface: "hsl(0, 0%, 97%)", surfaceAlt: "hsl(0, 0%, 94%)", panel: "hsl(0, 0%, 98%)",
    border: "hsla(0, 0%, 0%, 0.1)", borderStrong: "hsla(0, 0%, 0%, 0.15)",
    text: "hsl(0, 0%, 10%)", textSecondary: "hsl(0, 0%, 35%)", textMuted: "hsl(0, 0%, 50%)", textDim: "hsl(0, 0%, 65%)",
    accent: "hsl(210, 100%, 42%)", accentBg: "hsla(210, 100%, 42%, 0.08)",
    wireColor: "hsl(0, 0%, 60%)", wireBg: "hsl(0, 0%, 98%)",
    gateH: "hsl(200, 60%, 45%)", gateCX: "hsl(200, 60%, 45%)", gatePhase: "hsl(200, 45%, 48%)",
    gateRot: "hsl(330, 55%, 50%)", gateSpecial: "hsl(0, 0%, 55%)", gateMeasure: "hsl(0, 0%, 40%)",
    gateMulti: "hsl(280, 45%, 48%)",
    green: "hsl(152, 55%, 38%)", red: "hsl(0, 60%, 48%)", gold: "hsl(38, 60%, 45%)", purple: "hsl(280, 50%, 50%)", blue: "hsl(210, 65%, 45%)",
    shadow: "0 2px 12px hsla(0,0%,0%,0.1)",
    codeKeyword: "hsl(280, 55%, 40%)", codeString: "hsl(120, 35%, 40%)", codeComment: "hsl(0, 0%, 55%)", codeNumber: "hsl(30, 65%, 45%)",
    probBar: "hsl(210, 100%, 42%)",
    sphereBg: "hsl(0, 0%, 97%)", sphereWire: "hsla(0, 0%, 40%, 0.2)", sphereState: "hsl(210, 100%, 42%)",
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   Gate Definitions
   ═══════════════════════════════════════════════════════════════════════════ */

interface GateDef {
  id: string; label: string; qubits: number; parameterized?: boolean;
  paramCount?: number; description: string; category: string; color: "h" | "cx" | "phase" | "rot" | "special" | "measure" | "multi";
}

const GATE_CATEGORIES: { id: string; label: string; gates: GateDef[] }[] = [
  { id: "common", label: "Common", gates: [
    { id: "h", label: "H", qubits: 1, description: "Hadamard gate", category: "common", color: "h" },
    { id: "cx", label: "CX", qubits: 2, description: "Controlled-NOT (CNOT)", category: "common", color: "cx" },
    { id: "ccx", label: "CCX", qubits: 3, description: "Toffoli gate", category: "common", color: "multi" },
    { id: "swap", label: "SWAP", qubits: 2, description: "SWAP gate", category: "common", color: "cx" },
    { id: "cswap", label: "CSWAP", qubits: 3, description: "Fredkin gate", category: "common", color: "multi" },
    { id: "x", label: "X", qubits: 1, description: "Pauli-X (NOT)", category: "common", color: "rot" },
  ]},
  { id: "paulis", label: "Pauli", gates: [
    { id: "x", label: "X", qubits: 1, description: "Pauli-X (bit flip)", category: "paulis", color: "rot" },
    { id: "y", label: "Y", qubits: 1, description: "Pauli-Y", category: "paulis", color: "rot" },
    { id: "z", label: "Z", qubits: 1, description: "Pauli-Z (phase flip)", category: "paulis", color: "phase" },
    { id: "id", label: "I", qubits: 1, description: "Identity", category: "paulis", color: "special" },
  ]},
  { id: "clifford", label: "Clifford", gates: [
    { id: "h", label: "H", qubits: 1, description: "Hadamard", category: "clifford", color: "h" },
    { id: "s", label: "S", qubits: 1, description: "S gate (√Z)", category: "clifford", color: "phase" },
    { id: "sdg", label: "S†", qubits: 1, description: "S-dagger", category: "clifford", color: "phase" },
    { id: "cx", label: "CX", qubits: 2, description: "Controlled-NOT", category: "clifford", color: "cx" },
    { id: "cz", label: "CZ", qubits: 2, description: "Controlled-Z", category: "clifford", color: "cx" },
    { id: "cy", label: "CY", qubits: 2, description: "Controlled-Y", category: "clifford", color: "cx" },
    { id: "ch", label: "CH", qubits: 2, description: "Controlled-H", category: "clifford", color: "cx" },
  ]},
  { id: "phase", label: "Phase", gates: [
    { id: "t", label: "T", qubits: 1, description: "T gate (π/8)", category: "phase", color: "phase" },
    { id: "tdg", label: "T†", qubits: 1, description: "T-dagger", category: "phase", color: "phase" },
    { id: "p", label: "P", qubits: 1, parameterized: true, description: "Phase gate P(λ)", category: "phase", color: "phase" },
    { id: "rz", label: "RZ", qubits: 1, parameterized: true, description: "Z-rotation RZ(θ)", category: "phase", color: "rot" },
  ]},
  { id: "rotation", label: "Rotation", gates: [
    { id: "rx", label: "RX", qubits: 1, parameterized: true, description: "X-rotation RX(θ)", category: "rotation", color: "rot" },
    { id: "ry", label: "RY", qubits: 1, parameterized: true, description: "Y-rotation RY(θ)", category: "rotation", color: "rot" },
    { id: "rz", label: "RZ", qubits: 1, parameterized: true, description: "Z-rotation RZ(θ)", category: "rotation", color: "rot" },
    { id: "u", label: "U", qubits: 1, parameterized: true, paramCount: 3, description: "Universal U(θ,φ,λ)", category: "rotation", color: "rot" },
    { id: "sx", label: "√X", qubits: 1, description: "√X gate", category: "rotation", color: "rot" },
    { id: "sxdg", label: "√X†", qubits: 1, description: "√X-dagger", category: "rotation", color: "rot" },
  ]},
  { id: "controlled", label: "Controlled", gates: [
    { id: "cx", label: "CX", qubits: 2, description: "CNOT", category: "controlled", color: "cx" },
    { id: "cz", label: "CZ", qubits: 2, description: "CZ", category: "controlled", color: "cx" },
    { id: "ccx", label: "CCX", qubits: 3, description: "Toffoli", category: "controlled", color: "multi" },
    { id: "crx", label: "CRX", qubits: 2, parameterized: true, description: "Controlled-RX", category: "controlled", color: "cx" },
    { id: "cry", label: "CRY", qubits: 2, parameterized: true, description: "Controlled-RY", category: "controlled", color: "cx" },
    { id: "crz", label: "CRZ", qubits: 2, parameterized: true, description: "Controlled-RZ", category: "controlled", color: "cx" },
  ]},
  { id: "special", label: "Special", gates: [
    { id: "barrier", label: "║", qubits: 1, description: "Barrier", category: "special", color: "special" },
    { id: "measure", label: "M", qubits: 1, description: "Measurement", category: "special", color: "measure" },
    { id: "|0>", label: "|0⟩", qubits: 1, description: "Reset to |0⟩", category: "special", color: "special" },
  ]},
];

const ALL_GATES = GATE_CATEGORIES.flatMap(c => c.gates);
function findGateDef(gateId: string): GateDef | undefined {
  return ALL_GATES.find(g => g.id === gateId);
}

function gateColor(def: GateDef | undefined, t: Theme): string {
  if (!def) return t.textMuted;
  switch (def.color) {
    case "h": return t.gateH;
    case "cx": return t.gateCX;
    case "phase": return t.gatePhase;
    case "rot": return t.gateRot;
    case "multi": return t.gateMulti;
    case "measure": return t.gateMeasure;
    case "special": return t.gateSpecial;
    default: return t.textMuted;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   Circuit Data Model
   ═══════════════════════════════════════════════════════════════════════════ */

interface PlacedGate {
  id: string; gateId: string; qubits: number[]; col: number; params?: number[];
}

let _gid = 0;
function gid() { return `gate_${++_gid}`; }

function parseAngle(input: string): number {
  const s = input.trim().toLowerCase();
  if (s === "π" || s === "pi") return Math.PI;
  if (s === "-π" || s === "-pi") return -Math.PI;
  const piMatch = s.match(/^(-?\d*\.?\d*)\s*[*×]?\s*(?:π|pi)\s*(?:\/\s*(\d+))?$/);
  if (piMatch) {
    const coeff = piMatch[1] === "" || piMatch[1] === "-" ? (piMatch[1] === "-" ? -1 : 1) : parseFloat(piMatch[1]);
    const denom = piMatch[2] ? parseInt(piMatch[2]) : 1;
    return (coeff * Math.PI) / denom;
  }
  const piDivMatch = s.match(/^(?:π|pi)\s*\/\s*(\d+)$/);
  if (piDivMatch) return Math.PI / parseInt(piDivMatch[1]);
  const n = parseFloat(s);
  return isNaN(n) ? Math.PI / 4 : n;
}

function formatAngle(v: number): string {
  if (Math.abs(v - Math.PI) < 1e-10) return "π";
  if (Math.abs(v + Math.PI) < 1e-10) return "-π";
  if (Math.abs(v - Math.PI / 2) < 1e-10) return "π/2";
  if (Math.abs(v + Math.PI / 2) < 1e-10) return "-π/2";
  if (Math.abs(v - Math.PI / 4) < 1e-10) return "π/4";
  if (Math.abs(v - Math.PI / 3) < 1e-10) return "π/3";
  return v.toFixed(4);
}

/* ═══════════════════════════════════════════════════════════════════════════
   OpenQASM Code Generation
   ═══════════════════════════════════════════════════════════════════════════ */

function generateQASM(numQubits: number, numClbits: number, gates: PlacedGate[]): string {
  const lines: string[] = [
    "OPENQASM 2.0;",
    'include "qelib1.inc";',
    "",
    `qreg q[${numQubits}];`,
    `creg c[${numClbits}];`,
    "",
  ];
  const sorted = [...gates].sort((a, b) => a.col - b.col || a.qubits[0] - b.qubits[0]);
  for (const g of sorted) {
    if (g.gateId === "barrier") {
      lines.push(`barrier q[${g.qubits[0]}];`);
    } else if (g.gateId === "measure") {
      lines.push(`measure q[${g.qubits[0]}] -> c[${g.qubits[0]}];`);
    } else if (g.gateId === "|0>") {
      lines.push(`reset q[${g.qubits[0]}];`);
    } else if (g.params && g.params.length > 0) {
      const ps = g.params.map(p => formatAngle(p)).join(", ");
      const qs = g.qubits.map(q => `q[${q}]`).join(", ");
      lines.push(`${g.gateId}(${ps}) ${qs};`);
    } else {
      const qs = g.qubits.map(q => `q[${q}]`).join(", ");
      lines.push(`${g.gateId} ${qs};`);
    }
  }
  return lines.join("\n");
}

/* ═══════════════════════════════════════════════════════════════════════════
   QASM Syntax Highlighter
   ═══════════════════════════════════════════════════════════════════════════ */

const QASM_KEYWORDS = new Set(["OPENQASM", "include", "qreg", "creg", "gate", "if", "barrier", "measure", "reset", "opaque"]);
const QASM_GATES = new Set(["h", "x", "y", "z", "cx", "cz", "cy", "ch", "ccx", "swap", "cswap", "s", "sdg", "t", "tdg", "rx", "ry", "rz", "p", "u", "sx", "sxdg", "crx", "cry", "crz", "id"]);

function highlightQASM(code: string, t: Theme): React.ReactNode[] {
  return code.split("\n").map((line, li) => {
    const tokens: React.ReactNode[] = [];
    let i = 0;
    while (i < line.length) {
      if (line.slice(i, i + 2) === "//") {
        tokens.push(<span key={`${li}-${i}`} style={{ color: t.codeComment, fontStyle: "italic" }}>{line.slice(i)}</span>);
        break;
      }
      if (line[i] === '"') {
        let j = i + 1;
        while (j < line.length && line[j] !== '"') j++;
        tokens.push(<span key={`${li}-${i}`} style={{ color: t.codeString }}>{line.slice(i, j + 1)}</span>);
        i = j + 1; continue;
      }
      if (/\d/.test(line[i])) {
        let j = i;
        while (j < line.length && /[\d.]/.test(line[j])) j++;
        tokens.push(<span key={`${li}-${i}`} style={{ color: t.codeNumber }}>{line.slice(i, j)}</span>);
        i = j; continue;
      }
      if (/[a-zA-Z_]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[a-zA-Z0-9_]/.test(line[j])) j++;
        const word = line.slice(i, j);
        if (QASM_KEYWORDS.has(word)) {
          tokens.push(<span key={`${li}-${i}`} style={{ color: t.codeKeyword, fontWeight: 600 }}>{word}</span>);
        } else if (QASM_GATES.has(word)) {
          tokens.push(<span key={`${li}-${i}`} style={{ color: t.accent }}>{word}</span>);
        } else {
          tokens.push(<span key={`${li}-${i}`}>{word}</span>);
        }
        i = j; continue;
      }
      tokens.push(<span key={`${li}-${i}`}>{line[i]}</span>);
      i++;
    }
    return <div key={li}>{tokens.length > 0 ? tokens : "\u00A0"}</div>;
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Probabilities Panel
   ═══════════════════════════════════════════════════════════════════════════ */

function ProbabilitiesPanel({ probs, t }: { probs: { state: string; probability: number }[]; t: Theme }) {
  const sorted = [...probs].sort((a, b) => {
    const ai = parseInt(a.state, 2);
    const bi = parseInt(b.state, 2);
    return ai - bi;
  });
  const maxProb = Math.max(...sorted.map(p => p.probability), 0.01);
  const chartH = 180;
  const barW = sorted.length > 16 ? 12 : sorted.length > 8 ? 20 : 36;
  const gap = sorted.length > 16 ? 2 : 4;
  const totalW = sorted.length * (barW + gap);

  return (
    <div className="h-full flex flex-col" style={{ background: t.panel }}>
      <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: `1px solid ${t.border}` }}>
        <BarChart3 size={14} style={{ color: t.textMuted }} />
        <span className="text-[13px] font-semibold" style={{ color: t.text }}>Probabilities</span>
        <ChevronDown size={12} style={{ color: t.textMuted }} />
        <div className="flex-1" />
        <Info size={14} style={{ color: t.textMuted }} />
      </div>
      <div className="flex-1 flex flex-col justify-end overflow-x-auto px-4 pb-2">
        {sorted.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-sm" style={{ color: t.textDim }}>Run to see probabilities</span>
          </div>
        ) : (
          <>
            {/* Y axis labels */}
            <div className="flex items-end" style={{ height: chartH }}>
              <div className="flex flex-col justify-between h-full pr-2 text-right" style={{ width: 36 }}>
                {[100, 80, 60, 40, 20, 0].map(v => (
                  <span key={v} className="text-[10px] font-mono leading-none" style={{ color: t.textDim }}>{v}</span>
                ))}
              </div>
              {/* Bars */}
              <div className="flex items-end gap-px" style={{ height: chartH }}>
                {sorted.map((p) => {
                  const pct = p.probability * 100;
                  const h = (pct / 100) * chartH;
                  return (
                    <div key={p.state} className="flex flex-col items-center justify-end" style={{ width: barW, height: chartH }}>
                      <div style={{
                        width: barW,
                        height: Math.max(1, h),
                        background: t.probBar,
                        borderRadius: "2px 2px 0 0",
                        transition: "height 300ms",
                      }} />
                    </div>
                  );
                })}
              </div>
            </div>
            {/* X axis labels */}
            <div className="flex" style={{ marginLeft: 36 }}>
              {sorted.map(p => (
                <div key={p.state} className="text-center" style={{ width: barW + gap }}>
                  <span className="text-[9px] font-mono" style={{ color: t.textMuted, writingMode: sorted.length > 8 ? "vertical-lr" : undefined }}>
                    {p.state}
                  </span>
                </div>
              ))}
            </div>
            {/* Axis label */}
            <div className="flex items-center mt-1">
              <span className="text-[10px] font-medium" style={{ color: t.textDim, writingMode: "vertical-lr", transform: "rotate(180deg)", position: "absolute", left: 4 }}>
                Probability (%)
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Q-Sphere Panel (SVG)
   ═══════════════════════════════════════════════════════════════════════════ */

function QSpherePanel({ probs, t }: { probs: { state: string; probability: number; amplitude: Complex }[]; t: Theme }) {
  const [showLabels, setShowLabels] = useState(true);
  const [showPhase, setShowPhase] = useState(false);
  const cx = 160, cy = 140, rx = 100, ry = 40;

  return (
    <div className="h-full flex flex-col" style={{ background: t.panel }}>
      <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: `1px solid ${t.border}` }}>
        <Atom size={14} style={{ color: t.textMuted }} />
        <span className="text-[13px] font-semibold" style={{ color: t.text }}>Q-sphere</span>
        <ChevronDown size={12} style={{ color: t.textMuted }} />
        <div className="flex-1" />
        <Info size={14} style={{ color: t.textMuted }} />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-2">
        <svg width={320} height={260} viewBox="0 0 320 260" className="w-full max-w-[320px]">
          {/* Sphere wireframe */}
          <ellipse cx={cx} cy={cy + 40} rx={rx} ry={ry} fill="none" stroke={t.sphereWire} strokeWidth={1} />
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={t.sphereWire} strokeWidth={1} />
          <line x1={cx} y1={cy - 80} x2={cx} y2={cy + 80} stroke={t.sphereWire} strokeWidth={1} />
          <line x1={cx - rx} y1={cy} x2={cx + rx} y2={cy} stroke={t.sphereWire} strokeWidth={1} strokeDasharray="4,3" />
          {/* States plotted on sphere */}
          {probs.filter(p => p.probability > 0.005).map((p, i) => {
            const n = p.state.length;
            const hammingWeight = p.state.split("").filter(b => b === "1").length;
            const theta = (hammingWeight / n) * Math.PI;
            const phase = Math.atan2(p.amplitude[1], p.amplitude[0]);
            const sphereY = cy - 80 * Math.cos(theta);
            const sphereX = cx + rx * Math.sin(theta) * Math.cos(phase);
            const r = 3 + p.probability * 12;
            const hue = ((phase + Math.PI) / (2 * Math.PI)) * 360;
            return (
              <g key={i}>
                <line x1={cx} y1={cy - 80 * Math.cos(theta)} x2={sphereX} y2={sphereY}
                  stroke={t.sphereWire} strokeWidth={0.5} />
                <circle cx={sphereX} cy={sphereY} r={r}
                  fill={showPhase ? `hsl(${hue}, 70%, 55%)` : t.sphereState}
                  stroke="white" strokeWidth={1} opacity={0.9} />
                {showLabels && p.probability > 0.01 && (
                  <text x={sphereX} y={sphereY - r - 4} textAnchor="middle" fontSize={9}
                    fill={t.textMuted} fontFamily="monospace">
                    |{p.state}⟩
                  </text>
                )}
              </g>
            );
          })}
          {probs.length === 0 && (
            <text x={cx} y={cy} textAnchor="middle" fontSize={12} fill={t.textDim}>Run to visualize</text>
          )}
        </svg>
        {/* Phase legend */}
        {showPhase && (
          <div className="flex items-center gap-2 mt-1">
            <svg width={40} height={40} viewBox="0 0 40 40">
              <circle cx={20} cy={20} r={16} fill="none" stroke={t.sphereWire} strokeWidth={1} />
              {[0, 90, 180, 270].map(deg => {
                const rad = (deg * Math.PI) / 180;
                return <circle key={deg} cx={20 + 14 * Math.cos(rad)} cy={20 - 14 * Math.sin(rad)} r={2}
                  fill={`hsl(${deg}, 70%, 55%)`} />;
              })}
              <rect x={14} y={14} width={12} height={12} rx={2} fill={t.accent} opacity={0.8} />
              <text x={20} y={22} textAnchor="middle" fontSize={7} fill="white" fontWeight={600}>Phase</text>
            </svg>
            {["0", "π/2", "π", "3π/2"].map((label, i) => (
              <span key={i} className="text-[9px] font-mono" style={{ color: t.textDim }}>{label}</span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-4 mt-2">
          <span className="text-xs" style={{ color: t.textMuted }}>Labels</span>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: t.text }}>
            <input type="checkbox" checked={showLabels} onChange={() => setShowLabels(!showLabels)} />
            State
          </label>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: t.text }}>
            <input type="checkbox" checked={showPhase} onChange={() => setShowPhase(!showPhase)} />
            Phase angle
          </label>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Gate Tile (Palette)
   ═══════════════════════════════════════════════════════════════════════════ */

function GateTile({ gate, t, onDragStart }: { gate: GateDef; t: Theme; onDragStart: (e: DragEvent, gate: GateDef) => void }) {
  const bg = gateColor(gate, t);
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, gate)}
      className="w-[42px] h-[42px] rounded-md flex items-center justify-center cursor-grab select-none font-mono text-sm font-bold transition-transform hover:scale-110"
      title={gate.description}
      style={{ background: bg, color: "white", boxShadow: `0 1px 4px ${bg}44` }}
    >
      {gate.label}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Gate on Canvas
   ═══════════════════════════════════════════════════════════════════════════ */

const CELL_W = 56;
const CELL_H = 52;

function CanvasGate({ gate, t, selected, onClick, onDoubleClick }: {
  gate: PlacedGate; t: Theme; selected: boolean; onClick: () => void; onDoubleClick: () => void;
}) {
  const def = findGateDef(gate.gateId);
  const bg = gateColor(def, t);
  const isMeasure = gate.gateId === "measure";
  const isBarrier = gate.gateId === "barrier";

  if (isBarrier) {
    return (
      <div
        className="absolute flex items-center justify-center cursor-pointer"
        style={{ left: gate.col * CELL_W + 12, top: gate.qubits[0] * CELL_H + 4, width: CELL_W - 24, height: CELL_H - 8 }}
        onClick={onClick}
      >
        <div style={{ width: 2, height: "100%", background: t.textDim, borderRadius: 1 }} />
      </div>
    );
  }

  if (isMeasure) {
    return (
      <div
        className="absolute rounded-full flex items-center justify-center cursor-pointer border-2"
        style={{
          left: gate.col * CELL_W + 8, top: gate.qubits[0] * CELL_H + 6,
          width: CELL_W - 16, height: CELL_H - 12,
          borderColor: t.textSecondary,
          background: selected ? t.accentBg : "transparent",
        }}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      >
        <svg width={20} height={16} viewBox="0 0 20 16">
          <path d="M 3 12 Q 10 0 17 12" fill="none" stroke={t.text} strokeWidth={1.5} />
          <line x1={10} y1={12} x2={15} y2={4} stroke={t.text} strokeWidth={1.5} />
        </svg>
      </div>
    );
  }

  const isMulti = (def?.qubits || 1) > 1;
  const minQ = Math.min(...gate.qubits);
  const maxQ = Math.max(...gate.qubits);
  const spanH = isMulti ? (maxQ - minQ) * CELL_H : 0;

  return (
    <>
      {/* Control wire for multi-qubit gates */}
      {isMulti && (
        <div className="absolute" style={{
          left: gate.col * CELL_W + CELL_W / 2 - 1,
          top: minQ * CELL_H + CELL_H / 2,
          width: 2,
          height: spanH,
          background: bg,
        }} />
      )}
      {/* Control dot for CX/CZ/etc */}
      {isMulti && gate.qubits.length >= 2 && gate.gateId !== "swap" && gate.gateId !== "cswap" && (
        <div className="absolute rounded-full" style={{
          left: gate.col * CELL_W + CELL_W / 2 - 5,
          top: gate.qubits[0] * CELL_H + CELL_H / 2 - 5,
          width: 10, height: 10,
          background: bg,
        }} />
      )}
      {/* Target gate box */}
      <div
        className="absolute rounded-md flex items-center justify-center cursor-pointer font-mono text-xs font-bold transition-all"
        style={{
          left: gate.col * CELL_W + 6,
          top: (isMulti ? gate.qubits[gate.qubits.length - 1] : gate.qubits[0]) * CELL_H + 6,
          width: CELL_W - 12,
          height: CELL_H - 12,
          background: bg,
          color: "white",
          border: selected ? `2px solid ${t.accent}` : "2px solid transparent",
          boxShadow: selected ? `0 0 8px ${t.accent}44` : "none",
        }}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      >
        {def?.label || gate.gateId.toUpperCase()}
        {gate.params && gate.params.length > 0 && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-mono opacity-80 bg-black/40 px-1 rounded" style={{ color: "white" }}>
            {gate.params.map(formatAngle).join(",")}
          </span>
        )}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Param Editor Dialog
   ═══════════════════════════════════════════════════════════════════════════ */

function ParamDialog({ gate, t, onSave, onClose }: {
  gate: PlacedGate; t: Theme; onSave: (params: number[]) => void; onClose: () => void;
}) {
  const def = findGateDef(gate.gateId);
  const paramCount = def?.paramCount || 1;
  const labels = paramCount === 3 ? ["θ", "φ", "λ"] : paramCount === 2 ? ["θ", "φ"] : ["θ"];
  const [values, setValues] = useState<string[]>(
    gate.params?.map(formatAngle) || Array(paramCount).fill("π/4")
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "hsla(0,0%,0%,0.5)" }} />
      <div className="relative rounded-xl p-5 space-y-4 min-w-[280px]" style={{ background: t.surface, border: `1px solid ${t.borderStrong}`, boxShadow: t.shadow }} onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold" style={{ color: t.text }}>{def?.label || gate.gateId} Parameters</h3>
        {labels.map((label, i) => (
          <div key={i} className="space-y-1">
            <label className="text-sm font-medium" style={{ color: t.textSecondary }}>{label}</label>
            <input
              type="text"
              value={values[i] || ""}
              onChange={e => { const v = [...values]; v[i] = e.target.value; setValues(v); }}
              className="w-full px-3 py-2 rounded-lg text-sm font-mono focus:outline-none"
              style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, color: t.text }}
              placeholder="π/4"
            />
          </div>
        ))}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm" style={{ color: t.textMuted }}>Cancel</button>
          <button
            onClick={() => onSave(values.map(parseAngle))}
            className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: t.accent, color: "white" }}
          >Apply</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Composer
   ═══════════════════════════════════════════════════════════════════════════ */

interface Props { onClose?: () => void }

export default function QuantumWorkspace({ onClose }: Props) {
  const { mode: themeMode, toggle: toggleTheme, canToggle: canToggleTheme } = useScreenTheme({ screenId: "quantum-workspace" });
  const isDark = themeMode === "dark";
  const t = useMemo(() => makeTheme(isDark), [isDark]);

  // Circuit state
  const [numQubits, setNumQubits] = useState(4);
  const [numClbits, setNumClbits] = useState(4);
  const [gates, setGates] = useState<PlacedGate[]>([]);
  const [selectedGate, setSelectedGate] = useState<string | null>(null);
  const [editingGate, setEditingGate] = useState<string | null>(null);
  const [circuitName, setCircuitName] = useState("Untitled circuit");

  // Simulation results
  const [probs, setProbs] = useState<{ state: string; probability: number; amplitude: Complex }[]>([]);
  const [hasRun, setHasRun] = useState(false);

  // UI
  const [paletteSearch, setPaletteSearch] = useState("");
  const [openCategory, setOpenCategory] = useState("common");
  const [showQasm, setShowQasm] = useState(true);
  const [undoStack, setUndoStack] = useState<PlacedGate[][]>([]);
  const [redoStack, setRedoStack] = useState<PlacedGate[][]>([]);

  const canvasRef = useRef<HTMLDivElement>(null);

  // QASM code
  const qasmCode = useMemo(() => generateQASM(numQubits, numClbits, gates), [numQubits, numClbits, gates]);

  // Max column for sizing canvas
  const maxCol = useMemo(() => Math.max(12, ...gates.map(g => g.col + 1)) + 2, [gates]);

  // Find next free column at given qubit
  const nextFreeCol = useCallback((qubit: number, minCol = 0) => {
    const occupied = gates.filter(g => g.qubits.includes(qubit)).map(g => g.col);
    let col = minCol;
    while (occupied.includes(col)) col++;
    return col;
  }, [gates]);

  // Undo / Redo
  const pushUndo = useCallback(() => {
    setUndoStack(prev => [...prev.slice(-30), gates.map(g => ({ ...g }))]);
    setRedoStack([]);
  }, [gates]);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    setRedoStack(prev => [...prev, gates.map(g => ({ ...g }))]);
    setGates(undoStack[undoStack.length - 1]);
    setUndoStack(prev => prev.slice(0, -1));
  }, [undoStack, gates]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    setUndoStack(prev => [...prev, gates.map(g => ({ ...g }))]);
    setGates(redoStack[redoStack.length - 1]);
    setRedoStack(prev => prev.slice(0, -1));
  }, [redoStack, gates]);

  // Add gate from palette
  const handleDragStart = useCallback((e: DragEvent, gate: GateDef) => {
    e.dataTransfer.setData("gateId", gate.id);
    e.dataTransfer.setData("qubits", String(gate.qubits));
    e.dataTransfer.setData("parameterized", String(!!gate.parameterized));
    e.dataTransfer.setData("paramCount", String(gate.paramCount || 1));
  }, []);

  const handleCanvasDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    const gateId = e.dataTransfer.getData("gateId");
    if (!gateId) return;
    const qubitsNeeded = parseInt(e.dataTransfer.getData("qubits")) || 1;
    const parameterized = e.dataTransfer.getData("parameterized") === "true";
    const paramCount = parseInt(e.dataTransfer.getData("paramCount")) || 1;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const y = e.clientY - rect.top + (canvasRef.current?.scrollTop || 0);
    const x = e.clientX - rect.left + (canvasRef.current?.scrollLeft || 0);
    const qubit = Math.max(0, Math.min(numQubits - 1, Math.floor(y / CELL_H)));
    const col = Math.max(0, Math.floor(x / CELL_W));

    const qubits: number[] = [qubit];
    for (let i = 1; i < qubitsNeeded; i++) {
      const nextQ = qubit + i;
      if (nextQ < numQubits) qubits.push(nextQ);
    }
    if (qubits.length < qubitsNeeded) return;

    pushUndo();
    const newGate: PlacedGate = {
      id: gid(),
      gateId,
      qubits,
      col,
      params: parameterized ? Array(paramCount).fill(Math.PI / 4) : undefined,
    };
    setGates(prev => [...prev, newGate]);
    setHasRun(false);
  }, [numQubits, pushUndo]);

  const handleCanvasDragOver = useCallback((e: DragEvent) => { e.preventDefault(); }, []);

  // Delete selected gate
  const deleteSelected = useCallback(() => {
    if (!selectedGate) return;
    pushUndo();
    setGates(prev => prev.filter(g => g.id !== selectedGate));
    setSelectedGate(null);
    setHasRun(false);
  }, [selectedGate, pushUndo]);

  // Clear all
  const clearCircuit = useCallback(() => {
    pushUndo();
    setGates([]);
    setSelectedGate(null);
    setProbs([]);
    setHasRun(false);
  }, [pushUndo]);

  // Run simulation
  const runCircuit = useCallback(() => {
    const simQubits = Math.min(numQubits, 16); // cap for performance
    const state = createState(simQubits);
    const sortedGates = [...gates].sort((a, b) => a.col - b.col);

    for (const g of sortedGates) {
      if (g.gateId === "barrier" || g.gateId === "|0>" || g.gateId === "measure") continue;
      if (g.qubits.some(q => q >= simQubits)) continue;
      const op: SimOp = { gate: g.gateId, qubits: g.qubits, params: g.params };
      state.ops.push(op);
    }

    simulateCircuit(state);
    const results = getStateProbabilities(state);
    setProbs(results);
    setHasRun(true);
  }, [numQubits, gates]);

  // Auto-run on circuit change
  useEffect(() => {
    if (gates.length > 0) {
      const timer = setTimeout(runCircuit, 200);
      return () => clearTimeout(timer);
    } else {
      setProbs([]);
    }
  }, [gates, numQubits]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedGate && !(e.target as HTMLElement).closest("input,textarea,select")) {
          e.preventDefault();
          deleteSelected();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedGate, deleteSelected, undo, redo]);

  // Save gate params
  const saveGateParams = useCallback((gateId: string, params: number[]) => {
    pushUndo();
    setGates(prev => prev.map(g => g.id === gateId ? { ...g, params } : g));
    setEditingGate(null);
    setHasRun(false);
  }, [pushUndo]);

  const editingGateObj = editingGate ? gates.find(g => g.id === editingGate) : null;

  // Filtered palette categories
  const filteredCategories = useMemo(() => {
    if (!paletteSearch) return GATE_CATEGORIES;
    const q = paletteSearch.toLowerCase();
    return GATE_CATEGORIES.map(c => ({
      ...c,
      gates: c.gates.filter(g => g.label.toLowerCase().includes(q) || g.description.toLowerCase().includes(q) || g.id.includes(q)),
    })).filter(c => c.gates.length > 0);
  }, [paletteSearch]);

  return (
    <div className="h-full flex flex-col" style={{ background: t.bg, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* ═══ Top Bar ═══ */}
      <div className="flex items-center gap-2 px-4 py-2" style={{ background: t.surface, borderBottom: `1px solid ${t.border}` }}>
        <Atom size={18} style={{ color: t.accent }} />
        <span className="text-sm font-semibold" style={{ color: t.text }}>Hologram Quantum Platform</span>
        <div className="flex-1" />
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-md transition-colors"
          style={{ color: t.textMuted }}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-md" style={{ color: t.textMuted }}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* ═══ Toolbar ═══ */}
      <div className="flex items-center gap-1 px-3 py-1.5" style={{ background: t.surface, borderBottom: `1px solid ${t.border}` }}>
        {/* Circuit name */}
        <input
          type="text"
          value={circuitName}
          onChange={e => setCircuitName(e.target.value)}
          className="text-sm font-semibold bg-transparent focus:outline-none px-1 mr-2 min-w-0"
          style={{ color: t.text, borderBottom: `1px solid transparent`, maxWidth: 180 }}
          onFocus={e => (e.target.style.borderBottomColor = t.accent)}
          onBlur={e => (e.target.style.borderBottomColor = "transparent")}
        />
        <div className="w-px h-4 mx-1" style={{ background: t.border }} />
        {/* File / Edit / View / Help — simplified */}
        {["File", "Edit", "View", "Help"].map(m => (
          <button key={m} className="px-2 py-1 text-[13px] rounded transition-colors" style={{ color: t.textSecondary }}
            onMouseEnter={e => (e.currentTarget.style.background = t.accentBg)}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            {m}
          </button>
        ))}
        <div className="flex-1" />
        {/* Save & Download */}
        <button className="p-1.5 rounded-md" style={{ color: t.textMuted }} title="Save"><Save size={15} /></button>
        <button
          onClick={() => {
            const blob = new Blob([qasmCode], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = `${circuitName}.qasm`; a.click(); URL.revokeObjectURL(url);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium"
          style={{ color: t.textMuted }}
        >
          Save file <Download size={13} />
        </button>
        <button
          onClick={runCircuit}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[13px] font-semibold ml-2"
          style={{ background: t.accent, color: "white" }}
        >
          Set up and run <Cpu size={13} />
        </button>
      </div>

      {/* ═══ Main Layout ═══ */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Left: Operations Palette ── */}
        <div className="w-[220px] shrink-0 flex flex-col overflow-hidden" style={{ background: t.panel, borderRight: `1px solid ${t.border}` }}>
          <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: `1px solid ${t.border}` }}>
            <span className="text-[13px] font-semibold" style={{ color: t.text }}>Operations</span>
            <div className="flex-1" />
            <Search size={13} style={{ color: t.textMuted }} />
            <SlidersHorizontal size={13} style={{ color: t.textMuted }} />
          </div>
          {/* Search */}
          <div className="px-3 py-2" style={{ borderBottom: `1px solid ${t.border}` }}>
            <input
              type="text"
              value={paletteSearch}
              onChange={e => setPaletteSearch(e.target.value)}
              placeholder="Search gates…"
              className="w-full px-2 py-1.5 rounded text-[12px] focus:outline-none"
              style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, color: t.text }}
            />
          </div>
          {/* Gate categories */}
          <div className="flex-1 overflow-y-auto py-1">
            {filteredCategories.map(cat => (
              <div key={cat.id}>
                <button
                  onClick={() => setOpenCategory(openCategory === cat.id ? "" : cat.id)}
                  className="w-full flex items-center gap-1.5 px-3 py-2 text-left text-[12px] font-semibold"
                  style={{ color: t.textSecondary }}
                >
                  <ChevronRight size={11} className={`transition-transform ${openCategory === cat.id ? "rotate-90" : ""}`} />
                  {cat.label}
                  <span className="text-[10px] font-normal ml-auto" style={{ color: t.textDim }}>{cat.gates.length}</span>
                </button>
                {openCategory === cat.id && (
                  <div className="flex flex-wrap gap-1.5 px-3 pb-3">
                    {cat.gates.map((gate, i) => (
                      <GateTile key={`${cat.id}-${gate.id}-${i}`} gate={gate} t={t} onDragStart={handleDragStart} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* Qubit controls */}
          <div className="px-3 py-3 space-y-2" style={{ borderTop: `1px solid ${t.border}` }}>
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium" style={{ color: t.textSecondary }}>Qubits</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setNumQubits(Math.max(1, numQubits - 1))} className="p-1 rounded" style={{ color: t.textMuted }}>
                  <Minus size={12} />
                </button>
                <span className="text-[13px] font-mono w-6 text-center font-semibold" style={{ color: t.text }}>{numQubits}</span>
                <button onClick={() => setNumQubits(Math.min(20, numQubits + 1))} className="p-1 rounded" style={{ color: t.textMuted }}>
                  <Plus size={12} />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium" style={{ color: t.textSecondary }}>Classical bits</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setNumClbits(Math.max(1, numClbits - 1))} className="p-1 rounded" style={{ color: t.textMuted }}>
                  <Minus size={12} />
                </button>
                <span className="text-[13px] font-mono w-6 text-center font-semibold" style={{ color: t.text }}>{numClbits}</span>
                <button onClick={() => setNumClbits(Math.min(20, numClbits + 1))} className="p-1 rounded" style={{ color: t.textMuted }}>
                  <Plus size={12} />
                </button>
              </div>
            </div>
            <button onClick={clearCircuit} className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-medium" style={{ color: t.red, border: `1px solid ${t.border}` }}>
              <Trash2 size={12} /> Clear circuit
            </button>
          </div>
        </div>

        {/* ── Center + Bottom: Circuit Canvas + Results ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Canvas toolbar */}
          <div className="flex items-center gap-1 px-3 py-1.5" style={{ background: t.surfaceAlt, borderBottom: `1px solid ${t.border}` }}>
            <button onClick={undo} className="p-1.5 rounded" style={{ color: t.textMuted, opacity: undoStack.length > 0 ? 1 : 0.35 }} title="Undo (Ctrl+Z)">
              <Undo2 size={14} />
            </button>
            <button onClick={redo} className="p-1.5 rounded" style={{ color: t.textMuted, opacity: redoStack.length > 0 ? 1 : 0.35 }} title="Redo (Ctrl+Y)">
              <Redo2 size={14} />
            </button>
            <div className="w-px h-4 mx-1" style={{ background: t.border }} />
            <span className="text-[12px]" style={{ color: t.textSecondary }}>Left alignment</span>
            <ChevronDown size={11} style={{ color: t.textMuted }} />
            <div className="w-px h-4 mx-2" style={{ background: t.border }} />
            <span className="text-[12px]" style={{ color: t.textSecondary }}>Inspect</span>
            <div className="flex-1" />
            {selectedGate && (
              <button onClick={deleteSelected} className="flex items-center gap-1 px-2 py-1 rounded text-[12px]" style={{ color: t.red }}>
                <Trash2 size={12} /> Delete
              </button>
            )}
            <span className="text-[11px] font-mono px-2" style={{ color: t.textDim }}>
              {gates.length} gates · {numQubits}q
            </span>
          </div>

          {/* Circuit canvas + results split */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Circuit Canvas */}
            <div
              ref={canvasRef}
              className="flex-1 overflow-auto relative select-none"
              style={{ background: t.wireBg }}
              onDrop={handleCanvasDrop}
              onDragOver={handleCanvasDragOver}
              onClick={e => { if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.wire) setSelectedGate(null); }}
            >
              <div className="relative" style={{ width: maxCol * CELL_W + 80, height: numQubits * CELL_H + CELL_H + 20, minHeight: "100%" }}>
                {/* Qubit labels + wires */}
                {Array.from({ length: numQubits }, (_, q) => (
                  <React.Fragment key={q}>
                    {/* Label */}
                    <div className="absolute flex items-center" style={{ left: 8, top: q * CELL_H + CELL_H / 2 - 9, height: 18 }}>
                      <span className="text-[13px] font-mono" style={{ color: t.textSecondary }}>q[{q}]</span>
                    </div>
                    {/* Wire */}
                    <div data-wire="true" className="absolute" style={{
                      left: 60,
                      top: q * CELL_H + CELL_H / 2 - 0.5,
                      right: 0,
                      height: 1,
                      background: t.wireColor,
                    }} />
                  </React.Fragment>
                ))}
                {/* Classical register */}
                <div className="absolute flex items-center" style={{ left: 8, top: numQubits * CELL_H + CELL_H / 2 - 9 }}>
                  <span className="text-[13px] font-mono" style={{ color: t.textDim }}>c{numClbits}</span>
                </div>
                <div data-wire="true" className="absolute" style={{
                  left: 60,
                  top: numQubits * CELL_H + CELL_H / 2 - 0.5,
                  right: 0,
                  height: 1,
                  background: t.textDim,
                  opacity: 0.5,
                }} />

                {/* Measurement targets on right */}
                {Array.from({ length: numQubits }, (_, q) => (
                  <div key={`meas-${q}`} className="absolute rounded-full flex items-center justify-center"
                    style={{
                      right: 12,
                      top: q * CELL_H + CELL_H / 2 - 14,
                      width: 28, height: 28,
                      border: `1.5px solid ${t.wireColor}`,
                    }}
                  >
                    <svg width={14} height={11} viewBox="0 0 14 11">
                      <path d="M 2 9 Q 7 0 12 9" fill="none" stroke={t.wireColor} strokeWidth={1.2} />
                      <line x1={7} y1={9} x2={10.5} y2={3} stroke={t.wireColor} strokeWidth={1.2} />
                    </svg>
                  </div>
                ))}

                {/* Placed gates */}
                <div className="absolute" style={{ left: 60, top: 0 }}>
                  {gates.map(g => (
                    <CanvasGate
                      key={g.id}
                      gate={g}
                      t={t}
                      selected={selectedGate === g.id}
                      onClick={() => setSelectedGate(g.id)}
                      onDoubleClick={() => {
                        const def = findGateDef(g.gateId);
                        if (def?.parameterized) setEditingGate(g.id);
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* ── Bottom Panels: Probabilities + Q-Sphere ── */}
            <div className="flex" style={{ height: 280, borderTop: `1px solid ${t.border}` }}>
              <div className="flex-1 min-w-0" style={{ borderRight: `1px solid ${t.border}` }}>
                <ProbabilitiesPanel probs={probs} t={t} />
              </div>
              <div className="flex-1 min-w-0">
                <QSpherePanel probs={probs} t={t} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: OpenQASM Code Panel ── */}
        {showQasm && (
          <div className="w-[300px] shrink-0 flex flex-col" style={{ background: t.panel, borderLeft: `1px solid ${t.border}` }}>
            <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: `1px solid ${t.border}` }}>
              <span className="text-[13px] font-semibold" style={{ color: t.text }}>OpenQASM 2.0</span>
              <ChevronDown size={12} style={{ color: t.textMuted }} />
              <div className="flex-1" />
              <button
                onClick={() => { navigator.clipboard.writeText(qasmCode); }}
                className="p-1 rounded" title="Copy QASM" style={{ color: t.textMuted }}
              >
                <Copy size={13} />
              </button>
              <button onClick={() => setShowQasm(false)} className="p-1 rounded" style={{ color: t.textMuted }}>
                <X size={13} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-0">
              <pre className="text-[13px] font-mono leading-[1.7] p-4 select-all" style={{ color: t.text }}>
                <div className="flex">
                  {/* Line numbers */}
                  <div className="select-none pr-3 text-right" style={{ minWidth: 32, color: t.textDim }}>
                    {qasmCode.split("\n").map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    {highlightQASM(qasmCode, t)}
                  </div>
                </div>
              </pre>
            </div>
          </div>
        )}
        {!showQasm && (
          <button
            onClick={() => setShowQasm(true)}
            className="w-8 shrink-0 flex items-center justify-center cursor-pointer"
            style={{ background: t.surface, borderLeft: `1px solid ${t.border}`, color: t.textMuted }}
            title="Show QASM"
          >
            <span className="text-[10px] font-mono" style={{ writingMode: "vertical-lr", transform: "rotate(180deg)" }}>QASM</span>
          </button>
        )}
      </div>

      {/* Param editor dialog */}
      {editingGateObj && (
        <ParamDialog
          gate={editingGateObj}
          t={t}
          onSave={params => saveGateParams(editingGateObj.id, params)}
          onClose={() => setEditingGate(null)}
        />
      )}
    </div>
  );
}
