/**
 * GlobalLumenOverlay — Right-side Lumen AI panel overlay
 * ═══════════════════════════════════════════════════════
 *
 * Opens Lumen AI as a slide-out panel on any non-home page,
 * keeping the underlying page visible and interactive.
 * Keep-alive: mounts on first open, then stays mounted for instant re-open.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import HologramAiChat from "@/modules/hologram-ui/components/HologramAiChat";

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
          background: "hsla(0, 0%, 0%, 0.15)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.28s ease",
        }}
      />

      {/* Chat panel — slides in from right */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: `${PANEL_WIDTH}px`,
          maxWidth: "90vw",
          zIndex: 9600,
          borderLeft: "1px solid hsla(38, 15%, 30%, 0.2)",
          boxShadow: "-8px 0 40px hsla(0, 0%, 0%, 0.3)",
          overflow: "hidden",
          transform: open ? "translateX(0)" : `translateX(100%)`,
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.28s ease",
          willChange: "transform",
        }}
      >
        <HologramAiChat
          open={open}
          onClose={handleClose}
          panelWidth={PANEL_WIDTH}
        />
      </div>
    </>
  );
}
