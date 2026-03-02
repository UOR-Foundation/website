/**
 * HologramLogo — Hexagonal Dot-Grid Mark
 * ════════════════════════════════════════
 *
 * High-fidelity recreation of the reference logo: a hexagonal shape
 * composed of circles in 4 size tiers. Seven vertical "cascade columns"
 * create a wave-like rhythm where dots grow from tiny (top) to large
 * (center-bottom), producing a dynamic, dimensional feel.
 *
 * Grid: hex-packed (offset rows), 11 rows, max 8 columns at widest.
 * Sizes: 0 = tiny (1.4r), 1 = small (2.4r), 2 = medium (3.4r), 3 = large (4.6r)
 */

interface HologramLogoProps {
  size?: number;
  color?: string;
  className?: string;
  /** Enable subtle pulse animation on large dots */
  animate?: boolean;
}

// Dot definition: [column-offset, size-tier]
// Column offsets are in half-unit steps for hex packing
type Dot = [number, 0 | 1 | 2 | 3];

// Mapped from reference image — 11 rows, hex-packed
// The 7 vertical "stripes" cascade from small→large top→bottom
const GRID: { dots: Dot[] }[] = [
  // Row 0 (top) — 4 dots, all tiny
  { dots: [[-1.5, 0], [-0.5, 0], [0.5, 0], [1.5, 0]] },
  // Row 1 — 5 dots, offset; center-right starts growing
  { dots: [[-2, 0], [-1, 0], [0, 0], [1, 1], [2, 0]] },
  // Row 2 — 6 dots; cascade columns 3,5 emerge
  { dots: [[-2.5, 0], [-1.5, 0], [-0.5, 1], [0.5, 2], [1.5, 1], [2.5, 0]] },
  // Row 3 — 7 dots; columns grow further
  { dots: [[-3, 0], [-2, 0], [-1, 1], [0, 2], [1, 3], [2, 2], [3, 0]] },
  // Row 4 — 7 dots; large dots in center-right
  { dots: [[-3, 0], [-2, 1], [-1, 2], [0, 3], [1, 3], [2, 3], [3, 1]] },
  // Row 5 — 8 dots (widest); peak size across middle
  { dots: [[-3.5, 0], [-2.5, 2], [-1.5, 3], [-0.5, 3], [0.5, 3], [1.5, 3], [2.5, 3], [3.5, 0]] },
  // Row 6 — 7 dots; still large in center
  { dots: [[-3, 0], [-2, 2], [-1, 3], [0, 3], [1, 3], [2, 2], [3, 0]] },
  // Row 7 — 7 dots; cascade descending
  { dots: [[-3, 0], [-2, 2], [-1, 2], [0, 3], [1, 2], [2, 1], [3, 0]] },
  // Row 8 — 6 dots; winding down
  { dots: [[-2.5, 0], [-1.5, 1], [-0.5, 2], [0.5, 2], [1.5, 1], [2.5, 0]] },
  // Row 9 — 5 dots; small
  { dots: [[-2, 0], [-1, 1], [0, 1], [1, 1], [2, 0]] },
  // Row 10 (bottom) — 4 dots; tiny
  { dots: [[-1.5, 0], [-0.5, 0], [0.5, 0], [1.5, 0]] },
];

// φ-proportioned radii: each tier ≈ φ^0.5 × previous
const RADII = [1.3, 2.2, 3.3, 4.5] as const;
const OPACITIES = [0.3, 0.5, 0.75, 1.0] as const;

const COL_SPACING = 10;
const ROW_HEIGHT = COL_SPACING * 0.866; // hex packing: √3/2

export default function HologramLogo({
  size = 32,
  color = "currentColor",
  className,
  animate = false,
}: HologramLogoProps) {
  const pad = 7;
  const w = 8 * COL_SPACING + pad * 2;
  const h = (GRID.length - 1) * ROW_HEIGHT + pad * 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`${-w / 2} ${-pad} ${w} ${h}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Hologram logo"
    >
      {animate && (
        <style>{`
          @keyframes holo-dot-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        `}</style>
      )}
      {GRID.map((row, ri) =>
        row.dots.map(([col, sz], di) => (
          <circle
            key={`${ri}-${di}`}
            cx={col * COL_SPACING}
            cy={ri * ROW_HEIGHT}
            r={RADII[sz]}
            fill={color}
            opacity={OPACITIES[sz]}
            style={
              animate && sz >= 2
                ? {
                    animation: `holo-dot-pulse ${2.4 + ri * 0.18}s ease-in-out infinite`,
                    animationDelay: `${di * 0.12}s`,
                  }
                : undefined
            }
          />
        ))
      )}
    </svg>
  );
}
