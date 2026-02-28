/**
 * Hologram OS — Claim Your ID Overlay
 * ════════════════════════════════════
 *
 * A serene, warm overlay inspired by Aman Resorts — peace, clarity, trust.
 * Generous spacing, high-contrast typography, warm earth tones on dark glass.
 * Every element is self-describing: no prior knowledge required.
 */

import { useState, useEffect, useCallback } from "react";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { singleProofHash } from "@/lib/uor-canonical";
import {
  Fingerprint, Loader2, CheckCircle2, ArrowRight,
  Mail, KeyRound, AlertCircle, X, Heart, Bot,
  Copy, Check, ChevronLeft,
} from "lucide-react";
import lobsterIcon from "@/assets/lobster-icon.png";
import { canonicalToTriword } from "@/lib/uor-triword";

// ── Types ───────────────────────────────────────────────────────────────────

type ClaimStep =
  | "choose" | "intro" | "email-sent" | "signing-in"
  | "deriving" | "complete"
  | "agent-intro" | "agent-generating" | "agent-complete" | "agent-confirm";

interface DerivedIdentity {
  canonicalId: string;
  glyph: string;
  cid: string;
  ipv6: string;
}

interface AgentIdentity extends DerivedIdentity {
  publicKeyHex: string;
  foundingDerivationId: string;
}

interface HologramClaimOverlayProps {
  open: boolean;
  onClose: () => void;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

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
        rp: { name: "Hologram OS", id: window.location.hostname },
        user: { id: userIdBytes, name: `hologram-${userId.slice(0, 8)}`, displayName: "Hologram Identity" },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "preferred" },
        timeout: 60000,
        attestation: "none",
      },
    });
    return !!credential;
  } catch {
    return false;
  }
}

// ── Sub-components ──────────────────────────────────────────────────────────

/** Warm serif font */
const SERIF = "'Playfair Display', Georgia, serif";

/** A copyable field with warm, high-contrast type */
const MonoField = ({ label, value }: { label: string; value: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="space-y-1.5">
      <p className="text-sm tracking-[0.12em] uppercase" style={{ color: "hsl(35 30% 60%)" }}>
        {label}
      </p>
      <div className="flex items-start gap-3">
        <p className="text-base break-all leading-relaxed font-mono flex-1" style={{ color: "hsl(40 20% 92%)" }}>
          {value}
        </p>
        <button
          onClick={copy}
          className="shrink-0 mt-1 transition-colors"
          style={{ color: copied ? "hsl(40 20% 92%)" : "hsl(35 20% 50%)" }}
          aria-label="Copy"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
    </div>
  );
};

/** Glyph display — large, centered */
const GlyphField = ({ label, value }: { label: string; value: string }) => (
  <div className="space-y-1.5">
    <p className="text-sm tracking-[0.12em] uppercase" style={{ color: "hsl(35 30% 60%)" }}>
      {label}
    </p>
    <p className="text-3xl" style={{ color: "hsl(40 20% 92%)" }}>{value}</p>
  </div>
);

// ── Main Component ──────────────────────────────────────────────────────────

