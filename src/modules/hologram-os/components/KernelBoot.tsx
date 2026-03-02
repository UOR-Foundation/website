/**
 * KernelBoot — Startup Experience
 * ════════════════════════════════
 *
 * From total darkness:
 *   1. DARK  — Pure black, 600ms of silence
 *   2. DOT   — A tiny point of warm light fades in (800ms)
 *   3. PULSE — The dot breathes, a heartbeat establishing life (2s+)
 *   4. RING  — Light emanates outward into a circle (the kernel)
 *   5. PROJECT — The circle expands as a radial projection,
 *               revealing the desktop beneath like light through a lens
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BootEvent } from "../projection-engine";
import type { BootStage } from "@/hologram/kernel/q-boot";
import { TEEBridge, type TEECapabilities } from "@/hologram/kernel/tee-bridge";

interface KernelBootProps {
  events: BootEvent[];
  stage: BootStage;
  isBooted: boolean;
  bootTimeMs: number;
  onEntered: () => void;
  skipAnimation?: boolean;
}

type Phase = "dark" | "dot" | "pulse" | "ring" | "project";

export default function KernelBoot({
  events,
  stage,
  isBooted,
  bootTimeMs,
  onEntered,
  skipAnimation,
}: KernelBootProps) {
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState<Phase>("dark");
  const [teeCaps, setTeeCaps] = useState<TEECapabilities | null>(null);
  const bootedRef = useRef(false);
  const phaseRef = useRef<Phase>("dark");

  // Keep ref in sync
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Detect TEE during boot
  useEffect(() => {
    if (skipAnimation) return;
    const bridge = new TEEBridge();
    bridge.detect().then(caps => setTeeCaps(caps)).catch(() => {});
  }, [skipAnimation]);

  // Sequenced phase timeline — independent of boot speed
  useEffect(() => {
    if (skipAnimation) {
      setVisible(false);
      onEntered();
      return;
    }

    // dark → dot (600ms)
    const t1 = setTimeout(() => setPhase("dot"), 600);
    // dot → pulse (after dot has been visible 800ms)
    const t2 = setTimeout(() => setPhase("pulse"), 1400);
    // pulse → ring (after 1.2s of heartbeat)
    const t3 = setTimeout(() => setPhase("ring"), 2600);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [skipAnimation, onEntered]);

  // When boot completes AND we're at least at ring phase → project
  useEffect(() => {
    if (!isBooted || bootedRef.current) return;
    bootedRef.current = true;

    const doProject = () => {
      setPhase("project");
      setTimeout(() => {
        setVisible(false);
        onEntered();
      }, 1800);
    };

    // If we haven't reached ring yet, wait until we do
    if (phaseRef.current !== "ring") {
      const wait = setTimeout(doProject, 3000 - performance.now() % 3000 + 200);
      return () => clearTimeout(wait);
    } else {
      // Hold ring for a beat, then project
      const t = setTimeout(doProject, 800);
      return () => clearTimeout(t);
    }
  }, [isBooted, onEntered]);

  if (!visible) return null;

  const isPanic = stage === "panic";
  const lightColor = isPanic ? "hsla(0, 40%, 55%, 1)" : "hsla(38, 50%, 80%, 1)";
  const ringStroke = isPanic ? "hsla(0, 30%, 50%, 0.25)" : "hsla(38, 30%, 72%, 0.22)";

  // Clip-path for projection reveal: circle grows from center
  const clipRadius = phase === "project" ? 150 : 0; // percentage

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
          style={{ background: "hsl(0, 0%, 0%)" }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* ── Projection reveal mask ── 
              When phase=project, this growing radial clip reveals the 
              desktop beneath by making the black overlay transparent from center */}
          {phase === "project" && (
            <motion.div
              className="fixed inset-0 z-[10000] pointer-events-none"
              style={{ background: "hsl(0, 0%, 0%)" }}
              initial={{ 
                clipPath: "circle(40px at 50% 50%)",
                opacity: 1,
              }}
              animate={{ 
                clipPath: "circle(0px at 50% 50%)",
                opacity: 0,
              }}
              transition={{ 
                clipPath: { duration: 1.4, ease: [0.25, 0.46, 0.45, 0.94] },
                opacity: { duration: 1.6, delay: 0.2, ease: "easeOut" },
              }}
            />
          )}

          {/* ── Ambient glow — grows with phases ── */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{
              opacity: phase === "dark" ? 0 : phase === "project" ? 0 : 1,
            }}
            transition={{ duration: 1.0, ease: "easeOut" }}
            style={{
              background: `radial-gradient(circle at 50% 50%, ${lightColor.replace("1)", "0.06)")} 0%, transparent ${
                phase === "ring" ? "40%" : phase === "pulse" ? "20%" : "10%"
              })`,
              transition: "background 1.2s ease-out",
            }}
          />

          {/* ── The Dot — emerges from darkness ── */}
          <motion.div
            className="absolute rounded-full"
            style={{
              background: lightColor,
              boxShadow: `0 0 20px 4px ${lightColor.replace("1)", "0.3)")}, 0 0 50px 10px ${lightColor.replace("1)", "0.08)")}`,
            }}
            initial={{ width: 0, height: 0, opacity: 0 }}
            animate={{
              width: phase === "dark" ? 0 
                : phase === "project" ? 8 
                : 5,
              height: phase === "dark" ? 0 
                : phase === "project" ? 8 
                : 5,
              opacity: phase === "dark" ? 0 
                : phase === "dot" ? 0.8 
                : phase === "project" ? 1 
                : 1,
              scale: phase === "pulse" 
                ? [1, 1.3, 1] 
                : phase === "project" ? 1.5 
                : 1,
            }}
            transition={{
              width: { duration: 0.8, ease: "easeOut" },
              height: { duration: 0.8, ease: "easeOut" },
              opacity: { duration: 0.8, ease: "easeOut" },
              scale: phase === "pulse" 
                ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                : { duration: 0.6, ease: "easeOut" },
            }}
          />

          {/* ── Heartbeat pulse — emanates from dot during pulse phase ── */}
          {(phase === "pulse" || phase === "ring") && (
            <>
              <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{ border: `1px solid ${ringStroke}` }}
                initial={{ width: 5, height: 5, opacity: 0 }}
                animate={{
                  width: [5, 110],
                  height: [5, 110],
                  opacity: [0.5, 0],
                }}
                transition={{
                  duration: 2.0,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
              <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{ border: `1px solid ${ringStroke}` }}
                initial={{ width: 5, height: 5, opacity: 0 }}
                animate={{
                  width: [5, 110],
                  height: [5, 110],
                  opacity: [0.35, 0],
                }}
                transition={{
                  duration: 2.0,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: 1.0,
                }}
              />
            </>
          )}

          {/* ── The Ring (Monad) — forms from the dot, the kernel boundary ── */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              border: `1.5px solid ${ringStroke.replace("0.22)", "0.4)")}`,
            }}
            initial={{ width: 0, height: 0, opacity: 0 }}
            animate={{
              width: phase === "ring" ? 90 
                : phase === "project" ? 300 
                : 0,
              height: phase === "ring" ? 90 
                : phase === "project" ? 300 
                : 0,
              opacity: phase === "ring" ? 0.6 
                : phase === "project" ? 0 
                : 0,
            }}
            transition={{
              width: { duration: phase === "project" ? 1.2 : 1.0, ease: [0.25, 0.46, 0.45, 0.94] },
              height: { duration: phase === "project" ? 1.2 : 1.0, ease: [0.25, 0.46, 0.45, 0.94] },
              opacity: { duration: phase === "project" ? 0.8 : 0.8, ease: "easeOut" },
            }}
          />

          {/* ── Projection burst — radial light expanding outward ── */}
          {phase === "project" && (
            <motion.div
              className="absolute rounded-full pointer-events-none"
              style={{
                background: `radial-gradient(circle, ${lightColor.replace("1)", "0.2)")} 0%, ${lightColor.replace("1)", "0.05)")} 40%, transparent 70%)`,
              }}
              initial={{ width: 90, height: 90, opacity: 0.8 }}
              animate={{ width: 3000, height: 3000, opacity: 0 }}
              transition={{ duration: 1.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            />
          )}

          {/* ── TEE Status Indicator — appears during ring/project phases ── */}
          {teeCaps && (phase === "ring" || phase === "project") && (
            <TEEStatusIndicator caps={teeCaps} phase={phase} isPanic={isPanic} />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TEE Status Indicator — hardware security level badge during boot
// ═══════════════════════════════════════════════════════════════════════

function getTeeLabel(caps: TEECapabilities): { icon: string; label: string; level: string } {
  const name = caps.providerName.toLowerCase();
  if (name.includes("secure enclave") || name.includes("apple")) {
    return { icon: "🔐", label: "Secure Enclave", level: "Hardware" };
  }
  if (name.includes("trustzone") || name.includes("arm")) {
    return { icon: "🛡️", label: "TrustZone", level: "Hardware" };
  }
  if (name.includes("tpm") || name.includes("platform")) {
    return { icon: "🔒", label: "Platform TPM", level: "Hardware" };
  }
  if (name.includes("security key") || name.includes("roaming")) {
    return { icon: "🗝️", label: "Security Key", level: "External" };
  }
  return { icon: "∿", label: "Software ZK", level: "Software" };
}

function TEEStatusIndicator({
  caps,
  phase,
  isPanic,
}: {
  caps: TEECapabilities;
  phase: Phase;
  isPanic: boolean;
}) {
  const { icon, label, level } = getTeeLabel(caps);
  const isHardware = caps.hardwareAttestation;
  const dotColor = isPanic
    ? "hsla(0, 40%, 55%, 0.9)"
    : isHardware
      ? "hsla(152, 50%, 55%, 0.9)"
      : "hsla(38, 50%, 65%, 0.7)";

  return (
    <motion.div
      className="absolute pointer-events-none flex flex-col items-center gap-1"
      style={{ bottom: "18%", left: "50%", transform: "translateX(-50%)" }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: phase === "project" ? 0 : 0.85, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      {/* Security dot */}
      <div className="flex items-center gap-1.5">
        <motion.div
          className="rounded-full"
          style={{
            width: 5,
            height: 5,
            background: dotColor,
            boxShadow: `0 0 8px ${dotColor}`,
          }}
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <span
          style={{
            fontSize: "10px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "hsla(30, 12%, 75%, 0.7)",
            fontFamily: "'DM Sans', system-ui, sans-serif",
          }}
        >
          {icon} {label}
        </span>
      </div>
      {/* Level badge */}
      <span
        style={{
          fontSize: "8px",
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          color: isHardware ? "hsla(152, 40%, 55%, 0.5)" : "hsla(38, 30%, 55%, 0.4)",
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}
      >
        {level} isolation · TEE verified
      </span>
    </motion.div>
  );
}
