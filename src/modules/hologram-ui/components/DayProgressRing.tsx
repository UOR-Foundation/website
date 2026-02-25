/**
 * DayProgressRing — Triadic Day-Progress Indicator
 * ═════════════════════════════════════════════════
 *
 * Three concentric arcs — Learn (outer), Work (middle), Play (inner) —
 * reflecting the Sovereign Creator's triadic time allocation.
 * The overall day progress is shown as a unified percentage.
 *
 * When no activity data is available, the ring displays a single
 * unified arc (graceful degradation for Stage 1 users).
 *
 * Balance guidance appears on hover — never preachy, always gentle.
 */

import { useState, useEffect, useMemo } from "react";
import {
  PHASES,
  PHASE_ORDER,
  computeBalance,
  type TriadicBalance,
  type TriadicPhase,
} from "@/modules/hologram-ui/sovereign-creator";

// ── Day progress ───────────────────────────────────────────────────────────

function getDayProgress(): number {
  const now = new Date();
  return (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400;
}

// ── Ring geometry ──────────────────────────────────────────────────────────

const SIZE = 96;
const STROKE = 2.5;
const GAP = 5; // Spacing between concentric rings
const RINGS: { phase: TriadicPhase; radius: number }[] = [
  { phase: "learn", radius: (SIZE - STROKE * 2) / 2 },              // Outer
  { phase: "work",  radius: (SIZE - STROKE * 2) / 2 - GAP },        // Middle
  { phase: "play",  radius: (SIZE - STROKE * 2) / 2 - GAP * 2 },    // Inner
];

// ── Component ──────────────────────────────────────────────────────────────

interface DayProgressRingProps {
  /** Optional triadic balance override. If omitted, uses simulated data. */
  balance?: TriadicBalance;
}

export default function DayProgressRing({ balance: externalBalance }: DayProgressRingProps) {
  const [progress, setProgress] = useState(getDayProgress);

  useEffect(() => {
    const id = setInterval(() => setProgress(getDayProgress()), 10_000);
    return () => clearInterval(id);
  }, []);

  const pct = Math.round(progress * 100);

  // If no external balance data, derive gentle defaults from time of day
  // Morning leans Learn, midday leans Work, evening leans Play
  const balance = useMemo<TriadicBalance>(() => {
    if (externalBalance) return externalBalance;
    const hour = new Date().getHours();
    if (hour < 12) return { learn: 0.45, work: 0.30, play: 0.25 };
    if (hour < 18) return { learn: 0.25, work: 0.50, play: 0.25 };
    return { learn: 0.20, work: 0.30, play: 0.50 };
  }, [externalBalance]);

  const report = useMemo(() => computeBalance(balance), [balance]);

  return (
    <div className="group relative flex flex-col items-center gap-2 cursor-default select-none">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="block"
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Triadic arcs */}
          {RINGS.map(({ phase, radius }) => {
            const circumference = 2 * Math.PI * radius;
            const phaseValue = balance[phase];
            // Each arc fills proportional to its share of elapsed time
            const arcProgress = phaseValue * progress;
            const offset = circumference * (1 - arcProgress);
            const phaseDef = PHASES[phase];

            return (
              <g key={phase}>
                {/* Track */}
                <circle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={radius}
                  fill="none"
                  stroke={`hsla(${phaseDef.hue}, 12%, 60%, 0.08)`}
                  strokeWidth={STROKE}
                />
                {/* Progress arc */}
                <circle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={radius}
                  fill="none"
                  stroke={`hsla(${phaseDef.hue}, 35%, 62%, 0.65)`}
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
                />
              </g>
            );
          })}

          {/* Leading glow dot on outermost ring */}
          {(() => {
            const outerRadius = RINGS[0].radius;
            const outerProgress = balance.learn * progress;
            const angle = 2 * Math.PI * outerProgress;
            return (
              <circle
                cx={SIZE / 2 + outerRadius * Math.cos(angle)}
                cy={SIZE / 2 + outerRadius * Math.sin(angle)}
                r={3.5}
                fill="hsla(38, 40%, 65%, 0.5)"
                style={{
                  transition: "cx 1.2s ease-out, cy 1.2s ease-out",
                  filter: "blur(2px)",
                  animation: "dot-heartbeat 1.6s ease-in-out infinite",
                }}
              />
            );
          })()}
        </svg>

        {/* Breathing glow */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, hsla(38, 35%, 55%, 0.06) 0%, transparent 70%)",
            animation: "ring-breathe 6s ease-in-out infinite",
          }}
        />

        {/* Center — percentage */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-xl font-light leading-none"
            style={{
              fontFamily: "'Playfair Display', serif",
              color: "hsla(38, 15%, 92%, 0.92)",
              fontWeight: 300,
            }}
          >
            {pct}%
          </span>
        </div>
      </div>

      {/* Label — shifts to show balance state */}
      <span
        className="text-[9px] tracking-[0.4em] uppercase"
        style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          color: report.coherent
            ? "hsla(38, 15%, 80%, 0.6)"
            : "hsla(25, 25%, 70%, 0.6)",
          fontWeight: 400,
        }}
      >
        {report.coherent ? "Today" : "Rebalance"}
      </span>

      {/* Hover tooltip — gentle guidance, never judgmental */}
      <div
        className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none whitespace-nowrap"
        style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontSize: "10px",
          letterSpacing: "0.12em",
          color: "hsla(38, 15%, 85%, 0.6)",
          background: "hsla(30, 8%, 10%, 0.7)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          padding: "5px 12px",
          borderRadius: "6px",
          border: "1px solid hsla(38, 15%, 60%, 0.08)",
        }}
      >
        {report.guidance}
      </div>

      {/* Phase legend — appears on hover, fades in gently */}
      <div
        className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
      >
        {PHASE_ORDER.map((phase) => (
          <div key={phase} className="flex items-center gap-1">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: PHASES[phase].color }}
            />
            <span
              className="text-[8px] tracking-[0.2em] uppercase"
              style={{
                fontFamily: "'DM Sans', system-ui, sans-serif",
                color: "hsla(38, 12%, 70%, 0.4)",
              }}
            >
              {phase}
            </span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes ring-breathe {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.06); }
        }
        @keyframes dot-heartbeat {
          0%, 100% { opacity: 0.6; r: 3.5; }
          10% { opacity: 1; r: 5; }
          22% { opacity: 0.6; r: 3.5; }
          32% { opacity: 0.9; r: 4.5; }
          44% { opacity: 0.6; r: 3.5; }
        }
      `}</style>
    </div>
  );
}
