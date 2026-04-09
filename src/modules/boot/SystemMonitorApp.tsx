/**
 * SystemMonitorApp — Hypervisor-style system monitoring dashboard.
 *
 * Opens as a desktop app window. Displays real-time telemetry
 * from the boot receipt: metric cards, kernel health, stack status,
 * host hardware, and availability.
 *
 * @module boot/SystemMonitorApp
 */

import { useState, useMemo, useCallback, useEffect } from "react";
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
        Initializing system telemetry…
      </div>
    );
  }

  const hw = receipt.provenance.hardware;
  const stackPct = stackSummary
    ? Math.round((stackSummary.available / stackSummary.total) * 100)
    : 0;

  return (
    <div className="h-full flex flex-col bg-background text-foreground font-mono text-[11px] leading-relaxed select-none overflow-hidden">
      {/* ── Top Metric Cards ── */}
      <div className="grid grid-cols-5 gap-2 p-3 pb-0">
        {/* Status */}
        <MetricCard
          icon={<IconServer size={16} />}
          title="Virtual Machine"
          value="1 Running"
          accent={config.color}
          badge={config.label}
          badgeColor={config.color}
        />

        {/* CPU */}
        <MetricCard
          icon={<IconCpu size={16} />}
          title="Processors"
          value={`${hw.cores} cores`}
          accent="hsl(var(--primary))"
        />

        {/* Memory */}
        <MetricCard
          icon={<IconDeviceDesktop size={16} />}
          title="Memory"
          value={hw.memoryGb ? `${hw.memoryGb} GB` : "Restricted"}
          accent="hsl(var(--primary))"
        />

        {/* Modules */}
        <MetricCard
          icon={<IconStack2 size={16} />}
          title="Modules"
          value={`${receipt.moduleCount} loaded`}
          accent="hsl(var(--primary))"
        />

        {/* Capabilities */}
        <MetricCard
          icon={<IconActivity size={16} />}
          title="Capabilities"
          value={
            <div className="flex gap-2 flex-wrap">
              <CapChip label="WASM" ok={hw.wasmSupported} />
              <CapChip label="SIMD" ok={hw.simdSupported} />
              <CapChip
                label="SAB"
                ok={typeof SharedArrayBuffer !== "undefined"}
              />
            </div>
          }
          accent="hsl(var(--primary))"
        />
      </div>

      {/* ── Middle Row: Availability + Kernel ── */}
      <div className="grid grid-cols-[280px_1fr] gap-2 p-3">
        {/* Availability */}
        <div className="rounded-lg border border-border bg-card p-3 space-y-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            System Availability
          </div>
          <div className="flex items-center gap-4">
            {/* Circular indicator */}
            <div className="relative w-16 h-16 shrink-0">
              <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  strokeWidth="4"
                  className="stroke-muted/30"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  strokeWidth="4"
                  stroke={config.color}
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * 0.001}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                100%
              </div>
            </div>
            <div className="space-y-1 text-[10px]">
              <Row label="Status">
                <span style={{ color: config.color }} className="font-semibold">
                  {config.label}
                </span>
              </Row>
              <Row label="Uptime">
                <span className="font-semibold tabular-nums">
                  {formatUptime(uptimeMs)}
                </span>
              </Row>
              <Row label="Boot time">
                <span>{receipt.bootTimeMs}ms</span>
              </Row>
              <Row label="Engine">
                <span>
                  {receipt.engineType === "wasm" ? "WASM" : "TypeScript"}{" "}
                  {getEngine().version}
                </span>
              </Row>
              <Row label="Ring">
                <span style={{ color: ringOk ? "#22c55e" : "#ef4444" }}>
                  {ringOk ? "Verified ✓" : "Failed ✗"}
                </span>
              </Row>
            </div>
          </div>
        </div>

        {/* Kernel Primitives */}
        <div className="rounded-lg border border-border bg-card p-3 space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Kernel Primitives
          </div>
          {kernelData ? (
            <>
              <div className="grid grid-cols-2 gap-x-6 gap-y-[5px]">
                {kernelData.table.map((fn, i) => {
                  const ok =
                    kernelData.verification.results.find(
                      (r) => r.name === fn.name
                    )?.ok ?? false;
                  return (
                    <div
                      key={fn.name}
                      className="flex items-center gap-2"
                    >
                      <div
                        className="w-[6px] h-[6px] rounded-full shrink-0"
                        style={{ backgroundColor: ok ? "#22c55e" : "#ef4444" }}
                      />
                      <span className="text-muted-foreground w-[20px] text-[9px]">
                        P{FANO_SUB[i]}
                      </span>
                      <span className="text-foreground/80 text-[10px]">
                        {FANO_LABELS[i] ?? fn.name}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="text-[9px] text-muted-foreground pt-1 border-t border-border">
                {kernelData.verification.allPassed
                  ? "7/7 verified ✓"
                  : `${kernelData.verification.results.filter((r) => r.ok).length}/7 verified`}
                {" · "}
                Hash: {receipt.kernelHealth?.kernelHash?.slice(0, 10)}…
              </div>
            </>
          ) : (
            <div className="text-muted-foreground text-[10px]">Unavailable</div>
          )}
        </div>
      </div>

      {/* ── Bottom Row: Stack Health + Host Hardware ── */}
      <div className="grid grid-cols-[280px_1fr] gap-2 px-3 pb-2">
        {/* Stack Health */}
        <div className="rounded-lg border border-border bg-card p-3 space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Stack Health
          </div>
          {stackSummary && (
            <>
              <div className="text-[10px] text-foreground/80">
                {stackSummary.available}/{stackSummary.total} operational
              </div>
              <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${stackPct}%`,
                    backgroundColor:
                      stackPct === 100
                        ? "#22c55e"
                        : stackPct > 80
                          ? "#f59e0b"
                          : "#ef4444",
                  }}
                />
              </div>
              {stackSummary.failing.length > 0 && (
                <div className="space-y-[2px]">
                  {stackSummary.failing.map((c) => (
                    <div
                      key={c.name}
                      className="flex items-center gap-1.5 text-[9px]"
                    >
                      <IconAlertTriangle size={10} className="text-amber-500 shrink-0" />
                      <span className="text-amber-500/90">
                        {c.name}{" "}
                        <span className="text-muted-foreground">
                          ({c.criticality})
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Host Hardware */}
        <div className="rounded-lg border border-border bg-card p-3 space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Host Hardware
          </div>

          {/* Projection badge */}
          <div
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-semibold ${
              receipt.provenance.context === "local"
                ? "bg-green-500/10 text-green-500"
                : "bg-blue-500/10 text-blue-500"
            }`}
          >
            <div
              className="w-[5px] h-[5px] rounded-full"
              style={{
                backgroundColor:
                  receipt.provenance.context === "local" ? "#22c55e" : "#3b82f6",
              }}
            />
            {receipt.provenance.context === "local"
              ? "Local"
              : `Remote · ${receipt.provenance.hostname}`}
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-[3px] text-[10px]">
            <Row label="Display">
              {hw.screenWidth}×{hw.screenHeight}
            </Row>
            <Row label="GPU">{hw.gpu ?? "Unknown"}</Row>
            <Row label="Touch">{hw.touchCapable ? "Yes" : "No"}</Row>
            <Row label="Workers">
              {typeof Worker !== "undefined" ? "Yes" : "No"}
            </Row>
          </div>

          <div className="text-[9px] text-muted-foreground pt-1 border-t border-border">
            Provenance: {receipt.provenance.provenanceHash.slice(0, 16)}…
          </div>
        </div>
      </div>

      {/* ── Issues Strip ── */}
      {isDegraded && degradationLog.length > 0 && (
        <div className="px-3 pb-2">
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 space-y-1">
            {degradationLog.map((entry, i) => (
              <div
                key={i}
                className="flex items-start gap-1.5 text-[10px] text-amber-500"
              >
                <IconAlertTriangle size={12} className="shrink-0 mt-[1px]" />
                <span>
                  <span className="font-semibold">{entry.component}:</span>{" "}
                  {entry.issue}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="mt-auto border-t border-border px-3 py-2 flex items-center justify-between text-[9px] text-muted-foreground">
        <div className="flex items-center gap-3">
          {/* Seal glyph mini */}
          <span className="tracking-[0.08em] opacity-60 max-w-[200px] truncate">
            {receipt.seal.glyph}
          </span>
          <span>
            Lattice-hash sealed · 128-bit preimage · Session{" "}
            {receipt.seal.sessionNonce.slice(0, 8)}
          </span>
        </div>
        <button
          onClick={handleCopyReport}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-muted/40 hover:bg-muted/70 transition-colors text-foreground/70 hover:text-foreground"
        >
          {copied ? (
            <>
              <IconClipboardCheck size={12} />
              Copied
            </>
          ) : (
            <>
              <IconCopy size={12} />
              Copy Report
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ██ SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

function MetricCard({
  icon,
  title,
  value,
  accent,
  badge,
  badgeColor,
}: {
  icon: React.ReactNode;
  title: string;
  value: React.ReactNode;
  accent: string;
  badge?: string;
  badgeColor?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-2.5 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground" style={{ color: accent }}>
          {icon}
        </span>
        {badge && (
          <span
            className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full"
            style={{
              color: badgeColor,
              backgroundColor: `${badgeColor}18`,
            }}
          >
            {badge}
          </span>
        )}
      </div>
      <div className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">
        {title}
      </div>
      <div className="text-[11px] font-semibold text-foreground/90">
        {value}
      </div>
    </div>
  );
}

function CapChip({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded ${
        ok
          ? "bg-green-500/10 text-green-500"
          : "bg-red-500/10 text-red-400"
      }`}
    >
      {ok ? <IconCheck size={9} /> : <IconX size={9} />}
      {label}
    </span>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground/80 text-right">{children}</span>
    </div>
  );
}
