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
    title: "Your sovereign rhythm",
    body: "Hologram organizes your creative energy into three harmonious modes — each one essential to the whole.",
  },
  {
    phase: "learn",
    title: "Learn · Perceive",
    body: "Where vision arises. Research, reason, and absorb new understanding. This is the receptive, contemplative mode.",
  },
  {
    phase: "work",
    title: "Work · Build",
    body: "Where vision is enacted. Plan, code, and bring ideas into form. This is the focused, productive mode.",
  },
  {
    phase: "play",
    title: "Play · Discover",
    body: "Where results are witnessed. Create freely, reflect, and let curiosity guide you. This is the expansive, joyful mode.",
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
        className="relative max-w-[320px] w-full mx-4 rounded-2xl px-7 py-8 flex flex-col items-center text-center gap-5"
        style={{
          background: P.surface,
          border: `1px solid ${P.border}`,
          boxShadow: "0 24px 80px -12px hsla(25, 15%, 5%, 0.6)",
          animation: exiting
            ? "onboard-card-exit 0.25s ease-in both"
            : "onboard-card-enter 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
        }}
        key={step}
      >
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl overflow-hidden">
          <div
            className="absolute inset-0"
            style={{ background: "hsla(38, 10%, 50%, 0.1)" }}
          />
          <div
            className="h-full transition-all duration-700 ease-out"
            style={{
              width: `${((step + 1) / STEPS.length) * 100}%`,
              background: `linear-gradient(90deg, hsla(38, 30%, 55%, 0.4), ${phaseColor})`,
            }}
          />
        </div>

        {/* Step indicator dots */}
        <div className="flex gap-2 mt-1">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full transition-all duration-500"
              style={{
                background: i === step
                  ? phaseColor
                  : i < step
                    ? "hsla(38, 20%, 55%, 0.4)"
                    : "hsla(38, 10%, 50%, 0.2)",
                transform: i === step ? "scale(1.3)" : "scale(1)",
              }}
            />
          ))}
        </div>

        {/* Title */}
        <h3
          className="text-lg font-light tracking-wide leading-snug"
          style={{
            fontFamily: P.fontDisplay,
            color: current.phase
              ? `hsla(${PHASES[current.phase].hue}, 28%, 78%, 0.95)`
              : P.text,
          }}
        >
          {current.title}
        </h3>

        {/* Body */}
        <p
          className="text-[13px] leading-[1.7] max-w-[260px]"
          style={{ fontFamily: P.font, color: P.textMuted }}
        >
          {current.body}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-4 mt-2">
          {step === 0 && (
            <button
              onClick={skip}
              className="text-[11px] tracking-[0.15em] uppercase transition-opacity duration-300 hover:opacity-70"
              style={{ fontFamily: P.font, color: P.textDim }}
            >
              Skip
            </button>
          )}
          <button
            onClick={advance}
            className="px-5 py-2 rounded-full text-[12px] tracking-[0.1em] uppercase transition-all duration-300 hover:scale-[1.03]"
            style={{
              fontFamily: P.font,
              fontWeight: 500,
              background: `hsla(38, 25%, 40%, 0.2)`,
              border: `1px solid hsla(38, 30%, 50%, 0.25)`,
              color: P.text,
            }}
          >
            {isLast ? "Begin" : "Next"}
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
