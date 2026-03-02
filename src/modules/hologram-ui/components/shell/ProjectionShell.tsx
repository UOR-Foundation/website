/**
 * ProjectionShell — Holographic panel projection from the sidebar
 * ═══════════════════════════════════════════════════════════════════
 *
 * Visual metaphor: the sidebar is the base of a holographic projector.
 * Each panel EMANATES from the sidebar edge, sweeping left-to-right
 * as if projected by light. On close, it retraces right-to-left back
 * into the sidebar — a seamless, organic reveal/collapse.
 *
 * Performance architecture:
 *   - clip-path for the projection reveal (GPU-composited)
 *   - translate3d for content momentum (compositor-promoted)
 *   - No framer-motion JS — pure CSS transitions
 *   - Keep-alive: once opened, content stays mounted
 *   - Preload: can be pre-mounted via `preload` prop
 */

import { useState, useEffect, memo, useRef } from "react";
import {
  DURATION_PROJECT_MS,
  DURATION_BACKDROP_MS,
  EASE_PROJECT,
  EASE_DISMISS,
} from "@/modules/hologram-ui/theme/projection-transitions";

const SIDEBAR_WIDTH = 56;

/** Slightly longer duration for the holographic reveal for elegance */
const REVEAL_MS = Math.round(DURATION_PROJECT_MS * 1.1); // ~374ms

interface ProjectionShellProps {
  /** Panel is visible and interactive */
  open: boolean;
  /** Pre-mount content without showing (hover preload) */
  preload?: boolean;
  /** Keep mounted after close (default true). Set false for heavy panels. */
  keepAlive?: boolean;
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
  keepAlive = true,
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
  const unmountTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(unmountTimeout.current);

    if (open || preload) {
      if (!everMounted) setEverMounted(true);
      return;
    }

    if (!keepAlive && everMounted) {
      unmountTimeout.current = setTimeout(() => setEverMounted(false), REVEAL_MS + 60);
    }

    return () => clearTimeout(unmountTimeout.current);
  }, [open, preload, keepAlive, everMounted]);

  // Backdrop lifecycle
  useEffect(() => {
    if (open) {
      clearTimeout(backdropTimeout.current);
      setBackdropVisible(true);
    } else {
      backdropTimeout.current = setTimeout(() => setBackdropVisible(false), REVEAL_MS + 50);
    }
    return () => clearTimeout(backdropTimeout.current);
  }, [open]);

  // Close on Escape
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
    <>
      {/* ── Backdrop — fades with the projection ── */}
      {backdropVisible && (
        <div
          className="fixed inset-0 z-[499]"
          style={{
            background: backdropColor,
            opacity: open ? 1 : 0,
            transition: `opacity ${DURATION_BACKDROP_MS}ms ease-out`,
            willChange: open ? "opacity" : "auto",
          }}
          onClick={onClose}
        />
      )}

      {/* ── Holographic Projection Container ── 
           Uses clip-path to create the left-to-right reveal effect.
           The panel is always positioned flush against the sidebar edge
           with zero gap, and the clip sweeps from 0% to 100% width. */}
      <div
        className="fixed top-0 bottom-0 z-[500]"
        style={{
          left: SIDEBAR_WIDTH,
          right: 0,
          // Holographic reveal: clip-path sweeps from left edge to full width
          clipPath: open ? "inset(0 0 0 0)" : "inset(0 100% 0 0)",
          transition: open
            ? `clip-path ${REVEAL_MS}ms ${EASE_PROJECT}`
            : `clip-path ${REVEAL_MS}ms ${EASE_DISMISS}`,
          pointerEvents: open ? "auto" : "none",
          // Isolation
          contain: "layout style",
          willChange: open ? "clip-path" : "auto",
        }}
      >
        {/* ── Content with subtle momentum shift ── 
             The content slides slightly from left during reveal,
             creating depth and the feeling of projection. */}
        <div
          className="absolute inset-0"
          style={{
            transform: open ? "translate3d(0, 0, 0)" : "translate3d(-24px, 0, 0)",
            opacity: open ? 1 : 0.7,
            transition: open
              ? `transform ${REVEAL_MS}ms ${EASE_PROJECT}, opacity ${Math.round(REVEAL_MS * 0.5)}ms ${EASE_PROJECT}`
              : `transform ${Math.round(REVEAL_MS * 0.8)}ms ${EASE_DISMISS}, opacity ${Math.round(REVEAL_MS * 0.3)}ms ease-out`,
            // Skip rendering when closed — critical for performance
            contentVisibility: open ? "visible" : "hidden",
            containIntrinsicSize: "auto 100vh",
            contain: open ? "layout style" : "layout style size paint",
          }}
        >
          {children}
        </div>

        {/* ── Projection beam — thin light edge at the sidebar boundary ── */}
        <div
          className="absolute top-0 bottom-0 left-0 pointer-events-none z-10 hdr-beam"
          style={{
            width: "2px",
            background: beamGradient,
            opacity: open ? 1 : 0,
            transition: `opacity ${Math.round(REVEAL_MS * 0.6)}ms ${EASE_PROJECT}`,
          }}
        />

        {/* ── Projection glow — soft light sweep emanating from sidebar ── */}
        <div
          className="absolute top-0 bottom-0 left-0 pointer-events-none z-[9] hdr-beam"
          style={{
            width: "120px",
            background: "linear-gradient(to right, hsla(38, 30%, 65%, 0.07), hsla(38, 30%, 65%, 0.02) 40%, transparent)",
            opacity: open ? 1 : 0,
            transition: `opacity ${REVEAL_MS}ms ${EASE_PROJECT}`,
          }}
        />

        {/* ── Leading edge highlight — the "projection wavefront" ── 
             A subtle bright edge that appears at the expanding frontier */}
        <div
          className="absolute top-0 bottom-0 pointer-events-none z-[11]"
          style={{
            right: 0,
            width: "1px",
            background: "linear-gradient(to bottom, hsla(38, 40%, 70%, 0), hsla(38, 40%, 70%, 0.08), hsla(38, 40%, 70%, 0))",
            opacity: open ? 0 : 0,
            transition: `opacity ${Math.round(REVEAL_MS * 0.3)}ms ease-out`,
          }}
        />
      </div>
    </>
  );
});
