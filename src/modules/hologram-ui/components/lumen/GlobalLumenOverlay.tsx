/**
 * GlobalLumenOverlay — Right-side Lumen panel overlay
 * ════════════════════════════════════════════════════
 *
 * Opens Lumen as a slide-out panel on any non-home page,
 * keeping the underlying page visible and interactive.
 * Keep-alive: mounts on first open, then stays mounted for instant re-open.
 * Uses ConvergenceChat for visual continuity with the fullscreen Lumen.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import ConvergenceChat from "@/modules/hologram-ui/components/lumen/ConvergenceChat";

/** Show on /hologram console only — /hologram-os has its own chat overlay */
const ALLOWED_ROUTES = ["/hologram"];
const PANEL_WIDTH = 440;

export default function GlobalLumenOverlay() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const hasBeenOpenedRef = useRef(false);

  // Only show on hologram routes
  const isHidden = !ALLOWED_ROUTES.includes(pathname);

  if (open) hasBeenOpenedRef.current = true;

  // Listen for lumen:open-global event from pill
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("lumen:open-global", handler);
    return () => window.removeEventListener("lumen:open-global", handler);
  }, []);

  // Close when navigating to home
  useEffect(() => {
    if (isHidden) setOpen(false);
  }, [isHidden]);

  const handleClose = useCallback(() => setOpen(false), []);

  if (isHidden || !hasBeenOpenedRef.current) return null;

  return (
    <>
      {/* Subtle scrim — click to close, keeps page visible */}
      <div
        onClick={handleClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9500,
          background: "hsla(0, 0%, 0%, 0.12)",
          backdropFilter: "blur(1px)",
          WebkitBackdropFilter: "blur(1px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 350ms cubic-bezier(0.22, 0.61, 0.36, 1)",
          willChange: open ? "opacity" : "auto",
        }}
      />

      {/* Chat panel — slides in from right, GPU-promoted */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: `${PANEL_WIDTH}px`,
          maxWidth: "90vw",
          zIndex: 9600,
          borderLeft: "1px solid hsla(38, 15%, 30%, 0.12)",
          boxShadow: open ? "-4px 0 30px hsla(0, 0%, 0%, 0.2)" : "none",
          overflow: "hidden",
          transform: open ? "translate3d(0, 0, 0)" : "translate3d(100%, 0, 0)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: open
            ? "transform 420ms cubic-bezier(0.22, 0.61, 0.36, 1), opacity 300ms cubic-bezier(0.22, 0.61, 0.36, 1)"
            : "transform 380ms cubic-bezier(0.32, 0, 0.15, 1), opacity 250ms ease-out",
          willChange: open ? "transform, opacity" : "auto",
          contain: "layout style paint",
        }}
      >
        <ConvergenceChat embedded onClose={handleClose} />
      </div>
    </>
  );
}
