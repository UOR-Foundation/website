/**
 * BootSequence — Real OS Boot Screen
 * ════════════════════════════════════
 *
 * Displays the actual sovereign boot sequence with precise, real-time
 * data from every phase. Shows exact parameters: device fingerprint,
 * WASM capabilities, kernel verification, namespace coverage, seal
 * computation, and final derivation hash.
 *
 * Boots from scratch every time the page is opened on any device.
 * On failure, shows a detailed exportable error log.
 *
 * @module desktop/BootSequence
 */

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback, useRef } from "react";
import type { BootProgress, BootReceipt } from "@/modules/boot/types";
import { sovereignBoot } from "@/modules/boot/sovereign-boot";

interface BootSequenceProps {
  onComplete: () => void;
}

interface BootLogEntry {
  ts: number;
  phase: string;
  detail: string;
  level: "info" | "ok" | "warn" | "error";
}

const PHASE_LABELS: Record<string, string> = {
  "device-fingerprint": "PHASE 0 — DEVICE PROVENANCE",
  "stack-validation": "PHASE 0.5 — STACK VALIDATION",
  "engine-init": "PHASE 1 — ENGINE INITIALIZATION",
  "bus-init": "PHASE 2 — BUS MANIFEST",
  "seal": "PHASE 3 — SEAL COMPUTATION",
  "monitor-start": "PHASE 4 — INTEGRITY MONITOR",
  "complete": "BOOT COMPLETE",
  "failed": "BOOT FAILED",
};

