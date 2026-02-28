/**
 * GenesisPopover — Kernel heartbeat summary
 * ═══════════════════════════════════════════
 *
 * Appears when clicking the genesis dot in the sidebar.
 * Shows an intuitive, jargon-free summary of the living system.
 */

import { useEffect, useState, useCallback } from "react";
import { X } from "lucide-react";
import { boot, type QKernelBoot } from "@/hologram/kernel/q-boot";

interface GenesisPopoverProps {
  open: boolean;
  onClose: () => void;
  bgMode?: "image" | "white" | "dark";
}

export default function GenesisPopover({ open, onClose, bgMode = "image" }: GenesisPopoverProps) {
  const [kernel, setKernel] = useState<QKernelBoot | null>(null);

  useEffect(() => {
    if (open && !kernel) {
      try { setKernel(boot()); } catch { /* graceful */ }
    }
  }, [open, kernel]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const isLight = bgMode === "white";
  const bg = isLight ? "hsl(30, 12%, 97%)" : "hsl(25, 8%, 8%)";
  const border = isLight ? "hsla(30, 15%, 80%, 0.3)" : "hsla(38, 15%, 30%, 0.2)";
  const text = isLight ? "hsl(25, 8%, 20%)" : "hsl(30, 12%, 88%)";
  const textMuted = isLight ? "hsl(25, 8%, 50%)" : "hsl(30, 10%, 55%)";
  const gold = isLight ? "hsl(32, 40%, 45%)" : "hsl(38, 50%, 60%)";
  const dotColor = isLight ? "hsl(32, 40%, 50%)" : "hsla(38, 50%, 60%, 0.85)";
  const cardBg = isLight ? "hsla(30, 10%, 94%, 0.7)" : "hsla(38, 10%, 12%, 0.5)";
  const cardBorder = isLight ? "hsla(30, 15%, 80%, 0.2)" : "hsla(38, 15%, 30%, 0.12)";

  const stage = kernel?.stage ?? "off";
  const isRunning = stage === "running";
  const bootMs = kernel?.bootTimeMs ? kernel.bootTimeMs.toFixed(1) : "—";
  const checks = kernel?.post.checks ?? [];
  const passedCount = checks.filter(c => c.passed).length;

  return (
    <>
      {/* Scrim */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9800,
          background: isLight ? "hsla(0,0%,100%,0.3)" : "hsla(0,0%,0%,0.25)",
        }}
      />

      {/* Popover */}
      <div
        style={{
          position: "fixed",
          bottom: "80px",
          left: "80px",
          zIndex: 9900,
          width: "340px",
          maxHeight: "70vh",
          overflowY: "auto",
          background: bg,
          border: `1px solid ${border}`,
          borderRadius: "16px",
          boxShadow: isLight
            ? "0 8px 40px hsla(25, 15%, 20%, 0.1)"
            : "0 8px 40px hsla(25, 10%, 0%, 0.4)",
          fontFamily: "'DM Sans', system-ui, sans-serif",
          color: text,
          padding: "20px",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="rounded-full"
              style={{
                width: "8px",
                height: "8px",
                background: dotColor,
                boxShadow: `0 0 12px ${dotColor}`,
                animation: "heartbeat-love 2.4s ease-in-out infinite",
              }}
            />
            <span
              className="text-[13px] font-medium tracking-[0.15em] uppercase"
              style={{ color: gold }}
            >
              Genesis
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-md transition-colors"
            style={{ color: textMuted }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Why — the soul */}
        <p className="text-[13px] leading-relaxed mb-4" style={{ color: textMuted }}>
          This system is alive. Every time it wakes up, it runs a self-check — like a
          heartbeat — to make sure everything is genuine and nothing has been
          tampered with. Here's what just happened:
        </p>

        {/* Status */}
        <div
          className="rounded-xl px-3.5 py-3 mb-3 flex items-center justify-between"
          style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: isRunning ? "hsl(142, 55%, 50%)" : "hsl(0, 65%, 55%)",
                boxShadow: isRunning ? "0 0 8px hsla(142, 55%, 50%, 0.4)" : "none",
              }}
            />
            <span className="text-[12px] font-medium" style={{ color: text }}>
              {isRunning ? "System Healthy" : stage === "panic" ? "Integrity Alert" : "Starting…"}
            </span>
          </div>
          <span className="text-[11px]" style={{ color: textMuted }}>
            {bootMs}ms
          </span>
        </div>

        {/* Self-checks */}
        <div className="mb-3">
          <span className="text-[11px] uppercase tracking-[0.12em] font-medium" style={{ color: textMuted }}>
            Self-checks — {passedCount}/{checks.length} verified
          </span>
          <div className="mt-2 space-y-1.5">
            {checks.map((c, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: c.passed ? "hsl(142, 55%, 50%)" : "hsl(0, 65%, 55%)" }}
                />
                <span className="text-[12px]" style={{ color: text }}>{c.name}</span>
                <span className="text-[10px] ml-auto" style={{ color: textMuted }}>
                  {c.passed ? "✓" : "✗"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* What & How */}
        <div
          className="rounded-xl px-3.5 py-3 mb-3"
          style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
        >
          <span className="text-[11px] uppercase tracking-[0.12em] font-medium block mb-2" style={{ color: textMuted }}>
            What this means
          </span>
          <p className="text-[12px] leading-relaxed" style={{ color: text }}>
            Every piece of data in this system has a unique fingerprint. When the kernel boots,
            it verifies that the math behind those fingerprints is correct — that
            addition, hashing, and addressing all behave exactly as expected. If
            even one rule fails, the system refuses to start. This is how you know what
            you see is real.
          </p>
        </div>

        {/* Topology snapshot */}
        {kernel?.hardware && (
          <div
            className="rounded-xl px-3.5 py-3"
            style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
          >
            <span className="text-[11px] uppercase tracking-[0.12em] font-medium block mb-2" style={{ color: textMuted }}>
              Structure
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Vertices", value: kernel.hardware.vertexCount },
                { label: "Mirrors", value: kernel.hardware.mirrorPairs },
                { label: "Algebras", value: kernel.firmware.levels },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-[16px] font-medium" style={{ color: gold }}>{s.value}</div>
                  <div className="text-[10px]" style={{ color: textMuted }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
