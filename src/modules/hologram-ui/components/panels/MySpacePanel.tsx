/**
 * MySpacePanel — "One Moment, One Identity"
 * ═══════════════════════════════════════════
 *
 * THE canonical single entry point for sovereign identity.
 * Both new and returning users flow through this panel.
 * No alternate auth paths exist: one door in, one door out.
 *
 * Architecture:
 *  - Unified welcome screen for new + returning users
 *  - Primary: Device biometric (TEE) for returning users
 *  - Universal: Email magic link / Google / Apple OAuth
 *  - TEE attestation happens ONLY here during the founding ceremony
 *  - Multi-device: each device registers its own credential
 *  - Email serves as recovery channel for device loss
 *
 * Phases:
 *  1. auth       — Unified entry: biometric, email, or OAuth
 *  2. magic-sent — Awaiting email confirmation
 *  3. naming     — Choose a display name (new users)
 *  4. creating   — TEE attestation + vault-isolated founding ceremony
 *  5. reveal     — Identity confirmation with sovereign markers
 *  6. dashboard  — Personal sovereign space
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Mail, Shield, Fingerprint, Lock, Smartphone, ArrowRight, Sparkles, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { KP } from "@/modules/hologram-os/kernel-palette";
import { motion, AnimatePresence } from "framer-motion";

// ── Kernel imports ──
import { QSovereignty, type GenesisResult, type AuthUser } from "@/hologram/kernel/q-sovereignty";
import { QFs } from "@/hologram/kernel/q-fs";
import { QMmu } from "@/hologram/kernel/q-mmu";
import { QSecurity } from "@/hologram/kernel/q-security";
import { QEcc } from "@/hologram/kernel/q-ecc";
import { QDisclosure, type DisclosureRule } from "@/hologram/kernel/q-disclosure";
import { QTrustMesh } from "@/hologram/kernel/q-trust-mesh";
import { QNet } from "@/hologram/kernel/q-net";
import { executeInVault, type VaultSeal } from "@/hologram/kernel/q-ceremony-vault";
import { TEEBridge, type TEEAttestationQuote, type TEEAssertion } from "@/hologram/kernel/tee-bridge";

// ── Extracted sub-components ──
import MySpaceDashboard from "../myspace/MySpaceDashboard";
import CeremonyCanvas from "../myspace/CeremonyCanvas";

type Phase = "loading" | "auth" | "magic-sent" | "greeting" | "naming" | "creating" | "genesis" | "reveal" | "dashboard";
type AuthMode = "unified" | "email";

interface MySpacePanelProps {
  onClose: () => void;
}

interface CeremonyState {
  genesis: GenesisResult;
  seal: VaultSeal;
  disclosurePolicyCid: string;
  trustNodeCid: string;
  teeAttestation?: TEEAttestationQuote | null;
}

/** Emit a custom event so the sidebar picks up TEE state changes */
function emitTrustUpdate(trusted: boolean) {
  window.dispatchEvent(new CustomEvent("hologram:tee-update", { detail: { trusted } }));
}

/** Check if this device has a registered TEE credential */
function hasDeviceCredential(): boolean {
  try {
    return !!localStorage.getItem("hologram:tee:credential");
  } catch { return false; }
}

