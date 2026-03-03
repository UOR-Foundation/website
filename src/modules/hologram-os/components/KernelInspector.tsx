/**
 * Kernel Inspector — Hologram's comprehensive debugging tool.
 * ══════════════════════════════════════════════════════════════
 *
 * A unified developer tool that provides deep introspection into
 * every process, event, and system operation within Hologram OS.
 *
 * Toggle with Ctrl+Shift+I (or from sidebar).
 *
 * Tabs:
 *   Processes · Events · Inspect · State · Export
 *
 * Every process can be expanded to view its source code,
 * state snapshot, event history, and lens configuration.
 *
 * @module hologram-os/components/KernelInspector
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { getKernelProjector, type ProjectionFrame, type ProcessProjection } from "@/modules/hologram-os/projection-engine";
import { getBrowserAdapter } from "@/modules/hologram-os/surface-adapter";
import { KP } from "@/modules/hologram-os/kernel-palette";
import { getInstalledPackages, getPackage, type InstalledPackage } from "@/hologram/kernel/surface/q-package-projector";
import {
  IconX, IconBug, IconTerminal2, IconFileCode, IconDatabase,
  IconDownload, IconCopy, IconChevronRight, IconChevronDown,
  IconPlayerPlay, IconPlayerPause, IconSearch, IconFilter,
  IconCircleFilled, IconStack2, IconBinaryTree,
} from "@tabler/icons-react";

// ─── Types ──────────────────────────────────────────────────────────────

type InspectorTab = "processes" | "events" | "inspect" | "state" | "export";

interface KernelEvent {
  id: number;
  timestamp: number;
  type: "boot" | "syscall" | "projection" | "process" | "ipc" | "fs" | "pip" | "error" | "config" | "lens";
  source: string;
  detail: string;
  data?: Record<string, unknown>;
}

// ─── Global Event Bus ───────────────────────────────────────────────────
// Singleton event recorder accessible from anywhere in Hologram.

const MAX_EVENTS = 500;
let _events: KernelEvent[] = [];
let _nextId = 1;
let _listeners = new Set<() => void>();
let _paused = false;

export function kernelLog(
  type: KernelEvent["type"],
  source: string,
  detail: string,
  data?: Record<string, unknown>,
): void {
  if (_paused) return;
  _events.push({
    id: _nextId++,
    timestamp: performance.now(),
    type,
    source,
    detail,
    data,
  });
  if (_events.length > MAX_EVENTS) _events = _events.slice(-MAX_EVENTS);
  _listeners.forEach(fn => fn());
}

export function getKernelEvents(): readonly KernelEvent[] {
  return _events;
}

export function clearKernelEvents(): void {
  _events = [];
  _nextId = 1;
  _listeners.forEach(fn => fn());
}

// Seed boot events from projector
function seedBootEvents(): void {
  const projector = getKernelProjector();
  const boots = projector.getBootEvents();
  for (const b of boots) {
    if (!_events.some(e => e.type === "boot" && e.detail === b.label)) {
      kernelLog("boot", "q-boot", `${b.label}: ${b.detail}`, {
        stage: b.stage,
        progress: b.progress,
        passed: b.passed,
      });
    }
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────

const EVENT_COLORS: Record<string, string> = {
  boot: KP.green,
  syscall: "hsl(200, 60%, 55%)",
  projection: KP.purple,
  process: KP.gold,
  ipc: "hsl(180, 50%, 50%)",
  fs: "hsl(30, 50%, 55%)",
  pip: "hsl(270, 50%, 60%)",
  error: KP.red,
  config: KP.muted,
  lens: "hsl(320, 45%, 55%)",
};

function formatTime(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text).catch(() => {});
}

// ─── Process Source Code Generator ──────────────────────────────────────
// Generates the "source code" view for any kernel process.

function generateProcessSource(proc: ProcessProjection, frame: ProjectionFrame): string {
  const zoneDesc = proc.zone === "convergent" ? "stable, high-coherence execution" : proc.zone === "exploring" ? "active exploration, adapting" : "divergent — may need attention";

  const lines = [
    `#!/usr/bin/env q-linux`,
    `# ═══════════════════════════════════════════════════════════════`,
    `# Process: ${proc.name}`,
    `# PID:     ${proc.pid}`,
    `# State:   ${proc.state}`,
    `# Zone:    ${proc.zone} (${zoneDesc})`,
    `# ═══════════════════════════════════════════════════════════════`,
    ``,
    `from hologram.kernel import QProcess, QSched, QSyscall`,
    `from hologram.kernel.zones import ${proc.zone.toUpperCase()}`,
    ``,
    `class ${toPascalCase(proc.name)}Process(QProcess):`,
    `    """${proc.name} — Q-Linux kernel process."""`,
    ``,
    `    PID = ${proc.pid}`,
    `    H_SCORE = ${proc.hScore.toFixed(6)}`,
    `    ZONE = "${proc.zone}"`,
    `    STATE = "${proc.state}"`,
    `    CPU_TIME_MS = ${proc.cpuMs.toFixed(2)}`,
    `    CHILD_COUNT = ${proc.childCount}`,
    ``,
    `    # ── Kernel Configuration ──────────────────────────────────`,
    `    KERNEL_CID = "${frame.kernelCid}"`,
    `    TICK = ${frame.tick}`,
    `    SYSTEM_COHERENCE = ${frame.systemCoherence.meanH.toFixed(6)}`,
    `    SYSTEM_ZONE = "${frame.systemCoherence.zone}"`,
    `    PROCESS_COUNT = ${frame.systemCoherence.processCount}`,
    ``,
    `    def __init__(self):`,
    `        super().__init__(`,
    `            pid=${proc.pid},`,
    `            name="${proc.name}",`,
    `            priority=${proc.hScore.toFixed(4)},`,
    `        )`,
    `        self.zone = self.classify_zone(self.H_SCORE)`,
    ``,
    `    def tick(self, sched: QSched) -> None:`,
    `        """Execute one scheduling cycle."""`,
    `        # H-score determines scheduling priority`,
    `        # Zone classification: convergent(≥0.8) | exploring(≥0.5) | divergent(<0.5)`,
    `        if self.H_SCORE >= 0.8:`,
    `            self._execute_convergent(sched)`,
    `        elif self.H_SCORE >= 0.5:`,
    `            self._execute_exploring(sched)`,
    `        else:`,
    `            self._execute_divergent(sched)`,
    ``,
    `    def _execute_convergent(self, sched: QSched) -> None:`,
    `        """Stable execution — full resource allocation."""`,
    `        sched.allocate(self.PID, priority=1.0)`,
    `        self.cpu_time_ms += sched.quantum_ms`,
    ``,
    `    def _execute_exploring(self, sched: QSched) -> None:`,
    `        """Adaptive execution — balanced resource allocation."""`,
    `        sched.allocate(self.PID, priority=0.7)`,
    `        self.cpu_time_ms += sched.quantum_ms * 0.7`,
    ``,
    `    def _execute_divergent(self, sched: QSched) -> None:`,
    `        """Degraded execution — may be suspended by scheduler."""`,
    `        if sched.should_suspend(self):`,
    `            self.state = "frozen"`,
    `            return`,
    `        sched.allocate(self.PID, priority=0.3)`,
    ``,
    `    def syscall(self, call: QSyscall) -> Any:`,
    `        """Lens-based system call interface."""`,
    `        # Focus (read) | Refract (write) | Transform (convert)`,
    `        return call.dispatch(self.PID, self.ZONE)`,
    ``,
    `    @property`,
    `    def coherence(self) -> float:`,
    `        """Real-time coherence score."""`,
    `        return self.H_SCORE`,
    ``,
    `    def __repr__(self):`,
    `        return f"<${toPascalCase(proc.name)} PID={self.PID} H={self.H_SCORE:.4f} zone={self.ZONE}>"`,
  ];

  return lines.join("\n");
}

function generatePackageSource(pkg: InstalledPackage): string {
  const lines = [
    `#!/usr/bin/env q-linux`,
    `# ═══════════════════════════════════════════════════════════════`,
    `# Package Projection: ${pkg.metadata.name}`,
    `# Version:  ${pkg.metadata.version}`,
    `# Type:     ${pkg.metadata.projectionType}`,
    `# Lens:     ${pkg.lensId}`,
    `# PID:      ${pkg.pid ?? "–"}`,
    `# ═══════════════════════════════════════════════════════════════`,
    ``,
    `from hologram.kernel import PackageProjection, LensBlueprint`,
    `from hologram.kernel.q_fs import QFs`,
    ``,
    `class ${toPascalCase(pkg.metadata.name)}Projection(PackageProjection):`,
    `    """${pkg.metadata.summary}"""`,
    ``,
    `    NAME = "${pkg.metadata.name}"`,
    `    VERSION = "${pkg.metadata.version}"`,
    `    PROJECTION_TYPE = "${pkg.metadata.projectionType}"`,
    `    LENS_ID = "${pkg.lensId}"`,
    `    FS_PATH = "${pkg.fsPath}"`,
    `    AUTHOR = "${pkg.metadata.author}"`,
    `    LICENSE = "${pkg.metadata.license}"`,
    `    INSTALLED_AT = "${pkg.installedAt}"`,
    `    STATUS = "${pkg.status}"`,
    ``,
    `    # ── Dependencies ─────────────────────────────────────────`,
    ...pkg.metadata.requires.slice(0, 15).map(d =>
      `    #   ${d}`
    ),
    ``,
    `    # ── Lens Blueprint ───────────────────────────────────────`,
    `    LENS = LensBlueprint(`,
    `        morphism="${pkg.metadata.projectionType === "converter" ? "Transform" : "Isometry"}",`,
    `        input_modality="${getModalityForType(pkg.metadata.projectionType, "in")}",`,
    `        output_modality="${getModalityForType(pkg.metadata.projectionType, "out")}",`,
    `        pipeline=[`,
    `            ("ingest",  "focus",     "Canonical input encoding"),`,
    `            ("process", "${pkg.metadata.projectionType === "converter" ? "transform" : "compute"}", "${pkg.metadata.name} core logic"),`,
    `            ("emit",    "refract",   "Output projection"),`,
    `        ],`,
    `        coherence_gate=0.6,`,
    `    )`,
    ``,
    `    def invoke(self, *args) -> ProjectionResult:`,
    `        """Execute the package projection."""`,
    `        self.log("invoke", args=args)`,
    `        return self.LENS.execute(args)`,
    ``,
    `    def __repr__(self):`,
    `        return f"<${toPascalCase(pkg.metadata.name)} v{self.VERSION} [{self.PROJECTION_TYPE}]>"`,
  ];

  return lines.join("\n");
}

function getModalityForType(type: string, dir: "in" | "out"): string {
  if (dir === "in") {
    if (type === "converter") return "binary|text|url";
    if (type === "ai-model") return "tensor|text";
    return "any";
  }
  if (type === "converter") return "text|markdown";
  if (type === "visualization") return "svg|canvas";
  return "any";
}

function toPascalCase(s: string): string {
  return s.replace(/(^|[-_])([a-z])/g, (_, __, c) => c.toUpperCase()).replace(/[^a-zA-Z0-9]/g, "");
}

// ─── Generate full system state snapshot ────────────────────────────────

function generateStateSnapshot(frame: ProjectionFrame): string {
  const projector = getKernelProjector();
  const config = projector.getConfig();
  const dc = projector.getDisplayCapabilities();
  const ss = projector.getStreamStats();
  const br = projector.getBreathingRhythm();
  const adapter = getBrowserAdapter();
  const is = adapter.getInterpStats();
  const pkgs = getInstalledPackages();

  const state = {
    kernel: {
      cid: frame.kernelCid,
      tick: frame.tick,
      stage: frame.stage,
      timestamp: frame.timestamp,
      systemCoherence: frame.systemCoherence,
      breathPeriodMs: frame.breathPeriodMs,
    },
    processes: frame.processes.map(p => ({
      pid: p.pid,
      name: p.name,
      state: p.state,
      hScore: p.hScore,
      zone: p.zone,
      cpuMs: p.cpuMs,
      childCount: p.childCount,
    })),
    panels: frame.panels.map(p => ({
      pid: p.pid,
      name: p.name,
      widgetType: p.widgetType,
      state: p.state,
      coherenceZone: p.coherenceZone,
      hScore: p.hScore,
    })),
    config: {
      activePanel: config.activePanel,
      chatOpen: config.chatOpen,
      paletteMode: config.palette.mode,
      userScale: config.typography.userScale,
      aperture: config.attention.aperture,
    },
    display: dc,
    stream: ss,
    interpolation: is,
    breathing: br,
    packages: pkgs.map(p => ({
      name: p.metadata.name,
      version: p.metadata.version,
      type: p.metadata.projectionType,
      status: p.status,
      pid: p.pid,
      lensId: p.lensId,
    })),
    events: {
      total: _events.length,
      types: Object.entries(
        _events.reduce((acc, e) => { acc[e.type] = (acc[e.type] || 0) + 1; return acc; }, {} as Record<string, number>)
      ),
    },
  };

  return JSON.stringify(state, null, 2);
}

// ─── Tab Panels ─────────────────────────────────────────────────────────

function ProcessesPanel({ frame, onSelectProcess }: { frame: ProjectionFrame; onSelectProcess: (pid: number) => void }) {
  const [search, setSearch] = useState("");
  const pkgs = useMemo(() => getInstalledPackages(), []);

  const allProcesses = useMemo(() => {
    const procs = [...frame.processes];
    // Also show installed package projections as processes
    for (const pkg of pkgs) {
      if (!procs.some(p => p.pid === pkg.pid)) {
        procs.push({
          pid: pkg.pid ?? 0,
          name: `${pkg.metadata.name} (projection)`,
          state: pkg.status === "ready" ? "running" : "configuring",
          hScore: 0.85,
          zone: "convergent" as const,
          cpuMs: 0,
          childCount: 0,
        });
      }
    }
    return procs;
  }, [frame.processes, pkgs]);

  const filtered = search
    ? allProcesses.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || String(p.pid).includes(search))
    : allProcesses;

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "hsla(30, 8%, 14%, 0.6)", border: `1px solid ${KP.cardBorder}` }}>
        <IconSearch size={14} style={{ color: KP.dim }} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter by name or PID..."
          className="bg-transparent outline-none text-sm flex-1"
          style={{ color: KP.text, fontFamily: KP.font }}
        />
      </div>

      {/* Header */}
      <div className="grid grid-cols-[60px_1fr_80px_80px_70px_60px] gap-2 text-[11px] uppercase tracking-wider pb-1 px-2"
        style={{ color: KP.dim, borderBottom: `1px solid ${KP.cardBorder}` }}>
        <span>PID</span>
        <span>Name</span>
        <span>Zone</span>
        <span className="text-right">H-Score</span>
        <span className="text-right">CPU</span>
        <span className="text-right">State</span>
      </div>

      {/* Rows */}
      <div className="space-y-0.5 max-h-[400px] overflow-y-auto">
        {filtered.map(p => {
          const zoneColor = p.zone === "convergent" ? KP.green : p.zone === "exploring" ? KP.gold : KP.red;
          return (
            <button
              key={p.pid}
              onClick={() => onSelectProcess(p.pid)}
              className="grid grid-cols-[60px_1fr_80px_80px_70px_60px] gap-2 items-center text-sm w-full text-left py-2 px-2 rounded-md hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              <span className="tabular-nums font-mono" style={{ color: KP.muted }}>{p.pid}</span>
              <span className="flex items-center gap-2 truncate" style={{ color: KP.text }}>
                <IconCircleFilled size={8} style={{ color: p.state === "running" ? KP.green : KP.dim }} />
                {p.name}
              </span>
              <span className="capitalize" style={{ color: zoneColor }}>{p.zone}</span>
              <span className="text-right tabular-nums font-mono" style={{ color: p.hScore >= 0.8 ? KP.green : p.hScore >= 0.5 ? KP.gold : KP.red }}>
                {(p.hScore * 100).toFixed(1)}%
              </span>
              <span className="text-right tabular-nums font-mono" style={{ color: KP.muted }}>
                {p.cpuMs.toFixed(1)}ms
              </span>
              <span className="text-right capitalize text-[12px]" style={{ color: p.state === "running" ? KP.green : KP.dim }}>
                {p.state}
              </span>
            </button>
          );
        })}
      </div>

      {/* Summary */}
      <div className="flex gap-6 pt-2 text-sm" style={{ borderTop: `1px solid ${KP.cardBorder}`, color: KP.muted }}>
        <span>Total: <strong style={{ color: KP.text }}>{allProcesses.length}</strong></span>
        <span>Running: <strong style={{ color: KP.green }}>{allProcesses.filter(p => p.state === "running").length}</strong></span>
        <span>Coherence: <strong style={{ color: frame.systemCoherence.zone === "convergent" ? KP.green : KP.gold }}>
          {(frame.systemCoherence.meanH * 100).toFixed(1)}%
        </strong></span>
      </div>
    </div>
  );
}

