/**
 * SecurityMethodsPanel — Manage authentication fallback methods
 * ══════════════════════════════════════════════════════════════
 *
 * Each auth method is a "key" to the sovereign space:
 *   - TEE (device biometric) — hardware-bound, fastest
 *   - Email (magic link) — universal recovery
 *   - Google / Apple OAuth — convenience
 *
 * Users can add methods as fallbacks for account recovery.
 * The philosophy: lose one key, use another. Never locked out.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Fingerprint, Mail, Shield, ChevronLeft, Plus, Check,
  Smartphone, Key, AlertTriangle, Lock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { KP } from "@/modules/hologram-os/kernel-palette";
import { motion, AnimatePresence } from "framer-motion";
import { TEEBridge } from "@/hologram/kernel/tee-bridge";

interface SecurityMethodsPanelProps {
  onBack: () => void;
}

interface AuthMethod {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  active: boolean;
  primary?: boolean;
  addable: boolean;
  onAdd?: () => void;
}

export default function SecurityMethodsPanel({ onBack }: SecurityMethodsPanelProps) {
  const { user, profile } = useAuth();
  const [hasTee, setHasTee] = useState(false);
  const [hasEmail, setHasEmail] = useState(false);
  const [teeAvailable, setTeeAvailable] = useState(false);
  const [addingEmail, setAddingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [attestingTee, setAttestingTee] = useState(false);
  const teeBridgeRef = useRef(new TEEBridge());
  const emailRef = useRef<HTMLInputElement>(null);

  // ── Detect current methods ──
  useEffect(() => {
    // Check TEE credential
    try {
      setHasTee(!!localStorage.getItem("hologram:tee:credential"));
    } catch { setHasTee(false); }

    // Check if user has email
    if (user?.email) setHasEmail(true);

    // Check TEE availability
    teeBridgeRef.current.detect().then((caps) => {
      setTeeAvailable(caps.provider === "webauthn-platform" || caps.provider === "webauthn-roaming");
    });
  }, [user]);

  // ── Add TEE credential ──
  const handleAddTee = useCallback(async () => {
    if (!user) return;
    setAttestingTee(true);
    try {
      const bridge = teeBridgeRef.current;
      await bridge.detect();
      if (!bridge.isHardwareBacked) {
        toast.error("No biometric hardware detected on this device.");
        return;
      }
      await bridge.attest(user.id, profile?.displayName ?? "User");
      localStorage.setItem("hologram:tee:linked-user", user.id);
      setHasTee(true);
      window.dispatchEvent(new CustomEvent("hologram:tee-update", { detail: { trusted: true } }));
      toast.success("Device biometric registered as a recovery method.");
    } catch (err) {
      console.warn("[SecurityMethods] TEE attestation failed:", err);
      toast.error("Biometric registration cancelled.");
    } finally {
      setAttestingTee(false);
    }
  }, [user, profile]);

  // ── Add email fallback ──
  const handleLinkEmail = useCallback(async () => {
    if (!emailInput.trim()) return;
    try {
      // If user already has an email, we update; otherwise we link
      const { error } = await supabase.auth.updateUser({
        email: emailInput.trim(),
      });
      if (error) throw error;
      setEmailSent(true);
      toast.success("Verification email sent. Check your inbox.");
    } catch (err) {
      console.error("[SecurityMethods] Email link failed:", err);
      toast.error("Could not link email. Try again.");
    }
  }, [emailInput]);

  // ── Focus email input ──
  useEffect(() => {
    if (addingEmail) {
      const t = setTimeout(() => emailRef.current?.focus(), 300);
      return () => clearTimeout(t);
    }
  }, [addingEmail]);

  // ── Build methods list ──
  const methods: AuthMethod[] = [
    {
      id: "tee",
      label: "Device Biometric",
      description: hasTee
        ? "Registered — this device's secure enclave is linked."
        : "Use Face ID, Touch ID, or Windows Hello to sign in instantly.",
      icon: <Fingerprint className="w-5 h-5" />,
      active: hasTee,
      addable: !hasTee && teeAvailable,
      onAdd: handleAddTee,
    },
    {
      id: "email",
      label: "Email Recovery",
      description: hasEmail
        ? `Linked to ${user?.email ?? "your email"}.`
        : "Add an email as a universal recovery channel.",
      icon: <Mail className="w-5 h-5" />,
      active: hasEmail,
      addable: !hasEmail,
      onAdd: () => setAddingEmail(true),
    },
  ];

  const activeCount = methods.filter((m) => m.active).length;

  return (
    <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: `${KP.dim} transparent` }}>
      {/* ── Header ── */}
      <div className="px-6 pt-6 pb-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-xl hover:opacity-70 transition-opacity cursor-pointer"
          style={{ color: KP.muted }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-display font-semibold" style={{ color: KP.text }}>
            Security methods
          </h1>
          <p className="text-sm mt-0.5" style={{ color: KP.muted }}>
            Each method is a key to your space. More keys, more resilience.
          </p>
        </div>
      </div>

      {/* ── Security strength indicator ── */}
      <div className="px-6 mb-6">
        <div
          className="rounded-2xl p-5"
          style={{
            background: activeCount >= 2
              ? `${KP.gold}08`
              : "hsl(0 60% 50% / 0.06)",
            border: `1px solid ${activeCount >= 2 ? `${KP.gold}18` : "hsl(0 60% 50% / 0.15)"}`,
          }}
        >
          <div className="flex items-center gap-3">
            {activeCount >= 2 ? (
              <Shield className="w-5 h-5 shrink-0" style={{ color: KP.gold }} />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0" style={{ color: "hsl(0 60% 60%)" }} />
            )}
            <div>
              <p className="text-sm font-medium" style={{ color: KP.text }}>
                {activeCount >= 2
                  ? "Resilient — multiple recovery paths active"
                  : activeCount === 1
                    ? "Vulnerable — add a fallback method"
                    : "No methods — set up authentication"
                }
              </p>
              <p className="text-[13px] mt-1" style={{ color: KP.muted }}>
                {activeCount} of {methods.length} methods active.
                {activeCount < 2 && " We recommend at least two."}
              </p>
            </div>
          </div>

          {/* Strength bar */}
          <div className="mt-4 h-1.5 rounded-full overflow-hidden" style={{ background: `${KP.border}` }}>
            <motion.div
              className="h-full rounded-full"
              style={{
                background: activeCount >= 2 ? KP.gold : "hsl(0 60% 55%)",
              }}
              initial={{ width: 0 }}
              animate={{ width: `${(activeCount / methods.length) * 100}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      {/* ── Methods list ── */}
      <div className="px-6 space-y-3">
        {methods.map((method) => (
          <motion.div
            key={method.id}
            layout
            className="rounded-2xl overflow-hidden"
            style={{
              background: KP.card,
              border: `1px solid ${method.active ? `${KP.gold}22` : KP.cardBorder}`,
            }}
          >
            <div className="p-5 flex items-start gap-4">
              {/* Icon */}
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: method.active ? `${KP.gold}15` : `${KP.muted}10`,
                  color: method.active ? KP.gold : KP.dim,
                }}
              >
                {method.icon}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-medium" style={{ color: KP.text }}>
                    {method.label}
                  </span>
                  {method.active && (
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider"
                      style={{ background: `${KP.gold}18`, color: KP.gold }}
                    >
                      <Check className="w-2.5 h-2.5" />
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[13px] mt-1 leading-relaxed" style={{ color: KP.muted }}>
                  {method.description}
                </p>
              </div>

              {/* Action */}
              {method.addable && method.onAdd && (
                <button
                  onClick={method.onAdd}
                  disabled={method.id === "tee" && attestingTee}
                  className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all hover:brightness-110 active:scale-[0.97] cursor-pointer disabled:opacity-50"
                  style={{ background: `${KP.gold}18`, color: KP.gold }}
                >
                  {method.id === "tee" && attestingTee ? (
                    <motion.div
                      className="w-3.5 h-3.5 border-2 rounded-full"
                      style={{ borderColor: `${KP.gold}33`, borderTopColor: KP.gold }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  Add
                </button>
              )}
            </div>

            {/* Expanded email form */}
            <AnimatePresence>
              {method.id === "email" && addingEmail && !hasEmail && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 pt-1">
                    <div className="h-px mb-4" style={{ background: KP.border }} />
                    {emailSent ? (
                      <div className="flex items-center gap-3 py-2">
                        <Check className="w-4 h-4 shrink-0" style={{ color: KP.gold }} />
                        <p className="text-sm" style={{ color: KP.muted }}>
                          Verification sent to <span style={{ color: KP.text }}>{emailInput}</span>.
                          Check your inbox.
                        </p>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          ref={emailRef}
                          type="email"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleLinkEmail()}
                          placeholder="your@email.com"
                          className="flex-1 bg-transparent rounded-xl px-4 py-2.5 text-sm outline-none transition-all focus:ring-1"
                          style={{
                            border: `1px solid ${KP.border}`,
                            color: KP.text,
                          }}
                          autoComplete="email"
                        />
                        <button
                          onClick={handleLinkEmail}
                          disabled={!emailInput.trim()}
                          className="shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:brightness-110 active:scale-[0.97] cursor-pointer disabled:opacity-40"
                          style={{ background: KP.gold, color: KP.bg }}
                        >
                          Verify
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* ── Philosophy note ── */}
      <div className="px-6 mt-8 mb-10">
        <div className="flex items-start gap-3">
          <Key className="w-4 h-4 mt-0.5 shrink-0" style={{ color: KP.muted }} />
          <p className="text-[13px] leading-relaxed" style={{ color: KP.muted }}>
            Each method is a fallback for the others. Lose your device? Email recovers access.
            Lose your email? Your device biometric unlocks your space.
            The more methods you link, the more resilient your identity becomes.
          </p>
        </div>
      </div>
    </div>
  );
}
