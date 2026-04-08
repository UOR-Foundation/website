import { Shield, ShieldCheck, ShieldX, ShieldAlert, Lock, Key } from "lucide-react";
import { motion } from "framer-motion";
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
  bg: string;
}> = {
  active: {
    icon: ShieldCheck,
    label: "End-to-end encrypted",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  expired: {
    icon: ShieldAlert,
    label: "Session expired",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  revoked: {
    icon: ShieldX,
    label: "Session revoked",
    color: "text-red-400",
    bg: "bg-red-500/10",
  },
  none: {
    icon: Shield,
    label: "No session",
    color: "text-[#8696a0]",
    bg: "bg-[#2a3942]",
  },
};

export default function SessionBadge({ status, sessionHash, participantCount, compact = false }: Props) {
  const [expanded, setExpanded] = useState(false);
  const config = statusConfig[status];
  const Icon = config.icon;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-[11px] ${config.color}`}>
        <Icon size={12} />
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${config.color} ${config.bg} hover:opacity-80`}
      >
        <Icon size={13} />
        <span>{config.label}</span>
      </button>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, y: -4, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4 }}
          className="absolute top-full right-0 mt-1 z-50 w-[280px] bg-[#1f2c33] border border-[#2a3942] rounded-xl shadow-xl p-3"
        >
          <div className="space-y-2.5">
            {/* Header */}
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center`}>
                <Icon size={16} className={config.color} />
              </div>
              <div>
                <p className={`text-[12px] font-semibold ${config.color}`}>{config.label}</p>
                <p className="text-[10px] text-[#8696a0]">{UMP_VERSION}</p>
              </div>
            </div>

            {/* Security details */}
            <div className="space-y-1.5 pt-1 border-t border-[#2a3942]">
              <div className="flex items-center gap-2 text-[11px]">
                <Key size={11} className="text-[#8696a0] flex-shrink-0" />
                <span className="text-[#8696a0]">Key Exchange:</span>
                <span className="text-[#e9edef] ml-auto">{ENCRYPTION_LABEL.split(" + ")[0]}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <Lock size={11} className="text-[#8696a0] flex-shrink-0" />
                <span className="text-[#8696a0]">Encryption:</span>
                <span className="text-[#e9edef] ml-auto">{ENCRYPTION_LABEL.split(" + ")[1]}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <Shield size={11} className="text-[#8696a0] flex-shrink-0" />
                <span className="text-[#8696a0]">Signatures:</span>
                <span className="text-[#e9edef] ml-auto">{SIGNATURE_LABEL}</span>
              </div>
            </div>

            {/* Session info */}
            {sessionHash && (
              <div className="pt-1.5 border-t border-[#2a3942]">
                <p className="text-[10px] text-[#8696a0] mb-0.5">Session Token</p>
                <p className="text-[10px] text-[#e9edef] font-mono break-all leading-relaxed opacity-70">
                  {sessionHash.length > 48
                    ? `${sessionHash.slice(0, 24)}…${sessionHash.slice(-12)}`
                    : sessionHash}
                </p>
              </div>
            )}

            {participantCount && participantCount > 0 && (
              <p className="text-[10px] text-[#8696a0]">
                {participantCount} participant{participantCount !== 1 ? "s" : ""} in this session
              </p>
            )}

            {/* Post-quantum badge */}
            <div className="flex items-center gap-1.5 pt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400/80 font-medium">Post-Quantum Secure</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
