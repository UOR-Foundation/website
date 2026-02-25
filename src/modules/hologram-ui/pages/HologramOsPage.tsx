/**
 * Phase 6: Hologram OS — The Virtual Operating System Console
 * ════════════════════════════════════════════════════════════
 *
 * The holographic principle made interactive:
 *   Any digital artifact → content-addressed identity → running process → live UI projections.
 *
 * This page ties all 5 phases into a single cohesive experience:
 *   Phase 1 (Projections)     → mmap/mmapAll displays protocol addresses
 *   Phase 2 (Lens)            → read/write through lens pipelines
 *   Phase 3 (Executable)      → boot, fork, interact processes
 *   Phase 4 (Virtual I/O)     → POSIX syscall commands
 *   Phase 5 (Universal Ingest)→ drag-and-drop / paste any artifact
 *
 * @module hologram-ui/pages/HologramOsPage
 */

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  IconTerminal2, IconCpu, IconUpload, IconPlayerPlay,
  IconEye, IconWorldWww, IconBinaryTree, IconCircleFilled, IconBolt,
  IconDeviceFloppy, IconRestore,
} from "@tabler/icons-react";
import { useHologramPersistence } from "@/modules/hologram-ui/hooks/useHologramPersistence";
import {
  PageShell, StatCard, DashboardGrid, MetricBar, InfoCard, DataTable,
  DynamicProjection,
  type DataTableColumn,
} from "@/modules/hologram-ui";
import { HologramEngine, type EngineTick } from "@/modules/uns/core/hologram/engine";
import {
  ingest, ingestAndSpawn,
  type IngestResult, type IngestSpawnedResult,
} from "@/modules/uns/core/hologram/universal-ingest";
import {
  vStat, vPs, vMmap, vMmapAll, vIoctl, vKill,
  type MmapResult,
} from "@/modules/uns/core/hologram/virtual-io";
import { DIRECTIONS } from "@/modules/uns/core/hologram/polytree";
import type { ProjectionInput } from "@/modules/uns/core/hologram";

// ── Terminal Line Types ────────────────────────────────────────────────────

interface TermLine {
  id: number;
  type: "input" | "output" | "error" | "info";
  text: string;
}

// ── The OS Console ─────────────────────────────────────────────────────────

