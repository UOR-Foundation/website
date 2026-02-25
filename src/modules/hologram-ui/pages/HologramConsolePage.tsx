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
import { ingestAndSpawn } from "@/modules/uns/core/hologram/universal-ingest";
import { VShell, type ShellResult } from "@/modules/uns/core/hologram/vshell";
import type { MmapResult } from "@/modules/uns/core/hologram/virtual-io";
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
  const shellRef = useRef<VShell | null>(null);
  const [lines, setLines] = useState<TermLine[]>([]);
  const [input, setInput] = useState("");
  const [histIdx, setHistIdx] = useState(-1);
  const [selectedPid, setSelectedPid] = useState<string | null>(null);
  const [projections, setProjections] = useState<MmapResult[]>([]);
  const [lastTick, setLastTick] = useState<EngineTick | null>(null);
  const [identity, setIdentity] = useState<ProjectionInput | null>(null);
  const [processCount, setProcessCount] = useState(0);
  const [persisted, setPersisted] = useState(false);
  const termRef = useRef<HTMLDivElement>(null);
  const lineId = useRef(0);
  const { saveAll, loadAll } = useHologramPersistence();

  // Boot engine + shell once
  const engine = useMemo(() => {
    if (!engineRef.current) {
      engineRef.current = new HologramEngine("hologram-os:console");
    }
    return engineRef.current;
  }, []);

  const shell = useMemo(() => {
    if (!shellRef.current) {
      shellRef.current = new VShell(engine);
    }
    return shellRef.current;
  }, [engine]);

  // Wire persistence into vShell
  useEffect(() => {
    shell.onSave = saveAll;
    shell.onLoad = loadAll;
  }, [shell, saveAll, loadAll]);

  const emit = useCallback((type: TermLine["type"], text: string) => {
    setLines(prev => [...prev, { id: lineId.current++, type, text }]);
  }, []);

  /** Append text to the last terminal line (for streaming tokens). */
  const appendToLastLine = useCallback((token: string) => {
    setLines(prev => {
      if (prev.length === 0) return [{ id: lineId.current++, type: "output" as const, text: token }];
      const last = prev[prev.length - 1];
      if (last.type !== "output") {
        // Start a new streaming output line
        return [...prev, { id: lineId.current++, type: "output" as const, text: token }];
      }
      // Append to existing output line
      return [...prev.slice(0, -1), { ...last, text: last.text + token }];
    });
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
    emit("info", "║         HOLOGRAM OS v1.0 — Virtual Shell (vsh)  ║");
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
        const result = await shell.exec("load");
        if (cancelled) return;
        applyShellResult(result);
      } catch {
        // No persisted sessions — that's fine
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save before page unload
  useEffect(() => {
    const handler = () => {
      saveAll(engine, shell.blueprintMap);
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [engine, saveAll, shell]);

  // ── Apply ShellResult to React state ──────────────────────────────────

  const applyShellResult = useCallback((result: ShellResult) => {
    // Emit lines
    for (const line of result.lines) {
      const typeMap: Record<string, TermLine["type"]> = {
        output: "output", info: "info", error: "error", mutation: "info",
      };
      emit(typeMap[line.kind] ?? "output", line.text);
    }
    // Apply effects
    const fx = result.effects;
    if (fx.clear) setLines([]);
    if (fx.selectedPid !== undefined) setSelectedPid(fx.selectedPid);
    if (fx.identity !== undefined) setIdentity(fx.identity);
    if (fx.tick !== undefined) setLastTick(fx.tick);
    if (fx.projections) setProjections(fx.projections);
    if (fx.processCount !== undefined) setProcessCount(fx.processCount);
    if (fx.persistedCount !== undefined && fx.persistedCount > 0) setPersisted(true);
  }, [emit]);

  // ── Command Execution (delegates to vShell) ───────────────────────────

  const exec = useCallback(async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;
    emit("input", `$ ${trimmed}`);
    setHistIdx(-1);

    // Provide a streaming token callback so ai run streams tokens in real-time
    const streamCallback = (token: string) => appendToLastLine(token);
    const result = await shell.exec(trimmed, { onStreamToken: streamCallback });
    applyShellResult(result);
  }, [shell, emit, applyShellResult, appendToLastLine]);

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

    shell.blueprintMap.set(result.pid, result.blueprint);
    emit("output", `✓ Spawned "${file.name}" as PID: ${result.pid.slice(0, 24)}…`);
    emit("output", `  Format: ${result.envelope.format} | CID: ${result.proof.cid.slice(0, 32)}…`);
    setSelectedPid(result.pid);
    setIdentity(result.identity);
    setProcessCount(engine.processCount);
  }, [engine, emit, shell]);

  // ── Keyboard Handler ───────────────────────────────────────────────────

  const [tabCandidates, setTabCandidates] = useState<string[]>([]);
  const tabIdxRef = useRef(-1);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const candidates = tabCandidates.length > 0 ? tabCandidates : shell.complete(input);
      if (candidates.length === 0) return;

      if (candidates.length === 1) {
        // Single match — complete directly
        setInput(candidates[0] + " ");
        setTabCandidates([]);
        tabIdxRef.current = -1;
      } else {
        // Cycle through candidates
        if (tabCandidates.length === 0) setTabCandidates(candidates);
        const nextIdx = (tabIdxRef.current + 1) % candidates.length;
        tabIdxRef.current = nextIdx;
        setInput(candidates[nextIdx]);
      }
      return;
    }

    // Any non-Tab key resets tab completion state
    if (e.key !== "Shift") {
      setTabCandidates([]);
      tabIdxRef.current = -1;
    }

    if (e.key === "Enter") {
      exec(input);
      setInput("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const h = shell.history;
      const next = Math.min(histIdx + 1, h.length - 1);
      setHistIdx(next);
      if (h[next]) setInput(h[next]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const h = shell.history;
      const next = histIdx - 1;
      setHistIdx(next);
      setInput(next >= 0 ? h[next] ?? "" : "");
    }
  }, [exec, input, shell, histIdx, tabCandidates]);

  // ── Quick Actions ──────────────────────────────────────────────────────

  const quickSpawn = useCallback(async () => {
    await exec("spawn Hello World from Hologram OS!");
  }, [exec]);

  const quickIngestJson = useCallback(async () => {
    const obj = { "@context": "https://schema.org", "@type": "Thing", name: "Demo Object" };
    const result = await ingestAndSpawn(engine, obj, { label: "schema.org/Thing" });
    shell.blueprintMap.set(result.pid, result.blueprint);
    emit("output", `✓ JSON-LD → PID: ${result.pid.slice(0, 24)}…`);
    setSelectedPid(result.pid);
    setIdentity(result.identity);
    setProcessCount(engine.processCount);
  }, [engine, emit, exec, shell]);

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

