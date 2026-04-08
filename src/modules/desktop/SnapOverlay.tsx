/**
 * SnapOverlay — Translucent snap preview rectangle. Theme-aware.
 */

import { motion, AnimatePresence } from "framer-motion";
import type { SnapZone } from "@/modules/desktop/hooks/useWindowManager";
import { snapZoneToRect } from "@/modules/desktop/hooks/useWindowManager";
import { useDesktopTheme } from "@/modules/desktop/hooks/useDesktopTheme";

interface Props {
  zone: SnapZone | null;
}

export default function SnapOverlay({ zone }: Props) {
  const rect = zone ? snapZoneToRect(zone) : null;
  const { isLight } = useDesktopTheme();

  const bg = isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)";
  const border = isLight ? "2px solid rgba(0,0,0,0.10)" : "2px solid rgba(255,255,255,0.12)";

  return (
    <AnimatePresence>
      {rect && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.15 }}
          className="fixed z-[180] pointer-events-none rounded-xl"
          style={{ top: rect.y, left: rect.x, width: rect.w, height: rect.h, background: bg, border, backdropFilter: "blur(8px)" }}
        />
      )}
    </AnimatePresence>
  );
}
