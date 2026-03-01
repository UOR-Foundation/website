/**
 * Quantum Workspace — IBM Quantum Composer Replica
 * ═════════════════════════════════════════════════
 *
 * Canonical quantum circuit composer matching IBM's layout:
 *   Left:   Operations palette (flat grid, IBM-style tile layout)
 *   Center: Circuit canvas with qubit wires, gate context toolbar
 *   Right:  OpenQASM code editor with syntax highlighting
 *   Bottom: Probabilities histogram + Q-sphere visualization
 *
 * All simulation powered by Q-Simulator (statevector engine).
 */

import React, { useState, useCallback, useMemo, useRef, useEffect, type DragEvent } from "react";
import {
  X, Play, Sun, Moon, Undo2, Redo2, Search, SlidersHorizontal, BarChart3,
  Save, Download, Settings, ChevronDown, ChevronRight, Trash2, Plus, Minus,
  Info, Eye, EyeOff, Copy, RotateCcw, Layers, Atom, Cpu, Zap,
  Pencil, Scissors, ClipboardCopy, AlignLeft, Grid3X3, MousePointer,
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
  dropZone: string; gridLine: string;
  contextBg: string; contextBorder: string;
}

function makeTheme(dark: boolean): Theme {
  if (dark) return {
    bg: "hsl(220, 20%, 8%)", surface: "hsl(220, 18%, 11%)", surfaceAlt: "hsl(220, 16%, 14%)", panel: "hsl(220, 18%, 10%)",
    border: "hsla(220, 20%, 40%, 0.15)", borderStrong: "hsla(220, 20%, 40%, 0.25)",
    text: "hsl(0, 0%, 92%)", textSecondary: "hsl(0, 0%, 72%)", textMuted: "hsl(0, 0%, 52%)", textDim: "hsl(0, 0%, 38%)",
    accent: "hsl(210, 100%, 55%)", accentBg: "hsla(210, 100%, 55%, 0.12)",
    wireColor: "hsl(0, 0%, 45%)", wireBg: "hsl(220, 16%, 12%)",
    gateH: "hsl(200, 65%, 50%)", gateCX: "hsl(200, 65%, 50%)", gatePhase: "hsl(200, 50%, 55%)",
    gateRot: "hsl(330, 60%, 60%)", gateSpecial: "hsl(0, 0%, 45%)", gateMeasure: "hsl(0, 0%, 60%)",
    gateMulti: "hsl(280, 50%, 55%)",
    green: "hsl(152, 60%, 50%)", red: "hsl(0, 65%, 55%)", gold: "hsl(38, 65%, 55%)", purple: "hsl(280, 55%, 60%)", blue: "hsl(210, 70%, 55%)",
    shadow: "0 2px 12px hsla(0,0%,0%,0.4)",
    codeKeyword: "hsl(280, 60%, 72%)", codeString: "hsl(120, 40%, 60%)", codeComment: "hsl(0, 0%, 50%)", codeNumber: "hsl(30, 70%, 65%)",
    probBar: "hsl(210, 100%, 55%)",
    sphereBg: "hsl(220, 18%, 11%)", sphereWire: "hsla(0, 0%, 60%, 0.3)", sphereState: "hsl(210, 100%, 55%)",
    dropZone: "hsla(210, 100%, 55%, 0.15)", gridLine: "hsla(0, 0%, 50%, 0.08)",
    contextBg: "hsl(220, 18%, 16%)", contextBorder: "hsla(220, 20%, 50%, 0.2)",
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
    dropZone: "hsla(210, 100%, 42%, 0.1)", gridLine: "hsla(0, 0%, 0%, 0.05)",
    contextBg: "hsl(0, 0%, 100%)", contextBorder: "hsla(0, 0%, 0%, 0.12)",
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   Gate Definitions — IBM-style flat palette
   ═══════════════════════════════════════════════════════════════════════════ */

interface GateDef {
  id: string; label: string; qubits: number; parameterized?: boolean;
  paramCount?: number; description: string; color: "h" | "cx" | "phase" | "rot" | "special" | "measure" | "multi";
}

// IBM Composer flat palette: gates displayed as a grid, no accordion
const PALETTE_GATES: GateDef[] = [
  // Row 1: Common + Clifford
  { id: "h", label: "H", qubits: 1, description: "Hadamard gate", color: "h" },
  { id: "cx", label: "⊕", qubits: 2, description: "Controlled-NOT (CNOT)", color: "cx" },
  { id: "ccx", label: "⊕", qubits: 3, description: "Toffoli (CCX)", color: "multi" },
  { id: "swap", label: "⨉", qubits: 2, description: "SWAP gate", color: "cx" },
  { id: "cswap", label: "⨉", qubits: 3, description: "Fredkin (CSWAP)", color: "multi" },
  { id: "x", label: "X", qubits: 1, description: "Pauli-X (NOT)", color: "rot" },
  // Row 2
  { id: "id", label: "I", qubits: 1, description: "Identity", color: "special" },
  { id: "t", label: "T", qubits: 1, description: "T gate (π/8)", color: "phase" },
  { id: "s", label: "S", qubits: 1, description: "S gate (√Z)", color: "phase" },
  { id: "z", label: "Z", qubits: 1, description: "Pauli-Z", color: "phase" },
  { id: "tdg", label: "T†", qubits: 1, description: "T-dagger", color: "phase" },
  // Row 3
  { id: "sdg", label: "S†", qubits: 1, description: "S-dagger", color: "phase" },
  { id: "p", label: "P", qubits: 1, parameterized: true, description: "Phase gate P(λ)", color: "phase" },
  { id: "rz", label: "RZ", qubits: 1, parameterized: true, description: "Z-rotation RZ(θ)", color: "rot" },
  { id: "cz", label: "CZ", qubits: 2, description: "Controlled-Z", color: "cx" },
  { id: "|0>", label: "|0⟩", qubits: 1, description: "Reset to |0⟩", color: "special" },
  // Row 4
  { id: "barrier", label: "┊", qubits: 1, description: "Barrier", color: "special" },
  { id: "measure", label: "M", qubits: 1, description: "Measurement", color: "measure" },
  { id: "sx", label: "√X", qubits: 1, description: "√X gate", color: "rot" },
  { id: "sxdg", label: "√X†", qubits: 1, description: "√X-dagger", color: "rot" },
  // Row 5
  { id: "y", label: "Y", qubits: 1, description: "Pauli-Y", color: "rot" },
  { id: "rx", label: "RX", qubits: 1, parameterized: true, description: "X-rotation RX(θ)", color: "rot" },
  { id: "ry", label: "RY", qubits: 1, parameterized: true, description: "Y-rotation RY(θ)", color: "rot" },
  { id: "cy", label: "CY", qubits: 2, description: "Controlled-Y", color: "cx" },
  { id: "ch", label: "CH", qubits: 2, description: "Controlled-H", color: "cx" },
  // Row 6
  { id: "u", label: "U", qubits: 1, parameterized: true, paramCount: 3, description: "Universal U(θ,φ,λ)", color: "rot" },
  { id: "crx", label: "CRX", qubits: 2, parameterized: true, description: "Controlled-RX", color: "cx" },
  { id: "cry", label: "CRY", qubits: 2, parameterized: true, description: "Controlled-RY", color: "cx" },
  { id: "crz", label: "CRZ", qubits: 2, parameterized: true, description: "Controlled-RZ", color: "cx" },
];

function findGateDef(gateId: string): GateDef | undefined {
  return PALETTE_GATES.find(g => g.id === gateId);
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

function ProbabilitiesPanel({ probs, t, numQubits }: { probs: { state: string; probability: number }[]; t: Theme; numQubits: number }) {
  const sorted = useMemo(() => {
    // Generate all basis states for proper IBM-style display
    const allStates: { state: string; probability: number }[] = [];
    const n = Math.min(numQubits, 8); // Cap display at 8 qubits
    const total = 1 << n;
    for (let i = 0; i < total; i++) {
      const state = i.toString(2).padStart(n, "0");
      const found = probs.find(p => p.state === state);
      allStates.push({ state, probability: found?.probability || 0 });
    }
    return allStates;
  }, [probs, numQubits]);

  const chartH = 160;
  const barW = sorted.length > 16 ? 10 : sorted.length > 8 ? 18 : 32;
  const gap = 2;

  return (
    <div className="h-full flex flex-col" style={{ background: t.panel }}>
      <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: `1px solid ${t.border}` }}>
        <span className="text-[13px] font-semibold" style={{ color: t.text }}>Probabilities</span>
        <ChevronDown size={12} style={{ color: t.textMuted }} />
        <div className="flex-1" />
        <Info size={13} style={{ color: t.textMuted }} />
        <Grid3X3 size={13} style={{ color: t.textMuted }} />
      </div>
      <div className="flex-1 flex flex-col justify-end overflow-x-auto px-4 pb-1 relative">
        {/* Y-axis */}
        <div className="absolute left-1 top-10 bottom-8 flex flex-col justify-between" style={{ width: 28 }}>
          {[100, 80, 60, 40, 20, 0].map(v => (
            <span key={v} className="text-[10px] font-mono leading-none text-right" style={{ color: t.textDim }}>{v}</span>
          ))}
        </div>
        {/* Y-axis label */}
        <span className="absolute left-0 top-1/2 text-[10px] font-medium" style={{
          color: t.textDim, writingMode: "vertical-lr", transform: "rotate(180deg) translateY(50%)",
        }}>
          Probability (% of 1024 shots)
        </span>
        {/* Chart area */}
        <div className="flex items-end ml-8 mt-2" style={{ height: chartH }}>
          {/* Grid lines */}
          <div className="absolute left-10 right-4 flex flex-col justify-between pointer-events-none" style={{ height: chartH, top: 32 }}>
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{ height: 1, background: t.gridLine }} />
            ))}
          </div>
          {/* Bars */}
          <div className="flex items-end gap-px relative z-10">
            {sorted.map((p) => {
              const pct = p.probability * 100;
              const h = (pct / 100) * chartH;
              return (
                <div key={p.state} className="flex flex-col items-center justify-end" style={{ width: barW, height: chartH }}>
                  <div style={{
                    width: barW - 1,
                    height: Math.max(pct > 0 ? 2 : 0, h),
                    background: t.probBar,
                    borderRadius: "1px 1px 0 0",
                    transition: "height 200ms ease-out",
                  }} />
                </div>
              );
            })}
          </div>
        </div>
        {/* X-axis labels */}
        <div className="flex ml-8 mt-1 mb-1">
          {sorted.map(p => (
            <div key={p.state} className="text-center" style={{ width: barW + gap }}>
              <span className="text-[8px] font-mono" style={{
                color: t.textMuted,
                writingMode: sorted.length > 8 ? "vertical-lr" : undefined,
                display: "inline-block",
                maxHeight: sorted.length > 8 ? 40 : undefined,
              }}>
                {p.state}
              </span>
            </div>
          ))}
        </div>
        {sorted.length > 8 && (
          <div className="text-center ml-8">
            <span className="text-[10px]" style={{ color: t.textDim }}>Computational basis states</span>
          </div>
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
  const cx = 140, cy = 110, rMajor = 80, rMinor = 30;

  return (
    <div className="h-full flex flex-col" style={{ background: t.panel }}>
      <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: `1px solid ${t.border}` }}>
        <span className="text-[13px] font-semibold" style={{ color: t.text }}>Q-sphere</span>
        <ChevronDown size={12} style={{ color: t.textMuted }} />
        <div className="flex-1" />
        <RotateCcw size={13} style={{ color: t.textMuted }} />
        <Info size={13} style={{ color: t.textMuted }} />
        <Grid3X3 size={13} style={{ color: t.textMuted }} />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-2 pb-2">
        <svg width={280} height={200} viewBox="0 0 280 200" className="w-full max-w-[280px]">
          {/* Sphere wireframe — top and bottom ellipses + vertical axis */}
          <ellipse cx={cx} cy={cy + 45} rx={rMajor} ry={rMinor} fill="none" stroke={t.sphereWire} strokeWidth={0.8} />
          <ellipse cx={cx} cy={cy} rx={rMajor} ry={rMinor} fill="none" stroke={t.sphereWire} strokeWidth={0.8} strokeDasharray="4,3" />
          <line x1={cx} y1={cy - 60} x2={cx} y2={cy + 60} stroke={t.sphereWire} strokeWidth={0.8} />
          {/* Vertical great circle outline */}
          <ellipse cx={cx} cy={cy - 8} rx={12} ry={55} fill="none" stroke={t.sphereWire} strokeWidth={0.5} strokeDasharray="3,4" />
          {/* States */}
          {probs.filter(p => p.probability > 0.005).map((p, i) => {
            const n = p.state.length;
            const hw = p.state.split("").filter(b => b === "1").length;
            const theta = (hw / n) * Math.PI;
            const phase = Math.atan2(p.amplitude[1], p.amplitude[0]);
            const sphereY = cy - 55 * Math.cos(theta);
            const sphereX = cx + rMajor * Math.sin(theta) * Math.cos(phase);
            const r = 3 + p.probability * 10;
            const hue = ((phase + Math.PI) / (2 * Math.PI)) * 360;
            return (
              <g key={i}>
                <line x1={cx} y1={sphereY} x2={sphereX} y2={sphereY}
                  stroke={t.sphereWire} strokeWidth={0.4} />
                <circle cx={sphereX} cy={sphereY} r={r}
                  fill={showPhase ? `hsl(${hue}, 70%, 55%)` : t.sphereState}
                  stroke="white" strokeWidth={0.8} opacity={0.9} />
                {showLabels && p.probability > 0.01 && (
                  <text x={sphereX + r + 3} y={sphereY + 3} fontSize={9}
                    fill={t.textMuted} fontFamily="monospace" fontWeight={500}>
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
        {/* Phase wheel + labels */}
        <div className="flex items-center gap-3 mt-1">
          <svg width={36} height={36} viewBox="0 0 36 36">
            <defs>
              <linearGradient id="phaseGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="hsl(0, 70%, 55%)" />
                <stop offset="25%" stopColor="hsl(90, 70%, 55%)" />
                <stop offset="50%" stopColor="hsl(180, 70%, 55%)" />
                <stop offset="75%" stopColor="hsl(270, 70%, 55%)" />
                <stop offset="100%" stopColor="hsl(360, 70%, 55%)" />
              </linearGradient>
            </defs>
            <circle cx={18} cy={18} r={14} fill="none" stroke="url(#phaseGrad)" strokeWidth={4} />
            <rect x={10} y={10} width={16} height={16} rx={3} fill={t.accent} opacity={0.85} />
            <text x={18} y={22} textAnchor="middle" fontSize={7} fill="white" fontWeight={600}>Phase</text>
          </svg>
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-mono" style={{ color: t.textDim }}>π/2</span>
            <div className="flex gap-3">
              <span className="text-[9px] font-mono" style={{ color: t.textDim }}>π</span>
              <span className="text-[9px] font-mono" style={{ color: t.textDim }}>0</span>
            </div>
            <span className="text-[9px] font-mono" style={{ color: t.textDim }}>3π/2</span>
          </div>
          <div className="flex flex-col gap-1 ml-4">
            <span className="text-[11px] font-medium" style={{ color: t.textMuted }}>Labels</span>
            <label className="flex items-center gap-1.5 text-[11px] cursor-pointer" style={{ color: t.text }}>
              <input type="checkbox" checked={showLabels} onChange={() => setShowLabels(!showLabels)} className="w-3.5 h-3.5" />
              State
            </label>
            <label className="flex items-center gap-1.5 text-[11px] cursor-pointer" style={{ color: t.text }}>
              <input type="checkbox" checked={showPhase} onChange={() => setShowPhase(!showPhase)} className="w-3.5 h-3.5" />
              Phase angle
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Gate Tile — IBM flat grid style
   ═══════════════════════════════════════════════════════════════════════════ */

function GateTile({ gate, t, selected, onClick, onDragStart }: {
  gate: GateDef; t: Theme; selected: boolean;
  onClick: () => void; onDragStart: (e: DragEvent, gate: GateDef) => void;
}) {
  const bg = gateColor(gate, t);
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, gate)}
      onClick={onClick}
      className="w-[38px] h-[38px] rounded flex items-center justify-center cursor-pointer select-none font-mono text-[13px] font-bold transition-all"
      title={gate.description}
      style={{
        background: selected ? bg : `${bg}22`,
        color: selected ? "white" : bg,
        border: selected ? `2px solid ${bg}` : `1.5px solid ${bg}55`,
        boxShadow: selected ? `0 0 8px ${bg}44` : "none",
      }}
    >
      {gate.label}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Gate on Canvas — IBM-authentic rendering
   ═══════════════════════════════════════════════════════════════════════════ */

const CELL_W = 52;
const CELL_H = 48;
const GATE_SIZE = 36;

function CanvasGate({ gate, t, selected, onClick }: {
  gate: PlacedGate; t: Theme; selected: boolean; onClick: (e: React.MouseEvent) => void;
}) {
  const def = findGateDef(gate.gateId);
  const bg = gateColor(def, t);
  const isMeasure = gate.gateId === "measure";
  const isBarrier = gate.gateId === "barrier";
  const isMulti = (def?.qubits || 1) > 1;
  const isSwap = gate.gateId === "swap" || gate.gateId === "cswap";
  const isCX = gate.gateId === "cx" || gate.gateId === "ccx" || gate.gateId === "cy" || gate.gateId === "ch" ||
    gate.gateId === "cz" || gate.gateId === "crx" || gate.gateId === "cry" || gate.gateId === "crz";
  const minQ = Math.min(...gate.qubits);
  const maxQ = Math.max(...gate.qubits);

  // Common positioning
  const gx = gate.col * CELL_W + (CELL_W - GATE_SIZE) / 2;

  if (isBarrier) {
    return (
      <div className="absolute cursor-pointer" onClick={onClick}
        style={{ left: gate.col * CELL_W + CELL_W / 2 - 1, top: gate.qubits[0] * CELL_H + 4, width: 3, height: CELL_H - 8 }}>
        <div style={{ width: 1.5, height: "100%", background: t.textDim, margin: "0 auto" }} />
        <div style={{ width: 1.5, height: "100%", background: t.textDim, margin: "0 auto", position: "absolute", left: 2, top: 0 }} />
      </div>
    );
  }

  if (isMeasure) {
    const my = gate.qubits[0] * CELL_H + (CELL_H - GATE_SIZE) / 2;
    return (
      <div className="absolute flex items-center justify-center cursor-pointer"
        onClick={onClick}
        style={{
          left: gx, top: my, width: GATE_SIZE, height: GATE_SIZE,
          border: `1.5px solid ${t.textSecondary}`,
          borderRadius: GATE_SIZE / 2,
          background: selected ? t.accentBg : "transparent",
          boxShadow: selected ? `0 0 0 2px ${t.accent}` : "none",
        }}>
        <svg width={18} height={14} viewBox="0 0 18 14">
          <path d="M 2 11 Q 9 0 16 11" fill="none" stroke={t.text} strokeWidth={1.5} />
          <line x1={9} y1={11} x2={14} y2={3} stroke={t.text} strokeWidth={1.5} />
        </svg>
      </div>
    );
  }

  // Multi-qubit gate rendering
  if (isMulti) {
    const controlQubits = gate.qubits.slice(0, -1);
    const targetQubit = gate.qubits[gate.qubits.length - 1];
    const lineX = gate.col * CELL_W + CELL_W / 2;
    const topY = minQ * CELL_H + CELL_H / 2;
    const botY = maxQ * CELL_H + CELL_H / 2;

    return (
      <>
        {/* Vertical connection line */}
        <div className="absolute" style={{
          left: lineX - 1, top: topY, width: 2, height: botY - topY,
          background: bg,
        }} />
        {/* Control dots */}
        {isCX && controlQubits.map((q, i) => (
          <div key={i} className="absolute rounded-full cursor-pointer" onClick={onClick}
            style={{
              left: lineX - 5, top: q * CELL_H + CELL_H / 2 - 5,
              width: 10, height: 10, background: bg,
              boxShadow: selected ? `0 0 0 2px ${t.accent}` : "none",
            }} />
        ))}
        {/* Swap X symbols */}
        {isSwap && gate.qubits.slice(gate.gateId === "cswap" ? 1 : 0).map((q, i) => (
          <div key={`sw-${i}`} className="absolute flex items-center justify-center cursor-pointer" onClick={onClick}
            style={{
              left: lineX - 8, top: q * CELL_H + CELL_H / 2 - 8,
              width: 16, height: 16,
            }}>
            <span className="text-[16px] font-bold" style={{ color: bg }}>×</span>
          </div>
        ))}
        {/* CSWAP control dot */}
        {gate.gateId === "cswap" && (
          <div className="absolute rounded-full cursor-pointer" onClick={onClick}
            style={{
              left: lineX - 5, top: gate.qubits[0] * CELL_H + CELL_H / 2 - 5,
              width: 10, height: 10, background: bg,
            }} />
        )}
        {/* Target — ⊕ circle for CX/CCX, box for others */}
        {isCX && (
          <div className="absolute flex items-center justify-center cursor-pointer" onClick={onClick}
            style={{
              left: gx, top: targetQubit * CELL_H + (CELL_H - GATE_SIZE) / 2,
              width: GATE_SIZE, height: GATE_SIZE,
              borderRadius: GATE_SIZE / 2,
              background: bg, color: "white",
              boxShadow: selected ? `0 0 0 2px ${t.accent}` : "none",
            }}>
            <svg width={18} height={18} viewBox="0 0 18 18">
              <line x1={9} y1={2} x2={9} y2={16} stroke="white" strokeWidth={2} />
              <line x1={2} y1={9} x2={16} y2={9} stroke="white" strokeWidth={2} />
            </svg>
            {/* Param label for CRX/CRY/CRZ */}
            {gate.params && gate.params.length > 0 && (
              <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[8px] font-mono px-1 rounded whitespace-nowrap"
                style={{ color: bg, background: t.panel }}>
                ({gate.params.map(formatAngle).join(",")})
              </span>
            )}
          </div>
        )}
      </>
    );
  }

  // Single-qubit gate box
  const gy = gate.qubits[0] * CELL_H + (CELL_H - GATE_SIZE) / 2;
  const displayLabel = gate.gateId === "|0>" ? "|0⟩" : (def?.label || gate.gateId.toUpperCase());

  return (
    <div
      className="absolute flex flex-col items-center justify-center cursor-pointer font-mono text-[12px] font-bold"
      onClick={onClick}
      style={{
        left: gx, top: gy, width: GATE_SIZE, height: GATE_SIZE,
        background: bg, color: "white",
        borderRadius: 4,
        boxShadow: selected ? `0 0 0 2px ${t.accent}` : "none",
        transition: "box-shadow 100ms",
      }}
    >
      {displayLabel}
      {gate.params && gate.params.length > 0 && (
        <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[8px] font-mono px-1 rounded whitespace-nowrap"
          style={{ color: bg, background: t.panel }}>
          ({gate.params.map(formatAngle).join(",")})
        </span>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Gate Context Toolbar — IBM-style floating action bar
   ═══════════════════════════════════════════════════════════════════════════ */

function GateContextToolbar({ gate, t, canvasRect, onEdit, onInfo, onCut, onCopy, onDelete, onClose }: {
  gate: PlacedGate; t: Theme; canvasRect: DOMRect | null;
  onEdit: () => void; onInfo: () => void; onCut: () => void; onCopy: () => void; onDelete: () => void; onClose: () => void;
}) {
  if (!canvasRect) return null;
  const gx = 60 + gate.col * CELL_W + CELL_W / 2;
  const gy = Math.min(...gate.qubits) * CELL_H;

  const actions = [
    { icon: <Pencil size={14} />, label: "Edit", action: onEdit },
    { icon: <Info size={14} />, label: "Info", action: onInfo },
    { icon: <Scissors size={14} />, label: "Cut", action: onCut },
    { icon: <ClipboardCopy size={14} />, label: "Copy", action: onCopy },
    { icon: <Trash2 size={14} />, label: "Delete", action: onDelete },
  ];

  return (
    <div
      className="absolute z-50 flex items-center gap-0.5 rounded-lg px-1 py-1"
      style={{
        left: gx - actions.length * 16,
        top: gy - 38,
        background: t.contextBg,
        border: `1px solid ${t.contextBorder}`,
        boxShadow: t.shadow,
      }}
      onClick={e => e.stopPropagation()}
    >
      {actions.map((a, i) => (
        <button key={i} onClick={a.action} title={a.label}
          className="w-7 h-7 flex items-center justify-center rounded transition-colors"
          style={{ color: t.textSecondary }}
          onMouseEnter={e => (e.currentTarget.style.background = t.accentBg)}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          {a.icon}
        </button>
      ))}
    </div>
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
  const { mode: themeMode, toggle: toggleTheme } = useScreenTheme({ screenId: "quantum-workspace" });
  const isDark = themeMode === "dark";
  const t = useMemo(() => makeTheme(isDark), [isDark]);

  // Circuit state
  const [numQubits, setNumQubits] = useState(4);
  const [numClbits, setNumClbits] = useState(4);
  const [gates, setGates] = useState<PlacedGate[]>([]);
  const [selectedGate, setSelectedGate] = useState<string | null>(null);
  const [editingGate, setEditingGate] = useState<string | null>(null);
  const [circuitName, setCircuitName] = useState("Untitled circuit");

  // Click-to-place mode (IBM style: click palette gate, then click canvas)
  const [placingGate, setPlacingGate] = useState<GateDef | null>(null);

  // Simulation results
  const [probs, setProbs] = useState<{ state: string; probability: number; amplitude: Complex }[]>([]);

  // UI
  const [paletteSearch, setPaletteSearch] = useState("");
  const [showQasm, setShowQasm] = useState(true);
  const [undoStack, setUndoStack] = useState<PlacedGate[][]>([]);
  const [redoStack, setRedoStack] = useState<PlacedGate[][]>([]);
  const [hoverCell, setHoverCell] = useState<{ col: number; row: number } | null>(null);
  const [showInspect, setShowInspect] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  // QASM code
  const qasmCode = useMemo(() => generateQASM(numQubits, numClbits, gates), [numQubits, numClbits, gates]);

  // Max column for sizing canvas
  const maxCol = useMemo(() => Math.max(14, ...gates.map(g => g.col + 1)) + 3, [gates]);

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

  // Drag-and-drop
  const handleDragStart = useCallback((e: DragEvent, gate: GateDef) => {
    e.dataTransfer.setData("gateId", gate.id);
    e.dataTransfer.setData("qubits", String(gate.qubits));
    e.dataTransfer.setData("parameterized", String(!!gate.parameterized));
    e.dataTransfer.setData("paramCount", String(gate.paramCount || 1));
  }, []);

  const placeGateAt = useCallback((gateId: string, def: GateDef, col: number, qubit: number) => {
    const qubits: number[] = [qubit];
    for (let i = 1; i < def.qubits; i++) {
      const nextQ = qubit + i;
      if (nextQ < numQubits) qubits.push(nextQ);
    }
    if (qubits.length < def.qubits) return;

    pushUndo();
    setGates(prev => [...prev, {
      id: gid(), gateId, qubits, col,
      params: def.parameterized ? Array(def.paramCount || 1).fill(Math.PI / 4) : undefined,
    }]);
  }, [numQubits, pushUndo]);

  const handleCanvasDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    const gateId = e.dataTransfer.getData("gateId");
    if (!gateId) return;
    const def = findGateDef(gateId);
    if (!def) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const y = e.clientY - rect.top + (canvasRef.current?.scrollTop || 0);
    const x = e.clientX - rect.left + (canvasRef.current?.scrollLeft || 0) - 60;
    const qubit = Math.max(0, Math.min(numQubits - 1, Math.floor(y / CELL_H)));
    const col = Math.max(0, Math.floor(x / CELL_W));

    placeGateAt(gateId, def, col, qubit);
  }, [numQubits, placeGateAt]);

  const handleCanvasDragOver = useCallback((e: DragEvent) => { e.preventDefault(); }, []);

  // Click-to-place
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    const isGateClick = (e.target as HTMLElement).closest("[data-gate-id]");
    if (isGateClick) return;

    if (placingGate) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const y = e.clientY - rect.top + (canvasRef.current?.scrollTop || 0);
      const x = e.clientX - rect.left + (canvasRef.current?.scrollLeft || 0) - 60;
      const qubit = Math.max(0, Math.min(numQubits - 1, Math.floor(y / CELL_H)));
      const col = Math.max(0, Math.floor(x / CELL_W));

      placeGateAt(placingGate.id, placingGate, col, qubit);
      // Keep placing mode active (shift-click behavior)
      if (!e.shiftKey) setPlacingGate(null);
      return;
    }

    setSelectedGate(null);
  }, [placingGate, numQubits, placeGateAt]);

  // Canvas mouse tracking for hover feedback
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!placingGate) { setHoverCell(null); return; }
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const y = e.clientY - rect.top + (canvasRef.current?.scrollTop || 0);
    const x = e.clientX - rect.left + (canvasRef.current?.scrollLeft || 0) - 60;
    const row = Math.max(0, Math.min(numQubits - 1, Math.floor(y / CELL_H)));
    const col = Math.max(0, Math.floor(x / CELL_W));
    setHoverCell({ col, row });
  }, [placingGate, numQubits]);

  // Delete selected gate
  const deleteSelected = useCallback(() => {
    if (!selectedGate) return;
    pushUndo();
    setGates(prev => prev.filter(g => g.id !== selectedGate));
    setSelectedGate(null);
  }, [selectedGate, pushUndo]);

  // Copy gate
  const copyGate = useCallback(() => {
    if (!selectedGate) return;
    const g = gates.find(x => x.id === selectedGate);
    if (!g) return;
    pushUndo();
    setGates(prev => [...prev, { ...g, id: gid(), col: g.col + 1 }]);
  }, [selectedGate, gates, pushUndo]);

  // Cut gate
  const cutGate = useCallback(() => {
    copyGate();
    deleteSelected();
  }, [copyGate, deleteSelected]);

  // Clear all
  const clearCircuit = useCallback(() => {
    pushUndo();
    setGates([]);
    setSelectedGate(null);
    setProbs([]);
  }, [pushUndo]);

  // Run simulation
  const runCircuit = useCallback(() => {
    const simQubits = Math.min(numQubits, 16);
    const state = createState(simQubits);
    const sortedGates = [...gates].sort((a, b) => a.col - b.col);

    for (const g of sortedGates) {
      if (g.gateId === "barrier" || g.gateId === "|0>" || g.gateId === "measure") continue;
      if (g.qubits.some(q => q >= simQubits)) continue;
      state.ops.push({ gate: g.gateId, qubits: g.qubits, params: g.params } as SimOp);
    }

    simulateCircuit(state);
    setProbs(getStateProbabilities(state));
  }, [numQubits, gates]);

  // Auto-run on circuit change
  useEffect(() => {
    if (gates.length > 0) {
      const timer = setTimeout(runCircuit, 150);
      return () => clearTimeout(timer);
    } else {
      setProbs([]);
    }
  }, [gates, numQubits]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea,select")) return;
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); deleteSelected(); }
      if (e.key === "Escape") { setPlacingGate(null); setSelectedGate(null); }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "c") { e.preventDefault(); copyGate(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "x") { e.preventDefault(); cutGate(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedGate, deleteSelected, undo, redo, copyGate, cutGate]);

  // Save gate params
  const saveGateParams = useCallback((gateId: string, params: number[]) => {
    pushUndo();
    setGates(prev => prev.map(g => g.id === gateId ? { ...g, params } : g));
    setEditingGate(null);
  }, [pushUndo]);

  const editingGateObj = editingGate ? gates.find(g => g.id === editingGate) : null;
  const selectedGateObj = selectedGate ? gates.find(g => g.id === selectedGate) : null;

  // Filtered palette
  const filteredGates = useMemo(() => {
    if (!paletteSearch) return PALETTE_GATES;
    const q = paletteSearch.toLowerCase();
    return PALETTE_GATES.filter(g => g.label.toLowerCase().includes(q) || g.description.toLowerCase().includes(q) || g.id.includes(q));
  }, [paletteSearch]);

  // Canvas rect for context toolbar positioning
  const [canvasRect, setCanvasRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    if (canvasRef.current) setCanvasRect(canvasRef.current.getBoundingClientRect());
  }, [selectedGate]);

  return (
    <div className="h-full flex flex-col" style={{ background: t.bg, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* ═══ Top Bar — IBM style ═══ */}
      <div className="flex items-center gap-3 px-4 py-1.5" style={{ background: t.surface, borderBottom: `1px solid ${t.border}` }}>
        <Atom size={18} style={{ color: t.accent }} />
        <span className="text-[13px] font-semibold" style={{ color: t.text }}>Hologram Quantum Platform</span>
        <div className="flex-1" />
        <Search size={14} style={{ color: t.textMuted }} />
        <span className="text-[12px] px-2 py-0.5 rounded" style={{ color: t.textMuted, border: `1px solid ${t.border}` }}>q-linux</span>
        <button onClick={toggleTheme} className="p-1 rounded" style={{ color: t.textMuted }}
          title={isDark ? "Light mode" : "Dark mode"}>
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded" style={{ color: t.textMuted }}><X size={15} /></button>
        )}
      </div>

      {/* ═══ Menu bar ═══ */}
      <div className="flex items-center gap-0 px-3 py-0.5" style={{ background: t.surface, borderBottom: `1px solid ${t.border}` }}>
        <input
          type="text" value={circuitName} onChange={e => setCircuitName(e.target.value)}
          className="text-[13px] font-semibold bg-transparent focus:outline-none px-1 mr-3 min-w-0"
          style={{ color: t.text, maxWidth: 160 }}
        />
        <div className="w-px h-3.5 mx-1" style={{ background: t.border }} />
        {["File", "Edit", "View", "Help"].map(m => (
          <button key={m} className="px-2.5 py-1 text-[13px] rounded"
            style={{ color: t.textSecondary }}
            onMouseEnter={e => (e.currentTarget.style.background = t.accentBg)}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            {m}
          </button>
        ))}
        <div className="flex-1" />
        <button className="flex items-center gap-1 px-2.5 py-1 text-[12px] rounded" style={{ color: t.textMuted }}>
          <Save size={13} /> Save file <Download size={12} />
        </button>
        <button onClick={runCircuit}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded text-[13px] font-semibold ml-2"
          style={{ background: t.accent, color: "white" }}>
          Set up and run <Settings size={12} />
        </button>
      </div>

      {/* ═══ Main Layout ═══ */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Left: Operations Palette (IBM flat grid) ── */}
        <div className="w-[260px] shrink-0 flex flex-col overflow-hidden" style={{ background: t.panel, borderRight: `1px solid ${t.border}` }}>
          <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: `1px solid ${t.border}` }}>
            <span className="text-[13px] font-semibold" style={{ color: t.text }}>Operations</span>
            <div className="flex-1" />
            <Search size={13} style={{ color: t.textMuted }} />
            <SlidersHorizontal size={13} style={{ color: t.textMuted }} />
            <BarChart3 size={13} style={{ color: t.textMuted }} />
          </div>
          {/* Search */}
          <div className="px-3 py-2" style={{ borderBottom: `1px solid ${t.border}` }}>
            <input type="text" value={paletteSearch} onChange={e => setPaletteSearch(e.target.value)}
              placeholder="Search gates…"
              className="w-full px-2 py-1 rounded text-[12px] focus:outline-none"
              style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, color: t.text }}
            />
          </div>
          {/* Flat gate grid — IBM style */}
          <div className="flex-1 overflow-y-auto p-2">
            <div className="flex flex-wrap gap-[5px]">
              {filteredGates.map((gate, i) => (
                <GateTile
                  key={`${gate.id}-${i}`}
                  gate={gate}
                  t={t}
                  selected={placingGate?.id === gate.id}
                  onClick={() => setPlacingGate(placingGate?.id === gate.id ? null : gate)}
                  onDragStart={handleDragStart}
                />
              ))}
            </div>
          </div>
          {/* Qubit controls */}
          <div className="px-3 py-2 space-y-1.5" style={{ borderTop: `1px solid ${t.border}` }}>
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium" style={{ color: t.textSecondary }}>Qubits</span>
              <div className="flex items-center gap-1">
                <button onClick={() => { setNumQubits(Math.max(1, numQubits - 1)); setNumClbits(Math.max(1, numClbits - 1)); }}
                  className="p-0.5 rounded" style={{ color: t.textMuted }}><Minus size={12} /></button>
                <span className="text-[13px] font-mono w-5 text-center font-semibold" style={{ color: t.text }}>{numQubits}</span>
                <button onClick={() => { setNumQubits(Math.min(20, numQubits + 1)); setNumClbits(Math.min(20, numClbits + 1)); }}
                  className="p-0.5 rounded" style={{ color: t.textMuted }}><Plus size={12} /></button>
              </div>
            </div>
            <button onClick={clearCircuit}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-medium"
              style={{ color: t.red, border: `1px solid ${t.border}` }}>
              <Trash2 size={12} /> Clear circuit
            </button>
            {placingGate && (
              <div className="text-[11px] text-center py-1 rounded" style={{ color: t.accent, background: t.accentBg }}>
                Click canvas to place {placingGate.label} · Esc to cancel
              </div>
            )}
          </div>
        </div>

        {/* ── Center + Bottom ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Canvas toolbar */}
          <div className="flex items-center gap-1 px-3 py-1" style={{ background: t.surfaceAlt, borderBottom: `1px solid ${t.border}` }}>
            <button onClick={undo} className="p-1 rounded" style={{ color: t.textMuted, opacity: undoStack.length > 0 ? 1 : 0.3 }} title="Undo"><Undo2 size={14} /></button>
            <button onClick={redo} className="p-1 rounded" style={{ color: t.textMuted, opacity: redoStack.length > 0 ? 1 : 0.3 }} title="Redo"><Redo2 size={14} /></button>
            <div className="w-px h-3.5 mx-1" style={{ background: t.border }} />
            <span className="text-[12px]" style={{ color: t.textSecondary }}>Left alignment</span>
            <ChevronDown size={11} style={{ color: t.textMuted }} />
            <div className="w-px h-3.5 mx-2" style={{ background: t.border }} />
            <button onClick={() => setShowInspect(!showInspect)}
              className="flex items-center gap-1.5 text-[12px] px-2 py-0.5 rounded"
              style={{ color: showInspect ? t.accent : t.textSecondary, background: showInspect ? t.accentBg : "transparent" }}>
              <div className="w-7 h-3.5 rounded-full relative" style={{ background: showInspect ? t.accent : t.textDim }}>
                <div className="absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all" style={{ left: showInspect ? 14 : 2 }} />
              </div>
              Inspect
            </button>
            <div className="flex-1" />
            <span className="text-[11px] font-mono px-2" style={{ color: t.textDim }}>
              {gates.length} gates · {numQubits}q
            </span>
          </div>

          {/* Circuit canvas + results */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Circuit Canvas */}
            <div
              ref={canvasRef}
              className="flex-1 overflow-auto relative select-none"
              style={{ background: t.wireBg, cursor: placingGate ? "crosshair" : "default" }}
              onDrop={handleCanvasDrop}
              onDragOver={handleCanvasDragOver}
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={() => setHoverCell(null)}
            >
              <div className="relative" style={{
                width: maxCol * CELL_W + 100,
                height: (numQubits + 1) * CELL_H + 20,
                minHeight: "100%",
              }}>
                {/* Qubit labels + wires */}
                {Array.from({ length: numQubits }, (_, q) => (
                  <React.Fragment key={q}>
                    <div className="absolute flex items-center" style={{ left: 12, top: q * CELL_H + CELL_H / 2 - 8, height: 16 }}>
                      <span className="text-[13px] font-mono font-medium" style={{ color: t.textSecondary }}>q[{q}]</span>
                    </div>
                    <div data-wire="true" className="absolute" style={{
                      left: 60, top: q * CELL_H + CELL_H / 2, right: 40, height: 1, background: t.wireColor,
                    }} />
                  </React.Fragment>
                ))}
                {/* Classical register — double line */}
                <div className="absolute flex items-center" style={{ left: 12, top: numQubits * CELL_H + CELL_H / 2 - 8 }}>
                  <span className="text-[13px] font-mono" style={{ color: t.textDim }}>c{numClbits}</span>
                </div>
                <div data-wire="true" className="absolute" style={{
                  left: 60, top: numQubits * CELL_H + CELL_H / 2 - 1, right: 40, height: 1, background: t.textDim, opacity: 0.4,
                }} />
                <div data-wire="true" className="absolute" style={{
                  left: 60, top: numQubits * CELL_H + CELL_H / 2 + 1, right: 40, height: 1, background: t.textDim, opacity: 0.4,
                }} />

                {/* Measurement indicators on right (IBM style circles) */}
                {Array.from({ length: numQubits }, (_, q) => {
                  const hasMeasure = gates.some(g => g.gateId === "measure" && g.qubits.includes(q));
                  return (
                    <div key={`meas-${q}`} className="absolute flex items-center justify-center"
                      style={{
                        right: 8, top: q * CELL_H + CELL_H / 2 - 12, width: 24, height: 24,
                        borderRadius: 12, border: `1.5px solid ${t.wireColor}`,
                        background: hasMeasure ? t.accent : "transparent",
                      }}>
                      {hasMeasure ? (
                        <Minus size={10} style={{ color: "white" }} />
                      ) : (
                        <svg width={10} height={10} viewBox="0 0 10 10">
                          <path d="M 1 8 Q 5 1 9 8" fill="none" stroke={t.wireColor} strokeWidth={1} />
                          <line x1={5} y1={8} x2={7.5} y2={3} stroke={t.wireColor} strokeWidth={1} />
                        </svg>
                      )}
                    </div>
                  );
                })}

                {/* Hover drop zone indicator */}
                {hoverCell && placingGate && (
                  <div className="absolute rounded pointer-events-none" style={{
                    left: 60 + hoverCell.col * CELL_W + (CELL_W - GATE_SIZE) / 2 - 2,
                    top: hoverCell.row * CELL_H + (CELL_H - GATE_SIZE) / 2 - 2,
                    width: GATE_SIZE + 4, height: GATE_SIZE + 4,
                    background: t.dropZone,
                    border: `1.5px dashed ${t.accent}`,
                  }} />
                )}

                {/* Placed gates */}
                <div className="absolute" style={{ left: 60, top: 0 }}>
                  {gates.map(g => (
                    <CanvasGate
                      key={g.id}
                      gate={g}
                      t={t}
                      selected={selectedGate === g.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedGate(selectedGate === g.id ? null : g.id);
                        setPlacingGate(null);
                      }}
                    />
                  ))}

                  {/* Context toolbar for selected gate */}
                  {selectedGateObj && (
                    <GateContextToolbar
                      gate={selectedGateObj}
                      t={t}
                      canvasRect={canvasRect}
                      onEdit={() => {
                        const def = findGateDef(selectedGateObj.gateId);
                        if (def?.parameterized) setEditingGate(selectedGateObj.id);
                      }}
                      onInfo={() => {}}
                      onCut={cutGate}
                      onCopy={copyGate}
                      onDelete={deleteSelected}
                      onClose={() => setSelectedGate(null)}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* ── Bottom Panels: Probabilities + Q-Sphere ── */}
            <div className="flex" style={{ height: 260, borderTop: `1px solid ${t.border}` }}>
              <div className="flex-1 min-w-0" style={{ borderRight: `1px solid ${t.border}` }}>
                <ProbabilitiesPanel probs={probs} t={t} numQubits={numQubits} />
              </div>
              <div className="flex-1 min-w-0">
                <QSpherePanel probs={probs} t={t} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: OpenQASM Code Panel ── */}
        {showQasm && (
          <div className="w-[280px] shrink-0 flex flex-col" style={{ background: t.panel, borderLeft: `1px solid ${t.border}` }}>
            <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: `1px solid ${t.border}` }}>
              <span className="text-[13px] font-semibold" style={{ color: t.text }}>OpenQASM 2.0</span>
              <ChevronDown size={12} style={{ color: t.textMuted }} />
              <div className="flex-1" />
              <button onClick={() => navigator.clipboard.writeText(qasmCode)}
                className="p-1 rounded" title="Copy" style={{ color: t.textMuted }}><Copy size={13} /></button>
              <button onClick={() => setShowQasm(false)} className="p-1 rounded" style={{ color: t.textMuted }}><X size={13} /></button>
            </div>
            <div className="flex-1 overflow-auto">
              <pre className="text-[13px] font-mono leading-[1.7] px-0 py-3 select-all" style={{ color: t.text }}>
                <div className="flex">
                  <div className="select-none pr-3 text-right" style={{ minWidth: 36, color: t.textDim }}>
                    {qasmCode.split("\n").map((_, i) => (
                      <div key={i} className="px-2">{i + 1}</div>
                    ))}
                  </div>
                  <div className="flex-1 min-w-0 pr-3">
                    {highlightQASM(qasmCode, t)}
                  </div>
                </div>
              </pre>
            </div>
          </div>
        )}
        {!showQasm && (
          <button onClick={() => setShowQasm(true)}
            className="w-7 shrink-0 flex items-center justify-center"
            style={{ background: t.surface, borderLeft: `1px solid ${t.border}`, color: t.textMuted }}>
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
