/**
 * MobileLumenBloom — Full-screen Lumen that blooms from the orb
 * ═══════════════════════════════════════════════════════════════
 *
 * When the user taps the orb, Lumen expands from the orb's position
 * using center-outward radial expansion with organic flow easing.
 *
 * Includes an embedded VoiceOrb at the bottom for seamless
 * voice ↔ text interaction within the conversation surface.
 *
 * Dismissal: swipe down from top, tap close, or say "done".
 *
 * @module hologram-ui/components/lumen/MobileLumenBloom
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import HologramAiChat from "./HologramAiChat";
import VoiceOrb from "./VoiceOrb";
import TrustStatusBar from "./TrustStatusBar";
import { PP, GR } from "@/modules/hologram-ui/theme/portal-palette";

interface MobileLumenBloomProps {
  open: boolean;
  onClose: () => void;
  /** Y coordinate of the orb center for bloom origin */
  orbY?: number;
}

/** Organic Flow easing — the signature Lumen reveal curve */
const ORGANIC_EASE = [0.23, 1, 0.32, 1] as const;
const BLOOM_DURATION = 0.7;

export default function MobileLumenBloom({ open, onClose, orbY }: MobileLumenBloomProps) {
  const [mounted, setMounted] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const swipeStartY = useRef<number | null>(null);

  useEffect(() => {
    if (open && !mounted) setMounted(true);
  }, [open, mounted]);

  // Reset voice mode when closing
  useEffect(() => {
    if (!open) setVoiceMode(false);
  }, [open]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const el = e.currentTarget;
    if (el.scrollTop <= 5) {
      swipeStartY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (swipeStartY.current === null) return;
    const dy = e.changedTouches[0].clientY - swipeStartY.current;
    swipeStartY.current = null;
    if (dy > 80) onClose();
  }, [onClose]);

  const handleVoiceExchange = useCallback((userText: string, assistantText: string) => {
    // Voice exchanges are logged by the VoiceOrb internally
    console.log("[LumenBloom] Voice exchange completed");
  }, []);

  if (!mounted) return null;

  const originY = orbY ?? (typeof window !== "undefined" ? window.innerHeight * 0.82 : 700);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col"
          initial={{
            clipPath: `circle(0% at 50% ${originY}px)`,
            opacity: 0.6,
          }}
          animate={{
            clipPath: `circle(150% at 50% ${originY}px)`,
            opacity: 1,
          }}
          exit={{
            clipPath: `circle(0% at 50% ${originY}px)`,
            opacity: 0,
          }}
          transition={{
            duration: BLOOM_DURATION,
            ease: ORGANIC_EASE,
          }}
          style={{
            background: PP.canvas,
            willChange: "clip-path, opacity",
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Top bar: swipe indicator + trust status */}
          <div
            className="px-4"
            style={{ paddingTop: `calc(env(safe-area-inset-top, 8px) + 4px)` }}
          >
            <div className="flex justify-center pt-1 pb-2">
              <div
                className="w-10 h-1 rounded-full"
                style={{ background: PP.orbBreathRing }}
              />
            </div>
            <TrustStatusBar />
          </div>

          {/* Lumen Chat — main area */}
          <div className="flex-1 overflow-hidden">
            <HologramAiChat
              open={open}
              onClose={onClose}
            />
          </div>

          {/* Voice Orb — embedded at bottom of bloom */}
          <div
            className="flex justify-center"
            style={{
              paddingBottom: `calc(env(safe-area-inset-bottom, 12px) + ${GR.md}px)`,
              paddingTop: `${GR.sm}px`,
              background: `linear-gradient(to top, ${PP.canvas}, transparent)`,
            }}
          >
            <VoiceOrb
              personaId="hologram"
              onExchange={handleVoiceExchange}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
