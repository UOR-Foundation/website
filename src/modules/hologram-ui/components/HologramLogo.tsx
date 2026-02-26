/**
 * HologramLogo — Isometric Dot-Grid Hexagon/Cube with "H"
 * ════════════════════════════════════════════════════════
 *
 * A crisp SVG logo built from individual circles arranged in an
 * isometric grid forming a hexagonal outline that reads as a 3D cube.
 * Larger dots spell out the letter "H" through the center.
 *
 * @module hologram-ui/components/HologramLogo
 */

interface HologramLogoProps {
  size?: number;
  color?: string;
  className?: string;
}

/**
 * Isometric grid parameters:
 * - Hexagon is ~9 dots wide at its widest row
 * - Rows follow hex packing (offset every other row)
 * - "H" letter uses larger dots
 * - Cube illusion via the hex outline + subtle size gradients
 */

// Grid uses axial hex coordinates mapped to pixel positions
const DOT_SPACING = 10;
const HALF = DOT_SPACING / 2;

// Define the hex grid rows (y-index → array of x-positions)
// Each entry: [col, isLarge] where isLarge means part of "H"
type DotDef = [number, boolean];

// Build a symmetric hex grid with H pattern
// The grid is 9 columns wide at max, with hex offset rows
const ROWS: { y: number; dots: DotDef[] }[] = [
  // Row 0 (top) - 5 dots
  { y: 0, dots: [[-2,false],[-1,false],[0,false],[1,false],[2,false]] },
  // Row 1 - 6 dots (offset)
  { y: 1, dots: [[-2.5,false],[-1.5,false],[-0.5,false],[0.5,false],[1.5,false],[2.5,false]] },
  // Row 2 - 7 dots - H starts
  { y: 2, dots: [[-3,false],[-2,true],[-1,false],[0,false],[1,false],[2,true],[3,false]] },
  // Row 3 - 8 dots (offset)
  { y: 3, dots: [[-3.5,false],[-2.5,true],[-1.5,false],[-0.5,false],[0.5,false],[1.5,false],[2.5,true],[3.5,false]] },
  // Row 4 - 9 dots (widest) - H crossbar
  { y: 4, dots: [[-4,false],[-3,false],[-2,true],[-1,true],[0,true],[1,true],[2,true],[3,false],[4,false]] },
  // Row 5 - 8 dots (offset) - H crossbar continues
  { y: 5, dots: [[-3.5,false],[-2.5,true],[-1.5,true],[-0.5,true],[0.5,true],[1.5,true],[2.5,true],[3.5,false]] },
  // Row 6 - 9 dots (widest) - H crossbar
  { y: 6, dots: [[-4,false],[-3,false],[-2,true],[-1,true],[0,true],[1,true],[2,true],[3,false],[4,false]] },
  // Row 7 - 8 dots (offset)
  { y: 7, dots: [[-3.5,false],[-2.5,true],[-1.5,false],[-0.5,false],[0.5,false],[1.5,false],[2.5,true],[3.5,false]] },
  // Row 8 - 7 dots
  { y: 8, dots: [[-3,false],[-2,true],[-1,false],[0,false],[1,false],[2,true],[3,false]] },
  // Row 9 - 6 dots (offset)
  { y: 9, dots: [[-2.5,false],[-1.5,false],[-0.5,false],[0.5,false],[1.5,false],[2.5,false]] },
  // Row 10 (bottom) - 5 dots
  { y: 10, dots: [[-2,false],[-1,false],[0,false],[1,false],[2,false]] },
];

export default function HologramLogo({ size = 32, color = "currentColor", className }: HologramLogoProps) {
  // Compute viewBox from grid bounds
  const padding = 6;
  const gridWidth = 9 * DOT_SPACING;
  const gridHeight = 10 * DOT_SPACING * 0.866; // hex row height = spacing * √3/2
  const vbX = -gridWidth / 2 - padding;
  const vbY = -padding;
  const vbW = gridWidth + padding * 2;
  const vbH = gridHeight + padding * 2;

  const rowHeight = DOT_SPACING * 0.866;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Hologram logo"
    >
      {ROWS.map((row) =>
        row.dots.map(([col, isH], di) => {
          const cx = col * DOT_SPACING;
          const cy = row.y * rowHeight;
          const r = isH ? 3.2 : 2.0;
          const opacity = isH ? 1 : 0.55;
          return (
            <circle
              key={`${row.y}-${di}`}
              cx={cx}
              cy={cy}
              r={r}
              fill={color}
              opacity={opacity}
            />
          );
        })
      )}
    </svg>
  );
}
