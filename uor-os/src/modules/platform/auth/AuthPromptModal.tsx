/**
 * AuthPromptModal — Perplexity-style unified sign-in / sign-up.
 *
 * Single canonical entry: email input always visible, password slides in on
 * "Continue with email". Submit tries signIn first; on failure auto-falls back
 * to signUp. The user never picks a mode — the system figures it out.
 */

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

export type AuthContext =
  | "react"
  | "vote"
  | "fork"
  | "vault"
  | "messenger"
  | "comment"
  | "save"
  | "identity"
  | "transfer"
  | "default";

const CONTEXT_COPY: Record<AuthContext, { headline: string; sub: string }> = {
  react:     { headline: "React & Engage",         sub: "Sign in or create an account to continue" },
  vote:      { headline: "Vote on Contributions",  sub: "Sign in or create an account to continue" },
  fork:      { headline: "Fork & Remix",           sub: "Sign in or create an account to continue" },
  vault:     { headline: "Persist Your Vault",     sub: "Sign in or create an account to continue" },
  messenger: { headline: "Encrypted Messaging",    sub: "Sign in or create an account to continue" },
  comment:   { headline: "Join the Conversation",  sub: "Sign in or create an account to continue" },
  save:      { headline: "Save Your Discoveries",  sub: "Sign in or create an account to continue" },
  identity:  { headline: "Claim Your Identity",    sub: "Sign in or create an account to continue" },
  transfer:  { headline: "Encrypted Transfer",     sub: "Sign in or create an account to continue" },
  default:   { headline: "Welcome",                sub: "Sign in or create an account to continue" },
};

interface Props {
  open: boolean;
  onClose: () => void;
  context?: AuthContext;
}

export default function AuthPromptModal({ open, onClose, context = "default" }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<"email" | "password">("email");
  const [feedback, setFeedback] = useState<string | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const copy = CONTEXT_COPY[context];

  const reset = () => {
    setEmail("");
    setPassword("");
    setStep("email");
    setFeedback(null);
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  /* ── OAuth ── */
  const handleOAuth = async (provider: "google" | "apple") => {
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error.message || "Authentication failed");
        return;
      }
      if (result.redirected) return;
      toast.success("Signed in");
      handleClose();
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    }
  };

  /* ── Email: step 1 → show password ── */
  const handleContinueEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStep("password");
    // Focus password field after animation
    setTimeout(() => passwordRef.current?.focus(), 200);
  };

  /* ── Email: step 2 → unified sign-in / sign-up ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      // Try sign-in first
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (!signInError) {
        toast.success("Signed in");
        handleClose();
        return;
      }

      // If invalid credentials, try sign-up
      if (signInError.message?.includes("Invalid login credentials")) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (signUpError) throw signUpError;
        setFeedback("Check your email to confirm your account.");
        return;
      }

      // Other sign-in error
      throw signInError;
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Shared input style ── */
  const inputClass =
    "w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors duration-150 " +
    "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.10)] text-[rgba(255,255,255,0.9)] " +
    "placeholder:text-[rgba(255,255,255,0.28)] " +
    "focus:border-[rgba(255,255,255,0.22)] focus:bg-[rgba(255,255,255,0.06)]";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100]"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(10px)" }}
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 14 }}
            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
            className="fixed inset-0 z-[101] flex items-center justify-center px-4 pointer-events-none"
          >
            <div
              className="relative w-full max-w-[420px] rounded-2xl overflow-hidden pointer-events-auto"
              style={{
                background: "rgba(14, 14, 16, 0.98)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 32px 100px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04) inset",
              }}
            >
              {/* Close X */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-1.5 rounded-lg z-10 transition-colors duration-150
                  text-[rgba(255,255,255,0.25)] hover:text-[rgba(255,255,255,0.6)]"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Body */}
              <div className="px-8 pt-12 pb-8 flex flex-col items-center">
                {/* Headline */}
                <h2
                  className="text-center leading-tight"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 26,
                    fontWeight: 600,
                    color: "#d4c5a9",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {copy.headline}
                </h2>
                <p
                  className="text-center mt-2 mb-8"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 14,
                    color: "rgba(255,255,255,0.4)",
                    lineHeight: 1.5,
                  }}
                >
                  {copy.sub}
                </p>

                {/* ── Feedback (post-signup confirmation) ── */}
                <AnimatePresence>
                  {feedback && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="w-full mb-5 overflow-hidden"
                    >
                      <div
                        className="rounded-xl px-4 py-3 text-sm text-center"
                        style={{
                          background: "rgba(52, 168, 83, 0.08)",
                          border: "1px solid rgba(52, 168, 83, 0.2)",
                          color: "rgba(52, 168, 83, 0.9)",
                        }}
                      >
                        {feedback}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── OAuth Buttons ── */}
                <div className="w-full space-y-3">
                  {/* Google */}
                  <button
                    onClick={() => handleOAuth("google")}
                    className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-semibold
                      transition-all duration-150
                      bg-[rgba(255,255,255,0.92)] text-[#1a1a1a]
                      hover:bg-white active:scale-[0.98]"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </button>

                  {/* Apple */}
                  <button
                    onClick={() => handleOAuth("apple")}
                    className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-semibold
                      transition-all duration-150
                      bg-transparent text-[rgba(255,255,255,0.85)]
                      border border-[rgba(255,255,255,0.12)]
                      hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.22)]
                      active:scale-[0.98]"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                    Continue with Apple
                  </button>
                </div>

                {/* ── Email Section ── */}
                <form
                  onSubmit={step === "email" ? handleContinueEmail : handleSubmit}
                  className="w-full mt-6 space-y-3"
                >
                  {/* Email — always visible */}
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    autoComplete="email"
                    className={inputClass}
                  />

                  {/* Password — slides in */}
                  <AnimatePresence>
                    {step === "password" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                        className="overflow-hidden"
                      >
                        <input
                          ref={passwordRef}
                          type="password"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="Password"
                          required
                          minLength={6}
                          autoComplete="current-password"
                          className={inputClass}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* CTA button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-150
                      active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: step === "email"
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(255,255,255,0.92)",
                      color: step === "email"
                        ? "rgba(255,255,255,0.7)"
                        : "#0e0e10",
                      border: step === "email"
                        ? "1px solid rgba(255,255,255,0.10)"
                        : "1px solid transparent",
                    }}
                  >
                    {submitting
                      ? "…"
                      : step === "email"
                        ? "Continue with email"
                        : "Continue"}
                  </button>
                </form>

                {/* Close text link */}
                <button
                  onClick={handleClose}
                  className="mt-6 text-sm transition-colors duration-150
                    text-[rgba(255,255,255,0.3)] hover:text-[rgba(255,255,255,0.6)]"
                  style={{ background: "none", border: "none", cursor: "pointer" }}
                >
                  Close
                </button>

                {/* Terms + wallet disclosure */}
                <p
                  className="text-center mt-5"
                  style={{ fontSize: 11, color: "rgba(255,255,255,0.15)", lineHeight: 1.6 }}
                >
                  By continuing, you agree to our Terms of Service and Privacy&nbsp;Policy.
                  {" "}A Preview Wallet will be created for your account.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
