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
  surface: "hsla(28, 12%, 14%, 0.97)",
  border: "hsla(38, 20%, 28%, 0.22)",
  text: "hsl(38, 22%, 90%)",
  textMuted: "hsl(32, 12%, 68%)",
  textDim: "hsl(30, 8%, 48%)",
  goldWarm: "hsl(38, 45%, 62%)",
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
        background: "hsla(25, 10%, 8%, 0.72)",
        backdropFilter: "blur(16px) saturate(1.1)",
        animation: exiting && isLast
          ? "onboard-fade-out 0.5s ease-out both"
          : "onboard-fade-in 0.6s ease-out both",
      }}
    >
      <div
        className="relative max-w-[380px] w-full mx-5 rounded-3xl px-10 py-12 flex flex-col items-center text-center"
        style={{
          background: P.surface,
          border: `1px solid ${P.border}`,
          boxShadow: "0 40px 100px -20px hsla(25, 15%, 4%, 0.6), 0 0 1px hsla(38, 20%, 40%, 0.1)",
          animation: exiting
            ? "onboard-card-exit 0.3s ease-in both"
            : "onboard-card-enter 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        }}
        key={step}
      >
        {/* ── Progress — refined thin bar ──────────────────── */}
        <div className="absolute top-0 left-4 right-4 h-[1.5px] rounded-full overflow-hidden">
          <div
            className="absolute inset-0"
            style={{ background: "hsla(38, 10%, 50%, 0.06)" }}
          />
          <div
            className="h-full transition-all duration-[900ms] ease-out relative"
            style={{
              width: `${((step + 1) / STEPS.length) * 100}%`,
              background: `linear-gradient(90deg, hsla(38, 25%, 50%, 0.15), ${phaseColor})`,
            }}
          >
            <div
              className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full"
              style={{
                background: phaseColor,
                boxShadow: `0 0 6px ${phaseColor}, 0 0 12px ${phaseColor}`,
                animation: "onboard-pulse 2.5s ease-in-out infinite",
              }}
            />
          </div>
        </div>

        {/* ── Decorative accent line ────────────────────────── */}
        {current.phase && (
          <div
            className="w-8 h-[2px] rounded-full mb-6"
            style={{
              background: `linear-gradient(90deg, transparent, ${phaseColor}, transparent)`,
              animation: "onboard-accent-in 0.6s ease-out both",
              animationDelay: "0.2s",
            }}
          />
        )}
        {!current.phase && <div className="h-2" />}

        {/* ── Title ─────────────────────────────────────────── */}
        <h3
          className="text-[clamp(22px,5vw,28px)] font-light tracking-[0.04em] leading-snug mb-4"
          style={{
            fontFamily: P.fontDisplay,
            color: current.phase
              ? `hsla(${PHASES[current.phase].hue}, 28%, 76%, 0.95)`
              : P.goldWarm,
          }}
        >
          {current.title}
        </h3>

        {/* ── Body ──────────────────────────────────────────── */}
        <p
          className="text-[15px] leading-[1.85] max-w-[280px] mb-8"
          style={{ fontFamily: P.font, color: P.textMuted }}
        >
          {current.body}
        </p>

        {/* ── Step dots — gentle, connected ─────────────────── */}
        <div className="flex items-center gap-2 mb-6">
          {STEPS.map((_, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: active ? 7 : 4,
                    height: active ? 7 : 4,
                    background: active
                      ? phaseColor
                      : done
                        ? "hsla(38, 25%, 60%, 0.4)"
                        : "hsla(38, 10%, 50%, 0.12)",
                    boxShadow: active ? `0 0 8px ${phaseColor}30` : "none",
                  }}
                />
                {i < STEPS.length - 1 && (
                  <div
                    className="w-3 h-[0.5px] transition-all duration-700"
                    style={{
                      background: done ? "hsla(38, 20%, 55%, 0.2)" : "hsla(38, 10%, 50%, 0.06)",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Actions ───────────────────────────────────────── */}
        <div className="flex items-center gap-6">
          {step === 0 && (
            <button
              onClick={skip}
              className="text-[12px] tracking-[0.18em] uppercase transition-opacity duration-300 hover:opacity-50"
              style={{ fontFamily: P.font, color: P.textDim }}
            >
              Skip
            </button>
          )}
          <button
            onClick={advance}
            className="px-7 py-3 rounded-full text-[12px] tracking-[0.14em] uppercase transition-all duration-400 hover:scale-[1.02] active:scale-[0.99]"
            style={{
              fontFamily: P.font,
              fontWeight: 500,
              background: `linear-gradient(135deg, hsla(38, 20%, 35%, 0.12), hsla(38, 25%, 40%, 0.18))`,
              border: `1px solid hsla(38, 25%, 45%, 0.18)`,
              color: P.text,
              letterSpacing: "0.14em",
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
          0% { opacity: 0; transform: translateY(20px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes onboard-card-exit {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-12px) scale(0.97); }
        }
        @keyframes onboard-accent-in {
          0% { opacity: 0; width: 0; }
          100% { opacity: 1; width: 2rem; }
        }
        @keyframes onboard-pulse {
          0%, 100% { opacity: 0.5; transform: translateY(-50%) scale(1); }
          50% { opacity: 1; transform: translateY(-50%) scale(1.3); }
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
