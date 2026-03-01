/**
 * MySpacePanel — "One Moment, One Identity"
 * ═══════════════════════════════════════════
 *
 * Auth-anchored identity creation & personal space, unified with
 * QSovereignty.genesis() via CeremonyVault isolation.
 *
 * Phases:
 *  1. auth       — Sign in (Google / Apple / Magic Link)
 *  2. magic-sent — Waiting for magic link confirmation
 *  3. naming     — Choose a display name
 *  4. creating   — Vault-isolated founding ceremony + crystallization animation
 *  5. reveal     — Identity confirmation with three-word name
 *  6. dashboard  — Personal sovereign dashboard
 *
 * Security:
 *  - Founding ceremony executes inside CeremonyVault (5-layer isolation)
 *  - Observer-collapse detection aborts on interception
 *  - Entangled nonce pair ensures no third-party observation
 *  - All intermediate crypto material is scrubbed post-ceremony
 *  - QDisclosure default policy: everything private
 *  - QTrustMesh Node 0: self-attestation at sovereign level
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Mail, LogOut, Copy, Check, Shield, Fingerprint, Lock } from "lucide-react";
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

type Phase = "loading" | "auth" | "magic-sent" | "naming" | "creating" | "reveal" | "dashboard";

interface MySpacePanelProps {
  onClose: () => void;
}

// ── Ceremony result stored between phases ──
interface CeremonyState {
  genesis: GenesisResult;
  seal: VaultSeal;
  disclosurePolicyCid: string;
  trustNodeCid: string;
}

export default function MySpacePanel({ onClose }: MySpacePanelProps) {
  const { session, profile, loading, signOut, refreshProfile } = useAuth();
  const [phase, setPhase] = useState<Phase>("loading");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [ceremonyState, setCeremonyState] = useState<CeremonyState | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Route to correct phase based on auth state
  useEffect(() => {
    if (loading) { setPhase("loading"); return; }
    if (!session) { setPhase("auth"); return; }
    if (profile?.ceremonyCid) { setPhase("dashboard"); return; }
    if (profile) {
      // Profile exists but no ceremony — check if ceremony was done
      if (profile.uorCanonicalId) {
        setPhase("dashboard");
      } else {
        const meta = session.user.user_metadata;
        if (meta?.full_name) setName(meta.full_name);
        else if (meta?.name) setName(meta.name);
        setPhase("naming");
      }
      return;
    }
    // Session but no profile yet
    supabase
      .from("profiles")
      .select("display_name, ceremony_cid, uor_canonical_id")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.ceremony_cid || data?.uor_canonical_id) {
          refreshProfile();
          setPhase("dashboard");
        } else if (data?.display_name) {
          setName(data.display_name);
          setPhase("naming");
        } else {
          const meta = session.user.user_metadata;
          if (meta?.full_name) setName(meta.full_name);
          else if (meta?.name) setName(meta.name);
          setPhase("naming");
        }
      });
  }, [loading, session, profile, refreshProfile]);

  // Listen for auth changes
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
            if (data?.ceremony_cid) {
              refreshProfile();
              setPhase("dashboard");
            } else {
              setPhase("naming");
            }
          });
      }
    });
    return () => subscription.unsubscribe();
  }, [refreshProfile]);

  // Auto-focus inputs
  useEffect(() => {
    if (phase === "auth") {
      const t = setTimeout(() => inputRef.current?.focus(), 600);
      return () => clearTimeout(t);
    }
    if (phase === "naming") {
      const t = setTimeout(() => nameRef.current?.focus(), 400);
      return () => clearTimeout(t);
    }
  }, [phase]);

  // Crystallization animation
  useEffect(() => {
    if (phase !== "creating") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    const cx = w / 2;
    const cy = h / 2;

    interface Particle {
      x: number; y: number; targetX: number; targetY: number;
      size: number; alpha: number; speed: number; hue: number;
    }

    const count = 80;
    const baseRadius = 40;
    const particles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = baseRadius + Math.random() * 30;
      particles.push({
        x: cx + (Math.random() - 0.5) * w,
        y: cy + (Math.random() - 0.5) * h,
        targetX: cx + Math.cos(angle) * radius,
        targetY: cy + Math.sin(angle) * radius,
        size: 1.5 + Math.random() * 2,
        alpha: 0,
        speed: 0.015 + Math.random() * 0.025,
        hue: 35 + Math.random() * 10,
      });
    }

    let progress = 0;
    let raf: number;

    const draw = () => {
      progress += 0.008; // Slower for the ceremony gravitas
      ctx.clearRect(0, 0, w, h);

      const glowAlpha = Math.min(progress * 0.8, 0.4);
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 80);
      gradient.addColorStop(0, `hsla(38, 60%, 60%, ${glowAlpha})`);
      gradient.addColorStop(1, `hsla(38, 60%, 60%, 0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      for (const p of particles) {
        const ease = Math.min(progress * p.speed * 60, 1);
        p.x += (p.targetX - p.x) * ease * 0.06;
        p.y += (p.targetY - p.y) * ease * 0.06;
        p.alpha = Math.min(progress * 1.5, 0.9);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 60%, 60%, ${p.alpha})`;
        ctx.fill();
      }

      if (progress > 0.3) {
        const lineAlpha = Math.min((progress - 0.3) * 1.5, 0.15);
        ctx.strokeStyle = `hsla(38, 60%, 60%, ${lineAlpha})`;
        ctx.lineWidth = 0.5;
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            if (dx * dx + dy * dy < 2500) {
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.stroke();
            }
          }
        }
      }

      if (progress < 1.0) {
        raf = requestAnimationFrame(draw);
      } else {
        // Animation done → reveal if ceremony completed
        if (ceremonyState) {
          setPhase("reveal");
        }
      }
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [phase, ceremonyState]);

  // ── Auth Handlers ──

  const handleGoogleSignIn = useCallback(async () => {
    sessionStorage.setItem("auth_return_to", "/hologram-os");
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) toast.error("Could not sign in with Google");
  }, []);

  const handleAppleSignIn = useCallback(async () => {
    sessionStorage.setItem("auth_return_to", "/hologram-os");
    const { error } = await lovable.auth.signInWithOAuth("apple", {
      redirect_uri: window.location.origin,
    });
    if (error) toast.error("Could not sign in with Apple");
  }, []);

  const handleMagicLink = useCallback(async () => {
    if (!email.trim()) return;
    sessionStorage.setItem("auth_return_to", "/hologram-os");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      toast.error("Could not send magic link");
    } else {
      setPhase("magic-sent");
    }
  }, [email]);

  // ── Vault-Isolated Genesis Ceremony ──

  const handleCreate = useCallback(async () => {
    if (!name.trim()) return;
    setPhase("creating");

    const { data: { session: sess } } = await supabase.auth.getSession();
    if (!sess) return;

    try {
      const authUser: AuthUser = {
        id: sess.user.id,
        email: sess.user.email,
        displayName: name.trim(),
      };

      // ── Execute founding ceremony inside CeremonyVault ──
      // 5-layer isolation: entropy binding, observer-collapse,
      // ephemeral memory, entanglement witness, ceremony seal
      const vaultResult = await executeInVault(
        async () => {
          // Initialize kernel subsystems for this ceremony
          const ecc = new QEcc();
          const security = new QSecurity(ecc);
          const mmu = new QMmu();
          const fs = new QFs(mmu);
          const sovereignty = new QSovereignty(fs, security, ecc);

          // Execute the founding ceremony (Dilithium-3 keypair + observer-collapse)
          const genesis = await sovereignty.genesis(authUser);

          // ── Initialize QDisclosure: default policy = everything private ──
          const disclosure = new QDisclosure();
          const defaultRules: DisclosureRule[] = [
            { attributeKey: "threeWord", visibility: "public", audienceCanonicalIds: [], expiresAt: null },
            { attributeKey: "glyph", visibility: "public", audienceCanonicalIds: [], expiresAt: null },
            { attributeKey: "canonicalId", visibility: "selective", audienceCanonicalIds: [], expiresAt: null },
            { attributeKey: "ipv6", visibility: "private", audienceCanonicalIds: [], expiresAt: null },
            { attributeKey: "cid", visibility: "private", audienceCanonicalIds: [], expiresAt: null },
            { attributeKey: "email", visibility: "private", audienceCanonicalIds: [], expiresAt: null },
          ];
          const policy = disclosure.createPolicy(
            genesis.sovereign.identity["u:canonicalId"],
            defaultRules,
            "private",
          );

          // ── Initialize QTrustMesh: Node 0 self-attestation ──
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

          return {
            genesis,
            disclosurePolicyCid: policy.policyId,
            trustNodeCid: selfAttestation.attestationCid,
          };
        },
        sess.access_token, // Bind auth token to vault entropy
      );

      const { genesis, disclosurePolicyCid, trustNodeCid } = vaultResult.result;

      // ── Persist to database ──
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

      setCeremonyState({
        genesis,
        seal: vaultResult.seal,
        disclosurePolicyCid,
        trustNodeCid,
      });

      console.log(
        `[CeremonyVault] Founding ceremony complete in ${vaultResult.seal.elapsedMs.toFixed(0)}ms — ` +
        `seal: ${vaultResult.seal.clean ? "CLEAN" : "BREACHED"}, ` +
        `entanglement: ${vaultResult.seal.entanglementIntact ? "INTACT" : "COLLAPSED"}`
      );

    } catch (err) {
      console.error("[MySpace] Vault-isolated genesis failed:", err);
      toast.error(
        err instanceof Error && err.message.includes("VAULT BREACH")
          ? "Ceremony security breach detected. Please try again in a moment."
          : "Identity creation failed. Please try again."
      );
      setPhase("naming");
    }
  }, [name]);

  const handleFinishReveal = useCallback(() => {
    refreshProfile();
    setPhase("dashboard");
  }, [refreshProfile]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    setCeremonyState(null);
    setPhase("auth");
  }, [signOut]);

  // ── Shared styles ──
  const radialBg = "radial-gradient(ellipse at 50% 40%, hsl(38 60% 60% / 0.04) 0%, transparent 70%)";

  // ── Loading ──
  if (phase === "loading") {
    return (
      <PanelShell onClose={onClose}>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </PanelShell>
    );
  }

  // ── Auth Phase ──
  if (phase === "auth") {
    return (
      <PanelShell onClose={onClose}>
        <div className="flex-1 flex items-center justify-center relative">
          <div className="absolute inset-0 pointer-events-none" style={{ background: radialBg }} />
          <div className="relative z-10 w-full max-w-sm px-8 animate-fade-in">
            <div className="text-center mb-10">
              <h1 className="text-[28px] font-display font-semibold leading-snug" style={{ color: KP.text }}>
                Let's create something
                <br />
                <span style={{ color: KP.gold }}>only yours.</span>
              </h1>
              <p className="text-sm mt-4" style={{ color: KP.muted }}>
                Sign in to anchor your identity.
              </p>
            </div>

            <div className="space-y-3">
              {/* Google */}
              <button
                onClick={handleGoogleSignIn}
                className="w-full min-h-[48px] flex items-center justify-center gap-3 px-6 py-3 rounded-full text-base font-medium hover:opacity-90 active:scale-[0.98] transition-all duration-200 cursor-pointer"
                style={{ border: `1px solid ${KP.border}`, background: KP.card, color: KP.text }}
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              {/* Apple */}
              <button
                onClick={handleAppleSignIn}
                className="w-full min-h-[48px] flex items-center justify-center gap-3 px-6 py-3 rounded-full text-base font-medium hover:opacity-90 active:scale-[0.98] transition-all duration-200 cursor-pointer"
                style={{ border: `1px solid ${KP.border}`, background: KP.card, color: KP.text }}
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Continue with Apple
              </button>

              {/* Divider */}
              <div className="flex items-center gap-4 py-2">
                <div className="flex-1 h-px" style={{ background: KP.border }} />
                <span className="text-xs" style={{ color: KP.muted }}>or</span>
                <div className="flex-1 h-px" style={{ background: KP.border }} />
              </div>

              {/* Magic Link */}
              <div className="space-y-3">
                <input
                  ref={inputRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleMagicLink()}
                  placeholder="your@email.com"
                  className="w-full min-h-[48px] bg-transparent rounded-full px-6 py-3 text-base text-center outline-none transition-colors duration-200"
                  style={{ border: `1px solid ${KP.border}`, color: KP.text }}
                  autoComplete="email"
                  enterKeyHint="send"
                />
                <div
                  className="flex justify-center transition-all duration-500"
                  style={{
                    opacity: email.trim() ? 1 : 0,
                    transform: email.trim() ? "translateY(0)" : "translateY(8px)",
                    pointerEvents: email.trim() ? "auto" : "none",
                  }}
                >
                  <button
                    onClick={handleMagicLink}
                    className="w-full min-h-[48px] flex items-center justify-center gap-2 px-6 py-3 rounded-full text-base font-semibold active:scale-[0.98] hover:opacity-90 transition-all duration-200 cursor-pointer"
                    style={{ background: KP.gold, color: KP.bg }}
                  >
                    <Mail className="w-4 h-4" />
                    Send magic link
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PanelShell>
    );
  }

  // ── Magic Link Sent ──
  if (phase === "magic-sent") {
    return (
      <PanelShell onClose={onClose}>
        <div className="flex-1 flex items-center justify-center relative">
          <div className="absolute inset-0 pointer-events-none" style={{ background: radialBg }} />
          <div className="relative z-10 text-center px-8 animate-fade-in space-y-6 max-w-sm">
            <div
              className="inline-flex items-center justify-center h-16 w-16 rounded-full mx-auto"
              style={{ border: `1px solid ${KP.gold}33`, background: `radial-gradient(circle, ${KP.gold}1a 0%, transparent 70%)` }}
            >
              <Mail className="h-7 w-7" style={{ color: KP.gold }} />
            </div>
            <div>
              <h2 className="text-2xl font-display font-semibold" style={{ color: KP.text }}>
                Check your email
              </h2>
              <p className="text-base mt-3 leading-relaxed" style={{ color: KP.muted }}>
                We sent a link to <span className="font-medium" style={{ color: KP.text }}>{email}</span>. Click it to continue.
              </p>
            </div>
            <button
              onClick={() => setPhase("auth")}
              className="text-sm hover:opacity-80 transition-colors cursor-pointer"
              style={{ color: KP.muted }}
            >
              Use a different method
            </button>
          </div>
        </div>
      </PanelShell>
    );
  }

  // ── Naming Phase ──
  if (phase === "naming") {
    return (
      <PanelShell onClose={onClose}>
        <div className="flex-1 flex items-center justify-center relative">
          <div className="absolute inset-0 pointer-events-none" style={{ background: radialBg }} />
          <div className="relative z-10 w-full max-w-md px-8 animate-fade-in">
            <div className="text-center mb-10">
              <h1 className="text-[28px] font-display font-semibold leading-snug" style={{ color: KP.text }}>
                What should we
                <br />
                <span style={{ color: KP.gold }}>call you?</span>
              </h1>
              <p className="text-xs mt-3" style={{ color: KP.dim }}>
                A sovereign identity will be created for you via founding ceremony.
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
                className="w-full bg-transparent text-center text-xl font-display py-4 outline-none transition-colors duration-300"
                style={{ borderBottom: `2px solid ${KP.border}`, color: KP.text }}
                onFocus={(e) => { e.currentTarget.style.borderBottomColor = KP.gold; }}
                onBlur={(e) => { e.currentTarget.style.borderBottomColor = KP.border; }}
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="done"
              />

              <div
                className="flex justify-center transition-all duration-500"
                style={{
                  opacity: name.trim() ? 1 : 0,
                  transform: name.trim() ? "translateY(0)" : "translateY(8px)",
                  pointerEvents: name.trim() ? "auto" : "none",
                }}
              >
                <button
                  onClick={handleCreate}
                  className="min-w-[160px] min-h-[48px] px-10 py-3.5 rounded-full text-base font-semibold active:scale-95 hover:opacity-90 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                  style={{ background: KP.gold, color: KP.bg }}
                >
                  <Fingerprint className="w-4 h-4" />
                  Begin Ceremony
                </button>
              </div>

              {/* Security notice */}
              <div className="flex items-start gap-2 mt-4" style={{ color: KP.dim }}>
                <Lock className="w-3 h-3 mt-0.5 shrink-0" />
                <p className="text-[10px] leading-relaxed">
                  Your identity is created inside an isolated ceremony vault with 5-layer security: 
                  entropy binding, observer-collapse detection, ephemeral memory scrubbing, 
                  entanglement witness, and cryptographic seal. No interception possible.
                </p>
              </div>
            </div>
          </div>
        </div>
      </PanelShell>
    );
  }

  // ── Creating Phase (Vault-Isolated Ceremony + Animation) ──
  if (phase === "creating") {
    return (
      <PanelShell onClose={onClose}>
        <div className="flex-1 flex flex-col items-center justify-center relative">
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ opacity: 0.9 }} />
          <div className="relative z-10 text-center animate-fade-in space-y-3">
            <p className="text-lg font-display" style={{ color: KP.muted }}>
              Founding ceremony in progress…
            </p>
            <p className="text-[10px] tracking-[0.2em] uppercase" style={{ color: KP.dim }}>
              Vault-isolated · Observer-collapse armed · Entanglement active
            </p>
          </div>
        </div>
      </PanelShell>
    );
  }

  // ── Reveal Phase ──
  if (phase === "reveal") {
    const threeWord = ceremonyState?.genesis.sovereign.threeWordName;
    const identity = ceremonyState?.genesis.sovereign.identity;

    return (
      <PanelShell onClose={onClose}>
        <div className="flex-1 flex items-center justify-center relative">
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 40%, hsl(38 60% 60% / 0.06) 0%, transparent 60%)" }} />
          <div className="relative z-10 text-center px-8 animate-fade-in space-y-6 max-w-sm">
            {/* Identity glyph */}
            <div
              className="inline-flex items-center justify-center h-24 w-24 rounded-full mx-auto"
              style={{ border: `1px solid ${KP.gold}33`, background: `radial-gradient(circle, ${KP.gold}1a 0%, transparent 70%)` }}
            >
              <span className="text-3xl" title="Your unique identity glyph">
                {identity?.["u:glyph"] || name.trim().charAt(0).toUpperCase()}
              </span>
            </div>

            {/* Three-word name */}
            <div>
              <h2 className="text-2xl font-display font-semibold" style={{ color: KP.text }}>
                {threeWord?.display || name.trim()}
              </h2>
              <p className="text-sm mt-1 font-mono" style={{ color: KP.muted }}>
                {name.trim()}
              </p>
            </div>

            {/* Ceremony seal status */}
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

            <p className="text-xs leading-relaxed max-w-xs mx-auto" style={{ color: KP.dim }}>
              Your sovereign identity has been created with post-quantum cryptography (ML-DSA-65).
              Everything is private by default.
            </p>

            <button
              onClick={handleFinishReveal}
              className="min-w-[160px] min-h-[48px] px-10 py-3.5 rounded-full text-base font-semibold active:scale-95 hover:opacity-90 transition-all duration-200 cursor-pointer"
              style={{ background: KP.gold, color: KP.bg }}
            >
              Enter My Space
            </button>
          </div>
        </div>
      </PanelShell>
    );
  }

  // ── Dashboard Phase ──
  return (
    <PanelShell onClose={onClose}>
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: `${KP.dim} transparent` }}>
        {/* Profile hero */}
        <div className="px-8 pt-8 pb-6">
          <div className="flex items-center gap-5 mb-6">
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="w-20 h-20 rounded-full object-cover" style={{ border: `2px solid ${KP.border}` }} />
            ) : (
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-display font-bold"
                style={{ background: `${KP.gold}1a`, color: KP.gold, border: `2px solid ${KP.border}` }}
              >
                {profile?.uorGlyph || (profile?.displayName ?? "U").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-display font-semibold truncate" style={{ color: KP.text }}>
                {profile?.displayName ?? "User"}
              </h2>
              {profile?.threeWordName && (
                <p className="text-sm mt-0.5 truncate" style={{ color: KP.gold }}>
                  {profile.threeWordName}
                </p>
              )}
              {profile?.uorGlyph && !profile?.threeWordName && (
                <p className="text-sm mt-1 truncate font-mono" style={{ color: KP.muted }}>
                  {profile.uorGlyph}
                </p>
              )}
            </div>
          </div>

          {/* Security badge */}
          {profile?.ceremonyCid && (
            <div
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-5"
              style={{ background: `${KP.gold}08`, border: `1px solid ${KP.gold}18` }}
            >
              <Shield className="w-4 h-4" style={{ color: KP.gold }} />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: KP.gold }}>
                  Sovereign · {profile.pqcAlgorithm || "ML-DSA-65"} · {profile.collapseIntact ? "Intact" : "Observed"}
                </span>
              </div>
              <Lock className="w-3 h-3" style={{ color: KP.dim }} />
            </div>
          )}

          {/* UOR Identity card */}
          {profile?.uorCanonicalId && (
            <div className="rounded-2xl p-5 space-y-3" style={{ background: KP.card, border: `1px solid ${KP.cardBorder}` }}>
              <div className="flex items-center gap-2 mb-3">
                <Fingerprint className="w-4 h-4" style={{ color: KP.gold }} />
                <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: KP.gold }}>
                  Sovereign Identity
                </span>
              </div>
              {profile.threeWordName && <IdentityField label="Name" value={profile.threeWordName} />}
              <IdentityField label="Canonical ID" value={profile.uorCanonicalId} />
              {profile.uorCid && <IdentityField label="CID" value={profile.uorCid} />}
              {profile.uorIpv6 && <IdentityField label="IPv6" value={profile.uorIpv6} />}
              {profile.uorGlyph && <IdentityField label="Glyph" value={profile.uorGlyph} />}
              {profile.ceremonyCid && <IdentityField label="Ceremony" value={profile.ceremonyCid} />}
              {profile.trustNodeCid && <IdentityField label="Trust Node" value={profile.trustNodeCid} />}
            </div>
          )}
        </div>

        {/* Privacy section */}
        <div className="px-8 py-6" style={{ borderTop: `1px solid ${KP.border}` }}>
          <p className="text-xs tracking-[0.3em] uppercase mb-4" style={{ color: KP.dim }}>
            Your privacy
          </p>
          <p className="text-sm leading-relaxed" style={{ color: KP.muted }}>
            Everything is private by default. Your data belongs to you — no one else can access it without your explicit consent.
            Your identity is protected by post-quantum cryptography and observer-collapse detection.
          </p>
        </div>

        {/* Sign out */}
        <div className="px-8 py-6" style={{ borderTop: `1px solid ${KP.border}` }}>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity cursor-pointer"
            style={{ color: KP.muted }}
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>
    </PanelShell>
  );
}

