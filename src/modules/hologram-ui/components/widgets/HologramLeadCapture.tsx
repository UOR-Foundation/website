/**
 * HologramLeadCapture — Typeform-inspired lead capture
 * ═════════════════════════════════════════════════════
 *
 * A fullscreen, one-question-at-a-time flow that mirrors
 * the tranquil Hologram aesthetic. Each step animates
 * vertically like Typeform, but with warm earth tones
 * and the serif elegance of the Hologram design system.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowUp, ArrowDown, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import HologramLogo from "../shell/HologramLogo";

/* ── Step definitions ──────────────────────────────────────── */

interface EmailStep {
  type: "email";
  number: number;
  question: string;
  placeholder: string;
  required: boolean;
}

interface ChoiceStep {
  type: "choice";
  number: number;
  question: string;
  options: { key: string; label: string }[];
  required: boolean;
}

type Step = EmailStep | ChoiceStep;

const STEPS: Step[] = [
  {
    type: "email",
    number: 1,
    question: "Please enter your email address.",
    placeholder: "name@example.com",
    required: true,
  },
  {
    type: "choice",
    number: 2,
    question: "What is your primary use case?",
    options: [
      { key: "A", label: "AI / ML" },
      { key: "B", label: "Scientific computing" },
      { key: "C", label: "Simulation" },
      { key: "D", label: "Edge / on-device" },
      { key: "E", label: "Research" },
      { key: "F", label: "Exploring" },
    ],
    required: false,
  },
];

/* ── Simple email validation ───────────────────────────────── */
function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

