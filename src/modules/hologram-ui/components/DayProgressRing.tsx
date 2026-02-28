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
import { getDayWindowProgress, isNightTime } from "@/modules/hologram-ui/hooks/useGreeting";
import { supabase } from "@/integrations/supabase/client";

// ── Day progress ───────────────────────────────────────────────────────────

function getDayProgress(): number {
  return getDayWindowProgress();
}

// ── Ring geometry ──────────────────────────────────────────────────────────

const SIZE = 110;
const STROKE = 2.5;
const RADIUS = (SIZE - STROKE * 2) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// ── Component ──────────────────────────────────────────────────────────────

interface DayProgressRingProps {
  balance?: TriadicBalance;
  activePhase?: TriadicPhase | null;
  bgMode?: "image" | "white" | "dark";
}

export default function DayProgressRing({ balance: externalBalance, activePhase, bgMode = "dark" }: DayProgressRingProps) {
  const [progress, setProgress] = useState(getDayProgress);
  const [hovered, setHovered] = useState(false);
  const [night, setNight] = useState(isNightTime);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const attention = useAttentionMode();
  const isWhite = bgMode === "white";

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setIsLoggedIn(!!data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setProgress(getDayProgress());
      setNight(isNightTime());
    }, 10_000);
    return () => clearInterval(id);
  }, []);
  const ZERO_BALANCE: TriadicBalance = { learn: 0, work: 0, play: 0 };

  const displayBalance = useMemo<TriadicBalance>(() => {
    if (!isLoggedIn) return ZERO_BALANCE;
    if (externalBalance) return externalBalance;
    const hour = new Date().getHours();
    if (hour < 12) return { learn: 0.45, work: 0.30, play: 0.25 };
    if (hour < 18) return { learn: 0.25, work: 0.50, play: 0.25 };
    return { learn: 0.20, work: 0.30, play: 0.50 };
  }, [externalBalance, isLoggedIn]);

  const pct = Math.round(progress * 100);
  const report = useMemo(() => computeBalance(displayBalance), [displayBalance]);

  const totalFilled = CIRCUMFERENCE * progress;
  const segments = useMemo(() => {
    if (!isLoggedIn) {
      return [{ phase: "learn" as TriadicPhase, length: totalFilled, offset: 0, neutral: true }];
    }
    let offset = 0;
    return PHASE_ORDER.map((phase) => {
      const segLen = totalFilled * displayBalance[phase];
      const seg = { phase, length: segLen, offset, neutral: false };
      offset += segLen;
      return seg;
    });
  }, [progress, displayBalance, totalFilled, isLoggedIn]);

  const displayAngle = 2 * Math.PI * progress;
  const dotCx = SIZE / 2 + RADIUS * Math.cos(displayAngle);
  const dotCy = SIZE / 2 + RADIUS * Math.sin(displayAngle);

  return (
    <div
      className="group relative flex flex-col items-center gap-4 cursor-default select-none"
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
            stroke={isWhite ? "hsla(0, 0%, 0%, 0.15)" : "hsla(38, 12%, 60%, 0.08)"}
            strokeWidth={STROKE}
          />

          {/* Colored segments */}
          {segments.map(({ phase, length, offset, neutral }) => {
            if (length <= 0) return null;
            const phaseDef = PHASES[phase];
            const strokeColor = neutral
              ? (isWhite ? "hsla(0, 0%, 20%, 0.5)" : "hsla(220, 12%, 72%, 0.45)")
              : `hsla(${phaseDef.hue}, 40%, ${isWhite ? "40" : "60"}%, 0.8)`;
            return (
              <circle
                key={neutral ? "neutral" : phase}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={strokeColor}
                strokeWidth={STROKE}
                strokeLinecap="butt"
                strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
                strokeDashoffset={-offset}
                style={{ transition: "stroke-dasharray 0.6s ease-out, stroke-dashoffset 0.6s ease-out" }}
              />
            );
          })}

          {/* Leading glow dot */}
          <circle
            cx={dotCx}
            cy={dotCy}
            r={2.5}
            fill={isWhite ? "hsla(38, 40%, 45%, 0.8)" : "hsla(38, 40%, 65%, 0.7)"}
            style={{
              transition: "cx 0.6s ease-out, cy 0.6s ease-out",
              animation: "dot-heartbeat 1.6s ease-in-out infinite",
            }}
          />
        </svg>

        {/* Breathing glow */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: isWhite
              ? "radial-gradient(circle, hsla(38, 30%, 40%, 0.04) 0%, transparent 70%)"
              : "radial-gradient(circle, hsla(38, 35%, 55%, 0.06) 0%, transparent 70%)",
            animation: "ring-breathe 6s ease-in-out infinite",
          }}
        />

        {/* Center — percentage + OF DAY */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-[8px]" style={{ textRendering: "geometricPrecision", WebkitFontSmoothing: "antialiased" as any }}>
          {night ? (
            <>
              <span
                className="leading-none"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "26px",
                  color: isWhite ? "hsla(0, 0%, 10%, 0.8)" : "hsla(220, 20%, 80%, 0.8)",
                  fontWeight: 300,
                  letterSpacing: "0.02em",
                }}
              >
                ☽
              </span>
              {attention.showExpanded && (
                <span
                  className="tracking-[0.25em] uppercase leading-none transition-opacity duration-700"
                  style={{
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                    fontSize: "10px",
                    color: isWhite ? "hsla(0, 0%, 10%, 0.65)" : "hsla(220, 15%, 75%, 0.5)",
                    fontWeight: 500,
                  }}
                >
                  Night
                </span>
              )}
            </>
          ) : (
            <>
              <span
                className="font-light leading-none"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "26px",
                  color: isWhite ? "hsla(0, 0%, 5%, 0.9)" : "hsla(38, 15%, 94%, 0.95)",
                  fontWeight: 300,
                  letterSpacing: "0.02em",
                }}
              >
                {pct}%
              </span>
              {/* "of day" label removed for cleaner look */}
            </>
          )}
        </div>
      </div>

      {/* Dynamic label — context-aware prompts */}
      {(() => {
        const totalWeight = displayBalance.learn + displayBalance.work + displayBalance.play;
        const hasSufficientData = externalBalance !== undefined && totalWeight > 0;

        const getRebalancePrompt = (): { label: string; color: string } => {
          if (!isLoggedIn) {
            return { label: "Your day", color: isWhite ? "hsla(0, 0%, 10%, 0.75)" : "hsla(38, 15%, 85%, 0.75)" };
          }
          if (night) {
            return { label: "Rest well", color: isWhite ? "hsla(0, 0%, 10%, 0.65)" : "hsla(220, 15%, 78%, 0.6)" };
          }
          if (!hasSufficientData) {
            return { label: "Your day", color: isWhite ? "hsla(0, 0%, 10%, 0.75)" : "hsla(38, 15%, 85%, 0.75)" };
          }

          if (activePhase) {
            const phaseLabels: Record<TriadicPhase, string> = {
              learn: "Discovering",
              work: "Building",
              play: "Reflecting",
            };
            return {
              label: phaseLabels[activePhase],
              color: isWhite
                ? `hsla(${PHASES[activePhase].hue}, 40%, 35%, 0.85)`
                : `hsla(${PHASES[activePhase].hue}, 35%, 75%, 0.85)`,
            };
          }

          const { dominant, neglected } = report;

          if (dominant && neglected) {
            const prompts: Partial<Record<TriadicPhase, Partial<Record<TriadicPhase, string>>>> = {
              work: { learn: "Try something new", play: "Take a moment to reflect" },
              learn: { work: "Put ideas into action", play: "Step back and enjoy" },
              play: { learn: "Feed your curiosity", work: "Channel this energy" },
            };
            const prompt = prompts[dominant]?.[neglected] ?? "Your day";
            return { label: prompt, color: isWhite ? "hsla(25, 25%, 35%, 0.7)" : "hsla(25, 25%, 75%, 0.8)" };
          }

          if (dominant) {
            const nudges: Record<TriadicPhase, string> = {
              work: "Pause and breathe",
              learn: "Create something",
              play: "Focus your energy",
            };
            return { label: nudges[dominant], color: isWhite ? "hsla(25, 25%, 35%, 0.65)" : "hsla(25, 25%, 75%, 0.75)" };
          }

          if (report.coherent) {
            return { label: "Your day", color: isWhite ? "hsla(0, 0%, 15%, 0.6)" : "hsla(38, 15%, 85%, 0.75)" };
          }

          return { label: "Your day", color: isWhite ? "hsla(0, 0%, 15%, 0.6)" : "hsla(38, 15%, 85%, 0.75)" };
        };

        const { label, color } = getRebalancePrompt();

        return (
          <span
            className="tracking-[0.35em] uppercase text-center transition-all duration-300"
            style={{
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: "12px",
              color,
              fontWeight: 500,
            }}
          >
            {label}
          </span>
        );
      })()}

      {/* Phase legend — appears on hover */}
      <div
        className="absolute -top-16 left-1/2 -translate-x-1/2 flex gap-5 transition-all duration-300 pointer-events-none"
        style={{
          opacity: hovered && attention.showExpanded ? 1 : 0,
          transform: `translateX(-50%) translateY(${hovered && attention.showExpanded ? "0" : "6px"})`,
        }}
      >
        {PHASE_ORDER.map((phase) => {
          const phasePct = isLoggedIn ? Math.round(displayBalance[phase] * 100) : 0;
          return (
            <div key={phase} className="flex flex-col items-center gap-1">
              <span
                className="font-light leading-none"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "13px",
                  color: isWhite
                    ? `hsla(${PHASES[phase].hue}, 40%, 35%, 0.9)`
                    : `hsla(${PHASES[phase].hue}, 35%, 72%, 0.95)`,
                  letterSpacing: "0.02em",
                  textRendering: "geometricPrecision",
                  WebkitFontSmoothing: "antialiased" as any,
                }}
              >
                {phasePct}%
              </span>
              <span
                className="tracking-[0.2em] uppercase leading-none"
                style={{
              fontFamily: "'DM Sans', system-ui, sans-serif",
                  fontSize: "10px",
                  color: isWhite
                    ? `hsla(${PHASES[phase].hue}, 35%, 30%, 0.8)`
                    : `hsla(${PHASES[phase].hue}, 30%, 75%, 0.9)`,
                  fontWeight: 500,
                  textRendering: "geometricPrecision",
                  WebkitFontSmoothing: "antialiased" as any,
                }}
              >
                {phase}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
