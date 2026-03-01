/**
 * BreathingWidget — Ring-based guided breathing exercise
 * ══════════════════════════════════════════════════════
 * Visually harmonized with DayProgressRing (SIZE=77, STROKE=2).
 * Phase-segmented ring with ridge tick marks at boundaries,
 * pulsing center orb, and intuitive countdown.
 *
 * Three protocols:
 *   • Calm  → 4-7-8 breathing (Dr. Andrew Weil)
 *   • Focus → Box breathing (4-4-4-4, Navy SEALs)
 *   • Energy → Triangle breathing (4-4-2, energizing)
 */

import { useState, useEffect, useRef, useCallback } from "react";

/* ── Protocols ──────────────────────────────────────── */
interface Phase {
  label: string;
  duration: number;
  color: string;
}

interface Protocol {
  name: string;
  intent: string;
  phases: Phase[];
  cycles: number;
}

const INHALE_COLOR = "hsla(255, 55%, 58%, 0.85)";
const HOLD_COLOR   = "hsla(38, 45%, 58%, 0.85)";
const EXHALE_COLOR = "hsla(175, 40%, 50%, 0.85)";

const PROTOCOLS: Protocol[] = [
  {
    name: "4-7-8",
    intent: "Calm",
    phases: [
      { label: "Inhale",  duration: 4, color: INHALE_COLOR },
      { label: "Hold",    duration: 7, color: HOLD_COLOR },
      { label: "Exhale",  duration: 8, color: EXHALE_COLOR },
    ],
    cycles: 4,
  },
  {
    name: "Box",
    intent: "Focus",
    phases: [
      { label: "Inhale",  duration: 4, color: INHALE_COLOR },
      { label: "Hold",    duration: 4, color: HOLD_COLOR },
      { label: "Exhale",  duration: 4, color: EXHALE_COLOR },
      { label: "Hold",    duration: 4, color: HOLD_COLOR },
    ],
    cycles: 4,
  },
  {
    name: "Triangle",
    intent: "Energy",
    phases: [
      { label: "Inhale",  duration: 4, color: INHALE_COLOR },
      { label: "Hold",    duration: 4, color: HOLD_COLOR },
      { label: "Exhale",  duration: 2, color: EXHALE_COLOR },
    ],
    cycles: 6,
  },
];

/* ── Ring geometry — matches DayProgressRing exactly ── */
const SIZE = 77;
const STROKE = 2;
const R = (SIZE - STROKE * 2) / 2;
const C = 2 * Math.PI * R;
const RIDGE_LEN = 5;

function arcDash(startFrac: number, sweepFrac: number) {
  const len = sweepFrac * C;
  return {
    strokeDasharray: `${len} ${C - len}`,
    strokeDashoffset: -startFrac * C,
  };
}

