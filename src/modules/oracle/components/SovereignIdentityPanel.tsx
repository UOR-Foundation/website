/**
 * Sovereign Identity Panel — slide-out panel for identity & auth.
 *
 * Revolut-inspired: minimal, dark, surgical typography, CSS transitions only.
 * No framer-motion. No gradients. No decorative elements.
 */

import { useState } from "react";
import { X, LogOut, User, Shield, ShieldCheck, Fingerprint, Globe, Copy, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SovereignIdentityPanel({ open, onClose }: Props) {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copyField = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
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

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        style={{
          background: "rgba(0,0,0,0.5)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 200ms ease-out",
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 z-50 h-full w-full max-w-[380px] flex flex-col"
        style={{
          background: "#0e0e10",
          borderLeft: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "0 0 60px rgba(0,0,0,0.5)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 250ms cubic-bezier(0.25, 1, 0.5, 1)",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5">
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "rgba(255,255,255,0.9)",
              letterSpacing: "-0.01em",
            }}
          >
            Identity
          </span>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-md"
            style={{
              color: "rgba(255,255,255,0.3)",
              transition: "color 150ms ease-out, background 150ms ease-out",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "rgba(255,255,255,0.7)";
              e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(255,255,255,0.3)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div
                className="w-5 h-5 border-2 rounded-full animate-spin"
                style={{ borderColor: "rgba(255,255,255,0.08)", borderTopColor: "rgba(255,255,255,0.4)" }}
              />
            </div>
          ) : user ? (
            /* ═══ Authenticated ═══ */
            <div className="space-y-6">
              {/* Profile */}
              <div className="flex items-center gap-3.5">
                {profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt=""
                    className="w-11 h-11 rounded-full object-cover"
                    style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                ) : (
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    <User className="w-5 h-5" style={{ color: "rgba(255,255,255,0.35)" }} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.9)" }} className="truncate">
                    {profile?.displayName ?? "User"}
                  </p>
                  {profile?.handle && (
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }} className="truncate">
                      @{profile.handle}
                    </p>
                  )}
                  {profile?.threeWordName && (
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }} className="mt-0.5">
                      {profile.threeWordName}
                    </p>
                  )}
                </div>
              </div>

              {profile?.bio && (
                <p style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.4)" }}>
                  {profile.bio}
                </p>
              )}

              {/* Identity coordinates */}
              {(profile?.uorIpv6 || profile?.threeWordName) && (
                <div className="space-y-1">
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.08em",
                      color: "rgba(255,255,255,0.25)",
                      marginBottom: 8,
                    }}
                  >
                    Coordinates
                  </p>

                  {profile.threeWordName && (
                    <IdentityRow icon={<Fingerprint className="w-3.5 h-3.5" />} label="Address" value={profile.threeWordName} copied={copied} onCopy={copyField} fieldKey="triword" />
                  )}
                  {profile.uorIpv6 && (
                    <IdentityRow icon={<Globe className="w-3.5 h-3.5" />} label="IPv6" value={profile.uorIpv6} copied={copied} onCopy={copyField} fieldKey="ipv6" truncate />
                  )}
                </div>
              )}

              {/* Ceremony status */}
              {profile?.ceremonyCid ? (
                <div
                  className="flex items-center gap-3 px-3.5 py-3 rounded-lg"
                  style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.1)" }}
                >
                  <span style={{ fontSize: 20, lineHeight: 1 }}>
                    {(() => {
                      // Derive moon phase from ceremony glyph if available
                      const phases = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗"];
                      if (profile.uorGlyph) {
                        const cp = profile.uorGlyph.codePointAt(0) ?? 0x2800;
                        const byte = cp - 0x2800;
                        let pop = 0;
                        for (let i = 0; i < 6; i++) if (byte & (1 << i)) pop++;
                        return phases[Math.min(pop, 6)];
                      }
                      return "🌑";
                    })()}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" style={{ color: "rgba(52,211,153,0.6)" }} />
                      <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(52,211,153,0.7)" }}>Sovereign blade forged</p>
                    </div>
                    <p style={{ fontSize: 10, color: "rgba(52,211,153,0.4)", fontFamily: "monospace", marginTop: 2 }}>
                      Z/(2⁶)Z lattice • genesis node
                    </p>
                  </div>
                </div>
              ) : user && (
                <div
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div
                    className="w-3.5 h-3.5 border-2 rounded-full animate-spin"
                    style={{ borderColor: "rgba(255,255,255,0.08)", borderTopColor: "rgba(255,255,255,0.3)" }}
                  />
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Forging sovereign blade…</p>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => { navigate("/identity"); onClose(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 rounded-lg text-left"
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.7)",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    transition: "background 150ms ease-out, color 150ms ease-out",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                    e.currentTarget.style.color = "rgba(255,255,255,0.9)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    e.currentTarget.style.color = "rgba(255,255,255,0.7)";
                  }}
                >
                  <Shield className="w-4 h-4" />
                  Manage Identity
                </button>

                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-4 py-3 rounded-lg text-left"
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.35)",
                    transition: "color 150ms ease-out, background 150ms ease-out",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "rgba(248,113,113,0.8)";
                    e.currentTarget.style.background = "rgba(248,113,113,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "rgba(255,255,255,0.35)";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            /* ═══ Unauthenticated — Perplexity-inspired SSO ═══ */
            <div className="flex flex-col items-center pt-8">
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.95)",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.25,
                  textAlign: "center" as const,
                  marginBottom: 6,
                }}
              >
                {mode === "signin" ? "Welcome back" : "Create your identity"}
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: "rgba(255,255,255,0.35)",
                  textAlign: "center" as const,
                  marginBottom: 28,
                  lineHeight: 1.5,
                }}
              >
                {mode === "signin"
                  ? "Sign in to access your sovereign identity"
                  : "Your identity is derived, never assigned"
                }
              </p>

              {/* OAuth buttons */}
              <div className="w-full space-y-3 mb-5">
                <button
                  onClick={async () => {
                    try {
                      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
                      if (result.error) { toast.error(result.error.message || "Authentication failed"); return; }
                      if (result.redirected) return;
                      toast.success("Signed in"); onClose();
                    } catch (err: any) { toast.error(err.message ?? "Authentication failed"); }
                  }}
                  className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: "rgba(255,255,255,0.92)", color: "#1a1a1a" }}
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

                <button
                  onClick={async () => {
                    try {
                      const result = await lovable.auth.signInWithOAuth("apple", { redirect_uri: window.location.origin });
                      if (result.error) { toast.error(result.error.message || "Authentication failed"); return; }
                      if (result.redirected) return;
                      toast.success("Signed in"); onClose();
                    } catch (err: any) { toast.error(err.message ?? "Authentication failed"); }
                  }}
                  className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: "transparent", color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.15)" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  Continue with Apple
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 w-full mb-5">
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", fontWeight: 500 }}>or</span>
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
              </div>

              {/* Email form */}
              <form onSubmit={handleAuth} className="w-full space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  required
                  autoComplete="email"
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    padding: "13px 16px",
                    fontSize: 14,
                    color: "rgba(255,255,255,0.9)",
                    outline: "none",
                    transition: "border-color 150ms ease-out",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  minLength={6}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    padding: "13px 16px",
                    fontSize: 14,
                    color: "rgba(255,255,255,0.9)",
                    outline: "none",
                    transition: "border-color 150ms ease-out",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                />

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    width: "100%",
                    padding: "13px 0",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.85)",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    cursor: submitting ? "not-allowed" : "pointer",
                    opacity: submitting ? 0.5 : 1,
                    transition: "opacity 150ms ease-out, background 150ms ease-out",
                  }}
                  onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                >
                  {submitting ? "…" : mode === "signin" ? "Sign in with email" : "Create identity"}
                </button>
              </form>

              <p
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.3)",
                  textAlign: "center" as const,
                  marginTop: 24,
                }}
              >
                {mode === "signin" ? (
                  <>
                    No identity yet?{" "}
                    <button
                      onClick={() => setMode("signup")}
                      style={{
                        color: "rgba(255,255,255,0.6)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 500,
                        transition: "color 150ms ease-out",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.9)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
                    >
                      Create one
                    </button>
                  </>
                ) : (
                  <>
                    Already have an identity?{" "}
                    <button
                      onClick={() => setMode("signin")}
                      style={{
                        color: "rgba(255,255,255,0.6)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 500,
                        transition: "color 150ms ease-out",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.9)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>

              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.12)", textAlign: "center" as const, marginTop: 16, lineHeight: 1.5 }}>
                By continuing, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Identity row ── */
function IdentityRow({
  icon, label, value, copied, onCopy, fieldKey, truncate,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
  fieldKey: string;
  truncate?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-2 group py-1.5"
      style={{ transition: "background 150ms ease-out" }}
    >
      <span style={{ color: "rgba(255,255,255,0.2)" }} className="shrink-0">{icon}</span>
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase" as const,
          letterSpacing: "0.08em",
          color: "rgba(255,255,255,0.25)",
          width: 48,
        }}
        className="shrink-0"
      >
        {label}
      </span>
      <span
        className={`flex-1 min-w-0 ${truncate ? "truncate" : ""}`}
        style={{ fontSize: 12, fontFamily: "monospace", color: "rgba(255,255,255,0.5)" }}
      >
        {value}
      </span>
      <button
        onClick={() => onCopy(value, fieldKey)}
        className="opacity-0 group-hover:opacity-100 p-0.5 shrink-0"
        style={{ color: "rgba(255,255,255,0.2)", transition: "opacity 150ms ease-out, color 150ms ease-out" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.2)"; }}
      >
        {copied === fieldKey ? <Check className="w-3 h-3" style={{ color: "rgba(52,211,153,0.8)" }} /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  );
}
