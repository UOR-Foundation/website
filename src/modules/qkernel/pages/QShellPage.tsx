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
  const { state, bootKernel, executeCommand } = useQShell();
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [activeTab, setActiveTab] = useState<"terminal" | "procs" | "mesh" | "net">("terminal");
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
  ];

  return (
    <div className="min-h-screen bg-[hsl(220,20%,5%)] text-[hsl(150,60%,70%)] font-mono flex flex-col">
      {/* Header */}
      <header className="border-b border-[hsl(150,30%,20%)] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${
            state.stage === "running" ? "bg-emerald-500 animate-pulse" :
            state.stage === "booting" ? "bg-amber-500 animate-pulse" :
            state.stage === "panic" ? "bg-red-500" : "bg-muted-foreground"
          }`} />
          <span className="text-sm font-bold tracking-wider">Q-SHELL</span>
          <span className="text-xs text-muted-foreground">v1.0 — Q-Linux Kernel</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {state.schedStats && (
            <>
              <span>PID: {state.schedStats.totalProcesses}</span>
              <span>H̄: {state.schedStats.meanHScore.toFixed(2)}</span>
              <span>Tick: {state.schedStats.tickCount}</span>
            </>
          )}
          {state.kernel && (
            <span className="text-primary/60 truncate max-w-[120px]">
              CID: {state.kernel.kernelCid.slice(0, 12)}…
            </span>
          )}
        </div>
      </header>

      {/* Tab bar */}
      <div className="border-b border-[hsl(150,30%,15%)] px-4 flex gap-0">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-xs tracking-wide transition-colors border-b-2 ${
              activeTab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
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
                    line.startsWith("POST:") ? "text-amber-400" :
                    line.startsWith("BOOT:") ? "text-sky-400" :
                    line.startsWith("INIT:") ? "text-violet-400" :
                    line.startsWith("PANIC:") ? "text-red-500 font-bold" :
                    line.startsWith("KERNEL:") ? "text-emerald-400 font-bold" :
                    line.startsWith("$") ? "text-primary" :
                    line.match(/^[A-Z]+:/) ? "text-cyan-400" :
                    ""
                  }`}>
                    {line}
                  </div>
                ))}
                {state.stage === "booting" && (
                  <span className="inline-block w-2 h-4 bg-primary animate-pulse" />
                )}
              </div>

              {/* Input */}
              {state.stage === "running" && (
                <div className="border-t border-[hsl(150,30%,15%)] px-4 py-2 flex items-center gap-2">
                  <span className="text-primary text-sm">$</span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    className="flex-1 bg-transparent text-[13px] outline-none text-[hsl(150,60%,70%)] placeholder:text-muted-foreground"
                    placeholder="type 'help' for commands"
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
        </AnimatePresence>
      </div>
    </div>
  );
}