/* ── Animation variants ────────────────────────────────────── */
const slideVariants = {
  enter: (dir: number) => ({
    y: dir > 0 ? 80 : -80,
    opacity: 0,
    filter: "blur(4px)",
  }),
  center: {
    y: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
  exit: (dir: number) => ({
    y: dir > 0 ? -80 : 80,
    opacity: 0,
    filter: "blur(4px)",
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

/* ── Component ─────────────────────────────────────────────── */
export default function HologramLeadCapture() {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [email, setEmail] = useState("");
  const [useCase, setUseCase] = useState("");
  const useCaseRef = useRef("");
  const [submitted, setSubmitted] = useState(false);
  const [alreadyOnList, setAlreadyOnList] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;

  // Auto-focus email input
  useEffect(() => {
    if (step?.type === "email") {
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, [currentStep, step?.type]);

  const canProceed = useMemo(() => {
    if (!step) return false;
    if (step.type === "email") return isValidEmail(email);
    if (step.type === "choice") return !step.required || useCase !== "";
    return true;
  }, [step, email, useCase]);

  const goNext = useCallback(async () => {
    if (!canProceed) return;
    setError("");

    if (isLast) {
      // Submit
      setSubmitting(true);
      try {
        const { error: dbError } = await supabase
          .from("lead_submissions")
          .insert({ email: email.trim(), use_case: useCaseRef.current || null });
        if (dbError) {
          // Unique constraint violation — email already exists
          if (dbError.code === "23505" || dbError.message?.includes("duplicate")) {
            setSubmitted(true);
            setAlreadyOnList(true);
            return;
          }
          throw dbError;
        }
        setSubmitted(true);
      } catch (e: any) {
        setError(e?.message || "Something went wrong. Please try again.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setDirection(1);
    setCurrentStep((s) => s + 1);
  }, [canProceed, isLast, email, useCase]);

  const goPrev = useCallback(() => {
    if (currentStep === 0) return;
    setDirection(-1);
    setCurrentStep((s) => s - 1);
  }, [currentStep]);

  // Keyboard: Enter to proceed, Up/Down or Shift+Tab to navigate
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext]);

  const selectChoice = useCallback(
    (key: string, label: string) => {
      setUseCase(label);
      useCaseRef.current = label;
      // Auto-advance after a brief pause for delight
      setTimeout(() => {
        if (isLast) {
          goNext();
        } else {
          setDirection(1);
          setCurrentStep((s) => s + 1);
        }
      }, 300);
    },
    [isLast, goNext],
  );

  /* ── Thank-you screen ─────────────────────────────────────── */
  if (submitted) {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center"
        style={{
          background: "hsl(25, 8%, 10%)",
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 30, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex flex-col items-center text-center px-6 max-w-lg"
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-8"
            style={{
              background: "hsla(38, 30%, 50%, 0.12)",
              border: "1px solid hsla(38, 25%, 60%, 0.2)",
            }}
          >
            <Check className="w-7 h-7" style={{ color: "hsl(38, 40%, 65%)" }} />
          </div>
          <h1
            className="text-3xl md:text-4xl mb-4"
            style={{
              fontFamily: "'Playfair Display', serif",
              color: "hsla(38, 12%, 92%, 0.95)",
              fontWeight: 400,
            }}
          >
            {alreadyOnList ? "You\u2019re already on the list" : "Thank you"}
          </h1>
          <p
            className="text-lg leading-relaxed"
            style={{ color: "hsla(38, 10%, 80%, 0.7)" }}
          >
            {alreadyOnList ? (
              <>
                We have your email — no need to sign up again.
                <br />
                We\u2019ll reach out when things are ready.
              </>
            ) : (
              <>
                We'll be in touch when things are ready.
                <br />
                Something meaningful is taking shape.
              </>
            )}
          </p>
        </motion.div>
      </div>
    );
  }

  /* ── Main form ─────────────────────────────────────────────── */
  return (
    <div
      className="fixed inset-0 z-[10000] flex flex-col"
      style={{
        background: "hsl(25, 8%, 10%)",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-[3px] z-10">
        <motion.div
          className="h-full"
          style={{ background: "hsl(38, 40%, 60%)" }}
          initial={{ width: "0%" }}
          animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      </div>

      {/* Logo */}
      <div className="absolute top-6 left-8 z-10">
        <HologramLogo size={28} color="hsl(38, 25%, 80%)" />
      </div>

      {/* Step counter */}
      <div
        className="absolute top-7 right-8 z-10 text-sm tracking-wide"
        style={{ color: "hsla(38, 10%, 70%, 0.5)" }}
      >
        {currentStep + 1} / {STEPS.length}
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="w-full max-w-xl"
          >
            {/* Question number + text */}
            <div className="flex items-start gap-3 mb-8">
              <span
                className="mt-1 text-sm font-medium shrink-0 w-6 h-6 rounded flex items-center justify-center"
                style={{
                  background: "hsla(38, 30%, 50%, 0.12)",
                  color: "hsl(38, 40%, 65%)",
                  fontSize: "12px",
                }}
              >
                {step.number}
              </span>
              <h2
                className="text-2xl md:text-3xl leading-snug"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: "hsla(38, 12%, 92%, 0.95)",
                  fontWeight: 400,
                }}
              >
                {step.question}
                {step.required && (
                  <span style={{ color: "hsl(38, 40%, 65%)" }}> *</span>
                )}
              </h2>
            </div>

            {/* Email input */}
            {step.type === "email" && (
              <div className="space-y-6">
                <input
                  ref={inputRef}
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  placeholder={step.placeholder}
                  className="w-full bg-transparent border-b-2 pb-3 text-xl outline-none transition-colors duration-300 placeholder:opacity-30"
                  style={{
                    borderColor: error
                      ? "hsl(0, 50%, 55%)"
                      : isValidEmail(email)
                        ? "hsl(38, 40%, 55%)"
                        : "hsla(38, 10%, 50%, 0.25)",
                    color: "hsla(38, 12%, 92%, 0.95)",
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                  }}
                  autoComplete="email"
                />
                {error && (
                  <p className="text-sm" style={{ color: "hsl(0, 50%, 65%)" }}>
                    {error}
                  </p>
                )}
                <button
                  onClick={goNext}
                  disabled={!canProceed}
                  className="inline-flex items-center gap-2.5 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-300"
                  style={{
                    background: canProceed
                      ? "hsla(38, 30%, 50%, 0.15)"
                      : "hsla(38, 10%, 50%, 0.06)",
                    border: `1px solid ${canProceed ? "hsla(38, 25%, 60%, 0.3)" : "hsla(38, 10%, 50%, 0.1)"}`,
                    color: canProceed
                      ? "hsl(38, 20%, 85%)"
                      : "hsla(38, 10%, 60%, 0.4)",
                    cursor: canProceed ? "pointer" : "default",
                  }}
                >
                  OK
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Multiple choice */}
            {step.type === "choice" && (
              <div className="space-y-3">
                {step.options.map(({ key, label }) => {
                  const selected = useCase === label;
                  return (
                    <button
                      key={key}
                      onClick={() => selectChoice(key, label)}
                      className="w-full flex items-center gap-4 px-5 py-4 rounded-xl text-left transition-all duration-300 group"
                      style={{
                        background: selected
                          ? "hsla(38, 30%, 50%, 0.12)"
                          : "hsla(38, 10%, 50%, 0.04)",
                        border: `1px solid ${selected ? "hsla(38, 25%, 60%, 0.3)" : "hsla(38, 10%, 50%, 0.1)"}`,
                      }}
                    >
                      <span
                        className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold shrink-0 transition-all duration-300"
                        style={{
                          background: selected
                            ? "hsla(38, 30%, 50%, 0.2)"
                            : "hsla(38, 10%, 50%, 0.08)",
                          border: `1px solid ${selected ? "hsla(38, 25%, 60%, 0.3)" : "hsla(38, 10%, 50%, 0.12)"}`,
                          color: selected
                            ? "hsl(38, 40%, 70%)"
                            : "hsla(38, 10%, 60%, 0.5)",
                        }}
                      >
                        {key}
                      </span>
                      <span
                        className="text-base transition-colors duration-300"
                        style={{
                          color: selected
                            ? "hsla(38, 12%, 92%, 0.95)"
                            : "hsla(38, 10%, 80%, 0.7)",
                        }}
                      >
                        {label}
                      </span>
                      {selected && (
                        <Check
                          className="w-4 h-4 ml-auto"
                          style={{ color: "hsl(38, 40%, 65%)" }}
                        />
                      )}
                    </button>
                  );
                })}

                {/* Submit button appears after selection */}
                {useCase && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.3 }}
                    className="pt-4"
                  >
                    <button
                      onClick={goNext}
                      disabled={submitting}
                      className="inline-flex items-center gap-2.5 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-300"
                      style={{
                        background: "hsla(38, 30%, 50%, 0.15)",
                        border: "1px solid hsla(38, 25%, 60%, 0.3)",
                        color: "hsl(38, 20%, 85%)",
                      }}
                    >
                      {submitting ? "Submitting…" : "Submit"}
                      {!submitting && <Check className="w-4 h-4" />}
                    </button>
                  </motion.div>
                )}

                {error && (
                  <p className="text-sm pt-2" style={{ color: "hsl(0, 50%, 65%)" }}>
                    {error}
                  </p>
                )}
              </div>
            )}

            {/* Press Enter hint */}
            <p
              className="mt-6 text-xs tracking-wide"
              style={{ color: "hsla(38, 10%, 60%, 0.35)" }}
            >
              press <span className="font-medium" style={{ color: "hsla(38, 10%, 70%, 0.5)" }}>Enter ↵</span>
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation arrows — bottom right */}
      <div className="absolute bottom-6 right-8 flex items-center gap-1 z-10">
        <button
          onClick={goPrev}
          disabled={currentStep === 0}
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200"
          style={{
            background: currentStep > 0 ? "hsla(38, 10%, 50%, 0.08)" : "transparent",
            border: `1px solid ${currentStep > 0 ? "hsla(38, 10%, 50%, 0.15)" : "transparent"}`,
            color: currentStep > 0 ? "hsla(38, 10%, 70%, 0.6)" : "hsla(38, 10%, 50%, 0.2)",
            cursor: currentStep > 0 ? "pointer" : "default",
          }}
          aria-label="Previous question"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
        <button
          onClick={goNext}
          disabled={!canProceed}
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200"
          style={{
            background: canProceed ? "hsla(38, 10%, 50%, 0.08)" : "transparent",
            border: `1px solid ${canProceed ? "hsla(38, 10%, 50%, 0.15)" : "transparent"}`,
            color: canProceed ? "hsla(38, 10%, 70%, 0.6)" : "hsla(38, 10%, 50%, 0.2)",
            cursor: canProceed ? "pointer" : "default",
          }}
          aria-label="Next question"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
