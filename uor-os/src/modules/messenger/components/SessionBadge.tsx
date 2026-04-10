import { ShieldCheck, ShieldAlert, ShieldX, Shield, Lock, Key } from "lucide-react";
import { useState } from "react";
import { ENCRYPTION_LABEL, SIGNATURE_LABEL, UMP_VERSION } from "../lib/messaging-protocol";

type SessionStatus = "active" | "expired" | "revoked" | "none";

interface Props {
  status: SessionStatus;
  sessionHash?: string;
  participantCount?: number;
  compact?: boolean;
}

const statusConfig: Record<SessionStatus, {
  icon: typeof Shield;
  label: string;
  color: string;
}> = {
  active: { icon: ShieldCheck, label: "End-to-end encrypted", color: "text-teal-400/70" },
  expired: { icon: ShieldAlert, label: "Session expired", color: "text-amber-400/70" },
  revoked: { icon: ShieldX, label: "Session revoked", color: "text-red-400/70" },
  none: { icon: Shield, label: "No session", color: "text-white/25" },
};

export default function SessionBadge({ status, sessionHash, participantCount, compact = false }: Props) {
  const [expanded, setExpanded] = useState(false);
  const config = statusConfig[status];
  const Icon = config.icon;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-[11px] ${config.color}`}>
        <Icon size={13} />
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors duration-75 ${config.color} bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.06]`}
      >
        <Icon size={13} />
        <span>{config.label}</span>
      </button>

      {expanded && (
        <div className="absolute top-full right-0 mt-1 z-50 w-[280px] bg-slate-900/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl p-3 sov-scale-in">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
                <Icon size={16} className={config.color} />
              </div>
              <div>
                <p className={`text-[12px] font-semibold ${config.color}`}>{config.label}</p>
                <p className="text-[10px] text-white/25">{UMP_VERSION}</p>
              </div>
            </div>

            <div className="space-y-1.5 pt-1 border-t border-white/[0.06]">
              <div className="flex items-center gap-2 text-[11px]">
                <Key size={11} className="text-white/25 flex-shrink-0" />
                <span className="text-white/30">Key Exchange:</span>
                <span className="text-white/60 ml-auto">{ENCRYPTION_LABEL.split(" + ")[0]}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <Lock size={11} className="text-white/25 flex-shrink-0" />
                <span className="text-white/30">Encryption:</span>
                <span className="text-white/60 ml-auto">{ENCRYPTION_LABEL.split(" + ")[1]}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <Shield size={11} className="text-white/25 flex-shrink-0" />
                <span className="text-white/30">Signatures:</span>
                <span className="text-white/60 ml-auto">{SIGNATURE_LABEL}</span>
              </div>
            </div>

            {sessionHash && (
              <div className="pt-1.5 border-t border-white/[0.06]">
                <p className="text-[10px] text-white/25 mb-0.5">Session Token</p>
                <p className="text-[10px] text-white/40 font-mono break-all leading-relaxed">
                  {sessionHash.length > 48
                    ? `${sessionHash.slice(0, 24)}…${sessionHash.slice(-12)}`
                    : sessionHash}
                </p>
              </div>
            )}

            {participantCount && participantCount > 0 && (
              <p className="text-[10px] text-white/25">
                {participantCount} participant{participantCount !== 1 ? "s" : ""} in this session
              </p>
            )}

            <div className="flex items-center gap-1.5 pt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              <span className="text-[10px] text-teal-400/60 font-medium">Post-Quantum Secure</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
