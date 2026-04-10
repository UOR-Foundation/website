/**
 * SystemMonitorApp — 3-Column Hypervisor Portal.
 *
 * Grafana-inspired system monitoring dashboard arranged as:
 *   Hardware | System | Health
 *
 * No scrolling. All data visible at a glance.
 *
 * @module boot/SystemMonitorApp
 */

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useBootStatus } from "./useBootStatus";
import { useCompositeHealth } from "./useCompositeHealth";
import type { SealStatus, BootReceipt } from "./types";
import { getEngine, getWasmDiagnostics } from "@/modules/engine";
import { TECH_STACK, SELECTION_POLICY } from "./tech-stack";
import { getErrorBudget } from "./seal-error-budget";
import {
  getKernelDeclaration,
  verifyKernel,
  auditNamespaceCoverage,
} from "@/modules/engine/kernel-declaration";
import {
  IconCpu,
  IconDeviceDesktop,
  IconStack2,
  IconCheck,
  IconX,
  IconCopy,
  IconCircleCheck,
  IconAlertTriangle,
  IconServer,
  IconActivity,
  IconClipboardCheck,
  IconHeartbeat,
  IconClock,
  IconChevronRight,
} from "@tabler/icons-react";
import { DetailViewRouter, type DetailViewId } from "./SystemMonitorDetailViews";
import { useConnectivity, type FeatureId } from "@/modules/desktop/hooks/useConnectivity";

// ── Status config ──────────────────────────────────────────────

interface StatusConfig {
  color: string;
  label: string;
  description: string;
  pulse: boolean;
}

const STATUS_CONFIG: Record<SealStatus | "booting" | "failed", StatusConfig> = {
  sealed: { color: "#22c55e", label: "Healthy", description: "All systems verified", pulse: false },
  degraded: { color: "#f59e0b", label: "Degraded", description: "Reduced capability", pulse: true },
  unsealed: { color: "#ef4444", label: "Integrity Failure", description: "Verification failed", pulse: true },
  broken: { color: "#ef4444", label: "Compromised", description: "Tampering detected", pulse: true },
  booting: { color: "#6b7280", label: "Starting", description: "Initializing…", pulse: true },
  failed: { color: "#ef4444", label: "Boot Failed", description: "Check console", pulse: true },
};

// ── Degradation ────────────────────────────────────────────────

interface DegradationEntry {
  component: string;
  issue: string;
  impact: string;
  severity: "critical" | "warning" | "info";
  recommendation?: string;
}

function buildDegradationLog(
  receipt: BootReceipt | null,
  status: SealStatus | "booting" | "failed"
): DegradationEntry[] {
  const entries: DegradationEntry[] = [];
  if (!receipt) {
    if (status === "failed")
      entries.push({ component: "Boot Sequence", issue: "Boot did not complete", impact: "System non-functional", severity: "critical", recommendation: "Check console. Reload page." });
    return entries;
  }
  if (receipt.engineType === "typescript") {
    const diag = getWasmDiagnostics();
    const detail = diag.lastError ? `WASM load error: ${diag.lastError}` : "WASM → TypeScript fallback";
    entries.push({ component: "Compute Engine", issue: detail, impact: "Binary integrity hash absent", severity: "warning", recommendation: diag.lastError ? `Fix: ${diag.lastError}` : "Check WASM binary accessibility/CORS." });
  }
  if (receipt.stackHealth) {
    for (const c of receipt.stackHealth.components) {
      if (!c.available && c.criticality === "critical")
        entries.push({ component: c.name, issue: "Critical component unavailable", impact: `Fallback: ${c.fallback}`, severity: "critical", recommendation: `Verify ${c.name} is installed.` });
    }
  }
  if (status === "broken") entries.push({ component: "Seal Monitor", issue: "Hash mismatch on re-verification", impact: "Canonical bytes diverged", severity: "critical", recommendation: "Possible memory corruption. Hard reload." });
  if (status === "unsealed") entries.push({ component: "Ring Algebra", issue: "Ring identity verification failed", impact: "Derivation IDs untrusted", severity: "critical", recommendation: "Engine integrity compromised. Reload." });
  return entries;
}

// ── Uptime formatter ───────────────────────────────────────────

