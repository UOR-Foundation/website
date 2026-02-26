/**
 * TriadicOnboarding — First-Time Walkthrough
 * ════════════════════════════════════════════
 *
 * A gentle 3-step tooltip sequence introducing the Learn/Work/Play
 * framework to new users. Shown once, then remembered via localStorage.
 *
 * @module hologram-ui/components/TriadicOnboarding
 */

import { useState, useEffect, useCallback } from "react";
import { PHASES, PHASE_ORDER, type TriadicPhase } from "@/modules/hologram-ui/sovereign-creator";

const STORAGE_KEY = "hologram:onboarding-seen";

const P = {
  surface: "hsla(30, 8%, 18%, 0.95)",
  border: "hsla(38, 30%, 30%, 0.3)",
  text: "hsl(38, 20%, 88%)",
  textMuted: "hsl(30, 10%, 65%)",
  textDim: "hsl(30, 10%, 50%)",
  fontDisplay: "'Playfair Display', serif",
  font: "'DM Sans', sans-serif",
} as const;

interface Step {
  phase: TriadicPhase | null;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    phase: null,
    title: "Three modes, one flow",
    body: "Lumini helps you stay focused by organizing your work into three simple modes — each designed for a different kind of thinking.",
  },
  {
    phase: "learn",
    title: "Learn",
    body: "When you need to understand something deeply — research, study, or explore new ideas. This is where clarity begins.",
  },
  {
    phase: "work",
    title: "Work",
    body: "When it's time to get things done — plan, build, and ship your projects. This is where ideas become real.",
  },
  {
    phase: "play",
    title: "Play",
    body: "When you want to think freely — brainstorm, experiment, and discover new connections. This is where breakthroughs happen.",
  },
];

interface TriadicOnboardingProps {
  onComplete: () => void;
}

export default function TriadicOnboarding({ onComplete }: TriadicOnboardingProps) {
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const advance = useCallback(() => {
    if (isLast) {
      setExiting(true);
      localStorage.setItem(STORAGE_KEY, "true");
      setTimeout(onComplete, 400);
    } else {
      setExiting(true);
      setTimeout(() => {
        setStep((s) => s + 1);
        setExiting(false);
      }, 250);
    }
  }, [isLast, onComplete]);

  const skip = useCallback(() => {
    setExiting(true);
    localStorage.setItem(STORAGE_KEY, "true");
    setTimeout(onComplete, 400);
  }, [onComplete]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [skip]);

  const phaseColor = current.phase
    ? `hsla(${PHASES[current.phase].hue}, 35%, 60%, 0.9)`
    : "hsla(38, 40%, 65%, 0.9)";

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center pointer-events-auto"
      style={{
        background: "hsla(25, 10%, 10%, 0.6)",
        backdropFilter: "blur(8px)",
        animation: exiting && isLast
          ? "onboard-fade-out 0.4s ease-out both"
          : "onboard-fade-in 0.5s ease-out both",
      }}
    >
      <div
        className="relative max-w-[340px] w-full mx-4 rounded-2xl px-8 py-9 flex flex-col items-center text-center gap-6"
        style={{
          background: P.surface,
          border: `1px solid ${P.border}`,
          boxShadow: "0 30px 80px -16px hsla(25, 15%, 5%, 0.55)",
          animation: exiting
            ? "onboard-card-exit 0.25s ease-in both"
            : "onboard-card-enter 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
        }}
        key={step}
      >
        {/* ── Progress — thin line with glowing leading edge ──── */}
        <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl overflow-hidden">
          <div
            className="absolute inset-0"
            style={{ background: "hsla(38, 10%, 50%, 0.08)" }}
          />
          <div
            className="h-full transition-all duration-700 ease-out relative"
            style={{
              width: `${((step + 1) / STEPS.length) * 100}%`,
              background: `linear-gradient(90deg, hsla(38, 30%, 55%, 0.3), ${phaseColor})`,
            }}
          >
            {/* Leading glow dot */}
            <div
              className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
              style={{
                background: phaseColor,
                boxShadow: `0 0 8px ${phaseColor}, 0 0 16px ${phaseColor}`,
                animation: "onboard-pulse 2s ease-in-out infinite",
              }}
            />
          </div>
        </div>

        {/* ── Step indicator — minimal arcs ──────────────────── */}
        <div className="flex items-center gap-3 mt-1">
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            const dotColor = active
              ? phaseColor
              : done
                ? "hsla(38, 25%, 60%, 0.5)"
                : "hsla(38, 10%, 50%, 0.15)";

            return (
              <div key={i} className="relative flex items-center justify-center">
                {/* Connecting line (between dots) */}
                {i < STEPS.length - 1 && (
                  <div
                    className="absolute left-[calc(50%+6px)] top-1/2 -translate-y-1/2 h-[1px] transition-all duration-700"
                    style={{
                      width: "12px",
                      background: done ? "hsla(38, 25%, 60%, 0.3)" : "hsla(38, 10%, 50%, 0.08)",
                    }}
                  />
                )}
                {/* Dot */}
                <div
                  className="rounded-full transition-all duration-500"
                  style={{
                    width: active ? "8px" : "5px",
                    height: active ? "8px" : "5px",
                    background: dotColor,
                    boxShadow: active ? `0 0 10px ${phaseColor}40` : "none",
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* ── Step counter — whisper-quiet ───────────────────── */}
        <span
          className="text-[10px] tracking-[0.25em] uppercase"
          style={{ color: P.textDim, fontFamily: P.font }}
        >
          {step + 1} of {STEPS.length}
        </span>

        {/* ── Title ─────────────────────────────────────────── */}
        <h3
          className="text-xl font-normal tracking-[0.03em] leading-snug"
          style={{
            fontFamily: P.fontDisplay,
            color: current.phase
              ? `hsla(${PHASES[current.phase].hue}, 30%, 75%, 0.95)`
              : "hsl(38, 35%, 72%)",
          }}
        >
          {current.title}
        </h3>

        {/* ── Body ──────────────────────────────────────────── */}
        <p
          className="text-sm leading-[1.75] max-w-[270px]"
          style={{ fontFamily: P.font, color: P.textMuted }}
        >
          {current.body}
        </p>

        {/* ── Actions ───────────────────────────────────────── */}
        <div className="flex items-center gap-5 mt-1">
          {step === 0 && (
            <button
              onClick={skip}
              className="text-xs tracking-[0.15em] uppercase transition-opacity duration-300 hover:opacity-60"
              style={{ fontFamily: P.font, color: P.textDim }}
            >
              Skip
            </button>
          )}
          <button
            onClick={advance}
            className="px-6 py-2.5 rounded-full text-xs tracking-[0.12em] uppercase transition-all duration-300 hover:scale-[1.02]"
            style={{
              fontFamily: P.font,
              fontWeight: 500,
              background: `hsla(38, 25%, 40%, 0.15)`,
              border: `1px solid hsla(38, 30%, 50%, 0.2)`,
              color: P.text,
            }}
          >
            {isLast ? "Begin" : "Continue"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes onboard-fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes onboard-fade-out {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes onboard-card-enter {
          0% { opacity: 0; transform: translateY(16px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes onboard-card-exit {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-10px) scale(0.98); }
        }
        @keyframes onboard-accent-in {
          0% { opacity: 0; width: 0; }
          100% { opacity: 1; width: 2rem; }
        }
        @keyframes onboard-pulse {
          0%, 100% { opacity: 0.6; transform: translateY(-50%) scale(1); }
          50% { opacity: 1; transform: translateY(-50%) scale(1.4); }
        }
      `}</style>
    </div>
  );
}

export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}
