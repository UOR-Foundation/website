/**
 * TerminalProjection — Sidebar-originating terminal panel
 *
 * Identical projection animation to Compute/Browser/Memory panels.
 * Slides out from the sidebar edge with clip-path animation.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import QShellEmbed from "@/modules/qkernel/pages/QShellEmbed";

interface TerminalProjectionProps {
  open: boolean;
  onClose: () => void;
  onOpenJupyter?: () => void;
}

const SIDEBAR_WIDTH = 68;

export default function TerminalProjection({ open, onClose, onOpenJupyter }: TerminalProjectionProps) {
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
            key="terminal-backdrop"
            className="fixed inset-0 z-[499]"
            style={{ background: "hsla(0, 0%, 0%, 0.4)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            onClick={onClose}
          />

          {/* Projected panel */}
          <motion.div
            key="terminal-panel"
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
                background: "linear-gradient(to bottom, hsla(120, 40%, 55%, 0.0), hsla(120, 40%, 55%, 0.2), hsla(120, 40%, 55%, 0.0))",
              }}
            />
            <QShellEmbed onClose={onClose} onOpenJupyter={onOpenJupyter} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