function EventsPanel() {
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [, forceUpdate] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const listener = () => forceUpdate(n => n + 1);
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
  }, []);

  const events = useMemo(() => {
    let filtered = [..._events];
    if (filter !== "all") filtered = filtered.filter(e => e.type === filter);
    if (search) filtered = filtered.filter(e => e.detail.toLowerCase().includes(search.toLowerCase()) || e.source.toLowerCase().includes(search.toLowerCase()));
    return filtered.reverse();
  }, [_events.length, filter, search]);

  const types = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of _events) counts[e.type] = (counts[e.type] || 0) + 1;
    return counts;
  }, [_events.length]);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg flex-1" style={{ background: "hsla(30, 8%, 14%, 0.6)", border: `1px solid ${KP.cardBorder}` }}>
          <IconSearch size={14} style={{ color: KP.dim }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter events..."
            className="bg-transparent outline-none text-sm flex-1"
            style={{ color: KP.text, fontFamily: KP.font }}
          />
        </div>
        <button
          onClick={() => { _paused = !_paused; forceUpdate(n => n + 1); }}
          className="p-1.5 rounded-md hover:bg-white/[0.06] transition-colors"
          title={_paused ? "Resume recording" : "Pause recording"}
        >
          {_paused
            ? <IconPlayerPlay size={16} style={{ color: KP.green }} />
            : <IconPlayerPause size={16} style={{ color: KP.gold }} />}
        </button>
        <button
          onClick={() => { clearKernelEvents(); forceUpdate(n => n + 1); }}
          className="px-2 py-1 rounded-md text-xs hover:bg-white/[0.06] transition-colors"
          style={{ color: KP.muted }}
        >
          Clear
        </button>
      </div>

      {/* Type filters */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className="px-2.5 py-1 rounded-full text-xs transition-colors"
          style={{
            background: filter === "all" ? "hsla(38, 60%, 55%, 0.15)" : "transparent",
            color: filter === "all" ? KP.gold : KP.dim,
            border: `1px solid ${filter === "all" ? "hsla(38, 60%, 55%, 0.3)" : KP.cardBorder}`,
          }}
        >
          All ({_events.length})
        </button>
        {Object.entries(types).map(([type, count]) => (
          <button
            key={type}
            onClick={() => setFilter(type === filter ? "all" : type)}
            className="px-2.5 py-1 rounded-full text-xs transition-colors"
            style={{
              background: filter === type ? "hsla(38, 60%, 55%, 0.15)" : "transparent",
              color: filter === type ? EVENT_COLORS[type] || KP.muted : KP.dim,
              border: `1px solid ${filter === type ? "hsla(38, 60%, 55%, 0.2)" : KP.cardBorder}`,
            }}
          >
            {type} ({count})
          </button>
        ))}
      </div>

      {/* Event list */}
      <div ref={scrollRef} className="space-y-0.5 max-h-[400px] overflow-y-auto font-mono">
        {events.map(ev => (
          <EventRow key={ev.id} event={ev} />
        ))}
        {events.length === 0 && (
          <div className="text-center py-8" style={{ color: KP.dim }}>
            {_events.length === 0 ? "No events recorded yet. Events will appear as you interact with Hologram." : "No events match your filter."}
          </div>
        )}
      </div>
    </div>
  );
}

