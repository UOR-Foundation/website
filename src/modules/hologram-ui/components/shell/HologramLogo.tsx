/**
 * HologramLogo — Hexagonal Dot-Grid Mark with 3D Holographic Shimmer
 * ═══════════════════════════════════════════════════════════════════
 *
 * High-fidelity hexagonal shape composed of circles in 4 size tiers.
 * Large dots feature a layered holographic glow: inner radial gradient,
 * outer halo, and a sweeping shimmer highlight that rotates across
 * the grid in a continuous wave.
 */

interface HologramLogoProps {
  size?: number;
  color?: string;
  className?: string;
  /** Enable holographic shimmer + glow on dots */
  animate?: boolean;
}

type Dot = [number, 0 | 1 | 2 | 3];

const GRID: { dots: Dot[] }[] = [
  { dots: [[-1.5, 0], [-0.5, 0], [0.5, 0], [1.5, 0]] },
  { dots: [[-2, 0], [-1, 0], [0, 0], [1, 1], [2, 0]] },
  { dots: [[-2.5, 0], [-1.5, 0], [-0.5, 1], [0.5, 2], [1.5, 1], [2.5, 0]] },
  { dots: [[-3, 0], [-2, 0], [-1, 1], [0, 2], [1, 3], [2, 2], [3, 0]] },
  { dots: [[-3, 0], [-2, 1], [-1, 2], [0, 3], [1, 3], [2, 3], [3, 1]] },
  { dots: [[-3.5, 0], [-2.5, 2], [-1.5, 3], [-0.5, 3], [0.5, 3], [1.5, 3], [2.5, 3], [3.5, 0]] },
  { dots: [[-3, 0], [-2, 2], [-1, 3], [0, 3], [1, 3], [2, 2], [3, 0]] },
  { dots: [[-3, 0], [-2, 2], [-1, 2], [0, 3], [1, 2], [2, 1], [3, 0]] },
  { dots: [[-2.5, 0], [-1.5, 1], [-0.5, 2], [0.5, 2], [1.5, 1], [2.5, 0]] },
  { dots: [[-2, 0], [-1, 1], [0, 1], [1, 1], [2, 0]] },
  { dots: [[-1.5, 0], [-0.5, 0], [0.5, 0], [1.5, 0]] },
];

const RADII = [1.3, 2.2, 3.3, 4.5] as const;
const OPACITIES = [0.3, 0.5, 0.75, 1.0] as const;
const COL_SPACING = 10;
const ROW_HEIGHT = COL_SPACING * 0.866;

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
      <defs>
        {/* Radial glow for large dots (tier 2+) */}
        <radialGradient id="holo-glow-3" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(45, 80%, 70%)" stopOpacity="1" />
          <stop offset="50%" stopColor="hsl(38, 60%, 55%)" stopOpacity="0.8" />
          <stop offset="100%" stopColor="hsl(30, 50%, 40%)" stopOpacity="0.3" />
        </radialGradient>
        <radialGradient id="holo-glow-2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(42, 70%, 65%)" stopOpacity="0.9" />
          <stop offset="60%" stopColor="hsl(36, 55%, 50%)" stopOpacity="0.6" />
          <stop offset="100%" stopColor="hsl(30, 45%, 38%)" stopOpacity="0.2" />
        </radialGradient>

        {/* Outer halo blur for depth */}
        <filter id="holo-halo" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        {/* Shimmer sweep — a bright highlight that rotates */}
        {animate && (
          <linearGradient id="holo-shimmer" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(50, 100%, 90%)" stopOpacity="0">
              <animate attributeName="stopOpacity" values="0;0;0.6;0;0" dur="3.6s" repeatCount="indefinite" />
            </stop>
            <stop offset="40%" stopColor="hsl(48, 90%, 85%)" stopOpacity="0">
              <animate attributeName="stopOpacity" values="0;0.4;0.8;0.4;0" dur="3.6s" repeatCount="indefinite" />
            </stop>
            <stop offset="60%" stopColor="hsl(45, 80%, 80%)" stopOpacity="0">
              <animate attributeName="stopOpacity" values="0;0.4;0.8;0.4;0" dur="3.6s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor="hsl(40, 100%, 90%)" stopOpacity="0">
              <animate attributeName="stopOpacity" values="0;0;0.6;0;0" dur="3.6s" repeatCount="indefinite" />
            </stop>
            {/* Sweep the gradient angle */}
            <animateTransform
              attributeName="gradientTransform"
              type="rotate"
              from="0 0.5 0.5"
              to="360 0.5 0.5"
              dur="4.8s"
              repeatCount="indefinite"
            />
          </linearGradient>
        )}
      </defs>

      {animate && (
        <style>{`
          @keyframes holo-breathe {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.72; }
          }
          @keyframes holo-halo-pulse {
            0%, 100% { opacity: 0.35; }
            50% { opacity: 0.6; }
          }
        `}</style>
      )}

      {GRID.map((row, ri) =>
        row.dots.map(([col, sz], di) => {
          const cx = col * COL_SPACING;
          const cy = ri * ROW_HEIGHT;
          const r = RADII[sz];
          const isLarge = sz >= 2;
          const isMassive = sz === 3;
          const delay = (ri * 0.1 + di * 0.08) % 3.6;

          return (
            <g key={`${ri}-${di}`}>
              {/* Outer halo glow — only for tier 2+ dots */}
              {animate && isLarge && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={r * 2.2}
                  fill={isMassive ? "hsl(45, 70%, 55%)" : "hsl(38, 55%, 48%)"}
                  opacity={0.12}
                  style={{
                    animation: `holo-halo-pulse ${3.2 + ri * 0.15}s ease-in-out infinite`,
                    animationDelay: `${delay}s`,
                  }}
                />
              )}

              {/* Base dot with gradient fill for large, flat fill for small */}
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill={isLarge ? `url(#holo-glow-${sz})` : color}
                opacity={isLarge ? 1 : OPACITIES[sz]}
                filter={animate && isMassive ? "url(#holo-halo)" : undefined}
                style={
                  animate && isLarge
                    ? {
                        animation: `holo-breathe ${2.4 + ri * 0.18}s ease-in-out infinite`,
                        animationDelay: `${delay}s`,
                      }
                    : undefined
                }
              />

              {/* Shimmer overlay — additive highlight sweep on large dots */}
              {animate && isLarge && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={r * 0.85}
                  fill="url(#holo-shimmer)"
                  style={{
                    mixBlendMode: "screen",
                    animationDelay: `${delay}s`,
                  }}
                />
              )}
            </g>
          );
        })
      )}
    </svg>
  );
}
