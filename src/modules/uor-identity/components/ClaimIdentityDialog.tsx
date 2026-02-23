/**
 * Claim UOR Identity — Dialog version
 *
 * Clean, jargon-free UI for claiming a digital identity.
 * Two sign-in methods: Google or Email magic link.
 * After claiming, users can add biometric security (passkey).
 */

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/modules/core/ui/dialog";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { singleProofHash } from "@/lib/uor-canonical";
import {
  Fingerprint, Loader2, CheckCircle2, ArrowRight,
  Mail, KeyRound, AlertCircle, X,
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

interface ClaimIdentityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
          { alg: -7, type: "public-key" },
          { alg: -257, type: "public-key" },
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

// ── Sub-component ───────────────────────────────────────────────────────────

const IdentityRow = ({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) => (
  <div>
    <p className="text-xs font-semibold text-muted-foreground font-body uppercase tracking-wider mb-1.5">{label}</p>
    <p className={`text-base text-foreground break-all leading-relaxed ${mono ? "font-mono" : "font-body text-2xl"}`}>
      {value}
    </p>
  </div>
);

// ── Main Dialog ─────────────────────────────────────────────────────────────

const ClaimIdentityDialog = ({ open, onOpenChange }: ClaimIdentityDialogProps) => {
  const [step, setStep] = useState<ClaimStep>("intro");
  const [identity, setIdentity] = useState<DerivedIdentity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [passkeyStatus, setPasskeyStatus] = useState<"idle" | "registering" | "done" | "unsupported">("idle");

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (!isWebAuthnSupported()) setPasskeyStatus("unsupported");

    (async () => {
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
    })();
  }, [open]);

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
      setError("Something went wrong. Please try again.");
      setStep("intro");
    }
  }, []);

  const handleGoogleSignIn = async () => {
    setStep("signing-in");
    setError(null);
    const { error: authError } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/claim-identity",
    });
    if (authError) {
      setError(authError.message || "Sign-in failed. Please try again.");
      setStep("intro");
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin + "/claim-identity" },
    });
    if (authError) {
      setError(authError.message || "Could not send the link. Please try again.");
      return;
    }
    setStep("email-sent");
  };

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
      setError("Biometric setup was cancelled. You can try again anytime.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[92vh] overflow-y-auto p-0 gap-0 border-border bg-card rounded-2xl [&>button]:hidden">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 md:px-8 pt-6 pb-4 bg-card border-b border-border/40">
          <DialogTitle className="font-display text-xl md:text-2xl font-bold text-foreground">
            {step === "complete" ? "Your Identity Is Claimed!" : "Claim Your Digital Identity"}
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 md:px-8 py-6 md:py-8">

          {/* ── INTRO ──────────────────────────────────────────────── */}
          {step === "intro" && (
            <div className="space-y-6">
              {/* Hero */}
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <Fingerprint size={32} className="text-primary" />
                </div>
                <p className="text-base md:text-lg text-muted-foreground font-body leading-relaxed max-w-sm mx-auto">
                  Your identity already exists. Verify yourself to claim it.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-body flex items-start gap-3">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Google sign-in */}
              <div className="bg-background border border-border rounded-2xl p-5 md:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-5 h-5">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-display text-base md:text-lg font-semibold text-foreground">Verify with Google</h3>
                    <p className="text-sm text-muted-foreground font-body">One click — your identity stays independent</p>
                  </div>
                </div>
                <button
                  onClick={handleGoogleSignIn}
                  className="w-full btn-primary inline-flex items-center justify-center gap-3 text-base py-3.5 rounded-xl"
                >
                  Continue with Google
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-sm text-muted-foreground font-body font-medium">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Email sign-in */}
              <div className="bg-background border border-border rounded-2xl p-5 md:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Mail size={20} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-base md:text-lg font-semibold text-foreground">Verify with Email</h3>
                    <p className="text-sm text-muted-foreground font-body">Used once to confirm — never stored or shared</p>
                  </div>
                </div>
                <form onSubmit={handleEmailSignIn} className="space-y-3">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3.5 rounded-xl border border-border bg-card text-foreground font-body text-base placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                  <button
                    type="submit"
                    className="w-full btn-outline inline-flex items-center justify-center gap-2.5 py-3.5 text-base rounded-xl font-medium"
                  >
                    <Mail size={18} />
                    Send verification link
                  </button>
                </form>
              </div>

              <p className="text-center text-xs text-muted-foreground/60 font-body leading-relaxed">
                Private. Owned by you. Transferable. No one else can access or control it.
              </p>
            </div>
          )}

          {/* ── EMAIL SENT ─────────────────────────────────────────── */}
          {step === "email-sent" && (
            <div className="text-center space-y-5 py-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Mail size={32} className="text-primary" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                  Check your email
                </h2>
                <p className="text-base text-muted-foreground font-body leading-relaxed">
                  We sent a sign-in link to<br />
                  <strong className="text-foreground">{email}</strong>
                </p>
              </div>
              <p className="text-sm text-muted-foreground/70 font-body leading-relaxed">
                Click the link in your email to continue. This window will update automatically once you do.
              </p>
              <button
                onClick={() => { setStep("intro"); setError(null); }}
                className="text-sm text-primary font-body font-medium hover:underline"
              >
                ← Go back
              </button>
            </div>
          )}

          {/* ── SIGNING IN ─────────────────────────────────────────── */}
          {step === "signing-in" && (
            <div className="text-center py-12 space-y-4">
              <Loader2 size={40} className="text-primary animate-spin mx-auto" />
              <h2 className="font-display text-2xl font-bold text-foreground">Signing you in…</h2>
              <p className="text-base text-muted-foreground font-body">This will only take a moment.</p>
            </div>
          )}

          {/* ── DERIVING ───────────────────────────────────────────── */}
          {step === "deriving" && (
            <div className="text-center py-12 space-y-4">
              <Loader2 size={40} className="text-primary animate-spin mx-auto" />
              <h2 className="font-display text-2xl font-bold text-foreground">Creating your identity…</h2>
              <p className="text-base text-muted-foreground font-body">
                We're generating a unique digital fingerprint just for you.
              </p>
            </div>
          )}

          {/* ── COMPLETE ───────────────────────────────────────────── */}
          {step === "complete" && identity && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={32} className="text-primary" />
                </div>
                <p className="text-base md:text-lg text-muted-foreground font-body leading-relaxed">
                  This identity is yours. Private, transferable, and fully under your control.
                </p>
              </div>

              {/* Identity details */}
              <div className="bg-background border border-border rounded-2xl p-5 md:p-6 space-y-5">
                <IdentityRow label="Your Unique ID" value={identity.canonicalId} />
                <IdentityRow label="Visual Symbol" value={identity.glyph} mono={false} />
                <IdentityRow label="Content Address" value={identity.cid} />
                <IdentityRow label="Network Address" value={identity.ipv6} />
              </div>

              {/* Passkey upgrade */}
              {passkeyStatus !== "unsupported" && (
                <div className="bg-background border border-border rounded-2xl p-5 md:p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                      <KeyRound size={20} className="text-accent" />
                    </div>
                    <div>
                      <h3 className="font-display text-base md:text-lg font-semibold text-foreground">
                        Add Biometric Login
                      </h3>
                      <p className="text-sm text-muted-foreground font-body">
                        Use fingerprint or face recognition
                      </p>
                    </div>
                  </div>

                  {passkeyStatus === "idle" && (
                    <>
                      <p className="text-sm text-muted-foreground font-body mb-4 leading-relaxed">
                        Unlock your identity with your fingerprint, face, or device PIN. Works on phones, tablets, and computers.
                      </p>
                      <button
                        onClick={handlePasskeyRegister}
                        className="btn-outline inline-flex items-center gap-2.5 text-base py-3 px-5 rounded-xl"
                      >
                        <Fingerprint size={18} />
                        Set up biometrics
                      </button>
                    </>
                  )}

                  {passkeyStatus === "registering" && (
                    <div className="flex items-center gap-3 text-muted-foreground font-body text-sm">
                      <Loader2 size={18} className="animate-spin" />
                      <span>Waiting for your device…</span>
                    </div>
                  )}

                  {passkeyStatus === "done" && (
                    <div className="flex items-center gap-3 text-primary font-body text-base font-medium">
                      <CheckCircle2 size={18} />
                      <span>Biometric login enabled ✓</span>
                    </div>
                  )}

                  {error && passkeyStatus === "idle" && (
                    <p className="mt-3 text-sm text-muted-foreground/70 font-body">{error}</p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to="/your-space"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 btn-primary inline-flex items-center justify-center gap-2.5 text-base py-3.5 rounded-xl"
                >
                  Go to Your Space <ArrowRight size={18} />
                </Link>
                <button
                  onClick={() => onOpenChange(false)}
                  className="flex-1 btn-outline inline-flex items-center justify-center gap-2 text-base py-3.5 rounded-xl"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClaimIdentityDialog;