/* ── Component ──────────────────────────────────────── */
export default function BreathingWidget() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [running, setRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [hovered, setHovered] = useState(false);
  const rafRef = useRef(0);
  const lastRef = useRef(0);

  const protocol = PROTOCOLS[selectedIdx];
  const phase = protocol.phases[phaseIdx];
  const phaseDur = phase.duration * 1000;
  const progress = Math.min(elapsed / phaseDur, 1);
  const cycleDur = protocol.phases.reduce((s, p) => s + p.duration, 0);

  useEffect(() => {
    setRunning(false);
    setPhaseIdx(0);
    setCycle(0);
    setElapsed(0);
  }, [selectedIdx]);

  const tick = useCallback((now: number) => {
    if (!lastRef.current) lastRef.current = now;
    const dt = now - lastRef.current;
    lastRef.current = now;

    setElapsed(prev => {
      const next = prev + dt;
      if (next >= phaseDur) {
        setPhaseIdx(pi => {
          const nextPi = pi + 1;
          if (nextPi >= protocol.phases.length) {
            setCycle(c => {
              if (c + 1 >= protocol.cycles) {
                setRunning(false);
                return 0;
              }
              return c + 1;
            });
            return 0;
          }
          return nextPi;
        });
        return 0;
      }
      return next;
    });

    rafRef.current = requestAnimationFrame(tick);
  }, [phaseDur, protocol.phases.length, protocol.cycles]);

  useEffect(() => {
    if (running) {
      lastRef.current = 0;
      rafRef.current = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(rafRef.current);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, tick]);

  const toggle = () => {
    if (!running) {
      setPhaseIdx(0);
      setCycle(0);
      setElapsed(0);
    }
    setRunning(r => !r);
  };

  const secondsLeft = Math.max(1, Math.ceil(phase.duration - elapsed / 1000));

  // Compute arc segments
  const arcs: { startFrac: number; sweepFrac: number; color: string }[] = [];
  let cursor = 0;
  for (const p of protocol.phases) {
    const sweep = p.duration / cycleDur;
    arcs.push({ startFrac: cursor, sweepFrac: sweep, color: p.color });
    cursor += sweep;
  }

  // Ridge tick positions
  const ridgeAngles: number[] = [];
  let ridgeCursor = 0;
  for (let i = 0; i < protocol.phases.length; i++) {
    ridgeAngles.push(ridgeCursor);
    ridgeCursor += protocol.phases[i].duration / cycleDur;
  }

  // Active arc progress
  let activeStart = 0;
  for (let i = 0; i < phaseIdx; i++) activeStart += protocol.phases[i].duration / cycleDur;
  const activeSweep = (phase.duration / cycleDur) * progress;

  // Leading dot position
  const dotAngle = (activeStart + activeSweep) * 2 * Math.PI;
  const dotCx = SIZE / 2 + R * Math.cos(dotAngle);
  const dotCy = SIZE / 2 + R * Math.sin(dotAngle);

  // Center orb scale
  const orbScale = phase.label === "Inhale"
    ? 0.7 + 0.3 * progress
    : phase.label === "Exhale"
      ? 1.0 - 0.3 * progress
      : 1.0;

  const cycleNext = () => {
    setSelectedIdx(i => (i + 1) % PROTOCOLS.length);
  };

  return (
    <div
      className="group relative flex flex-col items-center gap-4 cursor-default select-none px-6 py-5"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Ring */}
      <div
        className="relative cursor-pointer"
        style={{ width: SIZE, height: SIZE }}
        onClick={toggle}
        role="button"
        aria-label={running ? "Pause" : "Start"}
      >
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="block"
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Background track */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="hsla(38, 12%, 60%, 0.08)"
            strokeWidth={STROKE}
          />

          {/* Phase arcs */}
          {arcs.map((seg, i) => {
            const gap = 0.008;
            const dash = arcDash(seg.startFrac + gap / 2, seg.sweepFrac - gap);
            return (
              <circle
                key={i}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke={seg.color}
                strokeWidth={STROKE}
                strokeLinecap="butt"
                style={{
                  ...dash,
                  opacity: running ? 0.18 : 0.35,
                  transition: "opacity 500ms ease",
                }}
              />
            );
          })}

          {/* Active progress arc */}
          {running && activeSweep > 0.001 && (
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke={phase.color.replace("0.85)", "1)")}
              strokeWidth={STROKE + 0.5}
              strokeLinecap="round"
              style={arcDash(activeStart, activeSweep)}
            />
          )}

          {/* Ridge tick marks at phase boundaries */}
          {ridgeAngles.map((frac, i) => {
            const angle = frac * 2 * Math.PI;
            const innerR = R - RIDGE_LEN / 2;
            const outerR = R + RIDGE_LEN / 2;
            const x1 = SIZE / 2 + innerR * Math.cos(angle);
            const y1 = SIZE / 2 + innerR * Math.sin(angle);
            const x2 = SIZE / 2 + outerR * Math.cos(angle);
            const y2 = SIZE / 2 + outerR * Math.sin(angle);
            return (
              <line
                key={`ridge-${i}`}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="hsla(38, 15%, 90%, 0.45)"
                strokeWidth={1.2}
                strokeLinecap="round"
              />
            );
          })}

          {/* Leading dot */}
          {running && (
            <circle
              cx={dotCx}
              cy={dotCy}
              r={2.5}
              fill={phase.color.replace("0.85)", "1)")}
              style={{
                filter: `drop-shadow(0 0 3px ${phase.color})`,
                animation: "dot-heartbeat 1.94s ease-in-out infinite",
              }}
            />
          )}
        </svg>

        {/* Breathing glow */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: running
              ? `radial-gradient(circle, ${phase.color.replace("0.85)", "0.1)")} 0%, transparent 70%)`
              : "radial-gradient(circle, hsla(255, 35%, 55%, 0.04) 0%, transparent 70%)",
            animation: "ring-breathe 5.82s ease-in-out infinite",
            transition: "background 600ms ease",
          }}
        />

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ textRendering: "geometricPrecision", WebkitFontSmoothing: "antialiased" as any }}>
          {running ? (
            <span
              className="leading-none"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "18px",
                color: "hsla(38, 15%, 96%, 1)",
                fontWeight: 300,
                letterSpacing: "0.02em",
              }}
            >
              {secondsLeft}
            </span>
          ) : (
            <span
              className="tracking-[0.2em] uppercase leading-none"
              style={{
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontSize: "8px",
                fontWeight: 500,
                color: "hsla(38, 15%, 85%, 0.65)",
              }}
            >
              Breathe
            </span>
          )}
        </div>
      </div>

      {/* Label area — single row, matches DayProgressRing "Your day" spacing */}
      {running ? (
        <div className="flex flex-col items-center gap-1">
          <span
            className="tracking-[0.35em] uppercase text-center transition-all duration-300"
            style={{
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: "10px",
              fontWeight: 500,
              color: phase.color.replace("0.85)", "0.9)"),
            }}
          >
            {phase.label}
          </span>
          <span
            className="tracking-[0.15em] text-center"
            style={{
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: "9px",
              color: "hsla(0, 0%, 80%, 0.35)",
            }}
          >
            {cycle + 1} of {protocol.cycles}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          {PROTOCOLS.map((p, i) => {
            const active = i === selectedIdx;
            return (
              <button
                key={p.intent}
                onClick={(e) => { e.stopPropagation(); setSelectedIdx(i); }}
                className="transition-all duration-300"
                style={{
                  fontSize: "10px",
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  fontWeight: 500,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase" as const,
                  color: active ? "hsla(38, 30%, 85%, 0.9)" : "hsla(38, 15%, 75%, 0.35)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {p.intent}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
