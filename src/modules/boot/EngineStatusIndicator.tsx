/**
 * EngineStatusIndicator — System Health Monitor Widget
 *
 * Shows a single status dot indicating system integrity.
 * Click opens a diagnostic panel with:
 *   - Single seal hash (system proof)
 *   - Kernel health (ring integrity)
 *   - Tech stack validation
 *   - Engine & module status
 *   - Device context
 *   - Detailed degradation log (copyable as markdown)
 *
 * All fields are canonically wired to live system state.
 *
 * @module boot/EngineStatusIndicator
 */

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useBootStatus } from "./useBootStatus";
import type { SealStatus, BootReceipt } from "./types";
import { motion, AnimatePresence } from "framer-motion";
import { getEngine } from "@/modules/engine";
import { SELECTION_POLICY } from "./tech-stack";
import { getKernelDeclaration, verifyKernel } from "@/modules/engine/kernel-declaration";

// ── Status configuration ────────────────────────────────────────────────

interface StatusConfig {
  color: string;
  label: string;
  description: string;
  pulse: boolean;
}

const STATUS_CONFIG: Record<
  SealStatus | "booting" | "failed",
  StatusConfig
> = {
  sealed: {
    color: "#22c55e",
    label: "Sealed",
    description: "All systems verified and operational",
    pulse: false,
  },
  degraded: {
    color: "#f59e0b",
    label: "Degraded",
    description: "Running with reduced capability — see details below",
    pulse: true,
  },
  unsealed: {
    color: "#ef4444",
    label: "Integrity Failure",
    description: "System verification failed — seal is broken",
    pulse: true,
  },
  broken: {
    color: "#ef4444",
    label: "Compromised",
    description: "Continuous monitoring detected tampering",
    pulse: true,
  },
  booting: {
    color: "#6b7280",
    label: "Starting",
    description: "System is initializing…",
    pulse: true,
  },
  failed: {
    color: "#ef4444",
    label: "Boot Failed",
    description: "System could not start — check console",
    pulse: true,
  },
};

// ── Degradation reason builder ──────────────────────────────────────────

interface DegradationEntry {
  component: string;
  issue: string;
  impact: string;
}

function buildDegradationLog(
  receipt: BootReceipt | null,
  status: SealStatus | "booting" | "failed",
): DegradationEntry[] {
  const entries: DegradationEntry[] = [];

  if (!receipt) {
    if (status === "failed") {
      entries.push({
        component: "Boot Sequence",
        issue: "Boot did not complete",
        impact: "System is non-functional. No seal was produced.",
      });
    }
    return entries;
  }

  // Engine fallback
  if (receipt.engineType === "typescript") {
    entries.push({
      component: "Compute Engine",
      issue: "WASM binary did not load — using TypeScript fallback",
      impact:
        "All math is identical but the binary integrity hash is absent. Performance may be slightly lower for heavy computations.",
    });
  }

  // Missing critical stack components
  if (receipt.stackHealth) {
    for (const comp of receipt.stackHealth.components) {
      if (!comp.available && comp.criticality === "critical") {
        entries.push({
          component: comp.name,
          issue: `Critical component unavailable`,
          impact: `Fallback: ${comp.fallback}`,
        });
      }
    }
  }

  // Seal broken
  if (status === "broken") {
    entries.push({
      component: "Seal Monitor",
      issue: "Re-verification detected a hash mismatch",
      impact:
        "The system's canonical bytes no longer produce the original seal. This could indicate memory corruption or code injection.",
    });
  }

  // Unsealed
  if (status === "unsealed") {
    entries.push({
      component: "Ring Algebra",
      issue: "Ring identity verification failed for one or more elements",
      impact:
        "The algebraic framework is unsound. Derivation IDs produced in this session cannot be trusted.",
    });
  }

  return entries;
}