function EventRow({ event }: { event: KernelEvent }) {
  const [expanded, setExpanded] = useState(false);
  const color = EVENT_COLORS[event.type] || KP.muted;

  return (
    <div>
      <button
        onClick={() => event.data && setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left py-1.5 px-2 rounded-md hover:bg-white/[0.03] transition-colors text-[13px]"
      >
        <span className="w-[60px] text-right tabular-nums shrink-0" style={{ color: KP.dim, fontSize: 11 }}>
          {formatTime(event.timestamp)}
        </span>
        <span
          className="w-[72px] shrink-0 text-center rounded-full px-2 py-0.5 text-[11px] uppercase tracking-wide"
          style={{ color, background: `${color}15` }}
        >
          {event.type}
        </span>
        <span className="shrink-0 w-[100px] truncate" style={{ color: KP.muted, fontSize: 12 }}>
          {event.source}
        </span>
        <span className="flex-1 truncate" style={{ color: KP.text }}>
          {event.detail}
        </span>
        {event.data && (
          expanded
            ? <IconChevronDown size={12} style={{ color: KP.dim }} />
            : <IconChevronRight size={12} style={{ color: KP.dim }} />
        )}
      </button>
      {expanded && event.data && (
        <div className="ml-[140px] mr-2 mb-1 p-3 rounded-lg text-[12px] relative" style={{ background: "hsla(30, 8%, 10%, 0.8)", border: `1px solid ${KP.cardBorder}` }}>
          <button
            onClick={() => copyToClipboard(JSON.stringify(event.data, null, 2))}
            className="absolute top-2 right-2 p-1 rounded hover:bg-white/[0.06] transition-colors"
            title="Copy data"
          >
            <IconCopy size={12} style={{ color: KP.dim }} />
          </button>
          <pre className="whitespace-pre-wrap" style={{ color: KP.text, fontFamily: "'DM Sans', monospace" }}>
            {JSON.stringify(event.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function InspectPanel({ frame, selectedPid }: { frame: ProjectionFrame; selectedPid: number | null }) {
  const [activePid, setActivePid] = useState<number | null>(selectedPid);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (selectedPid !== null) setActivePid(selectedPid);
  }, [selectedPid]);

  const proc = activePid !== null ? frame.processes.find(p => p.pid === activePid) : null;
  const pkg = activePid !== null ? getInstalledPackages().find(p => p.pid === activePid) : null;

  const source = useMemo(() => {
    if (pkg) return generatePackageSource(pkg);
    if (proc) return generateProcessSource(proc, frame);
    return null;
  }, [proc, pkg, frame]);

  const handleCopy = useCallback(() => {
    if (source) {
      copyToClipboard(source);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [source]);

  if (!activePid) {
    return (
      <div className="space-y-4">
        <div className="text-sm" style={{ color: KP.muted }}>
          Select a process from the Processes tab, or choose below:
        </div>
        <div className="grid grid-cols-2 gap-2">
          {frame.processes.map(p => (
            <button
              key={p.pid}
              onClick={() => setActivePid(p.pid)}
              className="flex items-center gap-3 p-3 rounded-lg text-left hover:bg-white/[0.04] transition-colors"
              style={{ background: "hsla(30, 8%, 14%, 0.4)", border: `1px solid ${KP.cardBorder}` }}
            >
              <IconCircleFilled size={8} style={{ color: p.state === "running" ? KP.green : KP.dim }} />
              <div>
                <div className="text-sm" style={{ color: KP.text }}>{p.name}</div>
                <div className="text-[11px]" style={{ color: KP.dim }}>PID {p.pid} · {p.zone}</div>
              </div>
            </button>
          ))}
          {getInstalledPackages().map(p => (
            <button
              key={`pkg-${p.pid}`}
              onClick={() => setActivePid(p.pid ?? 0)}
              className="flex items-center gap-3 p-3 rounded-lg text-left hover:bg-white/[0.04] transition-colors"
              style={{ background: "hsla(270, 20%, 14%, 0.4)", border: `1px solid ${KP.cardBorder}` }}
            >
              <IconStack2 size={14} style={{ color: KP.purple }} />
              <div>
                <div className="text-sm" style={{ color: KP.text }}>{p.metadata.name}</div>
                <div className="text-[11px]" style={{ color: KP.dim }}>PID {p.pid ?? "–"} · {p.metadata.projectionType}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActivePid(null)}
            className="text-xs px-2 py-1 rounded hover:bg-white/[0.06] transition-colors"
            style={{ color: KP.muted }}
          >
            ← Back
          </button>
          <span className="text-sm font-medium" style={{ color: KP.text }}>
            {proc?.name || pkg?.metadata.name || `PID ${activePid}`}
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full" style={{
            color: proc ? (proc.zone === "convergent" ? KP.green : KP.gold) : KP.purple,
            background: proc ? (proc.zone === "convergent" ? "hsla(152, 44%, 50%, 0.1)" : "hsla(38, 60%, 55%, 0.1)") : "hsla(270, 50%, 60%, 0.1)",
          }}>
            {proc?.zone || pkg?.metadata.projectionType || "unknown"}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs hover:bg-white/[0.06] transition-colors"
          style={{ color: copied ? KP.green : KP.muted, border: `1px solid ${KP.cardBorder}` }}
        >
          <IconCopy size={13} />
          {copied ? "Copied!" : "Copy Source"}
        </button>
      </div>

      {/* Source code */}
      {source && (
        <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${KP.cardBorder}` }}>
          <div className="p-4 overflow-x-auto overflow-y-auto max-h-[450px]" style={{ background: "hsla(30, 8%, 6%, 0.95)" }}>
            <pre className="text-[13px] leading-[1.65]" style={{ color: KP.text, fontFamily: "'DM Sans', 'Fira Code', monospace", tabSize: 4 }}>
              {source.split("\n").map((line, i) => (
                <div key={i} className="flex hover:bg-white/[0.02] transition-colors">
                  <span className="select-none w-[42px] shrink-0 text-right pr-4 tabular-nums" style={{ color: KP.dim, fontSize: 11 }}>
                    {i + 1}
                  </span>
                  <span className="flex-1 whitespace-pre">
                    {colorize(line)}
                  </span>
                </div>
              ))}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

/** Basic syntax highlighting for Python-like code */
function colorize(line: string): JSX.Element {
  // Comments
  if (line.trimStart().startsWith("#")) {
    return <span style={{ color: KP.dim }}>{line}</span>;
  }

  // Keywords
  const parts: JSX.Element[] = [];
  const keywords = /\b(class|def|from|import|return|if|elif|else|self|super|for|in|and|or|not|True|False|None|as|with|try|except|raise|lambda|yield|async|await|property)\b/g;
  const strings = /(".*?"|'.*?'|f".*?")/g;
  const numbers = /\b(\d+\.?\d*)\b/g;
  const decorators = /^(\s*@\w+)/;

  let processed = line;
  const segments: { start: number; end: number; color: string; text: string }[] = [];

  // Decorators
  const decMatch = processed.match(decorators);
  if (decMatch) {
    segments.push({ start: 0, end: decMatch[0].length, color: KP.gold, text: decMatch[0] });
  }

  // Strings
  let m;
  while ((m = strings.exec(line)) !== null) {
    segments.push({ start: m.index, end: m.index + m[0].length, color: KP.green, text: m[0] });
  }

  // Keywords (only if not inside a string)
  while ((m = keywords.exec(line)) !== null) {
    if (!segments.some(s => m!.index >= s.start && m!.index < s.end)) {
      segments.push({ start: m.index, end: m.index + m[0].length, color: "hsl(200, 60%, 60%)", text: m[0] });
    }
  }

  // Numbers
  while ((m = numbers.exec(line)) !== null) {
    if (!segments.some(s => m!.index >= s.start && m!.index < s.end)) {
      segments.push({ start: m.index, end: m.index + m[0].length, color: KP.gold, text: m[0] });
    }
  }

  if (segments.length === 0) return <span>{line}</span>;

  segments.sort((a, b) => a.start - b.start);

  let lastEnd = 0;
  for (const seg of segments) {
    if (seg.start > lastEnd) {
      parts.push(<span key={`t-${lastEnd}`}>{line.slice(lastEnd, seg.start)}</span>);
    }
    parts.push(<span key={`s-${seg.start}`} style={{ color: seg.color }}>{seg.text}</span>);
    lastEnd = seg.end;
  }
  if (lastEnd < line.length) {
    parts.push(<span key={`t-${lastEnd}`}>{line.slice(lastEnd)}</span>);
  }

  return <>{parts}</>;
}

function StatePanel({ frame }: { frame: ProjectionFrame }) {
  const [copied, setCopied] = useState(false);
  const snapshot = useMemo(() => generateStateSnapshot(frame), [frame]);

  const handleCopy = useCallback(() => {
    copyToClipboard(snapshot);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [snapshot]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm" style={{ color: KP.muted }}>
          Complete kernel state snapshot — JSON format
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs hover:bg-white/[0.06] transition-colors"
          style={{ color: copied ? KP.green : KP.muted, border: `1px solid ${KP.cardBorder}` }}
        >
          <IconCopy size={13} />
          {copied ? "Copied!" : "Copy JSON"}
        </button>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${KP.cardBorder}` }}>
        <div className="p-4 overflow-x-auto overflow-y-auto max-h-[450px]" style={{ background: "hsla(30, 8%, 6%, 0.95)" }}>
          <pre className="text-[13px] leading-[1.65]" style={{ color: KP.text, fontFamily: "'DM Sans', 'Fira Code', monospace" }}>
            {snapshot.split("\n").map((line, i) => (
              <div key={i} className="flex hover:bg-white/[0.02] transition-colors">
                <span className="select-none w-[42px] shrink-0 text-right pr-4 tabular-nums" style={{ color: KP.dim, fontSize: 11 }}>
                  {i + 1}
                </span>
                <span className="flex-1 whitespace-pre">{colorizeJson(line)}</span>
              </div>
            ))}
          </pre>
        </div>
      </div>
    </div>
  );
}

function colorizeJson(line: string): JSX.Element {
  // Keys
  const keyMatch = line.match(/^(\s*)"([^"]+)":/);
  if (keyMatch) {
    const indent = keyMatch[1];
    const key = keyMatch[2];
    const rest = line.slice(keyMatch[0].length);
    return (
      <span>
        {indent}<span style={{ color: "hsl(200, 60%, 60%)" }}>"{key}"</span>:{colorizeJsonValue(rest)}
      </span>
    );
  }
  return <span>{colorizeJsonValue(line)}</span>;
}

function colorizeJsonValue(text: string): JSX.Element {
  const trimmed = text.trim();
  if (trimmed.startsWith('"')) return <span style={{ color: KP.green }}>{text}</span>;
  if (/^-?\d/.test(trimmed.replace(/,\s*$/, ""))) return <span style={{ color: KP.gold }}>{text}</span>;
  if (trimmed === "true," || trimmed === "true" || trimmed === "false," || trimmed === "false") return <span style={{ color: KP.purple }}>{text}</span>;
  if (trimmed === "null," || trimmed === "null") return <span style={{ color: KP.dim }}>{text}</span>;
  return <span>{text}</span>;
}

function ExportPanel({ frame }: { frame: ProjectionFrame }) {
  const [exported, setExported] = useState<string | null>(null);

  const handleExportAll = useCallback(() => {
    const data = {
      exportedAt: new Date().toISOString(),
      format: "hologram-inspector-v1",
      state: JSON.parse(generateStateSnapshot(frame)),
      events: _events.map(e => ({ ...e, timestamp: formatTime(e.timestamp) })),
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hologram-debug-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExported("Download started!");
    setTimeout(() => setExported(null), 3000);
  }, [frame]);

  const handleCopyEvents = useCallback(() => {
    const text = _events.map(e => `[${formatTime(e.timestamp)}] [${e.type}] ${e.source}: ${e.detail}`).join("\n");
    copyToClipboard(text);
    setExported("Events copied!");
    setTimeout(() => setExported(null), 2000);
  }, []);

  const handleCopyState = useCallback(() => {
    copyToClipboard(generateStateSnapshot(frame));
    setExported("State copied!");
    setTimeout(() => setExported(null), 2000);
  }, [frame]);

  return (
    <div className="space-y-4">
      <div className="text-sm" style={{ color: KP.muted }}>
        Export kernel state, event traces, and process information for debugging.
      </div>

      <div className="grid grid-cols-1 gap-3">
        {[
          { label: "Download Full Debug Report", desc: "JSON file with state, events, processes, packages", icon: IconDownload, action: handleExportAll },
          { label: "Copy Event Trace", desc: `${_events.length} events as text log`, icon: IconCopy, action: handleCopyEvents },
          { label: "Copy State Snapshot", desc: "Current kernel state as JSON", icon: IconDatabase, action: handleCopyState },
        ].map(({ label, desc, icon: Icon, action }) => (
          <button
            key={label}
            onClick={action}
            className="flex items-center gap-4 p-4 rounded-lg text-left hover:bg-white/[0.04] transition-colors"
            style={{ background: "hsla(30, 8%, 14%, 0.4)", border: `1px solid ${KP.cardBorder}` }}
          >
            <div className="p-2 rounded-lg" style={{ background: "hsla(38, 60%, 55%, 0.08)" }}>
              <Icon size={20} style={{ color: KP.gold }} />
            </div>
            <div>
              <div className="text-sm font-medium" style={{ color: KP.text }}>{label}</div>
              <div className="text-[12px] mt-0.5" style={{ color: KP.dim }}>{desc}</div>
            </div>
          </button>
        ))}
      </div>

      {exported && (
        <div className="text-center py-2 text-sm" style={{ color: KP.green }}>
          ✓ {exported}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────

const TAB_META: { id: InspectorTab; label: string; icon: typeof IconBug }[] = [
  { id: "processes", label: "Processes", icon: IconBinaryTree },
  { id: "events", label: "Events", icon: IconTerminal2 },
  { id: "inspect", label: "Inspect", icon: IconFileCode },
  { id: "state", label: "State", icon: IconDatabase },
  { id: "export", label: "Export", icon: IconDownload },
];

interface KernelInspectorProps {
  visible: boolean;
  onClose: () => void;
}

export default function KernelInspector({ visible, onClose }: KernelInspectorProps) {
  const [tab, setTab] = useState<InspectorTab>("processes");
  const [selectedPid, setSelectedPid] = useState<number | null>(null);
  const [frame, setFrame] = useState<ProjectionFrame | null>(null);

  // Seed boot events on first open
  useEffect(() => {
    if (visible) seedBootEvents();
  }, [visible]);

  // Subscribe to frames when visible
  useEffect(() => {
    if (!visible) return;
    const projector = getKernelProjector();
    // Get initial frame
    if (projector.isRunning()) {
      setFrame(projector.projectFrame());
    }
    const unsub = projector.onFrame(setFrame);
    return unsub;
  }, [visible]);

  // Keyboard shortcut (Ctrl+Shift+I is handled by parent)
  const handleSelectProcess = useCallback((pid: number) => {
    setSelectedPid(pid);
    setTab("inspect");
  }, []);

  if (!visible || !frame) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "hsla(25, 10%, 4%, 0.65)", backdropFilter: "blur(12px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-[800px] rounded-xl overflow-hidden shadow-2xl select-none"
        style={{
          background: "hsla(25, 8%, 8%, 0.97)",
          border: `1px solid ${KP.cardBorder}`,
          fontFamily: KP.font,
          maxHeight: "85vh",
        }}
      >
        {/* Title bar */}
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${KP.cardBorder}` }}>
          <div className="flex items-center gap-2.5">
            <IconBug size={16} style={{ color: KP.gold }} />
            <span className="text-base font-semibold" style={{ color: KP.text, fontFamily: KP.serif }}>
              Kernel Inspector
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ color: KP.green, background: "hsla(152, 44%, 50%, 0.08)" }}>
              {frame.stage}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] tabular-nums" style={{ color: KP.dim }}>
              Tick {frame.tick} · {frame.processes.length} processes · {_events.length} events
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-white/[0.06] transition-colors"
            >
              <IconX size={15} style={{ color: KP.muted }} />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex px-3 pt-1" style={{ borderBottom: `1px solid ${KP.cardBorder}` }}>
          {TAB_META.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-t transition-colors relative"
                style={{
                  color: active ? KP.text : KP.dim,
                  background: active ? "hsla(30, 8%, 14%, 0.8)" : "transparent",
                  borderBottom: active ? `2px solid hsl(38, 60%, 55%)` : "2px solid transparent",
                }}
              >
                <Icon size={14} />
                {label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="p-5 overflow-y-auto" style={{ maxHeight: "calc(85vh - 100px)" }}>
          {tab === "processes" && <ProcessesPanel frame={frame} onSelectProcess={handleSelectProcess} />}
          {tab === "events" && <EventsPanel />}
          {tab === "inspect" && <InspectPanel frame={frame} selectedPid={selectedPid} />}
          {tab === "state" && <StatePanel frame={frame} />}
          {tab === "export" && <ExportPanel frame={frame} />}
        </div>

        {/* Status bar */}
        <div
          className="flex items-center justify-between px-5 py-2 text-[11px]"
          style={{ borderTop: `1px solid ${KP.cardBorder}`, color: KP.dim }}
        >
          <span className="flex items-center gap-1.5">
            <IconCircleFilled size={6} style={{ color: frame.systemCoherence.zone === "convergent" ? KP.green : KP.gold }} />
            System {frame.systemCoherence.zone} · H={( frame.systemCoherence.meanH * 100).toFixed(1)}%
          </span>
          <span className="tabular-nums">
            {getInstalledPackages().length} packages · CID {frame.kernelCid.slice(0, 12)}…
          </span>
          <span>Ctrl+Shift+I to toggle</span>
        </div>
      </div>
    </div>
  );
}
