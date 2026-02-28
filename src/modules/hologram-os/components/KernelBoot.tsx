/**
 * KernelBoot — The Portal Entry Sequence
 * ═══════════════════════════════════════
 *
 * This is what the human sees when the kernel boots:
 * A warm, elegant animation that visualizes the real Q-Boot
 * sequence — ring forming, mesh connecting, desktop materializing.
 *
 * Not decorative. Every visual element maps to a real kernel event.
 * The animation IS the POST sequence, made visible.
 *
 * @module hologram-os/components/KernelBoot
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BootEvent } from "../projection-engine";
import type { BootStage } from "@/modules/qkernel/q-boot";

interface KernelBootProps {
  /** Boot events from the kernel projector */
  events: BootEvent[];
  /** Current boot stage */
  stage: BootStage;
  /** Whether boot is complete */
  isBooted: boolean;
  /** Boot time in ms */
  bootTimeMs: number;
  /** Called when the user has "entered" — boot animation complete */
  onEntered: () => void;
  /** Skip the animation (returning user) */
  skipAnimation?: boolean;
}

/** Stage label for human-readable display */
function stageLabel(stage: BootStage): string {
  switch (stage) {
    case "off": return "Initializing";
    case "post": return "Verifying Ring Integrity";
    case "bootloader": return "Loading Topology";
    case "initrd": return "Hydrating Firmware";
    case "init": return "Spawning Genesis";
    case "running": return "Kernel Running";
    case "panic": return "Boot Failed";
  }
}

/** Stage icon character */
function stageGlyph(stage: BootStage): string {
  switch (stage) {
    case "off": return "◯";
    case "post": return "⊘";
    case "bootloader": return "△";
    case "initrd": return "◈";
    case "init": return "⬡";
    case "running": return "⊙";
    case "panic": return "✕";
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
  const [dissolving, setDissolving] = useState(false);

  // Latest event for display
  const latestEvent = events.length > 0 ? events[events.length - 1] : null;
  const progress = latestEvent?.progress ?? 0;

  // When boot completes, start dissolve → then call onEntered
  useEffect(() => {
    if (!isBooted || dissolving) return;

    if (skipAnimation) {
      setVisible(false);
      onEntered();
      return;
    }

    // Hold the "Kernel Running" state for a breath, then dissolve
    const timer = setTimeout(() => {
      setDissolving(true);
      setTimeout(() => {
        setVisible(false);
        onEntered();
      }, 1200);
    }, 800);

    return () => clearTimeout(timer);
  }, [isBooted, dissolving, onEntered, skipAnimation]);

  // Skip if not visible
  if (!visible) return null;

  // Glow color based on stage
  const glowColor = stage === "panic"
    ? "hsla(0, 60%, 50%, 0.3)"
    : `hsla(38, 40%, 62%, ${0.1 + progress * 0.2})`;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: "hsl(25, 8%, 4%)" }}
          initial={{ opacity: 1 }}
          animate={{ opacity: dissolving ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: dissolving ? 1.2 : 0.3, ease: "easeInOut" }}
        >
          {/* Radial glow — expands with boot progress */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${glowColor} 0%, transparent ${30 + progress * 40}%)`,
              transition: "all 600ms ease-out",
            }}
          />

          {/* Ring visualization — forms during POST */}
          <motion.div
            className="absolute"
            style={{
              width: `${120 + progress * 80}px`,
              height: `${120 + progress * 80}px`,
              borderRadius: "50%",
              border: `1px solid hsla(38, 30%, 62%, ${0.05 + progress * 0.15})`,
              transition: "all 800ms ease-out",
            }}
            animate={{
              rotate: isBooted ? 360 : progress * 180,
              scale: dissolving ? 3 : 1,
              opacity: dissolving ? 0 : 1,
            }}
            transition={{ duration: dissolving ? 1.2 : 2, ease: "easeInOut" }}
          />

          {/* Second ring — appears during topology load */}
          {(stage === "bootloader" || stage === "initrd" || stage === "init" || stage === "running") && (
            <motion.div
              className="absolute"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{
                scale: dissolving ? 4 : 1,
                opacity: dissolving ? 0 : 0.6,
                rotate: -120,
              }}
              transition={{ duration: dissolving ? 1.2 : 1.5, ease: "easeOut" }}
              style={{
                width: "180px",
                height: "180px",
                borderRadius: "50%",
                border: "1px solid hsla(38, 20%, 62%, 0.08)",
              }}
            />
          )}

          {/* Center content */}
          <div className="relative z-10 flex flex-col items-center gap-6 max-w-md px-8">
            {/* Stage glyph */}
            <motion.div
              className="font-serif"
              style={{
                fontSize: "var(--holo-text-display, 36px)",
                color: "hsl(38, 15%, 88%)",
                letterSpacing: "0.05em",
              }}
              animate={{
                scale: dissolving ? 2 : 1,
                opacity: dissolving ? 0 : 1,
              }}
              transition={{ duration: 0.6 }}
            >
              {stageGlyph(stage)}
            </motion.div>

            {/* Stage label */}
            <motion.p
              className="font-serif text-center"
              style={{
                fontSize: "var(--holo-text-lg, 18px)",
                color: "hsl(38, 15%, 88%)",
                letterSpacing: "0.02em",
              }}
              animate={{ opacity: dissolving ? 0 : 1 }}
              transition={{ duration: 0.4 }}
            >
              {stageLabel(stage)}
            </motion.p>

            {/* Progress bar — subtle, warm gold */}
            <div
              className="w-48 h-px relative overflow-hidden"
              style={{ background: "hsla(38, 12%, 70%, 0.1)" }}
            >
              <motion.div
                className="absolute inset-y-0 left-0"
                style={{ background: "hsl(38, 40%, 62%)" }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>

            {/* Latest check detail */}
            {latestEvent && (
              <motion.p
                key={latestEvent.label}
                className="text-center font-mono"
                style={{
                  fontSize: "var(--holo-text-xs, 12px)",
                  color: "hsl(30, 8%, 55%)",
                  maxWidth: "320px",
                }}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: dissolving ? 0 : 0.7, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {latestEvent.passed ? "✓" : "✕"} {latestEvent.label}
              </motion.p>
            )}

            {/* Boot time (shown only when complete) */}
            {isBooted && !dissolving && (
              <motion.p
                className="font-mono"
                style={{
                  fontSize: "var(--holo-text-xs, 12px)",
                  color: "hsl(38, 40%, 62%)",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                transition={{ delay: 0.3 }}
              >
                {bootTimeMs.toFixed(0)}ms
              </motion.p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
