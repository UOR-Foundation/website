/**
 * QShellEmbed — Embeddable terminal component for projection panels.
 *
 * This is the core QShell terminal UI, designed to be embedded inside
 * TerminalProjection (sidebar slide-out) or as a standalone page.
 *
 * Design goals:
 *   - Instantly familiar to experienced Linux/RHEL developers
 *   - Readable font sizes (15px body, 14px prompt)
 *   - Input prompt always pinned to bottom (never pushed off-screen)
 *   - Single-screen layout: output scrolls, input stays fixed
 *   - Atlas-specific commands use plain, self-descriptive language
 */

import { useState, useRef, useEffect } from "react";
import { useQShell } from "../lib/useQShell";
import { motion, AnimatePresence, X } from "../../platform/bridge";

// ─── Zone & state color mapping ─────────────────────────────────
const ZONE_COLOR: Record<string, string> = {
  convergent: "text-emerald-400",
  exploring: "text-amber-400",
  divergent: "text-red-400",
};
const ZONE_BG: Record<string, string> = {
  convergent: "bg-emerald-500/20 border-emerald-500/30",
  exploring: "bg-amber-500/20 border-amber-500/30",
  divergent: "bg-red-500/20 border-red-500/30",
};
const STATE_COLOR: Record<string, string> = {
  running: "text-emerald-400",
  ready: "text-sky-400",
  active: "text-emerald-400",
  idle: "text-sky-400",
  blocked: "text-amber-400",
  frozen: "text-cyan-300",
  suspended: "text-orange-400",
  halted: "text-muted-foreground",
  terminated: "text-muted-foreground",
};

// ─── H-Score bar ─────────────────────────────────────────────────
function HBar({ value, label }: { value: number; label?: string }) {
  const zone = value >= 0.8 ? "convergent" : value >= 0.5 ? "exploring" : "divergent";
  const color = zone === "convergent" ? "bg-emerald-500" : zone === "exploring" ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2 text-sm font-mono">
      {label && <span className="text-muted-foreground w-14 truncate">{label}</span>}
      <div className="flex-1 h-2.5 rounded-full bg-muted/50 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
      <span className={`w-12 text-right ${ZONE_COLOR[zone]}`}>{value.toFixed(2)}</span>
    </div>
  );
}

// ─── Fano SVG ────────────────────────────────────────────────────
function FanoTopology({ nodes }: { nodes: readonly { index: number; neighbors: number[] }[] }) {
  if (!nodes.length) return null;
  const cx = 90, cy = 90, r = 60;
  const pts = Array.from({ length: 7 }, (_, i) => {
    if (i === 6) return { x: cx, y: cy };
    const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });
  const edges = new Set<string>();
  for (const n of nodes) {
    for (const nb of n.neighbors) {
      edges.add([Math.min(n.index, nb), Math.max(n.index, nb)].join("-"));
    }
  }
  return (
    <svg viewBox="0 0 180 180" className="w-full h-full">
      {Array.from(edges).map(e => {
        const [a, b] = e.split("-").map(Number);
        return <line key={e} x1={pts[a].x} y1={pts[a].y} x2={pts[b].x} y2={pts[b].y} className="stroke-primary/30" strokeWidth="1" />;
      })}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="8" className="fill-primary/20 stroke-primary" strokeWidth="1.5" />
          <text x={p.x} y={p.y + 4} textAnchor="middle" className="fill-primary text-[10px] font-mono font-bold">{i}</text>
        </g>
      ))}
    </svg>
  );
}

// ═════════════════════════════════════════════════════════════════
// Main Component
// ═════════════════════════════════════════════════════════════════

interface QShellEmbedProps {
  onClose?: () => void;
  onOpenJupyter?: () => void;
}

