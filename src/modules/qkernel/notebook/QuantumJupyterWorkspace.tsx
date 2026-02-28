/**
 * QuantumJupyterWorkspace — Authentic JupyterLab experience
 * ═════════════════════════════════════════════════════════
 *
 * Dual-mode workspace designed for zero learning curve:
 *   - Workspace: Full notebook editor (feels exactly like JupyterLab)
 *   - Demos: Interactive app mode (no code, just explore)
 *
 * Design principles:
 *   - Large, readable fonts (16px base)
 *   - Plain language — no jargon
 *   - Familiar JupyterLab layout and behavior
 *   - Respects user's time — no unnecessary text
 */

import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
import {
  X, Play, Plus, FileText, Terminal,
  Folder, FolderOpen, Code, Sparkles,
  Trash2, ArrowUp, ArrowDown, Type, PlayCircle,
  RotateCcw, ChevronRight, ChevronDown,
  Atom, Brain, BarChart3, Shield, Zap,
} from "lucide-react";
import {
  createKernel,
  createNotebook,
  createCell,
  executeCell,
  getTemplateNotebooks,
  getDemoDefinitions,
  type KernelState,
  type NotebookDocument,
  type NotebookCell,
  type CellOutput,
} from "@/modules/qkernel/notebook/notebook-engine";
import { createState, realisticNoise, measure } from "@/modules/qkernel/q-simulator";

/* ── Histogram ────────────────────────────────────────────────────────────── */

