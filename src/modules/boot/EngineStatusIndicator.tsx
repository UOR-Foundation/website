/**
 * EngineStatusIndicator — Hypervisor-Style VM Status Console
 *
 * Two-column layout: Virtual Machine | Host Device
 * Single-screen, no scrolling. Inspired by Proxmox/VMware/Hyper-V.
 *
 * @module boot/EngineStatusIndicator
 */

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useBootStatus } from "./useBootStatus";
import type { SealStatus, BootReceipt } from "./types";
import { motion, AnimatePresence } from "framer-motion";
import { getEngine } from "@/modules/engine";
import { TECH_STACK, SELECTION_POLICY } from "./tech-stack";
import { getKernelDeclaration, verifyKernel, auditNamespaceCoverage } from "@/modules/engine/kernel-declaration";

// ── Status config ───────────────────────────────────────────────────────

interface StatusConfig {
  color: string;
  label: string;
  description: string;
  pulse: boolean;
}

const STATUS_CONFIG: Record<SealStatus | "booting" | "failed", StatusConfig> = {
  sealed:   { color: "#22c55e", label: "SEALED",           description: "All systems verified",     pulse: false },
  degraded: { color: "#f59e0b", label: "DEGRADED",         description: "Reduced capability",       pulse: true  },
  unsealed: { color: "#ef4444", label: "INTEGRITY FAILURE", description: "Verification failed",     pulse: true  },
  broken:   { color: "#ef4444", label: "COMPROMISED",      description: "Tampering detected",       pulse: true  },
  booting:  { color: "#6b7280", label: "STARTING",         description: "Initializing…",            pulse: true  },
  failed:   { color: "#ef4444", label: "BOOT FAILED",      description: "Check console",            pulse: true  },
};

// ── Degradation entries ─────────────────────────────────────────────────

interface DegradationEntry {
  component: string;
  issue: string;
  impact: string;
  severity: "critical" | "warning" | "info";
  recommendation?: string;
}

function buildDegradationLog(receipt: BootReceipt | null, status: SealStatus | "booting" | "failed"): DegradationEntry[] {
  const entries: DegradationEntry[] = [];
  if (!receipt) {
    if (status === "failed") entries.push({ component: "Boot Sequence", issue: "Boot did not complete", impact: "System non-functional", severity: "critical", recommendation: "Check console. Reload page." });
    return entries;
  }
  if (receipt.engineType === "typescript") entries.push({ component: "Compute Engine", issue: "WASM → TypeScript fallback", impact: "Binary integrity hash absent", severity: "warning", recommendation: "Check WASM binary accessibility/CORS." });
  if (receipt.stackHealth) {
    for (const c of receipt.stackHealth.components) {
      if (!c.available && c.criticality === "critical") entries.push({ component: c.name, issue: "Critical component unavailable", impact: `Fallback: ${c.fallback}`, severity: "critical", recommendation: `Verify ${c.name} is installed.` });
    }
  }
  if (status === "broken") entries.push({ component: "Seal Monitor", issue: "Hash mismatch on re-verification", impact: "Canonical bytes diverged", severity: "critical", recommendation: "Possible memory corruption. Hard reload." });
  if (status === "unsealed") entries.push({ component: "Ring Algebra", issue: "Ring identity verification failed", impact: "Derivation IDs untrusted", severity: "critical", recommendation: "Engine integrity compromised. Reload." });
  return entries;
}

// ── Self-Assessment ─────────────────────────────────────────────────────

interface SelfAssessmentItem {
  metric: string;
  status: "measured" | "partial" | "missing";
  suggestion: string;
}

