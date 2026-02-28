import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useQShell } from "../hooks/useQShell";
import { motion, AnimatePresence } from "framer-motion";

// ─── Zone color mapping ──────────────────────────────────────────
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

// ─── Fano SVG ────────────────────────────────────────────────────
function FanoTopology({ nodes }: { nodes: readonly { index: number; neighbors: number[] }[] }) {
  if (!nodes.length) return null;

  // PG(2,2): 7 points arranged in a circle + center
  const cx = 90, cy = 90, r = 60;
  const pts = Array.from({ length: 7 }, (_, i) => {
    if (i === 6) return { x: cx, y: cy }; // center
    const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });

  const edges = new Set<string>();
    for (const n of nodes) {
      for (const nb of n.neighbors) {
        const key = [Math.min(n.index, nb), Math.max(n.index, nb)].join("-");
        edges.add(key);
      }
    }

  return (
    <svg viewBox="0 0 180 180" className="w-full h-full">
      {Array.from(edges).map(e => {
        const [a, b] = e.split("-").map(Number);
        return (
          <line
            key={e}
            x1={pts[a].x} y1={pts[a].y}
            x2={pts[b].x} y2={pts[b].y}
            className="stroke-primary/30"
            strokeWidth="1"
          />
        );
      })}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="8" className="fill-primary/20 stroke-primary" strokeWidth="1.5" />
          <text x={p.x} y={p.y + 4} textAnchor="middle" className="fill-primary text-[10px] font-mono font-bold">
            {i}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ─── H-Score bar ─────────────────────────────────────────────────
function HBar({ value, label }: { value: number; label?: string }) {
  const zone = value >= 0.8 ? "convergent" : value >= 0.5 ? "exploring" : "divergent";
  const color = zone === "convergent" ? "bg-emerald-500" : zone === "exploring" ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2 text-xs font-mono">
      {label && <span className="text-muted-foreground w-12 truncate">{label}</span>}
      <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
      <span className={`w-10 text-right ${ZONE_COLOR[zone]}`}>{value.toFixed(2)}</span>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────
export default function QShellPage() {
  const { state, bootKernel, executeCommand, demoLog, demoRunning } = useQShell();
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [activeTab, setActiveTab] = useState<"terminal" | "procs" | "mesh" | "net" | "collab">("terminal");
  const termRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll terminal
  useEffect(() => {
    if (termRef.current) {
      termRef.current.scrollTop = termRef.current.scrollHeight;
    }
  }, [state.bootLog]);

  // Auto-boot on mount
  useEffect(() => {
    if (state.stage === "off") bootKernel();
  }, [state.stage, bootKernel]);

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
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
    <div className="min-h-screen bg-[hsl(0,0%,7%)] text-[hsl(0,0%,80%)] font-mono flex flex-col">
      {/* Header — mimics a classic terminal title bar */}
      <header className="border-b border-[hsl(0,0%,18%)] bg-[hsl(0,0%,12%)] px-4 py-1.5 flex items-center justify-between">
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
          <span className="text-xs text-[hsl(0,0%,55%)]">root@q-linux: ~</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-[hsl(0,0%,45%)]">
          {state.schedStats && (
            <>
              <span>{state.schedStats.totalProcesses} procs</span>
              <span>load {state.schedStats.meanHScore.toFixed(2)}</span>
              <span>tick {state.schedStats.tickCount}</span>
            </>
          )}
        </div>
      </header>

      {/* Tab bar */}
      <div className="border-b border-[hsl(0,0%,18%)] bg-[hsl(0,0%,10%)] px-4 flex gap-0">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-1.5 text-xs tracking-wide transition-colors border-b-2 ${
              activeTab === t.id
                ? "border-[hsl(0,0%,70%)] text-[hsl(0,0%,90%)]"
                : "border-transparent text-[hsl(0,0%,45%)] hover:text-[hsl(0,0%,70%)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === "terminal" && (
            <motion.div
              key="terminal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col"
            >
              {/* Terminal output */}
              <div
                ref={termRef}
                className="flex-1 overflow-auto p-4 text-[13px] leading-relaxed"
                onClick={() => inputRef.current?.focus()}
              >
                {state.bootLog.map((line, i) => (
                  <div key={i} className={`whitespace-pre-wrap ${
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
                  <span className="inline-block w-2 h-4 bg-primary animate-pulse" />
                )}
              </div>

              {/* Input — classic bash prompt */}
              {state.stage === "running" && (
                <div className="border-t border-[hsl(0,0%,18%)] px-4 py-2 flex items-center gap-2">
                  <span className="text-[hsl(120,40%,55%)] text-[13px]">root@q-linux:~$</span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    className="flex-1 bg-transparent text-[13px] outline-none text-[hsl(0,0%,80%)] placeholder:text-[hsl(0,0%,35%)] caret-[hsl(0,0%,70%)]"
                    placeholder=""
                    autoFocus
                  />
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "procs" && (
            <motion.div
              key="procs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-auto p-4"
            >
              <h3 className="text-xs text-muted-foreground mb-3 tracking-widest uppercase">Process Table</h3>
              <div className="space-y-1">
                {state.processes.map(p => (
                  <div key={p.pid} className="flex items-center gap-3 text-xs py-1.5 px-2 rounded hover:bg-[hsl(220,20%,10%)] transition-colors">
                    <span className="w-8 text-muted-foreground">{p.pid}</span>
                    <span className="w-28 truncate font-medium">{p.name}</span>
                    <span className={`w-16 ${STATE_COLOR[p.state] || ""}`}>{p.state}</span>
                    <div className="flex-1">
                      <HBar value={p.hScore} />
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${ZONE_BG[p.zone] || ""}`}>
                      {p.zone}
                    </span>
                  </div>
                ))}
              </div>

              {state.schedStats && (
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    { label: "Mean H", value: state.schedStats.meanHScore.toFixed(3) },
                    { label: "Ctx Switches", value: state.schedStats.contextSwitches },
                    { label: "Ticks", value: state.schedStats.tickCount },
                  ].map(s => (
                    <div key={s.label} className="bg-[hsl(220,20%,8%)] border border-[hsl(150,30%,15%)] rounded p-3">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                      <div className="text-lg font-bold text-primary mt-1">{s.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "mesh" && (
            <motion.div
              key="mesh"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-auto p-4"
            >
              <h3 className="text-xs text-muted-foreground mb-3 tracking-widest uppercase">Agent Mesh</h3>

              {state.agents.length === 0 ? (
                <div className="text-sm text-muted-foreground mt-8 text-center">
                  No agents. Use <code className="text-primary">spawn &lt;name&gt;</code> in terminal.
                </div>
              ) : (
                <div className="space-y-2">
                  {state.agents.map(a => (
                    <div key={a.id} className="bg-[hsl(220,20%,8%)] border border-[hsl(150,30%,15%)] rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            a.state === "active" ? "bg-emerald-500" :
                            a.state === "frozen" ? "bg-cyan-400" :
                            a.state === "suspended" ? "bg-orange-400" : "bg-muted-foreground"
                          }`} />
                          <span className="text-sm font-bold">{a.name}</span>
                          <span className="text-[10px] text-muted-foreground">PID {a.pid}</span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${ZONE_BG[a.zone] || ""}`}>
                          {a.zone}
                        </span>
                      </div>
                      <HBar value={a.hScore} label="H" />
                      <div className="flex gap-4 mt-2 text-[10px] text-muted-foreground">
                        <span>Session: {a.sessionLength}</span>
                        <span>State: <span className={STATE_COLOR[a.state] || ""}>{a.state}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {state.meshStats && state.agents.length > 0 && (
                <div className="mt-4 bg-[hsl(220,20%,8%)] border border-[hsl(150,30%,15%)] rounded-lg p-3">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Mesh Coherence</div>
                  <HBar value={state.meshStats.meshCoherence} />
                  <div className="flex gap-4 mt-2 text-[10px] text-muted-foreground">
                    <span>Agents: {state.meshStats.totalAgents}</span>
                    <span>Syscalls: {state.meshStats.totalSyscalls}</span>
                    <span>Messages: {state.meshStats.totalMessages}</span>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "net" && (
            <motion.div
              key="net"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-auto p-4"
            >
              <h3 className="text-xs text-muted-foreground mb-3 tracking-widest uppercase">Fano Topology — PG(2,2)</h3>
              <div className="max-w-[240px] mx-auto">
                <FanoTopology nodes={state.fanoNodes} />
              </div>
              <div className="mt-4 text-xs text-center text-muted-foreground">
                7 nodes · 42 routes · max 2 hops between any pair
              </div>
              {state.net && (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {(() => {
                    const ns = state.net.stats();
                    return [
                      { label: "Sent", value: ns.envelopesSent },
                      { label: "Received", value: ns.envelopesReceived },
                      { label: "Rejected", value: ns.firewallRejections },
                    ].map(s => (
                      <div key={s.label} className="bg-[hsl(220,20%,8%)] border border-[hsl(150,30%,15%)] rounded p-3 text-center">
                        <div className="text-[10px] text-muted-foreground uppercase">{s.label}</div>
                        <div className="text-lg font-bold text-primary mt-1">{s.value}</div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "collab" && (
            <motion.div
              key="collab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-auto p-4"
            >
              <h3 className="text-xs text-muted-foreground mb-3 tracking-widest uppercase">
                Multi-Agent Collaboration
                {demoRunning && <span className="ml-2 text-amber-400 animate-pulse">● RUNNING</span>}
              </h3>

              {demoLog.length === 0 ? (
                <div className="text-sm text-muted-foreground mt-8 text-center">
                  No demo data. Type <code className="text-primary">demo</code> in terminal to start.
                </div>
              ) : (
                <>
                  {/* Convergence chart — H-score over rounds */}
                  <div className="bg-[hsl(220,20%,8%)] border border-[hsl(150,30%,15%)] rounded-lg p-4 mb-4">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">H-Score Convergence</div>
                    <div className="h-32 flex items-end gap-0.5">
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
                              <motion.div
                                key={`${r}-${ai}`}
                                className={`flex-1 rounded-t ${colors[ai]} opacity-80`}
                                initial={{ height: 0 }}
                                animate={{ height: `${h * 100}%` }}
                                transition={{ duration: 0.5, delay: r * 0.15 + ai * 0.05 }}
                              />
                            );
                          }
                          if (r < rounds - 1) {
                            bars.push(<div key={`gap-${r}`} className="w-1" />);
                          }
                        }
                        return bars;
                      })()}
                    </div>
                    <div className="flex justify-between mt-1 text-[9px] text-muted-foreground">
                      {Array.from({ length: Math.max(...demoLog.filter(e => e.action === "feedback").map(e => e.tick), 0) + 1 }, (_, i) => (
                        <span key={i}>R{i + 1}</span>
                      ))}
                    </div>
                    <div className="flex gap-4 mt-2 text-[10px]">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500" /> researcher</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-sky-500" /> synthesizer</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-500" /> critic</span>
                    </div>
                  </div>

                  {/* Mesh coherence over rounds */}
                  <div className="bg-[hsl(220,20%,8%)] border border-[hsl(150,30%,15%)] rounded-lg p-4 mb-4">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Mesh Coherence Trend</div>
                    {demoLog.filter(e => e.agent === "mesh" && e.action === "tick").map((e, i) => (
                      <div key={i} className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-muted-foreground w-6">R{e.tick + 1}</span>
                        <div className="flex-1">
                          <HBar value={e.h} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Peer Review Matrix */}
                  {demoLog.some(e => e.action === "peer-review") && (
                    <div className="bg-[hsl(220,20%,8%)] border border-[hsl(150,30%,15%)] rounded-lg p-4 mb-4">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">Peer Review Scores (Latest Round)</div>
                      {(() => {
                        const agents = ["researcher", "synthesizer", "critic"];
                        const colors = ["text-emerald-400", "text-sky-400", "text-amber-400"];
                        const lastRound = Math.max(...demoLog.filter(e => e.action === "peer-review").map(e => e.tick));
                        const reviews = demoLog.filter(e => e.action === "peer-review" && e.tick === lastRound);
                        return (
                          <div className="space-y-2">
                            {agents.map((reviewer, ri) => (
                              <div key={reviewer} className="flex items-center gap-2 text-[11px]">
                                <span className={`w-20 truncate font-medium ${colors[ri]}`}>{reviewer}</span>
                                <span className="text-muted-foreground">→</span>
                                <div className="flex gap-3 flex-1">
                                  {reviews
                                    .filter(r => r.agent === reviewer)
                                    .map((r, j) => {
                                      const targetName = r.detail.split(" ")[0].replace("→", "");
                                      const score = parseFloat(r.detail.split(" ")[1]);
                                      const scoreColor = score >= 0.7 ? "text-emerald-400" : score >= 0.4 ? "text-amber-400" : "text-red-400";
                                      return (
                                        <span key={j} className="flex items-center gap-1">
                                          <span className="text-muted-foreground">{targetName}</span>
                                          <span className={`font-mono font-bold ${scoreColor}`}>{score.toFixed(2)}</span>
                                        </span>
                                      );
                                    })}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Post-Peer H-Score Convergence */}
                  {demoLog.some(e => e.action === "peer-result") && (
                    <div className="bg-[hsl(220,20%,8%)] border border-[hsl(150,30%,15%)] rounded-lg p-4 mb-4">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">Post-Peer H-Score (Human + Peer Combined)</div>
                      <div className="h-32 flex items-end gap-0.5">
                        {(() => {
                          const agents = ["researcher", "synthesizer", "critic"];
                          const colors = ["bg-emerald-500", "bg-sky-500", "bg-amber-500"];
                          const rounds = Math.max(...demoLog.filter(e => e.action === "peer-result").map(e => e.tick)) + 1;
                          const bars: JSX.Element[] = [];
                          for (let r = 0; r < rounds; r++) {
                            for (let ai = 0; ai < agents.length; ai++) {
                              const entries = demoLog.filter(e => e.agent === agents[ai] && e.action === "peer-result" && e.tick === r);
                              const h = entries.length > 0 ? entries[entries.length - 1].h : 0;
                              bars.push(
                                <motion.div
                                  key={`${r}-${ai}`}
                                  className={`flex-1 rounded-t ${colors[ai]}`}
                                  initial={{ height: 0 }}
                                  animate={{ height: `${h * 100}%` }}
                                  transition={{ duration: 0.5, delay: r * 0.15 + ai * 0.05 }}
                                />
                              );
                            }
                            if (r < rounds - 1) bars.push(<div key={`gap-${r}`} className="w-1" />);
                          }
                          return bars;
                        })()}
                      </div>
                      <div className="flex justify-between mt-1 text-[9px] text-muted-foreground">
                        {Array.from({ length: Math.max(...demoLog.filter(e => e.action === "peer-result").map(e => e.tick), 0) + 1 }, (_, i) => (
                          <span key={i}>R{i + 1}</span>
                        ))}
                      </div>
                      <div className="flex gap-4 mt-2 text-[10px]">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500" /> researcher</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-sky-500" /> synthesizer</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-500" /> critic</span>
                      </div>
                    </div>
                  )}

                  {/* Event timeline */}
                  <div className="bg-[hsl(220,20%,8%)] border border-[hsl(150,30%,15%)] rounded-lg p-4">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Activity Timeline</div>
                    <div className="space-y-0.5 max-h-48 overflow-auto">
                      {demoLog.map((e, i) => {
                        const agentColor = e.agent === "researcher" ? "text-emerald-400" :
                          e.agent === "synthesizer" ? "text-sky-400" :
                          e.agent === "critic" ? "text-amber-400" : "text-primary";
                        const actionIcon = e.action === "think" ? "◆" :
                          e.action === "ipc-send" ? "→" :
                          e.action === "feedback" ? "★" :
                          e.action === "peer-review" ? "⇄" :
                          e.action === "peer-result" ? "◎" : "⚡";
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.02 }}
                            className="flex items-center gap-2 text-[11px] py-0.5"
                          >
                            <span className="text-muted-foreground w-6">R{e.tick + 1}</span>
                            <span className="w-3">{actionIcon}</span>
                            <span className={`w-20 truncate font-medium ${agentColor}`}>{e.agent}</span>
                            <span className="text-muted-foreground w-16">{e.action}</span>
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
