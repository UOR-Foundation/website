/**
 * Identity Security Roadmap — 3-phase progression
 * Uses semantic tokens for theme compatibility.
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Mail, Fingerprint, KeyRound, CheckCircle2,
  Circle, ArrowRight, Loader2, Shield,
} from "lucide-react";

type Phase = 1 | 2 | 3;

interface RoadmapProps {
  isDark: boolean;
}

export const IdentitySecurityRoadmap = ({ isDark }: RoadmapProps) => {
  const [currentPhase, setCurrentPhase] = useState<Phase>(1);
  const [loading, setLoading] = useState(true);
  const [passkeyRegistering, setPasskeyRegistering] = useState(false);
  const [canonicalId, setCanonicalId] = useState<string | null>(null);
  const [sessionCid, setSessionCid] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("uor_canonical_id, session_cid")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (profile?.uor_canonical_id) setCanonicalId(profile.uor_canonical_id);
      if (profile?.session_cid) setSessionCid(profile.session_cid);
      setCurrentPhase(1);
      setLoading(false);
    })();
  }, []);

  const handleAddPasskey = async () => {
    if (!window.PublicKeyCredential) return;
    setPasskeyRegistering(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userIdBytes = new TextEncoder().encode(session.user.id);
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "UOR Foundation", id: window.location.hostname },
          user: {
            id: userIdBytes,
            name: `uor-${session.user.id.slice(0, 8)}`,
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
      if (credential) setCurrentPhase(2);
    } catch {
      // User cancelled
    } finally {
      setPasskeyRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const phases = [
    {
      phase: 1 as Phase, icon: Mail, title: "Email Auth",
      label: "NOW", labelColor: "text-emerald-600 dark:text-emerald-400",
      description: "Sign in with email or Google. Zero friction.",
      status: currentPhase >= 1 ? "active" : "locked",
      bg: "bg-emerald-500/10 border-emerald-500/30",
    },
    {
      phase: 2 as Phase, icon: Fingerprint, title: "Biometric Passkey",
      label: "SOON", labelColor: "text-blue-600 dark:text-blue-400",
      description: "Add fingerprint or face recognition as primary login.",
      status: currentPhase >= 2 ? "active" : "next",
      action: currentPhase < 2 ? handleAddPasskey : undefined,
      actionLabel: "Add Passkey",
      bg: currentPhase >= 2 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-blue-500/10 border-blue-500/30",
    },
    {
      phase: 3 as Phase, icon: KeyRound, title: "Full Sovereignty",
      label: "FUTURE", labelColor: "text-muted-foreground",
      description: "Detach email entirely. Passkey-only or identity transfer.",
      status: currentPhase >= 3 ? "active" : "locked",
      bg: "bg-muted/50 border-border",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-muted-foreground" />
          <span className="text-muted-foreground text-xs font-body font-medium uppercase tracking-wider">Security Progression</span>
        </div>
        <span className="text-sm font-body font-semibold text-emerald-600 dark:text-emerald-400">
          Phase {currentPhase}/3
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-500"
          style={{ width: `${(currentPhase / 3) * 100}%` }}
        />
      </div>

      {/* Phases */}
      <div className="space-y-2 pt-1">
        {phases.map((p, i) => {
          const Icon = p.icon;
          const isActive = p.status === "active";
          const isNext = p.status === "next";
          const isLocked = p.status === "locked";

          return (
            <div key={p.phase}>
              <div className={`border rounded-lg p-3 transition-all duration-200 ${p.bg}`}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {isActive ? (
                      <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                    ) : isNext ? (
                      <Circle size={16} className="text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Circle size={16} className="text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Icon size={13} className={isActive ? "text-emerald-600 dark:text-emerald-400" : isNext ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"} />
                      <span className={`text-sm font-body font-semibold ${isLocked ? "text-muted-foreground" : "text-foreground"}`}>
                        {p.title}
                      </span>
                      <span className={`text-[10px] font-body font-bold uppercase tracking-widest ${p.labelColor}`}>
                        {p.label}
                      </span>
                    </div>
                    <p className={`text-sm font-body ${isLocked ? "text-muted-foreground/40" : "text-muted-foreground"}`}>
                      {p.description}
                    </p>
                  </div>
                  {p.action && isNext && (
                    <button
                      onClick={p.action}
                      disabled={passkeyRegistering}
                      className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-body font-medium transition-all bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500/25 border border-blue-500/30 ${passkeyRegistering ? "opacity-50 cursor-wait" : ""}`}
                    >
                      {passkeyRegistering ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <span className="flex items-center gap-1.5">
                          {p.actionLabel} <ArrowRight size={10} />
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </div>
              {i < phases.length - 1 && (
                <div className="flex justify-start ml-[18px] py-0.5">
                  <div className={`w-px h-2 ${isActive ? "bg-emerald-500/40" : "bg-border"}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {canonicalId && (
        <div className="mt-2 p-3 rounded-lg border border-border bg-muted/50">
          <p className="text-xs font-body font-medium uppercase tracking-wider text-muted-foreground mb-1">Identity Anchor</p>
          <p className="text-sm font-body text-foreground break-all">{canonicalId}</p>
        </div>
      )}
    </div>
  );
};