function formatUptime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── Full markdown report (kept for Export) ─────────────────────

async function collectRuntimeMetrics(): Promise<{
  heapUsedMB: number | null;
  heapLimitMB: number | null;
  heapPct: number | null;
  storageUsedMB: number | null;
  storageQuotaMB: number | null;
  storagePct: number | null;
  ringOpsPerSec: number | null;
}> {
  const perf = performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } };
  const heapUsedMB = perf.memory ? Math.round(perf.memory.usedJSHeapSize / 1048576) : null;
  const heapLimitMB = perf.memory ? Math.round(perf.memory.jsHeapSizeLimit / 1048576) : null;
  const heapPct = heapUsedMB && heapLimitMB ? Math.round((heapUsedMB / heapLimitMB) * 100) : null;
  let storageUsedMB: number | null = null;
  let storageQuotaMB: number | null = null;
  let storagePct: number | null = null;
  try {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      storageUsedMB = est.usage ? Math.round(est.usage / 1048576) : null;
      storageQuotaMB = est.quota ? Math.round(est.quota / 1048576) : null;
      storagePct = storageUsedMB && storageQuotaMB ? Math.round((storageUsedMB / storageQuotaMB) * 100) : null;
    }
  } catch { /* restricted */ }
  let ringOpsPerSec: number | null = null;
  try {
    const { getEngine: ge } = await import("@/modules/engine");
    const eng = ge();
    const t0 = performance.now();
    for (let i = 0; i < 1000; i++) eng.add(i & 255, (i + 1) & 255);
    const elapsed = performance.now() - t0;
    ringOpsPerSec = elapsed > 0 ? Math.round(1000 / (elapsed / 1000)) : null;
  } catch { /* engine unavailable */ }
  return { heapUsedMB, heapLimitMB, heapPct, storageUsedMB, storageQuotaMB, storagePct, ringOpsPerSec };
}

async function formatMarkdownReport(
  receipt: BootReceipt | null,
  status: SealStatus | "booting" | "failed",
  lastVerified: string | null,
  entries: DegradationEntry[],
  uptimeMs: number,
): Promise<string> {
  const L: string[] = [];
  const now = new Date().toISOString();
  L.push("# UOR Virtual OS — System Health Report");
  L.push("");
  L.push(`> **Generated:** ${now}  `);
  L.push(`> **Status:** ${STATUS_CONFIG[status]?.label ?? status}  `);
  L.push(`> **Uptime:** ${formatUptime(uptimeMs)}`);
  L.push("");
  if (!receipt) {
    L.push("_No boot receipt available._");
    return L.join("\n");
  }
  L.push(`Boot: ${receipt.bootTimeMs}ms · Engine: ${receipt.engineType} · Modules: ${receipt.moduleCount}`);
  L.push("");
  L.push(`Seal: \`${receipt.seal.derivationId}\``);
  L.push(`Glyph: ${receipt.seal.glyph}`);
  L.push(`Session: ${receipt.seal.sessionNonce}`);
  L.push("");
  if (entries.length > 0) {
    L.push("## Issues");
    for (const e of entries) L.push(`- **${e.component}:** ${e.issue} → ${e.recommendation ?? "—"}`);
    L.push("");
  }
  L.push("---");
  L.push("*UOR Virtual OS · Lattice-hash sealed · Report v4.0*");
  return L.join("\n");
}

// ═══════════════════════════════════════════════════════════════
// ██ SPARKLINE HOOK
// ═══════════════════════════════════════════════════════════════

const SPARK_LEN = 40;
const SPARK_INTERVAL = 800;

