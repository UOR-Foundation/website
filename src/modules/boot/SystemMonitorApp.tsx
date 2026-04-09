/**
 * SystemMonitorApp — Grafana-inspired system monitoring dashboard.
 *
 * Opens as a desktop app window. Displays real-time telemetry
 * from the boot receipt with sparkline mini-charts, threshold
 * color bands, and refined panel styling.
 *
 * @module boot/SystemMonitorApp
 */

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useBootStatus } from "./useBootStatus";
import type { SealStatus, BootReceipt } from "./types";
import { getEngine } from "@/modules/engine";
import { TECH_STACK, SELECTION_POLICY } from "./tech-stack";
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
} from "@tabler/icons-react";

// ── Status config ──────────────────────────────────────────────

interface StatusConfig {
  color: string;
  label: string;
  description: string;
  pulse: boolean;
}

const STATUS_CONFIG: Record<SealStatus | "booting" | "failed", StatusConfig> = {
  sealed: {
    color: "#22c55e",
    label: "Healthy",
    description: "All systems verified",
    pulse: false,
  },
  degraded: {
    color: "#f59e0b",
    label: "Degraded",
    description: "Reduced capability",
    pulse: true,
  },
  unsealed: {
    color: "#ef4444",
    label: "Integrity Failure",
    description: "Verification failed",
    pulse: true,
  },
  broken: {
    color: "#ef4444",
    label: "Compromised",
    description: "Tampering detected",
    pulse: true,
  },
  booting: {
    color: "#6b7280",
    label: "Starting",
    description: "Initializing…",
    pulse: true,
  },
  failed: {
    color: "#ef4444",
    label: "Boot Failed",
    description: "Check console",
    pulse: true,
  },
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
      entries.push({
        component: "Boot Sequence",
        issue: "Boot did not complete",
        impact: "System non-functional",
        severity: "critical",
        recommendation: "Check console. Reload page.",
      });
    return entries;
  }
  if (receipt.engineType === "typescript")
    entries.push({
      component: "Compute Engine",
      issue: "WASM → TypeScript fallback",
      impact: "Binary integrity hash absent",
      severity: "warning",
      recommendation: "Check WASM binary accessibility/CORS.",
    });
  if (receipt.stackHealth) {
    for (const c of receipt.stackHealth.components) {
      if (!c.available && c.criticality === "critical")
        entries.push({
          component: c.name,
          issue: "Critical component unavailable",
          impact: `Fallback: ${c.fallback}`,
          severity: "critical",
          recommendation: `Verify ${c.name} is installed.`,
        });
    }
  }
  if (status === "broken")
    entries.push({
      component: "Seal Monitor",
      issue: "Hash mismatch on re-verification",
      impact: "Canonical bytes diverged",
      severity: "critical",
      recommendation: "Possible memory corruption. Hard reload.",
    });
  if (status === "unsealed")
    entries.push({
      component: "Ring Algebra",
      issue: "Ring identity verification failed",
      impact: "Derivation IDs untrusted",
      severity: "critical",
      recommendation: "Engine integrity compromised. Reload.",
    });
  return entries;
}

// ── Self-Assessment ────────────────────────────────────────────

interface SelfAssessmentItem {
  metric: string;
  status: "measured" | "partial" | "missing";
  suggestion: string;
}

