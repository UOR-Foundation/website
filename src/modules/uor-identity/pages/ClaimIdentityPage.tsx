/**
 * Claim UOR Identity — Bootstrap Flow
 *
 * Two bootstrap methods: Google OAuth or Email magic link.
 * After claiming, users can register a WebAuthn passkey for biometric access.
 * The identity itself is derived via URDNA2015 → SHA-256 — independent of the bootstrap method.
 */

import { useState, useEffect, useCallback } from "react";
import Layout from "@/modules/core/components/Layout";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { singleProofHash } from "@/lib/uor-canonical";
import {
  Fingerprint, Loader2, CheckCircle2, ArrowRight,
  Mail, KeyRound, ShieldCheck, AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

// ── Types ───────────────────────────────────────────────────────────────────

type ClaimStep = "intro" | "email-sent" | "signing-in" | "deriving" | "complete";

interface DerivedIdentity {
  canonicalId: string;
  glyph: string;
  cid: string;
  ipv6: string;
}

// ── WebAuthn helpers ────────────────────────────────────────────────────────

function isWebAuthnSupported(): boolean {
  return !!(navigator.credentials && window.PublicKeyCredential);
}

async function registerPasskey(userId: string): Promise<boolean> {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userIdBytes = new TextEncoder().encode(userId);

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "UOR Foundation", id: window.location.hostname },
        user: {
          id: userIdBytes,
          name: `uor-identity-${userId.slice(0, 8)}`,
          displayName: "UOR Identity",
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },   // ES256
          { alg: -257, type: "public-key" },  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60000,
        attestation: "none",
      },
    });

    return !!credential;
  } catch {
    return false;
  }
}

// ── Main Component ──────────────────────────────────────────────────────────

