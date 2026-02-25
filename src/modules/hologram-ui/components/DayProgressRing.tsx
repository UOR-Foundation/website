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
  type TriadicPhase,
} from "@/modules/hologram-ui/sovereign-creator";
import { useAttentionMode } from "@/modules/hologram-ui/hooks/useAttentionMode";

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
  activePhase?: TriadicPhase | null;
}

export default function DayProgressRing({ balance: externalBalance, activePhase }: DayProgressRingProps) {
  const [progress, setProgress] = useState(getDayProgress);
  const [hovered, setHovered] = useState(false);
  const attention = useAttentionMode();

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

        {/* Center — percentage + OF DAY */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-[6px]">
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
          {attention.showExpanded && (
            <span
              className="text-[6.5px] tracking-[0.2em] uppercase leading-none transition-opacity duration-700"
              style={{
                fontFamily: "'DM Sans', system-ui, sans-serif",
                color: "hsla(38, 15%, 80%, 0.4)",
                fontWeight: 400,
              }}
            >
              of day
            </span>
          )}
        </div>
      </div>

      {/* Dynamic label */}
      {(() => {
        const phaseLabels: Record<TriadicPhase, string> = {
          learn: "Learning",
          work: "Working",
          play: "Playing",
        };
        const label = activePhase ? phaseLabels[activePhase] : (report.coherent ? "Today" : "Rebalance");
        const labelColor = activePhase
          ? `hsla(${PHASES[activePhase].hue}, 30%, 72%, 0.7)`
          : report.coherent
            ? "hsla(38, 15%, 80%, 0.6)"
            : "hsla(25, 25%, 70%, 0.6)";
        return (
          <span
            className="text-[9px] tracking-[0.4em] uppercase transition-all duration-700"
            style={{
              fontFamily: "'DM Sans', system-ui, sans-serif",
              color: labelColor,
              fontWeight: 400,
            }}
          >
            {label}
          </span>
        );
      })()}

      {/* Phase legend — appears on hover, above the ring */}
      <div
        className="absolute -top-16 left-1/2 -translate-x-1/2 flex gap-5 transition-all duration-700 pointer-events-none"
        style={{
          opacity: hovered && attention.showExpanded ? 1 : 0,
          transform: `translateX(-50%) translateY(${hovered && attention.showExpanded ? "0" : "6px"})`,
        }}
      >
        {PHASE_ORDER.map((phase) => {
          const phasePct = Math.round(balance[phase] * 100);
          return (
            <div key={phase} className="flex flex-col items-center gap-1">
              <span
                className="text-[13px] font-light leading-none"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: `hsla(${PHASES[phase].hue}, 35%, 72%, 0.9)`,
                  letterSpacing: "0.02em",
                }}
              >
                {phasePct}%
              </span>
              <span
                className="text-[9px] tracking-[0.25em] uppercase leading-none"
                style={{
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  color: `hsla(${PHASES[phase].hue}, 25%, 68%, 0.55)`,
                  fontWeight: 400,
                }}
              >
                {phase}
              </span>
            </div>
          );
        })}
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
