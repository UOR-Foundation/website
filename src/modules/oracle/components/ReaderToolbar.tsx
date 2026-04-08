/**
 * ReaderToolbar — Browser-like address bar for the immersive reader.
 * Desktop immersive: auto-hides after 3s of mouse inactivity, mouse-to-top reveals.
 * Designed to feel like a native browser chrome for seamless familiarity.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Home,
  Shield,
  Star,
  Share2,
  Info,
  Maximize2,
  Minimize2,
  Lock,
} from "lucide-react";
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
const DESKTOP_REVEAL_ZONE = 80;

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
    return null;
  }

  /* ── Shared icon button ── */
  const IconBtn = ({
    onClick,
    title,
    children,
    disabled = false,
    className = "",
  }: {
    onClick?: () => void;
    title: string;
    children: React.ReactNode;
    disabled?: boolean;
    className?: string;
  }) => (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`p-1.5 rounded-md transition-all shrink-0 ${
        immersive
          ? `text-white/40 hover:text-white/80 hover:bg-white/[0.08] ${disabled ? "opacity-20 cursor-default" : ""}`
          : `text-muted-foreground/40 hover:text-foreground/70 hover:bg-muted/15 ${disabled ? "opacity-20 cursor-default" : ""}`
      } ${className}`}
    >
      {children}
    </button>
  );

  // ── Compact mobile immersive toolbar ──
  if (mobileAutoHide) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
        className="sticky top-0 z-40 flex items-center gap-1 px-2 py-1.5 backdrop-blur-2xl border-b border-white/[0.04]"
        style={{
          background: "rgba(255,255,255,0.06)",
          paddingTop: "max(6px, env(safe-area-inset-top, 6px))",
        }}
      >
        <IconBtn onClick={onBack} title="Back"><ArrowLeft className="w-4 h-4" /></IconBtn>

        {/* Address bar */}
        <div className="flex-1 flex items-center gap-1.5 min-w-0 h-8 rounded-full px-3"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <Lock className="w-3 h-3 text-emerald-400/70 shrink-0" />
          <span className="text-[13px] font-display truncate text-white/70 flex-1 min-w-0">
            {triwordDisplay}
          </span>
        </div>

        <IconBtn onClick={onToggleDetails} title="Details"><Info className="w-3.5 h-3.5" /></IconBtn>
      </motion.div>
    );
  }

  // ── Desktop immersive toolbar (browser-style chrome) ──
  if (desktopAutoHide) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-2xl border-b border-white/[0.06]"
        style={{ background: "rgba(10,14,18,0.75)" }}
      >
        {/* ── Browser chrome row ── */}
        <div className="flex items-center gap-1.5 px-4 py-1.5">
          {/* Navigation buttons */}
          <div className="flex items-center gap-0.5 mr-1">
            <IconBtn onClick={onBack} title="Back (Alt+←)"><ArrowLeft className="w-4 h-4" /></IconBtn>
            <IconBtn disabled title="Forward (Alt+→)"><ArrowRight className="w-4 h-4" /></IconBtn>
            <IconBtn onClick={onBack} title="Reload"><RotateCcw className="w-3.5 h-3.5" /></IconBtn>
            <IconBtn onClick={onBack} title="Home"><Home className="w-4 h-4" /></IconBtn>
          </div>

          {/* ── Address bar ── */}
          <div
            className="flex-1 flex items-center gap-2 min-w-0 h-[34px] rounded-full px-3.5 cursor-text group transition-all"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.15)",
            }}
            title="Click to search"
            onClick={onBack}
          >
            <Lock className="w-3.5 h-3.5 text-emerald-400/80 shrink-0" />
            <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
              <span className="text-[13px] text-white/40 shrink-0 select-none">uor://</span>
              <span className="text-[13px] font-display tracking-wide text-white/80 truncate">
                {triwordDisplay}
              </span>
              <span className="shrink-0 inline-flex items-center px-1.5 py-px rounded text-[9px] font-semibold uppercase tracking-[0.08em] bg-white/[0.06] text-white/35 border border-white/[0.06] ml-1">
                {typeLabel}
              </span>
            </div>
            <Shield className="w-3.5 h-3.5 text-white/25 shrink-0 group-hover:text-white/40 transition-colors" />
          </div>

          {/* ── Right-side actions ── */}
          <div className="flex items-center gap-0.5 ml-1">
            <IconBtn title="Bookmark" onClick={() => {}}><Star className="w-4 h-4" /></IconBtn>
            <IconBtn title="Share" onClick={() => {}}><Share2 className="w-3.5 h-3.5" /></IconBtn>
            <IconBtn onClick={onToggleDetails} title="Page info">
              <Info className="w-4 h-4" />
            </IconBtn>
          </div>
        </div>

        {/* ── Lens bar (tab-like row beneath address bar) ── */}
        <div className="flex items-center gap-0.5 px-5 pb-1.5 -mt-0.5">
          {KNOWLEDGE_LENSES.map((lens) => {
            const isActive = lens.id === activeLens;
            return (
              <button
                key={lens.id}
                onClick={() => !isActive && onLensChange(lens.id)}
                disabled={synthesizing && isActive}
                title={lens.description}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all border ${
                  isActive
                    ? "bg-white/[0.12] text-white/90 border-white/[0.15]"
                    : "text-white/35 hover:text-white/65 hover:bg-white/[0.06] border-transparent"
                } ${synthesizing && !isActive ? "opacity-30 cursor-wait" : "cursor-pointer"}`}
              >
                {lens.label}
              </button>
            );
          })}
        </div>
      </motion.div>
    );
  }

  // ── Default toolbar (desktop non-immersive — also browser-style) ──
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className="sticky top-0 z-40 backdrop-blur-2xl border-b border-border/5"
      style={{ background: "hsl(var(--background) / 0.82)" }}
    >
      <div className="flex items-center gap-1.5 px-4 py-1.5">
        {/* Navigation */}
        <div className="flex items-center gap-0.5 mr-1">
          <IconBtn onClick={onBack} title="Back"><ArrowLeft className="w-4 h-4" /></IconBtn>
          <IconBtn disabled title="Forward"><ArrowRight className="w-4 h-4" /></IconBtn>
          <IconBtn onClick={onBack} title="Reload"><RotateCcw className="w-3.5 h-3.5" /></IconBtn>
          <IconBtn onClick={onBack} title="Home"><Home className="w-4 h-4" /></IconBtn>
        </div>

        {/* Address bar */}
        <div
          className="flex-1 flex items-center gap-2 min-w-0 h-[34px] rounded-full px-3.5 cursor-text group transition-all"
          style={{
            background: "hsl(var(--muted) / 0.15)",
            border: "1px solid hsl(var(--border) / 0.12)",
            boxShadow: "inset 0 1px 2px hsl(var(--background) / 0.3)",
          }}
          onClick={onBack}
        >
          <Lock className="w-3.5 h-3.5 text-emerald-500/70 shrink-0" />
          <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
            <span className="text-[13px] text-muted-foreground/40 shrink-0 select-none">uor://</span>
            <span className="text-[13px] font-display tracking-wide text-foreground/75 truncate">
              {triwordDisplay}
            </span>
            <span className="shrink-0 inline-flex items-center px-1.5 py-px rounded text-[9px] font-semibold uppercase tracking-[0.08em] bg-accent/10 text-accent-foreground/50 border border-accent/10 ml-1">
              {typeLabel}
            </span>
          </div>
          <Shield className="w-3.5 h-3.5 text-muted-foreground/25 shrink-0 group-hover:text-muted-foreground/40 transition-colors" />
        </div>

        {/* Right-side */}
        <div className="flex items-center gap-0.5 ml-1">
          <IconBtn title="Bookmark"><Star className="w-4 h-4" /></IconBtn>
          <IconBtn title="Share"><Share2 className="w-3.5 h-3.5" /></IconBtn>
          <IconBtn onClick={onToggleDetails} title="Page info"><Info className="w-4 h-4" /></IconBtn>
        </div>
      </div>

      {/* Lens bar */}
      <div className="hidden md:flex items-center gap-0.5 px-5 pb-1.5 -mt-0.5">
        {KNOWLEDGE_LENSES.map((lens) => {
          const isActive = lens.id === activeLens;
          return (
            <button
              key={lens.id}
              onClick={() => !isActive && onLensChange(lens.id)}
              disabled={synthesizing && isActive}
              title={lens.description}
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all border ${
                isActive
                  ? "bg-primary/12 text-primary border-primary/20"
                  : "text-muted-foreground/35 hover:text-foreground/55 hover:bg-muted/10 border-transparent"
              } ${synthesizing && !isActive ? "opacity-30 cursor-wait" : "cursor-pointer"}`}
            >
              {lens.label}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};

export default ReaderToolbar;
