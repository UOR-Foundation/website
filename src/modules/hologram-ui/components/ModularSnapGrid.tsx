/**
 * ModularSnapGrid — Subtle Background Grid for Panel Alignment
 * ═════════════════════════════════════════════════════════════
 *
 * A barely-visible grid that fades in when panels are being resized or
 * dragged, providing spatial awareness for modular layout alignment.
 * Disappears when interaction ends for a clean, tranquil canvas.
 *
 * @module hologram-ui/components/ModularSnapGrid
 */

import { GRID_SNAP } from "@/modules/hologram-ui/hooks/useModularPanel";

interface ModularSnapGridProps {
  /** Show the grid (e.g. during resize) */
  visible: boolean;
  /** Optional class for container */
  className?: string;
}

export default function ModularSnapGrid({ visible, className = "" }: ModularSnapGridProps) {
  return (
    <div
      className={`fixed inset-0 pointer-events-none z-[5] transition-opacity duration-500 ${className}`}
      style={{ opacity: visible ? 1 : 0 }}
    >
      {/* Dot grid pattern */}
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern
            id="hologram-snap-grid"
            x="0"
            y="0"
            width={GRID_SNAP}
            height={GRID_SNAP}
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx={GRID_SNAP / 2}
              cy={GRID_SNAP / 2}
              r="0.6"
              fill="hsla(38, 20%, 55%, 0.12)"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hologram-snap-grid)" />
      </svg>

      {/* Soft edge vignette so grid fades at viewport edges */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 50%, hsla(25, 10%, 6%, 0.8) 100%)",
        }}
      />
    </div>
  );
}
