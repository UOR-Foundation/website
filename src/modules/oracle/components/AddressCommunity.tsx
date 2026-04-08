/**
 * AddressCommunity — Social layer for UOR addresses.
 * Two display modes:
 *   - "stats": Compact stats bar + reaction buttons (for profile header)
 *   - "discussion": Full comments thread (expanded by default)
 */

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Eye, MessageCircle, Send, GitFork } from "lucide-react";
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

interface ChildFork {
  child_cid: string;
  fork_note: string | null;
  created_at: string;
}

interface SocialData {
  visitCount: number;
  reactions: Record<string, number>;
  totalReactions: number;
  comments: Comment[];
  forkCount: number;
  forkedFrom: { parent_cid: string; fork_note: string | null; created_at: string } | null;
  childForks: ChildFork[];
}

const REACTIONS = [
  { key: "resonates", icon: "✦", label: "Resonates", desc: "this makes sense" },
  { key: "useful", icon: "◆", label: "Useful", desc: "I can use this" },
  { key: "elegant", icon: "◇", label: "Elegant", desc: "beautifully structured" },
  { key: "surprising", icon: "★", label: "Surprising", desc: "unexpected" },
] as const;

/* ── Shared data hook ── */
export function useSocialData(cid: string) {
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
      .channel(`address-social-${cid}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "address_comments", filter: `address_cid=eq.${cid}` }, () => load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "address_forks", filter: `parent_cid=eq.${cid}` }, () => load())
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
export function AddressSocialStats({ cid, onForkClick }: { cid: string; onForkClick?: () => void }) {
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
        <span className="flex items-center gap-1.5">
          <MessageCircle className="w-3.5 h-3.5" />
          {data.comments.length} comment{data.comments.length !== 1 ? "s" : ""}
        </span>
        <span className="text-muted-foreground/20">·</span>
        <button
          onClick={onForkClick}
          className="flex items-center gap-1.5 hover:text-foreground/70 transition-colors"
        >
          <GitFork className="w-3.5 h-3.5" />
          {data.forkCount} fork{data.forkCount !== 1 ? "s" : ""}
        </button>
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

/* ── Provenance Section ── */
export function AddressProvenance({ cid, onNavigate }: { cid: string; onNavigate: (cid: string) => void }) {
  const { data } = useSocialData(cid);
  if (!data || (!data.forkedFrom && data.forkCount === 0)) return null;

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-primary/60 uppercase tracking-[0.15em] flex items-center gap-2">
        <GitFork className="w-3.5 h-3.5" />
        Provenance
      </p>

      {/* Parent link */}
      {data.forkedFrom && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/15 bg-muted/5">
          <span className="text-muted-foreground/50 text-sm">Forked from</span>
          <button
            onClick={() => onNavigate(data.forkedFrom!.parent_cid)}
            className="font-mono text-sm text-primary/70 hover:text-primary transition-colors truncate"
          >
            {data.forkedFrom.parent_cid.slice(0, 24)}…
          </button>
          {data.forkedFrom.fork_note && (
            <span className="text-xs text-muted-foreground/35 italic truncate">— {data.forkedFrom.fork_note}</span>
          )}
        </div>
      )}

      {/* Child forks */}
      {data.childForks.length > 0 && (
        <div className="space-y-2">
          <span className="text-sm text-muted-foreground/40">{data.forkCount} fork{data.forkCount !== 1 ? "s" : ""}</span>
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
            {data.childForks.map((fork) => (
              <button
                key={fork.child_cid}
                onClick={() => onNavigate(fork.child_cid)}
                className="flex items-center gap-3 w-full text-left px-4 py-2.5 rounded-lg border border-border/10 hover:border-border/25 bg-muted/3 hover:bg-muted/8 transition-all group"
              >
                <GitFork className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
                <span className="font-mono text-sm text-foreground/55 group-hover:text-foreground/80 truncate transition-colors">
                  {fork.child_cid.slice(0, 24)}…
                </span>
                {fork.fork_note && (
                  <span className="text-xs text-muted-foreground/30 italic truncate ml-auto">
                    {fork.fork_note}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
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
