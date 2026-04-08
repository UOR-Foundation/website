/**
 * CoherenceIndicator — Ambient session coherence feedback.
 *
 * A thin gradient bar at the top of the immersive view that shifts
 * from cool blue (scattered) → warm gold (deep focus).
 * No numbers, no text — purely ambient, like breathing rhythm.
 */

import React from "react";
import { motion } from "framer-motion";

interface CoherenceIndicatorProps {
  /** 0 = scattered, 1 = deeply focused */
  coherence: number;
}

function getCoherenceGradient(c: number): string {
  // Blue (scattered) → Teal → Gold (focused)
  if (c >= 0.7) return "linear-gradient(90deg, hsl(38, 90%, 55%), hsl(45, 95%, 60%), hsl(38, 90%, 55%))";
  if (c >= 0.4) return "linear-gradient(90deg, hsl(180, 60%, 45%), hsl(160, 50%, 50%), hsl(180, 60%, 45%))";
  return "linear-gradient(90deg, hsl(210, 70%, 55%), hsl(220, 60%, 60%), hsl(210, 70%, 55%))";
}

const CoherenceIndicator: React.FC<CoherenceIndicatorProps> = ({ coherence }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, delay: 0.5 }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        zIndex: 100,
        background: getCoherenceGradient(coherence),
        transition: "background 2s ease",
      }}
    >
      {/* Subtle pulse animation */}
      <motion.div
        animate={{
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          position: "absolute",
          inset: 0,
          background: "inherit",
          filter: "blur(4px)",
        }}
      />
    </motion.div>
  );
};

export default CoherenceIndicator;
