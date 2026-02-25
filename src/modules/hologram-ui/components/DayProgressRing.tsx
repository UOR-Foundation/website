/**
 * DayProgressRing — Unified Triadic Day-Progress Indicator
 * ═════════════════════════════════════════════════════════
 *
 * A single ring composed of three colored segments (Learn, Work, Play)
 * showing how much of the day has passed. Hover reveals a phase legend.
 */

import { useState, useEffect, useMemo } from "react";
import {
  PHASES,
  PHASE_ORDER,
  computeBalance,
  type TriadicBalance,
} from "@/modules/hologram-ui/sovereign-creator";

// ── Day progress ───────────────────────────────────────────────────────────

function getDayProgress(): number {
  const now = new Date();
  return (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400;
}

// ── Ring geometry ──────────────────────────────────────────────────────────

const SIZE = 96;
const STROKE = 2.5;
const RADIUS = (SIZE - STROKE * 2) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// ── Component ──────────────────────────────────────────────────────────────

interface DayProgressRingProps {
  balance?: TriadicBalance;
}

export default function DayProgressRing({ balance: externalBalance }: DayProgressRingProps) {
  const [progress, setProgress] = useState(getDayProgress);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setProgress(getDayProgress()), 10_000);
    return () => clearInterval(id);
  }, []);

  const pct = Math.round(progress * 100);

  const balance = useMemo<TriadicBalance>(() => {
    if (externalBalance) return externalBalance;
    const hour = new Date().getHours();
    if (hour < 12) return { learn: 0.45, work: 0.30, play: 0.25 };
    if (hour < 18) return { learn: 0.25, work: 0.50, play: 0.25 };
    return { learn: 0.20, work: 0.30, play: 0.50 };
  }, [externalBalance]);

  const report = useMemo(() => computeBalance(balance), [balance]);

  // Build segment data: each phase occupies a proportional arc of the filled portion
  const totalFilled = CIRCUMFERENCE * progress;
  const segments = useMemo(() => {
    let offset = 0;
    return PHASE_ORDER.map((phase) => {
      const segLen = totalFilled * balance[phase];
      const seg = { phase, length: segLen, offset };
      offset += segLen;
      return seg;
    });
  }, [progress, balance, totalFilled]);

  // Leading dot position (end of the filled arc)
  const leadingAngle = 2 * Math.PI * progress;
  const dotCx = SIZE / 2 + RADIUS * Math.cos(leadingAngle);
  const dotCy = SIZE / 2 + RADIUS * Math.sin(leadingAngle);

  return (
    <div
      className="group relative flex flex-col items-center gap-2 cursor-default select-none"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="block"
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Track */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="hsla(38, 12%, 60%, 0.08)"
            strokeWidth={STROKE}
          />

          {/* Colored segments — layered with dash offsets */}
          {segments.map(({ phase, length, offset }) => {
            if (length <= 0) return null;
            const phaseDef = PHASES[phase];
            return (
              <circle
                key={phase}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={`hsla(${phaseDef.hue}, 40%, 60%, 0.8)`}
                strokeWidth={STROKE}
                strokeLinecap="butt"
                strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
                strokeDashoffset={-offset}
                style={{ transition: "stroke-dasharray 1.2s ease-out, stroke-dashoffset 1.2s ease-out" }}
              />
            );
          })}

          {/* Leading glow dot */}
          <circle
            cx={dotCx}
            cy={dotCy}
            r={3.5}
            fill="hsla(38, 40%, 65%, 0.5)"
            style={{
              transition: "cx 1.2s ease-out, cy 1.2s ease-out",
              filter: "blur(2px)",
              animation: "dot-heartbeat 1.6s ease-in-out infinite",
            }}
          />
        </svg>

        {/* Breathing glow */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, hsla(38, 35%, 55%, 0.06) 0%, transparent 70%)",
            animation: "ring-breathe 6s ease-in-out infinite",
          }}
        />

        {/* Center — percentage only */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-[22px] font-light leading-none"
            style={{
              fontFamily: "'Playfair Display', serif",
              color: "hsla(38, 15%, 94%, 0.95)",
              fontWeight: 300,
              letterSpacing: "0.02em",
            }}
          >
            {pct}%
          </span>
        </div>
      </div>

      {/* Label */}
      <span
        className="text-[9px] tracking-[0.4em] uppercase transition-colors duration-500"
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

      {/* Phase legend — appears on hover */}
      <div
        className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-3 transition-opacity duration-700 pointer-events-none"
        style={{ opacity: hovered ? 1 : 0 }}
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
