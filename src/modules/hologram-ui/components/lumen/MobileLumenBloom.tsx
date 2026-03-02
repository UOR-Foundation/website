/**
 * MobileLumenBloom — Full-screen Lumen that blooms from the orb
 * ═══════════════════════════════════════════════════════════════
 *
 * Multi-modal projections + session chain verification + observer
 * collapse traps + ZK selective disclosure panel.
 *
 * @module hologram-ui/components/lumen/MobileLumenBloom
 */

import { useState, useCallback, useRef, useEffect, useMemo, lazy, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import HologramAiChat from "./HologramAiChat";
import VoiceOrb from "./VoiceOrb";
import TrustStatusBar from "./TrustStatusBar";
import SessionVerifyAnimation from "./SessionVerifyAnimation";
import ObserverCollapseTrap from "./ObserverCollapseTrap";
import ZKDisclosurePanel from "./ZKDisclosurePanel";
import BloomProjectionTabs, { type BloomProjection } from "./BloomProjectionTabs";
import AmbientCardStack from "./AmbientCardStack";
import { PP, GR } from "@/modules/hologram-ui/theme/portal-palette";
import { Fingerprint } from "lucide-react";

const BloomTrustProjection = lazy(() => import("./BloomTrustProjection"));
const BloomCalendarProjection = lazy(() => import("./BloomCalendarProjection"));
const BloomKnowledgeProjection = lazy(() => import("./BloomKnowledgeProjection"));
const BloomHabitsProjection = lazy(() => import("./BloomHabitsProjection"));
const BloomMirrorProjection = lazy(() => import("./BloomMirrorProjection"));
const BloomConvergenceProjection = lazy(() => import("./BloomConvergenceProjection"));

interface MobileLumenBloomProps {
  open: boolean;
  onClose: () => void;
  orbY?: number;
}

const ORGANIC_EASE = [0.23, 1, 0.32, 1] as const;
const BLOOM_DURATION = 0.7;
const PROJECTION_ORDER: BloomProjection[] = ["conversation", "trust", "calendar", "knowledge", "habits", "mirror", "convergence"];

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
  const [swipeDir, setSwipeDir] = useState<1 | -1>(1);
  const [verifyComplete, setVerifyComplete] = useState(false);
  const [collapseTriggered, setCollapseTriggered] = useState(false);
  const [collapseInfo, setCollapseInfo] = useState({ zone: "COLLAPSE", hScore: 0.12 });
  const [zkPanelOpen, setZkPanelOpen] = useState(false);
  const swipeStartY = useRef<number | null>(null);
  const projSwipeX = useRef<number | null>(null);

  useEffect(() => {
    if (open && !mounted) setMounted(true);
  }, [open, mounted]);

  // Reset state when closing
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setActiveProjection("conversation");
        setVerifyComplete(false);
        setCollapseTriggered(false);
        setZkPanelOpen(false);
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

  const changeProjection = useCallback((proj: BloomProjection) => {
    const oldIdx = PROJECTION_ORDER.indexOf(activeProjection);
    const newIdx = PROJECTION_ORDER.indexOf(proj);
    setSwipeDir(newIdx >= oldIdx ? 1 : -1);
    setActiveProjection(proj);
  }, [activeProjection]);

  const handleProjTouchStart = useCallback((e: React.TouchEvent) => {
    projSwipeX.current = e.touches[0].clientX;
  }, []);

  const handleProjTouchEnd = useCallback((e: React.TouchEvent) => {
    if (projSwipeX.current === null) return;
    const dx = e.changedTouches[0].clientX - projSwipeX.current;
    projSwipeX.current = null;
    if (Math.abs(dx) < 50) return;
    const idx = PROJECTION_ORDER.indexOf(activeProjection);
    if (dx < 0 && idx < PROJECTION_ORDER.length - 1) {
      changeProjection(PROJECTION_ORDER[idx + 1]);
    } else if (dx > 0 && idx > 0) {
      changeProjection(PROJECTION_ORDER[idx - 1]);
    }
  }, [activeProjection, changeProjection]);

  const handleVoiceExchange = useCallback((userText: string, assistantText: string) => {
    console.log("[LumenBloom] Voice exchange completed");
  }, []);

  const handleCollapseDetected = useCallback((block: any) => {
    setCollapseInfo({ zone: block.zone, hScore: block.hScore });
    setCollapseTriggered(true);
  }, []);

  const handleCollapseRecovered = useCallback(() => {
    setCollapseTriggered(false);
  }, []);

  if (!mounted) return null;

  const originY = orbY ?? (typeof window !== "undefined" ? window.innerHeight * 0.82 : 700);
  const showVoiceOrb = activeProjection === "conversation";

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col"
            initial={{ clipPath: `circle(0% at 50% ${originY}px)`, opacity: 0.6 }}
            animate={{ clipPath: `circle(150% at 50% ${originY}px)`, opacity: 1 }}
            exit={{ clipPath: `circle(0% at 50% ${originY}px)`, opacity: 0 }}
            transition={{ duration: BLOOM_DURATION, ease: ORGANIC_EASE }}
            style={{ background: PP.canvas, willChange: "clip-path, opacity" }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Top bar */}
            <div className="px-4" style={{ paddingTop: `calc(env(safe-area-inset-top, 8px) + 4px)` }}>
              <div className="flex justify-center pt-1 pb-2">
                <div className="w-10 h-1 rounded-full" style={{ background: PP.orbBreathRing }} />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <TrustStatusBar />
                </div>
                {/* ZK Disclosure button */}
                <button
                  onClick={() => setZkPanelOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-2 rounded-xl active:scale-95 transition-transform"
                  style={{
                    background: PP.canvasSubtle,
                    border: `1px solid ${PP.bloomCardBorder}`,
                  }}
                  title="Zero-Knowledge Disclosure"
                >
                  <Fingerprint className="w-3.5 h-3.5" style={{ color: PP.accent, opacity: 0.7 }} />
                  <span
                    style={{
                      fontFamily: PP.font,
                      fontSize: "9px",
                      color: PP.textWhisper,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    ZK
                  </span>
                </button>
              </div>
            </div>

            {/* Session chain verification */}
            {!verifyComplete && (
              <SessionVerifyAnimation
                play={open}
                onComplete={() => setVerifyComplete(true)}
                onCollapseDetected={handleCollapseDetected}
              />
            )}

            {/* Ambient intelligence cards */}
            {verifyComplete && (
              <AmbientCardStack
                active={open}
                onNavigate={changeProjection}
              />
            )}

            {/* Projection tabs */}
            <div className="py-2">
              <BloomProjectionTabs active={activeProjection} onChange={changeProjection} />
            </div>

            {/* Active projection — swipeable */}
            <div
              className="flex-1 overflow-hidden flex flex-col"
              onTouchStart={handleProjTouchStart}
              onTouchEnd={handleProjTouchEnd}
            >
              <AnimatePresence mode="wait" custom={swipeDir}>
                <motion.div
                  key={activeProjection}
                  className="flex-1 flex flex-col overflow-hidden"
                  initial={{ opacity: 0, x: swipeDir * 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: swipeDir * -40 }}
                  transition={{ duration: 0.25, ease: ORGANIC_EASE }}
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
                  {activeProjection === "habits" && (
                    <Suspense fallback={<ProjectionSpinner />}>
                      <BloomHabitsProjection />
                    </Suspense>
                  )}
                  {activeProjection === "mirror" && (
                    <Suspense fallback={<ProjectionSpinner />}>
                      <BloomMirrorProjection />
                    </Suspense>
                  )}
                  {activeProjection === "convergence" && (
                    <Suspense fallback={<ProjectionSpinner />}>
                      <BloomConvergenceProjection />
                    </Suspense>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Voice Orb */}
            {showVoiceOrb && (
              <div
                className="flex justify-center"
                style={{
                  paddingBottom: `calc(env(safe-area-inset-bottom, 12px) + ${GR.md}px)`,
                  paddingTop: `${GR.sm}px`,
                  background: `linear-gradient(to top, ${PP.canvas}, transparent)`,
                }}
              >
                <VoiceOrb personaId="hologram" onExchange={handleVoiceExchange} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Observer Collapse Trap — renders above everything */}
      <ObserverCollapseTrap
        triggered={collapseTriggered}
        collapseZone={collapseInfo.zone}
        hScore={collapseInfo.hScore}
        onRecovered={handleCollapseRecovered}
      />

      {/* ZK Disclosure Panel — full-screen overlay */}
      <ZKDisclosurePanel open={zkPanelOpen} onClose={() => setZkPanelOpen(false)} />
    </>
  );
}
