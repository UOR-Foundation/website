/**
 * BreathingWidget — Ring-based guided breathing exercise
 * ══════════════════════════════════════════════════════
 * Three protocols mapped to three intentions:
 *   • Calm  → 4-7-8 breathing (Dr. Andrew Weil)
 *   • Focus → Box breathing (4-4-4-4, Navy SEALs)
 *   • Energy → Triangle breathing (4-4-2, energizing)
 *
 * The ring is divided into colored arcs for each phase:
 *   Inhale (blue-violet), Hold (gold), Exhale (teal)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { sf } from "@/modules/hologram-ui/utils/scaledFontSize";

/* ── Protocols ──────────────────────────────────────── */
interface Phase {
  label: string;
  duration: number; // seconds
  color: string;    // HSL
}

interface Protocol {
  name: string;
  intent: string;
  phases: Phase[];
  cycles: number;
}

const INHALE_COLOR = "hsla(255, 60%, 58%, 1)";
const HOLD_COLOR   = "hsla(38, 55%, 55%, 1)";
const EXHALE_COLOR = "hsla(175, 45%, 48%, 1)";

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

/* ── SVG constants ──────────────────────────────────── */
const SIZE = 110;
const STROKE = 4;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R; // circumference

/* ── Arc helper: startAngle & sweepAngle in [0,1] fraction of circle */
function arcDasharray(startFrac: number, sweepFrac: number): { strokeDasharray: string; strokeDashoffset: number } {
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
  const [elapsed, setElapsed] = useState(0); // ms within current phase
  const rafRef = useRef<number>(0);
  const lastTickRef = useRef(0);

  const protocol = PROTOCOLS[selectedIdx];
  const phase = protocol.phases[phaseIdx];
  const totalPhaseDur = phase.duration * 1000;
  const progress = Math.min(elapsed / totalPhaseDur, 1);

  // Total cycle duration for arc layout
  const cycleDur = protocol.phases.reduce((s, p) => s + p.duration, 0);

  // Reset on protocol change
  useEffect(() => {
    setRunning(false);
    setPhaseIdx(0);
    setCycle(0);
    setElapsed(0);
  }, [selectedIdx]);

  // Animation loop
  const tick = useCallback((now: number) => {
    if (!lastTickRef.current) lastTickRef.current = now;
    const dt = now - lastTickRef.current;
    lastTickRef.current = now;

    setElapsed(prev => {
      const next = prev + dt;
      if (next >= totalPhaseDur) {
        // Advance phase
        setPhaseIdx(pi => {
          const nextPi = pi + 1;
          if (nextPi >= protocol.phases.length) {
            // Advance cycle
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
  }, [totalPhaseDur, protocol.phases.length, protocol.cycles]);

  useEffect(() => {
    if (running) {
      lastTickRef.current = 0;
      rafRef.current = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(rafRef.current);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, tick]);

  const toggleRunning = () => {
    if (!running) {
      setPhaseIdx(0);
      setCycle(0);
      setElapsed(0);
    }
    setRunning(r => !r);
  };

  // Countdown number
  const secondsLeft = Math.max(1, Math.ceil(phase.duration - elapsed / 1000));

  // Build static arc segments (background ring showing protocol structure)
  const arcSegments: { startFrac: number; sweepFrac: number; color: string }[] = [];
  {
    let cursor = 0;
    for (const p of protocol.phases) {
      const sweep = p.duration / cycleDur;
      arcSegments.push({ startFrac: cursor, sweepFrac: sweep, color: p.color });
      cursor += sweep;
    }
  }

  // Active progress arc
  let activeStartFrac = 0;
  for (let i = 0; i < phaseIdx; i++) {
    activeStartFrac += protocol.phases[i].duration / cycleDur;
  }
  const activeSweepFrac = (phase.duration / cycleDur) * progress;

  // Breathing scale for the center orb
  const isInhale = phase.label === "Inhale";
  const isExhale = phase.label === "Exhale";
  const orbScale = isInhale
    ? 0.7 + 0.3 * progress
    : isExhale
      ? 1.0 - 0.3 * progress
      : 0.85 + 0.05 * Math.sin(progress * Math.PI);

  return (
    <div
      className="flex flex-col items-center gap-3 select-none"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      {/* Prompt text */}
      <span
        className="transition-all duration-500"
        style={{
          fontSize: sf(13),
          fontFamily: "'Playfair Display', serif",
          fontWeight: 300,
          color: running ? phase.color : "hsla(0, 0%, 85%, 0.5)",
          letterSpacing: "0.02em",
          minHeight: 20,
          textAlign: "center",
        }}
      >
        {running ? phase.label : protocol.intent}
      </span>

      {/* Ring + center orb */}
      <div
        className="relative cursor-pointer"
        style={{ width: SIZE, height: SIZE }}
        onClick={toggleRunning}
        role="button"
        aria-label={running ? "Pause breathing" : "Start breathing"}
      >
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Background track */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="hsla(0, 0%, 100%, 0.06)"
            strokeWidth={STROKE}
          />

          {/* Phase arc segments (dim when idle, bright when running) */}
          {arcSegments.map((seg, i) => {
            const dash = arcDasharray(seg.startFrac, seg.sweepFrac - 0.008);
            return (
              <circle
                key={i}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke={seg.color}
                strokeWidth={STROKE}
                strokeLinecap="round"
                style={{
                  ...dash,
                  opacity: running ? 0.2 : 0.35,
                  transition: "opacity 500ms ease",
                }}
              />
            );
          })}

          {/* Active progress arc */}
          {running && (
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke={phase.color}
              strokeWidth={STROKE + 1}
              strokeLinecap="round"
              style={{
                ...arcDasharray(activeStartFrac, activeSweepFrac),
                filter: `drop-shadow(0 0 6px ${phase.color})`,
                transition: "stroke 400ms ease",
              }}
            />
          )}
        </svg>

        {/* Center orb */}
        <div
          className="absolute inset-0 flex items-center justify-center"
        >
          <div
            className="rounded-full flex items-center justify-center transition-[background,box-shadow] duration-500"
            style={{
              width: 36,
              height: 36,
              transform: `scale(${orbScale})`,
              transition: "transform 300ms ease, background 500ms ease, box-shadow 500ms ease",
              background: running
                ? `radial-gradient(circle, ${phase.color}, hsla(255, 40%, 30%, 0.6))`
                : "radial-gradient(circle, hsla(255, 50%, 55%, 0.7), hsla(255, 40%, 35%, 0.4))",
              boxShadow: running
                ? `0 0 24px 6px ${phase.color.replace("1)", "0.3)")}`
                : "0 0 16px 4px hsla(255, 50%, 50%, 0.15)",
            }}
          >
            {running ? (
              <span
                className="leading-none font-light"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "16px",
                  color: "hsla(0, 0%, 100%, 0.95)",
                }}
              >
                {secondsLeft}
              </span>
            ) : (
              <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
                <path d="M2 1L10 7L2 13V1Z" fill="hsla(0, 0%, 100%, 0.7)" />
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Cycle counter */}
      <span
        style={{
          fontSize: sf(10),
          color: "hsla(0, 0%, 80%, 0.4)",
          letterSpacing: "0.1em",
          minHeight: 14,
        }}
      >
        {running
          ? `${cycle + 1} of ${protocol.cycles}`
          : `${protocol.cycles} cycles · ${protocol.name}`}
      </span>

      {/* Protocol pills */}
      <div className="flex items-center gap-1.5">
        {PROTOCOLS.map((p, i) => {
          const active = i === selectedIdx;
          const hue = i === 0 ? 255 : i === 1 ? 38 : 175;
          return (
            <button
              key={p.intent}
              onClick={() => setSelectedIdx(i)}
              className="rounded-full transition-all duration-300"
              style={{
                padding: "3px 10px",
                fontSize: sf(9),
                letterSpacing: "0.14em",
                textTransform: "uppercase" as const,
                fontWeight: active ? 500 : 400,
                color: active
                  ? `hsla(${hue}, 50%, 75%, 0.95)`
                  : "hsla(0, 0%, 70%, 0.4)",
                background: active
                  ? `hsla(${hue}, 40%, 50%, 0.15)`
                  : "transparent",
                border: `1px solid ${
                  active
                    ? `hsla(${hue}, 40%, 60%, 0.25)`
                    : "hsla(0, 0%, 50%, 0.1)"
                }`,
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