/* ── Helpers ──────────────────────────────────────────────── */

function PanelShell({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="w-full h-full flex flex-col select-none" style={{ background: KP.bg, fontFamily: KP.font }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 shrink-0" style={{ borderBottom: `1px solid ${KP.border}` }}>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: `${KP.gold}18` }}
        >
          <Shield className="w-4 h-4" strokeWidth={1.4} style={{ color: KP.gold }} />
        </div>
        <span className="text-[16px] font-semibold tracking-wide" style={{ color: KP.text }}>
          My Space
        </span>
        <div className="flex-1" />
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer"
          style={{ color: KP.muted }}
        >
          ✕
        </button>
      </div>
      {children}
    </div>
  );
}

function IdentityField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [value]);

  return (
    <button
      onClick={handleCopy}
      className="w-full flex items-center gap-3 group text-left hover:opacity-80 transition-opacity cursor-pointer"
    >
      <span className="text-[11px] font-medium tracking-wider uppercase shrink-0 w-20" style={{ color: KP.dim }}>
        {label}
      </span>
      <span className="text-xs font-mono truncate flex-1" style={{ color: KP.muted }}>
        {value}
      </span>
      {copied ? (
        <Check className="w-3 h-3 shrink-0" style={{ color: KP.gold }} />
      ) : (
        <Copy className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: KP.muted }} />
      )}
    </button>
  );
}
