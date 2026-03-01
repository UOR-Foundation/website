/**
 * HolonomyVisualizer — Tonal Drift Ring & Loop Detection
 * ═══════════════════════════════════════════════════════
 *
 * Visualizes the holonomy path as a trail on a ring (Z/256Z).
 * The origin is marked at 12-o'clock; the current tonal center
 * traces a path around the ring. When a closed loop is detected
 * (path returns near origin), a pulse animation fires.
 *
 * Inner display: convergence indicator + loop count.
 */

import { useRef, useEffect, useMemo } from "react";
import { HolonomyLens } from "@/modules/audio/lenses/holonomy-lens";
import type { HarmonicLensFrame } from "@/modules/audio";

interface HolonomyVisualizerProps {
  visible: boolean;
  stationHue: string;
  frame: HarmonicLensFrame | null;
}

const SIZE = 248;
const CX = SIZE / 2;
const CY = SIZE / 2;
const RING_R = 90;
const TRAIL_POINTS = 120;

export default function HolonomyVisualizer({ visible, stationHue, frame }: HolonomyVisualizerProps) {
  const lensRef = useRef(new HolonomyLens());
  const prevStationHue = useRef(stationHue);

  // Reset lens on station change
  useEffect(() => {
    if (stationHue !== prevStationHue.current) {
      lensRef.current.reset();
      prevStationHue.current = stationHue;
    }
  }, [stationHue]);

  // Push frame
  if (frame && visible) {
    lensRef.current.push(frame);
  }

  const state = lensRef.current.getState();
  const recentPath = lensRef.current.getRecentPath(TRAIL_POINTS);

  // Map tonal center [0,255] → angle on the ring (0 = top)
  const centerToAngle = (center: number) => ((center / 256) * 2 * Math.PI) - Math.PI / 2;

  // Build trail polyline
  const trailPoints = useMemo(() => {
    if (recentPath.length < 2) return "";
    return recentPath.map((p, i) => {
      const angle = centerToAngle(p.tonalCenter);
      // Slightly vary radius for visual depth
      const r = RING_R + Math.sin(i * 0.3) * 3;
      const x = CX + Math.cos(angle) * r;
      const y = CY + Math.sin(angle) * r;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
  }, [recentPath]);

  // Current position
  const currentAngle = centerToAngle(state.currentCenter);
  const curX = CX + Math.cos(currentAngle) * RING_R;
  const curY = CY + Math.sin(currentAngle) * RING_R;

  // Origin position
  const originAngle = centerToAngle(state.originCenter);
  const origX = CX + Math.cos(originAngle) * RING_R;
  const origY = CY + Math.sin(originAngle) * RING_R;

  // Distance normalized [0, 1] (128 = max on Z/256Z)
  const distNorm = Math.min(state.distanceFromOrigin / 128, 1);

  // Color based on distance from origin
  const trailColor = distNorm > 0.5
    ? `hsl(0, 60%, 55%)`  // far = reddish
    : state.isConverging
      ? `hsl(120, 50%, 50%)` // converging = green
      : `hsl(${stationHue}, 50%, 60%)`;

  const hue = parseInt(stationHue) || 38;

  if (!visible) return null;

  return (
    <div
      className="mx-3 mb-2 rounded-xl overflow-hidden"
      style={{ background: "hsla(0, 0%, 0%, 0.2)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5">
        <span
          className="text-[10px] tracking-[0.12em] uppercase"
          style={{ color: `hsl(${hue}, 25%, 55%)` }}
        >
          Holonomy · Tonal Drift
        </span>
        <span
          className="text-[10px] tabular-nums"
          style={{ color: `hsl(${hue}, 20%, 50%)` }}
        >
          {state.loops.length} loop{state.loops.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Ring SVG */}
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width={SIZE}
        height={SIZE}
        className="block mx-auto"
        style={{ maxWidth: "100%" }}
      >
        <defs>
          <radialGradient id="holo-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={`hsla(${hue}, 20%, 15%, 0.3)`} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id="holo-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Background */}
        <circle cx={CX} cy={CY} r={RING_R + 20} fill="url(#holo-bg)" />

        {/* Ring track */}
        <circle
          cx={CX} cy={CY} r={RING_R}
          fill="none"
          stroke={`hsla(${hue}, 15%, 30%, 0.3)`}
          strokeWidth="1"
        />

        {/* Tick marks every 32 (8 divisions of 256) */}
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * 2 * Math.PI - Math.PI / 2;
          const x1 = CX + Math.cos(a) * (RING_R - 5);
          const y1 = CY + Math.sin(a) * (RING_R - 5);
          const x2 = CX + Math.cos(a) * (RING_R + 5);
          const y2 = CY + Math.sin(a) * (RING_R + 5);
          return (
            <line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={`hsla(${hue}, 15%, 40%, 0.25)`}
              strokeWidth="0.5"
            />
          );
        })}

        {/* Trail path */}
        {trailPoints && (
          <path
            d={trailPoints}
            fill="none"
            stroke={trailColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.7"
            filter="url(#holo-glow)"
          />
        )}

        {/* Origin marker (diamond) */}
        <g transform={`translate(${origX}, ${origY})`}>
          <polygon
            points="0,-5 4,0 0,5 -4,0"
            fill={`hsla(${hue}, 50%, 60%, 0.8)`}
            stroke={`hsla(${hue}, 50%, 70%, 0.5)`}
            strokeWidth="0.5"
          />
          <text
            x="0" y="-9"
            textAnchor="middle"
            fill={`hsl(${hue}, 30%, 55%)`}
            fontSize="7"
            fontFamily="'DM Sans', sans-serif"
          >
            origin
          </text>
        </g>

        {/* Current position (pulsing dot) */}
        <circle
          cx={curX} cy={curY} r="4"
          fill={trailColor}
          opacity="0.9"
        >
          <animate
            attributeName="r"
            values="3;5;3"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </circle>

        {/* Connection line origin → current */}
        <line
          x1={origX} y1={origY}
          x2={curX} y2={curY}
          stroke={`hsla(${hue}, 30%, 50%, 0.15)`}
          strokeWidth="0.5"
          strokeDasharray="3,3"
        />

        {/* Loop closure pulses */}
        {recentPath
          .filter((p) => p.isLoopClosure)
          .slice(-3)
          .map((p, i) => {
            const a = centerToAngle(p.tonalCenter);
            const x = CX + Math.cos(a) * RING_R;
            const y = CY + Math.sin(a) * RING_R;
            return (
              <circle
                key={`loop-${i}`}
                cx={x} cy={y} r="3"
                fill="none"
                stroke="hsl(120, 60%, 55%)"
                strokeWidth="1.5"
                opacity="0.8"
              >
                <animate
                  attributeName="r"
                  values="3;12;3"
                  dur="2s"
                  repeatCount="3"
                />
                <animate
                  attributeName="opacity"
                  values="0.8;0;0.8"
                  dur="2s"
                  repeatCount="3"
                />
              </circle>
            );
          })}

        {/* Center stats */}
        <text
          x={CX} y={CY - 14}
          textAnchor="middle"
          fill={state.isConverging ? "hsl(120, 45%, 55%)" : `hsl(${hue}, 25%, 60%)`}
          fontSize="10"
          fontFamily="'DM Sans', sans-serif"
        >
          {state.isConverging ? "↻ converging" : "→ drifting"}
        </text>
        <text
          x={CX} y={CY + 2}
          textAnchor="middle"
          fill={`hsl(${hue}, 20%, 50%)`}
          fontSize="9"
          fontFamily="'DM Sans', sans-serif"
        >
          Δ = {state.distanceFromOrigin} / 128
        </text>
        <text
          x={CX} y={CY + 16}
          textAnchor="middle"
          fill={`hsl(${hue}, 15%, 45%)`}
          fontSize="8"
          fontFamily="'DM Sans', sans-serif"
        >
          θ = {state.currentAngle.toFixed(2)} rad
        </text>
      </svg>
    </div>
  );
}
