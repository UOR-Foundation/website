/**
 * AuthPromptModal — Perplexity-style contextual sign-in experience.
 *
 * Dynamic headline adapts to what the guest was doing when prompted.
 * Google + Apple OAuth, email/password, with a clean Perplexity-inspired layout.
 */

import { useState } from "react";
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

const CONTEXT_COPY: Record<AuthContext, { headline: string; benefit: string }> = {
  react:     { headline: "Sign in to react and engage",       benefit: "Your reactions are saved and visible to the community." },
  vote:      { headline: "Sign in to vote on contributions",  benefit: "Your votes shape which ideas rise to the top." },
  fork:      { headline: "Sign in to fork and remix",         benefit: "Create your own version of any object in the address space." },
  vault:     { headline: "Sign in to persist your vault",     benefit: "Your files survive across sessions, devices, and time." },
  messenger: { headline: "Sign in for encrypted messaging",   benefit: "Private conversations, end-to-end encrypted." },
  comment:   { headline: "Sign in to join the conversation",  benefit: "Get notified when someone replies to you." },
  save:      { headline: "Sign in to save your discoveries",  benefit: "Your search history and bookmarks, always accessible." },
  identity:  { headline: "Claim your sovereign identity",     benefit: "A persistent, cryptographic identity — derived, never assigned." },
  transfer:  { headline: "Sign in for encrypted transfer",    benefit: "Securely transfer sessions across devices." },
  default:   { headline: "Sign in to unlock your experience", benefit: "Save progress, join conversations, and own your identity." },
};

interface Props {
  open: boolean;
  onClose: () => void;
  context?: AuthContext;
}

export default function AuthPromptModal({ open, onClose, context = "default" }: Props) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  const copy = CONTEXT_COPY[context];

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
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
        onClose();
      }
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

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
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="fixed inset-0 z-[101] flex items-center justify-center px-4 pointer-events-none"
          >
            <div
              className="relative w-full max-w-[420px] rounded-2xl overflow-hidden pointer-events-auto"
              style={{
                background: "rgba(14, 14, 16, 0.98)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
              }}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 rounded-lg z-10"
                style={{ color: "rgba(255,255,255,0.25)", transition: "color 150ms" }}
                onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.25)"; }}
              >
                <X className="w-4 h-4" />
              </button>

              {/* Content */}
              <div className="px-8 pt-10 pb-8 flex flex-col items-center">
                {/* Headline */}
                <h2
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.95)",
                    letterSpacing: "-0.02em",
                    lineHeight: 1.25,
                    textAlign: "center",
                  }}
                >
                  {copy.headline}
                </h2>
                <p
                  style={{
                    fontSize: 14,
                    color: "rgba(255,255,255,0.4)",
                    textAlign: "center",
                    marginTop: 8,
                    marginBottom: 28,
                    lineHeight: 1.5,
                    maxWidth: 320,
                  }}
                >
                  {copy.benefit}
                </p>

                {/* OAuth Buttons */}
                <div className="w-full space-y-3">
                  {/* Google */}
                  <button
                    onClick={() => handleOAuth("google")}
                    className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: "rgba(255,255,255,0.92)",
                      color: "#1a1a1a",
                      border: "none",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,1)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.92)"; }}
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
                    className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: "transparent",
                      color: "rgba(255,255,255,0.85)",
                      border: "1px solid rgba(255,255,255,0.15)",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                    Continue with Apple
                  </button>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 w-full my-6">
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", fontWeight: 500 }}>or</span>
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                </div>

                {/* Email section */}
                {!showEmailForm ? (
                  <button
                    onClick={() => setShowEmailForm(true)}
                    className="w-full py-3 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      color: "rgba(255,255,255,0.6)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                      e.currentTarget.style.color = "rgba(255,255,255,0.8)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                      e.currentTarget.style.color = "rgba(255,255,255,0.6)";
                    }}
                  >
                    Continue with email
                  </button>
                ) : (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleEmailAuth}
                    className="w-full space-y-3 overflow-hidden"
                  >
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="Email address"
                      required
                      autoComplete="email"
                      autoFocus
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.9)",
                        transition: "border-color 150ms",
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
                      onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                    />
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Password"
                      required
                      minLength={6}
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.9)",
                        transition: "border-color 150ms",
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
                      onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
                      style={{
                        background: "rgba(255,255,255,0.92)",
                        color: "#0e0e10",
                        opacity: submitting ? 0.5 : 1,
                        cursor: submitting ? "not-allowed" : "pointer",
                      }}
                      onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = "rgba(255,255,255,1)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.92)"; }}
                    >
                      {submitting ? "…" : mode === "signin" ? "Sign in" : "Create account"}
                    </button>
                  </motion.form>
                )}

                {/* Toggle mode */}
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", textAlign: "center", marginTop: 20 }}>
                  {mode === "signin" ? (
                    <>
                      Don't have an account?{" "}
                      <button
                        onClick={() => setMode("signup")}
                        style={{ color: "rgba(255,255,255,0.6)", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500 }}
                        onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.9)"; }}
                        onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
                      >
                        Create one
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{" "}
                      <button
                        onClick={() => setMode("signin")}
                        style={{ color: "rgba(255,255,255,0.6)", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500 }}
                        onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.9)"; }}
                        onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </p>

                {/* Privacy note */}
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.15)", textAlign: "center", marginTop: 16, lineHeight: 1.5 }}>
                  By continuing, you agree to our Terms of Service and Privacy Policy.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