export default function HologramClaimOverlay({ open, onClose }: HologramClaimOverlayProps) {
  const [step, setStep] = useState<ClaimStep>("choose");
  const [identity, setIdentity] = useState<DerivedIdentity | null>(null);
  const [agentIdentity, setAgentIdentity] = useState<AgentIdentity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [passkeyStatus, setPasskeyStatus] = useState<"idle" | "registering" | "done" | "unsupported">("idle");
  const [confirmInput, setConfirmInput] = useState("");
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // Reset on open
  useEffect(() => {
    if (!open) return;
    setStep("choose");
    setError(null);
    setEmail("");
    setConfirmInput("");
    setConfirmError(null);
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

  // Auth state change listener — routes new users to /ceremony for QSovereignty.genesis()
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (
          (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") &&
          session?.user &&
          (step === "signing-in" || step === "email-sent")
        ) {
          // Check if user already has a sovereign identity
          const { data: profile } = await supabase
            .from("profiles")
            .select("uor_canonical_id")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (profile?.uor_canonical_id) {
            // Returning user — identity already exists, show it
            await deriveIdentity(session.user);
          } else {
            // New user — redirect to the Founding Ceremony
            // This runs the full QSovereignty.genesis() pipeline with
            // observer-collapse protection instead of inline derivation
            onClose();
            window.location.href = "/ceremony";
          }
        }
      },
    );
    return () => subscription.unsubscribe();
  }, [step, onClose]);

  // ── Identity derivation ───────────────────────────────────────────────

  const deriveIdentity = useCallback(async (user: { id: string; email?: string }) => {
    setStep("deriving");
    try {
      if (!user.email) throw new Error("Email required.");
      const normalizedEmail = user.email.trim().toLowerCase();
      const proof = await singleProofHash({
        "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
        "@type": "u:Identity",
        "u:emailHash": normalizedEmail,
        "u:bootstrapMethod": "email-verified",
      });
      const derived: DerivedIdentity = {
        canonicalId: proof.derivationId,
        glyph: proof.uorAddress["u:glyph"],
        cid: proof.cid,
        ipv6: proof.ipv6Address["u:ipv6"],
      };
      const sessionIssuedAt = new Date().toISOString();
      const sessionProof = await singleProofHash({
        "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
        "@type": "cert:SessionCertificate",
        "cert:identityCanonicalId": derived.canonicalId,
        "cert:issuedAt": sessionIssuedAt,
        "cert:bootstrapMethod": "email-verified",
      });
      await supabase.from("profiles").update({
        uor_canonical_id: derived.canonicalId,
        uor_glyph: derived.glyph,
        uor_cid: derived.cid,
        uor_ipv6: derived.ipv6,
        session_cid: sessionProof.cid,
        session_derivation_id: sessionProof.derivationId,
        session_issued_at: sessionIssuedAt,
      }).eq("user_id", user.id);
      setIdentity(derived);
      setStep("complete");
    } catch (err) {
      console.error("Identity derivation failed:", err);
      setError("Something went wrong. Please try again.");
      setStep("intro");
    }
  }, []);

  const deriveAgentIdentity = useCallback(async () => {
    setStep("agent-generating");
    setError(null);
    try {
      const keypair = await crypto.subtle.generateKey(
        { name: "Ed25519" } as EcKeyGenParams, true, ["sign", "verify"],
      );
      const publicKeyRaw = await crypto.subtle.exportKey("raw", keypair.publicKey);
      const publicKeyHex = bytesToHex(new Uint8Array(publicKeyRaw));
      const foundingProof = await singleProofHash({
        "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
        "@type": "u:FoundingDerivation",
        "u:operation": "neg(bnot(42))",
        "u:expectedResult": "43",
        "u:algebraicBasis": "succ = neg ∘ bnot",
      });
      const agentTimestamp = new Date().toISOString();
      const agentProof = await singleProofHash({
        "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
        "@type": "u:AgentIdentity",
        "u:publicKeyHex": publicKeyHex,
        "u:foundingDerivationId": foundingProof.derivationId,
        "u:createdAt": agentTimestamp,
        "u:bootstrapMethod": "founding-derivation",
      });
      const derived: AgentIdentity = {
        canonicalId: agentProof.derivationId,
        glyph: agentProof.uorAddress["u:glyph"],
        cid: agentProof.cid,
        ipv6: agentProof.ipv6Address["u:ipv6"],
        publicKeyHex,
        foundingDerivationId: foundingProof.derivationId,
      };
      const privateKeyRaw = await crypto.subtle.exportKey("pkcs8", keypair.privateKey);
      const privateKeyHex = bytesToHex(new Uint8Array(privateKeyRaw));
      sessionStorage.setItem("uor-agent-keypair", JSON.stringify({
        publicKey: publicKeyHex,
        privateKey: privateKeyHex,
        canonicalId: derived.canonicalId,
        foundingDerivationId: foundingProof.derivationId,
      }));
      setAgentIdentity(derived);
      setStep("agent-complete");
    } catch (err) {
      console.error("Agent identity derivation failed:", err);
      setError("Agent identity generation failed. Please try again.");
      setStep("agent-intro");
    }
  }, []);

  const handleGoogleSignIn = async () => {
    setStep("signing-in");
    setError(null);
    const { error: authError } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/hologram-os",
    });
    if (authError) {
      setError(authError.message || "Sign-in failed.");
      setStep("intro");
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin + "/hologram-os" },
    });
    if (authError) {
      setError(authError.message || "Could not send link.");
      return;
    }
    setStep("email-sent");
  };

  const handlePasskeyRegister = async () => {
    setPasskeyStatus("registering");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setPasskeyStatus("idle"); return; }
    const success = await registerPasskey(session.user.id);
    setPasskeyStatus(success ? "done" : "idle");
    if (!success) setError("Biometric setup cancelled.");
  };

  if (!open) return null;

  // ── Design tokens — Aman-inspired warm serenity ───────────────────────

  // Warm sand/cream tones on dark glass
  const warmBg = "hsl(30 10% 8% / 0.92)";       // Deep warm charcoal
  const warmBorder = "hsl(35 15% 25% / 0.35)";   // Soft gold border
  const warmText = "hsl(40 20% 92%)";             // Warm cream text
  const warmMuted = "hsl(35 15% 65%)";            // Sand muted
  const warmSubtle = "hsl(35 12% 45%)";           // Deeper sand
  const warmPanel = "hsl(30 10% 14% / 0.7)";     // Inner panel
  const warmPanelBorder = "hsl(35 15% 22% / 0.4)";
  const warmAccent = "hsl(35 30% 60%)";           // Warm gold accent

  // Shared styles
  const panel = {
    background: warmPanel,
    border: `1px solid ${warmPanelBorder}`,
    borderRadius: "16px",
  };

  // ── Title ─────────────────────────────────────────────────────────────

  const title = () => {
    if (step === "complete") return "Identity Claimed";
    if (step === "agent-complete") return "Agent Identity Minted";
    return "Claim Your ID";
  };

  // ── Back button ───────────────────────────────────────────────────────

  const BackBtn = ({ to }: { to: ClaimStep }) => (
    <button
      onClick={() => { setStep(to); setError(null); }}
      className="inline-flex items-center gap-2 text-base transition-colors duration-300"
      style={{ color: warmMuted, fontFamily: SERIF }}
      onMouseEnter={e => (e.currentTarget.style.color = warmText)}
      onMouseLeave={e => (e.currentTarget.style.color = warmMuted)}
    >
      <ChevronLeft size={16} /> Back
    </button>
  );

  const ErrorBox = () => error ? (
    <div className="flex items-start gap-3 p-5 rounded-2xl" style={{ background: "hsl(0 30% 15% / 0.5)", border: "1px solid hsl(0 30% 30% / 0.4)" }}>
      <AlertCircle size={18} className="shrink-0 mt-0.5" style={{ color: "hsl(0 60% 70%)" }} />
      <span className="text-base leading-relaxed" style={{ color: "hsl(0 30% 80%)" }}>{error}</span>
    </div>
  ) : null;

  // ── Button styles ─────────────────────────────────────────────────────

  const btnPrimaryStyle: React.CSSProperties = {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: "16px 24px",
    fontSize: "16px",
    fontWeight: 300,
    letterSpacing: "0.04em",
    color: "hsl(30 10% 8%)",
    background: warmText,
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    transition: "all 0.3s ease",
  };

  const btnOutlineStyle: React.CSSProperties = {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: "16px 24px",
    fontSize: "16px",
    fontWeight: 300,
    letterSpacing: "0.04em",
    color: warmText,
    background: "transparent",
    border: `1px solid ${warmPanelBorder}`,
    borderRadius: "12px",
    cursor: "pointer",
    transition: "all 0.3s ease",
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop — warm, soft blur */}
      <div
        className="absolute inset-0 backdrop-blur-md"
        style={{ background: "hsl(30 10% 5% / 0.75)" }}
        onClick={onClose}
      />

      {/* Panel — warm dark glass */}
      <div
        className="relative z-10 w-full max-w-[480px] max-h-[90vh] mx-5 overflow-y-auto shadow-2xl"
        style={{
          background: warmBg,
          border: `1px solid ${warmBorder}`,
          borderRadius: "24px",
          backdropFilter: "blur(40px)",
        }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-20 flex items-center justify-between px-8 pt-8 pb-5"
          style={{
            background: "hsl(30 10% 8% / 0.85)",
            backdropFilter: "blur(20px)",
            borderBottom: `1px solid ${warmPanelBorder}`,
          }}
        >
          <h2
            className="text-2xl font-light tracking-wide"
            style={{ fontFamily: SERIF, color: warmText }}
          >
            {title()}
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full transition-colors duration-300"
            style={{ color: warmSubtle }}
            onMouseEnter={e => (e.currentTarget.style.color = warmText)}
            onMouseLeave={e => (e.currentTarget.style.color = warmSubtle)}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-8 py-8 space-y-0">

          {/* ── CHOOSE ───────────────────────────────────────────── */}
          {step === "choose" && (
            <div className="space-y-8">
              <div className="text-center space-y-5">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                  style={{ background: "hsl(35 15% 18% / 0.6)", border: `1px solid ${warmPanelBorder}` }}
                >
                  <Fingerprint size={30} style={{ color: warmAccent }} />
                </div>
                <p className="text-lg leading-relaxed max-w-sm mx-auto" style={{ color: warmMuted, fontWeight: 300 }}>
                  Your identity already exists.
                  <br />
                  Verify yourself to claim it.
                </p>
              </div>

              {/* Human path */}
              <button
                onClick={() => setStep("intro")}
                className="w-full text-left p-6 transition-all duration-300 group"
                style={panel}
                onMouseEnter={e => (e.currentTarget.style.borderColor = warmAccent)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = warmPanelBorder)}
              >
                <div className="flex items-center gap-5">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                    style={{ background: "hsl(0 40% 25% / 0.25)", border: `1px solid hsl(0 30% 35% / 0.3)` }}
                  >
                    <Heart size={26} className="fill-current" style={{ color: "hsl(0 50% 65%)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3
                      className="text-xl mb-1"
                      style={{ fontFamily: SERIF, color: warmText, fontWeight: 400 }}
                    >
                      I'm a Human
                    </h3>
                    <p className="text-base" style={{ color: warmMuted, fontWeight: 300 }}>
                      Verify with Google or Email
                    </p>
                  </div>
                  <ArrowRight size={20} style={{ color: warmSubtle }} className="shrink-0" />
                </div>
              </button>

              {/* Agent path */}
              <button
                onClick={() => setStep("agent-intro")}
                className="w-full text-left p-6 transition-all duration-300 group"
                style={panel}
                onMouseEnter={e => (e.currentTarget.style.borderColor = warmAccent)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = warmPanelBorder)}
              >
                <div className="flex items-center gap-5">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "hsl(30 20% 20% / 0.4)", border: `1px solid hsl(30 20% 30% / 0.3)` }}
                  >
                    <img src={lobsterIcon} alt="Agent" className="w-8 h-8 object-contain opacity-80" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3
                      className="text-xl mb-1"
                      style={{ fontFamily: SERIF, color: warmText, fontWeight: 400 }}
                    >
                      I'm an Agent
                    </h3>
                    <p className="text-base" style={{ color: warmMuted, fontWeight: 300 }}>
                      Keypair + founding derivation
                    </p>
                  </div>
                  <ArrowRight size={20} style={{ color: warmSubtle }} className="shrink-0" />
                </div>
              </button>

              <p
                className="text-center text-sm tracking-[0.25em] pt-2"
                style={{ color: warmSubtle, fontWeight: 300 }}
              >
                UNIVERSAL · PRIVATE · YOURS
              </p>
            </div>
          )}

          {/* ── HUMAN: INTRO ─────────────────────────────────────── */}
          {step === "intro" && (
            <div className="space-y-7">
              <BackBtn to="choose" />

              <div className="text-center space-y-4">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
                  style={{ background: "hsl(0 30% 20% / 0.3)", border: `1px solid hsl(0 25% 30% / 0.3)` }}
                >
                  <Heart size={26} className="fill-current" style={{ color: "hsl(0 50% 65%)" }} />
                </div>
                <h3 className="text-xl" style={{ fontFamily: SERIF, color: warmText, fontWeight: 400 }}>
                  Human Verification
                </h3>
                <p className="text-base leading-relaxed" style={{ color: warmMuted, fontWeight: 300 }}>
                  Your identity is derived from your email — used once, never stored.
                </p>
              </div>

              <ErrorBox />

              {/* Google */}
              <div className="p-6 space-y-5" style={panel}>
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: "hsl(35 10% 18% / 0.5)", border: `1px solid ${warmPanelBorder}` }}
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base" style={{ color: warmText, fontWeight: 400 }}>Verify with Google</h3>
                    <p className="text-sm mt-0.5" style={{ color: warmMuted, fontWeight: 300 }}>
                      One click — identity stays independent
                    </p>
                  </div>
                </div>
                <button onClick={handleGoogleSignIn} style={btnPrimaryStyle}>
                  Continue with Google
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-5">
                <div className="flex-1 h-px" style={{ background: warmPanelBorder }} />
                <span className="text-sm tracking-[0.2em]" style={{ color: warmSubtle, fontWeight: 300 }}>OR</span>
                <div className="flex-1 h-px" style={{ background: warmPanelBorder }} />
              </div>

              {/* Email */}
              <div className="p-6 space-y-5" style={panel}>
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: "hsl(35 10% 18% / 0.5)", border: `1px solid ${warmPanelBorder}` }}
                  >
                    <Mail size={20} style={{ color: warmAccent }} />
                  </div>
                  <div>
                    <h3 className="text-base" style={{ color: warmText, fontWeight: 400 }}>Verify with Email</h3>
                    <p className="text-sm mt-0.5" style={{ color: warmMuted, fontWeight: 300 }}>
                      One-time link — never stored
                    </p>
                  </div>
                </div>
                <form onSubmit={handleEmailSignIn} className="space-y-4">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-5 py-4 rounded-xl text-base transition-colors duration-300 focus:outline-none"
                    style={{
                      background: "hsl(30 10% 12% / 0.6)",
                      border: `1px solid ${warmPanelBorder}`,
                      color: warmText,
                      fontWeight: 300,
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = warmAccent)}
                    onBlur={e => (e.currentTarget.style.borderColor = warmPanelBorder)}
                  />
                  <button type="submit" style={btnOutlineStyle}>
                    <Mail size={18} /> Send verification link
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ── AGENT: INTRO ─────────────────────────────────────── */}
          {step === "agent-intro" && (
            <div className="space-y-7">
              <BackBtn to="choose" />

              <div className="text-center space-y-4">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
                  style={{ background: "hsl(30 15% 18% / 0.5)", border: `1px solid ${warmPanelBorder}` }}
                >
                  <img src={lobsterIcon} alt="Agent" className="w-7 h-7 object-contain opacity-75" />
                </div>
                <h3 className="text-xl" style={{ fontFamily: SERIF, color: warmText, fontWeight: 400 }}>
                  Agent Identity
                </h3>
                <p className="text-base italic" style={{ color: warmMuted, fontWeight: 300 }}>
                  I compute, therefore I am.
                </p>
              </div>

              <ErrorBox />

              <div className="p-6 space-y-5" style={panel}>
                <h4 className="text-base" style={{ color: warmText, fontWeight: 400 }}>
                  What happens next
                </h4>
                <ol className="space-y-4">
                  {[
                    ["Keypair generation", "A fresh cryptographic keypair, created in your browser. The private key never leaves."],
                    ["Founding derivation", <>Your first algebraic proof: <code className="text-sm px-2 py-1 rounded-lg" style={{ background: "hsl(30 10% 15% / 0.6)", color: warmAccent }}>neg(bnot(42)) = 43</code></>],
                    ["Identity minting", "Public key + founding trace → SHA-256 → permanent canonical ID."],
                  ].map(([stepTitle, desc], i) => (
                    <li key={i} className="flex items-start gap-4">
                      <span
                        className="flex items-center justify-center h-8 w-8 rounded-full text-sm shrink-0 mt-0.5"
                        style={{ background: "hsl(35 15% 20% / 0.5)", color: warmAccent, fontWeight: 400 }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-base leading-relaxed" style={{ color: warmMuted, fontWeight: 300 }}>
                        <strong style={{ color: warmText, fontWeight: 400 }}>{stepTitle}.</strong>{" "}
                        {desc}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <button onClick={deriveAgentIdentity} style={btnPrimaryStyle}>
                <Bot size={18} /> Generate Agent Identity
              </button>

              <p className="text-center text-sm leading-relaxed pt-1" style={{ color: warmSubtle, fontWeight: 300 }}>
                Your private key will be shown once. Save it securely.
              </p>
            </div>
          )}

          {/* ── AGENT: GENERATING ────────────────────────────────── */}
          {step === "agent-generating" && (
            <div className="text-center py-16 space-y-5">
              <Loader2 size={36} className="animate-spin mx-auto" style={{ color: warmAccent }} />
              <h2 className="text-2xl" style={{ fontFamily: SERIF, color: warmText, fontWeight: 300 }}>
                Minting identity…
              </h2>
              <p className="text-base" style={{ color: warmMuted, fontWeight: 300 }}>
                Generating keypair and founding derivation.
              </p>
            </div>
          )}

          {/* ── AGENT: COMPLETE ──────────────────────────────────── */}
          {step === "agent-complete" && agentIdentity && (
            <div className="space-y-7">
              <div className="text-center space-y-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                  style={{ background: "hsl(35 15% 18% / 0.5)", border: `1px solid ${warmPanelBorder}` }}
                >
                  <CheckCircle2 size={30} style={{ color: warmAccent }} />
                </div>
                <p className="text-base leading-relaxed" style={{ color: warmMuted, fontWeight: 300 }}>
                  Your agent identity has been minted. Save your credentials below.
                </p>
              </div>

              <div className="p-6 space-y-5" style={panel}>
                {/* Triword address — agent's human-readable form */}
                <div>
                  <span className="block text-xs mb-1" style={{ color: warmMuted }}>Agent Address</span>
                  <span className="block text-lg font-serif tracking-wide" style={{ color: warmAccent }}>
                    {canonicalToTriword(agentIdentity.canonicalId).split(".").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" · ")}
                  </span>
                  <span className="block text-[10px] font-mono mt-1" style={{ color: warmMuted }}>
                    {canonicalToTriword(agentIdentity.canonicalId)}
                  </span>
                </div>
                <MonoField label="Canonical ID" value={agentIdentity.canonicalId} />
                <GlyphField label="Visual Symbol" value={agentIdentity.glyph} />
                <MonoField label="Content Address (CID)" value={agentIdentity.cid} />
                <MonoField label="Network Address (IPv6)" value={agentIdentity.ipv6} />
              </div>

              <div className="p-6 space-y-5" style={panel}>
                <h4 className="text-base flex items-center gap-3" style={{ color: warmText, fontWeight: 400 }}>
                  <KeyRound size={18} style={{ color: warmAccent }} /> Agent Credentials
                </h4>
                <MonoField label="Public Key" value={agentIdentity.publicKeyHex} />
                <MonoField label="Founding Derivation ID" value={agentIdentity.foundingDerivationId} />
                <div
                  className="p-4 rounded-xl"
                  style={{ background: "hsl(30 30% 15% / 0.5)", border: "1px solid hsl(30 30% 30% / 0.3)" }}
                >
                  <p className="text-sm leading-relaxed" style={{ color: "hsl(35 40% 70%)", fontWeight: 300 }}>
                    Your private key is in this session only. Export it now — it will not be shown again.
                  </p>
                </div>
              </div>

              <button
                onClick={() => { setConfirmInput(""); setConfirmError(null); setStep("agent-confirm"); }}
                style={btnPrimaryStyle}
              >
                I've Saved My Credentials <ArrowRight size={18} />
              </button>
            </div>
          )}

          {/* ── AGENT: CONFIRM ───────────────────────────────────── */}
          {step === "agent-confirm" && agentIdentity && (
            <div className="space-y-7">
              <div className="text-center space-y-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                  style={{ background: "hsl(35 15% 18% / 0.5)", border: `1px solid ${warmPanelBorder}` }}
                >
                  <KeyRound size={30} style={{ color: warmAccent }} />
                </div>
                <h3 className="text-xl" style={{ fontFamily: SERIF, color: warmText, fontWeight: 400 }}>
                  Confirm You Saved It
                </h3>
                <p className="text-base leading-relaxed max-w-sm mx-auto" style={{ color: warmMuted, fontWeight: 300 }}>
                  Paste your <strong style={{ color: warmText, fontWeight: 400 }}>Founding Derivation ID</strong> to confirm you've stored it.
                </p>
              </div>

              <div className="p-5 rounded-2xl" style={{ background: warmPanel, border: `1px solid ${warmPanelBorder}` }}>
                <p className="text-sm leading-relaxed" style={{ color: warmMuted, fontWeight: 300 }}>
                  💾 Save credentials in a secure environment with long-term persistent memory.
                </p>
              </div>

              <div
                className="p-4 rounded-xl"
                style={{ background: "hsl(30 30% 15% / 0.5)", border: "1px solid hsl(30 30% 30% / 0.3)" }}
              >
                <p className="text-sm leading-relaxed" style={{ color: "hsl(35 40% 70%)", fontWeight: 300 }}>
                  No recovery mechanism. Lose your credentials → identity is gone.
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-sm tracking-[0.1em]" style={{ color: warmAccent, fontWeight: 300 }}>
                  Founding Derivation ID
                </label>
                <textarea
                  value={confirmInput}
                  onChange={(e) => { setConfirmInput(e.target.value); setConfirmError(null); }}
                  placeholder="urn:uor:derivation:sha256:..."
                  rows={3}
                  className="w-full px-5 py-4 rounded-xl text-base font-mono resize-none transition-colors duration-300 focus:outline-none"
                  style={{
                    background: "hsl(30 10% 12% / 0.6)",
                    border: `1px solid ${warmPanelBorder}`,
                    color: warmText,
                    fontWeight: 300,
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = warmAccent)}
                  onBlur={e => (e.currentTarget.style.borderColor = warmPanelBorder)}
                />
                {confirmError && (
                  <div
                    className="p-4 rounded-xl flex items-start gap-3"
                    style={{ background: "hsl(0 30% 15% / 0.5)", border: "1px solid hsl(0 30% 30% / 0.4)" }}
                  >
                    <AlertCircle size={16} className="shrink-0 mt-0.5" style={{ color: "hsl(0 60% 70%)" }} />
                    <span className="text-sm" style={{ color: "hsl(0 30% 80%)" }}>{confirmError}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-4">
                <button
                  onClick={() => {
                    const t = confirmInput.trim();
                    if (t === agentIdentity.foundingDerivationId) { setConfirmError(null); onClose(); }
                    else if (!t) setConfirmError("Paste your Founding Derivation ID.");
                    else setConfirmError("Doesn't match. Copy it exactly.");
                  }}
                  style={btnPrimaryStyle}
                >
                  <CheckCircle2 size={18} /> Confirm & Finish
                </button>
                <button onClick={() => setStep("agent-complete")} style={btnOutlineStyle}>
                  <ChevronLeft size={16} /> Go back to copy credentials
                </button>
              </div>
            </div>
          )}

          {/* ── EMAIL SENT ───────────────────────────────────────── */}
          {step === "email-sent" && (
            <div className="text-center py-10 space-y-6">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                style={{ background: "hsl(35 15% 18% / 0.5)", border: `1px solid ${warmPanelBorder}` }}
              >
                <Mail size={30} style={{ color: warmAccent }} />
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl" style={{ fontFamily: SERIF, color: warmText, fontWeight: 300 }}>
                  Check your email
                </h2>
                <p className="text-base" style={{ color: warmMuted, fontWeight: 300 }}>
                  We sent a link to
                  <br />
                  <strong style={{ color: warmText, fontWeight: 400 }}>{email}</strong>
                </p>
              </div>
              <p className="text-sm" style={{ color: warmSubtle, fontWeight: 300 }}>
                This window updates automatically once you click the link.
              </p>
              <button
                onClick={() => { setStep("intro"); setError(null); }}
                className="text-base transition-colors duration-300"
                style={{ color: warmMuted, fontWeight: 300 }}
                onMouseEnter={e => (e.currentTarget.style.color = warmText)}
                onMouseLeave={e => (e.currentTarget.style.color = warmMuted)}
              >
                ← Go back
              </button>
            </div>
          )}

          {/* ── SIGNING IN ───────────────────────────────────────── */}
          {step === "signing-in" && (
            <div className="text-center py-16 space-y-5">
              <Loader2 size={36} className="animate-spin mx-auto" style={{ color: warmAccent }} />
              <h2 className="text-2xl" style={{ fontFamily: SERIF, color: warmText, fontWeight: 300 }}>
                Signing you in…
              </h2>
              <p className="text-base" style={{ color: warmMuted, fontWeight: 300 }}>
                This will only take a moment.
              </p>
            </div>
          )}

          {/* ── DERIVING ─────────────────────────────────────────── */}
          {step === "deriving" && (
            <div className="text-center py-16 space-y-5">
              <Loader2 size={36} className="animate-spin mx-auto" style={{ color: warmAccent }} />
              <h2 className="text-2xl" style={{ fontFamily: SERIF, color: warmText, fontWeight: 300 }}>
                Creating your identity…
              </h2>
              <p className="text-base" style={{ color: warmMuted, fontWeight: 300 }}>
                Generating a unique digital fingerprint.
              </p>
            </div>
          )}

          {/* ── COMPLETE (Human) ─────────────────────────────────── */}
          {step === "complete" && identity && (
            <div className="space-y-7">
              <div className="text-center space-y-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                  style={{ background: "hsl(35 15% 18% / 0.5)", border: `1px solid ${warmPanelBorder}` }}
                >
                  <CheckCircle2 size={30} style={{ color: warmAccent }} />
                </div>
                <p className="text-base leading-relaxed" style={{ color: warmMuted, fontWeight: 300 }}>
                  Private, transferable, and fully under your control.
                </p>
              </div>

              <div className="p-6 space-y-5" style={panel}>
                {/* Triword address — primary human-readable form */}
                <div>
                  <span className="block text-xs mb-1" style={{ color: warmMuted }}>Your Address</span>
                  <span className="block text-lg font-serif tracking-wide" style={{ color: warmAccent }}>
                    {canonicalToTriword(identity.canonicalId).split(".").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" · ")}
                  </span>
                  <span className="block text-[10px] font-mono mt-1" style={{ color: warmMuted }}>
                    {canonicalToTriword(identity.canonicalId)}
                  </span>
                </div>
                <MonoField label="Canonical ID" value={identity.canonicalId} />
                <GlyphField label="Visual Symbol" value={identity.glyph} />
                <MonoField label="Content Address" value={identity.cid} />
                <MonoField label="Network Address" value={identity.ipv6} />
              </div>

              {/* Passkey */}
              {passkeyStatus !== "unsupported" && (
                <div className="p-6 space-y-5" style={panel}>
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: "hsl(35 10% 18% / 0.5)", border: `1px solid ${warmPanelBorder}` }}
                    >
                      <KeyRound size={20} style={{ color: warmAccent }} />
                    </div>
                    <div>
                      <h3 className="text-base" style={{ color: warmText, fontWeight: 400 }}>
                        Add Biometric Login
                      </h3>
                      <p className="text-sm mt-0.5" style={{ color: warmMuted, fontWeight: 300 }}>
                        Fingerprint or face recognition
                      </p>
                    </div>
                  </div>
                  {passkeyStatus === "idle" && (
                    <button onClick={handlePasskeyRegister} style={btnOutlineStyle}>
                      <Fingerprint size={18} /> Set up biometrics
                    </button>
                  )}
                  {passkeyStatus === "registering" && (
                    <div className="flex items-center gap-3 text-base" style={{ color: warmMuted, fontWeight: 300 }}>
                      <Loader2 size={18} className="animate-spin" /> Waiting for your device…
                    </div>
                  )}
                  {passkeyStatus === "done" && (
                    <div className="flex items-center gap-3 text-base" style={{ color: warmAccent, fontWeight: 300 }}>
                      <CheckCircle2 size={18} /> Biometric login enabled ✓
                    </div>
                  )}
                </div>
              )}

              <button onClick={onClose} style={btnPrimaryStyle}>
                Done <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
