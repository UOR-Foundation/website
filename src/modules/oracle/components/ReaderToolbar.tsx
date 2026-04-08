/**
 * ReaderToolbar — Minimal floating toolbar for full-screen reader mode.
 * Mobile immersive: auto-hides after 2s, tap to reveal.
 * Desktop immersive: auto-hides after 3s of mouse inactivity, mouse-to-top reveals.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Info } from "lucide-react";
import { motion } from "framer-motion";
import { KNOWLEDGE_LENSES } from "@/modules/oracle/lib/knowledge-lenses";
import { useIsMobile } from "@/hooks/use-mobile";

interface ReaderToolbarProps {
  triwordDisplay: string;
  typeLabel: string;
  activeLens: string;
  onLensChange: (lensId: string) => void;
  onBack: () => void;
  onToggleDetails: () => void;
  synthesizing?: boolean;
  immersive?: boolean;
}

const MOBILE_HIDE_DELAY = 2500;
const MOBILE_REVEAL_DURATION = 3000;
const DESKTOP_HIDE_DELAY = 3000;
const DESKTOP_REVEAL_ZONE = 80; // px from top

const ReaderToolbar: React.FC<ReaderToolbarProps> = ({
  triwordDisplay,
  typeLabel,
  activeLens,
  onLensChange,
  onBack,
  onToggleDetails,
  synthesizing = false,
  immersive = false,
}) => {
  const isMobile = useIsMobile();
  const mobileAutoHide = isMobile && immersive;
  const desktopAutoHide = !isMobile && immersive;
  const [visible, setVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
  }, []);

  const startHideTimer = useCallback((delay: number) => {
    clearTimer();
    hideTimer.current = setTimeout(() => setVisible(false), delay);
  }, [clearTimer]);

  // ── Mobile: tap-to-reveal ──
  const resetMobileTimer = useCallback(() => {
    if (!mobileAutoHide) return;
    clearTimer();
    setVisible(true);
    hideTimer.current = setTimeout(() => setVisible(false), MOBILE_REVEAL_DURATION);
  }, [mobileAutoHide, clearTimer]);

  // Initial auto-hide (mobile)
  useEffect(() => {
    if (!mobileAutoHide) return;
    startHideTimer(MOBILE_HIDE_DELAY);
    return clearTimer;
  }, [mobileAutoHide, startHideTimer, clearTimer]);

  useEffect(() => {
    if (!mobileAutoHide) return;
    const handler = () => { if (!visible) resetMobileTimer(); };
    document.addEventListener("touchstart", handler, { passive: true });
    return () => document.removeEventListener("touchstart", handler);
  }, [mobileAutoHide, visible, resetMobileTimer]);

  // ── Desktop: mouse-aware auto-hide ──
  useEffect(() => {
    if (!desktopAutoHide) { setVisible(true); return; }
    startHideTimer(DESKTOP_HIDE_DELAY);

    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY < DESKTOP_REVEAL_ZONE) {
        clearTimer();
        setVisible(true);
      } else if (visible) {
        startHideTimer(DESKTOP_HIDE_DELAY);
      }
    };

    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      clearTimer();
    };
  }, [desktopAutoHide]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Hidden state: mobile shows pull-tab, desktop shows nothing ──
  if ((mobileAutoHide || desktopAutoHide) && !visible) {
    if (mobileAutoHide) {
      return (
        <div className="sticky top-0 z-40 flex justify-center pt-[env(safe-area-inset-top,0px)]">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-10 h-1 rounded-full bg-white/20 mt-2 mb-1"
            onClick={resetMobileTimer}
          />
        </div>
      );
    }
    // Desktop: invisible — mouse-to-top reveals
    return null;
  }

  // ── Compact mobile immersive toolbar ──
  if (mobileAutoHide) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
        className="sticky top-0 z-40 flex items-center gap-2 px-3 py-1.5 backdrop-blur-2xl border-b border-white/[0.04]"
        style={{
          background: "rgba(255,255,255,0.06)",
          paddingTop: "max(6px, env(safe-area-inset-top, 6px))",
        }}
      >
        <button onClick={onBack} className="p-1.5 rounded-lg text-white/50 hover:text-white/90 hover:bg-white/10 transition-all shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-display font-medium truncate tracking-wide text-white/70 flex-1 min-w-0">
          {triwordDisplay}
        </span>
        <button onClick={onToggleDetails} className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all shrink-0">
          <Info className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    );
  }

  // ── Desktop immersive toolbar (transparent, auto-hiding) ──
  if (desktopAutoHide) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-6 py-2.5 backdrop-blur-2xl border-b border-white/[0.06]"
        style={{ background: "rgba(0,0,0,0.25)" }}
      >
        <button onClick={onBack} className="p-1.5 rounded-lg text-white/50 hover:text-white/90 hover:bg-white/10 transition-all shrink-0" title="Back to search">
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className="text-sm font-display font-medium truncate tracking-wide text-white/70">
            {triwordDisplay}
          </span>
          <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.1em] border bg-white/[0.08] text-white/50 border-white/[0.08]">
            {typeLabel}
          </span>
        </div>

        {/* Lens switcher */}
        <div className="flex items-center gap-1">
          {KNOWLEDGE_LENSES.map((lens) => {
            const isActive = lens.id === activeLens;
            return (
              <button
                key={lens.id}
                onClick={() => !isActive && onLensChange(lens.id)}
                disabled={synthesizing && isActive}
                title={lens.description}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border ${
                  isActive
                    ? "bg-white/[0.12] text-white/90 border-white/[0.15]"
                    : "text-white/40 hover:text-white/70 hover:bg-white/[0.06] border-transparent"
                } ${synthesizing && !isActive ? "opacity-30 cursor-wait" : "cursor-pointer"}`}
              >
                {lens.label}
              </button>
            );
          })}
        </div>

        <button
          onClick={onToggleDetails}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border text-white/50 hover:text-white/80 border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.06] transition-all shrink-0"
          title="Show full details"
        >
          <Info className="w-3.5 h-3.5" />
          <span>Details</span>
        </button>
      </motion.div>
    );
  }

  // ── Default toolbar (desktop non-immersive) ──
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className="sticky top-0 z-40 flex items-center gap-3 px-4 sm:px-6 py-2 backdrop-blur-2xl border-b border-border/5"
      style={{ background: "hsl(var(--background) / 0.82)" }}
    >
      <button onClick={onBack} className="p-1.5 rounded-lg transition-all shrink-0 text-muted-foreground/50 hover:text-foreground/80 hover:bg-muted/15" title="Back to search">
        <ArrowLeft className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <span className="text-sm font-display font-medium truncate tracking-wide text-foreground/70">
          {triwordDisplay}
        </span>
        <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.1em] border bg-accent/10 text-accent-foreground/60 border-accent/10">
          {typeLabel}
        </span>
      </div>

      <div className="hidden md:flex items-center gap-1">
        {KNOWLEDGE_LENSES.map((lens) => {
          const isActive = lens.id === activeLens;
          return (
            <button
              key={lens.id}
              onClick={() => !isActive && onLensChange(lens.id)}
              disabled={synthesizing && isActive}
              title={lens.description}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border ${
                isActive
                  ? "bg-primary/12 text-primary border-primary/20"
                  : "text-muted-foreground/40 hover:text-foreground/60 hover:bg-muted/10 border-transparent"
              } ${synthesizing && !isActive ? "opacity-30 cursor-wait" : "cursor-pointer"}`}
            >
              {lens.label}
            </button>
          );
        })}
      </div>

      <button
        onClick={onToggleDetails}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all shrink-0 text-muted-foreground/50 hover:text-foreground/70 border-border/15 hover:border-border/30 hover:bg-muted/15"
        title="Show full details (profile view)"
      >
        <Info className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Details</span>
      </button>
    </motion.div>
  );
};

export default ReaderToolbar;
