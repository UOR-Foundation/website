/**
 * AILabProjection — Full-screen AI Lab experience
 * Uses a dedicated full-screen overlay instead of the sidebar ProjectionShell
 * for an immersive, lab-like environment.
 */

import { lazy, Suspense, useEffect, useState, useRef, memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  DURATION_PROJECT_MS,
  EASE_PROJECT,
  EASE_DISMISS,
} from "@/modules/hologram-ui/theme/projection-transitions";

const AtlasProjectionLab = lazy(() => import("@/pages/AtlasProjectionLab"));

interface Props {
  open: boolean;
  preload?: boolean;
  onClose: () => void;
}

const REVEAL_MS = Math.round(DURATION_PROJECT_MS * 1.1);

export default memo(function AILabProjection({ open, preload, onClose }: Props) {
  const [everMounted, setEverMounted] = useState(false);
  const unmountRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(unmountRef.current);
    if (open || preload) {
      if (!everMounted) setEverMounted(true);
      return;
    }
    // Unmount after exit animation
    unmountRef.current = setTimeout(() => setEverMounted(false), REVEAL_MS + 100);
    return () => clearTimeout(unmountRef.current);
  }, [open, preload, everMounted]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
    };
    window.addEventListener("keydown", handler, { passive: false });
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!everMounted) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="ai-lab-backdrop"
            className="fixed inset-0 z-[600]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: REVEAL_MS / 1000, ease: [0.16, 1, 0.3, 1] }}
            style={{ background: "hsla(20, 8%, 3%, 0.85)", backdropFilter: "blur(12px)" }}
            onClick={onClose}
          />

          {/* Full-screen panel */}
          <motion.div
            key="ai-lab-panel"
            className="fixed inset-0 z-[601] flex flex-col"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.99 }}
            transition={{
              duration: REVEAL_MS / 1000,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {/* Close bar */}
            <div className="absolute top-4 right-6 z-10">
              <button
                onClick={onClose}
                className="group flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-mono tracking-wide transition-all duration-200"
                style={{
                  background: "hsla(25, 8%, 18%, 0.7)",
                  color: "hsl(30, 10%, 55%)",
                  border: "1px solid hsla(38, 12%, 70%, 0.1)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <span className="opacity-60 group-hover:opacity-100 transition-opacity">ESC</span>
                <span className="opacity-40">·</span>
                <span className="opacity-60 group-hover:opacity-100 transition-opacity">Close</span>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{
              background: "hsl(var(--hologram-bg))",
              color: "hsl(var(--hologram-text))",
            }}>
              <Suspense fallback={
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                      style={{ borderColor: "hsla(38, 40%, 55%, 0.3)", borderTopColor: "transparent" }} />
                    <span className="text-sm font-mono" style={{ color: "hsl(30, 10%, 45%)" }}>
                      Preparing AI Lab…
                    </span>
                  </div>
                </div>
              }>
                <AtlasProjectionLab />
              </Suspense>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});
