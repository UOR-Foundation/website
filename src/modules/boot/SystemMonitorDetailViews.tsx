/**
 * SystemMonitorDetailViews — Rich drill-down views for each monitor card.
 *
 * Each view receives the full boot context and renders a deep-dive
 * panel with live data, tables, gauges, and copyable hashes.
 *
 * @module boot/SystemMonitorDetailViews
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { BootReceipt, SealStatus } from "./types";
import { getEngine, getWasmDiagnostics } from "@/modules/engine";
import { TECH_STACK, SELECTION_POLICY } from "./tech-stack";
import { getErrorBudget } from "./seal-error-budget";
import {
  getKernelDeclaration,
  verifyKernel,
  auditNamespaceCoverage,
} from "@/modules/engine/kernel-declaration";
import {
  IconArrowLeft,
  IconCopy,
  IconCheck,
  IconX,
  IconPlayerPlay,
  IconAlertTriangle,
  IconCircleCheck,
  IconLoader2,
} from "@tabler/icons-react";

// ── Types ──────────────────────────────────────────────────────

export type DetailViewId =
  | "vm" | "cpu" | "memory" | "modules"
  | "capabilities" | "availability" | "kernel"
  | "stack" | "hardware";

interface DetailViewProps {
  receipt: BootReceipt;
  status: SealStatus | "booting" | "failed";
  statusColor: string;
  statusLabel: string;
  uptimeMs: number;
  lastVerified: string | null;
  onBack: () => void;
}

// ── Shared sub-components ──────────────────────────────────────

function DetailHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3 pb-4 border-b border-border/50 mb-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 -ml-2 rounded-md hover:bg-muted/30"
      >
        <IconArrowLeft size={14} />
        System Monitor
      </button>
      <span className="text-muted-foreground/30">/</span>
      <span className="text-sm font-semibold text-foreground">{title}</span>
    </div>
  );
}

function CopyableHash({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [value]);
  return (
    <div className="flex items-start justify-between gap-4 group">
      <span className="text-xs text-muted-foreground shrink-0 pt-0.5">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="font-mono text-xs text-foreground/80 truncate">{value}</span>
        <button onClick={copy} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground">
          {copied ? <IconCheck size={12} className="text-green-500" /> : <IconCopy size={12} />}
        </button>
      </div>
    </div>
  );
}

function DetailTable({ rows }: { rows: { label: string; value: React.ReactNode; mono?: boolean }[] }) {
  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      {rows.map((row, i) => (
        <div
          key={row.label}
          className={`flex items-center justify-between px-4 py-2.5 text-sm ${
            i % 2 === 0 ? "bg-card" : "bg-muted/10"
          } ${i < rows.length - 1 ? "border-b border-border/30" : ""}`}
        >
          <span className="text-muted-foreground text-xs">{row.label}</span>
          <span className={`text-foreground/90 text-xs ${row.mono !== false ? "font-mono" : ""}`}>{row.value}</span>
        </div>
      ))}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-5 mb-2 flex items-center gap-2">
      {children}
    </h3>
  );
}

function StatusDot({ ok, size = 8 }: { ok: boolean; size?: number }) {
  return (
    <span
      className="inline-block rounded-full shrink-0"
      style={{
        width: size, height: size,
        backgroundColor: ok ? "#22c55e" : "#ef4444",
        boxShadow: ok ? "0 0 6px rgba(34,197,94,0.4)" : "0 0 6px rgba(239,68,68,0.4)",
      }}
    />
  );
}

function Gauge({ value, max, color, label, unit }: { value: number; max: number; color: string; label: string; unit: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground/80">{value}{unit} / {max}{unit}</span>
      </div>
      <div className="h-2.5 bg-muted/20 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: color, boxShadow: `0 0 10px ${color}30` }}
        />
      </div>
      <div className="text-right text-[10px] font-mono text-muted-foreground/60">{pct.toFixed(1)}%</div>
    </div>
  );
}

function formatUptime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ═══════════════════════════════════════════════════════════════
// 1. VM Detail
// ═══════════════════════════════════════════════════════════════

function VmDetail({ receipt, status, statusColor, statusLabel, uptimeMs, lastVerified, onBack }: DetailViewProps) {
  const errorBudget = getErrorBudget();
  const diag = getWasmDiagnostics();

  return (
    <div className="space-y-1">
      <DetailHeader title="Virtual Machine" onBack={onBack} />

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border/50 bg-card p-4 text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Status</div>
          <div className="text-lg font-bold" style={{ color: statusColor }}>{statusLabel}</div>
        </div>
        <div className="rounded-lg border border-border/50 bg-card p-4 text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Uptime</div>
          <div className="text-lg font-bold font-mono text-foreground/90">{formatUptime(uptimeMs)}</div>
        </div>
        <div className="rounded-lg border border-border/50 bg-card p-4 text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Boot Time</div>
          <div className="text-lg font-bold font-mono text-foreground/90">{receipt.bootTimeMs}ms</div>
        </div>
      </div>

      <SectionTitle>System Seal</SectionTitle>
      <div className="space-y-2">
        <CopyableHash label="Derivation ID" value={receipt.seal.derivationId} />
        <CopyableHash label="Ring Table Hash" value={receipt.seal.ringTableHash} />
        <CopyableHash label="Manifest Hash" value={receipt.seal.manifestHash} />
        <CopyableHash label="WASM Binary Hash" value={receipt.seal.wasmBinaryHash} />
        <CopyableHash label="Session Nonce" value={receipt.seal.sessionNonce} />
        <CopyableHash label="Device Context Hash" value={receipt.seal.deviceContextHash} />
        <CopyableHash label="Kernel Hash" value={receipt.seal.kernelHash} />
      </div>

      <SectionTitle>Visual Fingerprint</SectionTitle>
      <div className="rounded-lg border border-border/50 bg-card p-4 text-center">
        <div className="text-2xl tracking-[0.15em] font-mono">{receipt.seal.glyph}</div>
        <div className="text-[10px] text-muted-foreground mt-1">Braille glyph — unique per session</div>
      </div>

      <SectionTitle>Error Budget</SectionTitle>
      <DetailTable rows={[
        { label: "Total Checks", value: errorBudget.total },
        { label: "Failures", value: errorBudget.failures },
        { label: "Success Rate", value: <span style={{ color: errorBudget.successRate >= 99 ? "#22c55e" : "#f59e0b" }}>{errorBudget.successRate}%</span> },
        { label: "SLO Target", value: "99.9%" },
      ]} />

      <SectionTitle>Engine Configuration</SectionTitle>
      <DetailTable rows={[
        { label: "Engine Type", value: receipt.engineType === "wasm" ? "WebAssembly (native)" : "TypeScript (fallback)" },
        { label: "Engine Version", value: getEngine().version },
        { label: "Modules Loaded", value: receipt.moduleCount },
        { label: "Sealed At", value: receipt.seal.bootedAt },
        { label: "Last Verified", value: lastVerified ?? "pending" },
        ...(diag.loadTimeMs != null ? [{ label: "WASM Load Time", value: `${diag.loadTimeMs}ms` }] : []),
        ...(diag.lastError ? [{ label: "Last WASM Error", value: <span className="text-destructive">{diag.lastError}</span> }] : []),
      ]} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 2. CPU Detail
// ═══════════════════════════════════════════════════════════════

function CpuDetail({ receipt, onBack }: DetailViewProps) {
  const cores = receipt.provenance.hardware.cores;
  const [benchResult, setBenchResult] = useState<{ opsPerSec: number; elapsed: number } | null>(null);
  const [benchRunning, setBenchRunning] = useState(false);

  // Per-core simulated utilization
  const [coreUtils, setCoreUtils] = useState<number[]>(() => Array(cores).fill(0));
  useEffect(() => {
    const id = setInterval(() => {
      setCoreUtils(Array.from({ length: cores }, () => 5 + Math.random() * 20));
    }, 900);
    return () => clearInterval(id);
  }, [cores]);

  const runBenchmark = useCallback(() => {
    setBenchRunning(true);
    setTimeout(() => {
      try {
        const eng = getEngine();
        const ops = 10_000;
        const t0 = performance.now();
        for (let i = 0; i < ops; i++) eng.add(i & 255, (i + 1) & 255);
        const elapsed = performance.now() - t0;
        setBenchResult({ opsPerSec: Math.round(ops / (elapsed / 1000)), elapsed: Math.round(elapsed * 100) / 100 });
      } catch { setBenchResult(null); }
      setBenchRunning(false);
    }, 50);
  }, []);

  return (
    <div className="space-y-1">
      <DetailHeader title="Processors" onBack={onBack} />

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border/50 bg-card p-4 text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Virtual CPUs</div>
          <div className="text-2xl font-bold font-mono text-foreground/90">{cores}</div>
        </div>
        <div className="rounded-lg border border-border/50 bg-card p-4 text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Architecture</div>
          <div className="text-sm font-bold font-mono text-foreground/90">{navigator.platform || "Unknown"}</div>
        </div>
        <div className="rounded-lg border border-border/50 bg-card p-4 text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Thread Pool</div>
          <div className="text-sm font-bold font-mono text-foreground/90">{typeof Worker !== "undefined" ? "Available" : "Unavailable"}</div>
        </div>
      </div>

      <SectionTitle>Per-Core Utilization (Simulated)</SectionTitle>
      <div className="rounded-lg border border-border/50 bg-card p-4 space-y-2">
        {coreUtils.map((util, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-muted-foreground w-12 shrink-0">Core {i}</span>
            <div className="flex-1 h-3 bg-muted/20 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.max(util, 1)}%`,
                  backgroundColor: util < 50 ? "#22c55e" : util < 80 ? "#f59e0b" : "#ef4444",
                }}
              />
            </div>
            <span className="text-[10px] font-mono text-muted-foreground w-10 text-right">{util.toFixed(1)}%</span>
          </div>
        ))}
      </div>

      <SectionTitle>Ring Throughput Benchmark</SectionTitle>
      <div className="rounded-lg border border-border/50 bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground">10,000 ring_add operations via {receipt.engineType === "wasm" ? "WASM" : "TypeScript"} engine</span>
          <button
            onClick={runBenchmark}
            disabled={benchRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            {benchRunning ? <IconLoader2 size={12} className="animate-spin" /> : <IconPlayerPlay size={12} />}
            {benchRunning ? "Running…" : "Run Benchmark"}
          </button>
        </div>
        {benchResult && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md bg-muted/10 p-3 text-center">
              <div className="text-[10px] uppercase text-muted-foreground mb-1">Throughput</div>
              <div className="text-lg font-bold font-mono text-green-500">{benchResult.opsPerSec.toLocaleString()} <span className="text-xs text-muted-foreground">ops/s</span></div>
            </div>
            <div className="rounded-md bg-muted/10 p-3 text-center">
              <div className="text-[10px] uppercase text-muted-foreground mb-1">Elapsed</div>
              <div className="text-lg font-bold font-mono text-foreground/80">{benchResult.elapsed} <span className="text-xs text-muted-foreground">ms</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 3. Memory Detail
// ═══════════════════════════════════════════════════════════════

function MemoryDetail({ receipt, onBack }: DetailViewProps) {
  const [heap, setHeap] = useState<{ used: number; limit: number } | null>(null);
  const [storage, setStorage] = useState<{ used: number; quota: number } | null>(null);
  const [heapHistory, setHeapHistory] = useState<number[]>(() => Array(30).fill(0));
  const heapRef = useRef(0);

  useEffect(() => {
    const tick = async () => {
      const perf = performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } };
      if (perf.memory) {
        const used = Math.round(perf.memory.usedJSHeapSize / 1048576);
        const limit = Math.round(perf.memory.jsHeapSizeLimit / 1048576);
        setHeap({ used, limit });
        heapRef.current = used;
      }
      try {
        if (navigator.storage?.estimate) {
          const est = await navigator.storage.estimate();
          if (est.usage != null && est.quota != null) {
            setStorage({ used: Math.round(est.usage / 1048576), quota: Math.round(est.quota / 1048576) });
          }
        }
      } catch {}
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setHeapHistory(prev => [...prev.slice(1), heapRef.current]);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const hw = receipt.provenance.hardware;

  return (
    <div className="space-y-1">
      <DetailHeader title="Memory" onBack={onBack} />

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border/50 bg-card p-4 text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">System RAM</div>
          <div className="text-2xl font-bold font-mono text-foreground/90">{hw.memoryGb ? `${hw.memoryGb} GB` : "N/A"}</div>
        </div>
        <div className="rounded-lg border border-border/50 bg-card p-4 text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">JS Heap Used</div>
          <div className="text-2xl font-bold font-mono text-foreground/90">{heap ? `${heap.used} MB` : "N/A"}</div>
        </div>
        <div className="rounded-lg border border-border/50 bg-card p-4 text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Heap Limit</div>
          <div className="text-2xl font-bold font-mono text-foreground/90">{heap ? `${heap.limit} MB` : "N/A"}</div>
        </div>
      </div>

      {heap && (
        <>
          <SectionTitle>JS Heap Pressure</SectionTitle>
          <Gauge value={heap.used} max={heap.limit} color={heap.used / heap.limit < 0.6 ? "#22c55e" : heap.used / heap.limit < 0.85 ? "#f59e0b" : "#ef4444"} label="Heap Usage" unit=" MB" />
        </>
      )}

      <SectionTitle>Heap History (Live)</SectionTitle>
      <div className="rounded-lg border border-border/50 bg-card p-4">
        <div className="flex items-end gap-[2px] h-16">
          {heapHistory.map((v, i) => {
            const max = Math.max(1, ...heapHistory);
            const h = max > 0 ? (v / max) * 100 : 0;
            return (
              <div
                key={i}
                className="flex-1 rounded-t-sm transition-all duration-300"
                style={{ height: `${Math.max(h, 1)}%`, backgroundColor: "hsl(210, 70%, 60%)", opacity: 0.4 + (i / heapHistory.length) * 0.6 }}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground/50 mt-1 font-mono">
          <span>-30s</span>
          <span>now</span>
        </div>
      </div>

      {storage && (
        <>
          <SectionTitle>Storage Quota (IndexedDB)</SectionTitle>
          <Gauge value={storage.used} max={storage.quota} color="#8b5cf6" label="Storage Usage" unit=" MB" />
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 4. Modules Detail
// ═══════════════════════════════════════════════════════════════

function ModulesDetail({ receipt, onBack }: DetailViewProps) {
  const [pruningData, setPruningData] = useState<{
    activeModules: number; absorbedModules: number; totalModules: number;
    consolidationDebt: number; score: number; orphanedProjections: number;
    totalProjections: number; totalSynergyChains: number;
    findings: { severity: string; category: string; title: string; detail: string }[];
  } | null>(null);

  useEffect(() => {
    import("@/modules/uns/core/pruning-gate").then(({ pruningGate }) => {
      const r = pruningGate();
      setPruningData({
        activeModules: r.metrics.activeModules,
        absorbedModules: r.metrics.absorbedModules,
        totalModules: r.metrics.totalModules,
        consolidationDebt: r.metrics.consolidationDebt,
        score: r.score,
        orphanedProjections: r.metrics.orphanedProjections,
        totalProjections: r.metrics.totalProjections,
        totalSynergyChains: r.metrics.totalSynergyChains,
        findings: r.findings.map(f => ({ severity: f.severity, category: f.category, title: f.title, detail: f.detail })),
      });
    }).catch(() => {});
  }, []);

  return (
    <div className="space-y-1">
      <DetailHeader title="Modules" onBack={onBack} />

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Active", value: pruningData?.activeModules ?? receipt.moduleCount },
          { label: "Absorbed", value: pruningData?.absorbedModules ?? "—" },
          { label: "Total", value: pruningData?.totalModules ?? "—" },
          { label: "Hygiene", value: pruningData ? `${pruningData.score}/100` : "—", color: pruningData && pruningData.score >= 80 ? "#22c55e" : "#f59e0b" },
        ].map(m => (
          <div key={m.label} className="rounded-lg border border-border/50 bg-card p-3 text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{m.label}</div>
            <div className="text-lg font-bold font-mono" style={{ color: (m as { color?: string }).color ?? undefined }}>{m.value}</div>
          </div>
        ))}
      </div>

      {pruningData && (
        <>
          <SectionTitle>Architecture Metrics</SectionTitle>
          <DetailTable rows={[
            { label: "Projections", value: pruningData.totalProjections },
            { label: "Synergy Chains", value: pruningData.totalSynergyChains },
            { label: "Orphaned Projections", value: pruningData.orphanedProjections },
            { label: "Consolidation Debt", value: pruningData.consolidationDebt },
          ]} />

          {pruningData.findings.length > 0 && (
            <>
              <SectionTitle>Pruning Findings</SectionTitle>
              <div className="space-y-2">
                {pruningData.findings.map((f, i) => (
                  <div key={i} className="rounded-lg border border-border/50 bg-card p-3 flex items-start gap-3">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded shrink-0 ${
                      f.severity === "prune" ? "bg-red-500/10 text-red-400" :
                      f.severity === "simplify" ? "bg-amber-500/10 text-amber-400" :
                      "bg-blue-500/10 text-blue-400"
                    }`}>{f.severity}</span>
                    <div>
                      <div className="text-xs font-medium text-foreground/90">{f.title}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{f.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 5. Capabilities Detail
// ═══════════════════════════════════════════════════════════════

function CapabilitiesDetail({ receipt, onBack }: DetailViewProps) {
  const hw = receipt.provenance.hardware;

  const caps = useMemo(() => [
    { name: "WebAssembly", ok: hw.wasmSupported, method: "typeof WebAssembly !== 'undefined'", fallback: "TypeScript interpreted engine" },
    { name: "WASM SIMD (v128)", ok: hw.simdSupported, method: "WebAssembly.validate(simd_test_bytes)", fallback: "Scalar arithmetic fallback" },
    { name: "SharedArrayBuffer", ok: typeof SharedArrayBuffer !== "undefined", method: "typeof SharedArrayBuffer !== 'undefined'", fallback: "Single-threaded execution" },
    { name: "Web Workers", ok: typeof Worker !== "undefined", method: "typeof Worker !== 'undefined'", fallback: "Main-thread computation only" },
    { name: "Service Worker", ok: "serviceWorker" in navigator, method: "'serviceWorker' in navigator", fallback: "No offline caching" },
    { name: "Cross-Origin Isolation", ok: (window as unknown as { crossOriginIsolated?: boolean }).crossOriginIsolated === true, method: "self.crossOriginIsolated", fallback: "No SharedArrayBuffer" },
    { name: "WebGPU", ok: "gpu" in navigator, method: "'gpu' in navigator", fallback: "CPU-only rendering" },
    { name: "Crypto.subtle", ok: !!crypto?.subtle, method: "crypto.subtle !== undefined", fallback: "Software hash fallback" },
    { name: "IndexedDB", ok: typeof indexedDB !== "undefined", method: "typeof indexedDB !== 'undefined'", fallback: "In-memory storage only" },
    { name: "Performance API", ok: typeof performance !== "undefined" && !!performance.now, method: "performance.now()", fallback: "Date.now() timing" },
    { name: "WebSocket", ok: typeof WebSocket !== "undefined", method: "typeof WebSocket !== 'undefined'", fallback: "HTTP polling" },
    { name: "Clipboard API", ok: !!navigator.clipboard, method: "navigator.clipboard", fallback: "document.execCommand('copy')" },
  ], [hw]);

  const supported = caps.filter(c => c.ok).length;

  return (
    <div className="space-y-1">
      <DetailHeader title="Capabilities" onBack={onBack} />

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border/50 bg-card p-4 text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Supported</div>
          <div className="text-2xl font-bold font-mono text-green-500">{supported}<span className="text-muted-foreground text-sm">/{caps.length}</span></div>
        </div>
        <div className="rounded-lg border border-border/50 bg-card p-4 text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Coverage</div>
          <div className="text-2xl font-bold font-mono text-foreground/90">{Math.round((supported / caps.length) * 100)}%</div>
        </div>
      </div>

      <SectionTitle>Capability Matrix</SectionTitle>
      <div className="rounded-lg border border-border/50 overflow-hidden">
        {caps.map((cap, i) => (
          <div
            key={cap.name}
            className={`flex items-center gap-3 px-4 py-3 ${
              i % 2 === 0 ? "bg-card" : "bg-muted/10"
            } ${i < caps.length - 1 ? "border-b border-border/30" : ""}`}
          >
            <StatusDot ok={cap.ok} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-foreground/90">{cap.name}</div>
              <div className="text-[10px] text-muted-foreground/60 font-mono truncate">{cap.method}</div>
            </div>
            <div className="text-[10px] text-muted-foreground max-w-[180px] text-right">
              {cap.ok ? <span className="text-green-500 font-medium">Active</span> : <span className="text-muted-foreground/60">{cap.fallback}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 6. Availability Detail
// ═══════════════════════════════════════════════════════════════

function AvailabilityDetail({ receipt, status, statusColor, statusLabel, uptimeMs, lastVerified, onBack }: DetailViewProps) {
  const errorBudget = getErrorBudget();
  const availPct = errorBudget.total > 0 ? errorBudget.successRate : 100;
  const sloTarget = 99.9;

  // Track verification timestamps
  const [verifications, setVerifications] = useState<string[]>([]);
  useEffect(() => {
    if (lastVerified) {
      setVerifications(prev => {
        const next = [...prev, lastVerified];
        return next.slice(-15);
      });
    }
  }, [lastVerified]);

  return (
    <div className="space-y-1">
      <DetailHeader title="System Availability" onBack={onBack} />

      <div className="flex items-center justify-center py-4">
        <div className="relative w-32 h-32">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r="50" fill="none" strokeWidth="8" className="stroke-muted/20" />
            <circle
              cx="60" cy="60" r="50" fill="none" strokeWidth="8" stroke={statusColor}
              strokeDasharray={`${2 * Math.PI * 50}`}
              strokeDashoffset={`${2 * Math.PI * 50 * (1 - availPct / 100)}`}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 8px ${statusColor}50)` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold font-mono" style={{ color: statusColor }}>{availPct}%</span>
            <span className="text-[9px] text-muted-foreground uppercase">Availability</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border/50 bg-card p-3 text-center">
          <div className="text-[10px] uppercase text-muted-foreground mb-1">SLO Target</div>
          <div className="text-sm font-bold font-mono text-foreground/90">{sloTarget}%</div>
        </div>
        <div className="rounded-lg border border-border/50 bg-card p-3 text-center">
          <div className="text-[10px] uppercase text-muted-foreground mb-1">Budget Used</div>
          <div className="text-sm font-bold font-mono" style={{ color: errorBudget.failures > 0 ? "#f59e0b" : "#22c55e" }}>
            {errorBudget.failures}/{errorBudget.total}
          </div>
        </div>
        <div className="rounded-lg border border-border/50 bg-card p-3 text-center">
          <div className="text-[10px] uppercase text-muted-foreground mb-1">Status</div>
          <div className="text-sm font-bold" style={{ color: statusColor }}>{statusLabel}</div>
        </div>
      </div>

      <SectionTitle>Timing</SectionTitle>
      <DetailTable rows={[
        { label: "Current Uptime", value: formatUptime(uptimeMs) },
        { label: "Boot Time", value: `${receipt.bootTimeMs}ms` },
        { label: "Sealed At", value: receipt.seal.bootedAt },
        { label: "Last Verified", value: lastVerified ?? "pending" },
      ]} />

      {verifications.length > 0 && (
        <>
          <SectionTitle>Verification Log</SectionTitle>
          <div className="rounded-lg border border-border/50 bg-card p-3 space-y-1 max-h-40 overflow-y-auto">
            {verifications.map((ts, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                <IconCircleCheck size={12} className="text-green-500 shrink-0" />
                <span className="font-mono text-muted-foreground">{ts}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 7. Kernel Detail
// ═══════════════════════════════════════════════════════════════

function KernelDetail({ receipt, onBack }: DetailViewProps) {
  const FANO_SUB = ["₀", "₁", "₂", "₃", "₄", "₅", "₆"];

  const [kernelData, setKernelData] = useState<{
    table: ReturnType<typeof getKernelDeclaration>;
    verification: ReturnType<typeof verifyKernel>;
    coverage: ReturnType<typeof auditNamespaceCoverage>;
  } | null>(null);

  const [testingIdx, setTestingIdx] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<Record<number, boolean>>({});

  useEffect(() => {
    try {
      setKernelData({
        table: getKernelDeclaration(),
        verification: verifyKernel(),
        coverage: auditNamespaceCoverage(),
      });
    } catch {}
  }, []);

  const runTest = useCallback((idx: number) => {
    setTestingIdx(idx);
    setTimeout(() => {
      try {
        const v = verifyKernel();
        const name = getKernelDeclaration()[idx]?.name;
        const ok = v.results.find(r => r.name === name)?.ok ?? false;
        setTestResults(prev => ({ ...prev, [idx]: ok }));
      } catch {}
      setTestingIdx(null);
    }, 300);
  }, []);

  if (!kernelData) return <div className="p-4 text-muted-foreground text-sm">Kernel data unavailable</div>;

  return (
    <div className="space-y-1">
      <DetailHeader title="Kernel Primitives" onBack={onBack} />

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border/50 bg-card p-4 text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Primitives</div>
          <div className="text-2xl font-bold font-mono text-foreground/90">
            {kernelData.verification.results.filter(r => r.ok).length}<span className="text-muted-foreground text-sm">/7</span>
          </div>
        </div>
        <div className="rounded-lg border border-border/50 bg-card p-4 text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Namespace Coverage</div>
          <div className="text-2xl font-bold font-mono text-foreground/90">
            {kernelData.coverage.covered.length}<span className="text-muted-foreground text-sm">/{kernelData.coverage.total}</span>
          </div>
        </div>
      </div>

      <SectionTitle>Fano Plane P₀–P₆</SectionTitle>
      <div className="space-y-2">
        {kernelData.table.map((fn, i) => {
          const ok = kernelData.verification.results.find(r => r.name === fn.name)?.ok ?? false;
          const tested = testResults[i];
          return (
            <div key={fn.name} className="rounded-lg border border-border/50 bg-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <StatusDot ok={tested ?? ok} />
                  <span className="font-mono text-xs text-muted-foreground">P{FANO_SUB[i]}</span>
                  <span className="text-sm font-semibold text-foreground/90">{fn.name}</span>
                </div>
                <button
                  onClick={() => runTest(i)}
                  disabled={testingIdx !== null}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                >
                  {testingIdx === i ? <IconLoader2 size={10} className="animate-spin" /> : <IconPlayerPlay size={10} />}
                  Test
                </button>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                <div><span className="text-muted-foreground">Framework:</span> <span className="font-mono text-foreground/70">{fn.framework}</span></div>
                <div><span className="text-muted-foreground">Ring Basis:</span> <span className="font-mono text-foreground/70">{fn.ringBasis.join(", ")}</span></div>
              </div>
              <div className="text-[10px] text-muted-foreground/60">
                <span className="text-muted-foreground">Namespaces:</span>{" "}
                {fn.governsNamespaces.map((ns, j) => (
                  <span key={j} className="inline-block font-mono bg-muted/20 px-1.5 py-0.5 rounded mr-1 mb-0.5">{ns}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <SectionTitle>Verification Hash</SectionTitle>
      <CopyableHash label="Kernel Hash" value={kernelData.verification.hash} />

      {kernelData.coverage.uncovered.length > 0 && (
        <>
          <SectionTitle>
            <IconAlertTriangle size={12} className="text-amber-500" />
            Uncovered Namespaces
          </SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {kernelData.coverage.uncovered.map(ns => (
              <span key={ns} className="text-[10px] font-mono bg-amber-500/10 text-amber-400 px-2 py-1 rounded">{ns}</span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 8. Stack Health Detail
// ═══════════════════════════════════════════════════════════════

function StackDetail({ receipt, onBack }: DetailViewProps) {
  const comps = receipt.stackHealth?.components ?? [];
  const critical = comps.filter(c => c.criticality === "critical");
  const recommended = comps.filter(c => c.criticality === "recommended");
  const optional = comps.filter(c => c.criticality === "optional");

  const renderGroup = (label: string, items: typeof comps, color: string) => {
    if (items.length === 0) return null;
    const ok = items.filter(c => c.available).length;
    return (
      <>
        <SectionTitle>
          {label} ({ok}/{items.length})
          <span className="text-[10px] font-mono ml-auto font-normal" style={{ color }}>{Math.round((ok / items.length) * 100)}%</span>
        </SectionTitle>
        <div className="rounded-lg border border-border/50 overflow-hidden">
          {items.map((c, i) => (
            <div
              key={c.name}
              className={`flex items-center gap-3 px-4 py-2.5 ${i % 2 === 0 ? "bg-card" : "bg-muted/10"} ${i < items.length - 1 ? "border-b border-border/30" : ""}`}
            >
              <StatusDot ok={c.available} size={7} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-foreground/90">{c.name}</div>
                <div className="text-[10px] text-muted-foreground/60 truncate">{c.role}</div>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">{c.version ?? "—"}</span>
              <span className="text-[10px] text-muted-foreground/50 max-w-[120px] truncate">{c.fallback}</span>
            </div>
          ))}
        </div>
      </>
    );
  };

  return (
    <div className="space-y-1">
      <DetailHeader title="Stack Health" onBack={onBack} />

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border/50 bg-card p-4 text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Total Components</div>
          <div className="text-2xl font-bold font-mono text-foreground/90">{comps.length}</div>
        </div>
        <div className="rounded-lg border border-border/50 bg-card p-4 text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Operational</div>
          <div className="text-2xl font-bold font-mono text-green-500">{comps.filter(c => c.available).length}</div>
        </div>
        <div className="rounded-lg border border-border/50 bg-card p-4 text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Stack Hash</div>
          <div className="text-xs font-mono text-muted-foreground truncate px-2">{receipt.stackHealth?.stackHash?.slice(0, 16)}…</div>
        </div>
      </div>

      {renderGroup("Critical", critical, "#ef4444")}
      {renderGroup("Recommended", recommended, "#f59e0b")}
      {renderGroup("Optional", optional, "#3b82f6")}

      <SectionTitle>Selection Policy (v2.0)</SectionTitle>
      <div className="rounded-lg border border-border/50 overflow-hidden">
        {SELECTION_POLICY.map((p, i) => (
          <div key={p.name} className={`flex items-start gap-3 px-4 py-2.5 ${i % 2 === 0 ? "bg-card" : "bg-muted/10"} ${i < SELECTION_POLICY.length - 1 ? "border-b border-border/30" : ""}`}>
            <span className="text-[10px] font-mono text-muted-foreground/50 w-4 shrink-0 pt-0.5">{i + 1}</span>
            <div>
              <div className="text-xs font-semibold text-foreground/90">{p.name}</div>
              <div className="text-[10px] text-muted-foreground/60">{p.definition}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 9. Hardware Detail
// ═══════════════════════════════════════════════════════════════

function HardwareDetail({ receipt, onBack }: DetailViewProps) {
  const hw = receipt.provenance.hardware;
  const prov = receipt.provenance;

  // Network info
  const netInfo = useMemo(() => {
    const conn = (navigator as unknown as { connection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean } }).connection;
    return conn ? {
      effectiveType: conn.effectiveType ?? "unknown",
      downlink: conn.downlink ?? null,
      rtt: conn.rtt ?? null,
      saveData: conn.saveData ?? false,
    } : null;
  }, []);

  return (
    <div className="space-y-1">
      <DetailHeader title="Host Hardware" onBack={onBack} />

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border/50 bg-card p-4 text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Context</div>
          <div className={`text-sm font-bold ${prov.context === "local" ? "text-green-500" : "text-blue-500"}`}>
            {prov.context === "local" ? "Local" : "Remote"}
          </div>
        </div>
        <div className="rounded-lg border border-border/50 bg-card p-4 text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Platform</div>
          <div className="text-sm font-bold font-mono text-foreground/90">{navigator.platform || "Unknown"}</div>
        </div>
        <div className="rounded-lg border border-border/50 bg-card p-4 text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Language</div>
          <div className="text-sm font-bold font-mono text-foreground/90">{navigator.language}</div>
        </div>
      </div>

      <SectionTitle>Processor</SectionTitle>
      <DetailTable rows={[
        { label: "Logical Cores", value: hw.cores },
        { label: "Hardware Concurrency", value: navigator.hardwareConcurrency },
        { label: "Platform", value: navigator.platform || "N/A" },
      ]} />

      <SectionTitle>Memory</SectionTitle>
      <DetailTable rows={[
        { label: "System RAM", value: hw.memoryGb ? `${hw.memoryGb} GB` : "Restricted by browser" },
      ]} />

      <SectionTitle>Graphics</SectionTitle>
      <DetailTable rows={[
        { label: "GPU Renderer", value: hw.gpu ?? "Unknown" },
        { label: "WebGPU", value: "gpu" in navigator ? "Supported" : "Not supported" },
      ]} />

      <SectionTitle>Display</SectionTitle>
      <DetailTable rows={[
        { label: "Resolution", value: `${hw.screenWidth} × ${hw.screenHeight}` },
        { label: "Pixel Ratio", value: `${window.devicePixelRatio}x` },
        { label: "Color Depth", value: `${screen.colorDepth}-bit` },
        { label: "Touch", value: hw.touchCapable ? "Yes" : "No" },
      ]} />

      {netInfo && (
        <>
          <SectionTitle>Network</SectionTitle>
          <DetailTable rows={[
            { label: "Connection Type", value: netInfo.effectiveType },
            ...(netInfo.downlink != null ? [{ label: "Downlink", value: `${netInfo.downlink} Mbps` }] : []),
            ...(netInfo.rtt != null ? [{ label: "RTT", value: `${netInfo.rtt}ms` }] : []),
            { label: "Data Saver", value: netInfo.saveData ? "Active" : "Off" },
          ]} />
        </>
      )}

      <SectionTitle>Environment</SectionTitle>
      <DetailTable rows={[
        { label: "Hostname", value: prov.hostname },
        { label: "Origin", value: prov.origin },
        { label: "Timezone", value: Intl.DateTimeFormat().resolvedOptions().timeZone },
        { label: "Language", value: navigator.language },
      ]} />

      <SectionTitle>User Agent</SectionTitle>
      <div className="rounded-lg border border-border/50 bg-card p-3">
        <div className="text-[11px] font-mono text-muted-foreground break-all leading-relaxed">{hw.userAgent}</div>
      </div>

      <SectionTitle>Provenance</SectionTitle>
      <CopyableHash label="Provenance Hash" value={prov.provenanceHash} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ██ ROUTER
// ═══════════════════════════════════════════════════════════════

const VIEWS: Record<DetailViewId, (props: DetailViewProps) => JSX.Element> = {
  vm: VmDetail,
  cpu: CpuDetail,
  memory: MemoryDetail,
  modules: ModulesDetail,
  capabilities: CapabilitiesDetail,
  availability: AvailabilityDetail,
  kernel: KernelDetail,
  stack: StackDetail,
  hardware: HardwareDetail,
};

export function DetailViewRouter({
  viewId,
  receipt,
  status,
  statusColor,
  statusLabel,
  uptimeMs,
  lastVerified,
  onBack,
}: {
  viewId: DetailViewId;
} & DetailViewProps) {
  const View = VIEWS[viewId];
  if (!View) return null;
  return (
    <div className="h-full overflow-y-auto p-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <View
        receipt={receipt}
        status={status}
        statusColor={statusColor}
        statusLabel={statusLabel}
        uptimeMs={uptimeMs}
        lastVerified={lastVerified}
        onBack={onBack}
      />
    </div>
  );
}
