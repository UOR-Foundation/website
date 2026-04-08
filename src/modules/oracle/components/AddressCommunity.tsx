/**
 * AddressCommunity — Social layer for UOR addresses.
 * Two display modes:
 *   - "stats": Compact stats bar + reaction buttons (for profile header)
 *   - "discussion": Full comments thread (expanded by default)
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, MessageCircle, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface CommentAuthor {
  display_name: string | null;
  avatar_url: string | null;
  uor_glyph: string | null;
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  author: CommentAuthor;
}

interface SocialData {
  visitCount: number;
  reactions: Record<string, number>;
  totalReactions: number;
  comments: Comment[];
}

const REACTIONS = [
  { key: "resonates", icon: "✦", label: "Resonates", desc: "this makes sense" },
  { key: "useful", icon: "◆", label: "Useful", desc: "I can use this" },
  { key: "elegant", icon: "◇", label: "Elegant", desc: "beautifully structured" },
  { key: "surprising", icon: "★", label: "Surprising", desc: "unexpected" },
] as const;

/* ── Shared data hook ── */
function useSocialData(cid: string) {
  const { user } = useAuth();
  const [data, setData] = useState<SocialData | null>(null);
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [reacting, setReacting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/address-social?cid=${encodeURIComponent(cid)}`,
          { headers: { apikey: anonKey } }
        );
        if (res.ok) setData(await res.json());
      } catch (err) {
        console.error("[AddressCommunity] fetch error:", err);
      }
    };
    load();

    if (user) {
      supabase.functions
        .invoke("address-social", { method: "POST", body: { action: "get_my_reaction", cid } })
        .then(({ data: r }) => { if (r?.reaction) setMyReaction(r.reaction); });
    }

    const channel = supabase
      .channel(`address-comments-${cid}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "address_comments", filter: `address_cid=eq.${cid}` }, () => load())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [cid, user]);

  const handleReaction = useCallback(async (reactionKey: string) => {
    if (!user) { toast("Sign in to react", { icon: "🔒" }); return; }
    if (reacting) return;
    setReacting(true);
    const prevReaction = myReaction;
    const prevData = data;

    setData(prev => {
      if (!prev) return prev;
      const reactions = { ...prev.reactions };
      let totalReactions = prev.totalReactions;
      if (prevReaction) { reactions[prevReaction] = Math.max(0, (reactions[prevReaction] || 0) - 1); totalReactions--; }
      if (prevReaction === reactionKey) { setMyReaction(null); }
      else { reactions[reactionKey] = (reactions[reactionKey] || 0) + 1; totalReactions++; setMyReaction(reactionKey); }
      return { ...prev, reactions, totalReactions };
    });

    try {
      const { error } = await supabase.functions.invoke("address-social", { method: "POST", body: { action: "react", cid, reaction: reactionKey } });
      if (error) throw error;
    } catch { setMyReaction(prevReaction); setData(prevData); toast.error("Failed to react"); }
    finally { setReacting(false); }
  }, [user, reacting, myReaction, data, cid]);

  return { data, myReaction, handleReaction };
}

/* ── Stats Bar (for profile header) ── */
export function AddressSocialStats({ cid }: { cid: string }) {
  const { data, myReaction, handleReaction } = useSocialData(cid);
  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Stats line */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground/50">
        <span className="flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5" />
          {data.visitCount} visitor{data.visitCount !== 1 ? "s" : ""}
        </span>
        <span className="text-muted-foreground/20">·</span>
        <span>{data.totalReactions} reaction{data.totalReactions !== 1 ? "s" : ""}</span>
        <span className="text-muted-foreground/20">·</span>
        <span className="flex items-center gap-1.5">
          <MessageCircle className="w-3.5 h-3.5" />
          {data.comments.length} comment{data.comments.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Reactions */}
      <div className="flex items-center gap-2 flex-wrap">
        {REACTIONS.map((r) => {
          const count = data.reactions[r.key] || 0;
          const isActive = myReaction === r.key;
          return (
            <button
              key={r.key}
              onClick={() => handleReaction(r.key)}
              title={`${r.label} — ${r.desc}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                isActive
                  ? "bg-primary/15 border-primary/30 text-primary shadow-[0_0_12px_-4px_hsl(var(--primary)/0.3)]"
                  : "border-border/15 text-muted-foreground/40 hover:text-foreground/60 hover:border-border/30 hover:bg-muted/5"
              }`}
            >
              <span className="text-base">{r.icon}</span>
              <span>{r.label}</span>
              {count > 0 && (
                <span className={`text-xs font-mono ${isActive ? "text-primary/70" : "text-muted-foreground/30"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Discussion Thread (always expanded) ── */
export function AddressDiscussion({ cid }: { cid: string }) {
  const { user } = useAuth();
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/address-social?cid=${encodeURIComponent(cid)}`,
          { headers: { apikey: anonKey } }
        );
        if (res.ok) {
          const d = await res.json();
          setComments(d.comments || []);
        }
      } catch {}
    };
    load();

    const channel = supabase
      .channel(`address-discussion-${cid}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "address_comments", filter: `address_cid=eq.${cid}` }, () => load())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [cid]);

  const handleComment = async () => {
    if (!user) { toast("Sign in to comment", { icon: "🔒" }); return; }
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("address-social", { method: "POST", body: { action: "comment", cid, content: commentText.trim() } });
      if (error) throw error;
      setCommentText("");
    } catch { toast.error("Failed to post comment"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-primary/60 uppercase tracking-[0.15em]">Discussion</p>

      {comments.length > 0 ? (
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {comments.map((comment) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${comment.parent_id ? "ml-8" : ""}`}
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center text-xs font-mono text-primary/60 shrink-0 mt-0.5">
                {comment.author.uor_glyph?.slice(0, 2) || comment.author.display_name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-foreground/70">
                    {comment.author.display_name || "Anonymous"}
                  </span>
                  <span className="text-xs text-muted-foreground/30">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-foreground/55 mt-0.5 leading-relaxed">{comment.content}</p>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground/30 italic">No comments yet. Be the first.</p>
      )}

      {/* Comment input — always visible */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
          placeholder={user ? "Share a thought…" : "Sign in to comment"}
          disabled={!user}
          maxLength={2000}
          className="flex-1 px-4 py-2.5 rounded-xl bg-muted/5 border border-border/15 text-sm text-foreground/70 placeholder:text-muted-foreground/25 focus:outline-none focus:border-primary/25 transition-colors disabled:opacity-40"
        />
        <button
          onClick={handleComment}
          disabled={!commentText.trim() || submitting || !user}
          className="p-2.5 rounded-xl bg-primary/15 border border-primary/20 text-primary/70 hover:bg-primary/25 hover:text-primary transition-all disabled:opacity-20"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ── Legacy export for backwards compat ── */
export function AddressCommunity({ cid }: { cid: string }) {
  return (
    <div className="space-y-6" style={{ marginTop: "calc(1rem * 1.618)" }}>
      <AddressSocialStats cid={cid} />
      <AddressDiscussion cid={cid} />
    </div>
  );
}