function formatMarkdownReport(
  receipt: BootReceipt | null,
  status: SealStatus | "booting" | "failed",
  lastVerified: string | null,
  entries: DegradationEntry[],
): string {
  const lines: string[] = [];
  const now = new Date().toISOString();

  lines.push("# System Health Report");
  lines.push("");
  lines.push(`**Generated:** ${now}`);
  lines.push(`**Status:** ${STATUS_CONFIG[status]?.label ?? status}`);
  lines.push("");

  if (receipt) {
    lines.push("## System Seal");
    lines.push("");
    lines.push(`- **Seal Hash:** \`${receipt.seal.derivationId}\``);
    lines.push(`- **Visual Glyph:** ${receipt.seal.glyph}`);
    lines.push(`- **Boot Time:** ${receipt.bootTimeMs}ms`);
    lines.push(`- **Sealed At:** ${receipt.seal.bootedAt}`);
    lines.push(
      `- **Last Verified:** ${lastVerified ? new Date(lastVerified).toISOString() : "pending"}`,
    );
    lines.push("");
    lines.push("## Kernel");
    lines.push("");
    lines.push(
      `- **Engine:** ${receipt.engineType === "wasm" ? "WASM (native)" : "TypeScript (fallback)"}`,
    );
    lines.push(`- **Crate Version:** ${getEngine().version}`);
    lines.push(`- **Modules Loaded:** ${receipt.moduleCount}`);
    lines.push(
      `- **Ring Integrity:** ${status === "unsealed" || status === "broken" ? "FAILED ✗" : "Verified ✓"}`,
    );
    lines.push("");

    if (receipt.stackHealth) {
      lines.push("## Tech Stack");
      lines.push("");
      lines.push(`- **Stack Hash:** \`${receipt.stackHealth.stackHash.slice(0, 16)}…\``);
      lines.push(`- **All Critical Present:** ${receipt.stackHealth.allCriticalPresent ? "Yes ✓" : "No ✗"}`);
      lines.push("");
      lines.push("| Component | Role | Status | Version |");
      lines.push("|---|---|---|---|");
      for (const c of receipt.stackHealth.components) {
        lines.push(
          `| ${c.name} | ${c.role.split("—")[0].trim()} | ${c.available ? "✓" : "✗"} | ${c.version ?? "—"} |`,
        );
      }
      lines.push("");
    }

    lines.push("## Device Context");
    lines.push("");
    lines.push(
      `- **Execution:** ${receipt.provenance.context === "local" ? "Local device" : `Remote (${receipt.provenance.hostname})`}`,
    );
    lines.push(`- **CPU Cores:** ${receipt.provenance.hardware.cores}`);
    lines.push(
      `- **WASM Support:** ${receipt.provenance.hardware.wasmSupported ? "Yes" : "No"}`,
    );
    lines.push(
      `- **SIMD Support:** ${receipt.provenance.hardware.simdSupported ? "Yes" : "No"}`,
    );
  }

  if (entries.length > 0) {
    lines.push("");
    lines.push("## Degradation Details");
    lines.push("");
    for (const e of entries) {
      lines.push(`### ${e.component}`);
      lines.push("");
      lines.push(`- **Issue:** ${e.issue}`);
      lines.push(`- **Impact:** ${e.impact}`);
      lines.push("");
    }
  }

  lines.push("---");
  lines.push("*Lattice-hash sealed · 128-bit preimage resistance*");

  return lines.join("\n");
}

// ── Component ───────────────────────────────────────────────────────────

interface EngineStatusIndicatorProps {
  isLight?: boolean;
}