function Histogram({ counts }: { counts: Record<string, number> }) {
  const entries = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  const maxCount = Math.max(...entries.map(([, c]) => c));
  const total = entries.reduce((s, [, c]) => s + c, 0);

  return (
    <div className="flex items-end gap-2 px-3 py-2" style={{ height: 160 }}>
      {entries.map(([key, count]) => (
        <div key={key} className="flex flex-col items-center gap-1 flex-1 min-w-0">
          <span className="text-xs font-mono" style={{ color: "hsl(38, 20%, 50%)" }}>
            {((count / total) * 100).toFixed(1)}%
          </span>
          <div
            className="w-full rounded-t"
            style={{
              height: `${(count / maxCount) * 100}px`,
              minHeight: 4,
              background: "linear-gradient(to top, hsl(38, 45%, 45%), hsl(38, 55%, 60%))",
            }}
          />
          <span className="text-sm font-mono font-semibold" style={{ color: "hsl(38, 15%, 35%)" }}>
            |{key}⟩
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Cell Output ──────────────────────────────────────────────────────────── */

function CellOutputView({ output }: { output: CellOutput }) {
  if (output.type === "error") {
    return (
      <pre className="text-sm font-mono px-4 py-3 rounded-lg" style={{
        background: "hsla(0, 40%, 50%, 0.06)",
        color: "hsl(0, 55%, 50%)",
        borderLeft: "3px solid hsl(0, 55%, 55%)",
      }}>
        {output.content}
      </pre>
    );
  }
  if (output.type === "histogram" && output.data?.counts) {
    return (
      <div className="rounded-lg" style={{ background: "hsla(38, 20%, 50%, 0.04)" }}>
        <Histogram counts={output.data.counts as Record<string, number>} />
      </div>
    );
  }
  if (output.type === "circuit") {
    return (
      <pre className="text-sm font-mono px-4 py-3 rounded-lg overflow-x-auto leading-relaxed" style={{
        background: "hsla(220, 15%, 50%, 0.05)",
        color: "hsl(220, 15%, 30%)",
        borderLeft: "3px solid hsl(220, 40%, 60%)",
      }}>
        {output.content}
      </pre>
    );
  }
  if (output.type === "statevector") {
    return (
      <pre className="text-sm font-mono px-4 py-3 rounded-lg overflow-x-auto leading-relaxed" style={{
        background: "hsla(260, 15%, 50%, 0.05)",
        color: "hsl(260, 20%, 35%)",
        borderLeft: "3px solid hsl(260, 40%, 60%)",
      }}>
        {output.content}
      </pre>
    );
  }
  return (
    <pre className="text-sm font-mono px-4 py-3 whitespace-pre-wrap leading-relaxed" style={{ color: "hsl(38, 15%, 30%)" }}>
      {output.content}
    </pre>
  );
}

/* ── Notebook Cell ────────────────────────────────────────────────────────── */

interface CellViewProps {
  cell: NotebookCell;
  isActive: boolean;
  onFocus: () => void;
  onChange: (source: string) => void;
  onRun: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleType: () => void;
}

function CellView({ cell, isActive, onFocus, onChange, onRun, onDelete, onMoveUp, onMoveDown, onToggleType }: CellViewProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [cell.source]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.shiftKey || e.ctrlKey)) {
      e.preventDefault();
      onRun();
    }
  };

  const isMarkdown = cell.type === "markdown";

  return (
    <div
      className="group relative flex"
      style={{
        borderLeft: isActive ? "3px solid hsl(38, 50%, 55%)" : "3px solid transparent",
        transition: "border-color 150ms",
      }}
      onClick={onFocus}
    >
      {/* Execution count — just like JupyterLab */}
      <div className="w-16 shrink-0 flex flex-col items-center pt-3 select-none">
        {!isMarkdown && (
          <span className="text-sm font-mono" style={{ color: "hsl(220, 15%, 55%)" }}>
            {cell.executionCount !== null ? `[${cell.executionCount}]` : "[ ]"}
          </span>
        )}
        {isMarkdown && <Type size={14} style={{ color: "hsl(38, 15%, 55%)" }} />}
      </div>

      {/* Cell body */}
      <div className="flex-1 min-w-0 py-2 pr-4">
        <div className="relative rounded-lg overflow-hidden" style={{
          background: isMarkdown
            ? "transparent"
            : isActive
              ? "hsla(220, 20%, 50%, 0.04)"
              : "hsla(220, 10%, 50%, 0.02)",
          border: isActive ? "1px solid hsla(220, 30%, 50%, 0.2)" : "1px solid hsla(220, 10%, 50%, 0.08)",
        }}>
          {isMarkdown && !isActive && cell.source ? (
            <div className="px-4 py-3" style={{ color: "hsl(0, 0%, 20%)" }}>
              {cell.source.split("\n").map((line, i) => {
                if (line.startsWith("# ")) return <h1 key={i} className="text-xl font-serif font-semibold mt-0 mb-2" style={{ color: "hsl(0, 0%, 15%)" }}>{line.slice(2)}</h1>;
                if (line.startsWith("## ")) return <h2 key={i} className="text-lg font-serif font-medium mt-3 mb-1.5" style={{ color: "hsl(0, 0%, 18%)" }}>{line.slice(3)}</h2>;
                if (line.startsWith("### ")) return <h3 key={i} className="text-base font-serif font-medium mt-2 mb-1" style={{ color: "hsl(0, 0%, 22%)" }}>{line.slice(4)}</h3>;
                if (line.startsWith("- ")) return <li key={i} className="text-sm ml-5 mb-0.5 leading-relaxed">{line.slice(2)}</li>;
                if (line.startsWith("|")) return <pre key={i} className="text-xs font-mono leading-relaxed" style={{ color: "hsl(0, 0%, 40%)" }}>{line}</pre>;
                if (line.startsWith("```")) return null;
                if (line.startsWith("**")) return <p key={i} className="text-sm font-semibold my-1">{line.replace(/\*\*/g, "")}</p>;
                return line ? <p key={i} className="text-sm my-1 leading-relaxed">{line}</p> : <br key={i} />;
              })}
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={cell.source}
              onChange={e => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-4 py-3 text-sm font-mono resize-none focus:outline-none bg-transparent"
              style={{
                color: isMarkdown ? "hsl(0, 0%, 25%)" : "hsl(220, 15%, 15%)",
                lineHeight: "1.8",
                minHeight: "44px",
                fontSize: "14px",
              }}
              spellCheck={false}
              placeholder={isMarkdown ? "Write notes here…" : "# Write Python code here…"}
            />
          )}

          {/* Cell toolbar */}
          {isActive && (
            <div className="flex items-center gap-1 px-3 py-1.5 border-t" style={{
              borderColor: "hsla(220, 15%, 50%, 0.1)",
              background: "hsla(220, 10%, 50%, 0.02)",
            }}>
              {!isMarkdown && (
                <button onClick={onRun} className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium hover:bg-black/5 transition-colors" style={{ color: "hsl(152, 40%, 38%)" }}>
                  <Play size={12} /> Run (Shift+Enter)
                </button>
              )}
              <button onClick={onToggleType} className="px-3 py-1 rounded text-xs hover:bg-black/5 transition-colors" style={{ color: "hsl(220, 15%, 45%)" }}>
                {isMarkdown ? "Switch to Code" : "Switch to Text"}
              </button>
              <div className="flex-1" />
              <button onClick={onMoveUp} className="p-1 rounded hover:bg-black/5"><ArrowUp size={14} style={{ color: "hsl(0, 0%, 55%)" }} /></button>
              <button onClick={onMoveDown} className="p-1 rounded hover:bg-black/5"><ArrowDown size={14} style={{ color: "hsl(0, 0%, 55%)" }} /></button>
              <button onClick={onDelete} className="p-1 rounded hover:bg-black/5"><Trash2 size={14} style={{ color: "hsl(0, 40%, 55%)" }} /></button>
            </div>
          )}
        </div>

        {/* Output area */}
        {cell.outputs.length > 0 && (
          <div className="mt-2 space-y-2 pl-1">
            {cell.outputs.map((output, i) => (
              <CellOutputView key={i} output={output} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── File Browser ─────────────────────────────────────────────────────────── */

function FileBrowser({ templates, activeId, onSelect, onNew }: {
  templates: ReturnType<typeof getTemplateNotebooks>;
  activeId: string;
  onSelect: (id: string) => void;
  onNew: (type: "quantum" | "ml") => void;
}) {
  const [demosOpen, setDemosOpen] = useState(true);
  const [projectsOpen, setProjectsOpen] = useState(true);

  return (
    <div className="h-full flex flex-col" style={{ background: "hsl(220, 10%, 97%)", borderRight: "1px solid hsla(220, 10%, 50%, 0.12)" }}>
      <div className="px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(220, 10%, 50%)", borderBottom: "1px solid hsla(220, 10%, 50%, 0.1)" }}>
        Files
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {/* Examples folder */}
        <button onClick={() => setDemosOpen(!demosOpen)} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-black/3 transition-colors">
          <ChevronRight size={12} className={`transition-transform ${demosOpen ? "rotate-90" : ""}`} style={{ color: "hsl(220, 10%, 50%)" }} />
          {demosOpen ? <FolderOpen size={14} style={{ color: "hsl(38, 45%, 50%)" }} /> : <Folder size={14} style={{ color: "hsl(38, 45%, 50%)" }} />}
          <span className="text-sm font-medium" style={{ color: "hsl(0, 0%, 25%)" }}>Examples</span>
        </button>
        {demosOpen && (
          <div className="pl-8 space-y-0.5">
            {templates.map(t => (
              <button
                key={t.id}
                onClick={() => onSelect(t.id)}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-left transition-colors"
                style={{
                  background: activeId === t.id ? "hsla(220, 40%, 50%, 0.08)" : "transparent",
                  color: activeId === t.id ? "hsl(220, 30%, 30%)" : "hsl(0, 0%, 40%)",
                }}
              >
                <FileText size={13} />
                <span className="text-sm truncate">{t.name}.ipynb</span>
              </button>
            ))}
          </div>
        )}

        {/* My Notebooks folder */}
        <button onClick={() => setProjectsOpen(!projectsOpen)} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-black/3 transition-colors mt-1">
          <ChevronRight size={12} className={`transition-transform ${projectsOpen ? "rotate-90" : ""}`} style={{ color: "hsl(220, 10%, 50%)" }} />
          {projectsOpen ? <FolderOpen size={14} style={{ color: "hsl(152, 35%, 50%)" }} /> : <Folder size={14} style={{ color: "hsl(152, 35%, 50%)" }} />}
          <span className="text-sm font-medium" style={{ color: "hsl(0, 0%, 25%)" }}>My Notebooks</span>
        </button>
        {projectsOpen && (
          <div className="pl-8 text-sm py-2 px-3" style={{ color: "hsl(0, 0%, 55%)" }}>
            Your saved work appears here
          </div>
        )}
      </div>

      {/* New notebook */}
      <div className="p-3 space-y-1.5" style={{ borderTop: "1px solid hsla(220, 10%, 50%, 0.1)" }}>
        <button onClick={() => onNew("quantum")} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-black/5" style={{ color: "hsl(220, 30%, 40%)" }}>
          <Atom size={14} /> New Notebook
        </button>
        <button onClick={() => onNew("ml")} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-black/5" style={{ color: "hsl(280, 30%, 45%)" }}>
          <Brain size={14} /> New Quantum+ML Notebook
        </button>
      </div>
    </div>
  );
}

/* ── Demo Card ────────────────────────────────────────────────────────────── */

function DemoCard({ demo, onOpen, onOpenInWorkspace }: { demo: ReturnType<typeof getDemoDefinitions>[0]; onOpen: () => void; onOpenInWorkspace: () => void }) {
  return (
    <div className="group rounded-xl p-5 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg" style={{
      background: "hsl(0, 0%, 100%)",
      border: "1px solid hsla(0, 0%, 50%, 0.1)",
      boxShadow: "0 1px 3px hsla(0, 0%, 0%, 0.04)",
    }} onClick={onOpen}>
      <span className="text-3xl block mb-3">{demo.icon}</span>
      <h3 className="text-base font-semibold mb-1" style={{ color: "hsl(0, 0%, 15%)" }}>{demo.name}</h3>
      <p className="text-sm leading-relaxed mb-4" style={{ color: "hsl(0, 0%, 45%)" }}>{demo.description}</p>
      <div className="flex gap-2">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors" style={{
          background: "hsl(38, 45%, 48%)",
          color: "white",
        }}>
          <PlayCircle size={14} /> Run
        </button>
        <button onClick={e => { e.stopPropagation(); onOpenInWorkspace(); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-black/5" style={{
          border: "1px solid hsla(0, 0%, 50%, 0.15)",
          color: "hsl(0, 0%, 40%)",
        }}>
          <Code size={14} /> View Code
        </button>
      </div>
    </div>
  );
}

/* ── Demo Viewer (Voilà) ──────────────────────────────────────────────────── */

/* Mitigation toggle switch */
function MitigationToggle({ label, description, enabled, onChange }: {
  label: string; description: string; enabled: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className="w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all"
      style={{
        background: enabled ? "hsla(38, 50%, 50%, 0.06)" : "transparent",
        border: enabled ? "1px solid hsla(38, 50%, 50%, 0.2)" : "1px solid hsla(0, 0%, 50%, 0.08)",
      }}
    >
      <div
        className="w-9 h-5 rounded-full shrink-0 mt-0.5 transition-colors relative"
        style={{ background: enabled ? "hsl(38, 50%, 50%)" : "hsl(0, 0%, 78%)" }}
      >
        <div
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all"
          style={{ left: enabled ? 18 : 2 }}
        />
      </div>
      <div className="min-w-0">
        <span className="text-sm font-semibold block" style={{ color: "hsl(0, 0%, 15%)" }}>{label}</span>
        <span className="text-xs leading-snug block mt-0.5" style={{ color: "hsl(0, 0%, 52%)" }}>{description}</span>
      </div>
    </button>
  );
}

/* Before/After histogram comparison */
function ComparisonHistogram({ rawCounts, mitigatedCounts, rawLabel, mitigatedLabel }: {
  rawCounts: Record<string, number>;
  mitigatedCounts: Record<string, number>;
  rawLabel: string;
  mitigatedLabel: string;
}) {
  const allKeys = Array.from(new Set([...Object.keys(rawCounts), ...Object.keys(mitigatedCounts)])).sort();
  const rawTotal = Object.values(rawCounts).reduce((s, c) => s + c, 0);
  const mitTotal = Object.values(mitigatedCounts).reduce((s, c) => s + c, 0);
  const maxPct = Math.max(
    ...allKeys.map(k => (rawCounts[k] || 0) / rawTotal * 100),
    ...allKeys.map(k => (mitigatedCounts[k] || 0) / mitTotal * 100),
  );

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex items-center gap-4 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: "hsl(0, 0%, 72%)" }} />
          <span className="text-xs font-medium" style={{ color: "hsl(0, 0%, 50%)" }}>{rawLabel}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: "hsl(38, 55%, 50%)" }} />
          <span className="text-xs font-medium" style={{ color: "hsl(38, 40%, 40%)" }}>{mitigatedLabel}</span>
        </div>
      </div>
      {/* Bars */}
      <div className="space-y-2">
        {allKeys.map(key => {
          const rawPct = rawTotal > 0 ? (rawCounts[key] || 0) / rawTotal * 100 : 0;
          const mitPct = mitTotal > 0 ? (mitigatedCounts[key] || 0) / mitTotal * 100 : 0;
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="text-xs font-mono w-10 text-right shrink-0" style={{ color: "hsl(0, 0%, 35%)" }}>|{key}⟩</span>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-3 rounded-sm" style={{ width: `${Math.max(1, rawPct / maxPct * 100)}%`, background: "hsl(0, 0%, 72%)" }} />
                  <span className="text-xs font-mono shrink-0" style={{ color: "hsl(0, 0%, 55%)" }}>{rawPct.toFixed(1)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 rounded-sm" style={{ width: `${Math.max(1, mitPct / maxPct * 100)}%`, background: "hsl(38, 55%, 50%)" }} />
                  <span className="text-xs font-mono shrink-0" style={{ color: "hsl(38, 40%, 40%)" }}>{mitPct.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DemoViewer({ demo, kernel, onClose, onOpenInWorkspace }: {
  demo: ReturnType<typeof getDemoDefinitions>[0];
  kernel: KernelState;
  onClose: () => void;
  onOpenInWorkspace: () => void;
}) {
  const template = getTemplateNotebooks().find(t => t.id === demo.notebookId);
  const [controlValues, setControlValues] = useState<Record<string, number | string | boolean>>(() =>
    Object.fromEntries(demo.controls.map(c => [c.id, c.defaultValue]))
  );
  const [outputs, setOutputs] = useState<CellOutput[]>([]);
  const [running, setRunning] = useState(false);

  // Error mitigation state
  const [enableZne, setEnableZne] = useState(false);
  const [enableMem, setEnableMem] = useState(false);
  const [enableRc, setEnableRc] = useState(false);
  const [rawCounts, setRawCounts] = useState<Record<string, number> | null>(null);
  const [mitigatedCounts, setMitigatedCounts] = useState<Record<string, number> | null>(null);
  const [mitigationStages, setMitigationStages] = useState<string[]>([]);
  const [zneValue, setZneValue] = useState<number | null>(null);

  const anyMitigationEnabled = enableZne || enableMem || enableRc;

  const runDemo = useCallback(async () => {
    if (!template) return;
    setRunning(true);
    const k = createKernel();
    // If noise control exists, apply it
    const noiseLevel = controlValues["noise"] as string | undefined;
    if (noiseLevel && noiseLevel !== "none") {
      k.noiseModel = realisticNoise(noiseLevel as "low" | "medium" | "high");
    }

    const allOutputs: CellOutput[] = [];
    for (const cell of template.cells) {
      if (cell.type === "code") {
        allOutputs.push(...executeCell(k, cell));
      }
    }
    setOutputs(allOutputs);

    // Run error mitigation if any toggle is on and we have a circuit
    if (anyMitigationEnabled && k.circuit && k.circuit.ops.length > 0) {
      try {
        const {
          zeroNoiseExtrapolation,
          buildCalibrationMatrix,
          applyMeasurementMitigation,
          randomizedCompiling,
          mitigateFull,
        } = await import("@/modules/qkernel/q-error-mitigation");
        

        const noise = k.circuit.noise;
        const ops = k.circuit.ops;
        const numQubits = k.circuit.numQubits;
        const shots = (controlValues["shots"] as number) || 1024;

        // Get raw (noisy) counts
        const rawState = createState(numQubits);
        rawState.ops = [...ops];
        rawState.noise = noise;
        const raw = measure(rawState, shots);
        setRawCounts(raw);

        // Run full mitigation pipeline
        const result = mitigateFull(ops, numQubits, noise, {
          enableZne,
          enableMem,
          enableRc,
          shots,
        });

        setMitigatedCounts(result.counts);
        setMitigationStages(result.stages);
        setZneValue(result.zne?.mitigated ?? null);
      } catch (e) {
        console.error("Mitigation error:", e);
      }
    } else {
      setRawCounts(null);
      setMitigatedCounts(null);
      setMitigationStages([]);
      setZneValue(null);
    }

    setTimeout(() => setRunning(false), 300);
  }, [template, controlValues, anyMitigationEnabled, enableZne, enableMem, enableRc]);

  useEffect(() => { runDemo(); }, []);

  return (
    <div className="h-full flex flex-col" style={{ background: "hsl(0, 0%, 98%)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: "1px solid hsla(0, 0%, 50%, 0.1)", background: "hsl(0, 0%, 100%)" }}>
        <button onClick={onClose} className="p-1 rounded hover:bg-black/5"><ChevronDown size={18} style={{ color: "hsl(0, 0%, 45%)" }} /></button>
        <span className="text-2xl">{demo.icon}</span>
        <div className="flex-1">
          <h2 className="text-base font-semibold" style={{ color: "hsl(0, 0%, 15%)" }}>{demo.name}</h2>
          <p className="text-sm" style={{ color: "hsl(0, 0%, 50%)" }}>{demo.description}</p>
        </div>
        <button onClick={onOpenInWorkspace} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium" style={{
          border: "1px solid hsla(0, 0%, 50%, 0.15)",
          color: "hsl(0, 0%, 40%)",
        }}>
          <Code size={14} /> View Code
        </button>
      </div>

      {/* Body: 3 columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Controls */}
        <div className="w-64 shrink-0 p-5 space-y-5 overflow-y-auto" style={{ borderRight: "1px solid hsla(0, 0%, 50%, 0.08)", background: "hsl(0, 0%, 100%)" }}>
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(0, 0%, 50%)" }}>Settings</h3>
          {demo.controls.map(ctrl => (
            <div key={ctrl.id} className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "hsl(0, 0%, 25%)" }}>{ctrl.label}</label>
              {ctrl.type === "slider" && (
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={ctrl.min} max={ctrl.max} step={ctrl.step}
                    value={controlValues[ctrl.id] as number}
                    onChange={e => setControlValues(prev => ({ ...prev, [ctrl.id]: parseFloat(e.target.value) }))}
                    className="flex-1 accent-[hsl(38,45%,48%)]"
                  />
                  <span className="text-sm font-mono w-10 text-right" style={{ color: "hsl(0, 0%, 40%)" }}>
                    {controlValues[ctrl.id]}
                  </span>
                </div>
              )}
              {ctrl.type === "select" && (
                <select
                  value={controlValues[ctrl.id] as string}
                  onChange={e => setControlValues(prev => ({ ...prev, [ctrl.id]: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-lg text-sm bg-transparent" style={{ border: "1px solid hsla(0, 0%, 50%, 0.15)", color: "hsl(0, 0%, 25%)" }}
                >
                  {ctrl.options?.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              )}
            </div>
          ))}

          {/* Error Mitigation Section */}
          <div className="pt-3" style={{ borderTop: "1px solid hsla(0, 0%, 50%, 0.08)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Shield size={14} style={{ color: "hsl(38, 50%, 48%)" }} />
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(0, 0%, 50%)" }}>Error Mitigation</h3>
            </div>
            <div className="space-y-2">
              <MitigationToggle
                label="ZNE"
                description="Run at multiple noise levels, extrapolate to zero"
                enabled={enableZne}
                onChange={setEnableZne}
              />
              <MitigationToggle
                label="MEM"
                description="Calibrate readout errors and correct measurements"
                enabled={enableMem}
                onChange={setEnableMem}
              />
              <MitigationToggle
                label="RC"
                description="Randomize gate sequences to average out systematic errors"
                enabled={enableRc}
                onChange={setEnableRc}
              />
            </div>
          </div>

          <button onClick={runDemo} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors" style={{
            background: "hsl(38, 45%, 48%)",
            color: "white",
          }}>
            {running ? <RotateCcw size={14} className="animate-spin" /> : <Play size={14} />}
            {anyMitigationEnabled ? "Run with Mitigation" : "Run"}
          </button>
        </div>

        {/* Circuit & State */}
        <div className="flex-1 p-5 space-y-4 overflow-y-auto">
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(0, 0%, 50%)" }}>Circuit & State</h3>
          {outputs.filter(o => o.type === "circuit" || o.type === "statevector").map((o, i) => (
            <CellOutputView key={i} output={o} />
          ))}
          {outputs.filter(o => o.type === "circuit" || o.type === "statevector").length === 0 && (
            <div className="flex items-center justify-center h-40 rounded-lg" style={{ background: "hsla(0, 0%, 50%, 0.03)", border: "1px dashed hsla(0, 0%, 50%, 0.15)" }}>
              <span className="text-sm" style={{ color: "hsl(0, 0%, 55%)" }}>Press Run to see the circuit</span>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="w-80 shrink-0 p-5 space-y-4 overflow-y-auto" style={{ borderLeft: "1px solid hsla(0, 0%, 50%, 0.08)", background: "hsl(0, 0%, 100%)" }}>
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(0, 0%, 50%)" }}>Results</h3>

          {/* Before/After comparison when mitigation is active */}
          {rawCounts && mitigatedCounts && anyMitigationEnabled && (
            <div className="space-y-4">
              {/* Summary badge */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "hsla(38, 50%, 50%, 0.06)", border: "1px solid hsla(38, 50%, 50%, 0.12)" }}>
                <Zap size={14} style={{ color: "hsl(38, 50%, 48%)" }} />
                <span className="text-xs font-medium" style={{ color: "hsl(38, 40%, 35%)" }}>
                  {mitigationStages.length} stage{mitigationStages.length !== 1 ? "s" : ""} applied
                  {zneValue !== null && ` · ZNE: ${zneValue.toFixed(4)}`}
                </span>
              </div>

              {/* Stages list */}
              <div className="space-y-1">
                {mitigationStages.map((stage, i) => (
                  <div key={stage} className="flex items-center gap-2 text-xs" style={{ color: "hsl(152, 35%, 40%)" }}>
                    <span className="font-mono">✓</span>
                    <span className="font-medium">
                      {stage === "randomized_compiling" ? "Randomized Compiling" :
                       stage === "zero_noise_extrapolation" ? "Zero-Noise Extrapolation" :
                       stage === "measurement_error_mitigation" ? "Measurement Error Mitigation" : stage}
                    </span>
                  </div>
                ))}
              </div>

              {/* Comparison chart */}
              <ComparisonHistogram
                rawCounts={rawCounts}
                mitigatedCounts={mitigatedCounts}
                rawLabel="Before"
                mitigatedLabel="After"
              />
            </div>
          )}

          {/* Standard histogram when no mitigation */}
          {(!anyMitigationEnabled || !mitigatedCounts) && outputs.filter(o => o.type === "histogram").map((o, i) => (
            <CellOutputView key={i} output={o} />
          ))}
          {outputs.filter(o => o.type === "text" || o.type === "error").map((o, i) => (
            <CellOutputView key={i} output={o} />
          ))}
          {outputs.length === 0 && !mitigatedCounts && (
            <div className="text-center py-10">
              <BarChart3 size={28} className="mx-auto mb-3" style={{ color: "hsl(0, 0%, 65%)" }} />
              <span className="text-sm" style={{ color: "hsl(0, 0%, 55%)" }}>Results appear here</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Workspace ───────────────────────────────────────────────────────── */

type WorkspaceMode = "landing" | "workspace" | "demos";

interface QuantumJupyterWorkspaceProps {
  onClose?: () => void;
}

export default function QuantumJupyterWorkspace({ onClose }: QuantumJupyterWorkspaceProps) {
  const [mode, setMode] = useState<WorkspaceMode>("landing");
  const [notebook, setNotebook] = useState<NotebookDocument>(() => createNotebook("Untitled"));
  const [kernel] = useState<KernelState>(() => createKernel());
  const [activeCell, setActiveCell] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeDemoId, setActiveDemoId] = useState<string | null>(null);
  const templates = useMemo(() => getTemplateNotebooks(), []);
  const demos = useMemo(() => getDemoDefinitions(), []);

  const updateCell = useCallback((id: string, source: string) => {
    setNotebook(prev => ({
      ...prev,
      cells: prev.cells.map(c => c.id === id ? { ...c, source } : c),
      metadata: { ...prev.metadata, modified_at: new Date().toISOString() },
    }));
  }, []);

  const runCell = useCallback((id: string) => {
    setNotebook(prev => {
      const cell = prev.cells.find(c => c.id === id);
      if (!cell) return prev;
      const outputs = executeCell(kernel, cell);
      return {
        ...prev,
        cells: prev.cells.map(c => c.id === id ? {
          ...c, outputs,
          status: outputs.some(o => o.type === "error") ? "error" as const : "success" as const,
          executionCount: kernel.executionCounter,
        } : c),
      };
    });
  }, [kernel]);

  const runAllCells = useCallback(() => {
    setNotebook(prev => {
      const newCells = prev.cells.map(c => {
        if (c.type !== "code") return c;
        const outputs = executeCell(kernel, c);
        return { ...c, outputs, status: outputs.some(o => o.type === "error") ? "error" as const : "success" as const, executionCount: kernel.executionCounter };
      });
      return { ...prev, cells: newCells };
    });
  }, [kernel]);

  const addCell = useCallback((afterId: string | null, type: "code" | "markdown" = "code") => {
    const newCell = createCell(type);
    setNotebook(prev => {
      const idx = afterId ? prev.cells.findIndex(c => c.id === afterId) : prev.cells.length - 1;
      const cells = [...prev.cells];
      cells.splice(idx + 1, 0, newCell);
      return { ...prev, cells };
    });
    setActiveCell(newCell.id);
  }, []);

  const deleteCell = useCallback((id: string) => {
    setNotebook(prev => ({
      ...prev,
      cells: prev.cells.length > 1 ? prev.cells.filter(c => c.id !== id) : prev.cells,
    }));
  }, []);

  const moveCell = useCallback((id: string, direction: -1 | 1) => {
    setNotebook(prev => {
      const idx = prev.cells.findIndex(c => c.id === id);
      if (idx < 0) return prev;
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= prev.cells.length) return prev;
      const cells = [...prev.cells];
      [cells[idx], cells[newIdx]] = [cells[newIdx], cells[idx]];
      return { ...prev, cells };
    });
  }, []);

  const toggleCellType = useCallback((id: string) => {
    setNotebook(prev => ({
      ...prev,
      cells: prev.cells.map(c => c.id === id ? { ...c, type: c.type === "code" ? "markdown" as const : "code" as const } : c),
    }));
  }, []);

  const loadTemplate = useCallback((templateId: string) => {
    const tmpl = templates.find(t => t.id === templateId);
    if (!tmpl) return;
    const nb = createNotebook(tmpl.name, tmpl.cells.map(c => ({ ...c, id: `cell-${Math.random().toString(36).slice(2)}` })));
    setNotebook(nb);
    setMode("workspace");
  }, [templates]);

  const activeDemo = activeDemoId ? demos.find(d => d.id === activeDemoId) : null;

  /* ── Landing ──────────────────────────────────────────────────────────────── */
  if (mode === "landing") {
    const featured = templates.slice(0, 4);
    return (
      <div className="h-full flex flex-col" style={{ background: "hsl(0, 0%, 98%)" }}>
        {/* Top bar */}
        <div className="flex items-center gap-3 px-6 py-3.5" style={{ borderBottom: "1px solid hsla(0, 0%, 50%, 0.08)", background: "hsl(0, 0%, 100%)" }}>
          <Atom size={22} style={{ color: "hsl(38, 50%, 50%)" }} />
          <span className="text-lg font-semibold" style={{ color: "hsl(0, 0%, 12%)" }}>Quantum Workspace</span>
          <div className="flex-1" />
          {onClose && <button onClick={onClose} className="p-2 rounded-lg hover:bg-black/5"><X size={20} style={{ color: "hsl(0, 0%, 45%)" }} /></button>}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-8 py-12">
            {/* Hero */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-serif font-semibold mb-4" style={{ color: "hsl(0, 0%, 10%)" }}>
                Quantum Workspace
              </h1>
              <p className="text-lg leading-relaxed max-w-lg mx-auto" style={{ color: "hsl(0, 0%, 42%)" }}>
                Run quantum computing demos, then open the same code as editable notebooks to build your own experiments.
              </p>
            </div>

            {/* Two main buttons */}
            <div className="flex gap-6 justify-center mb-14">
              <button
                onClick={() => setMode("workspace")}
                className="group flex flex-col items-center gap-4 p-10 rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg flex-1 max-w-xs"
                style={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsla(0, 0%, 50%, 0.1)" }}
              >
                <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: "hsla(220, 40%, 50%, 0.07)" }}>
                  <Code size={30} style={{ color: "hsl(220, 40%, 50%)" }} />
                </div>
                <span className="text-lg font-semibold" style={{ color: "hsl(0, 0%, 12%)" }}>Open Workspace</span>
                <span className="text-base" style={{ color: "hsl(0, 0%, 50%)" }}>Write and run code</span>
              </button>

              <button
                onClick={() => setMode("demos")}
                className="group flex flex-col items-center gap-4 p-10 rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg flex-1 max-w-xs"
                style={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsla(0, 0%, 50%, 0.1)" }}
              >
                <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: "hsla(38, 50%, 50%, 0.07)" }}>
                  <Sparkles size={30} style={{ color: "hsl(38, 50%, 50%)" }} />
                </div>
                <span className="text-lg font-semibold" style={{ color: "hsl(0, 0%, 12%)" }}>Open Demos</span>
                <span className="text-base" style={{ color: "hsl(0, 0%, 50%)" }}>Interactive examples</span>
              </button>
            </div>

            {/* Featured notebooks */}
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "hsl(0, 0%, 48%)" }}>Featured Notebooks</h2>
              <div className="grid grid-cols-2 gap-4">
                {featured.map(t => (
                  <button
                    key={t.id}
                    onClick={() => loadTemplate(t.id)}
                    className="flex items-start gap-4 p-5 rounded-xl text-left transition-all duration-200 hover:shadow-md hover:scale-[1.01]"
                    style={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsla(0, 0%, 50%, 0.08)" }}
                  >
                    <span className="text-2xl mt-0.5">{t.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold mb-1" style={{ color: "hsl(0, 0%, 12%)" }}>{t.name}</h3>
                      <p className="text-sm leading-relaxed" style={{ color: "hsl(0, 0%, 50%)" }}>{t.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <p className="text-sm text-center mt-10" style={{ color: "hsl(0, 0%, 58%)" }}>
              Every result is verified and reproducible.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Demos (Voilà) ────────────────────────────────────────────────────────── */
  if (mode === "demos") {
    if (activeDemo) {
      return (
        <DemoViewer
          demo={activeDemo}
          kernel={kernel}
          onClose={() => setActiveDemoId(null)}
          onOpenInWorkspace={() => {
            loadTemplate(activeDemo.notebookId);
            setActiveDemoId(null);
          }}
        />
      );
    }

    return (
      <div className="h-full flex flex-col" style={{ background: "hsl(0, 0%, 98%)" }}>
        <div className="flex items-center gap-3 px-6 py-3.5" style={{ borderBottom: "1px solid hsla(0, 0%, 50%, 0.08)", background: "hsl(0, 0%, 100%)" }}>
          <Sparkles size={22} style={{ color: "hsl(38, 50%, 50%)" }} />
          <span className="text-lg font-semibold" style={{ color: "hsl(0, 0%, 12%)" }}>Demos</span>
          <div className="flex-1" />
          <button onClick={() => setMode("workspace")} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-base font-medium hover:bg-black/5" style={{ color: "hsl(220, 30%, 45%)" }}>
            <Code size={16} /> Workspace
          </button>
          <button onClick={() => setMode("landing")} className="px-4 py-1.5 rounded-lg text-base font-medium hover:bg-black/5" style={{ color: "hsl(0, 0%, 45%)" }}>
            Home
          </button>
          {onClose && <button onClick={onClose} className="p-2 rounded-lg hover:bg-black/5"><X size={18} style={{ color: "hsl(0, 0%, 45%)" }} /></button>}
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-serif font-semibold mb-2" style={{ color: "hsl(0, 0%, 10%)" }}>Interactive Demos</h2>
            <p className="text-base mb-8" style={{ color: "hsl(0, 0%, 48%)" }}>
              Explore quantum computing hands-on. No coding required.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {demos.map(demo => (
                <DemoCard
                  key={demo.id}
                  demo={demo}
                  onOpen={() => setActiveDemoId(demo.id)}
                  onOpenInWorkspace={() => loadTemplate(demo.notebookId)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Workspace (JupyterLab) ───────────────────────────────────────────────── */
  return (
    <div className="h-full flex flex-col" style={{ background: "hsl(0, 0%, 100%)" }}>
      {/* Menu bar — mirrors JupyterLab */}
      <div className="flex items-center gap-2 px-4 py-2.5" style={{
        borderBottom: "1px solid hsla(220, 10%, 50%, 0.12)",
        background: "hsl(220, 10%, 97%)",
      }}>
        <Atom size={18} style={{ color: "hsl(38, 50%, 50%)" }} />
        <span className="text-base font-semibold mr-3" style={{ color: "hsl(0, 0%, 15%)" }}>Notebook</span>

        <div className="flex items-center gap-1 px-2" style={{ borderLeft: "1px solid hsla(220, 10%, 50%, 0.12)" }}>
          <button onClick={() => addCell(activeCell, "code")} className="p-1.5 rounded hover:bg-black/5" title="Add cell">
            <Plus size={17} style={{ color: "hsl(0, 0%, 40%)" }} />
          </button>
          <button onClick={runAllCells} className="flex items-center gap-1.5 px-3 py-1 rounded hover:bg-black/5" title="Run all">
            <Play size={15} style={{ color: "hsl(152, 40%, 38%)" }} />
            <span className="text-base font-medium" style={{ color: "hsl(152, 40%, 38%)" }}>Run All</span>
          </button>
        </div>

        <div className="flex items-center gap-1 px-2" style={{ borderLeft: "1px solid hsla(220, 10%, 50%, 0.12)" }}>
          <span className="text-sm font-mono px-2.5 py-1 rounded" style={{ background: "hsla(152, 30%, 50%, 0.06)", color: "hsl(152, 35%, 38%)" }}>
            Python 3.11 ●
          </span>
        </div>

        <div className="flex-1" />

        <button onClick={() => setMode("demos")} className="flex items-center gap-1.5 px-3 py-1 rounded text-base hover:bg-black/5" style={{ color: "hsl(0, 0%, 45%)" }}>
          <Sparkles size={15} /> Demos
        </button>
        <button onClick={() => setMode("landing")} className="px-3 py-1 rounded text-base hover:bg-black/5" style={{ color: "hsl(0, 0%, 45%)" }}>
          Home
        </button>
        {onClose && <button onClick={onClose} className="p-1.5 rounded hover:bg-black/5"><X size={18} style={{ color: "hsl(0, 0%, 45%)" }} /></button>}
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {sidebarOpen && (
          <div className="w-60 shrink-0">
            <FileBrowser
              templates={templates}
              activeId={notebook.id}
              onSelect={loadTemplate}
              onNew={(type) => {
                const nb = createNotebook(
                  type === "quantum" ? "Untitled" : "Quantum+ML Notebook",
                  type === "ml" ? [
                    createCell("markdown", "# Quantum + ML Notebook\nCombine quantum circuits with machine learning."),
                    createCell("code", "from qiskit import QuantumCircuit\nfrom sklearn.svm import SVC"),
                    createCell("code", ""),
                  ] : [
                    createCell("markdown", "# Untitled Notebook\nWrite your quantum code below."),
                    createCell("code", "from qiskit import QuantumCircuit\n\nqc = QuantumCircuit(2)\nqc.h(0)\nqc.cx(0, 1)\nqc.draw()"),
                  ]
                );
                setNotebook(nb);
              }}
            />
          </div>
        )}

        {/* Notebook editor */}
        <div className="flex-1 overflow-y-auto">
          {/* Tab bar */}
          <div className="flex items-center gap-1 px-4 py-2" style={{ borderBottom: "1px solid hsla(220, 10%, 50%, 0.06)", background: "hsl(220, 10%, 97%)" }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded hover:bg-black/5 mr-2">
              <FileText size={16} style={{ color: "hsl(0, 0%, 45%)" }} />
            </button>
            <div className="flex items-center gap-2 px-4 py-2 rounded-t text-base font-medium" style={{
              background: "hsl(0, 0%, 100%)",
              color: "hsl(0, 0%, 18%)",
              borderBottom: "2px solid hsl(38, 50%, 55%)",
            }}>
              <FileText size={15} />
              {notebook.name}.ipynb
            </div>
          </div>

          {/* Cells */}
          <div className="max-w-4xl mx-auto py-6 space-y-2">
            {notebook.cells.map((cell) => (
              <React.Fragment key={cell.id}>
                <CellView
                  cell={cell}
                  isActive={activeCell === cell.id}
                  onFocus={() => setActiveCell(cell.id)}
                  onChange={source => updateCell(cell.id, source)}
                  onRun={() => runCell(cell.id)}
                  onDelete={() => deleteCell(cell.id)}
                  onMoveUp={() => moveCell(cell.id, -1)}
                  onMoveDown={() => moveCell(cell.id, 1)}
                  onToggleType={() => toggleCellType(cell.id)}
                />
                {activeCell === cell.id && (
                  <div className="flex items-center justify-center py-1 opacity-0 hover:opacity-100 transition-opacity">
                    <button onClick={() => addCell(cell.id, "code")} className="flex items-center gap-1.5 px-3 py-1 rounded text-sm hover:bg-black/5" style={{ color: "hsl(0, 0%, 50%)" }}>
                      <Plus size={13} /> Code
                    </button>
                    <button onClick={() => addCell(cell.id, "markdown")} className="flex items-center gap-1.5 px-3 py-1 rounded text-sm hover:bg-black/5" style={{ color: "hsl(0, 0%, 50%)" }}>
                      <Plus size={13} /> Text
                    </button>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-4 px-5 py-2" style={{
        borderTop: "1px solid hsla(220, 10%, 50%, 0.08)",
        background: "hsl(220, 10%, 97%)",
      }}>
        <span className="flex items-center gap-1.5 text-sm" style={{ color: "hsl(152, 35%, 40%)" }}>
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(152, 45%, 50%)" }} />
          Python 3.11
        </span>
        <span className="text-sm" style={{ color: "hsl(0, 0%, 52%)" }}>
          {notebook.cells.length} cells · {notebook.cells.filter(c => c.executionCount).length} run
        </span>
        <div className="flex-1" />
        <span className="text-sm" style={{ color: "hsl(0, 0%, 52%)" }}>
          Qiskit · Cirq · PennyLane
        </span>
      </div>
    </div>
  );
}