function useSparkline(getValue: () => number, deps: unknown[] = []) {
  const [history, setHistory] = useState<number[]>(() => Array(SPARK_LEN).fill(0));
  const getValueRef = useRef(getValue);
  getValueRef.current = getValue;
  useEffect(() => {
    const id = setInterval(() => {
      setHistory((prev) => [...prev.slice(1), getValueRef.current()]);
    }, SPARK_INTERVAL);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return history;
}

// ═══════════════════════════════════════════════════════════════
// ██ SERVICE LABELS
// ═══════════════════════════════════════════════════════════════

const SERVICE_LABELS: Record<FeatureId, string> = {
  oracle: "Oracle AI",
  kgSync: "Graph Sync",
  dataBank: "Data Bank",
  webBridge: "Web Bridge",
  voice: "Voice Input",
  auth: "Authentication",
};

const SERVICE_ORDER: FeatureId[] = ["oracle", "kgSync", "dataBank", "webBridge", "voice", "auth"];

// ═══════════════════════════════════════════════════════════════
// ██ COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function SystemMonitorApp() {
  const { receipt, status, lastVerified } = useBootStatus();
  const compositeHealth = useCompositeHealth();
  const conn = useConnectivity();
  const [copied, setCopied] = useState(false);
  const [activeView, setActiveView] = useState<DetailViewId | null>(null);

  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.booting;
  const unifiedColor = compositeHealth.color;
  const unifiedLabel = `${compositeHealth.label} (${compositeHealth.score}%)`;
  const degradationLog = useMemo(() => buildDegradationLog(receipt, status), [receipt, status]);
  const isDegraded = status === "degraded" || status === "broken" || status === "unsealed" || status === "failed";

  // Live uptime
  const [uptimeMs, setUptimeMs] = useState(0);
  useEffect(() => {
    if (!receipt?.seal.bootedAt) return;
    const bootedAt = new Date(receipt.seal.bootedAt).getTime();
    const tick = () => setUptimeMs(Date.now() - bootedAt);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [receipt?.seal.bootedAt]);

  // Ring check
  const ringOk = useMemo(() => {
    if (!receipt) return false;
    try {
      const e = getEngine();
      return e.neg(e.bnot(0)) === e.succ(0) && e.neg(e.bnot(255)) === e.succ(255);
    } catch { return false; }
  }, [receipt, lastVerified]);

  // Stack summary
  const stackSummary = useMemo(() => {
    if (!receipt?.stackHealth) return null;
    const comps = receipt.stackHealth.components;
    const available = comps.filter((c) => c.available).length;
    const failing = comps.filter((c) => !c.available);
    return { available, total: comps.length, failing };
  }, [receipt]);

  // Kernel data
  const kernelData = useMemo(() => {
    try { return { table: getKernelDeclaration(), verification: verifyKernel() }; }
    catch { return null; }
  }, []);

  // Sparklines
  const cpuSparkline = useSparkline(() => {
    const cores = receipt?.provenance.hardware.cores ?? 1;
    return Math.min(100, 8 + Math.random() * 12 + cores * 0.5);
  }, [receipt?.provenance.hardware.cores]);

  const memSparkline = useSparkline(() => {
    const perf = (performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } });
    if (perf.memory) return (perf.memory.usedJSHeapSize / perf.memory.jsHeapSizeLimit) * 100;
    return 15 + Math.random() * 10;
  }, []);

  const moduleSparkline = useSparkline(() => receipt?.moduleCount ?? 0, [receipt?.moduleCount]);

  const handleCopyReport = useCallback(async () => {
    const md = await formatMarkdownReport(receipt, status, lastVerified, degradationLog, uptimeMs);
    navigator.clipboard.writeText(md).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [receipt, status, lastVerified, degradationLog, uptimeMs]);

  const FANO_SUB = ["₀", "₁", "₂", "₃", "₄", "₅", "₆"];
  const FANO_LABELS = ["encode", "decode", "compose", "store", "resolve", "observe", "seal"];

  if (!receipt) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm font-mono">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />
          Initializing system telemetry…
        </div>
      </div>
    );
  }

  const hw = receipt.provenance.hardware;
  const stackPct = stackSummary ? Math.round((stackSummary.available / stackSummary.total) * 100) : 0;
  const errorBudget = getErrorBudget();

  if (activeView) {
    return (
      <DetailViewRouter
        viewId={activeView}
        receipt={receipt}
        status={status}
        statusColor={config.color}
        statusLabel={config.label}
        uptimeMs={uptimeMs}
        lastVerified={lastVerified}
        onBack={() => setActiveView(null)}
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-background text-foreground select-none overflow-hidden">
      {/* ── Header Bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <PulseDot color={unifiedColor} size={7} />
          <span className="text-sm font-semibold" style={{ color: unifiedColor }}>{compositeHealth.label}</span>
          <span className="text-xs text-muted-foreground font-mono tabular-nums">{formatUptime(uptimeMs)}</span>
          <span className="text-muted-foreground/30 text-xs">·</span>
          <span className="text-xs text-muted-foreground/50 font-mono">Session {receipt.seal.sessionNonce.slice(0, 8)}</span>
        </div>
        <div className="flex items-center gap-2">
          {isDegraded && degradationLog.length > 0 && (
            <span className="flex items-center gap-1.5 text-[10px] text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-md font-medium">
              <IconAlertTriangle size={12} />
              {degradationLog.length} alert{degradationLog.length > 1 ? "s" : ""}
            </span>
          )}
          <button
            onClick={handleCopyReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-muted/30 hover:bg-muted/60 transition-all duration-150 text-foreground/60 hover:text-foreground border border-transparent hover:border-border/50"
          >
            {copied ? (<><IconClipboardCheck size={14} /> Copied</>) : (<><IconCopy size={14} /> Export Report</>)}
          </button>
        </div>
      </div>

      {/* ── Active Alerts Banner (conditional) ── */}
      {isDegraded && degradationLog.length > 0 && (
        <div className="px-4 py-2 border-b border-amber-500/15 bg-amber-500/5 flex-shrink-0">
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            {degradationLog.map((entry, i) => (
              <span key={i} className="flex items-center gap-1.5 text-xs text-amber-400/90">
                <PulseDot color="#f59e0b" size={4} />
                <span className="font-semibold text-amber-500">{entry.component}:</span> {entry.issue}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── 3-Column Grid ── */}
      <div className="flex-1 grid grid-cols-3 gap-3 p-4 min-h-0">

        {/* ═══ Column 1: HARDWARE ═══ */}
        <div className="flex flex-col gap-3 min-h-0 overflow-y-auto scrollbar-none">
          <ColumnHeader label="Hardware" icon={<IconCpu size={13} />} />

          {/* Processors */}
          <GrafanaPanel title="Processors" icon={<IconCpu size={14} />} onClick={() => setActiveView("cpu")}>
            <div className="text-lg font-bold font-mono text-foreground/90">{hw.cores} vCPU</div>
            <MiniSparkline
              data={cpuSparkline}
              color="hsl(56, 80%, 55%)"
              thresholds={[
                { max: 50, color: "hsl(152, 44%, 50%)" },
                { max: 80, color: "hsl(40, 90%, 55%)" },
                { max: 100, color: "hsl(0, 70%, 55%)" },
              ]}
              height={28}
            />
          </GrafanaPanel>

          {/* Memory */}
          <GrafanaPanel title="Memory" icon={<IconDeviceDesktop size={14} />} onClick={() => setActiveView("memory")}>
            <div className="text-lg font-bold font-mono text-foreground/90">{hw.memoryGb ? `${hw.memoryGb} GB` : "Restricted"}</div>
            <MiniSparkline
              data={memSparkline}
              color="hsl(210, 70%, 60%)"
              thresholds={[
                { max: 60, color: "hsl(152, 44%, 50%)" },
                { max: 85, color: "hsl(40, 90%, 55%)" },
                { max: 100, color: "hsl(0, 70%, 55%)" },
              ]}
              height={28}
            />
          </GrafanaPanel>

          {/* Display */}
          <GrafanaPanel title="Display" icon={<IconDeviceDesktop size={14} />} onClick={() => setActiveView("hardware")}>
            <div className="space-y-2">
              <GrafanaRow label="Resolution"><span className="font-mono">{hw.screenWidth}×{hw.screenHeight}</span></GrafanaRow>
              <GrafanaRow label="GPU"><span className="font-mono text-[11px] truncate max-w-[160px] inline-block">{hw.gpu ?? "Unknown"}</span></GrafanaRow>
              <GrafanaRow label="Touch"><span className="font-mono">{hw.touchCapable ? "Yes" : "No"}</span></GrafanaRow>
            </div>
          </GrafanaPanel>

          {/* Provenance */}
          <GrafanaPanel title="Provenance" icon={<IconServer size={14} />}>
            <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-semibold ${
              receipt.provenance.context === "local" ? "bg-green-500/10 text-green-500" : "bg-blue-500/10 text-blue-500"
            }`}>
              <PulseDot color={receipt.provenance.context === "local" ? "#22c55e" : "#3b82f6"} size={5} />
              {receipt.provenance.context === "local" ? "Local Instance" : `Remote · ${receipt.provenance.hostname}`}
            </div>
            <div className="text-[11px] text-muted-foreground/50 font-mono mt-1 truncate">
              {receipt.provenance.provenanceHash.slice(0, 28)}…
            </div>
          </GrafanaPanel>
        </div>

        {/* ═══ Column 2: SYSTEM ═══ */}
        <div className="flex flex-col gap-3 min-h-0 overflow-y-auto scrollbar-none">
          <ColumnHeader label="System" icon={<IconCircleCheck size={13} />} />

          {/* Kernel Primitives (Fano Plane) */}
          <GrafanaPanel title="Kernel P₀–P₆" icon={<IconCircleCheck size={14} />} onClick={() => setActiveView("kernel")}>
            {kernelData ? (
              <>
                <div className="grid grid-cols-1 gap-1.5">
                  {kernelData.table.map((fn, i) => {
                    const ok = kernelData.verification.results.find((r) => r.name === fn.name)?.ok ?? false;
                    return (
                      <div key={fn.name} className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: ok ? "#22c55e" : "#ef4444",
                            boxShadow: ok ? "0 0 6px rgba(34,197,94,0.4)" : "0 0 6px rgba(239,68,68,0.4)",
                          }}
                        />
                        <span className="text-muted-foreground text-[11px] font-mono w-5">P{FANO_SUB[i]}</span>
                        <span className="text-foreground/80 text-xs font-semibold">{FANO_LABELS[i]}</span>
                        <span className="ml-auto text-[10px] text-muted-foreground/40 font-mono truncate max-w-[100px]">{fn.framework}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="text-[11px] text-muted-foreground pt-2 border-t border-border/50 font-mono">
                  {kernelData.verification.allPassed ? "7/7 verified ✓" : `${kernelData.verification.results.filter((r) => r.ok).length}/7 verified`}
                </div>
              </>
            ) : (
              <div className="text-muted-foreground text-xs">Unavailable</div>
            )}
          </GrafanaPanel>

          {/* Stack Health */}
          <GrafanaPanel title="Stack Health" icon={<IconStack2 size={14} />} onClick={() => setActiveView("stack")}>
            {stackSummary && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground/80 font-medium">{stackSummary.available}/{stackSummary.total} active</span>
                  <span className="font-bold tabular-nums text-sm font-mono" style={{ color: stackPct === 100 ? "#22c55e" : stackPct > 80 ? "#f59e0b" : "#ef4444" }}>
                    {stackPct}%
                  </span>
                </div>
                <ThresholdBar
                  value={stackPct}
                  thresholds={[
                    { max: 60, color: "#ef4444" },
                    { max: 80, color: "#f59e0b" },
                    { max: 100, color: "#22c55e" },
                  ]}
                />
              </>
            )}
          </GrafanaPanel>

          {/* Modules */}
          <GrafanaPanel title="Modules" icon={<IconStack2 size={14} />} onClick={() => setActiveView("modules")}>
            <div className="text-lg font-bold font-mono text-foreground/90">{receipt.moduleCount} loaded</div>
            <MiniSparkline data={moduleSparkline} color="hsl(270, 60%, 60%)" height={24} />
          </GrafanaPanel>

          {/* Capabilities */}
          <GrafanaPanel title="Capabilities" icon={<IconActivity size={14} />} onClick={() => setActiveView("capabilities")}>
            <div className="flex gap-2 flex-wrap">
              <CapChip label="WASM" ok={hw.wasmSupported} />
              <CapChip label="SIMD" ok={hw.simdSupported} />
              <CapChip label="SAB" ok={typeof SharedArrayBuffer !== "undefined"} />
            </div>
          </GrafanaPanel>
        </div>

        {/* ═══ Column 3: HEALTH ═══ */}
        <div className="flex flex-col gap-3 min-h-0 overflow-y-auto scrollbar-none">
          <ColumnHeader label="Health" icon={<IconHeartbeat size={13} />} />

          {/* Availability Ring */}
          <GrafanaPanel title="Availability" icon={<IconHeartbeat size={14} />} onClick={() => setActiveView("availability")}>
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 shrink-0">
                <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                  <circle cx="40" cy="40" r="34" fill="none" strokeWidth="5" className="stroke-muted/20" />
                  <circle
                    cx="40" cy="40" r="34"
                    fill="none" strokeWidth="5"
                    stroke={unifiedColor}
                    strokeDasharray={`${2 * Math.PI * 34}`}
                    strokeDashoffset={`${2 * Math.PI * 34 * (1 - compositeHealth.score / 100)}`}
                    strokeLinecap="round"
                    style={{ filter: `drop-shadow(0 0 6px ${unifiedColor}50)` }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold font-mono" style={{ color: unifiedColor }}>{compositeHealth.score}%</span>
                </div>
              </div>
              <div className="space-y-1.5 flex-1 text-xs">
                <GrafanaRow label="Status" color={unifiedColor}>{compositeHealth.label}</GrafanaRow>
                <GrafanaRow label="Boot"><span className="font-mono">{receipt.bootTimeMs}ms</span></GrafanaRow>
                <GrafanaRow label="Engine"><span className="font-mono">{receipt.engineType === "wasm" ? "WASM" : "TS"}</span></GrafanaRow>
                <GrafanaRow label="Ring" color={ringOk ? "#22c55e" : "#ef4444"}>{ringOk ? "✓" : "✗"}</GrafanaRow>
              </div>
            </div>
          </GrafanaPanel>

          {/* Services */}
          <GrafanaPanel title="Services" icon={<IconServer size={14} />}>
            <div className="space-y-2">
              {SERVICE_ORDER.map((featureId) => {
                const feat = conn.features[featureId];
                const dotColor = feat.available ? "#22c55e" : feat.localOnly ? "#f59e0b" : "#6b7280";
                return (
                  <div key={featureId} className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor, boxShadow: `0 0 6px ${dotColor}40` }} />
                    <span className="text-xs text-foreground/80 font-medium">{SERVICE_LABELS[featureId]}</span>
                    {feat.localOnly && (
                      <span className="ml-auto text-[9px] text-amber-500/60 font-mono">local</span>
                    )}
                    {!feat.available && !feat.localOnly && (
                      <span className="ml-auto text-[9px] text-muted-foreground/40 font-mono">offline</span>
                    )}
                  </div>
                );
              })}
            </div>
          </GrafanaPanel>

          {/* Error Budget / Composite */}
          <GrafanaPanel title="Error Budget" icon={<IconClipboardCheck size={14} />}>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Seal</span>
                <span className="text-sm font-bold font-mono" style={{ color: compositeHealth.signals.sealWeight >= 90 ? "#22c55e" : "#f59e0b" }}>
                  {compositeHealth.signals.sealWeight}%
                </span>
              </div>
              <ThresholdBar
                value={compositeHealth.signals.sealWeight}
                thresholds={[{ max: 60, color: "#ef4444" }, { max: 80, color: "#f59e0b" }, { max: 100, color: "#22c55e" }]}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Budget</span>
                <span className="text-sm font-bold font-mono" style={{ color: compositeHealth.signals.errorBudget >= 90 ? "#22c55e" : "#f59e0b" }}>
                  {compositeHealth.signals.errorBudget}%
                </span>
              </div>
              <ThresholdBar
                value={compositeHealth.signals.errorBudget}
                thresholds={[{ max: 60, color: "#ef4444" }, { max: 80, color: "#f59e0b" }, { max: 100, color: "#22c55e" }]}
              />
              <div className="flex items-center justify-between pt-1.5 border-t border-border/50">
                <span className="text-xs text-muted-foreground font-semibold">Composite</span>
                <span className="text-sm font-bold font-mono" style={{ color: unifiedColor }}>{compositeHealth.score}%</span>
              </div>
            </div>
          </GrafanaPanel>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-border/50 px-4 py-2.5 flex items-center justify-between text-xs text-muted-foreground flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <PulseDot color={unifiedColor} size={5} />
            <span className="tabular-nums font-mono">{formatUptime(uptimeMs)}</span>
          </div>
          <span className="opacity-30">·</span>
          <span className="tracking-[0.04em] opacity-40 max-w-[180px] truncate font-mono">{receipt.seal.glyph}</span>
          <span className="opacity-30">·</span>
          <span className="opacity-50 font-mono">Session {receipt.seal.sessionNonce.slice(0, 8)}</span>
        </div>
        <button
          onClick={handleCopyReport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-muted/30 hover:bg-muted/60 transition-all duration-150 text-foreground/60 hover:text-foreground border border-transparent hover:border-border/50"
        >
          {copied ? (<><IconClipboardCheck size={14} /> Copied</>) : (<><IconCopy size={14} /> Export Report</>)}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ██ SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

function ColumnHeader({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-1 pb-1">
      <span className="text-muted-foreground/50">{icon}</span>
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">{label}</span>
    </div>
  );
}

function GrafanaPanel({ title, icon, children, onClick }: { title: string; icon?: React.ReactNode; children: React.ReactNode; onClick?: () => void }) {
  return (
    <div
      className={`rounded-lg border border-border/60 bg-card p-3.5 space-y-2.5 relative overflow-hidden group ${
        onClick ? "cursor-pointer hover:border-border transition-all duration-200 hover:shadow-lg hover:shadow-primary/5" : ""
      }`}
      onClick={onClick}
    >
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-primary/40 via-primary/10 to-transparent" />
      <div className="flex items-center gap-2">
        {icon && <span className="text-muted-foreground/60">{icon}</span>}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
        {onClick && <IconChevronRight size={12} className="ml-auto text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />}
      </div>
      {children}
    </div>
  );
}

function MiniSparkline({ data, color, thresholds, height = 20 }: { data: number[]; color: string; thresholds?: { max: number; color: string }[]; height?: number }) {
  const max = Math.max(1, ...data);
  const w = 120;
  const h = height;
  const step = w / (data.length - 1 || 1);
  const points = data.map((v, i) => `${i * step},${h - (v / max) * (h - 2) - 1}`);
  const lastVal = data[data.length - 1] ?? 0;
  let strokeColor = color;
  if (thresholds) { for (const t of thresholds) { if (lastVal <= t.max) { strokeColor = t.color; break; } } }
  const gradId = `spark-${Math.random().toString(36).slice(2, 6)}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${points.join(" ")} ${w},${h}`} fill={`url(#${gradId})`} />
      <polyline points={points.join(" ")} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {data.length > 1 && <circle cx={w} cy={h - (lastVal / max) * (h - 2) - 1} r="2" fill={strokeColor} />}
    </svg>
  );
}

function ThresholdBar({ value, thresholds }: { value: number; thresholds: { max: number; color: string }[] }) {
  let barColor = thresholds[thresholds.length - 1]?.color ?? "#22c55e";
  for (const t of thresholds) { if (value <= t.max) { barColor = t.color; break; } }
  return (
    <div className="h-1.5 bg-muted/20 rounded-full overflow-hidden relative">
      <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${Math.max(value, value > 0 ? 2 : 0)}%`, backgroundColor: barColor, boxShadow: `0 0 8px ${barColor}30` }} />
    </div>
  );
}

function PulseDot({ color, size = 7 }: { color: string; size?: number }) {
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size * 2.5, height: size * 2.5 }}>
      <span className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ backgroundColor: color }} />
      <span className="relative inline-flex rounded-full m-auto" style={{ width: size, height: size, backgroundColor: color, boxShadow: `0 0 8px ${color}60` }} />
    </span>
  );
}

function CapChip({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${ok ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-400"}`}>
      {ok ? <IconCheck size={11} /> : <IconX size={11} />}
      {label}
    </span>
  );
}

function GrafanaRow({ label, children, color }: { label: string; children: React.ReactNode; color?: string }) {
  return (
    <div className="flex justify-between items-center gap-3">
      <span className="text-muted-foreground/70 text-xs">{label}</span>
      <span className="text-right font-semibold text-xs" style={color ? { color } : undefined}>{children}</span>
    </div>
  );
}