export default function EngineStatusIndicator({
  isLight = false,
}: EngineStatusIndicatorProps) {
  const { receipt, status, lastVerified } = useBootStatus();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.booting;

  const degradationLog = useMemo(
    () => buildDegradationLog(receipt, status),
    [receipt, status],
  );

  const isDegraded =
    status === "degraded" ||
    status === "broken" ||
    status === "unsealed" ||
    status === "failed";

  // Truncated seal for display
  const sealDisplay = useMemo(() => {
    if (!receipt?.seal.derivationId) return "—";
    return receipt.seal.derivationId;
  }, [receipt]);

  // Ring integrity check (live)
  const ringOk = useMemo(() => {
    if (!receipt) return false;
    try {
      const e = getEngine();
      return e.neg(e.bnot(0)) === e.succ(0) && e.neg(e.bnot(255)) === e.succ(255);
    } catch {
      return false;
    }
  }, [receipt, lastVerified]);

  const handleCopyReport = useCallback(() => {
    const md = formatMarkdownReport(receipt, status, lastVerified, degradationLog);
    navigator.clipboard.writeText(md).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [receipt, status, lastVerified, degradationLog]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const textMuted = isLight ? "text-black/50" : "text-white/50";
  const textMain = isLight ? "text-black/80" : "text-white/80";
  const textSub = isLight ? "text-black/60" : "text-white/60";
  const borderSub = isLight ? "border-black/5" : "border-white/5";
  const bgPanel = isLight
    ? "bg-white/95 border-black/10 shadow-lg"
    : "bg-black/90 border-white/10 shadow-2xl";

  return (
    <div className="relative" ref={panelRef}>
      {/* Status dot */}
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-center w-[24px] h-[24px] rounded-full transition-all duration-150
          ${isLight
            ? "bg-black/[0.08] hover:bg-black/[0.12] border border-black/[0.08]"
            : "bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.08]"
          }
        `}
        title={`System: ${config.label}`}
      >
        <div className="relative">
          <div
            className="w-[7px] h-[7px] rounded-full"
            style={{ backgroundColor: config.color }}
          />
          {config.pulse && (
            <div
              className="absolute inset-0 w-[7px] h-[7px] rounded-full animate-ping"
              style={{ backgroundColor: config.color, opacity: 0.4 }}
            />
          )}
        </div>
      </button>

      {/* Diagnostic panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className={`absolute right-0 top-8 z-[9000] w-80 max-h-[70vh] overflow-y-auto rounded-lg border p-3 text-[10px] leading-relaxed font-mono ${bgPanel}`}
            style={{ backdropFilter: "blur(24px)" }}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: config.color }}
                />
                <span className={`font-semibold text-[11px] ${textMain}`}>
                  {config.label}
                </span>
              </div>
              <button
                onClick={handleCopyReport}
                className={`text-[9px] px-1.5 py-0.5 rounded ${
                  isLight
                    ? "bg-black/5 hover:bg-black/10 text-black/60"
                    : "bg-white/5 hover:bg-white/10 text-white/60"
                } transition-colors`}
                title="Copy full report as Markdown"
              >
                {copied ? "Copied ✓" : "Copy Report"}
              </button>
            </div>

            {/* Status description */}
            <p className={`text-[9px] mb-3 ${textSub}`}>
              {config.description}
            </p>

            {receipt ? (
              <div className="space-y-3">
                {/* ── Section: System Seal ── */}
                <Section title="System Seal" isLight={isLight}>
                  <div className="space-y-1">
                    <div className={`text-[9px] break-all ${textSub}`}>
                      {sealDisplay}
                    </div>
                    <div className={`text-sm tracking-wider ${textMain}`}>
                      {receipt.seal.glyph}
                    </div>
                  </div>
                </Section>

                {/* ── Section: Kernel ── */}
                <Section title="Kernel" isLight={isLight}>
                  <Row
                    label="Engine"
                    value={
                      receipt.engineType === "wasm"
                        ? "WASM (native)"
                        : "TypeScript (fallback)"
                    }
                    isLight={isLight}
                  />
                  <Row
                    label="Ring Integrity"
                    value={ringOk ? "Verified ✓" : "FAILED ✗"}
                    valueColor={ringOk ? "#22c55e" : "#ef4444"}
                    isLight={isLight}
                  />
                  <Row
                    label="Modules"
                    value={String(receipt.moduleCount)}
                    isLight={isLight}
                  />
                  <Row
                    label="Crate"
                    value={`v${getEngine().version}`}
                    isLight={isLight}
                  />
                </Section>

                {/* ── Section: Selection Policy ── */}
                <Section title="Selection Policy" isLight={isLight}>
                  <div className={`text-[8px] leading-snug space-y-0.5 ${isLight ? "text-black/40" : "text-white/40"}`}>
                    {SELECTION_POLICY.map((c) => (
                      <div key={c.name} className="flex gap-1">
                        <span className={`font-semibold shrink-0 ${isLight ? "text-black/60" : "text-white/60"}`}>
                          {c.name}:
                        </span>
                        <span>{c.definition}</span>
                      </div>
                    ))}
                  </div>
                </Section>

                {/* ── Section: Kernel Functions (Fano P₀–P₆) ── */}
                <KernelFunctionsSection isLight={isLight} />

                {/* ── Section: Tech Stack ── */}
                {receipt.stackHealth && (
                  <Section title="Tech Stack" isLight={isLight}>
                    <div className="space-y-0.5">
                      {receipt.stackHealth.components.map((comp) => (
                        <div
                          key={comp.name}
                          className="flex items-center justify-between"
                        >
                          <span className={`truncate pr-2 ${isLight ? "text-black/50" : "text-white/50"}`}>
                            {comp.name}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {comp.version && (
                              <span className={`text-[8px] ${isLight ? "text-black/30" : "text-white/30"}`}>
                                {comp.version}
                              </span>
                            )}
                            <span
                              className="w-1.5 h-1.5 rounded-full inline-block"
                              style={{
                                backgroundColor: comp.available
                                  ? "#22c55e"
                                  : comp.criticality === "critical"
                                    ? "#ef4444"
                                    : "#f59e0b",
                              }}
                              title={
                                comp.available
                                  ? `${comp.role}`
                                  : `Missing — ${comp.fallback}`
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className={`mt-1 text-[8px] ${isLight ? "text-black/30" : "text-white/30"}`}>
                      Stack hash: {receipt.stackHealth.stackHash.slice(0, 12)}…
                    </div>
                  </Section>
                )}

                {/* ── Section: Monitoring ── */}
                <Section title="Monitoring" isLight={isLight}>
                  <Row
                    label="Boot Time"
                    value={`${receipt.bootTimeMs}ms`}
                    isLight={isLight}
                  />
                  <Row
                    label="Sealed At"
                    value={new Date(receipt.seal.bootedAt).toLocaleTimeString()}
                    isLight={isLight}
                  />
                  {lastVerified && (
                    <Row
                      label="Last Verified"
                      value={new Date(lastVerified).toLocaleTimeString()}
                      isLight={isLight}
                    />
                  )}
                </Section>

                {/* ── Section: Device ── */}
                <Section title="Device Context" isLight={isLight}>
                  <div
                    className={`px-1.5 py-1 rounded text-[9px] ${
                      receipt.provenance.context === "local"
                        ? isLight
                          ? "bg-green-50 text-green-700"
                          : "bg-green-900/30 text-green-400"
                        : isLight
                          ? "bg-amber-50 text-amber-700"
                          : "bg-amber-900/30 text-amber-400"
                    }`}
                  >
                    {receipt.provenance.context === "local"
                      ? "Running locally on this device"
                      : `Projected from: ${receipt.provenance.hostname}`}
                    <div className="opacity-60 mt-0.5">
                      Self-reported device context
                    </div>
                  </div>
                  <Row
                    label="CPU Cores"
                    value={String(receipt.provenance.hardware.cores)}
                    isLight={isLight}
                  />
                </Section>

                {/* ── Section: Degradation Log ── */}
                {isDegraded && degradationLog.length > 0 && (
                  <Section title="⚠ Degradation Details" isLight={isLight}>
                    <div className="space-y-2">
                      {degradationLog.map((entry, i) => (
                        <div
                          key={i}
                          className={`px-1.5 py-1.5 rounded text-[9px] ${
                            isLight
                              ? "bg-amber-50 border border-amber-200"
                              : "bg-amber-900/20 border border-amber-800/30"
                          }`}
                        >
                          <div
                            className={`font-semibold mb-0.5 ${
                              isLight ? "text-amber-800" : "text-amber-300"
                            }`}
                          >
                            {entry.component}
                          </div>
                          <div
                            className={
                              isLight ? "text-amber-700" : "text-amber-400"
                            }
                          >
                            {entry.issue}
                          </div>
                          <div
                            className={`mt-0.5 opacity-70 ${
                              isLight ? "text-amber-600" : "text-amber-500"
                            }`}
                          >
                            {entry.impact}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* ── Footer ── */}
                <div
                  className={`pt-1.5 border-t text-[8px] opacity-40 ${borderSub}`}
                >
                  Lattice-hash sealed · 128-bit preimage resistance
                </div>
              </div>
            ) : (
              <div className={`py-4 text-center ${textMuted}`}>
                Initializing…
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────

function KernelFunctionsSection({ isLight }: { isLight: boolean }) {
  const kernelData = useMemo(() => {
    try {
      const table = getKernelDeclaration();
      const verification = verifyKernel();
      return { table, verification };
    } catch {
      return null;
    }
  }, []);

  if (!kernelData) return null;

  const FANO_SUBSCRIPTS = ["₀", "₁", "₂", "₃", "₄", "₅", "₆"];

  return (
    <Section title="Kernel Functions (Fano Plane)" isLight={isLight}>
      <div className="space-y-0.5">
        {kernelData.table.map((fn, i) => {
          const result = kernelData.verification.results.find((r) => r.name === fn.name);
          const ok = result?.ok ?? false;
          return (
            <div key={fn.name} className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className={`text-[8px] font-mono ${isLight ? "text-black/30" : "text-white/30"}`}>
                  P{FANO_SUBSCRIPTS[i]}
                </span>
                <span className={`uppercase text-[9px] font-semibold ${isLight ? "text-black/70" : "text-white/70"}`}>
                  {fn.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[7px] truncate max-w-[90px] ${isLight ? "text-black/30" : "text-white/30"}`}>
                  {fn.framework}
                </span>
                <span
                  className="w-1.5 h-1.5 rounded-full inline-block shrink-0"
                  style={{ backgroundColor: ok ? "#22c55e" : "#ef4444" }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className={`mt-1 text-[8px] ${isLight ? "text-black/30" : "text-white/30"}`}>
        {kernelData.verification.allPassed ? "All 7 primitives verified ✓" : "Kernel verification incomplete ✗"}
      </div>
    </Section>
  );
}

function Section({
  title,
  isLight,
  children,
}: {
  title: string;
  isLight: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        className={`text-[9px] font-semibold uppercase tracking-wider mb-1 ${
          isLight ? "text-black/40" : "text-white/40"
        }`}
      >
        {title}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  valueColor,
  isLight,
}: {
  label: string;
  value: string;
  valueColor?: string;
  isLight: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className={isLight ? "text-black/50" : "text-white/50"}>
        {label}
      </span>
      <span
        className={`text-right ${isLight ? "text-black/80" : "text-white/80"}`}
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </span>
    </div>
  );
}
