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
 *
 * Device Security Flow (TEE):
 *   During the RING phase, the system silently detects the device's
 *   built-in security vault. If a hardware vault is found:
 *     - It gently invites the user to verify (fingerprint, face, or PIN)
 *     - Explains in plain language WHY this matters
 *     - On success, seals the session to the device's secure hardware
 *   If no hardware vault exists, it gracefully uses mathematical proofs
 *   instead, with no disruption to the experience.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BootEvent } from "../projection-engine";
import type { BootStage } from "@/hologram/kernel/init/q-boot";
import { TEEBridge, type TEECapabilities } from "@/hologram/kernel/security/tee-bridge";

interface KernelBootProps {
  events: BootEvent[];
  stage: BootStage;
  isBooted: boolean;
  bootTimeMs: number;
  onEntered: () => void;
  skipAnimation?: boolean;
}

type Phase = "dark" | "dot" | "pulse" | "ring" | "project";

/**
 * Device security verification state machine:
 *   detecting → found_hardware → prompting → verified | declined
 *   detecting → software_only (no hardware vault)
 *   any → error (graceful fallback)
 */
type SecurityState =
  | "idle"
  | "detecting"
  | "found_hardware"
  | "prompting"
  | "verified"
  | "declined"
  | "software_only"
  | "error";

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
  const [securityState, setSecurityState] = useState<SecurityState>("idle");
  const [teeCaps, setTeeCaps] = useState<TEECapabilities | null>(null);
  const bootedRef = useRef(false);
  const phaseRef = useRef<Phase>("dark");
  const bridgeRef = useRef<TEEBridge | null>(null);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ── Device security detection (starts early, runs silently) ──
  useEffect(() => {
    if (skipAnimation) return;
    setSecurityState("detecting");
    const bridge = new TEEBridge();
    bridgeRef.current = bridge;

    bridge.detect().then(caps => {
      setTeeCaps(caps);
      if (caps.hardwareAttestation) {
        // Hardware vault found — check if we already have a credential
        if (bridge.hasCredential) {
          setSecurityState("verified");
        } else {
          setSecurityState("found_hardware");
        }
      } else {
        setSecurityState("software_only");
      }
    }).catch(() => {
      setSecurityState("software_only");
    });
  }, [skipAnimation]);

  // ── Sequenced phase timeline ──
  useEffect(() => {
    if (skipAnimation) {
      setVisible(false);
      onEntered();
      return;
    }

    const t1 = setTimeout(() => setPhase("dot"), 600);
    const t2 = setTimeout(() => setPhase("pulse"), 1400);
    const t3 = setTimeout(() => setPhase("ring"), 2600);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [skipAnimation, onEntered]);

  // ── When ring phase + hardware found → invite verification ──
  useEffect(() => {
    if (phase === "ring" && securityState === "found_hardware") {
      // Brief delay so the ring animation settles before the prompt appears
      const t = setTimeout(() => setSecurityState("prompting"), 600);
      return () => clearTimeout(t);
    }
  }, [phase, securityState]);

  // ── Boot completion → project ──
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

    if (phaseRef.current !== "ring") {
      const wait = setTimeout(doProject, 3000 - performance.now() % 3000 + 200);
      return () => clearTimeout(wait);
    } else {
      // If prompting, give user time to respond before projecting
      const delay = securityState === "prompting" ? 4000 : 800;
      const t = setTimeout(doProject, delay);
      return () => clearTimeout(t);
    }
  }, [isBooted, onEntered, securityState]);

  // ── User verification action ──
  const handleVerify = useCallback(async () => {
    const bridge = bridgeRef.current;
    if (!bridge) return;

    setSecurityState("prompting");
    try {
      // This triggers the native biometric/PIN prompt
      await bridge.attest("hologram-kernel", "Hologram");
      setSecurityState("verified");
    } catch {
      // User cancelled or failed — graceful degradation
      setSecurityState("declined");
    }
  }, []);

  const handleSkipVerification = useCallback(() => {
    setSecurityState("declined");
  }, []);

  if (!visible) return null;

  const isPanic = stage === "panic";
  const lightColor = isPanic ? "hsla(0, 40%, 55%, 1)" : "hsla(38, 50%, 80%, 1)";
  const ringStroke = isPanic ? "hsla(0, 30%, 50%, 0.25)" : "hsla(38, 30%, 72%, 0.22)";

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
          {/* ── Projection reveal mask ── */}
          {phase === "project" && (
            <motion.div
              className="fixed inset-0 z-[10000] pointer-events-none"
              style={{ background: "hsl(0, 0%, 0%)" }}
              initial={{ clipPath: "circle(40px at 50% 50%)", opacity: 1 }}
              animate={{ clipPath: "circle(0px at 50% 50%)", opacity: 0 }}
              transition={{
                clipPath: { duration: 1.4, ease: [0.25, 0.46, 0.45, 0.94] },
                opacity: { duration: 1.6, delay: 0.2, ease: "easeOut" },
              }}
            />
          )}

          {/* ── Ambient glow ── */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{ opacity: phase === "dark" ? 0 : phase === "project" ? 0 : 1 }}
            transition={{ duration: 1.0, ease: "easeOut" }}
            style={{
              background: `radial-gradient(circle at 50% 50%, ${lightColor.replace("1)", "0.06)")} 0%, transparent ${
                phase === "ring" ? "40%" : phase === "pulse" ? "20%" : "10%"
              })`,
              transition: "background 1.2s ease-out",
            }}
          />

          {/* ── The Dot ── */}
          <motion.div
            className="absolute rounded-full"
            style={{
              background: lightColor,
              boxShadow: `0 0 20px 4px ${lightColor.replace("1)", "0.3)")}, 0 0 50px 10px ${lightColor.replace("1)", "0.08)")}`,
            }}
            initial={{ width: 0, height: 0, opacity: 0 }}
            animate={{
              width: phase === "dark" ? 0 : phase === "project" ? 8 : 5,
              height: phase === "dark" ? 0 : phase === "project" ? 8 : 5,
              opacity: phase === "dark" ? 0 : phase === "dot" ? 0.8 : 1,
              scale: phase === "pulse" ? [1, 1.3, 1] : phase === "project" ? 1.5 : 1,
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

          {/* ── Heartbeat pulse ── */}
          {(phase === "pulse" || phase === "ring") && (
            <>
              <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{ border: `1px solid ${ringStroke}` }}
                initial={{ width: 5, height: 5, opacity: 0 }}
                animate={{ width: [5, 110], height: [5, 110], opacity: [0.5, 0] }}
                transition={{ duration: 2.0, repeat: Infinity, ease: "easeOut" }}
              />
              <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{ border: `1px solid ${ringStroke}` }}
                initial={{ width: 5, height: 5, opacity: 0 }}
                animate={{ width: [5, 110], height: [5, 110], opacity: [0.35, 0] }}
                transition={{ duration: 2.0, repeat: Infinity, ease: "easeOut", delay: 1.0 }}
              />
            </>
          )}

          {/* ── The Ring (Monad) ── */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{ border: `1.5px solid ${ringStroke.replace("0.22)", "0.4)")}` }}
            initial={{ width: 0, height: 0, opacity: 0 }}
            animate={{
              width: phase === "ring" ? 90 : phase === "project" ? 300 : 0,
              height: phase === "ring" ? 90 : phase === "project" ? 300 : 0,
              opacity: phase === "ring" ? 0.6 : phase === "project" ? 0 : 0,
            }}
            transition={{
              width: { duration: phase === "project" ? 1.2 : 1.0, ease: [0.25, 0.46, 0.45, 0.94] },
              height: { duration: phase === "project" ? 1.2 : 1.0, ease: [0.25, 0.46, 0.45, 0.94] },
              opacity: { duration: phase === "project" ? 0.8 : 0.8, ease: "easeOut" },
            }}
          />

          {/* ── Projection burst ── */}
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

          {/* ── Device Security Flow ── */}
          {phase !== "dark" && phase !== "dot" && phase !== "project" && (
            <DeviceSecurityFlow
              state={securityState}
              caps={teeCaps}
              isPanic={isPanic}
              onVerify={handleVerify}
              onSkip={handleSkipVerification}
            />
          )}

          {/* ── Verified / Software confirmation during project ── */}
          {phase === "project" && (securityState === "verified" || securityState === "software_only" || securityState === "declined") && (
            <motion.div
              className="absolute flex items-center gap-2 pointer-events-none"
              style={{ bottom: "22%", left: "50%", transform: "translateX(-50%)" }}
              initial={{ opacity: 0.7 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: securityState === "verified"
                    ? "hsla(152, 50%, 55%, 0.9)"
                    : "hsla(38, 50%, 65%, 0.7)",
                }}
              />
              <span style={{
                fontSize: "9px",
                letterSpacing: "0.2em",
                textTransform: "uppercase" as const,
                color: "hsla(30, 12%, 75%, 0.5)",
                fontFamily: "'DM Sans', system-ui, sans-serif",
              }}>
                {securityState === "verified" ? "Device verified" : "Protected"}
              </span>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// DeviceSecurityFlow — The human-centric TEE verification experience
// ═══════════════════════════════════════════════════════════════════════

const FONT = "'DM Sans', system-ui, sans-serif";

/** Human-readable device vault name */
function getVaultName(caps: TEECapabilities | null): string {
  if (!caps) return "security system";
  const name = caps.providerName.toLowerCase();
  if (name.includes("secure enclave") || name.includes("apple")) return "Secure Enclave";
  if (name.includes("trustzone") || name.includes("arm")) return "TrustZone";
  if (name.includes("tpm") || name.includes("platform")) return "security chip";
  if (name.includes("security key") || name.includes("roaming")) return "security key";
  return "security system";
}

function DeviceSecurityFlow({
  state,
  caps,
  isPanic,
  onVerify,
  onSkip,
}: {
  state: SecurityState;
  caps: TEECapabilities | null;
  isPanic: boolean;
  onVerify: () => void;
  onSkip: () => void;
}) {
  // Don't show anything during detection or idle
  if (state === "idle" || state === "detecting") {
    return (
      <motion.div
        className="absolute flex items-center gap-2 pointer-events-none"
        style={{ bottom: "20%", left: "50%", transform: "translateX(-50%)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
      >
        <motion.div
          className="w-1 h-1 rounded-full"
          style={{ background: "hsla(38, 50%, 70%, 0.6)" }}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <span style={{
          fontSize: "9px",
          letterSpacing: "0.2em",
          textTransform: "uppercase" as const,
          color: "hsla(30, 12%, 70%, 0.4)",
          fontFamily: FONT,
        }}>
          Checking your device
        </span>
      </motion.div>
    );
  }

  // ── Software fallback: quiet, reassuring ──
  if (state === "software_only" || state === "error") {
    return (
      <motion.div
        className="absolute flex flex-col items-center gap-2 pointer-events-none"
        style={{ bottom: "16%", left: "50%", transform: "translateX(-50%)" }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 0.65 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "hsla(38, 50%, 65%, 0.7)" }} />
          <span style={{
            fontSize: "10px",
            letterSpacing: "0.15em",
            textTransform: "uppercase" as const,
            color: "hsla(30, 12%, 75%, 0.65)",
            fontFamily: FONT,
          }}>
            Protected by mathematical proofs
          </span>
        </div>
        <span style={{
          fontSize: "9px",
          color: "hsla(30, 10%, 60%, 0.4)",
          fontFamily: FONT,
          maxWidth: 280,
          textAlign: "center" as const,
          lineHeight: "1.5",
        }}>
          Your data is verified using cryptographic proofs.
          Everything you create here is yours alone.
        </span>
      </motion.div>
    );
  }

  // ── Verified: brief, warm confirmation ──
  if (state === "verified") {
    const vaultName = getVaultName(caps);
    return (
      <motion.div
        className="absolute flex flex-col items-center gap-2 pointer-events-none"
        style={{ bottom: "16%", left: "50%", transform: "translateX(-50%)" }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 0.75 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="flex items-center gap-2">
          <motion.div
            className="w-2 h-2 rounded-full"
            style={{
              background: "hsla(152, 50%, 55%, 0.9)",
              boxShadow: "0 0 10px hsla(152, 50%, 55%, 0.3)",
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          />
          <span style={{
            fontSize: "10px",
            letterSpacing: "0.15em",
            textTransform: "uppercase" as const,
            color: "hsla(152, 40%, 70%, 0.8)",
            fontFamily: FONT,
          }}>
            {vaultName} verified
          </span>
        </div>
        <span style={{
          fontSize: "9px",
          color: "hsla(30, 10%, 60%, 0.45)",
          fontFamily: FONT,
          maxWidth: 260,
          textAlign: "center" as const,
          lineHeight: "1.5",
        }}>
          Your session is sealed to this device.
          No one else can access your data.
        </span>
      </motion.div>
    );
  }

  // ── Declined: graceful, no judgment ──
  if (state === "declined") {
    return (
      <motion.div
        className="absolute flex flex-col items-center gap-2 pointer-events-none"
        style={{ bottom: "16%", left: "50%", transform: "translateX(-50%)" }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 0.6 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "hsla(38, 50%, 65%, 0.7)" }} />
          <span style={{
            fontSize: "10px",
            letterSpacing: "0.15em",
            textTransform: "uppercase" as const,
            color: "hsla(30, 12%, 75%, 0.6)",
            fontFamily: FONT,
          }}>
            Protected by mathematical proofs
          </span>
        </div>
        <span style={{
          fontSize: "9px",
          color: "hsla(30, 10%, 60%, 0.35)",
          fontFamily: FONT,
          maxWidth: 260,
          textAlign: "center" as const,
          lineHeight: "1.5",
        }}>
          You can enable device verification anytime in settings.
        </span>
      </motion.div>
    );
  }

  // ── Hardware found / Prompting: the invitation ──
  const vaultName = getVaultName(caps);
  return (
    <motion.div
      className="absolute flex flex-col items-center gap-3"
      style={{ bottom: "12%", left: "50%", transform: "translateX(-50%)" }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      {/* WHY — one sentence of context */}
      <span style={{
        fontSize: "11px",
        color: "hsla(30, 12%, 78%, 0.7)",
        fontFamily: FONT,
        maxWidth: 320,
        textAlign: "center" as const,
        lineHeight: "1.6",
      }}>
        Your device has a built-in {vaultName.toLowerCase()}.
        Verifying locks your data to this device so only you can access it.
      </span>

      {/* HOW — the action */}
      <motion.button
        onClick={onVerify}
        className="flex items-center gap-2 px-5 py-2.5 rounded-full"
        style={{
          background: "hsla(38, 25%, 18%, 0.8)",
          border: "1px solid hsla(38, 30%, 50%, 0.2)",
          color: "hsla(38, 50%, 85%, 0.9)",
          fontFamily: FONT,
          fontSize: "12px",
          letterSpacing: "0.08em",
          cursor: "pointer",
          backdropFilter: "blur(8px)",
        }}
        whileHover={{
          background: "hsla(38, 25%, 22%, 0.9)",
          borderColor: "hsla(38, 40%, 55%, 0.35)",
        }}
        whileTap={{ scale: 0.97 }}
      >
        {/* Fingerprint icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4" />
          <path d="M5 19.5C5.5 18 6 15 6 12c0-3.5 2.5-6 6-6 3 0 5.5 2 6 5" />
          <path d="M12 12v7.5" />
          <path d="M10 14.5c0 3 0 5.5-2 7.5" />
          <path d="M14 12c0 4-1 7-3 9" />
          <path d="M18 11c0 4.5-1 8-4 10.5" />
          <path d="M22 16c-1 3-3 6-6 7.5" />
        </svg>
        Verify it's you
      </motion.button>

      {/* WHAT — the skip option */}
      <button
        onClick={onSkip}
        style={{
          background: "none",
          border: "none",
          color: "hsla(30, 10%, 55%, 0.4)",
          fontFamily: FONT,
          fontSize: "9px",
          letterSpacing: "0.15em",
          textTransform: "uppercase" as const,
          cursor: "pointer",
          padding: "4px 8px",
        }}
      >
        Skip for now
      </button>
    </motion.div>
  );
}