export default function HologramOsPage() {
  const engineRef = useRef<HologramEngine | null>(null);
  const [lines, setLines] = useState<TermLine[]>([]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [selectedPid, setSelectedPid] = useState<string | null>(null);
  const [projections, setProjections] = useState<MmapResult[]>([]);
  const [lastTick, setLastTick] = useState<EngineTick | null>(null);
  const [identity, setIdentity] = useState<ProjectionInput | null>(null);
  const [processCount, setProcessCount] = useState(0);
  const [persisted, setPersisted] = useState(false);
  const termRef = useRef<HTMLDivElement>(null);
  const lineId = useRef(0);
  const blueprintMapRef = useRef(new Map<string, import("@/modules/uns/core/hologram/executable-blueprint").ExecutableBlueprint>());
  const { saveAll, loadAll, clearAll } = useHologramPersistence();

  // Boot engine once
  const engine = useMemo(() => {
    if (!engineRef.current) {
      engineRef.current = new HologramEngine("hologram-os:console");
    }
    return engineRef.current;
  }, []);

  const emit = useCallback((type: TermLine["type"], text: string) => {
    setLines(prev => [...prev, { id: lineId.current++, type, text }]);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (termRef.current) {
      termRef.current.scrollTop = termRef.current.scrollHeight;
    }
  }, [lines]);

  // Welcome message
  useEffect(() => {
    emit("info", "╔══════════════════════════════════════════════════╗");
    emit("info", "║         HOLOGRAM OS v1.0 — Virtual Console      ║");
    emit("info", "║   One hash. Every standard. Any system.         ║");
    emit("info", "╚══════════════════════════════════════════════════╝");
    emit("info", "");
    emit("info", "Type 'help' for commands. Drag & drop any file to ingest.");
    emit("info", "");
  }, [emit]);

  // Auto-load persisted sessions on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { pids, blueprintMap } = await loadAll(engine);
        if (cancelled || pids.length === 0) return;
        for (const [pid, bp] of blueprintMap) {
          blueprintMapRef.current.set(pid, bp);
        }
        setProcessCount(engine.processCount);
        if (pids[0]) {
          setSelectedPid(pids[0]);
          const tick = await engine.tick(pids[0]);
          setIdentity(tick.identity);
          setLastTick(tick);
        }
        setPersisted(true);
        emit("info", `✓ Restored ${pids.length} process(es) from previous session.`);
      } catch {
        // No persisted sessions — that's fine
      }
    })();
    return () => { cancelled = true; };
  }, [engine, loadAll, emit]);

  // Auto-save before page unload
  useEffect(() => {
    const handler = () => {
      // Fire-and-forget save (best effort on unload)
      saveAll(engine, blueprintMapRef.current);
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [engine, saveAll]);

  // ── Command Execution ──────────────────────────────────────────────────

  const exec = useCallback(async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    emit("input", `$ ${trimmed}`);
    setHistory(h => [trimmed, ...h].slice(0, 50));
    setHistIdx(-1);

    const [op, ...args] = trimmed.split(/\s+/);

    try {
      switch (op) {
        case "help": {
          emit("info", "── Hologram OS Commands ──────────────────────");
          emit("info", "  ingest <text>       Ingest text as UOR object");
          emit("info", "  spawn  <text>       Ingest + boot as process");
          emit("info", "  ps                  List running processes");
          emit("info", "  stat   <pid>        Process status");
          emit("info", "  tick   <pid> [p] [d] Evolve process state");
          emit("info", "  mmap   <pid> <proj> Map identity to protocol");
          emit("info", "  mmapall <pid>       Show ALL projections");
          emit("info", "  select <pid>        Select process for UI");
          emit("info", "  kill   <pid>        Terminate process");
          emit("info", "  save                Save all processes to disk");
          emit("info", "  load                Restore saved processes");
          emit("info", "  clear               Clear terminal");
          emit("info", "  help                Show this help");
          emit("info", "──────────────────────────────────────────────");
          break;
        }

        case "clear": {
          setLines([]);
          break;
        }

        case "ingest": {
          const text = args.join(" ") || "Hello, Hologram OS!";
          const result: IngestResult = await ingest(text) as IngestResult;
          emit("output", `✓ Ingested ${result.envelope.format} (${result.envelope.byteLength} bytes)`);
          emit("output", `  CID: ${result.proof.cid.slice(0, 40)}…`);
          emit("output", `  DID: did:uor:${result.proof.cid.slice(0, 20)}…`);
          emit("output", `  Projections: ${Object.keys(result.hologram.projections).length} standards`);
          setIdentity(result.identity);
          break;
        }

        case "spawn": {
          const text = args.join(" ") || "Hologram Process";
          const result: IngestSpawnedResult = await ingestAndSpawn(engine, text, {
            label: text.slice(0, 32),
          });
          blueprintMapRef.current.set(result.pid, result.blueprint);
          emit("output", `✓ Spawned process PID: ${result.pid.slice(0, 24)}…`);
          emit("output", `  Format: ${result.envelope.format} | ${result.envelope.byteLength} bytes`);
          emit("output", `  Blueprint: ${result.blueprint.name}`);
          setSelectedPid(result.pid);
          setIdentity(result.identity);
          setProcessCount(engine.processCount);
          break;
        }

        case "save": {
          emit("info", "Saving all processes…");
          const count = await saveAll(engine, blueprintMapRef.current);
          if (count > 0) {
            setPersisted(true);
            emit("output", `✓ Saved ${count} process(es) to persistent storage.`);
            emit("info", "  Processes will be restored on next page load.");
          } else {
            emit("info", "No running processes to save.");
          }
          break;
        }

        case "load": {
          emit("info", "Loading persisted sessions…");
          const { pids, blueprintMap } = await loadAll(engine);
          for (const [pid, bp] of blueprintMap) {
            blueprintMapRef.current.set(pid, bp);
          }
          setProcessCount(engine.processCount);
          if (pids.length > 0) {
            setSelectedPid(pids[0]);
            const tick = await engine.tick(pids[0]);
            setIdentity(tick.identity);
            setLastTick(tick);
            setPersisted(true);
            emit("output", `✓ Restored ${pids.length} process(es).`);
          } else {
            emit("info", "No saved sessions found.");
          }
          break;
        }

        case "ps": {
          const pids = vPs(engine);
          if (pids.length === 0) {
            emit("info", "No running processes.");
          } else {
            emit("output", `PID                       STATUS   TICKS  HISTORY`);
            emit("output", `─────────────────────────  ───────  ─────  ───────`);
            for (const pid of pids) {
              const s = vStat(engine, pid);
              emit("output",
                `${s.pid.slice(0, 24).padEnd(25)} ${s.status.padEnd(8)} ${String(s.tickCount).padEnd(6)} ${s.historyLength}`
              );
            }
          }
          setProcessCount(engine.processCount);
          break;
        }

        case "stat": {
          const pid = args[0] || selectedPid;
          if (!pid) { emit("error", "Usage: stat <pid>"); break; }
          const resolved = resolvePid(engine, pid);
          const s = vStat(engine, resolved);
          emit("output", `PID:     ${s.pid.slice(0, 40)}…`);
          emit("output", `Status:  ${s.status}`);
          emit("output", `Ticks:   ${s.tickCount}`);
          emit("output", `History: ${s.historyLength} interactions`);
          emit("output", `Spawned: ${s.spawnedAt}`);
          break;
        }

        case "tick": {
          const pid = args[0] || selectedPid;
          if (!pid) { emit("error", "Usage: tick <pid> [position] [direction]"); break; }
          const resolved = resolvePid(engine, pid);
          const pos = parseInt(args[1] ?? "0", 10);
          const dir = parseInt(args[2] ?? String(DIRECTIONS.VERIFIED), 10);
          const tick = await vIoctl(engine, resolved, pos, dir);
          setLastTick(tick);
          setIdentity(tick.identity);
          emit("output", `✓ Tick #${tick.sequence} on ${tick.pid.slice(0, 20)}…`);
          emit("output", `  Halted: ${tick.halted} | Projections: ${tick.projections.size}`);
          if (tick.interaction) {
            emit("output", `  Interaction: step=${tick.interaction.step.position} changed=${tick.interaction.interfaceChanged}`);
          }
          break;
        }

        case "mmap": {
          const pid = args[0] || selectedPid;
          const proj = args[1] ?? "did";
          if (!pid) { emit("error", "Usage: mmap <pid> <projection>"); break; }
          const resolved = resolvePid(engine, pid);
          const result = await vMmap(engine, resolved, proj);
          emit("output", `✓ mmap ${proj}:`);
          emit("output", `  ${result.address}`);
          emit("output", `  Fidelity: ${result.fidelity} | Spec: ${result.spec}`);
          break;
        }

        case "mmapall": {
          const pid = args[0] || selectedPid;
          if (!pid) { emit("error", "Usage: mmapall <pid>"); break; }
          const resolved = resolvePid(engine, pid);
          const all = await vMmapAll(engine, resolved);
          const arr = [...all.entries()];
          emit("output", `✓ ${arr.length} projections for ${resolved.slice(0, 20)}…`);
          // Show first 12
          const shown = arr.slice(0, 12);
          for (const [name, mmap] of shown) {
            const addr = mmap.address.length > 50
              ? mmap.address.slice(0, 50) + "…"
              : mmap.address;
            emit("output", `  ${name.padEnd(18)} ${addr}`);
          }
          if (arr.length > 12) {
            emit("info", `  … and ${arr.length - 12} more`);
          }
          setProjections(arr.map(([, v]) => v));
          if (arr[0]) setIdentity(arr[0][1].identity);
          break;
        }

        case "select": {
          const pid = args[0];
          if (!pid) { emit("error", "Usage: select <pid>"); break; }
          const resolved = resolvePid(engine, pid);
          setSelectedPid(resolved);
          emit("output", `✓ Selected: ${resolved.slice(0, 30)}…`);
          // Auto-fetch identity
          const tick = await engine.tick(resolved);
          setIdentity(tick.identity);
          setLastTick(tick);
          break;
        }

        case "kill": {
          const pid = args[0] || selectedPid;
          if (!pid) { emit("error", "Usage: kill <pid>"); break; }
          const resolved = resolvePid(engine, pid);
          vKill(engine, resolved);
          emit("output", `✓ Killed: ${resolved.slice(0, 30)}…`);
          if (selectedPid === resolved) {
            setSelectedPid(null);
            setIdentity(null);
            setLastTick(null);
          }
          setProcessCount(engine.processCount);
          break;
        }

        default:
          emit("error", `Unknown command: ${op}. Type 'help' for available commands.`);
      }
    } catch (e: unknown) {
      emit("error", `Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [engine, emit, selectedPid, saveAll, loadAll]);

  // ── File Drop Handler ──────────────────────────────────────────────────

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    emit("info", `Ingesting: ${file.name} (${file.size} bytes)…`);
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    const result = await ingestAndSpawn(engine, bytes, {
      label: file.name,
      tags: [file.type || "unknown"],
    });

    blueprintMapRef.current.set(result.pid, result.blueprint);
    emit("output", `✓ Spawned "${file.name}" as PID: ${result.pid.slice(0, 24)}…`);
    emit("output", `  Format: ${result.envelope.format} | CID: ${result.proof.cid.slice(0, 32)}…`);
    setSelectedPid(result.pid);
    setIdentity(result.identity);
    setProcessCount(engine.processCount);
  }, [engine, emit]);

  // ── Keyboard Handler ───────────────────────────────────────────────────

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      exec(input);
      setInput("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.min(histIdx + 1, history.length - 1);
      setHistIdx(next);
      if (history[next]) setInput(history[next]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = histIdx - 1;
      setHistIdx(next);
      setInput(next >= 0 ? history[next] ?? "" : "");
    }
  }, [exec, input, history, histIdx]);

  // ── Quick Actions ──────────────────────────────────────────────────────

  const quickSpawn = useCallback(async () => {
    await exec("spawn Hello World from Hologram OS!");
  }, [exec]);

  const quickIngestJson = useCallback(async () => {
    const obj = { "@context": "https://schema.org", "@type": "Thing", name: "Demo Object" };
    const result = await ingestAndSpawn(engine, obj, { label: "schema.org/Thing" });
    blueprintMapRef.current.set(result.pid, result.blueprint);
    emit("output", `✓ JSON-LD → PID: ${result.pid.slice(0, 24)}…`);
    setSelectedPid(result.pid);
    setIdentity(result.identity);
    setProcessCount(engine.processCount);
  }, [engine, emit, exec]);

  const quickSave = useCallback(async () => {
    await exec("save");
  }, [exec]);

  const quickLoad = useCallback(async () => {
    await exec("load");
  }, [exec]);

  // ── Projection Columns ─────────────────────────────────────────────────

  // Map MmapResults to generic records for DataTable
  const projRows = useMemo(() =>
    projections.map(p => ({
      projection: p.projection,
      address: p.address,
      fidelity: p.fidelity,
      spec: p.spec,
    })),
    [projections],
  );

  type ProjRow = { projection: string; address: string; fidelity: string; spec: string; [k: string]: unknown };

  const projCols = useMemo<DataTableColumn<ProjRow>[]>(() => [
    { key: "projection", label: "Standard", mono: true, width: "140px" },
    {
      key: "address", label: "Address",
      render: (r) => (
        <span className="text-[10px] font-mono break-all">
          {r.address.length > 60 ? r.address.slice(0, 60) + "…" : r.address}
        </span>
      ),
    },
    {
      key: "fidelity", label: "Fidelity", width: "80px",
      render: (r) => (
        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
          r.fidelity === "lossless"
            ? "bg-[hsl(152,44%,50%)]/10 text-[hsl(152,44%,50%)]"
            : "bg-[hsl(38,92%,50%)]/10 text-[hsl(38,92%,50%)]"
        }`}>
          {r.fidelity.toUpperCase()}
        </span>
      ),
    },
  ], []);

  return (
    <PageShell
      title="Hologram OS"
      subtitle="Virtual Operating System Console"
      icon={<IconTerminal2 size={18} />}
      badge="Phase 6"
      backTo="/hologram-ui"
    >
      {/* Quick Actions */}
      <section className="flex flex-wrap gap-2">
        <button onClick={quickSpawn} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5">
          <IconPlayerPlay size={12} /> Spawn Process
        </button>
        <button onClick={quickIngestJson} className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg text-xs font-medium hover:hover:bg-secondary/80 transition-colors flex items-center gap-1.5">
          <IconUpload size={12} /> Ingest JSON-LD
        </button>
        <button onClick={() => exec("ps")} className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg text-xs font-medium hover:bg-secondary/80 transition-colors flex items-center gap-1.5">
          <IconCpu size={12} /> Process Table
        </button>
        {selectedPid && (
          <button onClick={() => exec("mmapall")} className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg text-xs font-medium hover:bg-secondary/80 transition-colors flex items-center gap-1.5">
            <IconWorldWww size={12} /> All Projections
          </button>
        )}
        {processCount > 0 && (
          <button onClick={quickSave} className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg text-xs font-medium hover:bg-secondary/80 transition-colors flex items-center gap-1.5">
            <IconDeviceFloppy size={12} /> Save State
          </button>
        )}
        <button onClick={quickLoad} className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg text-xs font-medium hover:bg-secondary/80 transition-colors flex items-center gap-1.5">
          <IconRestore size={12} /> Restore
        </button>
      </section>

      {/* Stats Row */}
      <DashboardGrid cols={4}>
        <StatCard label="Processes" value={processCount} icon={<IconCpu size={16} />} trend={processCount > 0 ? processCount * 10 : 0} sublabel="running" />
        <StatCard label="Last Tick" value={lastTick?.sequence ?? "—"} icon={<IconBolt size={16} />} sublabel={lastTick ? `halted: ${lastTick.halted}` : "no ticks yet"} />
        <StatCard label="Projections" value={lastTick?.projections.size ?? 0} icon={<IconEye size={16} />} sublabel="UI components" />
        <StatCard label="Selected" value={selectedPid ? selectedPid.slice(0, 10) + "…" : "none"} icon={<IconBinaryTree size={16} />} sublabel={selectedPid ? "active" : "select a process"} />
      </DashboardGrid>

      {/* Terminal + UI Panel side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Terminal */}
        <div
          className="bg-card border border-border rounded-xl overflow-hidden flex flex-col"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <div className="flex items-center gap-2 px-4 py-2 bg-secondary/50 border-b border-border">
            <IconCircleFilled size={8} className="text-[hsl(0,70%,55%)]" />
            <IconCircleFilled size={8} className="text-[hsl(45,70%,50%)]" />
            <IconCircleFilled size={8} className="text-[hsl(152,44%,50%)]" />
            <span className="text-[10px] font-mono text-muted-foreground ml-2">hologram-os:~</span>
          </div>
          <div ref={termRef} className="flex-1 min-h-[320px] max-h-[480px] overflow-y-auto p-4 font-mono text-xs space-y-0.5">
            {lines.map(line => (
              <div key={line.id} className={
                line.type === "input" ? "text-primary font-semibold" :
                line.type === "error" ? "text-destructive" :
                line.type === "info" ? "text-muted-foreground" :
                "text-foreground"
              }>
                {line.text}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 px-4 py-2 border-t border-border bg-secondary/30">
            <span className="text-primary text-xs font-mono">$</span>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type a command…"
              className="flex-1 bg-transparent outline-none text-xs font-mono text-foreground placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
        </div>

        {/* UI Projection Panel */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2">
            <IconEye size={14} className="text-primary" />
            <span className="text-xs font-semibold">Live UI Projections</span>
          </div>

          {identity ? (
            <div className="space-y-3">
              <DynamicProjection source={identity} type="ui:stat-card" />
              <DynamicProjection source={identity} type="ui:metric-bar" />
              <DynamicProjection source={identity} type="ui:info-card">
                <div className="text-[10px] font-mono text-muted-foreground space-y-1">
                  <div>CID: {identity.cid.slice(0, 40)}…</div>
                  <div>Hex: {identity.hex.slice(0, 40)}…</div>
                  <div>Hash Bytes: [{Array.from(identity.hashBytes.slice(0, 8)).join(", ")}…]</div>
                </div>
              </DynamicProjection>
              <DynamicProjection source={identity} type="ui:data-table" />
            </div>
          ) : (
            <div className="text-xs text-muted-foreground text-center py-12">
              Spawn or ingest an artifact to see its live visual projections here.
              <br />
              <span className="text-[10px]">Each process state deterministically maps to unique UI components.</span>
            </div>
          )}
        </div>
      </div>

      {/* Projection Table */}
      {projections.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <IconWorldWww size={16} className="text-primary" />
            Protocol Projections ({projections.length} standards)
          </h3>
          <DataTable
            columns={projCols}
            data={projRows}
            getKey={(r) => r.projection}
          />
        </section>
      )}

      {/* Architecture Info */}
      <section className="space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <IconBinaryTree size={16} className="text-primary" />
          Architecture — The Six Phases
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PHASES.map(p => (
            <InfoCard key={p.phase} title={p.title} badge={`Phase ${p.phase}`} badgeColor={p.color} defaultOpen={p.phase === 6}>
              <p className="text-[10px] text-muted-foreground leading-relaxed">{p.desc}</p>
            </InfoCard>
          ))}
        </div>
      </section>

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground py-4 border-t border-border">
        Hologram OS — One hash. Every standard. Any system. Powered by the UOR Framework.
      </div>
    </PageShell>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function resolvePid(engine: HologramEngine, hint: string): string {
  // Allow prefix matching for convenience
  const pids = engine.listProcesses();
  const exact = pids.find(p => p === hint);
  if (exact) return exact;
  const prefix = pids.find(p => p.startsWith(hint));
  if (prefix) return prefix;
  return hint; // let engine throw if invalid
}

const PHASES = [
  { phase: 1, title: "Hologram Projections", color: "hsl(200, 60%, 50%)", desc: "356+ projections map one SHA-256 hash to every protocol standard — DID, CID, IPv6, ActivityPub, Bitcoin Script, and more." },
  { phase: 2, title: "Holographic Lens", color: "hsl(280, 60%, 55%)", desc: "Composable, bidirectional transformation circuits. Dehydrate (Focus) any object to canonical bytes, Refract into 9 modalities." },
  { phase: 3, title: "Executable Blueprint", color: "hsl(152, 44%, 50%)", desc: "Self-evolving programs: LensBlueprint (WHAT) + PolyTree (HOW). Content-addressed, deterministic, with full suspend/resume." },
  { phase: 4, title: "Virtual I/O", color: "hsl(45, 70%, 50%)", desc: "POSIX syscall facade — fork, exec, read, write, mmap, pipe, kill — mapped to UOR primitives. Zero new state." },
  { phase: 5, title: "Universal Ingest", color: "hsl(0, 70%, 55%)", desc: "Any artifact (WASM, JSON, binary, text) → content-addressed JSON-LD envelope → full hologram with one function call." },
  { phase: 6, title: "Hologram OS Console", color: "hsl(var(--primary))", desc: "This console. The interactive virtual OS environment that ties all phases into a live, operational browser-based system." },
];
