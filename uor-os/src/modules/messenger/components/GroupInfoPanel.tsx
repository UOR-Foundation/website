import { useState } from "react";
import { ShieldCheck, Key, Lock, Shield, Clock, Users, UserPlus, Search, Crown, LogOut, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import type { Conversation, GroupMember } from "../lib/types";
import { ENCRYPTION_LABEL, SIGNATURE_LABEL, UMP_VERSION } from "../lib/messaging-protocol";
import { EPHEMERAL_PRESETS } from "../lib/ephemeral";

interface Props {
  conversation: Conversation;
  onClose: () => void;
}

export default function GroupInfoPanel({ conversation, onClose }: Props) {
  const { user } = useAuth();
  const [addingMember, setAddingMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [updatingTTL, setUpdatingTTL] = useState(false);

  const meta = conversation.groupMeta;
  const members = conversation.members ?? [];
  const isAdmin = members.some(m => m.userId === user?.id && m.role === "admin");

  const ephemeral = EPHEMERAL_PRESETS.find(
    (p) => p.seconds === conversation.expiresAfterSeconds,
  );

  const handleSearchMember = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const { data } = await supabase.rpc("search_profiles_by_handle", { search_handle: q });
    if (data) {
      const existingIds = new Set(members.map(m => m.userId));
      setSearchResults((data as any[]).filter(r => !existingIds.has(r.user_id)));
    }
    setSearching(false);
  };

  const addMember = async (userId: string) => {
    if (!user) return;
    try {
      // Add to conduit_sessions participants
      const { error: memberErr } = await supabase
        .from("group_members")
        .insert({
          session_id: conversation.id,
          user_id: userId,
          role: "member",
          invited_by: user.id,
        } as any);

      if (memberErr) throw memberErr;
      toast.success("Member added");
      setAddingMember(false);
      setSearchQuery("");
      setSearchResults([]);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add member");
    }
  };

  const removeMember = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("session_id", conversation.id)
        .eq("user_id", userId);

      if (error) throw error;
      toast.success("Member removed");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to remove member");
    }
  };

  const setTTL = async (seconds: number | null) => {
    setUpdatingTTL(true);
    try {
      const { error } = await supabase
        .from("conduit_sessions")
        .update({ expires_after_seconds: seconds } as any)
        .eq("id", conversation.id);

      if (error) throw error;
      toast.success(seconds ? `Disappearing messages: ${EPHEMERAL_PRESETS.find(p => p.seconds === seconds)?.label}` : "Disappearing messages off");
    } catch (err: any) {
      toast.error("Failed to update");
    } finally {
      setUpdatingTTL(false);
    }
  };

  return (
    <div className="h-full bg-slate-950/90 border-l border-white/[0.04] flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="h-[60px] flex items-center justify-between px-4 border-b border-white/[0.04] flex-shrink-0">
        <h3 className="text-sm text-white/70 font-medium">Group Info</h3>
        <button onClick={onClose} className="text-white/30 hover:text-white/60 text-sm transition-colors">
          Close
        </button>
      </div>

      {/* Group profile */}
      <div className="flex flex-col items-center py-8 px-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500/30 to-teal-500/30 border border-white/10 flex items-center justify-center text-2xl font-medium text-white/70 mb-4">
          {(meta?.name ?? "G").slice(0, 2).toUpperCase()}
        </div>
        <h2 className="text-lg text-white/90 font-medium">{meta?.name ?? "Group"}</h2>
        {meta?.description && (
          <p className="text-sm text-white/40 mt-1 text-center">{meta.description}</p>
        )}
        <p className="text-xs text-white/30 mt-1">{members.length} members</p>
      </div>

      <div className="px-4 space-y-4">
        {/* Security Info */}
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
        </div>

        {/* Disappearing Messages */}
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

        {/* Members */}
        <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-white/50 text-sm">
              <Users size={14} />
              <span>Members ({members.length})</span>
            </div>
            {isAdmin && (
              <button
                onClick={() => setAddingMember(!addingMember)}
                className="text-teal-400/60 hover:text-teal-400 transition-colors"
              >
                <UserPlus size={16} />
              </button>
            )}
          </div>

          {/* Add member search */}
          {addingMember && (
            <div className="mb-3">
              <div className="relative mb-2">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/25" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchMember(e.target.value)}
                  placeholder="Search by handle…"
                  autoFocus
                  className="w-full h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/80 text-[12px] pl-7 pr-2 outline-none placeholder:text-white/20 focus:border-teal-500/30 transition-colors"
                />
              </div>
              {searchResults.map((r: any) => (
                <button
                  key={r.user_id}
                  onClick={() => addMember(r.user_id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors text-left text-xs"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-500/30 to-indigo-500/30 border border-white/10 flex items-center justify-center text-[10px] text-white/60 flex-shrink-0">
                    {r.display_name?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                  <span className="text-white/70 truncate">{r.display_name}</span>
                  <UserPlus size={12} className="text-teal-400/50 ml-auto flex-shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* Member list */}
          <div className="space-y-1">
            {members.map((member) => (
              <div
                key={member.userId}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.03] transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500/25 to-indigo-500/25 border border-white/[0.08] flex items-center justify-center text-[11px] text-white/60 flex-shrink-0">
                  {member.uorGlyph ?? (member.displayName ?? "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-white/70 truncate">
                    {member.displayName ?? "User"}
                    {member.userId === user?.id && " (You)"}
                  </p>
                </div>
                {member.role === "admin" && (
                  <Crown size={12} className="text-amber-400/60 flex-shrink-0" />
                )}
                {isAdmin && member.userId !== user?.id && (
                  <button
                    onClick={() => removeMember(member.userId)}
                    className="text-white/20 hover:text-red-400/60 transition-colors flex-shrink-0"
                  >
                    <LogOut size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Session Info */}
        <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-3 space-y-1.5 mb-4">
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
