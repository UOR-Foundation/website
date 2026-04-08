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
              {(profile?.uorCid || profile?.uorCanonicalId || profile?.uorIpv6 || profile?.uorGlyph) && (
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

                  {profile.uorGlyph && (
                    <IdentityRow icon={<Fingerprint className="w-3.5 h-3.5" />} label="Glyph" value={profile.uorGlyph} copied={copied} onCopy={copyField} fieldKey="glyph" />
                  )}
                  {profile.uorCid && (
                    <IdentityRow icon={<Globe className="w-3.5 h-3.5" />} label="CID" value={profile.uorCid} copied={copied} onCopy={copyField} fieldKey="cid" truncate />
                  )}
                  {profile.uorIpv6 && (
                    <IdentityRow icon={<Globe className="w-3.5 h-3.5" />} label="IPv6" value={profile.uorIpv6} copied={copied} onCopy={copyField} fieldKey="ipv6" truncate />
                  )}
                  {profile.uorCanonicalId && (
                    <IdentityRow icon={<ShieldCheck className="w-3.5 h-3.5" />} label="Canon" value={profile.uorCanonicalId} copied={copied} onCopy={copyField} fieldKey="canonical" truncate />
                  )}
                </div>
              )}

              {/* Ceremony status */}
              {profile?.ceremonyCid && (
                <div
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg"
                  style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.1)" }}
                >
                  <ShieldCheck className="w-3.5 h-3.5" style={{ color: "rgba(52,211,153,0.6)" }} />
                  <p style={{ fontSize: 12, color: "rgba(52,211,153,0.7)" }}>Ceremony verified</p>
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
            /* ═══ Unauthenticated — Revolut SSO style ═══ */
            <div className="flex flex-col items-center pt-8">
              {/* Clean typography hero — no icons, no gradients */}
              <h2
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.95)",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.2,
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
                  marginBottom: 32,
                  lineHeight: 1.5,
                }}
              >
                {mode === "signin"
                  ? "Sign in to access your sovereign identity"
                  : "Your identity is derived, never assigned"
                }
              </p>

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
                    color: "#0e0e10",
                    background: "rgba(255,255,255,0.92)",
                    border: "none",
                    cursor: submitting ? "not-allowed" : "pointer",
                    opacity: submitting ? 0.5 : 1,
                    transition: "opacity 150ms ease-out, background 150ms ease-out",
                  }}
                  onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.background = "rgba(255,255,255,1)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.92)"; }}
                >
                  {submitting ? "…" : mode === "signin" ? "Sign in" : "Create identity"}
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
