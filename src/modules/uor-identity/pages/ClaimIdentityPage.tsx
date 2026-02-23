/**
 * Claim UOR Identity — Bootstrap Flow
 *
 * Users authenticate via Google OAuth (bootstrap anchor), then the system
 * derives their UOR canonical identity from their attributes using the
 * URDNA2015 → SHA-256 pipeline. The identity is stored in their profile.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/modules/core/components/Layout";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { singleProofHash } from "@/lib/uor-canonical";
import { ShieldCheck, Fingerprint, Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

type ClaimStep = "intro" | "signing-in" | "deriving" | "complete";

interface DerivedIdentity {
  canonicalId: string;
  glyph: string;
  cid: string;
  ipv6: string;
}

const ClaimIdentityPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<ClaimStep>("intro");
  const [identity, setIdentity] = useState<DerivedIdentity | null>(null);
  const [error, setError] = useState<string | null>(null);

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
  }, []);

  // Listen for auth state changes (OAuth redirect return)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user && step === "signing-in") {
          await deriveIdentity(session.user);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [step]);

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

  const deriveIdentity = async (user: { id: string; email?: string; user_metadata?: Record<string, unknown> }) => {
    setStep("deriving");

    try {
      // Build the identity seed object from user attributes
      const identitySeed = {
        "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
        "@type": "uor:Identity",
        "uor:userId": user.id,
        "uor:email": user.email,
        "uor:displayName": user.user_metadata?.full_name || user.user_metadata?.name || user.email,
        "uor:bootstrapMethod": "google-oauth",
        "uor:claimedAt": new Date().toISOString(),
      };

      // Derive canonical identity via URDNA2015 → SHA-256
      const proof = await singleProofHash(identitySeed);

      const derived: DerivedIdentity = {
        canonicalId: proof.derivationId,
        glyph: proof.uorAddress["u:glyph"],
        cid: proof.cid,
        ipv6: proof.ipv6Address["u:ipv6"],
      };

      // Persist to profile
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
  };

  return (
    <Layout>
      <section className="hero-gradient pt-40 md:pt-52 pb-20 md:pb-28">
        <div className="container max-w-2xl">
          {/* Intro */}
          {step === "intro" && (
            <div className="text-center animate-fade-in-up opacity-0" style={{ animationDelay: "0.1s" }}>
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-8">
                <Fingerprint size={32} className="text-primary" />
              </div>
              <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-[1.08] mb-6">
                Claim UOR Identity
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground font-body leading-relaxed mb-4 max-w-lg mx-auto">
                Create your permanent, private identity — derived from who you are, not from a username or password.
              </p>
              <p className="text-base text-muted-foreground/80 font-body leading-relaxed mb-10 max-w-lg mx-auto">
                Sign in with Google to bootstrap your identity. Once claimed, your UOR Identity stands on its own — 
                mathematically derived, universally verifiable, and entirely yours.
              </p>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-body">
                  {error}
                </div>
              )}

              <button
                onClick={handleGoogleSignIn}
                className="btn-primary inline-flex items-center gap-3 text-base px-8 py-3.5"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <p className="mt-6 text-xs text-muted-foreground/60 font-body">
                Google is used only as a bootstrap anchor. Your identity is derived from your attributes — not stored by Google.
              </p>
            </div>
          )}

          {/* Signing in */}
          {step === "signing-in" && (
            <div className="text-center animate-fade-in-up opacity-0" style={{ animationDelay: "0.05s" }}>
              <Loader2 size={40} className="text-primary animate-spin mx-auto mb-6" />
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                Authenticating…
              </h2>
              <p className="text-muted-foreground font-body">
                Completing Google sign-in to bootstrap your identity.
              </p>
            </div>
          )}

          {/* Deriving identity */}
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

          {/* Complete */}
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

              <div className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-5">
                <IdentityRow label="Canonical ID" value={identity.canonicalId} />
                <IdentityRow label="Braille Glyph" value={identity.glyph} mono={false} />
                <IdentityRow label="CID (IPFS)" value={identity.cid} />
                <IdentityRow label="IPv6 Address" value={identity.ipv6} />
              </div>

              <div className="mt-10 flex flex-wrap justify-center gap-4">
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

const IdentityRow = ({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) => (
  <div>
    <p className="text-xs font-medium text-muted-foreground font-body uppercase tracking-wider mb-1.5">{label}</p>
    <p className={`text-sm text-foreground break-all leading-relaxed ${mono ? "font-mono" : "font-body text-2xl"}`}>
      {value}
    </p>
  </div>
);

export default ClaimIdentityPage;
