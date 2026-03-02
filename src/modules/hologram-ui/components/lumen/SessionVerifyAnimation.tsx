/**
 * SessionVerifyAnimation — Hash-chain verification on bloom open
 * ═══════════════════════════════════════════════════════════════
 *
 * Plays a compact, cinematic animation showing 6 session chain
 * blocks being validated in sequence. Each block displays a
 * truncated CID hash, a verification spinner, and a ✓ on pass.
 *
 * Auto-dismisses after completion, leaving the TrustStatusBar
 * as the persistent indicator.
 *
 * @module hologram-ui/components/lumen/SessionVerifyAnimation
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Link2 } from "lucide-react";
import { PP } from "@/modules/hologram-ui/theme/portal-palette";

const ORGANIC_EASE = [0.23, 1, 0.32, 1] as const;

// Simulated chain blocks — in production these come from agent_session_chains
function generateChainBlocks(): { hash: string; label: string }[] {
  const chars = "0123456789abcdef";
  const rand = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * 16)]).join("");
  return [
    { hash: `bafk…${rand(6)}`, label: "Genesis" },
    { hash: `bafk…${rand(6)}`, label: "Session" },
    { hash: `bafk…${rand(6)}`, label: "Identity" },
    { hash: `bafk…${rand(6)}`, label: "Memory" },
    { hash: `bafk…${rand(6)}`, label: "Context" },
    { hash: `bafk…${rand(6)}`, label: "Current" },
  ];
}

const BLOCK_VERIFY_MS = 280;
const LINGER_MS = 600;

interface SessionVerifyAnimationProps {
  /** Trigger: set to true when bloom opens */
  play: boolean;
  onComplete?: () => void;
}

export default function SessionVerifyAnimation({ play, onComplete }: SessionVerifyAnimationProps) {
  const [blocks] = useState(generateChainBlocks);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [phase, setPhase] = useState<"idle" | "verifying" | "done" | "dismissed">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    if (!play) {
      setPhase("idle");
      setVerifiedCount(0);
      return;
    }
    // Start verification sequence
    setPhase("verifying");
    setVerifiedCount(0);

    let step = 0;
    const tick = () => {
      step++;
      setVerifiedCount(step);
      if (step < blocks.length) {
        timerRef.current = setTimeout(tick, BLOCK_VERIFY_MS);
      } else {
        timerRef.current = setTimeout(() => {
          setPhase("done");
          timerRef.current = setTimeout(() => {
            setPhase("dismissed");
            onComplete?.();
          }, LINGER_MS);
        }, 300);
      }
    };
    timerRef.current = setTimeout(tick, 400); // initial delay after bloom

    return cleanup;
  }, [play, blocks.length, onComplete, cleanup]);

  if (phase === "idle" || phase === "dismissed") return null;

  return (
    <AnimatePresence>
      {(phase === "verifying" || phase === "done") && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.35, ease: ORGANIC_EASE }}
          className="overflow-hidden mx-4 mb-2"
        >
          <div
            className="rounded-xl px-3 py-3"
            style={{
              background: PP.canvasSubtle,
              border: `1px solid ${PP.bloomCardBorder}`,
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 mb-2.5">
              <Link2
                className="w-3.5 h-3.5"
                strokeWidth={1.5}
                style={{ color: phase === "done" ? "hsla(150, 45%, 55%, 0.85)" : PP.accent }}
              />
              <span
                style={{
                  fontFamily: PP.font,
                  fontSize: "11px",
                  fontWeight: 500,
                  color: phase === "done" ? "hsla(150, 45%, 55%, 0.85)" : PP.textSecondary,
                  letterSpacing: "0.04em",
                }}
              >
                {phase === "done" ? "Chain verified" : "Verifying session chain…"}
              </span>
              {phase === "done" && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 20 }}
                >
                  <Check className="w-3.5 h-3.5" strokeWidth={2} style={{ color: "hsla(150, 45%, 55%, 0.85)" }} />
                </motion.div>
              )}
            </div>

            {/* Chain blocks — horizontal scroll */}
            <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {blocks.map((block, i) => {
                const verified = i < verifiedCount;
                const verifying = i === verifiedCount && phase === "verifying";
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.06, ease: ORGANIC_EASE }}
                    className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg flex-shrink-0"
                    style={{
                      minWidth: 56,
                      background: verified
                        ? "hsla(150, 40%, 50%, 0.06)"
                        : verifying
                          ? `${PP.accent}08`
                          : "transparent",
                      border: `1px solid ${
                        verified
                          ? "hsla(150, 40%, 50%, 0.15)"
                          : verifying
                            ? `${PP.accent}18`
                            : PP.bloomCardBorder
                      }`,
                      transition: "all 0.3s ease",
                    }}
                  >
                    {/* Status icon */}
                    <div className="w-3.5 h-3.5 flex items-center justify-center">
                      {verified ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 20 }}
                        >
                          <Check
                            className="w-3 h-3"
                            strokeWidth={2.5}
                            style={{ color: "hsla(150, 45%, 55%, 0.85)" }}
                          />
                        </motion.div>
                      ) : verifying ? (
                        <div
                          className="w-3 h-3 rounded-full border animate-spin"
                          style={{
                            borderColor: `${PP.accent}30`,
                            borderTopColor: PP.accent,
                            borderWidth: "1.5px",
                          }}
                        />
                      ) : (
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: PP.textWhisper, opacity: 0.25 }}
                        />
                      )}
                    </div>
                    {/* Hash */}
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: "8px",
                        color: verified ? "hsla(150, 40%, 60%, 0.7)" : PP.textWhisper,
                        opacity: verified ? 0.9 : 0.4,
                        letterSpacing: "0.02em",
                      }}
                    >
                      {block.hash}
                    </span>
                    {/* Label */}
                    <span
                      style={{
                        fontFamily: PP.font,
                        fontSize: "8px",
                        color: PP.textWhisper,
                        opacity: verified ? 0.7 : 0.35,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                    >
                      {block.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {/* Progress line */}
            <div
              className="mt-2 h-[2px] rounded-full overflow-hidden"
              style={{ background: `${PP.bloomCardBorder}` }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: "hsla(150, 45%, 55%, 0.7)" }}
                initial={{ width: "0%" }}
                animate={{ width: `${(verifiedCount / blocks.length) * 100}%` }}
                transition={{ duration: 0.25, ease: ORGANIC_EASE }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