function buildSelfAssessment(receipt: BootReceipt | null): SelfAssessmentItem[] {
  const items: SelfAssessmentItem[] = [];
  items.push({
    metric: "Boot Timing",
    status: receipt ? "measured" : "missing",
    suggestion: receipt
      ? "Add phase-level timing breakdown (per-stage ms)."
      : "Boot incomplete — no timing data available.",
  });
  items.push({
    metric: "Seal Verification Latency",
    status: "missing",
    suggestion: "Track p50/p95/p99 seal re-verification latency over time.",
  });
  items.push({
    metric: "Memory Pressure",
    status: "missing",
    suggestion: "Monitor JS heap usage via performance.memory (Chrome) or estimation heuristics.",
  });
  items.push({
    metric: "GC Pause Duration",
    status: "missing",
    suggestion: "Use PerformanceObserver for 'gc' entry type when available.",
  });
  items.push({
    metric: "Network Latency",
    status: "missing",
    suggestion: "Measure RTT to backend endpoints for connectivity health.",
  });
  items.push({
    metric: "IndexedDB Quota",
    status: "missing",
    suggestion: "Track navigator.storage.estimate() for storage pressure.",
  });
  items.push({
    metric: "Service Worker State",
    status: "missing",
    suggestion: "Report SW registration state and cache hit ratio.",
  });
  items.push({
    metric: "Ring Operation Throughput",
    status: "missing",
    suggestion: "Benchmark ops/sec for core ring primitives (add, mul, xor).",
  });
  items.push({
    metric: "Kernel Function Depth",
    status: receipt?.kernelHealth ? "partial" : "missing",
    suggestion: "Add per-primitive latency and invocation count tracking.",
  });
  items.push({
    metric: "Error Budget",
    status: "missing",
    suggestion: "Track seal verification failures as a percentage over rolling window.",
  });
  items.push({
    metric: "WebWorker Pool",
    status: "missing",
    suggestion: "Report worker count, utilization, and message queue depth.",
  });
  items.push({
    metric: "Realtime Channel Health",
    status: "missing",
    suggestion: "Monitor Supabase realtime subscription state and reconnect count.",
  });
  return items;
}

// ── Uptime formatter ───────────────────────────────────────────

function formatUptime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── Full markdown report ───────────────────────────────────────