// ── Constants ──────────────────────────────────────────────────────────────

const PHASES = [
  { phase: 1, title: "Hologram Projections", color: "hsl(200, 60%, 50%)", desc: "356+ projections map one SHA-256 hash to every protocol standard — DID, CID, IPv6, ActivityPub, Bitcoin Script, and more." },
  { phase: 2, title: "Holographic Lens", color: "hsl(280, 60%, 55%)", desc: "Composable, bidirectional transformation circuits. Dehydrate (Focus) any object to canonical bytes, Refract into 9 modalities." },
  { phase: 3, title: "Executable Blueprint", color: "hsl(152, 44%, 50%)", desc: "Self-evolving programs: LensBlueprint (WHAT) + PolyTree (HOW). Content-addressed, deterministic, with full suspend/resume." },
  { phase: 4, title: "Virtual I/O", color: "hsl(45, 70%, 50%)", desc: "POSIX syscall facade — fork, exec, read, write, mmap, pipe, kill — mapped to UOR primitives. Zero new state." },
  { phase: 5, title: "Universal Ingest", color: "hsl(0, 70%, 55%)", desc: "Any artifact (WASM, JSON, binary, text) → content-addressed JSON-LD envelope → full hologram with one function call." },
  { phase: 6, title: "Hologram OS Console", color: "hsl(var(--primary))", desc: "This console. The interactive virtual OS environment that ties all phases into a live, operational browser-based system." },
];
