/**
 * LayerNavHUD — Minimal heads-up display for layer navigation
 * ═══════════════════════════════════════════════════════════
 *
 * Shows current focused layer with keyboard hints.
 * Appears when a layer is focused, fades when viewing all.
 */

import { motion, AnimatePresence } from "framer-motion";
import { getLayerLabel, type LayerNavState } from "../hooks/useLayerNav";

const LAYERS = [0, 1, 2, 3];

const LAYER_COLORS = [
  "hsl(220, 60%, 65%)", // 0 canvas
  "hsl(160, 50%, 55%)", // 1 chrome
  "hsl(38, 55%, 60%)",  // 2 content
  "hsl(340, 50%, 60%)", // 3 overlay
];

interface LayerNavHUDProps {
  nav: LayerNavState;
}

export default function LayerNavHUD({ nav }: LayerNavHUDProps) {
  return (
    <div
      className="fixed top-4 right-4 z-[9998] flex items-center gap-1.5"
      style={{ fontFamily: "'DM Sans', monospace, system-ui" }}
    >
      {LAYERS.map((layer) => {
        const active = nav.focusedLayer === layer;
        const color = LAYER_COLORS[layer];

        return (
          <button
            key={layer}
            onClick={() => nav.setFocus(active ? null : layer)}
            className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-300"
            style={{
              background: active
                ? `${color}22`
                : "hsla(220, 15%, 15%, 0.5)",
              border: `1px solid ${active ? color : "hsla(220, 15%, 25%, 0.4)"}`,
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              opacity: nav.focusedLayer === null || active ? 1 : 0.4,
              transform: active ? "scale(1.05)" : "scale(1)",
            }}
            title={`${getLayerLabel(layer)} (⌘${layer + 1})`}
          >
            <span
              className="w-2 h-2 rounded-full transition-all duration-300"
              style={{
                background: color,
                boxShadow: active ? `0 0 8px ${color}` : "none",
              }}
            />
            <span
              className="text-[10px] font-medium tracking-wide"
              style={{ color: active ? color : "hsla(0, 0%, 100%, 0.5)" }}
            >
              {layer + 1}
            </span>
          </button>
        );
      })}

      {/* Active layer label */}
      <AnimatePresence>
        {nav.focusedLayer !== null && (
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2 }}
            className="ml-1 text-[11px] tracking-widest uppercase font-medium"
            style={{ color: LAYER_COLORS[nav.focusedLayer] ?? "hsla(0,0%,100%,0.6)" }}
          >
            {getLayerLabel(nav.focusedLayer)}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
