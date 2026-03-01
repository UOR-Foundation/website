/**
 * HologramLogo — Isometric Dot-Grid Hexagon/Cube with "H"
 * ════════════════════════════════════════════════════════
 *
 * Precisely mapped from reference: a hex-packed dot grid forming a
 * hexagonal shape. Large dots spell "H", tiny dots fill the border.
 * The size contrast (4:1) is key to the visual identity.
 */

interface HologramLogoProps {
  size?: number;
  color?: string;
  className?: string;
}

// Each dot: [column, size] where size: 0=tiny, 1=medium, 2=large
type Dot = [number, 0 | 1 | 2];

const ROWS: { dots: Dot[] }[] = [
  // Row 0 (top) — 4 dots
  { dots: [[-1.5, 0], [-0.5, 0], [0.5, 0], [1.5, 1]] },
  // Row 1 — 5 dots, offset
  { dots: [[-2, 0], [-1, 0], [0, 1], [1, 2], [2, 1]] },
  // Row 2 — 6 dots — H pillars start
  { dots: [[-2.5, 0], [-1.5, 0], [-0.5, 2], [0.5, 0], [1.5, 2], [2.5, 2]] },
  // Row 3 — 7 dots
  { dots: [[-3, 0], [-2, 2], [-1, 0], [0, 0], [1, 2], [2, 2], [3, 0]] },
  // Row 4 — 7 dots — H crossbar
  { dots: [[-3, 0], [-2, 2], [-1, 2], [0, 2], [1, 2], [2, 2], [3, 0]] },
  // Row 5 — 8 dots — H crossbar continues (offset)
  { dots: [[-3.5, 0], [-2.5, 2], [-1.5, 2], [-0.5, 2], [0.5, 2], [1.5, 2], [2.5, 2], [3.5, 0]] },
  // Row 6 — 7 dots — below crossbar
  { dots: [[-3, 0], [-2, 2], [-1, 0], [0, 0], [1, 0], [2, 2], [3, 0]] },
  // Row 7 — 6 dots (offset)
  { dots: [[-2.5, 0], [-1.5, 2], [-0.5, 0], [0.5, 0], [1.5, 0], [2.5, 2]] },
  // Row 8 — 5 dots
  { dots: [[-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0]] },
  // Row 9 (bottom) — 4 dots
  { dots: [[-1.5, 0], [-0.5, 0], [0.5, 0], [1.5, 0]] },
];

const RADII = [1.2, 2.4, 4.2] as const;
const OPACITIES = [0.35, 0.65, 1.0] as const;

const COL_SPACING = 10;
const ROW_HEIGHT = COL_SPACING * 0.866; // √3/2

export default function HologramLogo({ size = 32, color = "currentColor", className }: HologramLogoProps) {
  const pad = 6;
  const w = 8 * COL_SPACING + pad * 2;
  const h = (ROWS.length - 1) * ROW_HEIGHT + pad * 2;

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
      {ROWS.map((row, ri) =>
        row.dots.map(([col, sz], di) => (
          <circle
            key={`${ri}-${di}`}
            cx={col * COL_SPACING}
            cy={ri * ROW_HEIGHT}
            r={RADII[sz]}
            fill={color}
            opacity={OPACITIES[sz]}
          />
        ))
      )}
    </svg>
  );
}
