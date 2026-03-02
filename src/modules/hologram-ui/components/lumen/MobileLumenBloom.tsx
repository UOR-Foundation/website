/**
 * MobileLumenBloom — Portal into Lumen
 * ═══════════════════════════════════════
 *
 * Radically simplified. No boxes, no frames, no clutter.
 * Just you and Lumen, inside the void.
 *
 * Golden Ratio governs all spacing.
 *
 * @module hologram-ui/components/lumen/MobileLumenBloom
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import HologramAiChat from "./HologramAiChat";
import { PP, GR } from "@/modules/hologram-ui/theme/portal-palette";
import { isPortalDark } from "@/modules/hologram-ui/theme/portal-palette";
import { Sun, Moon } from "lucide-react";
import { getPrimeTheme, setPrimeTheme } from "@/modules/hologram-ui/theme/prime-palette";

interface MobileLumenBloomProps {
  open: boolean;
  onClose: () => void;
  orbY?: number;
}

const ORGANIC_EASE = [0.23, 1, 0.32, 1] as const;
const BLOOM_DURATION = 0.7;

export default function MobileLumenBloom({ open, onClose, orbY }: MobileLumenBloomProps) {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(getPrimeTheme() === "dark");
  const swipeStartY = useRef<number | null>(null);

  useEffect(() => {
    if (open && !mounted) setMounted(true);
  }, [open, mounted]);

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

  const toggleTheme = useCallback(() => {
    const next = isDark ? "light" : "dark";
    setPrimeTheme(next);
    setIsDark(next === "dark");
  }, [isDark]);

  if (!mounted) return null;

  const originY = orbY ?? (typeof window !== "undefined" ? window.innerHeight * 0.82 : 700);

  return (
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
          {/* Minimal pull indicator */}
          <div
            className="flex justify-center"
            style={{ paddingTop: `calc(env(safe-area-inset-top, 8px) + ${GR.sm}px)` }}
          >
            <div
              className="rounded-full"
              style={{
                width: `${GR.xl}px`,
                height: 3,
                background: PP.textWhisper,
                opacity: 0.2,
              }}
            />
          </div>

          {/* Theme toggle — minimal, top-right */}
          <div
            className="absolute z-10"
            style={{
              top: `calc(env(safe-area-inset-top, 8px) + ${GR.sm}px)`,
              right: `${GR.lg}px`,
            }}
          >
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center active:scale-90 transition-transform"
              style={{
                width: `${GR.xl}px`,
                height: `${GR.xl}px`,
                borderRadius: "50%",
                color: PP.textWhisper,
                opacity: 0.4,
              }}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          {/* Chat — the portal. Full screen, no chrome. */}
          <div className="flex-1 overflow-hidden flex flex-col" style={{ marginTop: `${GR.sm}px` }}>
            <HologramAiChat open={open} onClose={onClose} mobilePortalMode />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
