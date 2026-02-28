/**
 * BrowserProjection — Elegant sidebar-originating browser panel
 * 
 * Animates as if "projected" from the sidebar tab outward to the right,
 * with a smooth spring-like expansion on open and graceful retraction on close.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import HologramBrowser from "./HologramBrowser";

interface BrowserProjectionProps {
  open: boolean;
  onClose: () => void;
  onSendToLumen?: (ctx: { title: string; url: string; markdown: string }) => void;
}

const SIDEBAR_WIDTH = 68;

export default function BrowserProjection({ open, onClose, onSendToLumen }: BrowserProjectionProps) {
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
          {/* Subtle backdrop for focus */}
          <motion.div
            key="browser-backdrop"
            className="fixed inset-0 z-[499]"
            style={{ background: "hsla(25, 8%, 4%, 0.25)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={onClose}
          />

          {/* Projected panel — originates from sidebar edge */}
          <motion.div
            key="browser-panel"
            className="fixed top-0 bottom-0 z-[500] flex"
            style={{
              left: SIDEBAR_WIDTH,
              right: 0,
              transformOrigin: "left center",
            }}
            initial={{
              clipPath: `inset(0 100% 0 0)`,
              opacity: 0.3,
            }}
            animate={{
              clipPath: `inset(0 0% 0 0)`,
              opacity: 1,
            }}
            exit={{
              clipPath: `inset(0 100% 0 0)`,
              opacity: 0.3,
            }}
            transition={{
              duration: 0.3,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {/* Inner glow edge — the "projection beam" effect */}
            <div
              className="absolute top-0 bottom-0 left-0 w-[2px] pointer-events-none z-10"
              style={{
                background: "linear-gradient(to bottom, hsla(38, 40%, 65%, 0.0), hsla(38, 40%, 65%, 0.15), hsla(38, 40%, 65%, 0.0))",
              }}
            />
            <HologramBrowser onClose={onClose} onSendToLumen={onSendToLumen} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