function buildSelfAssessment(receipt: BootReceipt | null): SelfAssessmentItem[] {
  const items: SelfAssessmentItem[] = [];
  items.push({ metric: "Boot Timing", status: receipt ? "measured" : "missing", suggestion: receipt ? "Add phase-level timing breakdown (per-stage ms)." : "Boot incomplete — no timing data available." });
  items.push({ metric: "Seal Verification Latency", status: "missing", suggestion: "Track p50/p95/p99 seal re-verification latency over time." });
  items.push({ metric: "Memory Pressure", status: "missing", suggestion: "Monitor JS heap usage via performance.memory (Chrome) or estimation heuristics." });
  items.push({ metric: "GC Pause Duration", status: "missing", suggestion: "Use PerformanceObserver for 'gc' entry type when available." });
  items.push({ metric: "Network Latency", status: "missing", suggestion: "Measure RTT to backend endpoints for connectivity health." });
  items.push({ metric: "IndexedDB Quota", status: "missing", suggestion: "Track navigator.storage.estimate() for storage pressure." });
  items.push({ metric: "Service Worker State", status: "missing", suggestion: "Report SW registration state and cache hit ratio." });
  items.push({ metric: "Ring Operation Throughput", status: "missing", suggestion: "Benchmark ops/sec for core ring primitives (add, mul, xor)." });
  items.push({ metric: "Kernel Function Depth", status: receipt?.kernelHealth ? "partial" : "missing", suggestion: "Add per-primitive latency and invocation count tracking." });
  items.push({ metric: "Error Budget", status: "missing", suggestion: "Track seal verification failures as a percentage over rolling window." });
  items.push({ metric: "WebWorker Pool", status: "missing", suggestion: "Report worker count, utilization, and message queue depth." });
  items.push({ metric: "Realtime Channel Health", status: "missing", suggestion: "Monitor Supabase realtime subscription state and reconnect count." });
  return items;
}

// ── Uptime formatter ────────────────────────────────────────────────────

function formatUptime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── Enhanced markdown report ────────────────────────────────────────────

