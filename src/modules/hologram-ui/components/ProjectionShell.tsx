/**
 * ProjectionShell — Shared wrapper for all sidebar-originating panels
 * ═══════════════════════════════════════════════════════════════════
 *
 * Features:
 *   - Keep-alive: Once opened, content stays mounted (hidden) for instant re-open
 *   - Preload: Can be pre-mounted via `preload` prop (hover-triggered from sidebar)
 *   - GPU-promoted clip-path animation at 220ms
 *   - Zero-delay backdrop fade
 *
 * This eliminates React mount cost on repeat opens and enables
 * hover-based preloading for first opens.
 */

import { useState, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SIDEBAR_WIDTH = 56;
const SLIDE = { duration: 0.22, ease: [0.22, 1, 0.36, 1] } as const;
const FADE = { duration: 0.15, ease: "easeOut" } as const;

interface ProjectionShellProps {
  /** Panel is visible and interactive */
  open: boolean;
  /** Pre-mount content without showing (hover preload) */
  preload?: boolean;
  /** Close handler */
  onClose: () => void;
  /** Unique key for framer-motion */
  id: string;
  /** Backdrop color */
  backdropColor?: string;
  /** Projection beam gradient */
  beamGradient?: string;
  /** Panel content */
  children: React.ReactNode;
}

export default memo(function ProjectionShell({
  open,
  preload = false,
  onClose,
  id,
  backdropColor = "hsla(25, 8%, 4%, 0.25)",
  beamGradient = "linear-gradient(to bottom, hsla(38, 40%, 65%, 0.0), hsla(38, 40%, 65%, 0.15), hsla(38, 40%, 65%, 0.0))",
  children,
}: ProjectionShellProps) {
  // Keep-alive: once opened, stay mounted forever
  const [everMounted, setEverMounted] = useState(false);

  useEffect(() => {
    if ((open || preload) && !everMounted) {
      setEverMounted(true);
    }
  }, [open, preload, everMounted]);

  // Nothing to render yet
  if (!everMounted) return null;

  return (
    <>
      {/* Backdrop — only rendered when open */}
      <AnimatePresence>
        {open && (
          <motion.div
            key={`${id}-backdrop`}
            className="fixed inset-0 z-[499]"
            style={{ background: backdropColor }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={FADE}
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Panel — stays mounted after first open, animated via framer-motion */}
      <motion.div
        className="fixed top-0 bottom-0 z-[500] flex"
        style={{
          left: SIDEBAR_WIDTH,
          right: 0,
          transformOrigin: "left center",
          willChange: open ? "clip-path, opacity" : "auto",
          pointerEvents: open ? "auto" : "none",
        }}
        initial={false}
        animate={
          open
            ? { clipPath: "inset(0 0% 0 0)", opacity: 1 }
            : { clipPath: "inset(0 100% 0 0)", opacity: 0 }
        }
        transition={SLIDE}
      >
        {/* Projection beam */}
        <div
          className="absolute top-0 bottom-0 left-0 w-[2px] pointer-events-none z-10"
          style={{ background: beamGradient }}
        />
        {children}
      </motion.div>
    </>
  );
});
