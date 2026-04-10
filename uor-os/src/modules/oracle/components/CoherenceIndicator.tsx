/**
 * CoherenceIndicator — Ambient session coherence feedback.
 *
 * A thin gradient bar at the top of the immersive view that shifts
 * from cool blue (scattered) → warm gold (deep focus).
 * No numbers, no text — purely ambient, like breathing rhythm.
 *
 * Migrated from framer-motion to CSS animations for zero JS overhead.
 */

import React from "react";

interface CoherenceIndicatorProps {
  /** 0 = scattered, 1 = deeply focused */
  coherence: number;
}

function getCoherenceGradient(c: number): string {
  if (c >= 0.7) return "linear-gradient(90deg, hsl(38, 90%, 55%), hsl(45, 95%, 60%), hsl(38, 90%, 55%))";
  if (c >= 0.4) return "linear-gradient(90deg, hsl(180, 60%, 45%), hsl(160, 50%, 50%), hsl(180, 60%, 45%))";
  return "linear-gradient(90deg, hsl(210, 70%, 55%), hsl(220, 60%, 60%), hsl(210, 70%, 55%))";
}

const CoherenceIndicator: React.FC<CoherenceIndicatorProps> = ({ coherence }) => {
  return (
    <div
      className="sov-fade-in"
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
      {/* Subtle pulse animation — pure CSS */}
      <div
        className="sov-coherence-pulse"
        style={{
          position: "absolute",
          inset: 0,
          background: "inherit",
          filter: "blur(4px)",
        }}
      />
    </div>
  );
};

export default CoherenceIndicator;
