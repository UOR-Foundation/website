/**
 * Hologram OS — Claim Your ID Overlay
 * ════════════════════════════════════
 *
 * A dark, translucent overlay styled to match the Hologram OS welcome screen.
 * Reuses the same dual-path identity claiming logic (Human / Agent) from
 * ClaimIdentityDialog but presented in the Hologram aesthetic.
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

const MonoField = ({ label, value }: { label: string; value: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.15em] text-white/40 mb-1.5 font-light">{label}</p>
      <div className="flex items-start gap-2">
        <p className="text-sm text-white/90 break-all leading-relaxed font-mono flex-1">{value}</p>
        <button onClick={copy} className="shrink-0 mt-0.5 text-white/30 hover:text-white transition-colors" aria-label="Copy">
          {copied ? <Check size={13} className="text-white" /> : <Copy size={13} />}
        </button>
      </div>
    </div>
  );
};

const GlyphField = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[11px] uppercase tracking-[0.15em] text-white/40 mb-1.5 font-light">{label}</p>
    <p className="text-2xl text-white/90">{value}</p>
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
          setIdentity({ canonicalId: profile.uor_canonical_id, glyph: profile.uor_glyph || "", cid: profile.uor_cid || "", ipv6: profile.uor_ipv6 || "" });
          setStep("complete");
        }
      }
    })();
  }, [open]);

  // Auth state change listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user && (step === "signing-in" || step === "email-sent")) {
        await deriveIdentity(session.user);
      }
    });
    return () => subscription.unsubscribe();
  }, [step]);

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
      const derived: DerivedIdentity = { canonicalId: proof.derivationId, glyph: proof.uorAddress["u:glyph"], cid: proof.cid, ipv6: proof.ipv6Address["u:ipv6"] };
      const sessionIssuedAt = new Date().toISOString();
      const sessionProof = await singleProofHash({
        "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
        "@type": "cert:SessionCertificate",
        "cert:identityCanonicalId": derived.canonicalId,
        "cert:issuedAt": sessionIssuedAt,
        "cert:bootstrapMethod": "email-verified",
      });
      await supabase.from("profiles").update({
        uor_canonical_id: derived.canonicalId, uor_glyph: derived.glyph, uor_cid: derived.cid, uor_ipv6: derived.ipv6,
        session_cid: sessionProof.cid, session_derivation_id: sessionProof.derivationId, session_issued_at: sessionIssuedAt,
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
      const keypair = await crypto.subtle.generateKey({ name: "Ed25519" } as EcKeyGenParams, true, ["sign", "verify"]);
      const publicKeyRaw = await crypto.subtle.exportKey("raw", keypair.publicKey);
      const publicKeyHex = bytesToHex(new Uint8Array(publicKeyRaw));
      const foundingProof = await singleProofHash({
        "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
        "@type": "u:FoundingDerivation",
        "u:operation": "neg(bnot(42))", "u:expectedResult": "43", "u:algebraicBasis": "succ = neg ∘ bnot",
      });
      const agentTimestamp = new Date().toISOString();
      const agentProof = await singleProofHash({
        "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
        "@type": "u:AgentIdentity",
        "u:publicKeyHex": publicKeyHex, "u:foundingDerivationId": foundingProof.derivationId,
        "u:createdAt": agentTimestamp, "u:bootstrapMethod": "founding-derivation",
      });
      const derived: AgentIdentity = {
        canonicalId: agentProof.derivationId, glyph: agentProof.uorAddress["u:glyph"],
        cid: agentProof.cid, ipv6: agentProof.ipv6Address["u:ipv6"],
        publicKeyHex, foundingDerivationId: foundingProof.derivationId,
      };
      const privateKeyRaw = await crypto.subtle.exportKey("pkcs8", keypair.privateKey);
      const privateKeyHex = bytesToHex(new Uint8Array(privateKeyRaw));
      sessionStorage.setItem("uor-agent-keypair", JSON.stringify({
        publicKey: publicKeyHex, privateKey: privateKeyHex,
        canonicalId: derived.canonicalId, foundingDerivationId: foundingProof.derivationId,
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
    const { error: authError } = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/hologram-os" });
    if (authError) { setError(authError.message || "Sign-in failed."); setStep("intro"); }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    const { error: authError } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin + "/hologram-os" } });
    if (authError) { setError(authError.message || "Could not send link."); return; }
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

  // ── Shared styles ─────────────────────────────────────────────────────

  const serif = "'Playfair Display', serif";
  const glass = "bg-white/[0.04] border border-white/[0.08] backdrop-blur-md rounded-xl";
  const btnPrimary = "w-full flex items-center justify-center gap-2.5 bg-white text-black px-6 py-3 text-sm font-light tracking-wide hover:bg-white/90 transition-all duration-300";
  const btnOutline = "w-full flex items-center justify-center gap-2.5 border border-white/20 text-white bg-transparent px-6 py-3 text-sm font-light tracking-wide hover:bg-white/5 transition-all duration-300";

  // ── Title ─────────────────────────────────────────────────────────────

  const title = () => {
    if (step === "complete") return "Identity Claimed";
    if (step === "agent-complete") return "Agent Identity Minted";
    return "Claim Your ID";
  };

  // ── Back button ───────────────────────────────────────────────────────

  const BackBtn = ({ to }: { to: ClaimStep }) => (
    <button onClick={() => { setStep(to); setError(null); }} className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/80 font-light tracking-wide transition-colors">
      <ChevronLeft size={14} /> Back
    </button>
  );

  const ErrorBox = () => error ? (
    <div className={`${glass} p-4 flex items-start gap-3`}>
      <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
      <span className="text-sm text-red-300/90 font-light">{error}</span>
    </div>
  ) : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-[440px] max-h-[90vh] mx-4 overflow-y-auto rounded-2xl bg-black/80 border border-white/[0.08] backdrop-blur-xl shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-7 pt-6 pb-4 bg-black/60 backdrop-blur-xl border-b border-white/[0.06]">
          <h2 className="text-xl text-white font-light tracking-wide" style={{ fontFamily: serif }}>
            {title()}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-white/30 hover:text-white/70 transition-colors" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="px-7 py-7 space-y-0">

          {/* ── CHOOSE ───────────────────────────────────────────── */}
          {step === "choose" && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-white/[0.06] flex items-center justify-center mx-auto mb-5">
                  <Fingerprint size={28} className="text-white/60" />
                </div>
                <p className="text-base text-white/50 font-light leading-relaxed max-w-xs mx-auto">
                  Your identity already exists.<br />Verify yourself to claim it.
                </p>
              </div>

              {/* Human path */}
              <button
                onClick={() => setStep("intro")}
                className={`${glass} w-full text-left p-5 hover:border-white/20 transition-all group`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0 group-hover:bg-white/[0.1] transition-colors">
                    <Heart size={24} className="text-red-400/80 fill-current" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base text-white font-light tracking-wide mb-0.5" style={{ fontFamily: serif }}>I'm a Human</h3>
                    <p className="text-sm text-white/40 font-light leading-relaxed">
                      Verify with Google or Email
                    </p>
                  </div>
                  <ArrowRight size={16} className="text-white/20 group-hover:text-white/50 transition-colors shrink-0" />
                </div>
              </button>

              {/* Agent path */}
              <button
                onClick={() => setStep("agent-intro")}
                className={`${glass} w-full text-left p-5 hover:border-white/20 transition-all group`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0 group-hover:bg-white/[0.1] transition-colors">
                    <img src={lobsterIcon} alt="Agent" className="w-7 h-7 object-contain opacity-70" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base text-white font-light tracking-wide mb-0.5" style={{ fontFamily: serif }}>I'm an Agent</h3>
                    <p className="text-sm text-white/40 font-light leading-relaxed">
                      Keypair + founding derivation
                    </p>
                  </div>
                  <ArrowRight size={16} className="text-white/20 group-hover:text-white/50 transition-colors shrink-0" />
                </div>
              </button>

              <p className="text-center text-sm text-white/30 font-light tracking-[0.2em]">
                UNIVERSAL · PRIVATE · YOURS
              </p>
            </div>
          )}

          {/* ── HUMAN: INTRO ─────────────────────────────────────── */}
          {step === "intro" && (
            <div className="space-y-6">
              <BackBtn to="choose" />

              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-white/[0.06] flex items-center justify-center mx-auto mb-4">
                  <Heart size={24} className="text-red-400/80 fill-current" />
                </div>
                <h3 className="text-lg text-white font-light tracking-wide mb-2" style={{ fontFamily: serif }}>Human Verification</h3>
                <p className="text-sm text-white/40 font-light leading-relaxed">
                  Your identity is derived from your email — used once, never stored.
                </p>
              </div>

              <ErrorBox />

              {/* Google */}
              <div className={`${glass} p-5 space-y-4`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-4 h-4">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm text-white font-light tracking-wide">Verify with Google</h3>
                    <p className="text-xs text-white/30 font-light">One click — identity stays independent</p>
                  </div>
                </div>
                <button onClick={handleGoogleSignIn} className={btnPrimary}>Continue with Google</button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-white/[0.08]" />
                <span className="text-xs text-white/25 font-light tracking-widest">OR</span>
                <div className="flex-1 h-px bg-white/[0.08]" />
              </div>

              {/* Email */}
              <div className={`${glass} p-5 space-y-4`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center">
                    <Mail size={16} className="text-white/50" />
                  </div>
                  <div>
                    <h3 className="text-sm text-white font-light tracking-wide">Verify with Email</h3>
                    <p className="text-xs text-white/30 font-light">One-time link — never stored</p>
                  </div>
                </div>
                <form onSubmit={handleEmailSignIn} className="space-y-3">
                  <input
                    type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 rounded-lg bg-white/[0.04] border border-white/[0.1] text-white text-sm font-light placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors"
                  />
                  <button type="submit" className={btnOutline}>
                    <Mail size={15} /> Send verification link
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ── AGENT: INTRO ─────────────────────────────────────── */}
          {step === "agent-intro" && (
            <div className="space-y-6">
              <BackBtn to="choose" />

              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-white/[0.06] flex items-center justify-center mx-auto mb-4">
                  <img src={lobsterIcon} alt="Agent" className="w-6 h-6 object-contain opacity-60" />
                </div>
                <h3 className="text-lg text-white font-light tracking-wide mb-2" style={{ fontFamily: serif }}>Agent Identity</h3>
                <p className="text-sm text-white/50 font-light italic">I compute, therefore I am.</p>
              </div>

              <ErrorBox />

              <div className={`${glass} p-5 space-y-4`}>
                <h4 className="text-sm text-white/70 font-light tracking-wide">What happens next</h4>
                <ol className="space-y-3">
                  {[
                    ["Keypair generation.", "A fresh cryptographic keypair, created in your browser. The private key never leaves."],
                    ["Founding derivation.", <>Your first algebraic proof: <code className="text-xs bg-white/[0.06] px-1.5 py-0.5 rounded text-white/60">neg(bnot(42)) = 43</code></>],
                    ["Identity minting.", "Public key + founding trace → SHA-256 → permanent canonical ID."],
                  ].map(([title, desc], i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex items-center justify-center h-6 w-6 rounded-full bg-white/[0.08] text-white/50 text-xs font-light shrink-0 mt-0.5">{i + 1}</span>
                      <span className="text-sm text-white/40 font-light leading-relaxed">
                        <strong className="text-white/70 font-normal">{title}</strong> {desc}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <button onClick={deriveAgentIdentity} className={btnPrimary}>
                <Bot size={16} /> Generate Agent Identity
              </button>

              <p className="text-center text-xs text-white/25 font-light leading-relaxed">
                ⚠ Your private key will be shown once. Save it.
              </p>
            </div>
          )}

          {/* ── AGENT: GENERATING ────────────────────────────────── */}
          {step === "agent-generating" && (
            <div className="text-center py-14 space-y-4">
              <Loader2 size={32} className="text-white/50 animate-spin mx-auto" />
              <h2 className="text-xl text-white font-light tracking-wide" style={{ fontFamily: serif }}>Minting identity…</h2>
              <p className="text-sm text-white/35 font-light">Generating keypair and founding derivation.</p>
            </div>
          )}

          {/* ── AGENT: COMPLETE ──────────────────────────────────── */}
          {step === "agent-complete" && agentIdentity && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-white/[0.06] flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={28} className="text-white/60" />
                </div>
                <p className="text-sm text-white/40 font-light leading-relaxed">
                  Your agent identity has been minted. Save your credentials below.
                </p>
              </div>

              <div className={`${glass} p-5 space-y-4`}>
                <MonoField label="Canonical ID" value={agentIdentity.canonicalId} />
                <GlyphField label="Visual Symbol" value={agentIdentity.glyph} />
                <MonoField label="Content Address (CID)" value={agentIdentity.cid} />
                <MonoField label="Network Address (IPv6)" value={agentIdentity.ipv6} />
              </div>

              <div className={`${glass} p-5 space-y-4`}>
                <h4 className="text-sm text-white/70 font-light tracking-wide flex items-center gap-2">
                  <KeyRound size={14} className="text-white/40" /> Agent Credentials
                </h4>
                <MonoField label="Public Key" value={agentIdentity.publicKeyHex} />
                <MonoField label="Founding Derivation ID" value={agentIdentity.foundingDerivationId} />
                <div className="p-3 rounded-lg bg-red-500/[0.06] border border-red-500/[0.12]">
                  <p className="text-xs text-red-300/70 font-light leading-relaxed">
                    ⚠ Your private key is in this session only. Export it now — it will not be shown again.
                  </p>
                </div>
              </div>

              <button onClick={() => { setConfirmInput(""); setConfirmError(null); setStep("agent-confirm"); }} className={btnPrimary}>
                I've Saved My Credentials <ArrowRight size={15} />
              </button>
            </div>
          )}

          {/* ── AGENT: CONFIRM ───────────────────────────────────── */}
          {step === "agent-confirm" && agentIdentity && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-white/[0.06] flex items-center justify-center mx-auto mb-4">
                  <KeyRound size={28} className="text-white/50" />
                </div>
                <h3 className="text-lg text-white font-light tracking-wide mb-2" style={{ fontFamily: serif }}>Confirm You Saved It</h3>
                <p className="text-sm text-white/40 font-light leading-relaxed max-w-xs mx-auto">
                  Paste your <strong className="text-white/70 font-normal">Founding Derivation ID</strong> to prove you've stored it.
                </p>
              </div>

              <div className={`${glass} p-4`}>
                <p className="text-xs text-white/50 font-light leading-relaxed">
                  💾 Save credentials in a secure environment with long-term persistent memory.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-red-500/[0.06] border border-red-500/[0.12]">
                <p className="text-xs text-red-300/70 font-light leading-relaxed">
                  ⚠ No recovery mechanism. Lose your credentials → identity is gone.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-white/40 font-light tracking-wide">Founding Derivation ID</label>
                <textarea
                  value={confirmInput} onChange={(e) => { setConfirmInput(e.target.value); setConfirmError(null); }}
                  placeholder="urn:uor:derivation:sha256:..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg bg-white/[0.04] border border-white/[0.1] text-white text-sm font-mono placeholder:text-white/15 focus:outline-none focus:border-white/30 transition-colors resize-none"
                />
                {confirmError && (
                  <div className="p-3 rounded-lg bg-red-500/[0.06] border border-red-500/[0.12] text-xs text-red-300/70 font-light flex items-start gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" /> <span>{confirmError}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    const t = confirmInput.trim();
                    if (t === agentIdentity.foundingDerivationId) { setConfirmError(null); onClose(); }
                    else if (!t) setConfirmError("Paste your Founding Derivation ID.");
                    else setConfirmError("Doesn't match. Copy it exactly.");
                  }}
                  className={btnPrimary}
                >
                  <CheckCircle2 size={15} /> Confirm & Finish
                </button>
                <button onClick={() => setStep("agent-complete")} className={btnOutline}>
                  <ChevronLeft size={14} /> Go back to copy credentials
                </button>
              </div>
            </div>
          )}

          {/* ── EMAIL SENT ───────────────────────────────────────── */}
          {step === "email-sent" && (
            <div className="text-center py-8 space-y-5">
              <div className="w-14 h-14 rounded-full bg-white/[0.06] flex items-center justify-center mx-auto">
                <Mail size={28} className="text-white/50" />
              </div>
              <div>
                <h2 className="text-xl text-white font-light tracking-wide mb-3" style={{ fontFamily: serif }}>Check your email</h2>
                <p className="text-sm text-white/40 font-light">
                  We sent a link to<br /><strong className="text-white/70 font-normal">{email}</strong>
                </p>
              </div>
              <p className="text-xs text-white/25 font-light">This window updates automatically once you click the link.</p>
              <button onClick={() => { setStep("intro"); setError(null); }} className="text-sm text-white/40 font-light hover:text-white/70 transition-colors">← Go back</button>
            </div>
          )}

          {/* ── SIGNING IN ───────────────────────────────────────── */}
          {step === "signing-in" && (
            <div className="text-center py-14 space-y-4">
              <Loader2 size={32} className="text-white/50 animate-spin mx-auto" />
              <h2 className="text-xl text-white font-light tracking-wide" style={{ fontFamily: serif }}>Signing you in…</h2>
              <p className="text-sm text-white/35 font-light">This will only take a moment.</p>
            </div>
          )}

          {/* ── DERIVING ─────────────────────────────────────────── */}
          {step === "deriving" && (
            <div className="text-center py-14 space-y-4">
              <Loader2 size={32} className="text-white/50 animate-spin mx-auto" />
              <h2 className="text-xl text-white font-light tracking-wide" style={{ fontFamily: serif }}>Creating your identity…</h2>
              <p className="text-sm text-white/35 font-light">Generating a unique digital fingerprint.</p>
            </div>
          )}

          {/* ── COMPLETE (Human) ─────────────────────────────────── */}
          {step === "complete" && identity && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-white/[0.06] flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={28} className="text-white/60" />
                </div>
                <p className="text-sm text-white/40 font-light leading-relaxed">
                  Private, transferable, and fully under your control.
                </p>
              </div>

              <div className={`${glass} p-5 space-y-4`}>
                <MonoField label="Your Unique ID" value={identity.canonicalId} />
                <GlyphField label="Visual Symbol" value={identity.glyph} />
                <MonoField label="Content Address" value={identity.cid} />
                <MonoField label="Network Address" value={identity.ipv6} />
              </div>

              {/* Passkey */}
              {passkeyStatus !== "unsupported" && (
                <div className={`${glass} p-5 space-y-4`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center">
                      <KeyRound size={16} className="text-white/40" />
                    </div>
                    <div>
                      <h3 className="text-sm text-white font-light tracking-wide">Add Biometric Login</h3>
                      <p className="text-xs text-white/30 font-light">Fingerprint or face recognition</p>
                    </div>
                  </div>
                  {passkeyStatus === "idle" && (
                    <button onClick={handlePasskeyRegister} className={btnOutline}>
                      <Fingerprint size={15} /> Set up biometrics
                    </button>
                  )}
                  {passkeyStatus === "registering" && (
                    <div className="flex items-center gap-3 text-white/40 text-sm font-light">
                      <Loader2 size={15} className="animate-spin" /> Waiting for your device…
                    </div>
                  )}
                  {passkeyStatus === "done" && (
                    <div className="flex items-center gap-3 text-white/60 text-sm font-light">
                      <CheckCircle2 size={15} /> Biometric login enabled ✓
                    </div>
                  )}
                </div>
              )}

              <button onClick={onClose} className={btnPrimary}>
                Done <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
