/**
 * Identity Security Roadmap — 3-phase progression
 *
 * Phase 1 (Now):   Email auth — zero friction, automatic
 * Phase 2 (Soon):  Passkey (WebAuthn) — biometric primary, email recovery
 * Phase 3 (Future): Detach email — passkey-only or identity transfer
 *
 * Reads the user's profile to determine current phase.
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

  const text = isDark ? "text-white" : "text-gray-900";
  const textMuted = isDark ? "text-gray-400" : "text-gray-500";
  const cardBg = isDark ? "bg-white/[0.03] border-gray-700/40" : "bg-gray-50 border-gray-200";
  const activeBg = isDark ? "bg-emerald-500/10 border-emerald-500/30" : "bg-emerald-50 border-emerald-200";
  const nextBg = isDark ? "bg-blue-500/10 border-blue-500/30" : "bg-blue-50 border-blue-200";
  const futureBg = isDark ? "bg-gray-800/30 border-gray-700/30" : "bg-gray-100/50 border-gray-200/50";

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
      // Phase detection: for now, everyone starts at Phase 1
      // Phase 2 would be set when passkey credential is stored
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
      if (credential) {
        setCurrentPhase(2);
      }
    } catch {
      // User cancelled — no-op
    } finally {
      setPasskeyRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-gray-400" />
      </div>
    );
  }

  const phases = [
    {
      phase: 1 as Phase,
      icon: Mail,
      title: "Email Authentication",
      label: "NOW",
      labelColor: "text-emerald-400",
      description: "Email is your primary login and recovery method. Zero friction — sign in with Google or magic link.",
      status: currentPhase >= 1 ? "active" : "locked",
      detail: sessionCid ? `Session CID: ${sessionCid.slice(0, 16)}…` : null,
      bg: activeBg,
    },
    {
      phase: 2 as Phase,
      icon: Fingerprint,
      title: "Biometric Passkey",
      label: "SOON",
      labelColor: "text-blue-400",
      description: "Add fingerprint or face recognition as your primary login. Email becomes recovery-only.",
      status: currentPhase >= 2 ? "active" : "next",
      action: currentPhase < 2 ? handleAddPasskey : undefined,
      actionLabel: "Add Passkey",
      bg: currentPhase >= 2 ? activeBg : nextBg,
    },
    {
      phase: 3 as Phase,
      icon: KeyRound,
      title: "Full Sovereignty",
      label: "FUTURE",
      labelColor: isDark ? "text-gray-500" : "text-gray-400",
      description: "Detach email entirely. Go passkey-only, or transfer your identity to a new owner.",
      status: currentPhase >= 3 ? "active" : "locked",
      bg: futureBg,
    },
  ];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Shield size={14} className={textMuted} />
          <span className={`${textMuted} text-xs font-mono uppercase tracking-wider`}>Security Progression</span>
        </div>
        <span className={`text-xs font-mono ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>
          Phase {currentPhase}/3
        </span>
      </div>

      {/* Progress bar */}
      <div className={`h-1 rounded-full ${isDark ? "bg-gray-800" : "bg-gray-200"} overflow-hidden`}>
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
                  {/* Status icon */}
                  <div className="mt-0.5">
                    {isActive ? (
                      <CheckCircle2 size={16} className="text-emerald-400" />
                    ) : isNext ? (
                      <Circle size={16} className="text-blue-400" />
                    ) : (
                      <Circle size={16} className={isDark ? "text-gray-600" : "text-gray-300"} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Icon size={13} className={isActive ? "text-emerald-400" : isNext ? "text-blue-400" : (isDark ? "text-gray-500" : "text-gray-400")} />
                      <span className={`text-sm font-mono font-medium ${isLocked ? (isDark ? "text-gray-500" : "text-gray-400") : text}`}>
                        {p.title}
                      </span>
                      <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${p.labelColor}`}>
                        {p.label}
                      </span>
                    </div>
                    <p className={`text-xs font-mono leading-relaxed ${isLocked ? (isDark ? "text-gray-600" : "text-gray-300") : textMuted}`}>
                      {p.description}
                    </p>
                    {p.detail && isActive && (
                      <p className={`text-[10px] font-mono mt-1 ${isDark ? "text-emerald-400/60" : "text-emerald-600/60"}`}>
                        {p.detail}
                      </p>
                    )}
                  </div>

                  {/* Action */}
                  {p.action && isNext && (
                    <button
                      onClick={p.action}
                      disabled={passkeyRegistering}
                      className={`shrink-0 px-3 py-1.5 rounded text-xs font-mono font-medium transition-all duration-200 ${
                        isDark
                          ? "bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/30"
                          : "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200"
                      } ${passkeyRegistering ? "opacity-50 cursor-wait" : ""}`}
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

              {/* Connector line */}
              {i < phases.length - 1 && (
                <div className="flex justify-start ml-[18px] py-0.5">
                  <div className={`w-px h-2 ${isActive ? "bg-emerald-500/40" : (isDark ? "bg-gray-700/40" : "bg-gray-200")}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Canonical ID */}
      {canonicalId && (
        <div className={`mt-2 p-2.5 rounded-lg border ${isDark ? "bg-gray-900/40 border-gray-700/30" : "bg-gray-50 border-gray-200"}`}>
          <p className={`text-[10px] font-mono uppercase tracking-wider ${textMuted} mb-1`}>Identity Anchor</p>
          <p className={`text-xs font-mono ${text} break-all leading-relaxed`}>{canonicalId}</p>
        </div>
      )}
    </div>
  );
};
