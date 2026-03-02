/**
 * MobileLumenBloom — Full-screen Lumen that blooms from the orb
 * ═══════════════════════════════════════════════════════════════
 *
 * When the user taps the orb, Lumen expands from the orb's position
 * using center-outward radial expansion with organic flow easing.
 *
 * Multi-modal: tabbed projections let users switch between
 * Conversation, Trust Network, Calendar, and Knowledge Explorer.
 *
 * Includes an embedded VoiceOrb at the bottom for seamless
 * voice ↔ text interaction within the conversation surface.
 *
 * Dismissal: swipe down from top, tap close, or say "done".
 *
 * @module hologram-ui/components/lumen/MobileLumenBloom
 */

import { useState, useCallback, useRef, useEffect, lazy, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import HologramAiChat from "./HologramAiChat";
import VoiceOrb from "./VoiceOrb";
import TrustStatusBar from "./TrustStatusBar";
import SessionVerifyAnimation from "./SessionVerifyAnimation";
import BloomProjectionTabs, { type BloomProjection } from "./BloomProjectionTabs";
import { PP, GR } from "@/modules/hologram-ui/theme/portal-palette";

// Lazy-load non-primary projections for fast initial bloom
const BloomTrustProjection = lazy(() => import("./BloomTrustProjection"));
const BloomCalendarProjection = lazy(() => import("./BloomCalendarProjection"));
const BloomKnowledgeProjection = lazy(() => import("./BloomKnowledgeProjection"));

interface MobileLumenBloomProps {
  open: boolean;
  onClose: () => void;
  /** Y coordinate of the orb center for bloom origin */
  orbY?: number;
}

/** Organic Flow easing — the signature Lumen reveal curve */
const ORGANIC_EASE = [0.23, 1, 0.32, 1] as const;
const BLOOM_DURATION = 0.7;

function ProjectionSpinner() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div
        className="w-6 h-6 rounded-full border-2 animate-spin"
        style={{ borderColor: `${PP.accent}30`, borderTopColor: PP.accent }}
      />
    </div>
  );
}

export default function MobileLumenBloom({ open, onClose, orbY }: MobileLumenBloomProps) {
  const [mounted, setMounted] = useState(false);
  const [activeProjection, setActiveProjection] = useState<BloomProjection>("conversation");
  const [verifyComplete, setVerifyComplete] = useState(false);
  const swipeStartY = useRef<number | null>(null);

  useEffect(() => {
    if (open && !mounted) setMounted(true);
  }, [open, mounted]);

  // Reset state when closing
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setActiveProjection("conversation");
        setVerifyComplete(false);
      }, BLOOM_DURATION * 1000);
      return () => clearTimeout(t);
    }
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
    console.log("[LumenBloom] Voice exchange completed");
  }, []);

  if (!mounted) return null;

  const originY = orbY ?? (typeof window !== "undefined" ? window.innerHeight * 0.82 : 700);
  const showVoiceOrb = activeProjection === "conversation";

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

          {/* Session chain verification animation */}
          {!verifyComplete && (
            <SessionVerifyAnimation
              play={open}
              onComplete={() => setVerifyComplete(true)}
            />
          )}

          {/* Projection tabs */}
          <div className="py-2">
            <BloomProjectionTabs
              active={activeProjection}
              onChange={setActiveProjection}
            />
          </div>

          {/* Active projection — main area */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeProjection}
                className="flex-1 flex flex-col overflow-hidden"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              >
                {activeProjection === "conversation" && (
                  <HologramAiChat open={open} onClose={onClose} />
                )}
                {activeProjection === "trust" && (
                  <Suspense fallback={<ProjectionSpinner />}>
                    <BloomTrustProjection />
                  </Suspense>
                )}
                {activeProjection === "calendar" && (
                  <Suspense fallback={<ProjectionSpinner />}>
                    <BloomCalendarProjection />
                  </Suspense>
                )}
                {activeProjection === "knowledge" && (
                  <Suspense fallback={<ProjectionSpinner />}>
                    <BloomKnowledgeProjection />
                  </Suspense>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Voice Orb — only visible in conversation mode */}
          {showVoiceOrb && (
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
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
