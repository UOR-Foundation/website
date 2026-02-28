/**
 * QuantumJupyterWorkspace — Full JupyterLab + Voilà Dual-Mode UI
 * ═══════════════════════════════════════════════════════════════
 *
 * Dual-mode workspace:
 *   - Workspace Mode: Full JupyterLab-style notebook editor
 *   - Demo Mode: Voilà-style interactive demo card grid
 *
 * Design: JupyterLab's signature layout with Hologram earth-tone aesthetics.
 */

import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
import {
  X, Play, Plus, ChevronDown, FileText, Terminal, BookOpen,
  Folder, FolderOpen, Code, Sparkles, Beaker, BarChart3,
  Trash2, Copy, ArrowUp, ArrowDown, Type, PlayCircle,
  RotateCcw, Maximize2, Minimize2, ChevronRight,
  Zap, Atom, Brain, GitBranch,
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

// ── Histogram renderer ──────────────────────────────────────────────────────

function Histogram({ counts }: { counts: Record<string, number> }) {
  const entries = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  const maxCount = Math.max(...entries.map(([, c]) => c));
  const total = entries.reduce((s, [, c]) => s + c, 0);

  return (
    <div className="flex items-end gap-1 h-32 px-2 py-1">
      {entries.map(([key, count]) => (
        <div key={key} className="flex flex-col items-center gap-1 flex-1 min-w-0">
          <span className="text-[9px] font-mono" style={{ color: "hsl(38, 20%, 55%)" }}>
            {((count / total) * 100).toFixed(1)}%
          </span>
          <div
            className="w-full rounded-t"
            style={{
              height: `${(count / maxCount) * 80}px`,
              minHeight: 4,
              background: `linear-gradient(to top, hsl(38, 45%, 45%), hsl(38, 55%, 60%))`,
            }}
          />
          <span className="text-[10px] font-mono font-semibold" style={{ color: "hsl(38, 15%, 40%)" }}>
            |{key}⟩
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Cell Output Renderer ────────────────────────────────────────────────────

function CellOutputView({ output }: { output: CellOutput }) {
  if (output.type === "error") {
    return (
      <pre className="text-xs font-mono px-3 py-2 rounded-lg" style={{
        background: "hsla(0, 40%, 50%, 0.08)",
        color: "hsl(0, 60%, 55%)",
        borderLeft: "3px solid hsl(0, 60%, 55%)",
      }}>
        {output.content}
      </pre>
    );
  }
  if (output.type === "histogram" && output.data?.counts) {
    return (
      <div className="rounded-lg p-2" style={{ background: "hsla(38, 20%, 50%, 0.05)" }}>
        <Histogram counts={output.data.counts as Record<string, number>} />
      </div>
    );
  }
  if (output.type === "circuit") {
    return (
      <pre className="text-xs font-mono px-3 py-2 rounded-lg overflow-x-auto" style={{
        background: "hsla(220, 15%, 50%, 0.06)",
        color: "hsl(220, 15%, 35%)",
        borderLeft: "3px solid hsl(220, 40%, 55%)",
      }}>
        {output.content}
      </pre>
    );
  }
  if (output.type === "statevector") {
    return (
      <pre className="text-xs font-mono px-3 py-2 rounded-lg overflow-x-auto" style={{
        background: "hsla(260, 15%, 50%, 0.06)",
        color: "hsl(260, 20%, 40%)",
        borderLeft: "3px solid hsl(260, 40%, 55%)",
      }}>
        {output.content}
      </pre>
    );
  }
  return (
    <pre className="text-xs font-mono px-3 py-2 whitespace-pre-wrap" style={{ color: "hsl(38, 15%, 35%)" }}>
      {output.content}
    </pre>
  );
}

// ── Notebook Cell Component ─────────────────────────────────────────────────

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
  const hasOutputs = cell.outputs.length > 0;

  return (
    <div
      className="group relative flex"
      style={{
        borderLeft: isActive ? "3px solid hsl(38, 50%, 55%)" : "3px solid transparent",
        transition: "border-color 150ms",
      }}
      onClick={onFocus}
    >
      {/* Execution count gutter */}
      <div className="w-14 shrink-0 flex flex-col items-center pt-2.5 select-none">
        {!isMarkdown && (
          <span className="text-[11px] font-mono" style={{ color: "hsl(38, 15%, 50%)" }}>
            {cell.executionCount !== null ? `[${cell.executionCount}]` : "[ ]"}
          </span>
        )}
        {isMarkdown && <Type size={12} style={{ color: "hsl(38, 15%, 50%)" }} />}
      </div>

      {/* Cell body */}
      <div className="flex-1 min-w-0 py-1.5 pr-3">
        {/* Input area */}
        <div className="relative rounded-lg overflow-hidden" style={{
          background: isMarkdown
            ? "transparent"
            : isActive
              ? "hsla(38, 15%, 50%, 0.06)"
              : "hsla(38, 10%, 50%, 0.03)",
          border: isActive ? "1px solid hsla(38, 30%, 50%, 0.2)" : "1px solid transparent",
        }}>
          {isMarkdown && !isActive && cell.source ? (
            <div className="px-3 py-2 prose prose-sm max-w-none" style={{ color: "hsl(38, 10%, 25%)" }}>
              {cell.source.split("\n").map((line, i) => {
                if (line.startsWith("# ")) return <h1 key={i} className="text-lg font-serif font-semibold mt-0 mb-1" style={{ color: "hsl(38, 15%, 20%)" }}>{line.slice(2)}</h1>;
                if (line.startsWith("## ")) return <h2 key={i} className="text-base font-serif font-medium mt-2 mb-1" style={{ color: "hsl(38, 15%, 25%)" }}>{line.slice(3)}</h2>;
                if (line.startsWith("### ")) return <h3 key={i} className="text-sm font-serif font-medium mt-1.5 mb-0.5" style={{ color: "hsl(38, 15%, 30%)" }}>{line.slice(4)}</h3>;
                if (line.startsWith("- ")) return <li key={i} className="text-xs ml-4">{line.slice(2)}</li>;
                if (line.startsWith("|")) return <pre key={i} className="text-[10px] font-mono" style={{ color: "hsl(38, 10%, 40%)" }}>{line}</pre>;
                if (line.startsWith("```")) return null;
                if (line.startsWith("**")) return <p key={i} className="text-xs font-semibold my-0.5">{line.replace(/\*\*/g, "")}</p>;
                return line ? <p key={i} className="text-xs my-0.5">{line}</p> : <br key={i} />;
              })}
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={cell.source}
              onChange={e => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 text-xs font-mono resize-none focus:outline-none bg-transparent"
              style={{
                color: isMarkdown ? "hsl(38, 10%, 30%)" : "hsl(220, 15%, 20%)",
                lineHeight: "1.7",
                minHeight: "36px",
              }}
              spellCheck={false}
              placeholder={isMarkdown ? "Markdown cell…" : "# Python / Qiskit code…"}
            />
          )}

          {/* Cell toolbar (visible on hover/active) */}
          {isActive && (
            <div className="flex items-center gap-0.5 px-2 py-1 border-t" style={{
              borderColor: "hsla(38, 15%, 50%, 0.1)",
              background: "hsla(38, 10%, 50%, 0.03)",
            }}>
              {!isMarkdown && (
                <button onClick={onRun} className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium hover:bg-black/5 transition-colors" style={{ color: "hsl(152, 40%, 40%)" }}>
                  <Play size={10} /> Run
                </button>
              )}
              <button onClick={onToggleType} className="px-2 py-0.5 rounded text-[10px] hover:bg-black/5 transition-colors" style={{ color: "hsl(38, 15%, 45%)" }}>
                {isMarkdown ? "→ Code" : "→ Markdown"}
              </button>
              <div className="flex-1" />
              <button onClick={onMoveUp} className="p-0.5 rounded hover:bg-black/5"><ArrowUp size={11} style={{ color: "hsl(38, 10%, 50%)" }} /></button>
              <button onClick={onMoveDown} className="p-0.5 rounded hover:bg-black/5"><ArrowDown size={11} style={{ color: "hsl(38, 10%, 50%)" }} /></button>
              <button onClick={onDelete} className="p-0.5 rounded hover:bg-black/5"><Trash2 size={11} style={{ color: "hsl(0, 40%, 55%)" }} /></button>
            </div>
          )}
        </div>

        {/* Output area */}
        {hasOutputs && (
          <div className="mt-1 space-y-1 pl-0.5">
            {cell.outputs.map((output, i) => (
              <CellOutputView key={i} output={output} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── File Browser Sidebar ────────────────────────────────────────────────────

function FileBrowser({ templates, activeId, onSelect, onNew }: {
  templates: ReturnType<typeof getTemplateNotebooks>;
  activeId: string;
  onSelect: (id: string) => void;
  onNew: (type: "quantum" | "ml") => void;
}) {
  const [demosOpen, setDemosOpen] = useState(true);
  const [projectsOpen, setProjectsOpen] = useState(true);

  return (
    <div className="h-full flex flex-col text-xs" style={{ background: "hsl(30, 8%, 96%)", borderRight: "1px solid hsla(38, 12%, 50%, 0.12)" }}>
      {/* Header */}
      <div className="px-3 py-2.5 font-medium uppercase tracking-wider text-[10px]" style={{ color: "hsl(38, 15%, 45%)", borderBottom: "1px solid hsla(38, 12%, 50%, 0.1)" }}>
        File Browser
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {/* Demo Gallery folder */}
        <button onClick={() => setDemosOpen(!demosOpen)} className="w-full flex items-center gap-1.5 px-3 py-1.5 hover:bg-black/3 transition-colors">
          <ChevronRight size={11} className={`transition-transform ${demosOpen ? "rotate-90" : ""}`} style={{ color: "hsl(38, 20%, 50%)" }} />
          {demosOpen ? <FolderOpen size={13} style={{ color: "hsl(38, 45%, 50%)" }} /> : <Folder size={13} style={{ color: "hsl(38, 45%, 50%)" }} />}
          <span className="font-medium" style={{ color: "hsl(38, 15%, 30%)" }}>Demo Gallery</span>
          <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "hsla(38, 30%, 50%, 0.12)", color: "hsl(38, 30%, 45%)" }}>
            read-only
          </span>
        </button>
        {demosOpen && (
          <div className="pl-6 space-y-0.5">
            {templates.map(t => (
              <button
                key={t.id}
                onClick={() => onSelect(t.id)}
                className="w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-left transition-colors"
                style={{
                  background: activeId === t.id ? "hsla(38, 30%, 50%, 0.12)" : "transparent",
                  color: activeId === t.id ? "hsl(38, 25%, 25%)" : "hsl(38, 10%, 40%)",
                }}
              >
                <FileText size={11} />
                <span className="truncate">{t.name}.ipynb</span>
              </button>
            ))}
          </div>
        )}

        {/* Projects folder */}
        <button onClick={() => setProjectsOpen(!projectsOpen)} className="w-full flex items-center gap-1.5 px-3 py-1.5 hover:bg-black/3 transition-colors mt-1">
          <ChevronRight size={11} className={`transition-transform ${projectsOpen ? "rotate-90" : ""}`} style={{ color: "hsl(38, 20%, 50%)" }} />
          {projectsOpen ? <FolderOpen size={13} style={{ color: "hsl(152, 35%, 50%)" }} /> : <Folder size={13} style={{ color: "hsl(152, 35%, 50%)" }} />}
          <span className="font-medium" style={{ color: "hsl(38, 15%, 30%)" }}>Projects</span>
        </button>
        {projectsOpen && (
          <div className="pl-6 text-[11px] py-2 px-2" style={{ color: "hsl(38, 10%, 50%)" }}>
            <em>Your notebooks appear here</em>
          </div>
        )}
      </div>

      {/* New notebook buttons */}
      <div className="p-2 space-y-1" style={{ borderTop: "1px solid hsla(38, 12%, 50%, 0.1)" }}>
        <button onClick={() => onNew("quantum")} className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors hover:bg-black/5" style={{ color: "hsl(220, 30%, 40%)" }}>
          <Atom size={12} /> New Quantum Notebook
        </button>
        <button onClick={() => onNew("ml")} className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors hover:bg-black/5" style={{ color: "hsl(280, 30%, 45%)" }}>
          <Brain size={12} /> New Quantum+ML Notebook
        </button>
      </div>
    </div>
  );
}

// ── Demo Card (Voilà mode) ──────────────────────────────────────────────────

function DemoCard({ demo, onOpen, onOpenInWorkspace }: { demo: ReturnType<typeof getDemoDefinitions>[0]; onOpen: () => void; onOpenInWorkspace: () => void }) {
  const categoryColors: Record<string, string> = {
    fundamentals: "hsl(220, 40%, 50%)",
    algorithms: "hsl(280, 40%, 50%)",
    hybrid: "hsl(38, 50%, 45%)",
    visualization: "hsl(152, 40%, 45%)",
  };

  return (
    <div className="group rounded-xl p-4 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg" style={{
      background: "hsl(0, 0%, 100%)",
      border: "1px solid hsla(38, 15%, 50%, 0.12)",
      boxShadow: "0 1px 3px hsla(38, 20%, 30%, 0.06)",
    }} onClick={onOpen}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{demo.icon}</span>
        <span className="text-[9px] font-medium px-2 py-0.5 rounded-full" style={{
          background: `${categoryColors[demo.category]}15`,
          color: categoryColors[demo.category],
        }}>
          {demo.category}
        </span>
      </div>
      <h3 className="text-sm font-semibold mb-1" style={{ color: "hsl(38, 15%, 18%)" }}>{demo.name}</h3>
      <p className="text-[11px] leading-relaxed mb-3" style={{ color: "hsl(38, 10%, 45%)" }}>{demo.description}</p>
      <div className="flex gap-2">
        <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors" style={{
          background: "hsl(38, 45%, 48%)",
          color: "white",
        }}>
          <PlayCircle size={11} /> Run Demo
        </button>
        <button onClick={e => { e.stopPropagation(); onOpenInWorkspace(); }} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors hover:bg-black/5" style={{
          border: "1px solid hsla(38, 20%, 50%, 0.2)",
          color: "hsl(38, 15%, 40%)",
        }}>
          <Code size={11} /> Open in Workspace
        </button>
      </div>
    </div>
  );
}

// ── Interactive Demo Viewer (Voilà style) ───────────────────────────────────

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

  const runDemo = useCallback(() => {
    if (!template) return;
    setRunning(true);
    // Reset kernel and run all code cells
    const k = createKernel();
    const allOutputs: CellOutput[] = [];
    for (const cell of template.cells) {
      if (cell.type === "code") {
        const cellOutputs = executeCell(k, cell);
        allOutputs.push(...cellOutputs);
      }
    }
    setOutputs(allOutputs);
    setTimeout(() => setRunning(false), 300);
  }, [template]);

  useEffect(() => { runDemo(); }, []);

  return (
    <div className="h-full flex flex-col" style={{ background: "hsl(30, 6%, 97%)" }}>
      {/* Demo header */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid hsla(38, 12%, 50%, 0.12)", background: "hsl(0, 0%, 100%)" }}>
        <button onClick={onClose} className="p-1 rounded hover:bg-black/5"><ChevronDown size={16} style={{ color: "hsl(38, 15%, 45%)" }} /></button>
        <span className="text-xl">{demo.icon}</span>
        <div className="flex-1">
          <h2 className="text-sm font-semibold" style={{ color: "hsl(38, 15%, 18%)" }}>{demo.name}</h2>
          <p className="text-[11px]" style={{ color: "hsl(38, 10%, 50%)" }}>{demo.description}</p>
        </div>
        <button onClick={onOpenInWorkspace} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium" style={{
          border: "1px solid hsla(38, 20%, 50%, 0.2)",
          color: "hsl(38, 15%, 40%)",
        }}>
          <Code size={12} /> Open in Workspace
        </button>
      </div>

      {/* Demo body: 3-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Controls */}
        <div className="w-56 shrink-0 p-4 space-y-4 overflow-y-auto" style={{ borderRight: "1px solid hsla(38, 12%, 50%, 0.1)", background: "hsl(0, 0%, 100%)" }}>
          <h3 className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "hsl(38, 15%, 50%)" }}>Controls</h3>
          {demo.controls.map(ctrl => (
            <div key={ctrl.id} className="space-y-1">
              <label className="text-[11px] font-medium" style={{ color: "hsl(38, 15%, 30%)" }}>{ctrl.label}</label>
              {ctrl.type === "slider" && (
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={ctrl.min} max={ctrl.max} step={ctrl.step}
                    value={controlValues[ctrl.id] as number}
                    onChange={e => setControlValues(prev => ({ ...prev, [ctrl.id]: parseFloat(e.target.value) }))}
                    className="flex-1 accent-[hsl(38,45%,48%)]"
                  />
                  <span className="text-[11px] font-mono w-8 text-right" style={{ color: "hsl(38, 15%, 40%)" }}>
                    {controlValues[ctrl.id]}
                  </span>
                </div>
              )}
              {ctrl.type === "select" && (
                <select
                  value={controlValues[ctrl.id] as string}
                  onChange={e => setControlValues(prev => ({ ...prev, [ctrl.id]: e.target.value }))}
                  className="w-full px-2 py-1 rounded text-[11px] bg-transparent" style={{ border: "1px solid hsla(38, 15%, 50%, 0.2)", color: "hsl(38, 15%, 30%)" }}
                >
                  {ctrl.options?.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              )}
            </div>
          ))}
          <button onClick={runDemo} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors" style={{
            background: "hsl(38, 45%, 48%)",
            color: "white",
          }}>
            {running ? <RotateCcw size={12} className="animate-spin" /> : <Play size={12} />}
            Run
          </button>
        </div>

        {/* Center: Circuit + State visualization */}
        <div className="flex-1 p-4 space-y-3 overflow-y-auto">
          <h3 className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "hsl(38, 15%, 50%)" }}>Circuit & State</h3>
          {outputs.filter(o => o.type === "circuit" || o.type === "statevector").map((o, i) => (
            <CellOutputView key={i} output={o} />
          ))}
          {outputs.filter(o => o.type === "circuit" || o.type === "statevector").length === 0 && (
            <div className="flex items-center justify-center h-32 rounded-lg" style={{ background: "hsla(38, 10%, 50%, 0.04)", border: "1px dashed hsla(38, 15%, 50%, 0.2)" }}>
              <span className="text-xs" style={{ color: "hsl(38, 10%, 55%)" }}>Circuit visualization will appear here</span>
            </div>
          )}
        </div>

        {/* Right: Results */}
        <div className="w-72 shrink-0 p-4 space-y-3 overflow-y-auto" style={{ borderLeft: "1px solid hsla(38, 12%, 50%, 0.1)", background: "hsl(0, 0%, 100%)" }}>
          <h3 className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "hsl(38, 15%, 50%)" }}>Results</h3>
          {outputs.filter(o => o.type === "histogram").map((o, i) => (
            <CellOutputView key={i} output={o} />
          ))}
          {outputs.filter(o => o.type === "text" || o.type === "error").map((o, i) => (
            <CellOutputView key={i} output={o} />
          ))}
          {outputs.length === 0 && (
            <div className="text-center py-8">
              <BarChart3 size={24} className="mx-auto mb-2" style={{ color: "hsl(38, 15%, 60%)" }} />
              <span className="text-xs" style={{ color: "hsl(38, 10%, 55%)" }}>Run the demo to see results</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Workspace Component ────────────────────────────────────────────────

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
  const [fullscreen, setFullscreen] = useState(false);
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
          ...c,
          outputs,
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

  // ── Landing page ──────────────────────────────────────────────────────────
  if (mode === "landing") {
    return (
      <div className="h-full flex flex-col" style={{ background: "hsl(30, 6%, 97%)" }}>
        {/* Top bar */}
        <div className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: "1px solid hsla(38, 12%, 50%, 0.1)", background: "hsl(0, 0%, 100%)" }}>
          <Atom size={18} style={{ color: "hsl(38, 50%, 50%)" }} />
          <span className="text-sm font-semibold" style={{ color: "hsl(38, 15%, 20%)" }}>Quantum Workspace</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: "hsla(152, 30%, 50%, 0.1)", color: "hsl(152, 40%, 40%)" }}>
            Q-Linux Python 3.11 • Qiskit 1.0 • Cirq • PennyLane
          </span>
          <div className="flex-1" />
          {onClose && <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5"><X size={16} style={{ color: "hsl(38, 10%, 45%)" }} /></button>}
        </div>

        {/* Landing content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-lg text-center space-y-8">
            <div>
              <h1 className="text-2xl font-serif font-semibold mb-2" style={{ color: "hsl(38, 15%, 15%)" }}>
                Quantum Workspace
              </h1>
              <p className="text-sm" style={{ color: "hsl(38, 10%, 45%)" }}>
                A single browser tab where anyone can run visceral quantum demos,<br />
                then open the same artifacts as editable notebooks to build quantum+ML applications.
              </p>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setMode("workspace")}
                className="group flex flex-col items-center gap-3 p-6 rounded-2xl transition-all duration-300 hover:scale-[1.03] hover:shadow-lg"
                style={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsla(38, 15%, 50%, 0.15)", minWidth: "180px" }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "hsla(220, 40%, 50%, 0.08)" }}>
                  <Code size={22} style={{ color: "hsl(220, 40%, 50%)" }} />
                </div>
                <span className="text-sm font-semibold" style={{ color: "hsl(38, 15%, 20%)" }}>Open Workspace</span>
                <span className="text-[11px]" style={{ color: "hsl(38, 10%, 50%)" }}>JupyterLab experience</span>
              </button>

              <button
                onClick={() => setMode("demos")}
                className="group flex flex-col items-center gap-3 p-6 rounded-2xl transition-all duration-300 hover:scale-[1.03] hover:shadow-lg"
                style={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsla(38, 15%, 50%, 0.15)", minWidth: "180px" }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "hsla(38, 50%, 50%, 0.08)" }}>
                  <Sparkles size={22} style={{ color: "hsl(38, 50%, 50%)" }} />
                </div>
                <span className="text-sm font-semibold" style={{ color: "hsl(38, 15%, 20%)" }}>Open Demos</span>
                <span className="text-[11px]" style={{ color: "hsl(38, 10%, 50%)" }}>Interactive app mode</span>
              </button>
            </div>

            <p className="text-[10px] font-mono" style={{ color: "hsl(38, 10%, 60%)" }}>
              Powered by Q-Simulator • Content-addressed via UOR • Every result has cryptographic provenance
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Demo mode (Voilà) ─────────────────────────────────────────────────────
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
      <div className="h-full flex flex-col" style={{ background: "hsl(30, 6%, 97%)" }}>
        {/* Top bar */}
        <div className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: "1px solid hsla(38, 12%, 50%, 0.1)", background: "hsl(0, 0%, 100%)" }}>
          <Sparkles size={18} style={{ color: "hsl(38, 50%, 50%)" }} />
          <span className="text-sm font-semibold" style={{ color: "hsl(38, 15%, 20%)" }}>Demo Gallery</span>
          <div className="flex-1" />
          <button onClick={() => setMode("workspace")} className="flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-medium hover:bg-black/5" style={{ color: "hsl(220, 30%, 45%)" }}>
            <Code size={12} /> Switch to Workspace
          </button>
          <button onClick={() => setMode("landing")} className="flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-medium hover:bg-black/5" style={{ color: "hsl(38, 15%, 45%)" }}>
            Home
          </button>
          {onClose && <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5"><X size={16} style={{ color: "hsl(38, 10%, 45%)" }} /></button>}
        </div>

        {/* Demo grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-lg font-serif font-semibold mb-1" style={{ color: "hsl(38, 15%, 18%)" }}>Interactive Quantum Demos</h2>
            <p className="text-xs mb-6" style={{ color: "hsl(38, 10%, 50%)" }}>Run curated demos without editing code. Click "Open in Workspace" to inspect the underlying notebook.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

  // ── Workspace mode (JupyterLab) ───────────────────────────────────────────
  return (
    <div className="h-full flex flex-col" style={{ background: "hsl(0, 0%, 100%)" }}>
      {/* Menu bar */}
      <div className="flex items-center gap-1 px-2 py-1.5" style={{
        borderBottom: "1px solid hsla(38, 12%, 50%, 0.12)",
        background: "hsl(30, 8%, 96%)",
      }}>
        <Atom size={14} style={{ color: "hsl(38, 50%, 50%)" }} />
        <span className="text-[11px] font-medium mr-2" style={{ color: "hsl(38, 15%, 25%)" }}>Q-Jupyter</span>

        {/* Toolbar buttons */}
        <div className="flex items-center gap-0.5 px-1" style={{ borderLeft: "1px solid hsla(38, 12%, 50%, 0.12)" }}>
          <button onClick={() => addCell(activeCell, "code")} className="p-1 rounded hover:bg-black/5" title="Add code cell">
            <Plus size={13} style={{ color: "hsl(38, 15%, 40%)" }} />
          </button>
          <button onClick={runAllCells} className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-black/5" title="Run all cells">
            <Play size={11} style={{ color: "hsl(152, 40%, 40%)" }} />
            <span className="text-[10px] font-medium" style={{ color: "hsl(152, 40%, 40%)" }}>Run All</span>
          </button>
        </div>

        <div className="flex items-center gap-1 px-1" style={{ borderLeft: "1px solid hsla(38, 12%, 50%, 0.12)" }}>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "hsla(152, 30%, 50%, 0.08)", color: "hsl(152, 35%, 40%)" }}>
            Q-Linux Python 3.11 ●
          </span>
        </div>

        <div className="flex-1" />

        <button onClick={() => setMode("demos")} className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] hover:bg-black/5" style={{ color: "hsl(38, 15%, 45%)" }}>
          <Sparkles size={11} /> Demos
        </button>
        <button onClick={() => setMode("landing")} className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] hover:bg-black/5" style={{ color: "hsl(38, 15%, 45%)" }}>
          Home
        </button>
        {onClose && <button onClick={onClose} className="p-1 rounded hover:bg-black/5"><X size={14} style={{ color: "hsl(38, 10%, 45%)" }} /></button>}
      </div>

      {/* Main workspace area */}
      <div className="flex-1 flex overflow-hidden">
        {/* File browser sidebar */}
        {sidebarOpen && (
          <div className="w-56 shrink-0">
            <FileBrowser
              templates={templates}
              activeId={notebook.id}
              onSelect={loadTemplate}
              onNew={(type) => {
                const nb = createNotebook(
                  type === "quantum" ? "Quantum Notebook" : "Quantum+ML Notebook",
                  type === "ml" ? [
                    createCell("markdown", "# Quantum ↔ ML Notebook\nBridge quantum computing with classical machine learning."),
                    createCell("code", "from qiskit import QuantumCircuit\nfrom sklearn.svm import SVC"),
                    createCell("code", ""),
                  ] : [
                    createCell("markdown", "# Quantum Notebook\nWrite Qiskit, Cirq, or PennyLane code below."),
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
          {/* Notebook tab bar */}
          <div className="flex items-center gap-1 px-3 py-1" style={{ borderBottom: "1px solid hsla(38, 12%, 50%, 0.08)", background: "hsl(30, 6%, 97%)" }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 rounded hover:bg-black/5 mr-1">
              {sidebarOpen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            </button>
            <div className="flex items-center gap-1 px-2 py-1 rounded-t text-[11px] font-medium" style={{
              background: "hsl(0, 0%, 100%)",
              color: "hsl(38, 15%, 25%)",
              borderBottom: "2px solid hsl(38, 50%, 55%)",
            }}>
              <FileText size={11} />
              {notebook.name}.ipynb
            </div>
          </div>

          {/* Cells */}
          <div className="max-w-4xl mx-auto py-4 space-y-1">
            {notebook.cells.map((cell, idx) => (
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
                {/* Add cell button between cells */}
                {activeCell === cell.id && (
                  <div className="flex items-center justify-center py-0.5 opacity-0 hover:opacity-100 transition-opacity">
                    <button onClick={() => addCell(cell.id, "code")} className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] hover:bg-black/5" style={{ color: "hsl(38, 15%, 50%)" }}>
                      <Plus size={10} /> Code
                    </button>
                    <button onClick={() => addCell(cell.id, "markdown")} className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] hover:bg-black/5" style={{ color: "hsl(38, 15%, 50%)" }}>
                      <Plus size={10} /> Markdown
                    </button>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-3 px-3 py-1" style={{
        borderTop: "1px solid hsla(38, 12%, 50%, 0.1)",
        background: "hsl(30, 8%, 96%)",
      }}>
        <span className="flex items-center gap-1 text-[10px]" style={{ color: "hsl(152, 35%, 42%)" }}>
          <span className="w-2 h-2 rounded-full" style={{ background: "hsl(152, 45%, 50%)" }} />
          Kernel: Q-Linux Python 3.11
        </span>
        <span className="text-[10px]" style={{ color: "hsl(38, 10%, 55%)" }}>
          {notebook.cells.length} cells • {notebook.cells.filter(c => c.executionCount).length} executed
        </span>
        <div className="flex-1" />
        <span className="text-[10px] font-mono" style={{ color: "hsl(38, 10%, 55%)" }}>
          Qiskit 1.0 • Cirq 1.3 • PennyLane 0.35
        </span>
      </div>
    </div>
  );
}