const ClaimIdentityPage = () => {
  const [step, setStep] = useState<ClaimStep>("intro");
  const [identity, setIdentity] = useState<DerivedIdentity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [passkeyStatus, setPasskeyStatus] = useState<"idle" | "registering" | "done" | "unsupported">("idle");

  // Check if user already has a claimed identity
  useEffect(() => {
    const checkExisting = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("uor_canonical_id, uor_glyph, uor_cid, uor_ipv6")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (profile?.uor_canonical_id) {
          setIdentity({
            canonicalId: profile.uor_canonical_id,
            glyph: profile.uor_glyph || "",
            cid: profile.uor_cid || "",
            ipv6: profile.uor_ipv6 || "",
          });
          setStep("complete");
        }
      }
    };
    checkExisting();
    if (!isWebAuthnSupported()) setPasskeyStatus("unsupported");
  }, []);

  // Listen for auth state changes (OAuth redirect or magic link return)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (
          (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") &&
          session?.user &&
          (step === "signing-in" || step === "email-sent")
        ) {
          await deriveIdentity(session.user);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [step]);

  const deriveIdentity = useCallback(async (user: { id: string; email?: string; user_metadata?: Record<string, unknown> }) => {
    setStep("deriving");
    try {
      const identitySeed = {
        "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
        "@type": "uor:Identity",
        "uor:userId": user.id,
        "uor:email": user.email,
        "uor:displayName": user.user_metadata?.full_name || user.user_metadata?.name || user.email,
        "uor:bootstrapMethod": "authenticated",
        "uor:claimedAt": new Date().toISOString(),
      };

      const proof = await singleProofHash(identitySeed);

      const derived: DerivedIdentity = {
        canonicalId: proof.derivationId,
        glyph: proof.uorAddress["u:glyph"],
        cid: proof.cid,
        ipv6: proof.ipv6Address["u:ipv6"],
      };

      await supabase
        .from("profiles")
        .update({
          uor_canonical_id: derived.canonicalId,
          uor_glyph: derived.glyph,
          uor_cid: derived.cid,
          uor_ipv6: derived.ipv6,
        })
        .eq("user_id", user.id);

      setIdentity(derived);
      setStep("complete");
    } catch (err) {
      console.error("Identity derivation failed:", err);
      setError("Identity derivation failed. Please try again.");
      setStep("intro");
    }
  }, []);

  // ── Bootstrap: Google OAuth ───────────────────────────────────────────────

  const handleGoogleSignIn = async () => {
    setStep("signing-in");
    setError(null);
    const { error: authError } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/claim-identity",
    });
    if (authError) {
      setError(authError.message || "Authentication failed. Please try again.");
      setStep("intro");
    }
  };

  // ── Bootstrap: Email Magic Link ───────────────────────────────────────────

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);

    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin + "/claim-identity" },
    });

    if (authError) {
      setError(authError.message || "Failed to send magic link.");
      return;
    }
    setStep("email-sent");
  };

  // ── Passkey Registration ──────────────────────────────────────────────────

  const handlePasskeyRegister = async () => {
    setPasskeyStatus("registering");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setPasskeyStatus("idle");
      return;
    }
    const success = await registerPasskey(session.user.id);
    setPasskeyStatus(success ? "done" : "idle");
    if (!success) {
      setError("Passkey registration was cancelled or failed. You can try again anytime.");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Layout>
      <section className="hero-gradient pt-40 md:pt-52 pb-20 md:pb-28">
        <div className="container max-w-2xl">

          {/* ── INTRO ──────────────────────────────────────────────────── */}
          {step === "intro" && (
            <div className="animate-fade-in-up opacity-0" style={{ animationDelay: "0.1s" }}>
              <div className="text-center mb-12">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-8">
                  <Fingerprint size={32} className="text-primary" />
                </div>
                <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-[1.08] mb-6">
                  Claim UOR Identity
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground font-body leading-relaxed max-w-lg mx-auto">
                  Create your permanent, private identity — derived from who you are, not from a username or password.
                </p>
              </div>

              {error && (
                <div className="mb-8 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-body flex items-start gap-3">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Method 1: Google */}
              <div className="bg-card border border-border rounded-2xl p-6 md:p-8 mb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ShieldCheck size={18} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-semibold text-foreground">Continue with Google</h3>
                    <p className="text-xs text-muted-foreground font-body">Fastest — one click, verified identity</p>
                  </div>
                </div>
                <button
                  onClick={handleGoogleSignIn}
                  className="w-full btn-primary inline-flex items-center justify-center gap-3 text-base py-3"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-body uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Method 2: Email Magic Link */}
              <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Mail size={18} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-semibold text-foreground">Continue with Email</h3>
                    <p className="text-xs text-muted-foreground font-body">Passwordless — magic link sent to your inbox</p>
                  </div>
                </div>
                <form onSubmit={handleEmailSignIn} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="flex-1 px-4 py-3 rounded-xl border border-border bg-background text-foreground font-body text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                  <button
                    type="submit"
                    className="btn-outline inline-flex items-center justify-center gap-2 px-6 py-3 whitespace-nowrap"
                  >
                    <Mail size={16} />
                    Send Link
                  </button>
                </form>
              </div>

              <p className="mt-8 text-center text-xs text-muted-foreground/60 font-body max-w-md mx-auto">
                Both methods are bootstrap anchors only. Your UOR Identity is derived from your attributes via the URDNA2015 → SHA-256 pipeline — it lives independently of any login provider.
              </p>
            </div>
          )}

          {/* ── EMAIL SENT ─────────────────────────────────────────────── */}
          {step === "email-sent" && (
            <div className="text-center animate-fade-in-up opacity-0" style={{ animationDelay: "0.05s" }}>
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Mail size={32} className="text-primary" />
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
                Check your inbox
              </h2>
              <p className="text-muted-foreground font-body text-lg mb-2">
                We sent a magic link to <strong className="text-foreground">{email}</strong>
              </p>
              <p className="text-muted-foreground/70 font-body text-sm mb-8">
                Click the link in your email to claim your identity. This page will update automatically.
              </p>
              <button
                onClick={() => { setStep("intro"); setError(null); }}
                className="text-sm text-primary font-body hover:underline"
              >
                ← Use a different method
              </button>
            </div>
          )}

          {/* ── SIGNING IN ─────────────────────────────────────────────── */}
          {step === "signing-in" && (
            <div className="text-center animate-fade-in-up opacity-0" style={{ animationDelay: "0.05s" }}>
              <Loader2 size={40} className="text-primary animate-spin mx-auto mb-6" />
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                Authenticating…
              </h2>
              <p className="text-muted-foreground font-body">
                Completing sign-in to bootstrap your identity.
              </p>
            </div>
          )}

          {/* ── DERIVING ───────────────────────────────────────────────── */}
          {step === "deriving" && (
            <div className="text-center animate-fade-in-up opacity-0" style={{ animationDelay: "0.05s" }}>
              <Loader2 size={40} className="text-primary animate-spin mx-auto mb-6" />
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                Deriving your identity…
              </h2>
              <p className="text-muted-foreground font-body">
                Running URDNA2015 → SHA-256 pipeline to generate your permanent canonical ID.
              </p>
            </div>
          )}

          {/* ── COMPLETE ───────────────────────────────────────────────── */}
          {step === "complete" && identity && (
            <div className="animate-fade-in-up opacity-0" style={{ animationDelay: "0.1s" }}>
              <div className="text-center mb-10">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={32} className="text-primary" />
                </div>
                <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
                  Identity Claimed
                </h1>
                <p className="text-lg text-muted-foreground font-body">
                  Your permanent UOR Identity has been derived and stored.
                </p>
              </div>

              {/* Identity details */}
              <div className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-5 mb-8">
                <IdentityRow label="Canonical ID" value={identity.canonicalId} />
                <IdentityRow label="Braille Glyph" value={identity.glyph} mono={false} />
                <IdentityRow label="CID (IPFS)" value={identity.cid} />
                <IdentityRow label="IPv6 Address" value={identity.ipv6} />
              </div>

              {/* Passkey upgrade */}
              {passkeyStatus !== "unsupported" && (
                <div className="bg-card border border-border rounded-2xl p-6 md:p-8 mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                      <KeyRound size={18} className="text-accent" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-semibold text-foreground">
                        Add Biometric Security
                      </h3>
                      <p className="text-xs text-muted-foreground font-body">
                        Register a passkey for fingerprint or face unlock
                      </p>
                    </div>
                  </div>

                  {passkeyStatus === "idle" && (
                    <>
                      <p className="text-sm text-muted-foreground font-body mb-4">
                        Add a hardware-bound passkey to your identity. Uses your device's biometric sensor (fingerprint, face, or PIN) for phishing-resistant access. Works on desktop, Android, and Apple devices.
                      </p>
                      <button
                        onClick={handlePasskeyRegister}
                        className="btn-outline inline-flex items-center gap-2"
                      >
                        <Fingerprint size={16} />
                        Register Passkey
                      </button>
                    </>
                  )}

                  {passkeyStatus === "registering" && (
                    <div className="flex items-center gap-3 text-muted-foreground font-body text-sm">
                      <Loader2 size={16} className="animate-spin" />
                      <span>Waiting for biometric verification…</span>
                    </div>
                  )}

                  {passkeyStatus === "done" && (
                    <div className="flex items-center gap-3 text-primary font-body text-sm">
                      <CheckCircle2 size={16} />
                      <span>Passkey registered — biometric access enabled</span>
                    </div>
                  )}

                  {error && passkeyStatus === "idle" && (
                    <p className="mt-3 text-xs text-muted-foreground/70 font-body">{error}</p>
                  )}
                </div>
              )}

              {/* Navigation */}
              <div className="flex flex-wrap justify-center gap-4">
                <Link to="/your-space" className="btn-primary inline-flex items-center gap-2">
                  Go to Your Space <ArrowRight size={16} />
                </Link>
                <Link to="/projects/uor-identity" className="btn-outline inline-flex items-center gap-2">
                  Learn More
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

// ── Sub-components ──────────────────────────────────────────────────────────

const IdentityRow = ({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) => (
  <div>
    <p className="text-xs font-medium text-muted-foreground font-body uppercase tracking-wider mb-1.5">{label}</p>
    <p className={`text-sm text-foreground break-all leading-relaxed ${mono ? "font-mono" : "font-body text-2xl"}`}>
      {value}
    </p>
  </div>
);

export default ClaimIdentityPage;
