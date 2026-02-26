/**
 * ComputeProjection — Sidebar-originating compute panel
 * 
 * Mirrors BrowserProjection: slides out from the sidebar edge with
 * the same clip-path animation and projection-beam glow effect.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import HologramCompute from "./HologramCompute";

interface ComputeProjectionProps {
  open: boolean;
  onClose: () => void;
}

const SIDEBAR_WIDTH = 68;

export default function ComputeProjection({ open, onClose }: ComputeProjectionProps) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (open) setShouldRender(true);
  }, [open]);

  const handleExitComplete = useCallback(() => {
    if (!open) setShouldRender(false);
  }, [open]);

  if (!shouldRender) return null;

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="compute-backdrop"
            className="fixed inset-0 z-[499]"
            style={{ background: "hsla(25, 8%, 4%, 0.25)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            onClick={onClose}
          />

          {/* Projected panel */}
          <motion.div
            key="compute-panel"
            className="fixed top-0 bottom-0 z-[500] flex"
            style={{
              left: SIDEBAR_WIDTH,
              right: 0,
              transformOrigin: "left center",
            }}
            initial={{ clipPath: `inset(0 100% 0 0)`, opacity: 0.3 }}
            animate={{ clipPath: `inset(0 0% 0 0)`, opacity: 1 }}
            exit={{ clipPath: `inset(0 100% 0 0)`, opacity: 0.3 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Projection beam */}
            <div
              className="absolute top-0 bottom-0 left-0 w-[2px] pointer-events-none z-10"
              style={{
                background: "linear-gradient(to bottom, hsla(38, 40%, 65%, 0.0), hsla(38, 40%, 65%, 0.15), hsla(38, 40%, 65%, 0.0))",
              }}
            />
            <HologramCompute onClose={onClose} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