export default function BootSequence({ onComplete }: BootSequenceProps) {
  const [logs, setLogs] = useState<BootLogEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"booting" | "success" | "error">("booting");
  const [receipt, setReceipt] = useState<BootReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDesktop, setShowDesktop] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const t0 = useRef(performance.now());

  const addLog = useCallback((entry: Omit<BootLogEntry, "ts">) => {
    setLogs(prev => [...prev, { ...entry, ts: Math.round(performance.now() - t0.current) }]);
  }, []);

  useEffect(() => {
    // Scroll log to bottom
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    let cancelled = false;

    addLog({ phase: "init", detail: "UOR OS v2.0 — Sovereign Boot Sequence", level: "info" });
    addLog({ phase: "init", detail: `Platform: ${navigator.platform} | Cores: ${navigator.hardwareConcurrency || "?"}`, level: "info" });
    addLog({ phase: "init", detail: `Screen: ${screen.width}×${screen.height} @ ${window.devicePixelRatio}x`, level: "info" });
    addLog({ phase: "init", detail: `WASM: ${typeof WebAssembly !== "undefined" ? "supported" : "unavailable"}`, level: "info" });
    addLog({ phase: "init", detail: "────────────────────────────────────────", level: "info" });

    const handleProgress = (p: BootProgress) => {
      if (cancelled) return;
      setProgress(p.progress);
      const label = PHASE_LABELS[p.phase] || p.phase;
      if (p.detail) {
        addLog({ phase: label, detail: p.detail, level: "info" });
      }
    };

    sovereignBoot(handleProgress)
      .then((r) => {
        if (cancelled) return;
        setReceipt(r);

        // Log real boot results
        addLog({ phase: "KERNEL", detail: `7 Fano primitives: ${r.kernelHealth.allPassed ? "ALL PASSED" : "FAILED"}`, level: r.kernelHealth.allPassed ? "ok" : "error" });
        addLog({ phase: "KERNEL", detail: `Namespace coverage: ${r.kernelHealth.namespaceCoverage.covered}/${r.kernelHealth.namespaceCoverage.total}`, level: "ok" });
        addLog({ phase: "KERNEL", detail: `Minimality: ${r.kernelHealth.isMinimal ? "clean" : `${r.kernelHealth.overlaps.length} overlap(s)`}`, level: r.kernelHealth.isMinimal ? "ok" : "warn" });
        if (r.kernelHealth.manifestOrphans.length > 0) {
          addLog({ phase: "KERNEL", detail: `Manifest orphans: ${r.kernelHealth.manifestOrphans.join(", ")}`, level: "warn" });
        }

        addLog({ phase: "ENGINE", detail: `Backend: ${r.engineType.toUpperCase()} v${r.seal.derivationId.slice(0, 8)}…`, level: "ok" });
        addLog({ phase: "STACK", detail: `Components: ${r.stackHealth.components.length} | Critical: ${r.stackHealth.allCriticalPresent ? "✓" : "✗"}`, level: r.stackHealth.allCriticalPresent ? "ok" : "warn" });
        addLog({ phase: "BUS", detail: `Modules loaded: ${r.moduleCount}`, level: "ok" });

        addLog({ phase: "SEAL", detail: `Status: ${r.seal.status.toUpperCase()}`, level: r.seal.status === "sealed" ? "ok" : "warn" });
        addLog({ phase: "SEAL", detail: `Glyph: ${r.seal.glyph}`, level: "ok" });
        addLog({ phase: "SEAL", detail: `Ring hash: ${r.seal.ringTableHash.slice(0, 16)}…`, level: "ok" });
        addLog({ phase: "SEAL", detail: `Kernel hash: ${r.seal.kernelHash.slice(0, 16)}…`, level: "ok" });
        addLog({ phase: "SEAL", detail: `Derivation: ${r.seal.derivationId.slice(0, 32)}…`, level: "ok" });
        addLog({ phase: "────", detail: "────────────────────────────────────────", level: "info" });
        addLog({ phase: "DONE", detail: `Boot sealed in ${r.bootTimeMs}ms | ${r.provenance.context} | ${r.seal.glyph}`, level: "ok" });

        setPhase("success");

        // Brief pause to show the seal, then transition
        setTimeout(() => {
          if (!cancelled) setShowDesktop(true);
        }, 1800);

        setTimeout(() => {
          if (!cancelled) onComplete();
        }, 2600);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        addLog({ phase: "FATAL", detail: msg, level: "error" });
        setError(msg);
        setPhase("error");
      });

    return () => { cancelled = true; };
  }, [addLog, onComplete]);

  const exportLog = useCallback(() => {
    const text = logs
      .map(l => `[${String(l.ts).padStart(6)}ms] [${l.level.toUpperCase().padEnd(5)}] ${l.phase.padEnd(20)} ${l.detail}`)
      .join("\n");
    const header = `UOR OS Boot Log — ${new Date().toISOString()}\n${"=".repeat(72)}\n\n`;
    const blob = new Blob([header + text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `uor-boot-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  }, [logs]);

  const levelColor = (level: BootLogEntry["level"]) => {
    switch (level) {
      case "ok": return "text-emerald-400";
      case "warn": return "text-amber-400";
      case "error": return "text-red-400";
      default: return "text-white/50";
    }
  };

  const levelPrefix = (level: BootLogEntry["level"]) => {
    switch (level) {
      case "ok": return "✓";
      case "warn": return "⚠";
      case "error": return "✗";
      default: return "›";
    }
  };

  return (
    <AnimatePresence>
      {!showDesktop && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col bg-black"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Top bar — logo + title */}
          <div className="flex items-center gap-3 px-6 pt-5 pb-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 200 200"
              fill="none"
              stroke="rgba(212,168,83,0.7)"
              strokeWidth="0.8"
              className="w-8 h-8 flex-shrink-0"
            >
              <polygon points="100,10 177.3,55 177.3,145 100,190 22.7,145 22.7,55" />
              <polygon points="100,32 158,66 158,134 100,168 42,134 42,66" />
              <line x1="100" y1="10" x2="100" y2="190" />
              <line x1="22.7" y1="55" x2="177.3" y2="145" />
              <line x1="177.3" y1="55" x2="22.7" y2="145" />
              <circle cx="100" cy="100" r="2" fill="rgba(212,168,83,0.5)" stroke="none" />
            </svg>
            <div>
              <p className="text-white/70 text-xs tracking-[0.25em] font-light">
                UOR OS — SOVEREIGN BOOT
              </p>
              <p className="text-white/30 text-[10px] tracking-[0.1em]">
                Self-Verifying System Integrity Sequence
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {phase === "booting" && (
                <motion.div
                  className="w-2 h-2 rounded-full bg-amber-400/80"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
              {phase === "success" && <div className="w-2 h-2 rounded-full bg-emerald-400" />}
              {phase === "error" && <div className="w-2 h-2 rounded-full bg-red-400" />}
              <span className="text-white/30 text-[10px] font-mono">
                {phase === "booting" ? "BOOTING" : phase === "success" ? "SEALED" : "FAILED"}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="px-6">
            <div className="w-full h-[2px] bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: phase === "error"
                    ? "linear-gradient(90deg, #ef4444, #f87171)"
                    : "linear-gradient(90deg, #D4A853, #E8C97A)",
                }}
                initial={{ width: "0%" }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Log output — the core of the boot experience */}
          <div
            ref={logRef}
            className="flex-1 overflow-y-auto px-6 py-3 font-mono text-[11px] leading-[1.6] scroll-smooth"
            style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}
          >
            {logs.map((entry, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
                className="flex gap-2"
              >
                <span className="text-white/20 w-[60px] text-right flex-shrink-0 tabular-nums">
                  {entry.ts}ms
                </span>
                <span className={`w-3 flex-shrink-0 ${levelColor(entry.level)}`}>
                  {levelPrefix(entry.level)}
                </span>
                <span className="text-white/30 w-[140px] flex-shrink-0 truncate">
                  {entry.phase}
                </span>
                <span className={levelColor(entry.level)}>
                  {entry.detail}
                </span>
              </motion.div>
            ))}

            {/* Blinking cursor while booting */}
            {phase === "booting" && (
              <motion.span
                className="inline-block w-[6px] h-[13px] bg-amber-400/60 ml-[220px] mt-0.5"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            )}
          </div>

          {/* Bottom bar */}
          <div className="px-6 py-3 flex items-center justify-between border-t border-white/5">
            {/* Seal glyph on success */}
            {phase === "success" && receipt && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3"
              >
                <span className="text-2xl tracking-widest">{receipt.seal.glyph}</span>
                <div>
                  <p className="text-emerald-400/80 text-[10px] tracking-[0.15em]">
                    SYSTEM SEALED — {receipt.seal.status.toUpperCase()}
                  </p>
                  <p className="text-white/20 text-[9px] font-mono">
                    {receipt.seal.derivationId.slice(0, 48)}…
                  </p>
                </div>
              </motion.div>
            )}

            {/* Error state with export */}
            {phase === "error" && (
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-red-400/80 text-[10px] tracking-[0.15em]">
                    BOOT FAILED
                  </p>
                  <p className="text-white/30 text-[9px]">
                    {error?.slice(0, 80)}
                  </p>
                </div>
              </div>
            )}

            {phase === "booting" && (
              <p className="text-white/20 text-[10px] tracking-[0.1em]">
                Verifying system integrity…
              </p>
            )}

            <div className="flex items-center gap-2">
              {phase === "error" && (
                <>
                  <button
                    onClick={exportLog}
                    className="px-3 py-1.5 text-[10px] tracking-[0.1em] text-white/60 border border-white/10 rounded hover:bg-white/5 transition-colors"
                  >
                    EXPORT LOG
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-3 py-1.5 text-[10px] tracking-[0.1em] text-amber-400/80 border border-amber-400/20 rounded hover:bg-amber-400/5 transition-colors"
                  >
                    RETRY BOOT
                  </button>
                </>
              )}
              {phase === "success" && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-white/20 text-[10px]"
                >
                  Entering desktop…
                </motion.p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