export default function QShellEmbed({ onClose, onOpenJupyter }: QShellEmbedProps) {
  const { state, bootKernel, executeCommand, demoLog, demoRunning } = useQShell({ onOpenJupyter });
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [tabHint, setTabHint] = useState("");
  const [tabMatches, setTabMatches] = useState<string[]>([]);
  const [tabCycleIdx, setTabCycleIdx] = useState(-1);
  const [lastTabInput, setLastTabInput] = useState("");
  const [activeTab, setActiveTab] = useState<"terminal" | "procs" | "mesh" | "net" | "collab">("terminal");
  const termRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // All known commands for tab-completion
  const COMMANDS = [
    "help", "man", "clear", "uname", "hostname", "whoami", "id", "uptime",
    "date", "env", "echo", "history", "ps", "top", "kill", "spawn", "jobs",
    "fg", "bg", "nice", "tick", "pwd", "cd", "ls", "mkdir", "touch", "cat",
    "rm", "find", "grep", "head", "tail", "wc", "du", "df", "free", "mount",
    "lsmod", "modinfo", "ifconfig", "netstat", "ping", "traceroute", "nslookup",
    "curl", "ssh", "dmesg", "export", "alias", "exit", "demo",
    "ipc", "msg", "sysctl", "route", "shutdown", "reboot",
    "qc", "qr", "qs",
    "jupyter", "notebook",
  ];

  // Commands that take file/path arguments
  const PATH_COMMANDS = new Set(["ls", "cat", "rm", "cd", "mkdir", "touch", "head", "tail", "wc", "du", "find", "cp", "mv", "chmod"]);

  // Auto-scroll terminal
  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [state.bootLog]);

  // Auto-boot on mount
  useEffect(() => {
    if (state.stage === "off") bootKernel();
  }, [state.stage, bootKernel]);

  // Focus input when terminal tab is active
  useEffect(() => {
    if (activeTab === "terminal" && state.stage === "running") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [activeTab, state.stage]);

  /** Resolve filesystem children for a partial path */
  const resolvePathMatches = (partial: string): string[] => {
    const dir = partial.includes("/") ? partial.slice(0, partial.lastIndexOf("/") + 1) || "/" : "/";
    const namePrefix = partial.includes("/") ? partial.slice(partial.lastIndexOf("/") + 1) : partial;
    try {
      const fs = state.kernel && (state as any).sub?.fs;
      if (!fs) return [];
      const node = fs.stat(dir);
      if (node && node.kind === "dir") {
        return Object.keys(node.children || {})
          .filter(n => n.startsWith(namePrefix))
          .map(n => (dir === "/" ? `/${n}` : `${dir}${n}`));
      }
    } catch { /* no FS available */ }
    return [];
  };

  const commonPrefix = (arr: string[]) =>
    arr.reduce((a, b) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return a.slice(0, i); });

  const handleTab = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const parts = input.split(" ");
    const cmd = parts[0];
    const isFirstWord = parts.length <= 1;
    const partial = parts[parts.length - 1] || "";

    // ── Double-Tab cycling: if we already have matches from a previous Tab, cycle ──
    if (tabMatches.length > 1 && input === lastTabInput) {
      const nextIdx = (tabCycleIdx + 1) % tabMatches.length;
      setTabCycleIdx(nextIdx);
      const prefix = isFirstWord ? "" : parts.slice(0, -1).join(" ") + " ";
      const completion = tabMatches[nextIdx];
      const newInput = prefix + completion + (isFirstWord ? " " : "");
      setInput(newInput);
      setLastTabInput(newInput);
      setTabHint(tabMatches.map((m, i) => i === nextIdx ? `[${m}]` : m).join("  "));
      return;
    }

    // ── First Tab press: gather matches ──
    let matches: string[] = [];
    let prefix = "";

    if (isFirstWord) {
      // Complete command names
      matches = COMMANDS.filter(c => c.startsWith(partial) && c !== partial);
    } else if (PATH_COMMANDS.has(cmd)) {
      // Complete file paths for path-aware commands
      prefix = parts.slice(0, -1).join(" ") + " ";
      matches = resolvePathMatches(partial);
    } else {
      // Generic: try path completion for any argument
      prefix = parts.slice(0, -1).join(" ") + " ";
      matches = resolvePathMatches(partial);
    }

    if (matches.length === 0) return;

    if (matches.length === 1) {
      const suffix = isFirstWord ? " " : "";
      setInput((isFirstWord ? "" : prefix) + matches[0] + suffix);
      setTabHint("");
      setTabMatches([]);
      setTabCycleIdx(-1);
      setLastTabInput("");
    } else {
      // Fill common prefix, show all matches, prepare for cycling
      const cp = commonPrefix(matches);
      const basePartial = isFirstWord ? partial : partial;
      const newInput = (isFirstWord ? "" : prefix) + (cp.length > basePartial.length ? cp : partial);
      setInput(newInput);
      setTabHint(matches.map(m => typeof m === "string" ? m.split("/").pop() || m : m).join("  "));
      setTabMatches(matches);
      setTabCycleIdx(-1);
      setLastTabInput(newInput);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab") { handleTab(e); return; }
    if (tabHint) { setTabHint(""); setTabMatches([]); setTabCycleIdx(-1); setLastTabInput(""); }
    if (e.key === "Enter" && input.trim()) {
      executeCommand(input.trim());
      setHistory(h => [input.trim(), ...h]);
      setInput("");
      setHistIdx(-1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.min(histIdx + 1, history.length - 1);
      setHistIdx(next);
      if (history[next]) setInput(history[next]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = histIdx - 1;
      setHistIdx(next);
      setInput(next >= 0 ? history[next] : "");
    }
  };

  const tabs = [
    { id: "terminal" as const, label: "Terminal" },
    { id: "procs" as const, label: "Processes" },
    { id: "mesh" as const, label: "Agent Mesh" },
    { id: "net" as const, label: "Network" },
    { id: "collab" as const, label: `Collab${demoLog.length > 0 ? ` (${demoLog.length})` : ""}` },
  ];

  return (
    <div className="flex-1 h-full bg-[hsl(0,0%,7%)] text-[hsl(0,0%,82%)] font-mono flex flex-col overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-[hsl(0,0%,18%)] bg-[hsl(0,0%,10%)] px-5 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[hsl(0,60%,50%)]" />
            <div className="w-3 h-3 rounded-full bg-[hsl(45,80%,55%)]" />
            <div className={`w-3 h-3 rounded-full ${
              state.stage === "running" ? "bg-[hsl(120,50%,45%)]" :
              state.stage === "booting" ? "bg-[hsl(45,80%,55%)] animate-pulse" :
              "bg-[hsl(0,0%,30%)]"
            }`} />
          </div>
          <span className="text-sm text-[hsl(0,0%,55%)]">root@q-linux: ~</span>
        </div>
        <div className="flex items-center gap-5 text-xs text-[hsl(0,0%,50%)]">
          {state.schedStats && (
            <>
              <span>{state.schedStats.totalProcesses} procs</span>
              <span>load {state.schedStats.meanHScore.toFixed(2)}</span>
              <span>tick {state.schedStats.tickCount}</span>
            </>
          )}
          {onClose && (
            <button onClick={onClose} className="ml-2 p-1 rounded hover:bg-[hsl(0,0%,20%)] transition-colors">
              <X size={14} className="text-[hsl(0,0%,50%)]" />
            </button>
          )}
        </div>
      </header>

      {/* ── Tab Bar ────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-[hsl(0,0%,18%)] bg-[hsl(0,0%,9%)] px-5 flex gap-0">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-5 py-2 text-sm tracking-wide transition-colors border-b-2 ${
              activeTab === t.id
                ? "border-[hsl(0,0%,70%)] text-[hsl(0,0%,92%)]"
                : "border-transparent text-[hsl(0,0%,45%)] hover:text-[hsl(0,0%,70%)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Content ────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        <AnimatePresence mode="wait">
          {activeTab === "terminal" && (
            <motion.div
              key="terminal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col min-h-0"
            >
              {/* Scrollable output */}
              <div
                ref={termRef}
                className="flex-1 overflow-auto px-5 py-4 min-h-0"
                onClick={() => inputRef.current?.focus()}
              >
                {state.bootLog.map((line, i) => (
                  <div key={i} className={`whitespace-pre-wrap text-[15px] leading-[1.65] ${
                    line.startsWith("POST:") ? "text-[hsl(45,70%,60%)]" :
                    line.startsWith("BOOT:") ? "text-[hsl(200,50%,60%)]" :
                    line.startsWith("INIT:") ? "text-[hsl(270,40%,65%)]" :
                    line.startsWith("PANIC:") ? "text-[hsl(0,70%,55%)] font-bold" :
                    line.startsWith("KERNEL:") ? "text-[hsl(120,40%,55%)] font-bold" :
                    line.startsWith("$") ? "text-[hsl(120,40%,55%)]" :
                    line.startsWith("-bash:") ? "text-[hsl(0,60%,55%)]" :
                    line.match(/^[A-Z]+:/) ? "text-[hsl(180,35%,55%)]" :
                    "text-[hsl(0,0%,75%)]"
                  }`}>
                    {line}
                  </div>
                ))}
                {state.stage === "booting" && (
                  <span className="inline-block w-2.5 h-5 bg-primary animate-pulse" />
                )}
              </div>

              {/* Tab-completion hint (pinned above input) */}
              {tabHint && (
                <div className="shrink-0 px-5 py-1.5 text-sm text-muted-foreground border-t border-[hsl(0,0%,15%)] bg-[hsl(0,0%,8%)]">
                  {tabHint}
                </div>
              )}

              {/* Input — always pinned to bottom */}
              {state.stage === "running" && (
                <div className="shrink-0 border-t border-[hsl(0,0%,20%)] bg-[hsl(0,0%,8%)] px-5 py-3 flex items-center gap-3">
                  <span className="text-[hsl(120,40%,55%)] text-[15px] select-none">root@q-linux:~$</span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    className="flex-1 bg-transparent text-[15px] outline-none text-[hsl(0,0%,85%)] placeholder:text-[hsl(0,0%,30%)] caret-[hsl(0,0%,70%)]"
                    placeholder=""
                    autoFocus
                  />
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "procs" && (
            <motion.div key="procs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-auto p-5">
              <h3 className="text-sm text-muted-foreground mb-4 tracking-widest uppercase">Process Table</h3>
              <div className="space-y-1.5">
                {state.processes.map(p => (
                  <div key={p.pid} className="flex items-center gap-3 text-sm py-2 px-3 rounded hover:bg-[hsl(220,20%,10%)] transition-colors">
                    <span className="w-10 text-muted-foreground">{p.pid}</span>
                    <span className="w-32 truncate font-medium">{p.name}</span>
                    <span className={`w-20 ${STATE_COLOR[p.state] || ""}`}>{p.state}</span>
                    <div className="flex-1"><HBar value={p.hScore} /></div>
                    <span className={`text-xs px-2 py-0.5 rounded border ${ZONE_BG[p.zone] || ""}`}>{p.zone}</span>
                  </div>
                ))}
              </div>
              {state.schedStats && (
                <div className="mt-6 grid grid-cols-3 gap-4">
                  {[
                    { label: "Mean H", value: state.schedStats.meanHScore.toFixed(3) },
                    { label: "Ctx Switches", value: state.schedStats.contextSwitches },
                    { label: "Ticks", value: state.schedStats.tickCount },
                  ].map(s => (
                    <div key={s.label} className="bg-[hsl(220,20%,8%)] border border-[hsl(0,0%,18%)] rounded-lg p-4">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</div>
                      <div className="text-xl font-bold text-primary mt-1">{s.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "mesh" && (
            <motion.div key="mesh" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-auto p-5">
              <h3 className="text-sm text-muted-foreground mb-4 tracking-widest uppercase">Agent Mesh</h3>
              {state.agents.length === 0 ? (
                <div className="text-base text-muted-foreground mt-8 text-center">
                  No agents. Use <code className="text-primary">spawn &lt;name&gt;</code> in terminal.
                </div>
              ) : (
                <div className="space-y-3">
                  {state.agents.map(a => (
                    <div key={a.id} className="bg-[hsl(220,20%,8%)] border border-[hsl(0,0%,18%)] rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            a.state === "active" ? "bg-emerald-500" :
                            a.state === "frozen" ? "bg-cyan-400" :
                            a.state === "suspended" ? "bg-orange-400" : "bg-muted-foreground"
                          }`} />
                          <span className="text-base font-bold">{a.name}</span>
                          <span className="text-xs text-muted-foreground">PID {a.pid}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded border ${ZONE_BG[a.zone] || ""}`}>{a.zone}</span>
                      </div>
                      <HBar value={a.hScore} label="H" />
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Session: {a.sessionLength}</span>
                        <span>State: <span className={STATE_COLOR[a.state] || ""}>{a.state}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {state.meshStats && state.agents.length > 0 && (
                <div className="mt-5 bg-[hsl(220,20%,8%)] border border-[hsl(0,0%,18%)] rounded-lg p-4">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Mesh Coherence</div>
                  <HBar value={state.meshStats.meshCoherence} />
                  <div className="flex gap-6 mt-2 text-xs text-muted-foreground">
                    <span>Agents: {state.meshStats.totalAgents}</span>
                    <span>Syscalls: {state.meshStats.totalSyscalls}</span>
                    <span>Messages: {state.meshStats.totalMessages}</span>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "net" && (
            <motion.div key="net" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-auto p-5">
              <h3 className="text-sm text-muted-foreground mb-4 tracking-widest uppercase">Fano Topology — PG(2,2)</h3>
              <div className="max-w-[260px] mx-auto">
                <FanoTopology nodes={state.fanoNodes} />
              </div>
              <div className="mt-4 text-sm text-center text-muted-foreground">
                7 nodes · 42 routes · max 2 hops between any pair
              </div>
              {state.net && (
                <div className="mt-5 grid grid-cols-3 gap-4">
                  {(() => {
                    const ns = state.net.stats();
                    return [
                      { label: "Sent", value: ns.envelopesSent },
                      { label: "Received", value: ns.envelopesReceived },
                      { label: "Rejected", value: ns.firewallRejections },
                    ].map(s => (
                      <div key={s.label} className="bg-[hsl(220,20%,8%)] border border-[hsl(0,0%,18%)] rounded-lg p-4 text-center">
                        <div className="text-xs text-muted-foreground uppercase">{s.label}</div>
                        <div className="text-xl font-bold text-primary mt-1">{s.value}</div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "collab" && (
            <motion.div key="collab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-auto p-5">
              <h3 className="text-sm text-muted-foreground mb-4 tracking-widest uppercase">
                Multi-Agent Collaboration
                {demoRunning && <span className="ml-2 text-amber-400 animate-pulse">● RUNNING</span>}
              </h3>
              {demoLog.length === 0 ? (
                <div className="text-base text-muted-foreground mt-8 text-center">
                  No demo data. Type <code className="text-primary">demo</code> in terminal to start.
                </div>
              ) : (
                <>
                  {/* H-Score Convergence */}
                  <div className="bg-[hsl(220,20%,8%)] border border-[hsl(0,0%,18%)] rounded-lg p-5 mb-5">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">H-Score Convergence</div>
                    <div className="h-36 flex items-end gap-0.5">
                      {(() => {
                        const agents = ["researcher", "synthesizer", "critic"];
                        const colors = ["bg-emerald-500", "bg-sky-500", "bg-amber-500"];
                        const rounds = Math.max(...demoLog.filter(e => e.action === "feedback").map(e => e.tick)) + 1;
                        const bars: JSX.Element[] = [];
                        for (let r = 0; r < rounds; r++) {
                          for (let ai = 0; ai < agents.length; ai++) {
                            const entries = demoLog.filter(e => e.agent === agents[ai] && e.action === "feedback" && e.tick === r);
                            const h = entries.length > 0 ? entries[entries.length - 1].h : 0;
                            bars.push(
                              <motion.div key={`${r}-${ai}`} className={`flex-1 rounded-t ${colors[ai]} opacity-80`}
                                initial={{ height: 0 }} animate={{ height: `${h * 100}%` }}
                                transition={{ duration: 0.5, delay: r * 0.15 + ai * 0.05 }} />
                            );
                          }
                          if (r < rounds - 1) bars.push(<div key={`gap-${r}`} className="w-1" />);
                        }
                        return bars;
                      })()}
                    </div>
                    <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                      {Array.from({ length: Math.max(...demoLog.filter(e => e.action === "feedback").map(e => e.tick), 0) + 1 }, (_, i) => (
                        <span key={i}>R{i + 1}</span>
                      ))}
                    </div>
                    <div className="flex gap-5 mt-2 text-xs">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500" /> researcher</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-sky-500" /> synthesizer</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-500" /> critic</span>
                    </div>
                  </div>

                  {/* Reputation Tracker */}
                  {demoLog.some(e => e.action === "reputation") && (
                    <div className="bg-[hsl(220,20%,8%)] border border-[hsl(0,0%,18%)] rounded-lg p-5 mb-5">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Reviewer Reputation (Prediction Accuracy)</div>
                      {(() => {
                        const agents = ["researcher", "synthesizer", "critic"];
                        const colors = ["text-emerald-400", "text-sky-400", "text-amber-400"];
                        const bgColors = ["bg-emerald-500", "bg-sky-500", "bg-amber-500"];
                        return (
                          <div className="space-y-3">
                            {agents.map((agent, ai) => {
                              const entries = demoLog.filter(e => e.agent === agent && e.action === "reputation");
                              const latest = entries.length > 0 ? entries[entries.length - 1].h : 1;
                              return (
                                <div key={agent}>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className={`text-sm font-medium ${colors[ai]}`}>{agent}</span>
                                    <span className="text-sm font-mono text-[hsl(0,0%,70%)]">ρ = {latest.toFixed(3)}</span>
                                  </div>
                                  <div className="h-2.5 bg-[hsl(0,0%,15%)] rounded-full overflow-hidden">
                                    <motion.div className={`h-full rounded-full ${bgColors[ai]}`}
                                      initial={{ width: "100%" }} animate={{ width: `${latest * 100}%` }}
                                      transition={{ duration: 0.5 }} />
                                  </div>
                                  <div className="flex gap-1.5 mt-1">
                                    {entries.map((e, i) => (
                                      <span key={i} className="text-[10px] text-muted-foreground font-mono">R{e.tick + 1}:{e.h.toFixed(2)}</span>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Event Timeline */}
                  <div className="bg-[hsl(220,20%,8%)] border border-[hsl(0,0%,18%)] rounded-lg p-5">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Activity Timeline</div>
                    <div className="space-y-0.5 max-h-56 overflow-auto">
                      {demoLog.map((e, i) => {
                        const agentColor = e.agent === "researcher" ? "text-emerald-400" :
                          e.agent === "synthesizer" ? "text-sky-400" :
                          e.agent === "critic" ? "text-amber-400" : "text-primary";
                        const actionIcon = e.action === "think" ? "◆" :
                          e.action === "ipc-send" ? "→" :
                          e.action === "feedback" ? "★" :
                          e.action === "peer-review" ? "⇄" :
                          e.action === "peer-result" ? "◎" :
                          e.action === "reputation" ? "ρ" : "⚡";
                        return (
                          <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.02 }} className="flex items-center gap-2 text-sm py-0.5">
                            <span className="text-muted-foreground w-8">R{e.tick + 1}</span>
                            <span className="w-4">{actionIcon}</span>
                            <span className={`w-24 truncate font-medium ${agentColor}`}>{e.agent}</span>
                            <span className="text-muted-foreground w-20">{e.action}</span>
                            <span className="text-muted-foreground truncate flex-1">{e.detail}</span>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
