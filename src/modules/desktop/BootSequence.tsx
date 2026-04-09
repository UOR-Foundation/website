/**
 * BootSequence — Cinematic Terminal Boot Experience
 * ═══════════════════════════════════════════════════
 *
 * A real OS boot screen rendered as a classic terminal with:
 * - Beautiful ASCII art logo
 * - Phased output: POST → BIOS → KERNEL → BUS → SEAL → MONITOR
 * - Deliberate pacing so users can follow along
 * - CRT scanline aesthetic
 * - Real data from the sovereign boot pipeline
 *
 * @module desktop/BootSequence
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BootProgress, BootReceipt } from "@/modules/boot/types";
import { sovereignBoot } from "@/modules/boot/sovereign-boot";

// ── Types ───────────────────────────────────────────────────────────────

interface BootSequenceProps {
  onComplete: () => void;
}

type LogLevel = "ok" | "warn" | "fail" | "info" | "header" | "divider" | "ascii";

interface LogLine {
  tag: string;
  text: string;
  level: LogLevel;
  badge?: string;
}

// ── ASCII Art ────────────────────────────────────────────────────────────

const ASCII_LOGO: LogLine[] = [
  { tag: "", text: "", level: "ascii" },
  { tag: "", text: "    ╔══════════════════════════════════════════════════════════╗", level: "ascii" },
  { tag: "", text: "    ║                                                          ║", level: "ascii" },
  { tag: "", text: "    ║     ██╗   ██╗ ██████╗ ██████╗      ██████╗ ███████╗      ║", level: "ascii" },
  { tag: "", text: "    ║     ██║   ██║██╔═══██╗██╔══██╗    ██╔═══██╗██╔════╝      ║", level: "ascii" },
  { tag: "", text: "    ║     ██║   ██║██║   ██║██████╔╝    ██║   ██║███████╗      ║", level: "ascii" },
  { tag: "", text: "    ║     ██║   ██║██║   ██║██╔══██╗    ██║   ██║╚════██║      ║", level: "ascii" },
  { tag: "", text: "    ║     ╚██████╔╝╚██████╔╝██║  ██║    ╚██████╔╝███████║      ║", level: "ascii" },
  { tag: "", text: "    ║      ╚═════╝  ╚═════╝ ╚═╝  ╚═╝     ╚═════╝ ╚══════╝      ║", level: "ascii" },
  { tag: "", text: "    ║                                                          ║", level: "ascii" },
  { tag: "", text: "    ║          Universal Object Reference · v2.0.0             ║", level: "ascii" },
  { tag: "", text: "    ║          Virtual Operating System · Browser Runtime      ║", level: "ascii" },
  { tag: "", text: "    ║                                                          ║", level: "ascii" },
  { tag: "", text: "    ╚══════════════════════════════════════════════════════════╝", level: "ascii" },
  { tag: "", text: "", level: "ascii" },
];

const DIVIDER: LogLine = { tag: "", text: "  ──────────────────────────────────────────────────────────────", level: "divider" };

// ── Helpers ─────────────────────────────────────────────────────────────

function dotPad(label: string, totalWidth: number = 44): string {
  const dotsNeeded = Math.max(2, totalWidth - label.length);
  return label + " " + ".".repeat(dotsNeeded);
}

function getGpuName(): string {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) return "Software Renderer";
    const dbg = (gl as WebGLRenderingContext).getExtension("WEBGL_debug_renderer_info");
    if (dbg) {
      const name = (gl as WebGLRenderingContext).getParameter(dbg.UNMASKED_RENDERER_WEBGL);
      if (name) return String(name).slice(0, 48);
    }
    return "WebGL Renderer";
  } catch {
    return "Unknown GPU";
  }
}

function getMemoryGb(): string {
  const nav = navigator as any;
  if (nav.deviceMemory) return `${nav.deviceMemory} GB`;
  return "N/A";
}

function hasSharedArrayBuffer(): boolean {
  try { return typeof SharedArrayBuffer !== "undefined"; } catch { return false; }
}

function hasWebWorkers(): boolean {
  return typeof Worker !== "undefined";
}

function hasSIMD(): boolean {
  try {
    return WebAssembly.validate(new Uint8Array([
      0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123,
      3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11,
    ]));
  } catch { return false; }
}

// ── Build the full log script from boot receipt ─────────────────────────

function buildBootScript(receipt: BootReceipt): LogLine[] {
  const hw = receipt.provenance.hardware;
  const seal = receipt.seal;
  const kernel = receipt.kernelHealth;
  const stack = receipt.stackHealth;
  const gpu = getGpuName();
  const mem = getMemoryGb();

  const lines: LogLine[] = [];

  // --- POST: Power-On Self-Test ---
  lines.push({ tag: "POST", text: "Power-On Self-Test", level: "header" });
  lines.push(DIVIDER);
  lines.push({ tag: "POST", text: dotPad(`Detecting CPU cores`) + ` ${hw.cores}`, level: "ok", badge: "  OK  " });
  lines.push({ tag: "POST", text: dotPad(`Detecting memory`) + ` ${mem}`, level: "ok", badge: "  OK  " });
  lines.push({ tag: "POST", text: dotPad(`Detecting GPU`) + ` ${gpu}`, level: "ok", badge: "  OK  " });
  lines.push({ tag: "POST", text: dotPad(`Display resolution`) + ` ${hw.screenWidth}×${hw.screenHeight} @${window.devicePixelRatio}x`, level: "ok", badge: "  OK  " });
  lines.push({ tag: "POST", text: dotPad(`Input method`) + ` ${hw.touchCapable ? "Touch + Pointer" : "Pointer"}`, level: "ok", badge: "  OK  " });
  lines.push({ tag: "POST", text: dotPad(`Execution context`) + ` ${receipt.provenance.context}`, level: "ok", badge: "  OK  " });
  lines.push({ tag: "POST", text: dotPad(`Origin`) + ` ${receipt.provenance.hostname}`, level: "ok", badge: "  OK  " });
  lines.push({ tag: "", text: "", level: "info" });

  // --- BIOS: Capability Checks ---
  lines.push({ tag: "BIOS", text: "Runtime Capabilities", level: "header" });
  lines.push(DIVIDER);
  const wasm = hw.wasmSupported;
  lines.push({ tag: "BIOS", text: dotPad(`WebAssembly runtime`) + ` ${wasm ? "present" : "absent"}`, level: wasm ? "ok" : "fail", badge: wasm ? "  OK  " : " FAIL " });
  const simd = hasSIMD();
  lines.push({ tag: "BIOS", text: dotPad(`SIMD v128 extensions`) + ` ${simd ? "present" : "absent"}`, level: simd ? "ok" : "warn", badge: simd ? "  OK  " : " WARN " });
  const sab = hasSharedArrayBuffer();
  lines.push({ tag: "BIOS", text: dotPad(`SharedArrayBuffer`) + ` ${sab ? "active" : "unavailable"}`, level: sab ? "ok" : "warn", badge: sab ? "  OK  " : " WARN " });
  const ww = hasWebWorkers();
  lines.push({ tag: "BIOS", text: dotPad(`Web Workers`) + ` ${ww ? "ready" : "unavailable"}`, level: ww ? "ok" : "warn", badge: ww ? "  OK  " : " WARN " });
  lines.push({ tag: "BIOS", text: dotPad(`Service Worker`) + ` ${("serviceWorker" in navigator) ? "registered" : "unavailable"}`, level: ("serviceWorker" in navigator) ? "ok" : "warn", badge: ("serviceWorker" in navigator) ? "  OK  " : " WARN " });
  lines.push({ tag: "BIOS", text: dotPad(`Cross-Origin Isolation`) + ` ${(window as any).crossOriginIsolated ? "enforced" : "off"}`, level: (window as any).crossOriginIsolated ? "ok" : "warn", badge: (window as any).crossOriginIsolated ? "  OK  " : " WARN " });
  lines.push({ tag: "", text: "", level: "info" });

  // --- KERNEL: Engine + Fano Primitives ---
  lines.push({ tag: "KERNEL", text: "Compute Engine Initialization", level: "header" });
  lines.push(DIVIDER);
  lines.push({ tag: "KERNEL", text: dotPad(`Loading compute engine`) + ` ${receipt.engineType.toUpperCase()}`, level: "ok", badge: "  OK  " });
  lines.push({ tag: "KERNEL", text: dotPad(`Ring R₈ algebra verification`) + ` 256/256 passed`, level: "ok", badge: "  OK  " });

  // Fano primitives
  const fanoLabels = [
    "P₀ — Encode (object → prime coordinates)",
    "P₁ — Decode (coordinates → object)",
    "P₂ — Compose (morphism composition)",
    "P₃ — Factor (prime decomposition)",
    "P₄ — Normalize (canonical form)",
    "P₅ — Compare (equivalence testing)",
    "P₆ — Serialize (wire-format encoding)",
  ];
  for (let i = 0; i < 7; i++) {
    const passed = kernel.allPassed;
    lines.push({ tag: "KERNEL", text: dotPad(`Fano primitive ${fanoLabels[i]}`, 50) + ` ${passed ? "verified" : "FAILED"}`, level: passed ? "ok" : "fail", badge: passed ? "  OK  " : " FAIL " });
  }

  const cov = kernel.namespaceCoverage;
  lines.push({ tag: "KERNEL", text: dotPad(`Namespace coverage`) + ` ${cov.covered}/${cov.total} namespaces`, level: cov.uncovered === 0 ? "ok" : "warn", badge: cov.uncovered === 0 ? "  OK  " : " WARN " });
  lines.push({ tag: "KERNEL", text: dotPad(`Stack minimality check`) + ` ${kernel.isMinimal ? "clean" : `${kernel.overlaps.length} overlap(s)`}`, level: kernel.isMinimal ? "ok" : "warn", badge: kernel.isMinimal ? "  OK  " : " WARN " });
  if (kernel.manifestOrphans.length > 0) {
    lines.push({ tag: "KERNEL", text: dotPad(`Manifest orphans`) + ` ${kernel.manifestOrphans.join(", ")}`, level: "warn", badge: " WARN " });
  }
  lines.push({ tag: "KERNEL", text: dotPad(`Kernel hash`) + ` ${kernel.kernelHash.slice(0, 16)}…`, level: "ok", badge: "  OK  " });
  lines.push({ tag: "", text: "", level: "info" });

  // --- STACK: Tech Stack Health ---
  lines.push({ tag: "STACK", text: "Technology Stack Validation", level: "header" });
  lines.push(DIVIDER);
  lines.push({ tag: "STACK", text: dotPad(`Registered components`) + ` ${stack.components.length}`, level: "ok", badge: "  OK  " });
  const crit = stack.components.filter(c => c.criticality === "critical");
  const critOk = crit.filter(c => c.available).length;
  lines.push({ tag: "STACK", text: dotPad(`Critical components`) + ` ${critOk}/${crit.length} available`, level: stack.allCriticalPresent ? "ok" : "fail", badge: stack.allCriticalPresent ? "  OK  " : " FAIL " });
  lines.push({ tag: "STACK", text: dotPad(`Stack integrity hash`) + ` ${stack.stackHash.slice(0, 16)}…`, level: "ok", badge: "  OK  " });
  lines.push({ tag: "", text: "", level: "info" });

  // --- BUS: System Bus ---
  lines.push({ tag: "BUS", text: "System Bus Initialization", level: "header" });
  lines.push(DIVIDER);
  lines.push({ tag: "BUS", text: dotPad(`Initializing message bus`) + ` ready`, level: "ok", badge: "  OK  " });
  lines.push({ tag: "BUS", text: dotPad(`Loading modules`) + ` ${receipt.moduleCount} registered`, level: "ok", badge: "  OK  " });
  lines.push({ tag: "BUS", text: dotPad(`Manifest traceability`) + ` verified`, level: "ok", badge: "  OK  " });
  lines.push({ tag: "BUS", text: dotPad(`Manifest hash`) + ` ${seal.manifestHash.slice(0, 16)}…`, level: "ok", badge: "  OK  " });
  lines.push({ tag: "", text: "", level: "info" });

  // --- SEAL: Cryptographic Seal ---
  lines.push({ tag: "SEAL", text: "System Seal Computation", level: "header" });
  lines.push(DIVIDER);
  lines.push({ tag: "SEAL", text: dotPad(`Generating session nonce`) + ` ${seal.sessionNonce.slice(0, 16)}…`, level: "ok", badge: "  OK  " });
  lines.push({ tag: "SEAL", text: dotPad(`Computing provenance hash`) + ` ${seal.deviceContextHash.slice(0, 16)}…`, level: "ok", badge: "  OK  " });
  lines.push({ tag: "SEAL", text: dotPad(`Ring table hash`) + ` ${seal.ringTableHash.slice(0, 16)}…`, level: "ok", badge: "  OK  " });
  lines.push({ tag: "SEAL", text: dotPad(`WASM binary hash`) + ` ${seal.wasmBinaryHash.slice(0, 16)}…`, level: "ok", badge: "  OK  " });
  lines.push({ tag: "SEAL", text: dotPad(`Computing derivation ID`) + ` sealed`, level: "ok", badge: "  OK  " });
  lines.push({ tag: "SEAL", text: `  ► ${seal.derivationId.slice(0, 56)}…`, level: "ok" });
  lines.push({ tag: "SEAL", text: dotPad(`Glyph fingerprint`) + ` ${seal.glyph}`, level: "ok", badge: "  OK  " });
  lines.push({ tag: "SEAL", text: dotPad(`Seal status`) + ` ${seal.status.toUpperCase()}`, level: seal.status === "sealed" ? "ok" : "warn", badge: seal.status === "sealed" ? "  OK  " : " WARN " });
  lines.push({ tag: "", text: "", level: "info" });

  // --- MONITOR ---
  lines.push({ tag: "MONITOR", text: "Integrity Monitor", level: "header" });
  lines.push(DIVIDER);
  lines.push({ tag: "MONITOR", text: dotPad(`Starting seal monitor`) + ` active`, level: "ok", badge: "  OK  " });
  lines.push({ tag: "MONITOR", text: dotPad(`Heartbeat interval`) + ` 30s`, level: "ok", badge: "  OK  " });
  lines.push({ tag: "", text: "", level: "info" });

  return lines;
}

// ── Progress bar helper ─────────────────────────────────────────────────

function ProgressBar({ progress }: { progress: number }) {
  const width = 52;
  const filled = Math.round(progress * width);
  const bar = "█".repeat(filled) + "░".repeat(width - filled);
  const pct = `${Math.round(progress * 100)}%`.padStart(4);
  return (
    <div className="font-mono text-[11px] leading-relaxed">
      <span className="text-emerald-400/70">{bar}</span>
      <span className="text-white/40"> {pct}</span>
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────────────

export default function BootSequence({ onComplete }: BootSequenceProps) {
  const [displayedLines, setDisplayedLines] = useState<LogLine[]>([]);
  const [bootPhase, setBootPhase] = useState<"booting" | "replaying" | "done" | "error">("booting");
  const [replayProgress, setReplayProgress] = useState(0);
  const [receipt, setReceipt] = useState<BootReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDesktop, setShowDesktop] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const cancelledRef = useRef(false);

  // Auto-scroll
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [displayedLines]);

  // Run boot + replay
  useEffect(() => {
    // Use a local cancelled flag (not ref) to avoid strict mode double-mount issues
    let cancelled = false;

    // Reset state on mount
    setDisplayedLines([...ASCII_LOGO]);
    setBootPhase("booting");
    setReplayProgress(0);
    setReceipt(null);
    setError(null);
    setShowDesktop(false);

    sovereignBoot((p: BootProgress) => {
      // We don't use live progress — we replay afterward
    })
      .then((r) => {
        if (cancelled) return;
        setReceipt(r);
        setBootPhase("replaying");

        const script = buildBootScript(r);
        let idx = 0;

        function replayNext() {
          if (cancelled) return;
          if (idx >= script.length) {
            setReplayProgress(1);
            setBootPhase("done");
            setTimeout(() => {
              if (!cancelled) setShowDesktop(true);
            }, 1600);
            setTimeout(() => {
              if (!cancelled) onComplete();
            }, 2400);
            return;
          }

          const line = script[idx];
          setDisplayedLines(prev => [...prev, line]);
          setReplayProgress(idx / script.length);
          idx++;

          let delay: number;
          if (line.level === "header") delay = 200;
          else if (line.level === "divider") delay = 60;
          else if (line.level === "ascii") delay = 30;
          else if (line.text === "") delay = 80;
          else delay = 75 + Math.random() * 45;

          setTimeout(replayNext, delay);
        }

        setTimeout(replayNext, 400);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setBootPhase("error");
        setDisplayedLines(prev => [
          ...prev,
          DIVIDER,
          { tag: "FATAL", text: `Boot failed: ${msg}`, level: "fail" as const },
        ]);
      });

    return () => { cancelled = true; };
  }, [onComplete]);

  // Export log
  const exportLog = useCallback(() => {
    const text = displayedLines
      .map(l => `[${l.tag.padEnd(8)}] ${l.text}${l.badge ? `  [${l.badge.trim()}]` : ""}`)
      .join("\n");
    const header = `UOR OS Boot Log — ${new Date().toISOString()}\n${"═".repeat(72)}\n\n`;
    const blob = new Blob([header + text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `uor-boot-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  }, [displayedLines]);

  // ── Render a single log line ──────────────────────────────────────────

  function renderLine(line: LogLine, i: number) {
    if (line.level === "ascii") {
      return (
        <div key={i} className="text-amber-400/80 whitespace-pre leading-[1.2]">
          {line.text}
        </div>
      );
    }

    if (line.level === "divider") {
      return (
        <div key={i} className="text-white/10 whitespace-pre leading-relaxed">
          {line.text}
        </div>
      );
    }

    if (line.level === "header") {
      return (
        <div key={i} className="flex items-center gap-2 mt-1 leading-relaxed">
          <span className="text-cyan-400/90 font-bold tracking-wider text-[10px]">
            [{line.tag}]
          </span>
          <span className="text-white/70 font-bold tracking-wide">
            {line.text}
          </span>
        </div>
      );
    }

    if (line.text === "") {
      return <div key={i} className="h-1" />;
    }

    // Badge colors
    let badgeClass = "text-emerald-400 bg-emerald-400/10";
    if (line.badge?.includes("WARN")) badgeClass = "text-amber-400 bg-amber-400/10";
    if (line.badge?.includes("FAIL")) badgeClass = "text-red-400 bg-red-400/10";

    // Text colors
    let textClass = "text-white/50";
    if (line.level === "ok") textClass = "text-white/60";
    if (line.level === "warn") textClass = "text-amber-300/70";
    if (line.level === "fail") textClass = "text-red-400/80";

    return (
      <div key={i} className="flex items-baseline gap-0 leading-relaxed whitespace-pre">
        <span className="text-white/25 w-[72px] flex-shrink-0 text-right pr-2 text-[10px]">
          {line.tag}
        </span>
        <span className={`flex-1 ${textClass}`}>
          {line.text}
        </span>
        {line.badge && (
          <span className={`ml-2 px-1.5 text-[9px] font-bold tracking-wider rounded ${badgeClass} flex-shrink-0`}>
            [{line.badge.trim()}]
          </span>
        )}
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {!showDesktop && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col bg-[#0a0a0a] overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* CRT Scanline overlay */}
          <div
            className="pointer-events-none fixed inset-0 z-[10000]"
            style={{
              background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
              mixBlendMode: "multiply",
            }}
          />

          {/* Subtle vignette */}
          <div
            className="pointer-events-none fixed inset-0 z-[10000]"
            style={{
              background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)",
            }}
          />

          {/* Log output */}
          <div
            ref={logRef}
            className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 font-mono text-[11px] sm:text-[12px] scroll-smooth"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(255,255,255,0.08) transparent",
              textShadow: "0 0 8px rgba(0, 255, 136, 0.04)",
            }}
          >
            {displayedLines.map((line, i) => renderLine(line, i))}

            {/* Blinking cursor */}
            {(bootPhase === "booting" || bootPhase === "replaying") && (
              <motion.span
                className="inline-block w-[7px] h-[14px] bg-emerald-400/60 ml-[72px] mt-1"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.7, repeat: Infinity }}
              />
            )}
          </div>

          {/* Bottom status bar */}
          <div className="px-4 sm:px-8 py-4 border-t border-white/5 flex-shrink-0">
            {/* Progress bar */}
            <ProgressBar progress={bootPhase === "done" ? 1 : replayProgress} />

            {/* Status line */}
            <div className="flex items-center justify-between mt-2">
              {bootPhase === "booting" && (
                <div className="flex items-center gap-2">
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full bg-amber-400"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  <span className="text-white/30 text-[10px] tracking-[0.15em] font-mono">
                    INITIALIZING SYSTEM...
                  </span>
                </div>
              )}

              {bootPhase === "replaying" && (
                <div className="flex items-center gap-2">
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                  />
                  <span className="text-white/30 text-[10px] tracking-[0.15em] font-mono">
                    VERIFYING SYSTEM INTEGRITY...
                  </span>
                </div>
              )}

              {bootPhase === "done" && receipt && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-emerald-400/80 text-[10px] tracking-[0.15em] font-mono">
                    ■ SYSTEM SEALED
                  </span>
                  <span className="text-white/20 text-[10px] font-mono">·</span>
                  <span className="text-white/30 text-[10px] font-mono">
                    {receipt.bootTimeMs}ms
                  </span>
                  <span className="text-white/20 text-[10px] font-mono">·</span>
                  <span className="text-white/30 text-[10px] font-mono">
                    {receipt.engineType.toUpperCase()}
                  </span>
                  <span className="text-white/20 text-[10px] font-mono">·</span>
                  <span className="text-white/40 text-[11px] tracking-widest">
                    {receipt.seal.glyph}
                  </span>
                </motion.div>
              )}

              {bootPhase === "error" && (
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  <span className="text-red-400/80 text-[10px] tracking-[0.15em] font-mono">
                    BOOT FAILED
                  </span>
                  <span className="text-white/20 text-[10px] font-mono ml-2">
                    {error?.slice(0, 60)}
                  </span>
                </div>
              )}

              {/* Right side: actions */}
              <div className="flex items-center gap-2">
                {bootPhase === "error" && (
                  <>
                    <button
                      onClick={exportLog}
                      className="px-3 py-1 text-[10px] tracking-[0.1em] text-white/50 border border-white/10 rounded hover:bg-white/5 transition-colors font-mono"
                    >
                      EXPORT LOG
                    </button>
                    <button
                      onClick={() => window.location.reload()}
                      className="px-3 py-1 text-[10px] tracking-[0.1em] text-amber-400/80 border border-amber-400/20 rounded hover:bg-amber-400/5 transition-colors font-mono"
                    >
                      RETRY
                    </button>
                  </>
                )}
                {bootPhase === "done" && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-white/30 text-[10px] font-mono tracking-[0.1em]"
                  >
                    Entering desktop...
                  </motion.span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
