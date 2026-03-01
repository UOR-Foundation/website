/**
 * BreathingWidget — Ring-based guided breathing exercise
 * ══════════════════════════════════════════════════════
 * Visually harmonized with DayProgressRing (SIZE=77, STROKE=2).
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

const INHALE_COLOR = "hsla(255, 45%, 58%, 0.8)";
const HOLD_COLOR   = "hsla(38, 40%, 55%, 0.8)";
const EXHALE_COLOR = "hsla(175, 35%, 50%, 0.8)";

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

/* ── Ring geometry — matches DayProgressRing ─────────── */
const SIZE = 77;
const STROKE = 2;
const R = (SIZE - STROKE * 2) / 2;
const C = 2 * Math.PI * R;

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

  // Arc segments
  const arcs: { startFrac: number; sweepFrac: number; color: string }[] = [];
  let cursor = 0;
  for (const p of protocol.phases) {
    const sweep = p.duration / cycleDur;
    arcs.push({ startFrac: cursor, sweepFrac: sweep, color: p.color });
    cursor += sweep;
  }

  // Active arc progress
  let activeStart = 0;
  for (let i = 0; i < phaseIdx; i++) activeStart += protocol.phases[i].duration / cycleDur;
  const activeSweep = (phase.duration / cycleDur) * progress;

  // Leading dot position (matches DayProgressRing style)
  const dotAngle = (activeStart + activeSweep) * 2 * Math.PI;
  const dotCx = SIZE / 2 + R * Math.cos(dotAngle);
  const dotCy = SIZE / 2 + R * Math.sin(dotAngle);

  return (
    <div
      className="flex flex-col items-center gap-1 select-none"
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

          {/* Phase arcs — dim background */}
          {arcs.map((seg, i) => {
            const gap = 0.006;
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
                  transition: "opacity 500ms ease, stroke-dasharray 0.6s ease-out",
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
              stroke={phase.color.replace("0.8)", "1)")}
              strokeWidth={STROKE}
              strokeLinecap="butt"
              style={arcDash(activeStart, activeSweep)}
            />
          )}

          {/* Leading dot */}
          {running && (
            <circle
              cx={dotCx}
              cy={dotCy}
              r={2.5}
              fill={phase.color.replace("0.8)", "0.9)")}
              style={{
                transition: "cx 0.3s ease-out, cy 0.3s ease-out",
                animation: "dot-heartbeat 1.94s ease-in-out infinite",
              }}
            />
          )}
        </svg>

        {/* Breathing glow — matches DayProgressRing */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: running
              ? `radial-gradient(circle, ${phase.color.replace("0.8)", "0.08)")} 0%, transparent 70%)`
              : "radial-gradient(circle, hsla(255, 35%, 55%, 0.04) 0%, transparent 70%)",
            animation: "ring-breathe 5.82s ease-in-out infinite",
            transition: "background 600ms ease",
          }}
        />

        {/* Center content */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ textRendering: "geometricPrecision" }}
        >
          {running ? (
            <span
              className="leading-none font-light"
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
            <svg width="10" height="12" viewBox="0 0 10 12" fill="none" style={{ opacity: 0.5 }}>
              <path d="M1 1L9 6L1 11V1Z" fill="hsla(38, 15%, 85%, 0.8)" />
            </svg>
          )}
        </div>
      </div>

      {/* Label — matches DayProgressRing "Your day" style */}
      <span
        className="tracking-[0.35em] uppercase text-center transition-all duration-300"
        style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontSize: "10px",
          color: running
            ? phase.color.replace("0.8)", "0.85)")
            : "hsla(38, 15%, 85%, 0.75)",
          fontWeight: 500,
        }}
      >
        {running ? phase.label : "Breathe"}
      </span>

      {/* Cycle counter — appears on hover or when running */}
      <span
        className="tracking-[0.15em] text-center transition-all duration-300"
        style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontSize: "9px",
          color: "hsla(0, 0%, 80%, 0.35)",
          opacity: running || hovered ? 1 : 0,
          height: running || hovered ? 12 : 0,
          overflow: "hidden",
          transition: "opacity 300ms ease, height 300ms ease",
        }}
      >
        {running
          ? `${cycle + 1} of ${protocol.cycles}`
          : `${protocol.name} · ${protocol.cycles} cycles`}
      </span>

      {/* Protocol pills — hover reveal, matches DayProgressRing phase legend style */}
      <div
        className="absolute -top-5 left-1/2 -translate-x-1/2 flex gap-3 transition-all duration-300 pointer-events-auto"
        style={{
          opacity: hovered && !running ? 1 : 0,
          transform: `translateX(-50%) translateY(${hovered && !running ? "2px" : "4px"})`,
          pointerEvents: hovered && !running ? "auto" : "none",
        }}
      >
        {PROTOCOLS.map((p, i) => {
          const active = i === selectedIdx;
          return (
            <button
              key={p.intent}
              onClick={(e) => { e.stopPropagation(); setSelectedIdx(i); }}
              className="transition-all duration-300"
              style={{
                fontSize: "9px",
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontWeight: 500,
                letterSpacing: "0.15em",
                textTransform: "uppercase" as const,
                color: active ? "hsla(38, 30%, 85%, 0.9)" : "hsla(38, 15%, 75%, 0.45)",
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
    </div>
  );
}