export default function MySpacePanel({ onClose }: MySpacePanelProps) {
  const { session, profile, loading, signOut, refreshProfile } = useAuth();
  const [phase, setPhase] = useState<Phase>("loading");
  const [authMode, setAuthMode] = useState<AuthMode>("unified");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [ceremonyState, setCeremonyState] = useState<CeremonyState | null>(null);
  const [teeStatus, setTeeStatus] = useState<"idle" | "attesting" | "asserting" | "done">("idle");
  const [deviceBiometricAvailable, setDeviceBiometricAvailable] = useState(false);
  const [deviceHasCredential, setDeviceHasCredential] = useState(false);
  const [greetingName, setGreetingName] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const teeBridgeRef = useRef(new TEEBridge());

  // ── Detect device capabilities on mount ──
  useEffect(() => {
    const bridge = teeBridgeRef.current;
    bridge.detect().then((caps) => {
      setDeviceBiometricAvailable(caps.provider === "webauthn-platform");
      setDeviceHasCredential(bridge.hasCredential);
    });
  }, []);

  // ── Phase routing ──
  useEffect(() => {
    if (loading) { setPhase("loading"); return; }
    if (!session) { setPhase("auth"); return; }
    if (profile?.ceremonyCid || profile?.uorCanonicalId) {
      setPhase("dashboard");
      if (hasDeviceCredential()) emitTrustUpdate(true);
      return;
    }
    if (profile) {
      const meta = session.user.user_metadata;
      if (meta?.full_name) setName(meta.full_name);
      else if (meta?.name) setName(meta.name);
      setPhase("naming");
      return;
    }
    supabase
      .from("profiles")
      .select("display_name, ceremony_cid, uor_canonical_id")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.ceremony_cid || data?.uor_canonical_id) {
          refreshProfile();
          setPhase("dashboard");
          if (hasDeviceCredential()) emitTrustUpdate(true);
        } else {
          const meta = session.user.user_metadata;
          if (meta?.full_name) setName(meta.full_name);
          else if (meta?.name) setName(meta.name);
          else if (data?.display_name) setName(data.display_name);
          setPhase("naming");
        }
      });
  }, [loading, session, profile, refreshProfile]);

  // ── Auth state listener ──
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
      if (event === "SIGNED_IN" && sess) {
        const meta = sess.user.user_metadata;
        if (meta?.full_name) setName(meta.full_name);
        else if (meta?.name) setName(meta.name);
        supabase
          .from("profiles")
          .select("display_name, ceremony_cid")
          .eq("user_id", sess.user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data?.ceremony_cid) { refreshProfile(); setPhase("dashboard"); }
            else setPhase("naming");
          });
      }
    });
    return () => subscription.unsubscribe();
  }, [refreshProfile]);

  // ── Auto-advance from genesis animation to reveal ──
  useEffect(() => {
    if (phase === "genesis") {
      const timer = setTimeout(() => setPhase("reveal"), 4500);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // ── Auto-advance from greeting to dashboard ──
  useEffect(() => {
    if (phase === "greeting") {
      const timer = setTimeout(() => {
        refreshProfile();
        setPhase("dashboard");
      }, 2800);
      return () => clearTimeout(timer);
    }
  }, [phase, refreshProfile]);

  // ── Auto-focus ──
  useEffect(() => {
    if (phase === "auth" && authMode === "email") {
      const t = setTimeout(() => inputRef.current?.focus(), 400);
      return () => clearTimeout(t);
    }
    if (phase === "naming") {
      const t = setTimeout(() => nameRef.current?.focus(), 400);
      return () => clearTimeout(t);
    }
  }, [phase, authMode]);

  // ══════════════════════════════════════════════════════════════
  // Auth handlers
  // ══════════════════════════════════════════════════════════════

  /** Returning user: biometric assert → greeting → dashboard */
  const handleDeviceSignIn = useCallback(async () => {
    const bridge = teeBridgeRef.current;
    try {
      setTeeStatus("asserting");
      const assertion = await bridge.assert("hologram:login:verify");

      if (assertion.userVerified || assertion.userPresent) {
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (existingSession) {
          // Check if profile has completed ceremony
          const { data: profileData } = await supabase
            .from("profiles")
            .select("ceremony_cid, uor_canonical_id, display_name, three_word_name, uor_glyph")
            .eq("user_id", existingSession.user.id)
            .maybeSingle();

          if (profileData?.ceremony_cid || profileData?.uor_canonical_id) {
            setTeeStatus("done");
            emitTrustUpdate(true);
            // Show greeting before entering sovereign space
            setGreetingName(profileData.display_name || profileData.three_word_name || "Sovereign");
            setPhase("greeting");
            return;
          }
          // Has session but no ceremony — needs founding
          setTeeStatus("done");
          emitTrustUpdate(true);
          setPhase("naming");
          return;
        }
        // Session expired — need email/OAuth recovery
        setTeeStatus("idle");
        toast.info("Session expired. Please sign in with email or Google to reconnect.");
        setAuthMode("email");
      }
    } catch (err) {
      console.warn("[MySpace] Device sign-in failed:", err);
      setTeeStatus("idle");
      toast.error("Biometric cancelled. Try another method.");
    }
  }, [refreshProfile]);

  /** New user on biometric-capable device: activate TEE first, then check for linked ID */
  const handleBiometricNew = useCallback(async () => {
    const bridge = teeBridgeRef.current;
    try {
      setTeeStatus("asserting");

      // Activate the Trusted Execution Environment
      await bridge.detect();

      // Attempt assertion first — maybe device has a credential we don't know about
      if (bridge.isHardwareBacked) {
        try {
          const assertion = await bridge.assert("hologram:login:verify");

          if (assertion.userVerified || assertion.userPresent) {
            // TEE responded — check if there's a linked user
            const linkedUserId = localStorage.getItem("hologram:tee:linked-user");
            if (linkedUserId) {
              // Check Supabase for existing profile
              const { data: { session: existingSession } } = await supabase.auth.getSession();
              if (existingSession && existingSession.user.id === linkedUserId) {
                const { data: profileData } = await supabase
                  .from("profiles")
                  .select("ceremony_cid, uor_canonical_id, display_name, three_word_name")
                  .eq("user_id", linkedUserId)
                  .maybeSingle();

                if (profileData?.ceremony_cid || profileData?.uor_canonical_id) {
                  // Returning user via TEE — show greeting
                  setTeeStatus("done");
                  emitTrustUpdate(true);
                  setGreetingName(profileData.display_name || profileData.three_word_name || "Sovereign");
                  setPhase("greeting");
                  return;
                }
              }
            }
            // TEE verified but no linked profile — proceed to naming
            setTeeStatus("done");
            emitTrustUpdate(true);
            setPhase("naming");
            return;
          }
        } catch {
          // No existing credential — this is truly a new user
          console.info("[MySpace] No existing TEE credential — new user flow");
        }
      }

      // New user: TEE activated but no credential yet — proceed to naming
      // (credential will be created during the ceremony)
      setTeeStatus("done");
      setPhase("naming");
    } catch (err) {
      console.warn("[MySpace] TEE activation failed:", err);
      setTeeStatus("idle");
      // Gracefully fall through to naming even without TEE
      setPhase("naming");
    }
  }, []);

  const handleGoogleSignIn = useCallback(async () => {
    sessionStorage.setItem("auth_return_to", "/hologram-os");
    const { error } = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (error) toast.error("Could not sign in with Google");
  }, []);

  const handleAppleSignIn = useCallback(async () => {
    sessionStorage.setItem("auth_return_to", "/hologram-os");
    const { error } = await lovable.auth.signInWithOAuth("apple", { redirect_uri: window.location.origin });
    if (error) toast.error("Could not sign in with Apple");
  }, []);

  const handleMagicLink = useCallback(async () => {
    if (!email.trim()) return;
    sessionStorage.setItem("auth_return_to", "/hologram-os");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin + "/hologram-os" },
    });
    if (error) toast.error("Could not send magic link");
    else setPhase("magic-sent");
  }, [email]);

  // ══════════════════════════════════════════════════════════════
  // Vault-Isolated Genesis Ceremony (with TEE attestation)
  // ══════════════════════════════════════════════════════════════

  const handleCreate = useCallback(async () => {
    if (!name.trim()) return;
    setPhase("creating");

    let { data: { session: sess } } = await supabase.auth.getSession();
    if (!sess) {
      // Biometric-only new user — create anonymous session
      const { error: anonErr } = await supabase.auth.signInAnonymously();
      if (anonErr) {
        console.error("[MySpace] Anonymous auth failed:", anonErr);
        toast.error("Could not create your space. Try signing in with email or Google.");
        setPhase("naming");
        return;
      }
      const { data: { session: newSess } } = await supabase.auth.getSession();
      sess = newSess;
      if (!sess) {
        toast.error("Session creation failed. Try another method.");
        setPhase("naming");
        return;
      }
    }

    try {
      // ── Step 1: TEE Attestation — anchor to device hardware ──
      setTeeStatus("attesting");
      const bridge = teeBridgeRef.current;
      await bridge.detect();

      let teeAttestation: TEEAttestationQuote | null = null;
      if (bridge.isHardwareBacked) {
        try {
          teeAttestation = await bridge.attest(sess.user.id, name.trim());
          localStorage.setItem("hologram:tee:linked-user", sess.user.id);
          emitTrustUpdate(true);
        } catch (teeErr) {
          console.warn("[MySpace] TEE attestation skipped:", teeErr);
        }
      }
      setTeeStatus("done");

      // ── Step 2: Vault-Isolated Founding Ceremony ──
      const authUser: AuthUser = { id: sess.user.id, email: sess.user.email, displayName: name.trim() };

      const vaultResult = await executeInVault(async () => {
        const ecc = new QEcc();
        const security = new QSecurity(ecc);
        const mmu = new QMmu();
        const fs = new QFs(mmu);
        const sovereignty = new QSovereignty(fs, security, ecc);
        const genesis = await sovereignty.genesis(authUser);

        const disclosure = new QDisclosure();
        const defaultRules: DisclosureRule[] = [
          { attributeKey: "threeWord", visibility: "public", audienceCanonicalIds: [], expiresAt: null },
          { attributeKey: "glyph", visibility: "public", audienceCanonicalIds: [], expiresAt: null },
          { attributeKey: "canonicalId", visibility: "selective", audienceCanonicalIds: [], expiresAt: null },
          { attributeKey: "ipv6", visibility: "private", audienceCanonicalIds: [], expiresAt: null },
          { attributeKey: "cid", visibility: "private", audienceCanonicalIds: [], expiresAt: null },
          { attributeKey: "email", visibility: "private", audienceCanonicalIds: [], expiresAt: null },
        ];
        const policy = disclosure.createPolicy(genesis.sovereign.identity["u:canonicalId"], defaultRules, "private");

        const net = new QNet();
        const trustMesh = new QTrustMesh(net);
        const selfAttestation = trustMesh.attest(
          genesis.sovereign.identity["u:canonicalId"],
          genesis.sovereign.threeWordName.display,
          genesis.sovereign.identity["u:canonicalId"],
          genesis.sovereign.threeWordName.display,
          "sovereign",
          "Founding self-attestation: genesis node",
        );

        return { genesis, disclosurePolicyCid: policy.policyId, trustNodeCid: selfAttestation.attestationCid };
      }, sess.access_token);

      const { genesis, disclosurePolicyCid, trustNodeCid } = vaultResult.result;

      await supabase.from("profiles").upsert({
        user_id: sess.user.id,
        display_name: name.trim(),
        uor_canonical_id: genesis.sovereign.identity["u:canonicalId"],
        uor_glyph: genesis.sovereign.identity["u:glyph"],
        uor_ipv6: genesis.sovereign.identity["u:ipv6"],
        uor_cid: genesis.sovereign.identity["u:cid"],
        ceremony_cid: genesis.sovereign.ceremonyCid,
        three_word_name: genesis.sovereign.threeWordName.display,
        trust_node_cid: trustNodeCid,
        disclosure_policy_cid: disclosurePolicyCid,
        pqc_algorithm: "ML-DSA-65",
        collapse_intact: vaultResult.seal.clean,
        session_cid: genesis.sovereign.sessionEntryCid,
        session_derivation_id: genesis.sovereign.ceremonyCid,
        session_issued_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      setCeremonyState({ genesis, seal: vaultResult.seal, disclosurePolicyCid, trustNodeCid, teeAttestation });

    } catch (err) {
      console.error("[MySpace] Vault-isolated genesis failed:", err);
      toast.error(
        err instanceof Error && err.message.includes("VAULT BREACH")
          ? "Ceremony security breach detected. Please try again."
          : "Identity creation failed. Please try again."
      );
      setTeeStatus("idle");
      setPhase("naming");
    }
  }, [name]);

  const handleCeremonyAnimationComplete = useCallback(() => {
    if (ceremonyState) setPhase("genesis");
  }, [ceremonyState]);

  const handleFinishReveal = useCallback(() => {
    refreshProfile();
    setPhase("dashboard");
  }, [refreshProfile]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    setCeremonyState(null);
    setTeeStatus("idle");
    emitTrustUpdate(false);
    setAuthMode("unified");
    setPhase("auth");
  }, [signOut]);

  const canUseDevice = deviceBiometricAvailable && deviceHasCredential;
  const canUseBiometric = deviceBiometricAvailable;

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  if (phase === "loading") {
    return (
      <Shell onClose={onClose}>
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            className="w-10 h-10 rounded-full"
            style={{ border: `2px solid ${KP.gold}33`, borderTopColor: KP.gold }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </div>
      </Shell>
    );
  }

  if (phase === "auth") {
    return (
      <Shell onClose={onClose}>
        <div className="flex-1 flex items-center justify-center relative overflow-hidden">
          {/* Ambient glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 50% 30%, hsl(38 60% 60% / 0.05) 0%, transparent 70%)" }}
          />

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative z-10 w-full max-w-sm px-8"
          >
            {/* ── Header ── */}
            <div className="text-center mb-10">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.4 }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6"
                style={{ background: `${KP.gold}12`, border: `1px solid ${KP.gold}22` }}
              >
                <Eye className="w-7 h-7" style={{ color: KP.gold }} />
              </motion.div>

              <h1 className="text-[26px] font-display font-semibold leading-snug" style={{ color: KP.text }}>
                Your sovereign space
              </h1>
              <p className="text-sm mt-3 leading-relaxed max-w-[280px] mx-auto" style={{ color: KP.muted }}>
                {canUseDevice
                  ? "Welcome back. One touch to enter."
                  : canUseBiometric
                    ? "Your device is your key. One touch to create your sovereign identity."
                    : "Sign in to create your identity. Private by default, yours forever."
                }
              </p>
            </div>

            <div className="space-y-3">
              {/* ── Biometric button — primary for ALL biometric-capable devices ── */}
              <AnimatePresence>
                {canUseBiometric && authMode === "unified" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <button
                      onClick={canUseDevice ? handleDeviceSignIn : handleBiometricNew}
                      disabled={teeStatus === "asserting"}
                      className="w-full min-h-[52px] flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl text-[15px] font-semibold active:scale-[0.98] hover:brightness-110 transition-all cursor-pointer disabled:opacity-60"
                      style={{ background: KP.gold, color: KP.bg }}
                    >
                      {teeStatus === "asserting" ? (
                        <>
                          <motion.div
                            className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          />
                          Verifying…
                        </>
                      ) : (
                        <>
                          <Fingerprint className="w-5 h-5" />
                          {canUseDevice ? "Sign in with this device" : "Enter with biometrics"}
                        </>
                      )}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Divider (only if biometric shown) ── */}
              {canUseBiometric && authMode === "unified" && (
                <div className="flex items-center gap-4 py-1">
                  <div className="flex-1 h-px" style={{ background: KP.border }} />
                  <span className="text-[11px] uppercase tracking-widest" style={{ color: KP.dim }}>or</span>
                  <div className="flex-1 h-px" style={{ background: KP.border }} />
                </div>
              )}

              {/* ── OAuth buttons ── */}
              <OAuthButton onClick={handleGoogleSignIn} icon={<GoogleIcon />} label="Continue with Google" />
              <OAuthButton onClick={handleAppleSignIn} icon={<AppleIcon />} label="Continue with Apple" />

              {/* ── Email divider ── */}
              <div className="flex items-center gap-4 py-1">
                <div className="flex-1 h-px" style={{ background: KP.border }} />
                <span className="text-[11px] uppercase tracking-widest" style={{ color: KP.dim }}>or</span>
                <div className="flex-1 h-px" style={{ background: KP.border }} />
              </div>

              {/* ── Email input ── */}
              <div className="space-y-3">
                <input
                  ref={inputRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleMagicLink()}
                  onFocus={() => setAuthMode("email")}
                  placeholder="your@email.com"
                  className="w-full min-h-[48px] bg-transparent rounded-2xl px-6 py-3 text-[15px] text-center outline-none transition-all focus:ring-1"
                  style={{
                    border: `1px solid ${KP.border}`,
                    color: KP.text,
                  }}
                  autoComplete="email"
                  enterKeyHint="send"
                />
                <AnimatePresence>
                  {email.trim() && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="flex justify-center"
                    >
                      <button
                        onClick={handleMagicLink}
                        className="w-full min-h-[48px] flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-[15px] font-semibold active:scale-[0.98] hover:brightness-110 transition-all cursor-pointer"
                        style={{ background: KP.gold, color: KP.bg }}
                      >
                        <Mail className="w-4 h-4" />
                        Send magic link
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* ── Context hint ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-start gap-2.5 mt-8 px-1"
              style={{ color: KP.muted }}
            >
              <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <p className="text-[13px] leading-relaxed">
                {canUseBiometric
                  ? "Your biometrics create your identity instantly. Email and social sign-in are always available as recovery."
                  : "Any sign-in method creates your identity automatically."
                }
              </p>
            </motion.div>
          </motion.div>
        </div>
      </Shell>
    );
  }

  if (phase === "magic-sent") {
    return (
      <Shell onClose={onClose}>
        <div className="flex-1 flex items-center justify-center relative">
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 40%, hsl(38 60% 60% / 0.04) 0%, transparent 70%)" }} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 text-center px-8 space-y-6 max-w-sm"
          >
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 15 }}
              className="inline-flex items-center justify-center h-16 w-16 rounded-2xl mx-auto"
              style={{ border: `1px solid ${KP.gold}33`, background: `radial-gradient(circle, ${KP.gold}1a 0%, transparent 70%)` }}
            >
              <Mail className="h-7 w-7" style={{ color: KP.gold }} />
            </motion.div>
            <div>
              <h2 className="text-2xl font-display font-semibold" style={{ color: KP.text }}>Check your email</h2>
              <p className="text-[15px] mt-3 leading-relaxed" style={{ color: KP.muted }}>
                We sent a link to <span className="font-medium" style={{ color: KP.text }}>{email}</span>.
                <br />Click it to continue.
              </p>
            </div>
            <button onClick={() => { setPhase("auth"); setAuthMode("unified"); }} className="text-sm hover:opacity-80 transition-colors cursor-pointer" style={{ color: KP.muted }}>
              Use a different method
            </button>
          </motion.div>
        </div>
      </Shell>
    );
  }

  if (phase === "greeting") {
    return (
      <Shell onClose={onClose}>
        <div className="flex-1 flex items-center justify-center relative overflow-hidden" style={{ background: KP.bg }}>
          {/* Warm radial glow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.6, ease: [0.23, 1, 0.32, 1] }}
            className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(ellipse at 50% 40%, ${KP.gold}12 0%, transparent 62%)` }}
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
            className="relative z-10 text-center px-8 space-y-6"
          >
            {/* Golden shield orb */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 1, type: "spring", damping: 14 }}
              className="mx-auto flex items-center justify-center rounded-full"
              style={{
                width: 80, height: 80,
                background: `radial-gradient(circle, ${KP.gold}1a 0%, transparent 70%)`,
                border: `1px solid ${KP.gold}20`,
              }}
            >
              <Shield className="w-8 h-8" style={{ color: KP.gold }} />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="text-[28px] font-display font-semibold"
              style={{ color: KP.text }}
            >
              Welcome back, {greetingName}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0, duration: 0.8 }}
              className="text-[15px] leading-relaxed max-w-[280px] mx-auto"
              style={{ color: KP.muted }}
            >
              Your trusted environment verified. Entering your sovereign space…
            </motion.p>

            {/* Animated progress line */}
            <motion.div
              className="w-48 h-px mx-auto rounded-full overflow-hidden"
              style={{ background: `${KP.border}` }}
            >
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ delay: 0.8, duration: 2.0, ease: "easeInOut" }}
                className="h-full rounded-full"
                style={{ background: KP.gold }}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4, duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ background: `${KP.gold}0a`, border: `1px solid ${KP.gold}15` }}
            >
              <Fingerprint className="w-3 h-3" style={{ color: KP.gold }} />
              <span className="text-[11px] tracking-wider uppercase" style={{ color: KP.muted }}>
                TEE verified · Hardware-bound
              </span>
            </motion.div>
          </motion.div>
        </div>
      </Shell>
    );
  }

  if (phase === "naming") {
    return (
      <Shell onClose={onClose}>
        <div className="flex-1 flex items-center justify-center relative">
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 40%, hsl(38 60% 60% / 0.04) 0%, transparent 70%)" }} />
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 w-full max-w-md px-8"
          >
            <div className="text-center mb-10">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
                style={{ background: `${KP.gold}12`, border: `1px solid ${KP.gold}22` }}
              >
                <Sparkles className="w-6 h-6" style={{ color: KP.gold }} />
              </motion.div>
              <h1 className="text-[26px] font-display font-semibold leading-snug" style={{ color: KP.text }}>
                What should we call you?
              </h1>
              <p className="text-xs mt-3 max-w-[260px] mx-auto leading-relaxed" style={{ color: KP.dim }}>
                This name anchors your sovereign identity. You can always change it later.
              </p>
            </div>

            <div className="space-y-6">
              <input
                ref={nameRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && name.trim() && handleCreate()}
                placeholder="Your name"
                maxLength={30}
                className="w-full bg-transparent text-center text-xl font-display py-4 outline-none transition-colors"
                style={{ borderBottom: `2px solid ${KP.border}`, color: KP.text }}
                onFocus={(e) => { e.currentTarget.style.borderBottomColor = KP.gold; }}
                onBlur={(e) => { e.currentTarget.style.borderBottomColor = KP.border; }}
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="done"
              />

              <AnimatePresence>
                {name.trim() && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="flex justify-center"
                  >
                    <button
                      onClick={handleCreate}
                      className="min-w-[180px] min-h-[48px] px-10 py-3.5 rounded-2xl text-[15px] font-semibold active:scale-95 hover:brightness-110 transition-all cursor-pointer flex items-center justify-center gap-2.5"
                      style={{ background: KP.gold, color: KP.bg }}
                    >
                      <Fingerprint className="w-4 h-4" />
                      Begin Ceremony
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-start gap-2.5 mt-4 px-1" style={{ color: KP.muted }}>
                <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <p className="text-[13px] leading-relaxed">
                  Your device will ask for biometric verification to create a hardware-bound
                  identity. Only you, on this device, can access your space.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </Shell>
    );
  }

  if (phase === "creating") {
    return (
      <Shell onClose={onClose}>
        <CeremonyCanvas onComplete={handleCeremonyAnimationComplete} />
        <AnimatePresence>
          {teeStatus === "attesting" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-8 left-0 right-0 flex justify-center"
            >
              <div
                className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl"
                style={{ background: `${KP.bg}cc`, border: `1px solid ${KP.gold}22`, backdropFilter: "blur(12px)" }}
              >
                <Smartphone className="w-3.5 h-3.5" style={{ color: KP.gold }} />
                <span className="text-[11px] tracking-wider" style={{ color: KP.muted }}>
                  Connecting to your device's secure enclave…
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Shell>
    );
  }

  if (phase === "genesis") {
    const threeWord = ceremonyState?.genesis.sovereign.threeWordName;
    const glyph = ceremonyState?.genesis.sovereign.identity["u:glyph"];

    return (
      <Shell onClose={onClose}>
        <div className="flex-1 flex items-center justify-center relative overflow-hidden" style={{ background: KP.bg }}>
          {/* Expanding radial golden glow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 3, ease: [0.23, 1, 0.32, 1] }}
            className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(circle at 50% 45%, ${KP.gold}15 0%, transparent 55%)` }}
          />

          {/* Outer breathing ring */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 0.3, 0.15, 0.3], scale: [0.5, 1, 1.05, 1] }}
            transition={{ duration: 4, ease: [0.23, 1, 0.32, 1] }}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 200, height: 200,
              border: `1px solid ${KP.gold}18`,
            }}
          />

          <div className="relative z-10 text-center space-y-8 px-8">
            {/* Glyph orb */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.8, ease: [0.23, 1, 0.32, 1] }}
              className="mx-auto flex items-center justify-center rounded-full"
              style={{
                width: 96, height: 96,
                background: `radial-gradient(circle, ${KP.gold}20 0%, transparent 70%)`,
                border: `1px solid ${KP.gold}25`,
              }}
            >
              <motion.span
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
                className="text-4xl"
              >
                {glyph || "✦"}
              </motion.span>
            </motion.div>

            {/* Three-word name */}
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
              className="text-[28px] font-display font-semibold tracking-tight"
              style={{ color: KP.text }}
            >
              {threeWord?.display || name.trim()}
            </motion.h2>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.0, duration: 1.2 }}
              className="text-[15px] leading-relaxed max-w-[280px] mx-auto"
              style={{ color: KP.muted }}
            >
              Your identity has been woven into the fabric.
            </motion.p>

            {/* Trust seal indicator */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 3.0, duration: 0.8 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ background: `${KP.gold}0a`, border: `1px solid ${KP.gold}15` }}
            >
              <Shield className="w-3 h-3" style={{ color: KP.gold }} />
              <span className="text-[11px] tracking-wider uppercase" style={{ color: KP.muted }}>
                Ceremony sealed · ML-DSA-65
              </span>
            </motion.div>
          </div>
        </div>
      </Shell>
    );
  }

  if (phase === "reveal") {
    const threeWord = ceremonyState?.genesis.sovereign.threeWordName;
    const identity = ceremonyState?.genesis.sovereign.identity;
    const hasHardwareTrust = !!ceremonyState?.teeAttestation?.hardwareBacked;

    return (
      <Shell onClose={onClose}>
        <div className="flex-1 flex items-center justify-center relative">
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 40%, hsl(38 60% 60% / 0.06) 0%, transparent 60%)" }} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 text-center px-8 space-y-6 max-w-sm"
          >
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12 }}
              className="inline-flex items-center justify-center h-24 w-24 rounded-3xl mx-auto"
              style={{ border: `1px solid ${KP.gold}33`, background: `radial-gradient(circle, ${KP.gold}1a 0%, transparent 70%)` }}
            >
              <span className="text-3xl">{identity?.["u:glyph"] || name.trim().charAt(0).toUpperCase()}</span>
            </motion.div>

            <div>
              <h2 className="text-2xl font-display font-semibold" style={{ color: KP.text }}>{threeWord?.display || name.trim()}</h2>
              <p className="text-sm mt-1 font-mono" style={{ color: KP.muted }}>{name.trim()}</p>
            </div>

            {ceremonyState?.seal && (
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] tracking-wider uppercase"
                style={{
                  background: ceremonyState.seal.clean ? `${KP.gold}12` : "hsl(0, 60%, 50%, 0.12)",
                  color: ceremonyState.seal.clean ? KP.gold : "hsl(0, 60%, 60%)",
                  border: `1px solid ${ceremonyState.seal.clean ? KP.gold : "hsl(0, 60%, 50%)"}22`,
                }}
              >
                <Shield className="w-3 h-3" />
                {ceremonyState.seal.clean ? "Ceremony sealed, no interception" : "Seal compromised"}
              </div>
            )}

            {hasHardwareTrust && (
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] tracking-wider uppercase"
                style={{ background: "hsla(142, 40%, 50%, 0.1)", color: "hsl(142, 45%, 55%)", border: "1px solid hsla(142, 40%, 50%, 0.15)" }}
              >
                <Smartphone className="w-3 h-3" />
                Device-bound, hardware trusted
              </div>
            )}

            <p className="text-sm leading-relaxed max-w-xs mx-auto" style={{ color: KP.muted }}>
              Your sovereign identity has been created with post-quantum cryptography (ML-DSA-65)
              {hasHardwareTrust
                ? " and anchored to your device's secure enclave."
                : ". Everything is private by default."
              }
            </p>

            <button
              onClick={handleFinishReveal}
              className="min-w-[180px] min-h-[48px] px-10 py-3.5 rounded-2xl text-[15px] font-semibold active:scale-95 hover:brightness-110 transition-all cursor-pointer flex items-center justify-center gap-2 mx-auto"
              style={{ background: KP.gold, color: KP.bg }}
            >
              Enter My Space
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      </Shell>
    );
  }

  // ── Dashboard ──
  return (
    <Shell onClose={onClose}>
      <MySpaceDashboard onClose={onClose} onSignOut={handleSignOut} />
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// Extracted components
// ═══════════════════════════════════════════════════════════════

function Shell({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="w-full h-full flex flex-col select-none relative" style={{ background: KP.bg, fontFamily: KP.font }}>
      <div className="flex items-center gap-3 px-6 py-4 shrink-0" style={{ borderBottom: `1px solid ${KP.border}` }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${KP.gold}18` }}>
          <Shield className="w-4 h-4" strokeWidth={1.4} style={{ color: KP.gold }} />
        </div>
        <span className="text-[15px] font-semibold tracking-wide" style={{ color: KP.text }}>My Space</span>
        <div className="flex-1" />
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer" style={{ color: KP.muted }}>
          ✕
        </button>
      </div>
      {children}
    </div>
  );
}

function OAuthButton({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className="w-full min-h-[48px] flex items-center justify-center gap-3 px-6 py-3 rounded-2xl text-[15px] font-medium hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
      style={{ border: `1px solid ${KP.border}`, background: KP.card, color: KP.text }}
    >
      {icon}
      {label}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
  );
}
