/**
 * MemoryProjection — Instant sidebar-originating memory panel
 */

import { motion, AnimatePresence } from "framer-motion";
import HologramMemory from "./HologramMemory";

interface MemoryProjectionProps {
  open: boolean;
  onClose: () => void;
}

const SIDEBAR_WIDTH = 68;
const SLIDE = { duration: 0.22, ease: [0.22, 1, 0.36, 1] } as const;
const FADE = { duration: 0.15, ease: "easeOut" } as const;

export default function MemoryProjection({ open, onClose }: MemoryProjectionProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="memory-backdrop"
            className="fixed inset-0 z-[499]"
            style={{ background: "hsla(25, 8%, 4%, 0.25)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={FADE}
            onClick={onClose}
          />
          <motion.div
            key="memory-panel"
            className="fixed top-0 bottom-0 z-[500] flex"
            style={{ left: SIDEBAR_WIDTH, right: 0, transformOrigin: "left center", willChange: "clip-path, opacity" }}
            initial={{ clipPath: "inset(0 100% 0 0)", opacity: 0.3 }}
            animate={{ clipPath: "inset(0 0% 0 0)", opacity: 1 }}
            exit={{ clipPath: "inset(0 100% 0 0)", opacity: 0.3 }}
            transition={SLIDE}
          >
            <div
              className="absolute top-0 bottom-0 left-0 w-[2px] pointer-events-none z-10"
              style={{ background: "linear-gradient(to bottom, hsla(38, 40%, 65%, 0.0), hsla(38, 40%, 65%, 0.15), hsla(38, 40%, 65%, 0.0))" }}
            />
            <HologramMemory onClose={onClose} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
