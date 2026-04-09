import { ShieldCheck, Key, Lock, Shield, Clock, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import type { Conversation } from "../lib/types";
import { ENCRYPTION_LABEL, SIGNATURE_LABEL, UMP_VERSION } from "../lib/messaging-protocol";
import { EPHEMERAL_PRESETS } from "../lib/ephemeral";
import { toast } from "sonner";

interface Props {
  conversation: Conversation;
  onClose: () => void;
}

export default function ConversationInfo({ conversation, onClose }: Props) {
  const peer = conversation.peer;
  const [updatingTTL, setUpdatingTTL] = useState(false);

  const ephemeral = EPHEMERAL_PRESETS.find(
    (p) => p.seconds === conversation.expiresAfterSeconds,
  );

  const setTTL = async (seconds: number | null) => {
    setUpdatingTTL(true);
    try {
      const { error } = await supabase
        .from("conduit_sessions")
        .update({ expires_after_seconds: seconds } as any)
        .eq("id", conversation.id);

      if (error) throw error;
      const label = EPHEMERAL_PRESETS.find(p => p.seconds === seconds)?.label ?? "Off";
      toast.success(`Disappearing messages: ${label}`);
    } catch {
      toast.error("Failed to update");
    } finally {
      setUpdatingTTL(false);
    }
  };

  return (
    <div className="h-full bg-slate-950/90 border-l border-white/[0.04] flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="h-[60px] flex items-center justify-between px-4 border-b border-white/[0.04] flex-shrink-0">
        <h3 className="text-sm text-white/70 font-medium">Contact Info</h3>
        <button onClick={onClose} className="text-white/30 hover:text-white/60 text-sm transition-colors">
          Close
        </button>
      </div>

      {/* Profile */}
      <div className="flex flex-col items-center py-8 px-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500/30 to-indigo-500/30 border border-white/10 flex items-center justify-center text-2xl font-medium text-white/70 mb-4">
          {peer.uorGlyph ?? peer.displayName?.charAt(0)?.toUpperCase() ?? "?"}
        </div>
        <h2 className="text-lg text-white/90 font-medium">{peer.displayName}</h2>
        {peer.handle && (
          <p className="text-sm text-white/40">@{peer.handle}</p>
        )}
      </div>

      {/* Security Info */}
      <div className="px-4 space-y-4">
        <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-3 space-y-2.5">
          <div className="flex items-center gap-2 text-teal-400/70 text-sm font-medium">
            <ShieldCheck size={16} />
            <span>End-to-End Encrypted</span>
          </div>
          <div className="space-y-1.5 text-[12px]">
            <div className="flex items-center gap-2">
              <Key size={11} className="text-white/25" />
              <span className="text-white/30">Key Exchange:</span>
              <span className="text-white/50 ml-auto">Kyber-1024</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock size={11} className="text-white/25" />
              <span className="text-white/30">Cipher:</span>
              <span className="text-white/50 ml-auto">AES-256-GCM</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield size={11} className="text-white/25" />
              <span className="text-white/30">Signature:</span>
              <span className="text-white/50 ml-auto">{SIGNATURE_LABEL}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 pt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-[10px] text-teal-400/50 font-medium">Post-Quantum Secure · {UMP_VERSION}</span>
          </div>
        </div>

        {/* Disappearing Messages — interactive */}
        <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-3">
          <div className="flex items-center gap-2 text-white/50 text-sm mb-2">
            <Clock size={14} />
            <span>Disappearing Messages</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {EPHEMERAL_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => setTTL(preset.seconds)}
                disabled={updatingTTL}
                className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors border ${
                  conversation.expiresAfterSeconds === preset.seconds
                    ? "bg-teal-500/20 border-teal-500/30 text-teal-300"
                    : "bg-white/[0.04] border-white/[0.08] text-white/40 hover:bg-white/[0.08]"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Session Info */}
        <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-3 space-y-1.5">
          <p className="text-[11px] text-white/25">Session Hash</p>
          <p className="text-[10px] text-white/35 font-mono break-all leading-relaxed">
            {conversation.sessionHash.slice(0, 32)}…
          </p>
          <p className="text-[11px] text-white/25 mt-2">Session Type</p>
          <p className="text-[11px] text-white/40 capitalize">{conversation.sessionType}</p>
        </div>
      </div>
    </div>
  );
}
