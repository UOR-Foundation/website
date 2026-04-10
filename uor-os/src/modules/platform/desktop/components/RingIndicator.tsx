/**
 * RingIndicator — Subtle animated indicator shown when ring mode is active.
 */

import { motion, AnimatePresence } from "framer-motion";
import { useDesktopTheme } from "@/modules/platform/desktop/hooks/useDesktopTheme";

interface Props {
  active: boolean;
}

export default function RingIndicator({ active }: Props) {
  const { isLight } = useDesktopTheme();

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.95 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="fixed top-10 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{
            background: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className={`text-[14px] ${isLight ? "text-black/50" : "text-white/50"}`}
          >
            ⬡
          </motion.span>
          <span className={`text-[11px] font-medium tracking-wide ${isLight ? "text-black/40" : "text-white/40"}`}>
            Ring active — press a key…
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