function formatMarkdownReport(
  receipt: BootReceipt | null,
  status: SealStatus | "booting" | "failed",
  lastVerified: string | null,
  entries: DegradationEntry[],
  uptimeMs: number,
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
    if (entries.length > 0) { L.push(""); L.push("## Issues"); for (const e of entries) L.push(`- **${e.component}:** ${e.issue}`); }
    return L.join("\n");
  }

  // ── Executive Summary ──
  L.push("## Executive Summary");
  L.push("");
  const engineLabel = receipt.engineType === "wasm" ? "native WASM" : "TypeScript fallback";
  const stackOk = receipt.stackHealth?.allCriticalPresent ? "all critical components present" : "MISSING critical components";
  const kernelOk = receipt.kernelHealth?.allPassed ? "all 7 kernel primitives verified" : "kernel verification INCOMPLETE";
  L.push(`The UOR Virtual OS booted in **${receipt.bootTimeMs}ms** using the **${engineLabel}** engine. The system is currently **${STATUS_CONFIG[status]?.label}** with ${stackOk} and ${kernelOk}. ${receipt.provenance.context === "local" ? "Running on a local device." : `Projected from remote host \`${receipt.provenance.hostname}\`.`}`);
  L.push("");

  // ── Seal ──
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

  // ── Timing Breakdown ──
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

  // ── Kernel ──
  L.push("## Kernel Configuration");
  L.push("");
  L.push(`- **Engine Type:** ${receipt.engineType === "wasm" ? "WASM (native binary)" : "TypeScript (interpreted fallback)"}`);
  L.push(`- **Engine Version:** ${getEngine().version}`);
  L.push(`- **Bus Modules:** ${receipt.moduleCount}`);
  L.push(`- **Ring Integrity:** ${status === "unsealed" || status === "broken" ? "FAILED ✗" : "Verified ✓"}`);
  L.push(`- **Kernel Hash:** \`${receipt.kernelHealth?.kernelHash ?? "n/a"}\``);
  L.push("");

  // ── Kernel Functions Table ──
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
      L.push(`| P${FANO[i]} | \`${fn.name}\` | ${fn.framework} | \`${fn.ringBasis.join("`, `")}\` | ${fn.governsNamespaces.map(n => `\`${n}\``).join(", ")} | ${ok ? "✓ Pass" : "✗ Fail"} |`);
    }
    L.push("");
    L.push(`**Kernel Verification Hash:** \`${verification.hash}\`  `);
    L.push(`**All Primitives Passed:** ${verification.allPassed ? "Yes ✓" : "No ✗"}`);
    L.push("");
  } catch { /* skip */ }

  // ── Namespace Coverage ──
  try {
    const coverage = auditNamespaceCoverage();
    if (coverage.total > 0) {
      L.push("## Namespace Coverage");
      L.push("");
      L.push(`- **Total Namespaces:** ${coverage.total}`);
      L.push(`- **Covered:** ${coverage.covered.length} (${coverage.total > 0 ? Math.round(coverage.covered.length / coverage.total * 100) : 0}%)`);
      L.push(`- **Uncovered:** ${coverage.uncovered.length}`);
      if (coverage.uncovered.length > 0) L.push(`- **Uncovered List:** ${coverage.uncovered.map(n => `\`${n}\``).join(", ")}`);
      L.push("");
    }
  } catch { /* skip */ }

  if (receipt.kernelHealth) {
    L.push("## Kernel Enforcement");
    L.push("");
    L.push(`- **Minimal Stack:** ${receipt.kernelHealth.isMinimal ? "Yes ✓" : "No ✗"}`);
    const ns = receipt.kernelHealth.namespaceCoverage;
    L.push(`- **Namespace Coverage:** ${ns.covered}/${ns.total} (${ns.uncovered} uncovered)`);
    if (receipt.kernelHealth.overlaps.length > 0) L.push(`- **Overlaps:** ${receipt.kernelHealth.overlaps.map(o => `${o.kernelFunction} → [${o.frameworks.join(", ")}]`).join("; ")}`);
    if (receipt.kernelHealth.manifestOrphans.length > 0) L.push(`- **Orphaned Modules:** ${receipt.kernelHealth.manifestOrphans.join(", ")}`);
    L.push("");
  }

  // ── Selection Policy ──
  L.push("## Selection Policy (v2.0)");
  L.push("");
  L.push("| # | Criterion | Definition |");
  L.push("|---|-----------|------------|");
  SELECTION_POLICY.forEach((c, i) => L.push(`| ${i + 1} | **${c.name}** | ${c.definition} |`));
  L.push("");

  // ── Tech Stack (categorized) ──
  if (receipt.stackHealth) {
    const comps = receipt.stackHealth.components;
    const critical = comps.filter(c => c.criticality === "critical");
    const recommended = comps.filter(c => c.criticality === "recommended");
    const optional = comps.filter(c => c.criticality === "optional");

    L.push("## Tech Stack");
    L.push("");
    L.push(`- **Stack Hash:** \`${receipt.stackHealth.stackHash}\``);
    L.push(`- **All Critical Present:** ${receipt.stackHealth.allCriticalPresent ? "Yes ✓" : "No ✗"}`);
    L.push(`- **Total Components:** ${comps.length}`);
    L.push("");

    const renderGroup = (label: string, items: typeof comps) => {
      if (items.length === 0) return;
      L.push(`### ${label} (${items.length})`);
      L.push("");
      L.push("| Component | Role | Version | Status | Fallback |");
      L.push("|-----------|------|---------|--------|----------|");
      for (const c of items) L.push(`| ${c.name} | ${c.role.split("—")[0].trim()} | ${c.version ?? "—"} | ${c.available ? "✓ Active" : "✗ Missing"} | ${c.fallback} |`);
      L.push("");
    };
    renderGroup("Critical", critical);
    renderGroup("Recommended", recommended);
    renderGroup("Optional", optional);
  }

  // ── Environment Capabilities ──
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
  L.push(`| Memory | ${receipt.provenance.hardware.memoryGb ? `${receipt.provenance.hardware.memoryGb} GB` : "Restricted"} |`);
  L.push(`| GPU | ${receipt.provenance.hardware.gpu ?? "Unknown"} |`);
  L.push(`| Display | ${receipt.provenance.hardware.screenWidth}×${receipt.provenance.hardware.screenHeight} |`);
  L.push(`| Touch | ${receipt.provenance.hardware.touchCapable ? "Yes" : "No"} |`);
  L.push(`| User Agent | \`${receipt.provenance.hardware.userAgent}\` |`);
  L.push(`| Provenance Hash | \`${receipt.provenance.provenanceHash}\` |`);
  L.push("");

  L.push("### Capabilities Matrix");
  L.push("");
  L.push("| Capability | Supported | Notes |");
  L.push("|------------|-----------|-------|");
  L.push(`| WebAssembly | ${receipt.provenance.hardware.wasmSupported ? "✓" : "✗"} | ${receipt.provenance.hardware.wasmSupported ? "Native binary execution" : "TypeScript fallback active"} |`);
  L.push(`| WASM SIMD | ${receipt.provenance.hardware.simdSupported ? "✓" : "✗"} | ${receipt.provenance.hardware.simdSupported ? "128-bit vector operations" : "Scalar fallback"} |`);
  const sab = typeof SharedArrayBuffer !== "undefined";
  L.push(`| SharedArrayBuffer | ${sab ? "✓" : "✗"} | ${sab ? "Cross-origin isolated" : "COOP/COEP headers required"} |`);
  const workers = typeof Worker !== "undefined";
  L.push(`| Web Workers | ${workers ? "✓" : "✗"} | ${workers ? "Background compute available" : "Single-threaded only"} |`);
  L.push("");

  // ── Degradation ──
  if (entries.length > 0) {
    L.push("## Degradation Details & Recommendations");
    L.push("");
    L.push("| Severity | Component | Issue | Impact | Recommended Action |");
    L.push("|----------|-----------|-------|--------|--------------------|");
    for (const e of entries) L.push(`| ${e.severity === "critical" ? "🔴" : e.severity === "warning" ? "🟡" : "🔵"} ${e.severity} | ${e.component} | ${e.issue} | ${e.impact} | ${e.recommendation ?? "—"} |`);
    L.push("");
  }

  // ── Self-Assessment ──
  const assessment = buildSelfAssessment(receipt);
  L.push("## System Self-Assessment");
  L.push("");
  L.push("The system has analyzed its own diagnostic coverage and identified the following improvement opportunities:");
  L.push("");
  L.push("| Metric | Coverage | Suggested Enhancement |");
  L.push("|--------|----------|-----------------------|");
  for (const item of assessment) {
    const icon = item.status === "measured" ? "✅" : item.status === "partial" ? "🟡" : "⬜";
    L.push(`| ${item.metric} | ${icon} ${item.status} | ${item.suggestion} |`);
  }
  L.push("");
  const measured = assessment.filter(i => i.status === "measured").length;
  const partial = assessment.filter(i => i.status === "partial").length;
  const missing = assessment.filter(i => i.status === "missing").length;
  L.push(`**Coverage Score:** ${measured} measured, ${partial} partial, ${missing} not yet tracked (${Math.round((measured + partial * 0.5) / assessment.length * 100)}% coverage)`);
  L.push("");
  L.push("> 💡 **Self-Improvement Protocol:** Each missing metric above represents a concrete enhancement the system recommends for future report iterations. Implementing these would increase diagnostic depth and enable predictive health monitoring.");
  L.push("");

  L.push("---");
  L.push("*UOR Virtual OS · Lattice-hash sealed · 128-bit preimage resistance · Report v2.0*");

  return L.join("\n");
}

