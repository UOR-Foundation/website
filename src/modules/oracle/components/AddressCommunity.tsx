/**
 * AddressCommunity — Social layer for UOR addresses.
 * Reddit-style threaded discussion with voting, collapsing, sorting.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, MessageCircle, Send, GitFork, ChevronUp, ChevronDown, MessageSquare, Minus, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

/* ── Types ── */

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
  score: number;
  author: CommentAuthor;
}

interface CommentNode extends Comment {
  children: CommentNode[];
  childCount: number; // total descendants
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

type SortMode = "best" | "new" | "old" | "controversial";

const REACTIONS = [
  { key: "resonates", icon: "✦", label: "Resonates", desc: "this makes sense" },
  { key: "useful", icon: "◆", label: "Useful", desc: "I can use this" },
  { key: "elegant", icon: "◇", label: "Elegant", desc: "beautifully structured" },
  { key: "surprising", icon: "★", label: "Surprising", desc: "unexpected" },
] as const;

const MAX_DEPTH = 8;

/* ── Tree builder ── */
function buildTree(comments: Comment[]): CommentNode[] {
  const map = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  for (const c of comments) {
    map.set(c.id, { ...c, children: [], childCount: 0 });
  }

  for (const node of map.values()) {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Calculate descendant counts
  function countDescendants(node: CommentNode): number {
    let count = 0;
    for (const child of node.children) {
      count += 1 + countDescendants(child);
    }
    node.childCount = count;
    return count;
  }
  roots.forEach(countDescendants);

  return roots;
}

/* ── Shared data hook ── */
export function useSocialData(cid: string, sort: SortMode = "best") {
  const { user } = useAuth();
  const [data, setData] = useState<SocialData | null>(null);
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [reacting, setReacting] = useState(false);

  const load = useCallback(async () => {
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/address-social?cid=${encodeURIComponent(cid)}&sort=${sort}`,
        { headers: { apikey: anonKey } }
      );
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error("[AddressCommunity] fetch error:", err);
    }
  }, [cid, sort]);

  useEffect(() => {
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
  }, [cid, user, load]);

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

  return { data, myReaction, handleReaction, reload: load };
}

/* ── Stats Bar ── */
export function AddressSocialStats({ cid, onForkClick }: { cid: string; onForkClick?: () => void }) {
  const { data } = useSocialData(cid);
  if (!data) return null;

  return (
    <div className="space-y-4">
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
        <button onClick={onForkClick} className="flex items-center gap-1.5 hover:text-foreground/70 transition-colors">
          <GitFork className="w-3.5 h-3.5" />
          {data.forkCount} fork{data.forkCount !== 1 ? "s" : ""}
        </button>
      </div>
    </div>
  );
}

/* ── Sort Selector ── */
function SortSelector({ value, onChange }: { value: SortMode; onChange: (v: SortMode) => void }) {
  const options: { value: SortMode; label: string }[] = [
    { value: "best", label: "Best" },
    { value: "new", label: "New" },
    { value: "old", label: "Old" },
    { value: "controversial", label: "Controversial" },
  ];

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground/40 mr-1">Sort by</span>
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
            value === o.value
              ? "bg-primary/15 text-primary/80 border border-primary/20"
              : "text-muted-foreground/40 hover:text-muted-foreground/60 hover:bg-muted/10"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── Vote Buttons ── */
function VoteButtons({
  score,
  myVote,
  onVote,
}: {
  score: number;
  myVote: number | null;
  onVote: (vote: 1 | -1) => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => onVote(1)}
        className={`p-0.5 rounded transition-colors ${
          myVote === 1
            ? "text-primary"
            : "text-muted-foreground/30 hover:text-primary/60"
        }`}
        aria-label="Upvote"
      >
        <ChevronUp className="w-4 h-4" />
      </button>
      <span className={`text-xs font-medium min-w-[1.5rem] text-center tabular-nums ${
        score > 0 ? "text-primary/70" : score < 0 ? "text-amber-500/70" : "text-muted-foreground/40"
      }`}>
        {score}
      </span>
      <button
        onClick={() => onVote(-1)}
        className={`p-0.5 rounded transition-colors ${
          myVote === -1
            ? "text-amber-500"
            : "text-muted-foreground/30 hover:text-amber-500/60"
        }`}
        aria-label="Downvote"
      >
        <ChevronDown className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ── Comment Input ── */
function CommentInput({
  placeholder,
  onSubmit,
  onCancel,
  autoFocus = false,
  compact = false,
}: {
  placeholder: string;
  onSubmit: (text: string) => Promise<void>;
  onCancel?: () => void;
  autoFocus?: boolean;
  compact?: boolean;
}) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(text.trim());
      setText("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); } }}
        placeholder={placeholder}
        autoFocus={autoFocus}
        maxLength={2000}
        rows={compact ? 2 : 3}
        className={`w-full px-4 py-2.5 rounded-xl bg-muted/5 border border-border/15 text-sm text-foreground/70 placeholder:text-muted-foreground/25 focus:outline-none focus:border-primary/25 transition-colors resize-none`}
      />
      <div className="flex items-center gap-2 justify-end">
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground/70 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          onClick={submit}
          disabled={!text.trim() || submitting}
          className="px-4 py-1.5 rounded-lg bg-primary/15 border border-primary/20 text-primary/70 hover:bg-primary/25 hover:text-primary text-xs font-medium transition-all disabled:opacity-20 flex items-center gap-1.5"
        >
          <Send className="w-3 h-3" />
          {compact ? "Reply" : "Comment"}
        </button>
      </div>
    </div>
  );
}

/* ── Single Comment Node ── */
function CommentNodeView({
  node,
  depth,
  myVotes,
  collapsed,
  onToggleCollapse,
  onVote,
  onReply,
  replyingTo,
  setReplyingTo,
  onSubmitReply,
  user,
}: {
  node: CommentNode;
  depth: number;
  myVotes: Record<string, number>;
  collapsed: Set<string>;
  onToggleCollapse: (id: string) => void;
  onVote: (commentId: string, vote: 1 | -1) => void;
  onReply: (parentId: string) => void;
  replyingTo: string | null;
  setReplyingTo: (id: string | null) => void;
  onSubmitReply: (parentId: string, content: string) => Promise<void>;
  user: any;
}) {
  const isCollapsed = collapsed.has(node.id);

  if (isCollapsed) {
    return (
      <div className="flex items-center gap-2 py-1">
        <button
          onClick={() => onToggleCollapse(node.id)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors"
        >
          <Plus className="w-3 h-3" />
          <span className="font-medium text-foreground/50">{node.author.display_name || "Anonymous"}</span>
          <span className="text-muted-foreground/30">
            — {node.childCount} {node.childCount === 1 ? "reply" : "replies"}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="group">
      <div className="flex gap-2">
        {/* Vote column */}
        <div className="flex flex-col items-center shrink-0 pt-0.5">
          <VoteButtons
            score={node.score}
            myVote={myVotes[node.id] ?? null}
            onVote={(v) => {
              if (!user) { toast("Sign in to vote", { icon: "🔒" }); return; }
              onVote(node.id, v);
            }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-5 h-5 rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center text-[9px] font-mono text-primary/60 shrink-0">
              {node.author.uor_glyph?.slice(0, 2) || node.author.display_name?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <span className="text-xs font-medium text-foreground/60">
              {node.author.display_name || "Anonymous"}
            </span>
            <span className="text-[10px] text-muted-foreground/25">·</span>
            <span className="text-[10px] text-muted-foreground/25">
              {formatDistanceToNow(new Date(node.created_at), { addSuffix: true })}
            </span>
          </div>

          {/* Body */}
          <p className="text-sm text-foreground/55 leading-relaxed mb-1 whitespace-pre-wrap">{node.content}</p>

          {/* Action bar */}
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => {
                if (!user) { toast("Sign in to reply", { icon: "🔒" }); return; }
                onReply(node.id);
              }}
              className="flex items-center gap-1 text-[10px] text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
            >
              <MessageSquare className="w-3 h-3" />
              Reply
            </button>
            {node.childCount > 0 && (
              <button
                onClick={() => onToggleCollapse(node.id)}
                className="flex items-center gap-1 text-[10px] text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
              >
                <Minus className="w-3 h-3" />
                Collapse
              </button>
            )}
          </div>

          {/* Inline reply */}
          <AnimatePresence>
            {replyingTo === node.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-2 overflow-hidden"
              >
                <CommentInput
                  placeholder={`Reply to ${node.author.display_name || "Anonymous"}…`}
                  onSubmit={(text) => onSubmitReply(node.id, text)}
                  onCancel={() => setReplyingTo(null)}
                  autoFocus
                  compact
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Children */}
          {node.children.length > 0 && depth < MAX_DEPTH && (
            <div className="border-l border-primary/8 pl-3 ml-1 mt-1 space-y-2">
              {node.children.map(child => (
                <CommentNodeView
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  myVotes={myVotes}
                  collapsed={collapsed}
                  onToggleCollapse={onToggleCollapse}
                  onVote={onVote}
                  onReply={onReply}
                  replyingTo={replyingTo}
                  setReplyingTo={setReplyingTo}
                  onSubmitReply={onSubmitReply}
                  user={user}
                />
              ))}
            </div>
          )}

          {/* "Continue thread" for deep nesting */}
          {node.children.length > 0 && depth >= MAX_DEPTH && (
            <p className="text-[10px] text-primary/40 mt-1 italic">
              Continue this thread →
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Discussion Thread ── */
export function AddressDiscussion({ cid }: { cid: string }) {
  const { user } = useAuth();
  const [sort, setSort] = useState<SortMode>("best");
  const { data, reload } = useSocialData(cid, sort);
  const [myVotes, setMyVotes] = useState<Record<string, number>>({});
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const comments = data?.comments ?? [];
  const tree = useMemo(() => buildTree(comments), [comments]);

  // Fetch user's votes
  useEffect(() => {
    if (!user) return;
    supabase.functions
      .invoke("address-social", { method: "POST", body: { action: "get_my_votes", cid } })
      .then(({ data: r }) => { if (r?.votes) setMyVotes(r.votes); });
  }, [cid, user]);

  const handleVote = useCallback(async (commentId: string, vote: 1 | -1) => {
    const prevVotes = { ...myVotes };
    const currentVote = myVotes[commentId] ?? null;

    // Optimistic update
    const newVotes = { ...myVotes };
    if (currentVote === vote) {
      delete newVotes[commentId];
    } else {
      newVotes[commentId] = vote;
    }
    setMyVotes(newVotes);

    try {
      const { error } = await supabase.functions.invoke("address-social", {
        method: "POST",
        body: { action: "vote", commentId, vote },
      });
      if (error) throw error;
      // Reload to get updated scores
      reload();
    } catch {
      setMyVotes(prevVotes);
      toast.error("Failed to vote");
    }
  }, [myVotes, cid, reload]);

  const handleComment = useCallback(async (content: string) => {
    if (!user) { toast("Sign in to comment", { icon: "🔒" }); return; }
    try {
      const { error } = await supabase.functions.invoke("address-social", {
        method: "POST",
        body: { action: "comment", cid, content },
      });
      if (error) throw error;
    } catch {
      toast.error("Failed to post comment");
    }
  }, [user, cid]);

  const handleReply = useCallback(async (parentId: string, content: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.functions.invoke("address-social", {
        method: "POST",
        body: { action: "comment", cid, content, parent_id: parentId },
      });
      if (error) throw error;
      setReplyingTo(null);
    } catch {
      toast.error("Failed to post reply");
    }
  }, [user, cid]);

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-primary/60 uppercase tracking-[0.15em]">
          Discussion
          {comments.length > 0 && (
            <span className="ml-2 text-muted-foreground/30 normal-case tracking-normal font-normal">
              {comments.length} comment{comments.length !== 1 ? "s" : ""}
            </span>
          )}
        </p>
        {comments.length > 1 && <SortSelector value={sort} onChange={setSort} />}
      </div>

      {/* Top-level comment box */}
      {user ? (
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center text-xs font-mono text-primary/60 shrink-0 mt-1">
            {user.email?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div className="flex-1">
            <CommentInput placeholder="Share a thought…" onSubmit={handleComment} />
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border/10 bg-muted/3">
          <MessageCircle className="w-4 h-4 text-muted-foreground/25" />
          <span className="text-sm text-muted-foreground/30">Sign in to join the discussion</span>
        </div>
      )}

      {/* Thread */}
      {tree.length > 0 ? (
        <div className="space-y-3">
          {tree.map(node => (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <CommentNodeView
                node={node}
                depth={0}
                myVotes={myVotes}
                collapsed={collapsed}
                onToggleCollapse={toggleCollapse}
                onVote={handleVote}
                onReply={(id) => setReplyingTo(replyingTo === id ? null : id)}
                replyingTo={replyingTo}
                setReplyingTo={setReplyingTo}
                onSubmitReply={handleReply}
                user={user}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground/30 italic">No comments yet. Be the first.</p>
      )}
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
                  <span className="text-xs text-muted-foreground/30 italic truncate ml-auto">{fork.fork_note}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Legacy export ── */
export function AddressCommunity({ cid }: { cid: string }) {
  return (
    <div className="space-y-6" style={{ marginTop: "calc(1rem * 1.618)" }}>
      <AddressSocialStats cid={cid} />
      <AddressDiscussion cid={cid} />
    </div>
  );
}
