/**
 * GlobalLumenOverlay — Right-side Lumen AI panel overlay
 * ═══════════════════════════════════════════════════════
 *
 * Opens Lumen AI as a slide-out panel on any non-home page,
 * keeping the underlying page visible and interactive.
 */

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import HologramAiChat from "@/modules/hologram-ui/components/HologramAiChat";

const HIDDEN_ROUTES = ["/hologram-os"];
const PANEL_WIDTH = 440;

export default function GlobalLumenOverlay() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  // Hide on home page
  const isHidden = HIDDEN_ROUTES.includes(pathname);

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

  if (isHidden) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Subtle scrim — click to close, keeps page visible */}
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={handleClose}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9500,
              background: "hsla(0, 0%, 0%, 0.15)",
              backdropFilter: "blur(2px)",
              WebkitBackdropFilter: "blur(2px)",
            }}
          />

          {/* Chat panel — slides in from right */}
          <motion.div
            key="panel"
            initial={{ x: PANEL_WIDTH + 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: PANEL_WIDTH + 20, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
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
            }}
          >
            <HologramAiChat
              open={true}
              onClose={handleClose}
              panelWidth={PANEL_WIDTH}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
