/**
 * KernelBoot — Startup Experience
 * ════════════════════════════════
 *
 * A warm, gentle sequence:
 *   1. A soft dot of light fades in at center
 *   2. It gently pulses, then a circle expands from it
 *   3. The circle opens outward, revealing the desktop beneath
 *
 * Language is plain, warm, human. No jargon, no mysticism.
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BootEvent } from "../projection-engine";
import type { BootStage } from "@/modules/qkernel/q-boot";

interface KernelBootProps {
  events: BootEvent[];
  stage: BootStage;
  isBooted: boolean;
  bootTimeMs: number;
  onEntered: () => void;
  skipAnimation?: boolean;
}

/* Simple, warm status words */
function stageLabel(stage: BootStage): string {
  switch (stage) {
    case "off":        return "";
    case "post":       return "Getting ready";
    case "bootloader": return "Setting things up";
    case "initrd":     return "Almost there";
    case "init":       return "Here we go";
    case "running":    return "Welcome";
    case "panic":      return "Something went wrong";
  }
}

export default function KernelBoot({
  events,
  stage,
  isBooted,
  bootTimeMs,
  onEntered,
  skipAnimation,
}: KernelBootProps) {
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState<"dot" | "circle" | "open" | "gone">("dot");

  const latestEvent = events.length > 0 ? events[events.length - 1] : null;
  const progress = latestEvent?.progress ?? 0;

  // Advance phases with boot stages
  useEffect(() => {
    if (stage === "post" || stage === "bootloader") setPhase("circle");
    if (stage === "initrd" || stage === "init") setPhase("circle");
  }, [stage]);

  // Boot complete → open → exit
  useEffect(() => {
    if (!isBooted || phase === "open" || phase === "gone") return;

    if (skipAnimation) {
      setVisible(false);
      onEntered();
      return;
    }

    const t1 = setTimeout(() => setPhase("open"), 400);
    const t2 = setTimeout(() => {
      setPhase("gone");
      setVisible(false);
      onEntered();
    }, 1400);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isBooted, phase, onEntered, skipAnimation]);

  if (!visible) return null;

  const isPanic = stage === "panic";
  const warmLight = isPanic ? "hsla(0, 40%, 55%, 1)" : "hsla(38, 45%, 78%, 1)";
  const warmRing = isPanic ? "hsla(0, 30%, 50%, 0.2)" : "hsla(38, 25%, 70%, 0.18)";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
          style={{ background: "hsl(25, 8%, 4%)" }}
          initial={{ opacity: 1 }}
          animate={{ opacity: phase === "open" || phase === "gone" ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.0, ease: "easeInOut" }}
        >
          {/* Soft ambient warmth */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 50% 50%, hsla(38, 30%, 65%, ${0.03 + progress * 0.06}) 0%, transparent ${30 + progress * 30}%)`,
              transition: "background 0.8s ease-out",
            }}
          />

          {/* The dot — a simple, warm point of light */}
          <motion.div
            className="absolute rounded-full"
            style={{
              background: warmLight,
              boxShadow: `0 0 16px 3px ${warmLight.replace("1)", "0.25)")}, 0 0 40px 8px ${warmLight.replace("1)", "0.06)")}`,
            }}
            initial={{ width: 0, height: 0, opacity: 0 }}
            animate={{
              width: phase === "dot" ? 5 : phase === "open" ? 4 : 5,
              height: phase === "dot" ? 5 : phase === "open" ? 4 : 5,
              opacity: phase === "open" || phase === "gone" ? 0 : 1,
            }}
            transition={{
              width: { duration: 0.5, ease: "easeOut" },
              height: { duration: 0.5, ease: "easeOut" },
              opacity: { duration: 0.5, ease: "easeOut" },
            }}
          />

          {/* Gentle pulse — one soft ring that breathes outward */}
          {(phase === "circle") && (
            <motion.div
              className="absolute rounded-full pointer-events-none"
              style={{ border: `1px solid ${warmRing}` }}
              initial={{ width: 5, height: 5, opacity: 0.5 }}
              animate={{
                width: [5, 100],
                height: [5, 100],
                opacity: [0.4, 0],
              }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
          )}

          {/* Circle that forms from the dot */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              border: `1px solid ${warmRing.replace("0.18)", "0.3)")}`,
            }}
            initial={{ width: 0, height: 0, opacity: 0 }}
            animate={{
              width: phase === "dot" ? 0 : phase === "open" ? 800 : 80 + progress * 40,
              height: phase === "dot" ? 0 : phase === "open" ? 800 : 80 + progress * 40,
              opacity: phase === "dot" ? 0 : phase === "open" ? 0 : 0.45,
            }}
            transition={{
              width: { duration: phase === "open" ? 1.0 : 0.7, ease: "easeOut" },
              height: { duration: phase === "open" ? 1.0 : 0.7, ease: "easeOut" },
              opacity: { duration: phase === "open" ? 0.8 : 0.5, ease: "easeOut" },
            }}
          />

          {/* Status text — plain and warm */}
          <motion.p
            className="absolute text-center"
            style={{
              top: "calc(50% + 55px)",
              fontSize: "12px",
              color: "hsla(38, 12%, 72%, 0.6)",
              letterSpacing: "0.08em",
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontWeight: 400,
            }}
            key={stage}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: phase === "open" || phase === "gone" ? 0 : 0.7, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {stageLabel(stage)}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
