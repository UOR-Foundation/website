/**
 * ObserverCollapseTrap — Visual collapse detection for mobile bloom
 * ═══════════════════════════════════════════════════════════════════
 *
 * When the session chain verification detects a COLLAPSE zone block,
 * or the observer H-score drops below threshold, this component
 * triggers a dramatic visual "trap" animation:
 *
 *   1. Screen edges pulse red
 *   2. Collapse zone warning badge appears
 *   3. Auto-recovery animation plays (refocusing)
 *   4. Fades to green when coherence is restored
 *
 * The trap is purely visual — it doesn't block interaction.
 *
 * @module hologram-ui/components/lumen/ObserverCollapseTrap
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, ShieldCheck, Activity, Zap } from "lucide-react";
import { PP } from "@/modules/hologram-ui/theme/portal-palette";

const ORGANIC_EASE = [0.23, 1, 0.32, 1] as const;

type TrapPhase = "idle" | "detecting" | "collapse" | "refocusing" | "restored";

interface ObserverCollapseTrapProps {
  /** Trigger collapse detection */
  triggered: boolean;
  /** Zone that triggered the collapse */
  collapseZone?: string;
  /** H-score at time of collapse */
  hScore?: number;
  /** Callback when recovery animation completes */
  onRecovered?: () => void;
}

export default function ObserverCollapseTrap({
  triggered,
  collapseZone = "COLLAPSE",
  hScore = 0.12,
  onRecovered,
}: ObserverCollapseTrapProps) {
  const [phase, setPhase] = useState<TrapPhase>("idle");
  const [recoveryProgress, setRecoveryProgress] = useState(0);

  useEffect(() => {
    if (!triggered) {
      setPhase("idle");
      setRecoveryProgress(0);
      return;
    }

    // Detection → Collapse → Refocusing → Restored
    setPhase("detecting");

    const t1 = setTimeout(() => setPhase("collapse"), 400);
    const t2 = setTimeout(() => {
      setPhase("refocusing");
      // Animate recovery progress
      let p = 0;
      const interval = setInterval(() => {
        p += 8;
        setRecoveryProgress(Math.min(p, 100));
        if (p >= 100) clearInterval(interval);
      }, 60);
    }, 1800);
    const t3 = setTimeout(() => {
      setPhase("restored");
      setTimeout(() => {
        setPhase("idle");
        onRecovered?.();
      }, 1200);
    }, 3200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [triggered, onRecovered]);

  if (phase === "idle") return null;

  return (
    <>
      {/* Edge glow overlay — red during collapse, green during recovery */}
      <AnimatePresence>
        {(phase === "collapse" || phase === "refocusing") && (
          <motion.div
            className="fixed inset-0 z-[60] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              boxShadow: phase === "collapse"
                ? "inset 0 0 60px hsla(0, 60%, 45%, 0.25), inset 0 0 120px hsla(0, 60%, 45%, 0.08)"
                : "inset 0 0 60px hsla(150, 50%, 45%, 0.15), inset 0 0 120px hsla(150, 50%, 45%, 0.05)",
              transition: "box-shadow 0.8s ease",
            }}
          />
        )}
      </AnimatePresence>

      {/* Restored flash */}
      <AnimatePresence>
        {phase === "restored" && (
          <motion.div
            className="fixed inset-0 z-[60] pointer-events-none"
            initial={{ opacity: 0.3 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: ORGANIC_EASE }}
            style={{
              background: "radial-gradient(circle at center, hsla(150, 50%, 55%, 0.08), transparent 70%)",
            }}
          />
        )}
      </AnimatePresence>

      {/* Warning badge */}
      <AnimatePresence>
        {(phase === "collapse" || phase === "refocusing" || phase === "restored") && (
          <motion.div
            className="fixed top-0 left-0 right-0 z-[61] flex justify-center pointer-events-none"
            style={{ paddingTop: "calc(env(safe-area-inset-top, 8px) + 60px)" }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: ORGANIC_EASE }}
          >
            <div
              className="rounded-xl px-4 py-3 flex flex-col items-center gap-2 min-w-[220px]"
              style={{
                background: phase === "restored"
                  ? "hsla(150, 30%, 12%, 0.95)"
                  : phase === "refocusing"
                    ? "hsla(38, 20%, 10%, 0.95)"
                    : "hsla(0, 20%, 10%, 0.95)",
                border: `1px solid ${
                  phase === "restored"
                    ? "hsla(150, 40%, 40%, 0.3)"
                    : phase === "refocusing"
                      ? "hsla(38, 40%, 40%, 0.3)"
                      : "hsla(0, 40%, 40%, 0.3)"
                }`,
                backdropFilter: "blur(16px)",
                boxShadow: "0 8px 32px hsla(0, 0%, 0%, 0.4)",
              }}
            >
              {/* Icon */}
              <div className="flex items-center gap-2">
                {phase === "restored" ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  >
                    <ShieldCheck className="w-5 h-5" style={{ color: "hsla(150, 45%, 55%, 0.9)" }} />
                  </motion.div>
                ) : phase === "refocusing" ? (
                  <Zap className="w-5 h-5 animate-pulse" style={{ color: "hsla(38, 50%, 55%, 0.9)" }} />
                ) : (
                  <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: 3, duration: 0.4 }}>
                    <AlertTriangle className="w-5 h-5" style={{ color: "hsla(0, 55%, 55%, 0.9)" }} />
                  </motion.div>
                )}
                <span
                  style={{
                    fontFamily: PP.font,
                    fontSize: "12px",
                    fontWeight: 600,
                    color: phase === "restored"
                      ? "hsla(150, 45%, 70%, 0.9)"
                      : phase === "refocusing"
                        ? "hsla(38, 45%, 70%, 0.9)"
                        : "hsla(0, 45%, 70%, 0.9)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {phase === "restored"
                    ? "Coherence Restored"
                    : phase === "refocusing"
                      ? "Refocusing…"
                      : "Observer Collapse Detected"}
                </span>
              </div>

              {/* Details */}
              <div className="flex items-center gap-3">
                <span style={{ fontFamily: "monospace", fontSize: "10px", color: "hsla(0, 0%, 70%, 0.6)" }}>
                  Zone: {collapseZone}
                </span>
                <span style={{ fontFamily: "monospace", fontSize: "10px", color: "hsla(0, 0%, 70%, 0.6)" }}>
                  H: {(hScore * 100).toFixed(0)}%
                </span>
              </div>

              {/* Recovery progress bar */}
              {phase === "refocusing" && (
                <div className="w-full">
                  <div
                    className="h-[3px] rounded-full overflow-hidden w-full"
                    style={{ background: "hsla(0, 0%, 100%, 0.08)" }}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: "hsla(150, 45%, 55%, 0.7)" }}
                      animate={{ width: `${recoveryProgress}%` }}
                      transition={{ duration: 0.08, ease: "linear" }}
                    />
                  </div>
                  <p
                    className="mt-1 text-center"
                    style={{
                      fontFamily: PP.font,
                      fontSize: "9px",
                      color: "hsla(0, 0%, 70%, 0.45)",
                    }}
                  >
                    Blending toward last coherent state…
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
