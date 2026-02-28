/**
 * JupyterProjection — Sidebar-originating Jupyter workspace panel
 *
 * Identical projection animation to Terminal/Browser/Compute panels.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import QuantumJupyterWorkspace from "@/modules/qkernel/notebook/QuantumJupyterWorkspace";

interface JupyterProjectionProps {
  open: boolean;
  onClose: () => void;
}

const SIDEBAR_WIDTH = 68;

export default function JupyterProjection({ open, onClose }: JupyterProjectionProps) {
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
          <motion.div
            key="jupyter-backdrop"
            className="fixed inset-0 z-[499]"
            style={{ background: "hsla(0, 0%, 0%, 0.4)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            onClick={onClose}
          />
          <motion.div
            key="jupyter-panel"
            className="fixed top-0 bottom-0 z-[500] flex"
            style={{ left: SIDEBAR_WIDTH, right: 0, transformOrigin: "left center" }}
            initial={{ clipPath: `inset(0 100% 0 0)`, opacity: 0.3 }}
            animate={{ clipPath: `inset(0 0% 0 0)`, opacity: 1 }}
            exit={{ clipPath: `inset(0 100% 0 0)`, opacity: 0.3 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              className="absolute top-0 bottom-0 left-0 w-[2px] pointer-events-none z-10"
              style={{ background: "linear-gradient(to bottom, hsla(38, 50%, 55%, 0.0), hsla(38, 50%, 55%, 0.25), hsla(38, 50%, 55%, 0.0))" }}
            />
            <div className="flex-1 overflow-hidden" style={{ background: "hsl(30, 6%, 97%)" }}>
              <QuantumJupyterWorkspace onClose={onClose} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
