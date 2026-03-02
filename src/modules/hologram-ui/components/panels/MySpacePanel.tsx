/**
 * MySpacePanel — "One Moment, One Identity"
 * ═══════════════════════════════════════════
 *
 * THE canonical single entry point for identity.
 * Sign-in, ceremony, and dashboard all flow through this panel.
 * No alternate auth paths exist — one door in, one door out.
 *
 * Phases:
 *  1. auth       — Primary: Device biometric (TEE). Fallback: Email/OAuth
 *  2. magic-sent — Waiting for magic link confirmation
 *  3. naming     — Choose a display name
 *  4. creating   — TEE attestation + Vault-isolated founding ceremony
 *  5. reveal     — Identity confirmation with three-word name
 *  6. dashboard  — Personal sovereign dashboard
 *
 * Login Architecture:
 *  - Primary: "Sign in with this device" → WebAuthn assertion (biometric)
 *    Matches stored credential → resolves linked Supabase account
 *  - Fallback: Email magic link / Google / Apple OAuth
 *  - Device loss: Email recovery → re-anchor TEE on new device
 *
 * Security:
 *  - TEE attestation binds the kernel to your device's hardware enclave
 *  - Founding ceremony executes inside CeremonyVault (5-layer isolation)
 *  - Observer-collapse detection aborts on interception
 *  - Multi-device: users can register multiple trusted devices
 *  - Email serves as the recovery channel for device loss
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Mail, Shield, Fingerprint, Lock, Wifi, Smartphone, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { KP } from "@/modules/hologram-os/kernel-palette";

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

type Phase = "loading" | "auth" | "magic-sent" | "naming" | "creating" | "reveal" | "dashboard";

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
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [ceremonyState, setCeremonyState] = useState<CeremonyState | null>(null);
  const [teeStatus, setTeeStatus] = useState<"idle" | "attesting" | "asserting" | "done">("idle");
  const [showEmailFallback, setShowEmailFallback] = useState(false);
  const [deviceBiometricAvailable, setDeviceBiometricAvailable] = useState(false);
  const [deviceHasCredential, setDeviceHasCredential] = useState(false);
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
      // Returning user — emit trust if credential exists
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
    // Session but no profile loaded yet — check DB directly
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

  // ── Auto-focus ──
  useEffect(() => {
    if (phase === "auth" && showEmailFallback) {
      const t = setTimeout(() => inputRef.current?.focus(), 400);
      return () => clearTimeout(t);
    }
    if (phase === "naming") {
      const t = setTimeout(() => nameRef.current?.focus(), 400);
      return () => clearTimeout(t);
    }
  }, [phase, showEmailFallback]);

  // ══════════════════════════════════════════════════════════════
  // Auth handlers
  // ══════════════════════════════════════════════════════════════

  /**
   * PRIMARY LOGIN: Sign in with device biometric (WebAuthn assertion).
   * This uses the TEE credential stored during the founding ceremony.
   * After successful biometric, we look up the linked Supabase session.
   */
  const handleDeviceSignIn = useCallback(async () => {
    const bridge = teeBridgeRef.current;
    try {
      setTeeStatus("asserting");
      const assertion = await bridge.assert("hologram:login:verify");

      if (assertion.userVerified || assertion.userPresent) {
        // Credential verified — now we need to restore the Supabase session.
        // The credential is linked to a Supabase user via localStorage mapping.
        const linkedUserId = localStorage.getItem("hologram:tee:linked-user");
        if (linkedUserId) {
          // Check if there's an active session already
          const { data: { session: existingSession } } = await supabase.auth.getSession();
          if (existingSession) {
            // Session exists, biometric confirmed — proceed
            setTeeStatus("done");
            emitTrustUpdate(true);
            refreshProfile();
            return;
          }
        }

        // No linked session — need email fallback
        setTeeStatus("idle");
        toast.info("Device verified. Please confirm with your email to complete sign-in.");
        setShowEmailFallback(true);
      }
    } catch (err) {
      console.warn("[MySpace] Device sign-in failed:", err);
      setTeeStatus("idle");
      toast.error("Device authentication cancelled or failed. Try email instead.");
      setShowEmailFallback(true);
    }
  }, [refreshProfile]);

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

    const { data: { session: sess } } = await supabase.auth.getSession();
    if (!sess) return;

    try {
      // ── Step 1: TEE Attestation — anchor to device hardware ──
      setTeeStatus("attesting");
      const bridge = teeBridgeRef.current;
      await bridge.detect();

      let teeAttestation: TEEAttestationQuote | null = null;
      if (bridge.isHardwareBacked) {
        try {
          teeAttestation = await bridge.attest(
            sess.user.id,
            name.trim(),
          );
          // Link TEE credential to Supabase user for future device-only logins
          localStorage.setItem("hologram:tee:linked-user", sess.user.id);
          emitTrustUpdate(true);
        } catch (teeErr) {
          console.warn("[MySpace] TEE attestation skipped:", teeErr);
        }
      }
      setTeeStatus("done");

      // ── Step 2: Vault-Isolated Founding Ceremony ──
      const authUser: AuthUser = {
        id: sess.user.id,
        email: sess.user.email,
        displayName: name.trim(),
      };

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
          "Founding self-attestation — genesis node",
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
    if (ceremonyState) setPhase("reveal");
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
    setShowEmailFallback(false);
    setPhase("auth");
  }, [signOut]);

  const radialBg = "radial-gradient(ellipse at 50% 40%, hsl(38 60% 60% / 0.04) 0%, transparent 70%)";

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  if (phase === "loading") {
    return (
      <Shell onClose={onClose}>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </Shell>
    );
  }

  if (phase === "auth") {
    const canUseDevice = deviceBiometricAvailable && deviceHasCredential;

    return (
      <Shell onClose={onClose}>
        <div className="flex-1 flex items-center justify-center relative">
          <div className="absolute inset-0 pointer-events-none" style={{ background: radialBg }} />
          <div className="relative z-10 w-full max-w-sm px-8 animate-fade-in">
            <div className="text-center mb-10">
              <h1 className="text-[28px] font-display font-semibold leading-snug" style={{ color: KP.text }}>
                {canUseDevice ? (
                  <>
                    Welcome back.
                    <br />
                    <span style={{ color: KP.gold }}>Your device knows you.</span>
                  </>
                ) : (
                  <>
                    Let's create something
                    <br />
                    <span style={{ color: KP.gold }}>only yours.</span>
                  </>
                )}
              </h1>
              <p className="text-sm mt-4" style={{ color: KP.muted }}>
                {canUseDevice
                  ? "Sign in with your biometrics — instant, private, hardware-secured."
                  : "Sign in to anchor your identity."
                }
              </p>
            </div>

            <div className="space-y-3">
              {/* ── PRIMARY: Device biometric (if credential exists) ── */}
              {canUseDevice && (
                <>
                  <button
                    onClick={handleDeviceSignIn}
                    disabled={teeStatus === "asserting"}
                    className="w-full min-h-[56px] flex items-center justify-center gap-3 px-6 py-4 rounded-full text-base font-semibold active:scale-[0.98] hover:opacity-90 transition-all cursor-pointer disabled:opacity-60"
                    style={{ background: KP.gold, color: KP.bg }}
                  >
                    {teeStatus === "asserting" ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                        Verifying…
                      </>
                    ) : (
                      <>
                        <Fingerprint className="w-5 h-5" />
                        Sign in with this device
                      </>
                    )}
                  </button>

                  {/* Expandable fallback section */}
                  <button
                    onClick={() => setShowEmailFallback(prev => !prev)}
                    className="w-full flex items-center justify-center gap-2 py-3 text-sm transition-colors cursor-pointer"
                    style={{ color: KP.muted }}
                  >
                    <span>Other sign-in methods</span>
                    <ChevronDown
                      className="w-3.5 h-3.5 transition-transform duration-200"
                      style={{ transform: showEmailFallback ? "rotate(180deg)" : "rotate(0deg)" }}
                    />
                  </button>

                  <div
                    className="overflow-hidden transition-all duration-300 ease-out"
                    style={{
                      maxHeight: showEmailFallback ? "400px" : "0",
                      opacity: showEmailFallback ? 1 : 0,
                    }}
                  >
                    <div className="space-y-3 pt-1">
                      <EmailAndOAuthSection
                        email={email}
                        setEmail={setEmail}
                        inputRef={inputRef}
                        handleMagicLink={handleMagicLink}
                        handleGoogleSignIn={handleGoogleSignIn}
                        handleAppleSignIn={handleAppleSignIn}
                      />
                    </div>
                  </div>

                  {/* Device recovery hint */}
                  <div className="flex items-start gap-2 mt-4 px-2" style={{ color: KP.dim }}>
                    <Smartphone className="w-3 h-3 mt-0.5 shrink-0" />
                    <p className="text-[10px] leading-relaxed">
                      Lost your device? Use email to recover access and re-anchor
                      your identity to a new device.
                    </p>
                  </div>
                </>
              )}

              {/* ── No device credential: Show standard auth ── */}
              {!canUseDevice && (
                <EmailAndOAuthSection
                  email={email}
                  setEmail={setEmail}
                  inputRef={inputRef}
                  handleMagicLink={handleMagicLink}
                  handleGoogleSignIn={handleGoogleSignIn}
                  handleAppleSignIn={handleAppleSignIn}
                />
              )}
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  if (phase === "magic-sent") {
    return (
      <Shell onClose={onClose}>
        <div className="flex-1 flex items-center justify-center relative">
          <div className="absolute inset-0 pointer-events-none" style={{ background: radialBg }} />
          <div className="relative z-10 text-center px-8 animate-fade-in space-y-6 max-w-sm">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full mx-auto" style={{ border: `1px solid ${KP.gold}33`, background: `radial-gradient(circle, ${KP.gold}1a 0%, transparent 70%)` }}>
              <Mail className="h-7 w-7" style={{ color: KP.gold }} />
            </div>
            <div>
              <h2 className="text-2xl font-display font-semibold" style={{ color: KP.text }}>Check your email</h2>
              <p className="text-base mt-3 leading-relaxed" style={{ color: KP.muted }}>
                We sent a link to <span className="font-medium" style={{ color: KP.text }}>{email}</span>. Click it to continue.
              </p>
            </div>
            <button onClick={() => setPhase("auth")} className="text-sm hover:opacity-80 transition-colors cursor-pointer" style={{ color: KP.muted }}>
              Use a different method
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  if (phase === "naming") {
    return (
      <Shell onClose={onClose}>
        <div className="flex-1 flex items-center justify-center relative">
          <div className="absolute inset-0 pointer-events-none" style={{ background: radialBg }} />
          <div className="relative z-10 w-full max-w-md px-8 animate-fade-in">
            <div className="text-center mb-10">
              <h1 className="text-[28px] font-display font-semibold leading-snug" style={{ color: KP.text }}>
                What should we
                <br /><span style={{ color: KP.gold }}>call you?</span>
              </h1>
              <p className="text-xs mt-3" style={{ color: KP.dim }}>
                Your sovereign identity will be anchored to this name.
              </p>
            </div>

            <div className="space-y-6">
              <input
                ref={nameRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && name.trim() && handleCreate()}
                placeholder="Choose a name"
                maxLength={30}
                className="w-full bg-transparent text-center text-xl font-display py-4 outline-none transition-colors"
                style={{ borderBottom: `2px solid ${KP.border}`, color: KP.text }}
                onFocus={(e) => { e.currentTarget.style.borderBottomColor = KP.gold; }}
                onBlur={(e) => { e.currentTarget.style.borderBottomColor = KP.border; }}
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="done"
              />

              <div
                className="flex justify-center transition-all duration-500"
                style={{ opacity: name.trim() ? 1 : 0, transform: name.trim() ? "translateY(0)" : "translateY(8px)", pointerEvents: name.trim() ? "auto" : "none" }}
              >
                <button
                  onClick={handleCreate}
                  className="min-w-[160px] min-h-[48px] px-10 py-3.5 rounded-full text-base font-semibold active:scale-95 hover:opacity-90 transition-all cursor-pointer flex items-center justify-center gap-2"
                  style={{ background: KP.gold, color: KP.bg }}
                >
                  <Fingerprint className="w-4 h-4" />
                  Begin Ceremony
                </button>
              </div>

              <div className="flex items-start gap-2 mt-4" style={{ color: KP.dim }}>
                <Lock className="w-3 h-3 mt-0.5 shrink-0" />
                <p className="text-[10px] leading-relaxed">
                  Your device will ask for biometric verification to create a trusted
                  hardware-bound connection. This binds your identity to this device's
                  secure enclave — so only you, on this device, can access your space.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  if (phase === "creating") {
    return (
      <Shell onClose={onClose}>
        <CeremonyCanvas onComplete={handleCeremonyAnimationComplete} />
        {/* TEE status overlay during ceremony */}
        {teeStatus === "attesting" && (
          <div className="absolute bottom-8 left-0 right-0 flex justify-center animate-fade-in">
            <div
              className="flex items-center gap-2.5 px-5 py-2.5 rounded-full"
              style={{
                background: `${KP.bg}cc`,
                border: `1px solid ${KP.gold}22`,
                backdropFilter: "blur(12px)",
              }}
            >
              <Wifi className="w-3.5 h-3.5" style={{ color: KP.gold }} />
              <span className="text-[11px] tracking-wider" style={{ color: KP.muted }}>
                Connecting to your device's secure enclave…
              </span>
            </div>
          </div>
        )}
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
          <div className="relative z-10 text-center px-8 animate-fade-in space-y-6 max-w-sm">
            <div className="inline-flex items-center justify-center h-24 w-24 rounded-full mx-auto" style={{ border: `1px solid ${KP.gold}33`, background: `radial-gradient(circle, ${KP.gold}1a 0%, transparent 70%)` }}>
              <span className="text-3xl">{identity?.["u:glyph"] || name.trim().charAt(0).toUpperCase()}</span>
            </div>

            <div>
              <h2 className="text-2xl font-display font-semibold" style={{ color: KP.text }}>{threeWord?.display || name.trim()}</h2>
              <p className="text-sm mt-1 font-mono" style={{ color: KP.muted }}>{name.trim()}</p>
            </div>

            {/* Ceremony seal */}
            {ceremonyState?.seal && (
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] tracking-wider uppercase"
                style={{
                  background: ceremonyState.seal.clean ? `${KP.gold}12` : "hsl(0, 60%, 50%, 0.12)",
                  color: ceremonyState.seal.clean ? KP.gold : "hsl(0, 60%, 60%)",
                  border: `1px solid ${ceremonyState.seal.clean ? KP.gold : "hsl(0, 60%, 50%)"}22`,
                }}
              >
                <Shield className="w-3 h-3" />
                {ceremonyState.seal.clean ? "Ceremony sealed · No interception" : "Seal compromised"}
              </div>
            )}

            {/* TEE trust badge */}
            {hasHardwareTrust && (
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] tracking-wider uppercase"
                style={{
                  background: "hsla(142, 40%, 50%, 0.1)",
                  color: "hsl(142, 45%, 55%)",
                  border: "1px solid hsla(142, 40%, 50%, 0.15)",
                }}
              >
                <Wifi className="w-3 h-3" />
                Device-bound · Hardware trusted
              </div>
            )}

            <p className="text-xs leading-relaxed max-w-xs mx-auto" style={{ color: KP.dim }}>
              Your sovereign identity has been created with post-quantum cryptography (ML-DSA-65)
              {hasHardwareTrust
                ? " and anchored to your device's secure enclave. Only you, on this device, hold the key."
                : ". Everything is private by default."
              }
            </p>

            <button
              onClick={handleFinishReveal}
              className="min-w-[160px] min-h-[48px] px-10 py-3.5 rounded-full text-base font-semibold active:scale-95 hover:opacity-90 transition-all cursor-pointer"
              style={{ background: KP.gold, color: KP.bg }}
            >
              Enter My Space
            </button>
          </div>
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

/** Reusable email + OAuth section — used both as primary (new users) and fallback (returning) */
function EmailAndOAuthSection({
  email, setEmail, inputRef, handleMagicLink, handleGoogleSignIn, handleAppleSignIn,
}: {
  email: string;
  setEmail: (v: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  handleMagicLink: () => void;
  handleGoogleSignIn: () => void;
  handleAppleSignIn: () => void;
}) {
  return (
    <>
      <OAuthButton onClick={handleGoogleSignIn} icon={<GoogleIcon />} label="Continue with Google" />
      <OAuthButton onClick={handleAppleSignIn} icon={<AppleIcon />} label="Continue with Apple" />

      <div className="flex items-center gap-4 py-2">
        <div className="flex-1 h-px" style={{ background: KP.border }} />
        <span className="text-xs" style={{ color: KP.muted }}>or</span>
        <div className="flex-1 h-px" style={{ background: KP.border }} />
      </div>

      <div className="space-y-3">
        <input
          ref={inputRef}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleMagicLink()}
          placeholder="your@email.com"
          className="w-full min-h-[48px] bg-transparent rounded-full px-6 py-3 text-base text-center outline-none transition-colors"
          style={{ border: `1px solid ${KP.border}`, color: KP.text }}
          autoComplete="email"
          enterKeyHint="send"
        />
        <div
          className="flex justify-center transition-all duration-500"
          style={{ opacity: email.trim() ? 1 : 0, transform: email.trim() ? "translateY(0)" : "translateY(8px)", pointerEvents: email.trim() ? "auto" : "none" }}
        >
          <button
            onClick={handleMagicLink}
            className="w-full min-h-[48px] flex items-center justify-center gap-2 px-6 py-3 rounded-full text-base font-semibold active:scale-[0.98] hover:opacity-90 transition-all cursor-pointer"
            style={{ background: KP.gold, color: KP.bg }}
          >
            <Mail className="w-4 h-4" />
            Send magic link
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Shell ──────────────────────────────────────────────── */

function Shell({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="w-full h-full flex flex-col select-none relative" style={{ background: KP.bg, fontFamily: KP.font }}>
      <div className="flex items-center gap-3 px-6 py-4 shrink-0" style={{ borderBottom: `1px solid ${KP.border}` }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${KP.gold}18` }}>
          <Shield className="w-4 h-4" strokeWidth={1.4} style={{ color: KP.gold }} />
        </div>
        <span className="text-[16px] font-semibold tracking-wide" style={{ color: KP.text }}>My Space</span>
        <div className="flex-1" />
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer" style={{ color: KP.muted }}>
          ✕
        </button>
      </div>
      {children}
    </div>
  );
}

/* ── OAuth Button ──────────────────────────────────────── */

function OAuthButton({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className="w-full min-h-[48px] flex items-center justify-center gap-3 px-6 py-3 rounded-full text-base font-medium hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
      style={{ border: `1px solid ${KP.border}`, background: KP.card, color: KP.text }}
    >
      {icon}
      {label}
    </button>
  );
}

/* ── Icons ──────────────────────────────────────────────── */

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