// ── Component ───────────────────────────────────────────────────────────

interface EngineStatusIndicatorProps { isLight?: boolean; }

export default function EngineStatusIndicator({ isLight = false }: EngineStatusIndicatorProps) {
  const { receipt, status, lastVerified } = useBootStatus();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.booting;
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
    try { const e = getEngine(); return e.neg(e.bnot(0)) === e.succ(0) && e.neg(e.bnot(255)) === e.succ(255); }
    catch { return false; }
  }, [receipt, lastVerified]);

  // Stack summary
  const stackSummary = useMemo(() => {
    if (!receipt?.stackHealth) return null;
    const comps = receipt.stackHealth.components;
    const available = comps.filter(c => c.available).length;
    const failing = comps.filter(c => !c.available);
    return { available, total: comps.length, failing };
  }, [receipt]);

  // Kernel data
  const kernelData = useMemo(() => {
    try { return { table: getKernelDeclaration(), verification: verifyKernel() }; }
    catch { return null; }
  }, []);

  const handleCopyReport = useCallback(() => {
    const md = formatMarkdownReport(receipt, status, lastVerified, degradationLog, uptimeMs);
    navigator.clipboard.writeText(md).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }, [receipt, status, lastVerified, degradationLog, uptimeMs]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Theme tokens
  const txt = isLight ? "text-black/80" : "text-white/80";
  const txtSub = isLight ? "text-black/50" : "text-white/50";
  const txtFaint = isLight ? "text-black/30" : "text-white/30";
  const border = isLight ? "border-black/[0.06]" : "border-white/[0.06]";
  const bgPanel = isLight
    ? "bg-white/95 border-black/10 shadow-lg"
    : "bg-black/90 border-white/10 shadow-2xl";
  const sectionHead = `text-[8px] font-bold uppercase tracking-[0.1em] ${isLight ? "text-black/40" : "text-white/40"}`;

  const FANO_SUB = ["₀", "₁", "₂", "₃", "₄", "₅", "₆"];

  // Drag state
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const dragStart = useRef<{ mx: number; my: number; wx: number; wy: number } | null>(null);

  const onTitleBarPointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const wx = dragPos?.x ?? 0;
    const wy = dragPos?.y ?? 0;
    dragStart.current = { mx: e.clientX, my: e.clientY, wx, wy };
  }, [dragPos]);

  const onTitleBarPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.mx;
    const dy = e.clientY - dragStart.current.my;
    setDragPos({ x: dragStart.current.wx + dx, y: dragStart.current.wy + dy });
  }, []);

  const onTitleBarPointerUp = useCallback(() => {
    dragStart.current = null;
  }, []);

  return (
    <div className="relative" ref={panelRef}>
      {/* Status dot trigger */}
      <button
        onClick={() => { setOpen(!open); if (!open) setDragPos(null); }}
        className={`flex items-center justify-center w-[24px] h-[24px] rounded-full transition-all duration-150 ${isLight ? "bg-black/[0.08] hover:bg-black/[0.12] border border-black/[0.08]" : "bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.08]"}`}
        title={`System: ${config.label}`}
      >
        <div className="relative">
          <div className="w-[7px] h-[7px] rounded-full" style={{ backgroundColor: config.color }} />
          {config.pulse && <div className="absolute inset-0 w-[7px] h-[7px] rounded-full animate-ping" style={{ backgroundColor: config.color, opacity: 0.4 }} />}
        </div>
      </button>

      {/* Modal Window */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="fixed inset-0 z-[8999] bg-black/30"
              style={{ backdropFilter: "blur(2px)" }}
              onClick={() => setOpen(false)}
            />

            {/* Window */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.15 }}
              className={`fixed z-[9000] w-[540px] rounded-lg border font-mono text-[9px] leading-snug overflow-hidden ${bgPanel}`}
              style={{
                top: "50%",
                left: "50%",
                transform: `translate(calc(-50% + ${dragPos?.x ?? 0}px), calc(-50% + ${dragPos?.y ?? 0}px))`,
                backdropFilter: "blur(24px)",
              }}
            >
              {/* ── OS Title Bar ── */}
              <div
                className={`flex items-center justify-between px-3 py-1.5 border-b ${border} cursor-default select-none`}
                onPointerDown={onTitleBarPointerDown}
                onPointerMove={onTitleBarPointerMove}
                onPointerUp={onTitleBarPointerUp}
                style={{ touchAction: "none" }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: config.color }} />
                  <span className={`text-[10px] font-semibold ${txt}`}>UOR Virtual OS · System Status</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {/* Minimize (decorative) */}
                  <button
                    className={`w-[14px] h-[14px] rounded-sm flex items-center justify-center text-[10px] leading-none transition-colors ${isLight ? "hover:bg-black/10 text-black/40" : "hover:bg-white/10 text-white/40"}`}
                    onClick={(e) => { e.stopPropagation(); }}
                    title="Minimize"
                  >
                    <span className="mt-[-2px]">─</span>
                  </button>
                  {/* Maximize (decorative) */}
                  <button
                    className={`w-[14px] h-[14px] rounded-sm flex items-center justify-center text-[10px] leading-none transition-colors ${isLight ? "hover:bg-black/10 text-black/40" : "hover:bg-white/10 text-white/40"}`}
                    onClick={(e) => { e.stopPropagation(); }}
                    title="Maximize"
                  >
                    □
                  </button>
                  {/* Close */}
                  <button
                    className={`w-[14px] h-[14px] rounded-sm flex items-center justify-center text-[10px] leading-none transition-colors hover:bg-red-500/80 hover:text-white ${isLight ? "text-black/40" : "text-white/40"}`}
                    onClick={(e) => { e.stopPropagation(); setOpen(false); }}
                    title="Close"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* ── Status Header ── */}
              <div className={`flex items-center justify-between px-3 py-2 border-b ${border}`}>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
                    {config.pulse && <div className="absolute inset-0 w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: config.color, opacity: 0.3 }} />}
                  </div>
                  <span className={`font-bold text-[10px] tracking-wide ${txt}`}>{config.label}</span>
                  <span className={`text-[9px] ${txtSub}`}>UOR/{getEngine().version}</span>
                </div>
                <button
                  onClick={handleCopyReport}
                  className={`text-[9px] px-2 py-0.5 rounded ${isLight ? "bg-black/5 hover:bg-black/10 text-black/60" : "bg-white/5 hover:bg-white/10 text-white/60"} transition-colors`}
                >
                  {copied ? "Copied ✓" : "Copy Report"}
                </button>
              </div>

              {receipt ? (
                <>
                  {/* ── Seal Glyph Strip ── */}
                  <div className={`px-3 py-1.5 text-center text-[11px] tracking-[0.15em] border-b ${border} ${txt}`}>
                    {receipt.seal.glyph}
                  </div>

                  {/* ── Two-Column Layout ── */}
                  <div className={`grid grid-cols-2 divide-x ${isLight ? "divide-black/[0.06]" : "divide-white/[0.06]"}`}>
                    {/* ═══ LEFT: Virtual Machine ═══ */}
                    <div className="px-3 py-2 space-y-2">
                      <div className={sectionHead}>Virtual Machine</div>

                      <div className="space-y-[3px]">
                        <KVRow label="Kernel" value={receipt.engineType === "wasm" ? "WASM (native)" : "TS (fallback)"} isLight={isLight} />
                        <KVRow label="Ring" value={ringOk ? "Verified ✓" : "FAILED ✗"} vColor={ringOk ? "#22c55e" : "#ef4444"} isLight={isLight} />
                        <KVRow label="Uptime" value={formatUptime(uptimeMs)} isLight={isLight} />
                        <KVRow label="Boot" value={`${receipt.bootTimeMs}ms`} isLight={isLight} />
                        <KVRow label="Modules" value={String(receipt.moduleCount)} isLight={isLight} />
                        {stackSummary && <KVRow label="Stack" value={`${stackSummary.available}/${stackSummary.total} ✓`} vColor={stackSummary.failing.length > 0 ? "#f59e0b" : "#22c55e"} isLight={isLight} />}
                      </div>

                      <div>
                        <div className={`${sectionHead} mb-1`}>Kernel Primitives</div>
                        {kernelData ? (
                          <div className="space-y-[2px]">
                            {kernelData.table.map((fn, i) => {
                              const ok = kernelData.verification.results.find(r => r.name === fn.name)?.ok ?? false;
                              return (
                                <div key={fn.name} className="flex items-center gap-1.5">
                                  <span className={`w-[18px] text-[8px] ${txtFaint}`}>P{FANO_SUB[i]}</span>
                                  <span className={`uppercase font-semibold flex-1 ${isLight ? "text-black/70" : "text-white/70"}`}>{fn.name}</span>
                                  <span className="w-[5px] h-[5px] rounded-full inline-block" style={{ backgroundColor: ok ? "#22c55e" : "#ef4444" }} />
                                </div>
                              );
                            })}
                            <div className={`text-[8px] mt-1 ${txtFaint}`}>
                              {kernelData.verification.allPassed ? "7/7 verified ✓" : "Incomplete ✗"}
                            </div>
                          </div>
                        ) : <div className={txtFaint}>Unavailable</div>}
                      </div>
                    </div>

                    {/* ═══ RIGHT: Host Device ═══ */}
                    <div className="px-3 py-2 space-y-2">
                      <div className={sectionHead}>Host Device</div>

                      <div className={`px-1.5 py-1 rounded text-[9px] font-semibold ${
                        receipt.provenance.context === "local"
                          ? isLight ? "bg-green-50 text-green-700" : "bg-green-900/30 text-green-400"
                          : isLight ? "bg-blue-50 text-blue-700" : "bg-blue-900/30 text-blue-400"
                      }`}>
                        {receipt.provenance.context === "local" ? "⬤ Projected Locally" : `⬤ Projected from ${receipt.provenance.hostname}`}
                      </div>

                      <div className="space-y-[3px]">
                        <KVRow label="CPU" value={`${receipt.provenance.hardware.cores} cores`} isLight={isLight} />
                        <KVRow label="Memory" value={receipt.provenance.hardware.memoryGb ? `${receipt.provenance.hardware.memoryGb} GB` : "Restricted"} isLight={isLight} />
                        <KVRow label="GPU" value={receipt.provenance.hardware.gpu ?? "Unknown"} isLight={isLight} />
                        <KVRow label="Display" value={`${receipt.provenance.hardware.screenWidth}×${receipt.provenance.hardware.screenHeight}`} isLight={isLight} />
                      </div>

                      <div>
                        <div className={`${sectionHead} mb-1`}>Capabilities</div>
                        <div className="space-y-[2px]">
                          <CapRow label="WASM" ok={receipt.provenance.hardware.wasmSupported} isLight={isLight} />
                          <CapRow label="SIMD" ok={receipt.provenance.hardware.simdSupported} isLight={isLight} />
                          <CapRow label="SAB" ok={typeof SharedArrayBuffer !== "undefined"} isLight={isLight} />
                          <CapRow label="Workers" ok={typeof Worker !== "undefined"} isLight={isLight} />
                          <CapRow label="Touch" ok={receipt.provenance.hardware.touchCapable} isLight={isLight} />
                        </div>
                      </div>

                      <div>
                        <div className={`${sectionHead} mb-1`}>Provenance</div>
                        <div className="space-y-[2px]">
                          <KVRow label="Context" value={receipt.provenance.context} isLight={isLight} />
                          <KVRow label="Hash" value={receipt.provenance.provenanceHash.slice(0, 12) + "…"} isLight={isLight} mono />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Issues Strip ── */}
                  {isDegraded && degradationLog.length > 0 && (
                    <div className={`px-3 py-1.5 border-t ${border} space-y-1`}>
                      {degradationLog.map((entry, i) => (
                        <div key={i} className={`flex items-start gap-1.5 text-[9px] ${isLight ? "text-amber-700" : "text-amber-400"}`}>
                          <span className="shrink-0">⚠</span>
                          <span><span className="font-semibold">{entry.component}:</span> {entry.issue}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── Footer ── */}
                  <div className={`px-3 py-1.5 border-t ${border} text-[8px] ${txtFaint} text-center`}>
                    Lattice-hash sealed · 128-bit preimage · Session {receipt.seal.sessionNonce.slice(0, 8)}
                  </div>
                </>
              ) : (
                <div className={`py-8 text-center ${txtSub}`}>Initializing…</div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Micro-components ────────────────────────────────────────────────────

function KVRow({ label, value, vColor, isLight, mono }: { label: string; value: string; vColor?: string; isLight: boolean; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className={isLight ? "text-black/45" : "text-white/45"}>{label}</span>
      <span className={`text-right ${mono ? "font-mono" : ""} ${isLight ? "text-black/80" : "text-white/80"}`} style={vColor ? { color: vColor } : undefined}>{value}</span>
    </div>
  );
}

function CapRow({ label, ok, isLight }: { label: string; ok: boolean; isLight: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={isLight ? "text-black/45" : "text-white/45"}>{label}</span>
      <div className="flex items-center gap-1">
        <span className={`text-[8px] ${ok ? (isLight ? "text-green-600" : "text-green-400") : (isLight ? "text-red-500" : "text-red-400")}`}>{ok ? "Yes" : "No"}</span>
        <span className="w-[5px] h-[5px] rounded-full inline-block" style={{ backgroundColor: ok ? "#22c55e" : "#ef4444" }} />
      </div>
    </div>
  );
}
