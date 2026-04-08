/**
 * SnapOverlay — Shows a translucent preview rectangle where the window will snap.
 */

import { motion, AnimatePresence } from "framer-motion";
import type { SnapZone } from "@/modules/desktop/hooks/useWindowManager";
import { snapZoneToRect } from "@/modules/desktop/hooks/useWindowManager";

interface Props {
  zone: SnapZone | null;
}

export default function SnapOverlay({ zone }: Props) {
  const rect = zone ? snapZoneToRect(zone) : null;

  return (
    <AnimatePresence>
      {rect && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.15 }}
          className="fixed z-[180] pointer-events-none rounded-xl"
          style={{
            top: rect.y,
            left: rect.x,
            width: rect.w,
            height: rect.h,
            background: "rgba(255,255,255,0.06)",
            border: "2px solid rgba(255,255,255,0.12)",
            backdropFilter: "blur(8px)",
          }}
        />
      )}
    </AnimatePresence>
  );
}
