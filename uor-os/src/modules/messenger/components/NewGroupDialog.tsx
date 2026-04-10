import { useState } from "react";
import { Search, X, Users, Loader2, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { sha256 } from "@noble/hashes/sha2.js";

interface SearchResult {
  user_id: string;
  display_name: string;
  handle: string;
  uor_glyph: string | null;
  avatar_url: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (sessionId: string) => void;
}

export default function NewGroupDialog({ open, onClose, onCreated }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<"members" | "details">("members");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchResult[]>([]);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    const { data, error } = await supabase.rpc("search_profiles_by_handle", { search_handle: q });
    if (!error && data) {
      setResults((data as SearchResult[]).filter(r => r.user_id !== user?.id));
    }
    setSearching(false);
  };

  const toggleSelect = (r: SearchResult) => {
    setSelected(prev =>
      prev.some(s => s.user_id === r.user_id)
        ? prev.filter(s => s.user_id !== r.user_id)
        : [...prev, r]
    );
  };

  const createGroup = async () => {
    if (!user || selected.length < 1 || !groupName.trim()) return;
    setCreating(true);

    try {
      const participants = [user.id, ...selected.map(s => s.user_id)];
      const encoder = new TextEncoder();
      const hashBytes = sha256(new Uint8Array(encoder.encode(`group:${user.id}:${participants.join(",")}:${Date.now()}`)));
      const sessionHash = Array.from(hashBytes).map(b => b.toString(16).padStart(2, "0")).join("");

      // Create session
      const { data: session, error: sessionErr } = await supabase
        .from("conduit_sessions")
        .insert({
          creator_id: user.id,
          participants,
          session_hash: sessionHash,
          session_type: "group",
        })
        .select("id")
        .single();

      if (sessionErr || !session) throw sessionErr ?? new Error("Failed to create session");

      // Create group metadata
      const { error: metaErr } = await supabase
        .from("group_metadata")
        .insert({
          session_id: session.id,
          name: groupName.trim(),
          description: groupDesc.trim() || null,
          created_by: user.id,
        } as any);

      if (metaErr) throw metaErr;

      // Insert all group members (including self as admin)
      const memberRows = participants.map((uid) => ({
        session_id: session.id,
        user_id: uid,
        role: uid === user.id ? "admin" : "member",
        invited_by: user.id,
      }));

      const { error: membersErr } = await supabase
        .from("group_members")
        .insert(memberRows as any);

      if (membersErr) throw membersErr;

      toast.success("Group created");
      onCreated(session.id);
      handleClose();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setStep("members");
    setSelected([]);
    setGroupName("");
    setGroupDesc("");
    setQuery("");
    setResults([]);
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md mx-4 rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-teal-400/70" />
              <h2 className="text-white/90 text-lg font-medium">
                {step === "members" ? "New Group" : "Group Details"}
              </h2>
            </div>
            <button onClick={handleClose} className="text-white/40 hover:text-white/70 transition-colors">
              <X size={20} />
            </button>
          </div>

          {step === "members" ? (
            <>
              {/* Selected chips */}
              {selected.length > 0 && (
                <div className="px-4 pt-3 flex flex-wrap gap-1.5">
                  {selected.map(s => (
                    <span
                      key={s.user_id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-500/15 text-teal-300/80 text-xs border border-teal-500/20"
                    >
                      {s.display_name}
                      <button onClick={() => toggleSelect(s)} className="hover:text-white/80">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Search */}
              <div className="p-4">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search by handle…"
                    autoFocus
                    className="w-full h-10 rounded-xl bg-white/5 border border-white/10 text-white/90 text-sm pl-9 pr-3 outline-none placeholder:text-white/30 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Results */}
              <div className="max-h-[250px] overflow-y-auto px-2 pb-3">
                {searching && (
                  <div className="flex items-center justify-center py-8 text-white/40">
                    <Loader2 size={20} className="animate-spin" />
                  </div>
                )}
                {results.map((r) => {
                  const isSelected = selected.some(s => s.user_id === r.user_id);
                  return (
                    <button
                      key={r.user_id}
                      onClick={() => toggleSelect(r)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left"
                    >
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500/30 to-indigo-500/30 border border-white/10 flex items-center justify-center text-white/70 text-sm font-medium flex-shrink-0">
                        {r.uor_glyph ?? r.display_name?.charAt(0)?.toUpperCase() ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white/90 text-sm truncate">{r.display_name}</p>
                        {r.handle && <p className="text-white/40 text-xs truncate">@{r.handle}</p>}
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                        isSelected ? "bg-teal-500/80 border-teal-400" : "border-white/20"
                      }`}>
                        {isSelected && <Check size={12} className="text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Next button */}
              <div className="p-4 border-t border-white/5">
                <button
                  onClick={() => setStep("details")}
                  disabled={selected.length < 1}
                  className="w-full py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-30 bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 border border-teal-500/20"
                >
                  Next — {selected.length} selected
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Group details */}
              <div className="p-4 space-y-3">
                <div>
                  <label className="text-xs text-white/40 block mb-1.5">Group Name</label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Enter group name…"
                    autoFocus
                    className="w-full h-10 rounded-xl bg-white/5 border border-white/10 text-white/90 text-sm px-3 outline-none placeholder:text-white/30 focus:border-teal-500/50 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/40 block mb-1.5">Description (optional)</label>
                  <textarea
                    value={groupDesc}
                    onChange={(e) => setGroupDesc(e.target.value)}
                    placeholder="What's this group about?"
                    rows={2}
                    className="w-full rounded-xl bg-white/5 border border-white/10 text-white/90 text-sm px-3 py-2 outline-none placeholder:text-white/30 focus:border-teal-500/50 transition-all resize-none"
                  />
                </div>

                {/* Members preview */}
                <div>
                  <p className="text-xs text-white/40 mb-2">{selected.length + 1} members</p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2 py-1 rounded-full bg-indigo-500/15 text-indigo-300/70 text-xs border border-indigo-500/20">
                      You (Admin)
                    </span>
                    {selected.map(s => (
                      <span key={s.user_id} className="px-2 py-1 rounded-full bg-white/[0.06] text-white/50 text-xs border border-white/[0.08]">
                        {s.display_name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-white/5 flex gap-2">
                <button
                  onClick={() => setStep("members")}
                  className="flex-1 py-2.5 rounded-xl text-sm text-white/50 hover:bg-white/5 transition-colors border border-white/10"
                >
                  Back
                </button>
                <button
                  onClick={createGroup}
                  disabled={creating || !groupName.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-30 bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 border border-teal-500/20 flex items-center justify-center gap-2"
                >
                  {creating ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
                  Create Group
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