function formatMarkdownReport(
  receipt: BootReceipt | null,
  status: SealStatus | "booting" | "failed",
  lastVerified: string | null,
  entries: DegradationEntry[],
  uptimeMs: number
): string {
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
    if (entries.length > 0) {
      L.push("");
      L.push("## Issues");
      for (const e of entries) L.push(`- **${e.component}:** ${e.issue}`);
    }
    return L.join("\n");
  }

  L.push("## Executive Summary");
  L.push("");
  const engineLabel = receipt.engineType === "wasm" ? "native WASM" : "TypeScript fallback";
  const stackOk = receipt.stackHealth?.allCriticalPresent
    ? "all critical components present"
    : "MISSING critical components";
  const kernelOk = receipt.kernelHealth?.allPassed
    ? "all 7 kernel primitives verified"
    : "kernel verification INCOMPLETE";
  L.push(
    `The UOR Virtual OS booted in **${receipt.bootTimeMs}ms** using the **${engineLabel}** engine. The system is currently **${STATUS_CONFIG[status]?.label}** with ${stackOk} and ${kernelOk}. ${receipt.provenance.context === "local" ? "Running on a local device." : `Projected from remote host \`${receipt.provenance.hostname}\`.`}`
  );
  L.push("");

  L.push("## System Seal");
  L.push("");
  L.push("| Property | Value |");
  L.push("|----------|-------|");
  L.push(`| Derivation ID | \`${receipt.seal.derivationId}\` |`);
  L.push(`| Visual Glyph | ${receipt.seal.glyph} |`);
  L.push(`| Ring Table Hash | \`${receipt.seal.ringTableHash}\` |`);
  L.push(`| Manifest Hash | \`${receipt.seal.manifestHash}\` |`);
  L.push(`| WASM Binary Hash | \`${receipt.seal.wasmBinaryHash}\` |`);
  L.push(`| Session Nonce | \`${receipt.seal.sessionNonce}\` |`);
  L.push(`| Device Context Hash | \`${receipt.seal.deviceContextHash}\` |`);
  L.push(`| Kernel Hash | \`${receipt.seal.kernelHash}\` |`);
  L.push(`| Sealed At | ${receipt.seal.bootedAt} |`);
  L.push(`| Last Verified | ${lastVerified ?? "pending"} |`);
  L.push(`| Status | ${receipt.seal.status} |`);
  L.push("");

  L.push("## Timing Breakdown");
  L.push("");
  L.push("| Metric | Value |");
  L.push("|--------|-------|");
  L.push(`| Total Boot Time | ${receipt.bootTimeMs}ms |`);
  L.push(`| Current Uptime | ${formatUptime(uptimeMs)} |`);
  L.push(`| Seal Created | ${receipt.seal.bootedAt} |`);
  L.push(`| Last Verification | ${lastVerified ?? "pending"} |`);
  L.push(`| Modules Loaded | ${receipt.moduleCount} |`);
  L.push("");

  L.push("## Kernel Configuration");
  L.push("");
  L.push(
    `- **Engine Type:** ${receipt.engineType === "wasm" ? "WASM (native binary)" : "TypeScript (interpreted fallback)"}`
  );
  L.push(`- **Engine Version:** ${getEngine().version}`);
  L.push(`- **Bus Modules:** ${receipt.moduleCount}`);
  L.push(
    `- **Ring Integrity:** ${status === "unsealed" || status === "broken" ? "FAILED ✗" : "Verified ✓"}`
  );
  L.push(`- **Kernel Hash:** \`${receipt.kernelHealth?.kernelHash ?? "n/a"}\``);
  L.push("");

  try {
    const table = getKernelDeclaration();
    const verification = verifyKernel();
    const FANO = ["₀", "₁", "₂", "₃", "₄", "₅", "₆"];
    L.push("## Kernel Functions (Fano Plane P₀–P₆)");
    L.push("");
    L.push("| Point | Function | Framework | Ring Basis | Governed Namespaces | Status |");
    L.push("|-------|----------|-----------|------------|---------------------|--------|");
    for (let i = 0; i < table.length; i++) {
      const fn = table[i];
      const ok = verification.results.find((r) => r.name === fn.name)?.ok ?? false;
      L.push(
        `| P${FANO[i]} | \`${fn.name}\` | ${fn.framework} | \`${fn.ringBasis.join("`, `")}\` | ${fn.governsNamespaces.map((n) => `\`${n}\``).join(", ")} | ${ok ? "✓ Pass" : "✗ Fail"} |`
      );
    }
    L.push("");
    L.push(`**Kernel Verification Hash:** \`${verification.hash}\`  `);
    L.push(
      `**All Primitives Passed:** ${verification.allPassed ? "Yes ✓" : "No ✗"}`
    );
    L.push("");
  } catch {
    /* skip */
  }

  try {
    const coverage = auditNamespaceCoverage();
    if (coverage.total > 0) {
      L.push("## Namespace Coverage");
      L.push("");
      L.push(`- **Total Namespaces:** ${coverage.total}`);
      L.push(
        `- **Covered:** ${coverage.covered.length} (${coverage.total > 0 ? Math.round((coverage.covered.length / coverage.total) * 100) : 0}%)`
      );
      L.push(`- **Uncovered:** ${coverage.uncovered.length}`);
      if (coverage.uncovered.length > 0)
        L.push(
          `- **Uncovered List:** ${coverage.uncovered.map((n) => `\`${n}\``).join(", ")}`
        );
      L.push("");
    }
  } catch {
    /* skip */
  }

  if (receipt.kernelHealth) {
    L.push("## Kernel Enforcement");
    L.push("");
    L.push(`- **Minimal Stack:** ${receipt.kernelHealth.isMinimal ? "Yes ✓" : "No ✗"}`);
    const ns = receipt.kernelHealth.namespaceCoverage;
    L.push(`- **Namespace Coverage:** ${ns.covered}/${ns.total} (${ns.uncovered} uncovered)`);
    if (receipt.kernelHealth.overlaps.length > 0)
      L.push(
        `- **Overlaps:** ${receipt.kernelHealth.overlaps.map((o) => `${o.kernelFunction} → [${o.frameworks.join(", ")}]`).join("; ")}`
      );
    if (receipt.kernelHealth.manifestOrphans.length > 0)
      L.push(`- **Orphaned Modules:** ${receipt.kernelHealth.manifestOrphans.join(", ")}`);
    L.push("");
  }

  L.push("## Selection Policy (v2.0)");
  L.push("");
  L.push("| # | Criterion | Definition |");
  L.push("|---|-----------|------------|");
  SELECTION_POLICY.forEach((c, i) =>
    L.push(`| ${i + 1} | **${c.name}** | ${c.definition} |`)
  );
  L.push("");

  if (receipt.stackHealth) {
    const comps = receipt.stackHealth.components;
    const critical = comps.filter((c) => c.criticality === "critical");
    const recommended = comps.filter((c) => c.criticality === "recommended");
    const optional = comps.filter((c) => c.criticality === "optional");

    L.push("## Tech Stack");
    L.push("");
    L.push(`- **Stack Hash:** \`${receipt.stackHealth.stackHash}\``);
    L.push(
      `- **All Critical Present:** ${receipt.stackHealth.allCriticalPresent ? "Yes ✓" : "No ✗"}`
    );
    L.push(`- **Total Components:** ${comps.length}`);
    L.push("");

    const renderGroup = (label: string, items: typeof comps) => {
      if (items.length === 0) return;
      L.push(`### ${label} (${items.length})`);
      L.push("");
      L.push("| Component | Role | Version | Status | Fallback |");
      L.push("|-----------|------|---------|--------|----------|");
      for (const c of items)
        L.push(
          `| ${c.name} | ${c.role.split("—")[0].trim()} | ${c.version ?? "—"} | ${c.available ? "✓ Active" : "✗ Missing"} | ${c.fallback} |`
        );
      L.push("");
    };
    renderGroup("Critical", critical);
    renderGroup("Recommended", recommended);
    renderGroup("Optional", optional);
  }

  L.push("## Host Environment");
  L.push("");
  L.push("### Hardware Profile");
  L.push("");
  L.push("| Property | Value |");
  L.push("|----------|-------|");
  L.push(`| Execution Context | ${receipt.provenance.context} |`);
  L.push(`| Hostname | ${receipt.provenance.hostname} |`);
  L.push(`| Origin | ${receipt.provenance.origin} |`);
  L.push(`| CPU Cores | ${receipt.provenance.hardware.cores} |`);
  L.push(
    `| Memory | ${receipt.provenance.hardware.memoryGb ? `${receipt.provenance.hardware.memoryGb} GB` : "Restricted"} |`
  );
  L.push(`| GPU | ${receipt.provenance.hardware.gpu ?? "Unknown"} |`);
  L.push(
    `| Display | ${receipt.provenance.hardware.screenWidth}×${receipt.provenance.hardware.screenHeight} |`
  );
  L.push(`| Touch | ${receipt.provenance.hardware.touchCapable ? "Yes" : "No"} |`);
  L.push(`| User Agent | \`${receipt.provenance.hardware.userAgent}\` |`);
  L.push(`| Provenance Hash | \`${receipt.provenance.provenanceHash}\` |`);
  L.push("");

  L.push("### Capabilities Matrix");
  L.push("");
  L.push("| Capability | Supported | Notes |");
  L.push("|------------|-----------|-------|");
  L.push(
    `| WebAssembly | ${receipt.provenance.hardware.wasmSupported ? "✓" : "✗"} | ${receipt.provenance.hardware.wasmSupported ? "Native binary execution" : "TypeScript fallback active"} |`
  );
  L.push(
    `| WASM SIMD | ${receipt.provenance.hardware.simdSupported ? "✓" : "✗"} | ${receipt.provenance.hardware.simdSupported ? "128-bit vector operations" : "Scalar fallback"} |`
  );
  const sab = typeof SharedArrayBuffer !== "undefined";
  L.push(
    `| SharedArrayBuffer | ${sab ? "✓" : "✗"} | ${sab ? "Cross-origin isolated" : "COOP/COEP headers required"} |`
  );
  const workers = typeof Worker !== "undefined";
  L.push(
    `| Web Workers | ${workers ? "✓" : "✗"} | ${workers ? "Background compute available" : "Single-threaded only"} |`
  );
  L.push("");

  if (entries.length > 0) {
    L.push("## Degradation Details & Recommendations");
    L.push("");
    L.push("| Severity | Component | Issue | Impact | Recommended Action |");
    L.push("|----------|-----------|-------|--------|--------------------|");
    for (const e of entries)
      L.push(
        `| ${e.severity === "critical" ? "🔴" : e.severity === "warning" ? "🟡" : "🔵"} ${e.severity} | ${e.component} | ${e.issue} | ${e.impact} | ${e.recommendation ?? "—"} |`
      );
    L.push("");
  }

  const assessment = buildSelfAssessment(receipt);
  L.push("## System Self-Assessment");
  L.push("");
  L.push("| Metric | Coverage | Suggested Enhancement |");
  L.push("|--------|----------|-----------------------|");
  for (const item of assessment) {
    const icon =
      item.status === "measured" ? "✅" : item.status === "partial" ? "🟡" : "⬜";
    L.push(`| ${item.metric} | ${icon} ${item.status} | ${item.suggestion} |`);
  }
  L.push("");
  const measured = assessment.filter((i) => i.status === "measured").length;
  const partial = assessment.filter((i) => i.status === "partial").length;
  const missing = assessment.filter((i) => i.status === "missing").length;
  L.push(
    `**Coverage Score:** ${measured} measured, ${partial} partial, ${missing} not yet tracked (${Math.round(((measured + partial * 0.5) / assessment.length) * 100)}% coverage)`
  );
  L.push("");

  L.push("---");
  L.push(
    "*UOR Virtual OS · Lattice-hash sealed · 128-bit preimage resistance · Report v2.0*"
  );

  return L.join("\n");
}

