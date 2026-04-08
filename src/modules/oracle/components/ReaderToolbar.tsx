/**
 * ReaderToolbar — Minimal floating toolbar for full-screen reader mode.
 * On mobile + immersive: auto-hides after 2s, tap to reveal, compact layout.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Info, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

const AUTO_HIDE_DELAY = 2500;
const REVEAL_DURATION = 3000;

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
  const shouldAutoHide = isMobile && immersive;
  const [visible, setVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetHideTimer = useCallback(() => {
    if (!shouldAutoHide) return;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setVisible(true);
    hideTimer.current = setTimeout(() => setVisible(false), REVEAL_DURATION);
  }, [shouldAutoHide]);

  // Initial auto-hide
  useEffect(() => {
    if (!shouldAutoHide) { setVisible(true); return; }
    hideTimer.current = setTimeout(() => setVisible(false), AUTO_HIDE_DELAY);
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [shouldAutoHide]);

  // Tap-to-reveal handler on the page
  useEffect(() => {
    if (!shouldAutoHide) return;
    const handler = () => {
      if (!visible) resetHideTimer();
    };
    document.addEventListener("touchstart", handler, { passive: true });
    return () => document.removeEventListener("touchstart", handler);
  }, [shouldAutoHide, visible, resetHideTimer]);

  // Mobile immersive: show a minimal pull-down indicator when hidden
  if (shouldAutoHide && !visible) {
    return (
      <div className="sticky top-0 z-40 flex justify-center pt-[env(safe-area-inset-top,0px)]">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-10 h-1 rounded-full bg-white/20 mt-2 mb-1"
          onClick={resetHideTimer}
        />
      </div>
    );
  }

  // Compact mobile immersive toolbar
  if (shouldAutoHide) {
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
        {/* Back */}
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg text-white/50 hover:text-white/90 hover:bg-white/10 transition-all shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Triword only — no badge on mobile */}
        <span className="text-sm font-display font-medium truncate tracking-wide text-white/70 flex-1 min-w-0">
          {triwordDisplay}
        </span>

        {/* Details toggle */}
        <button
          onClick={onToggleDetails}
          className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all shrink-0"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    );
  }

  // Default toolbar (desktop or non-immersive)
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className={`sticky top-0 z-40 flex items-center gap-3 px-4 sm:px-6 py-2 backdrop-blur-2xl border-b ${
        immersive
          ? "border-white/[0.04]"
          : "border-border/5"
      }`}
      style={{
        background: immersive
          ? "rgba(255,255,255,0.06)"
          : "hsl(var(--background) / 0.82)",
      }}
    >
      {/* Back */}
      <button
        onClick={onBack}
        className={`p-1.5 rounded-lg transition-all shrink-0 ${
          immersive
            ? "text-white/50 hover:text-white/90 hover:bg-white/10"
            : "text-muted-foreground/50 hover:text-foreground/80 hover:bg-muted/15"
        }`}
        title="Back to search"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>

      {/* Triword + type */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <span className={`text-sm font-display font-medium truncate tracking-wide ${
          immersive ? "text-white/70" : "text-foreground/70"
        }`}>
          {triwordDisplay}
        </span>
        <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.1em] border ${
          immersive
            ? "bg-white/[0.08] text-white/50 border-white/[0.08]"
            : "bg-accent/10 text-accent-foreground/60 border-accent/10"
        }`}>
          {typeLabel}
        </span>
      </div>

      {/* Lens switcher (compact) */}
      <div className="hidden md:flex items-center gap-1">
        {KNOWLEDGE_LENSES.map((lens) => {
          const isActive = lens.id === activeLens;
          return (
            <button
              key={lens.id}
              onClick={() => !isActive && onLensChange(lens.id)}
              disabled={synthesizing && isActive}
              title={lens.description}
              className={`
                px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border
                ${immersive
                  ? isActive
                    ? "bg-white/[0.12] text-white/90 border-white/[0.15]"
                    : "text-white/40 hover:text-white/70 hover:bg-white/[0.06] border-transparent"
                  : isActive
                    ? "bg-primary/12 text-primary border-primary/20"
                    : "text-muted-foreground/40 hover:text-foreground/60 hover:bg-muted/10 border-transparent"
                }
                ${synthesizing && !isActive ? "opacity-30 cursor-wait" : "cursor-pointer"}
              `}
            >
              {lens.label}
            </button>
          );
        })}
      </div>

      {/* Details toggle */}
      <button
        onClick={onToggleDetails}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all shrink-0 ${
          immersive
            ? "text-white/50 hover:text-white/80 border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.06]"
            : "text-muted-foreground/50 hover:text-foreground/70 border-border/15 hover:border-border/30 hover:bg-muted/15"
        }`}
        title="Show full details (profile view)"
      >
        <Info className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Details</span>
      </button>
    </motion.div>
  );
};

export default ReaderToolbar;
