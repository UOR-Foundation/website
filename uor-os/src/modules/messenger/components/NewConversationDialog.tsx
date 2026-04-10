import { useState } from "react";
import { Search, X, UserPlus, Loader2, Lock, Globe, Link2 } from "lucide-react";
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

export default function NewConversationDialog({ open, onClose, onCreated }: Props) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);
  const [roomVisibility, setRoomVisibility] = useState<"private" | "public">("private");
  const [encryptionEnabled, setEncryptionEnabled] = useState(true);

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);

    const { data, error } = await supabase.rpc("search_profiles_by_handle", {
      search_handle: q,
    });

    if (!error && data) {
      setResults((data as SearchResult[]).filter(r => r.user_id !== user?.id));
    }
    setSearching(false);
  };

  const createSession = async (peerId: string) => {
    if (!user) return;
    setCreating(peerId);

    try {
      const encoder = new TextEncoder();
      const hashBytes = sha256(new Uint8Array(encoder.encode(`${user.id}:${peerId}:${Date.now()}`))
      );
      const sessionHash = Array.from(hashBytes).map(b => b.toString(16).padStart(2, "0")).join("");

      const { data, error } = await supabase.from("conduit_sessions").insert({
        creator_id: user.id,
        participants: [user.id, peerId],
        session_hash: sessionHash,
        session_type: "direct",
      }).select("id").single();

      if (error) throw error;
      if (data) {
        toast.success("Conversation created");
        onCreated(data.id);
        onClose();
      }
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create conversation");
    } finally {
      setCreating(null);
    }
  };

  const handleCopyInviteLink = () => {
    const link = `${window.location.origin}/invite/${Date.now().toString(36)}`;
    navigator.clipboard.writeText(link).then(() => toast.success("Invite link copied"));
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20"
        onClick={onClose}
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
            <h2 className="text-white/90 text-lg font-medium">New Conversation</h2>
            <button onClick={onClose} className="text-white/40 hover:text-white/70 transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Room options */}
          <div className="px-4 pt-3 pb-2 flex items-center gap-3">
            {/* Visibility toggle */}
            <button
              onClick={() => setRoomVisibility(v => v === "private" ? "public" : "private")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all border ${
                roomVisibility === "private"
                  ? "bg-teal-500/10 border-teal-500/20 text-teal-400/80"
                  : "bg-white/[0.04] border-white/[0.06] text-white/50"
              }`}
            >
              {roomVisibility === "private" ? <Lock size={12} /> : <Globe size={12} />}
              {roomVisibility === "private" ? "Private" : "Public"}
            </button>

            {/* Encryption toggle */}
            <button
              onClick={() => setEncryptionEnabled(e => !e)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all border ${
                encryptionEnabled
                  ? "bg-teal-500/10 border-teal-500/20 text-teal-400/80"
                  : "bg-white/[0.04] border-white/[0.06] text-white/40"
              }`}
            >
              <Lock size={12} />
              E2EE {encryptionEnabled ? "On" : "Off"}
            </button>

            {/* Invite via link */}
            <button
              onClick={handleCopyInviteLink}
              className="ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all"
            >
              <Link2 size={12} />
              Invite link
            </button>
          </div>

          {/* Search */}
          <div className="px-4 pb-3">
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
          <div className="max-h-[300px] overflow-y-auto px-2 pb-4">
            {searching && (
              <div className="flex items-center justify-center py-8 text-white/40">
                <Loader2 size={20} className="animate-spin" />
              </div>
            )}

            {!searching && results.length === 0 && query.length >= 2 && (
              <p className="text-center text-white/30 text-sm py-8">No users found</p>
            )}

            {results.map((r) => (
              <button
                key={r.user_id}
                onClick={() => createSession(r.user_id)}
                disabled={creating === r.user_id}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500/30 to-indigo-500/30 border border-white/10 flex items-center justify-center text-white/70 text-sm font-medium flex-shrink-0">
                  {r.uor_glyph ?? r.display_name?.charAt(0)?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/90 text-sm truncate">{r.display_name}</p>
                  {r.handle && <p className="text-white/40 text-xs truncate">@{r.handle}</p>}
                </div>
                {creating === r.user_id ? (
                  <Loader2 size={16} className="animate-spin text-teal-400" />
                ) : (
                  <UserPlus size={16} className="text-white/30" />
                )}
              </button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
