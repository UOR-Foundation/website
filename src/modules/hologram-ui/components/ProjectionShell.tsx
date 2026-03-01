/**
 * ProjectionShell — GPU-promoted panel projection from the sidebar
 * ═══════════════════════════════════════════════════════════════════
 *
 * Performance architecture:
 *   - Pure CSS transitions (no framer-motion JS interpolation)
 *   - translate3d for compositor-promoted animation
 *   - contain: layout style paint for isolation
 *   - Keep-alive: once opened, content stays mounted for instant re-open
 *   - Preload: can be pre-mounted via `preload` prop (hover-triggered)
 *   - onPointerDown-ready: caller fires instantly, shell animates
 *
 * The projection metaphor: panels emanate from the sidebar edge,
 * sliding left-to-right as if projected by the kernel.
 */

import { useState, useEffect, memo, useRef, useCallback } from "react";

const SIDEBAR_WIDTH = 56;

/** Duration in ms — matched to quantum surface 0.22s standard */
const DURATION_MS = 220;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

interface ProjectionShellProps {
  /** Panel is visible and interactive */
  open: boolean;
  /** Pre-mount content without showing (hover preload) */
  preload?: boolean;
  /** Close handler */
  onClose: () => void;
  /** Unique key */
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
  // Track if backdrop should render (delayed unmount for exit animation)
  const [backdropVisible, setBackdropVisible] = useState(false);
  const backdropTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if ((open || preload) && !everMounted) {
      setEverMounted(true);
    }
  }, [open, preload, everMounted]);

  // Backdrop lifecycle: mount instantly on open, delayed unmount on close
  useEffect(() => {
    if (open) {
      clearTimeout(backdropTimeout.current);
      setBackdropVisible(true);
    } else {
      backdropTimeout.current = setTimeout(() => setBackdropVisible(false), DURATION_MS);
    }
    return () => clearTimeout(backdropTimeout.current);
  }, [open]);

  // Close on Escape — immediate response
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
    };
    window.addEventListener("keydown", handler, { passive: false });
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Nothing to render yet
  if (!everMounted) return null;

  return (
    <>
      {/* Backdrop — pure CSS opacity transition */}
      {backdropVisible && (
        <div
          className="fixed inset-0 z-[499]"
          style={{
            background: backdropColor,
            opacity: open ? 1 : 0,
            transition: `opacity ${DURATION_MS * 0.7}ms ease-out`,
            willChange: open ? "opacity" : "auto",
          }}
          onClick={onClose}
        />
      )}

      {/* Panel — GPU-promoted translate3d projection from sidebar edge */}
      <div
        className="fixed top-0 bottom-0 z-[500] flex"
        style={{
          left: SIDEBAR_WIDTH,
          right: 0,
          // GPU-promoted transform for smooth left-to-right projection
          transform: open ? "translate3d(0, 0, 0)" : "translate3d(-40px, 0, 0)",
          opacity: open ? 1 : 0,
          transition: `transform ${DURATION_MS}ms ${EASE}, opacity ${open ? DURATION_MS * 0.6 : DURATION_MS * 0.4}ms ${open ? EASE : "ease-out"}`,
          pointerEvents: open ? "auto" : "none",
          willChange: open ? "transform, opacity" : "auto",
          // Isolation: prevent layout thrashing from panel content
          contain: "layout style",
        }}
      >
        {/* Projection beam — light edge emanating from sidebar */}
        <div
          className="absolute top-0 bottom-0 left-0 pointer-events-none z-10"
          style={{
            width: open ? "2px" : "0px",
            background: beamGradient,
            opacity: open ? 1 : 0,
            transition: `opacity ${DURATION_MS}ms ${EASE}, width ${DURATION_MS}ms ${EASE}`,
          }}
        />

        {/* Projection glow — subtle light sweep on open */}
        <div
          className="absolute top-0 bottom-0 left-0 pointer-events-none z-[9]"
          style={{
            width: "80px",
            background: "linear-gradient(to right, hsla(38, 30%, 65%, 0.06), transparent)",
            opacity: open ? 1 : 0,
            transition: `opacity ${DURATION_MS * 1.5}ms ${EASE}`,
          }}
        />

        {children}
      </div>
    </>
  );
});