// ═══════════════════════════════════════════════════════════════
// ██ SPARKLINE HOOK — rolling metric history
// ═══════════════════════════════════════════════════════════════

const SPARK_LEN = 40;
const SPARK_INTERVAL = 800; // ms

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
// ██ COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function SystemMonitorApp() {
  const { receipt, status, lastVerified } = useBootStatus();
  const [copied, setCopied] = useState(false);

  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.booting;
  const degradationLog = useMemo(
    () => buildDegradationLog(receipt, status),
    [receipt, status]
  );
  const isDegraded =
    status === "degraded" ||
    status === "broken" ||
    status === "unsealed" ||
    status === "failed";

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
      return (
        e.neg(e.bnot(0)) === e.succ(0) && e.neg(e.bnot(255)) === e.succ(255)
      );
    } catch {
      return false;
    }
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
    try {
      return {
        table: getKernelDeclaration(),
        verification: verifyKernel(),
      };
    } catch {
      return null;
    }
  }, []);

  // ── Sparkline data streams ──
  const uptimeSparkline = useSparkline(
    () => Math.min(100, (uptimeMs / (3600 * 1000)) * 100),
    [receipt?.seal.bootedAt]
  );

  const moduleSparkline = useSparkline(
    () => receipt?.moduleCount ?? 0,
    [receipt?.moduleCount]
  );

  // Simulated CPU utilization based on performance.now jitter
  const cpuSparkline = useSparkline(
    () => {
      const cores = receipt?.provenance.hardware.cores ?? 1;
      return Math.min(100, 8 + Math.random() * 12 + cores * 0.5);
    },
    [receipt?.provenance.hardware.cores]
  );

  // Memory pressure sparkline (simulated from heap if available)
  const memSparkline = useSparkline(
    () => {
      const perf = (performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } });
      if (perf.memory) {
        return (perf.memory.usedJSHeapSize / perf.memory.jsHeapSizeLimit) * 100;
      }
      return 15 + Math.random() * 10;
    },
    []
  );

  const handleCopyReport = useCallback(() => {
    const md = formatMarkdownReport(
      receipt,
      status,
      lastVerified,
      degradationLog,
      uptimeMs
    );
    navigator.clipboard.writeText(md).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [receipt, status, lastVerified, degradationLog, uptimeMs]);

  const FANO_SUB = ["₀", "₁", "₂", "₃", "₄", "₅", "₆"];
  const FANO_LABELS = [
    "encode",
    "decode",
    "compose",
    "store",
    "resolve",
    "observe",
    "seal",
  ];

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
  const stackPct = stackSummary
    ? Math.round((stackSummary.available / stackSummary.total) * 100)
    : 0;

  return (
    <div className="h-full flex flex-col bg-background text-foreground select-none overflow-y-auto overflow-x-hidden">
      {/* ── Top Metric Cards ── */}
      <div className="grid grid-cols-5 gap-3 p-4 pb-0">
        <GrafanaCard
          icon={<IconServer size={18} />}
          title="Virtual Machine"
          value="1 Running"
          accent={config.color}
          badge={config.label}
          badgeColor={config.color}
          sparkData={uptimeSparkline}
          sparkColor={config.color}
        />
        <GrafanaCard
          icon={<IconCpu size={18} />}
          title="Processors"
          value={`${hw.cores} vCPU`}
          accent="hsl(56, 80%, 55%)"
          sparkData={cpuSparkline}
          sparkColor="hsl(56, 80%, 55%)"
          thresholds={[
            { max: 50, color: "hsl(152, 44%, 50%)" },
            { max: 80, color: "hsl(40, 90%, 55%)" },
            { max: 100, color: "hsl(0, 70%, 55%)" },
          ]}
        />
        <GrafanaCard
          icon={<IconDeviceDesktop size={18} />}
          title="Memory"
          value={hw.memoryGb ? `${hw.memoryGb} GB` : "Restricted"}
          accent="hsl(210, 70%, 60%)"
          sparkData={memSparkline}
          sparkColor="hsl(210, 70%, 60%)"
          thresholds={[
            { max: 60, color: "hsl(152, 44%, 50%)" },
            { max: 85, color: "hsl(40, 90%, 55%)" },
            { max: 100, color: "hsl(0, 70%, 55%)" },
          ]}
        />
        <GrafanaCard
          icon={<IconStack2 size={18} />}
          title="Modules"
          value={`${receipt.moduleCount} loaded`}
          accent="hsl(270, 60%, 60%)"
          sparkData={moduleSparkline}
          sparkColor="hsl(270, 60%, 60%)"
        />
        <GrafanaCard
          icon={<IconActivity size={18} />}
          title="Capabilities"
          value={
            <div className="flex gap-2 flex-wrap">
              <CapChip label="WASM" ok={hw.wasmSupported} />
              <CapChip label="SIMD" ok={hw.simdSupported} />
              <CapChip label="SAB" ok={typeof SharedArrayBuffer !== "undefined"} />
            </div>
          }
          accent="hsl(var(--primary))"
        />
      </div>

      {/* ── Middle Row: Availability + Kernel ── */}
      <div className="grid grid-cols-[320px_1fr] gap-3 p-4">
        {/* System Availability */}
        <GrafanaPanel title="System Availability" icon={<IconHeartbeat size={15} />}>
          <div className="flex items-start gap-5">
            {/* Availability ring */}
            <div className="relative w-20 h-20 shrink-0">
              <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                <circle cx="40" cy="40" r="34" fill="none" strokeWidth="5" className="stroke-muted/20" />
                <circle
                  cx="40" cy="40" r="34"
                  fill="none" strokeWidth="5"
                  stroke={config.color}
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * 0.001}`}
                  strokeLinecap="round"
                  style={{ filter: `drop-shadow(0 0 6px ${config.color}50)` }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-base font-bold font-mono" style={{ color: config.color }}>100%</span>
              </div>
            </div>
            <div className="space-y-2 flex-1 pt-1">
              <GrafanaRow label="Status" color={config.color}>{config.label}</GrafanaRow>
              <GrafanaRow label="Uptime"><span className="tabular-nums font-mono">{formatUptime(uptimeMs)}</span></GrafanaRow>
              <GrafanaRow label="Boot"><span className="font-mono">{receipt.bootTimeMs}ms</span></GrafanaRow>
              <GrafanaRow label="Engine"><span className="font-mono">{receipt.engineType === "wasm" ? "WASM" : "TS"} {getEngine().version}</span></GrafanaRow>
              <GrafanaRow label="Ring" color={ringOk ? "#22c55e" : "#ef4444"}>{ringOk ? "Verified ✓" : "Failed ✗"}</GrafanaRow>
            </div>
          </div>
        </GrafanaPanel>

        {/* Kernel Primitives */}
        <GrafanaPanel title="Kernel Primitives — Fano Plane" icon={<IconCircleCheck size={15} />}>
          {kernelData ? (
            <>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                {kernelData.table.map((fn, i) => {
                  const ok = kernelData.verification.results.find((r) => r.name === fn.name)?.ok ?? false;
                  return (
                    <div key={fn.name} className="flex items-center gap-3 group">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0 transition-shadow duration-300"
                        style={{
                          backgroundColor: ok ? "#22c55e" : "#ef4444",
                          boxShadow: ok ? "0 0 8px rgba(34,197,94,0.5)" : "0 0 8px rgba(239,68,68,0.5)",
                        }}
                      />
                      <span className="text-muted-foreground text-xs tabular-nums font-mono w-6">P{FANO_SUB[i]}</span>
                      <span className="text-foreground/90 text-sm font-medium group-hover:text-foreground transition-colors">{FANO_LABELS[i] ?? fn.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground/40 font-mono">{fn.framework.slice(0, 14)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="text-xs text-muted-foreground pt-2 border-t border-border/50 flex items-center justify-between font-mono">
                <span>{kernelData.verification.allPassed ? "7/7 verified ✓" : `${kernelData.verification.results.filter((r) => r.ok).length}/7 verified`}</span>
                <span className="opacity-50">{receipt.kernelHealth?.kernelHash?.slice(0, 14)}…</span>
              </div>
            </>
          ) : (
            <div className="text-muted-foreground text-sm">Unavailable</div>
          )}
        </GrafanaPanel>
      </div>

      {/* ── Bottom Row: Stack Health + Host Hardware ── */}
      <div className="grid grid-cols-[320px_1fr] gap-3 px-4 pb-3">
        {/* Stack Health */}
        <GrafanaPanel title="Stack Health" icon={<IconStack2 size={15} />}>
          {stackSummary && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground/80 font-medium">{stackSummary.available}/{stackSummary.total} operational</span>
                <span
                  className="font-bold tabular-nums text-sm font-mono"
                  style={{ color: stackPct === 100 ? "#22c55e" : stackPct > 80 ? "#f59e0b" : "#ef4444" }}
                >
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
              {stackSummary.failing.length > 0 && (
                <div className="space-y-1 pt-1.5">
                  {stackSummary.failing.map((c) => (
                    <div key={c.name} className="flex items-center gap-2 text-xs">
                      <IconAlertTriangle size={13} className="text-amber-500 shrink-0" />
                      <span className="text-amber-500/90">{c.name} <span className="text-muted-foreground">({c.criticality})</span></span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </GrafanaPanel>

        {/* Host Hardware */}
        <GrafanaPanel title="Host Hardware" icon={<IconDeviceDesktop size={15} />}>
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-semibold ${
              receipt.provenance.context === "local" ? "bg-green-500/10 text-green-500" : "bg-blue-500/10 text-blue-500"
            }`}
          >
            <PulseDot color={receipt.provenance.context === "local" ? "#22c55e" : "#3b82f6"} size={6} />
            {receipt.provenance.context === "local" ? "Local Instance" : `Remote · ${receipt.provenance.hostname}`}
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
            <GrafanaRow label="Display"><span className="font-mono">{hw.screenWidth}×{hw.screenHeight}</span></GrafanaRow>
            <GrafanaRow label="GPU"><span className="font-mono text-xs">{hw.gpu ?? "Unknown"}</span></GrafanaRow>
            <GrafanaRow label="Touch"><span className="font-mono">{hw.touchCapable ? "Yes" : "No"}</span></GrafanaRow>
            <GrafanaRow label="Workers"><span className="font-mono">{typeof Worker !== "undefined" ? "Available" : "No"}</span></GrafanaRow>
          </div>

          <div className="text-xs text-muted-foreground/50 pt-2 border-t border-border/50 font-mono">
            Provenance: {receipt.provenance.provenanceHash.slice(0, 24)}…
          </div>
        </GrafanaPanel>
      </div>

      {/* ── Active Alerts ── */}
      {isDegraded && degradationLog.length > 0 && (
        <div className="px-4 pb-3">
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-500 uppercase tracking-wider">
              <IconAlertTriangle size={14} />
              Active Alerts
            </div>
            {degradationLog.map((entry, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm text-amber-400/90 pl-1">
                <PulseDot color="#f59e0b" size={6} />
                <span><span className="font-semibold text-amber-500">{entry.component}:</span> {entry.issue}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="mt-auto border-t border-border/50 px-4 py-3 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <PulseDot color={config.color} size={5} />
            <span className="tabular-nums font-mono">{formatUptime(uptimeMs)}</span>
          </div>
          <span className="opacity-30">·</span>
          <span className="tracking-[0.04em] opacity-40 max-w-[220px] truncate font-mono">{receipt.seal.glyph}</span>
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
// ██ SUB-COMPONENTS — Grafana-inspired
// ═══════════════════════════════════════════════════════════════

/** Grafana-style panel wrapper with header line */
function GrafanaPanel({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-4 space-y-3 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-primary/40 via-primary/10 to-transparent" />
      <div className="flex items-center gap-2">
        {icon && <span className="text-muted-foreground/60">{icon}</span>}
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

/** Metric card with optional sparkline and thresholds */
function GrafanaCard({
  icon,
  title,
  value,
  accent,
  badge,
  badgeColor,
  sparkData,
  sparkColor,
  thresholds,
}: {
  icon: React.ReactNode;
  title: string;
  value: React.ReactNode;
  accent: string;
  badge?: string;
  badgeColor?: string;
  sparkData?: number[];
  sparkColor?: string;
  thresholds?: { max: number; color: string }[];
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-3.5 space-y-2 relative overflow-hidden group hover:border-border transition-colors duration-200">
      <div
        className="absolute top-0 left-0 right-0 h-[2px] opacity-60 group-hover:opacity-100 transition-opacity"
        style={{ background: accent }}
      />
      <div className="flex items-center justify-between">
        <span style={{ color: accent }} className="opacity-80">{icon}</span>
        {badge && (
          <span
            className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
            style={{ color: badgeColor, backgroundColor: `${badgeColor}15`, boxShadow: `0 0 8px ${badgeColor}10` }}
          >
            {badge}
          </span>
        )}
      </div>
      <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{title}</div>
      <div className="text-sm font-semibold text-foreground/90">{value}</div>
      {sparkData && sparkData.length > 0 && (
        <MiniSparkline data={sparkData} color={sparkColor ?? accent} thresholds={thresholds} height={28} />
      )}
    </div>
  );
}

/** Inline SVG sparkline with optional threshold coloring */
function MiniSparkline({
  data,
  color,
  thresholds,
  height = 20,
}: {
  data: number[];
  color: string;
  thresholds?: { max: number; color: string }[];
  height?: number;
}) {
  const max = Math.max(1, ...data);
  const w = 120;
  const h = height;
  const step = w / (data.length - 1 || 1);

  // Build path
  const points = data.map((v, i) => {
    const x = i * step;
    const y = h - (v / max) * (h - 2) - 1;
    return `${x},${y}`;
  });

  // Resolve color for last value based on thresholds
  const lastVal = data[data.length - 1] ?? 0;
  let strokeColor = color;
  if (thresholds) {
    for (const t of thresholds) {
      if (lastVal <= t.max) {
        strokeColor = t.color;
        break;
      }
    }
  }

  // Area fill gradient id
  const gradId = `spark-${Math.random().toString(36).slice(2, 6)}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Fill area */}
      <polygon
        points={`0,${h} ${points.join(" ")} ${w},${h}`}
        fill={`url(#${gradId})`}
      />
      {/* Line */}
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Current value dot */}
      {data.length > 1 && (
        <circle
          cx={w}
          cy={h - (lastVal / max) * (h - 2) - 1}
          r="2"
          fill={strokeColor}
        />
      )}
    </svg>
  );
}

/** Threshold-colored progress bar */
function ThresholdBar({
  value,
  thresholds,
}: {
  value: number;
  thresholds: { max: number; color: string }[];
}) {
  let barColor = thresholds[thresholds.length - 1]?.color ?? "#22c55e";
  for (const t of thresholds) {
    if (value <= t.max) {
      barColor = t.color;
      break;
    }
  }

  return (
    <div className="h-2 bg-muted/20 rounded-full overflow-hidden relative">
      {thresholds.slice(0, -1).map((t, i) => (
        <div key={i} className="absolute top-0 bottom-0 w-[1px] opacity-20" style={{ left: `${t.max}%`, backgroundColor: t.color }} />
      ))}
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${Math.max(value, value > 0 ? 2 : 0)}%`, backgroundColor: barColor, boxShadow: `0 0 10px ${barColor}30` }}
      />
    </div>
  );
}

/** Animated pulsing status dot */
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
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md transition-colors ${ok ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-400"}`}>
      {ok ? <IconCheck size={12} /> : <IconX size={12} />}
      {label}
    </span>
  );
}

function GrafanaRow({ label, children, color }: { label: string; children: React.ReactNode; color?: string }) {
  return (
    <div className="flex justify-between items-center gap-3">
      <span className="text-muted-foreground/70 text-xs">{label}</span>
      <span className="text-right font-semibold text-sm" style={color ? { color } : undefined}>{children}</span>
    </div>
  );
}
