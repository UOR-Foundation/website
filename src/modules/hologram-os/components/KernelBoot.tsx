/**
 * KernelBoot — The Genesis Projection Sequence
 * ═════════════════════════════════════════════
 *
 * A seed appears — a single luminous point.
 * It pulses with a heartbeat, establishing coherence.
 * A ring emanates outward, tracing the topology.
 * The projection fills the field of view.
 * The portal is open.
 *
 * Every visual maps to a real kernel event.
 * Less is more. Brief, magical, unmistakable.
 */

import React, { useState, useEffect, useMemo } from "react";
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

/* ── Human-friendly stage whispers ──────────────────── */
function stageWhisper(stage: BootStage): string {
  switch (stage) {
    case "off":        return "Waking";
    case "post":       return "Finding coherence";
    case "bootloader": return "Tracing topology";
    case "initrd":     return "Remembering";
    case "init":       return "Projecting";
    case "running":    return "Welcome";
    case "panic":      return "Something's not right";
  }
}

/* ── Heartbeat rhythm (synced to the ring's Z/256Z coherence) ── */
const HEARTBEAT_DURATION = 1.6; // seconds per pulse

export default function KernelBoot({
  events,
  stage,
  isBooted,
  bootTimeMs,
  onEntered,
  skipAnimation,
}: KernelBootProps) {
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState<"seed" | "ring" | "project" | "dissolve">("seed");

  const latestEvent = events.length > 0 ? events[events.length - 1] : null;
  const progress = latestEvent?.progress ?? 0;

  // Phase progression based on boot stage
  useEffect(() => {
    if (stage === "post" || stage === "bootloader") setPhase("ring");
    if (stage === "initrd" || stage === "init") setPhase("project");
  }, [stage]);

  // When boot completes → dissolve → onEntered
  useEffect(() => {
    if (!isBooted || phase === "dissolve") return;

    if (skipAnimation) {
      setVisible(false);
      onEntered();
      return;
    }

    const t1 = setTimeout(() => setPhase("dissolve"), 600);
    const t2 = setTimeout(() => {
      setVisible(false);
      onEntered();
    }, 1600);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isBooted, phase, onEntered, skipAnimation]);

  if (!visible) return null;

  const isPanic = stage === "panic";
  const seedColor = isPanic ? "hsla(0, 50%, 55%, 1)" : "hsla(38, 50%, 75%, 1)";
  const ringColor = isPanic ? "hsla(0, 40%, 50%, 0.25)" : "hsla(38, 30%, 70%, 0.2)";
  const glowColor = isPanic ? "hsla(0, 50%, 45%, 0.15)" : "hsla(38, 40%, 65%, 0.12)";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
          style={{ background: "hsl(25, 8%, 4%)" }}
          initial={{ opacity: 1 }}
          animate={{ opacity: phase === "dissolve" ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: phase === "dissolve" ? 1.0 : 0.2, ease: "easeInOut" }}
        >
          {/* ── Ambient radial glow ── */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{
              opacity: phase === "dissolve" ? 0 : 1,
            }}
            transition={{ duration: 0.8 }}
            style={{
              background: `radial-gradient(circle at 50% 50%, ${glowColor} 0%, transparent ${phase === "project" || phase === "dissolve" ? "70%" : "25%"})`,
              transition: "background 1s ease-out",
            }}
          />

          {/* ── The Seed — a luminous point, the portable kernel ── */}
          <motion.div
            className="absolute rounded-full"
            style={{
              background: seedColor,
              boxShadow: `0 0 20px 4px ${seedColor.replace("1)", "0.3)")}, 0 0 60px 10px ${seedColor.replace("1)", "0.08)")}`,
            }}
            initial={{ width: 0, height: 0, opacity: 0 }}
            animate={{
              width: phase === "seed" ? 6 : phase === "dissolve" ? 3 : 5,
              height: phase === "seed" ? 6 : phase === "dissolve" ? 3 : 5,
              opacity: phase === "dissolve" ? 0 : 1,
              scale: phase === "dissolve" ? 0 : 1,
            }}
            transition={{
              width: { duration: 0.6, ease: "easeOut" },
              height: { duration: 0.6, ease: "easeOut" },
              opacity: { duration: phase === "seed" ? 0.6 : 0.8, ease: "easeOut" },
              scale: { duration: 0.8, ease: "easeInOut" },
            }}
          />

          {/* ── Heartbeat pulse rings — emanate from the seed ── */}
          {phase !== "seed" && phase !== "dissolve" && (
            <>
              <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{
                  border: `1px solid ${ringColor}`,
                }}
                initial={{ width: 6, height: 6, opacity: 0.6 }}
                animate={{
                  width: [6, 120],
                  height: [6, 120],
                  opacity: [0.5, 0],
                }}
                transition={{
                  duration: HEARTBEAT_DURATION,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
              <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{
                  border: `1px solid ${ringColor}`,
                }}
                initial={{ width: 6, height: 6, opacity: 0.4 }}
                animate={{
                  width: [6, 120],
                  height: [6, 120],
                  opacity: [0.4, 0],
                }}
                transition={{
                  duration: HEARTBEAT_DURATION,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: HEARTBEAT_DURATION / 2,
                }}
              />
            </>
          )}

          {/* ── Coherence ring — forms and stabilizes ── */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              border: `1px solid ${ringColor.replace("0.2)", "0.35)")}`,
            }}
            initial={{ width: 0, height: 0, opacity: 0 }}
            animate={{
              width: phase === "ring" ? 90 : phase === "project" ? 160 : phase === "dissolve" ? 600 : 0,
              height: phase === "ring" ? 90 : phase === "project" ? 160 : phase === "dissolve" ? 600 : 0,
              opacity: phase === "dissolve" ? 0 : phase === "seed" ? 0 : 0.5,
            }}
            transition={{
              width: { duration: phase === "dissolve" ? 1.0 : 0.8, ease: "easeOut" },
              height: { duration: phase === "dissolve" ? 1.0 : 0.8, ease: "easeOut" },
              opacity: { duration: 0.6, ease: "easeOut" },
            }}
          />

          {/* ── Second harmonic ring ── */}
          {(phase === "project" || phase === "dissolve") && (
            <motion.div
              className="absolute rounded-full pointer-events-none"
              style={{
                border: `1px solid ${ringColor.replace("0.2)", "0.15)")}`,
              }}
              initial={{ width: 90, height: 90, opacity: 0 }}
              animate={{
                width: phase === "dissolve" ? 900 : 240,
                height: phase === "dissolve" ? 900 : 240,
                opacity: phase === "dissolve" ? 0 : 0.3,
              }}
              transition={{
                duration: phase === "dissolve" ? 1.0 : 1.0,
                ease: "easeOut",
              }}
            />
          )}

          {/* ── Projection flash — the moment the portal opens ── */}
          {phase === "dissolve" && (
            <motion.div
              className="absolute rounded-full pointer-events-none"
              style={{
                background: `radial-gradient(circle, ${seedColor.replace("1)", "0.15)")} 0%, transparent 70%)`,
              }}
              initial={{ width: 100, height: 100, opacity: 0.6 }}
              animate={{ width: 2000, height: 2000, opacity: 0 }}
              transition={{ duration: 1.0, ease: "easeOut" }}
            />
          )}

          {/* ── Stage whisper — human-friendly text ── */}
          <motion.p
            className="absolute font-serif text-center"
            style={{
              bottom: "calc(50% - 70px)",
              fontSize: "13px",
              color: "hsla(38, 15%, 80%, 0.7)",
              letterSpacing: "0.12em",
              fontFamily: "'Playfair Display', serif",
            }}
            key={stage}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: phase === "dissolve" ? 0 : 0.8, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {stageWhisper(stage)}
          </motion.p>

          {/* ── Subtle progress trace — a thin golden line ── */}
          <motion.div
            className="absolute"
            style={{
              bottom: "calc(50% - 90px)",
              height: "1px",
              background: `linear-gradient(90deg, transparent, hsla(38, 40%, 65%, 0.4), transparent)`,
              transformOrigin: "center",
            }}
            animate={{
              width: phase === "dissolve" ? 0 : `${Math.max(20, progress * 80)}px`,
              opacity: phase === "dissolve" ? 0 : 0.6,
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
