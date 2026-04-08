import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    if (req.method === "GET") {
      return await handleGet(req, url, supabase);
    }
    if (req.method === "POST") {
      return await handlePost(req, supabase, supabaseUrl);
    }
    return json({ error: "Method not allowed" }, 405);
  } catch (err) {
    console.error("address-social error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});

/* ── GET handler ── */
async function handleGet(req: Request, url: URL, supabase: ReturnType<typeof createClient>) {
  const cid = url.searchParams.get("cid");
  if (!cid) return json({ error: "Missing cid" }, 400);

  const sort = url.searchParams.get("sort") || "best";

  // Record visit
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
  const ua = req.headers.get("user-agent") || "unknown";
  const fingerprint = await hashFingerprint(ip + ua);
  await supabase.from("address_visits").upsert(
    { address_cid: cid, visitor_fingerprint: fingerprint },
    { onConflict: "address_cid,visitor_fingerprint" }
  );

  // Build sort clause
  let orderClause: { column: string; ascending: boolean }[] = [];
  switch (sort) {
    case "new": orderClause = [{ column: "created_at", ascending: false }]; break;
    case "old": orderClause = [{ column: "created_at", ascending: true }]; break;
    case "controversial": orderClause = [{ column: "created_at", ascending: false }]; break;
    default: orderClause = [{ column: "score", ascending: false }, { column: "created_at", ascending: false }]; break;
  }

  // Fetch data in parallel
  const commentsQuery = supabase
    .from("address_comments")
    .select("id, user_id, content, parent_id, created_at, score, guest_name")
    .eq("address_cid", cid);

  // Apply primary sort
  for (const o of orderClause) {
    commentsQuery.order(o.column, { ascending: o.ascending });
  }

  const [visitsRes, reactionsRes, commentsRes, forksRes, forkedFromRes] = await Promise.all([
    supabase.from("address_visits").select("id", { count: "exact", head: true }).eq("address_cid", cid),
    supabase.from("address_reactions").select("reaction").eq("address_cid", cid),
    commentsQuery,
    supabase.from("address_forks").select("id", { count: "exact", head: true }).eq("parent_cid", cid),
    supabase.from("address_forks").select("parent_cid, fork_note, created_at").eq("child_cid", cid).maybeSingle(),
  ]);

  // Aggregate reactions
  const reactionCounts: Record<string, number> = {};
  for (const r of reactionsRes.data ?? []) {
    reactionCounts[r.reaction] = (reactionCounts[r.reaction] || 0) + 1;
  }

  // Fetch commenter profiles
  const commentUserIds = [...new Set((commentsRes.data ?? []).filter(c => c.user_id).map(c => c.user_id))];
  let profiles: Record<string, { display_name: string | null; avatar_url: string | null; uor_glyph: string | null }> = {};
  if (commentUserIds.length > 0) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url, uor_glyph")
      .in("user_id", commentUserIds);
    for (const p of profileData ?? []) {
      profiles[p.user_id] = { display_name: p.display_name, avatar_url: p.avatar_url, uor_glyph: p.uor_glyph };
    }
  }

  // For controversial sort: fetch vote counts per comment
  let commentVoteCounts: Record<string, { up: number; down: number }> = {};
  if (sort === "controversial" && (commentsRes.data ?? []).length > 0) {
    const commentIds = (commentsRes.data ?? []).map(c => c.id);
    const { data: votes } = await supabase
      .from("address_comment_votes")
      .select("comment_id, vote")
      .in("comment_id", commentIds);
    for (const v of votes ?? []) {
      if (!commentVoteCounts[v.comment_id]) commentVoteCounts[v.comment_id] = { up: 0, down: 0 };
      if (v.vote === 1) commentVoteCounts[v.comment_id].up++;
      else commentVoteCounts[v.comment_id].down++;
    }
  }

  let comments = (commentsRes.data ?? []).map(c => ({
    ...c,
    author: c.user_id
      ? (profiles[c.user_id] || { display_name: null, avatar_url: null, uor_glyph: null })
      : { display_name: c.guest_name || "Guest", avatar_url: null, uor_glyph: null },
    is_guest: !c.user_id,
  }));

  // Controversial sort: re-sort by total votes with score near zero
  if (sort === "controversial") {
    comments.sort((a, b) => {
      const aVotes = commentVoteCounts[a.id] || { up: 0, down: 0 };
      const bVotes = commentVoteCounts[b.id] || { up: 0, down: 0 };
      const aTotal = aVotes.up + aVotes.down;
      const bTotal = bVotes.up + bVotes.down;
      const aControversy = aTotal > 0 ? aTotal * (1 - Math.abs(a.score) / aTotal) : 0;
      const bControversy = bTotal > 0 ? bTotal * (1 - Math.abs(b.score) / bTotal) : 0;
      return bControversy - aControversy;
    });
  }

  // Child forks
  let childForks: Array<{ child_cid: string; fork_note: string | null; created_at: string }> = [];
  if ((forksRes.count ?? 0) > 0) {
    const { data: forkData } = await supabase
      .from("address_forks")
      .select("child_cid, fork_note, created_at")
      .eq("parent_cid", cid)
      .order("created_at", { ascending: false })
      .limit(20);
    childForks = forkData ?? [];
  }

  return json({
    visitCount: visitsRes.count ?? 0,
    reactions: reactionCounts,
    totalReactions: (reactionsRes.data ?? []).length,
    comments,
    forkCount: forksRes.count ?? 0,
    forkedFrom: forkedFromRes.data ?? null,
    childForks,
  });
}

/* ── POST handler ── */
async function handlePost(req: Request, supabase: ReturnType<typeof createClient>, supabaseUrl: string) {
  const body = await req.json();
  const action = body.action;

  // Guest-allowed actions (no auth required)
  if (action === "comment_guest") {
    return handleGuestComment(body, supabase);
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) return json({ error: "Authentication required" }, 401);

  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "Invalid token" }, 401);

  switch (action) {
    case "react": return handleReact(body, user.id, supabase);
    case "comment": return handleComment(body, user.id, supabase);
    case "fork": return handleFork(body, user.id, supabase);
    case "get_my_reaction": return handleGetMyReaction(body, user.id, supabase);
    case "vote": return handleVote(body, user.id, supabase);
    case "get_my_votes": return handleGetMyVotes(body, user.id, supabase);
    default: return json({ error: "Unknown action" }, 400);
  }
}

/* ── Action handlers ── */

async function handleReact(body: any, userId: string, supabase: ReturnType<typeof createClient>) {
  const { cid, reaction } = body;
  if (!cid || !reaction) return json({ error: "Missing cid or reaction" }, 400);
  const validReactions = ["resonates", "useful", "elegant", "surprising"];
  if (!validReactions.includes(reaction)) return json({ error: "Invalid reaction" }, 400);

  const { data: existing } = await supabase
    .from("address_reactions").select("id, reaction")
    .eq("address_cid", cid).eq("user_id", userId).maybeSingle();

  if (existing) {
    if (existing.reaction === reaction) {
      await supabase.from("address_reactions").delete().eq("id", existing.id);
      return json({ toggled: "off", reaction });
    } else {
      await supabase.from("address_reactions").update({ reaction }).eq("id", existing.id);
      return json({ toggled: "changed", reaction });
    }
  } else {
    await supabase.from("address_reactions").insert({ address_cid: cid, user_id: userId, reaction });
    return json({ toggled: "on", reaction });
  }
}

async function handleComment(body: any, userId: string, supabase: ReturnType<typeof createClient>) {
  const { cid, content, parent_id } = body;
  if (!cid || !content?.trim()) return json({ error: "Missing cid or content" }, 400);
  if (content.length > 2000) return json({ error: "Comment too long (max 2000 chars)" }, 400);

  const { data, error } = await supabase.from("address_comments").insert({
    address_cid: cid, user_id: userId, content: content.trim(), parent_id: parent_id || null,
  }).select("id, created_at, score").single();

  if (error) return json({ error: error.message }, 500);
  return json({ success: true, comment: data });
}

async function handleFork(body: any, userId: string, supabase: ReturnType<typeof createClient>) {
  const { parentCid, childCid, note } = body;
  if (!parentCid || !childCid) return json({ error: "Missing parentCid or childCid" }, 400);
  if (parentCid === childCid) return json({ error: "Cannot fork to same CID" }, 400);
  if (note && note.length > 500) return json({ error: "Fork note too long" }, 400);

  const { data, error } = await supabase.from("address_forks").insert({
    parent_cid: parentCid, child_cid: childCid, user_id: userId, fork_note: note?.trim() || null,
  }).select("id, created_at").single();

  if (error) {
    if (error.code === "23505") return json({ error: "Fork relationship already exists" }, 409);
    return json({ error: error.message }, 500);
  }
  return json({ success: true, fork: data });
}

async function handleGetMyReaction(body: any, userId: string, supabase: ReturnType<typeof createClient>) {
  const { cid } = body;
  if (!cid) return json({ error: "Missing cid" }, 400);
  const { data } = await supabase.from("address_reactions").select("reaction")
    .eq("address_cid", cid).eq("user_id", userId).maybeSingle();
  return json({ reaction: data?.reaction || null });
}

async function handleVote(body: any, userId: string, supabase: ReturnType<typeof createClient>) {
  const { commentId, vote } = body;
  if (!commentId) return json({ error: "Missing commentId" }, 400);
  if (vote !== 1 && vote !== -1) return json({ error: "Vote must be 1 or -1" }, 400);

  // Check existing vote
  const { data: existing } = await supabase
    .from("address_comment_votes").select("id, vote")
    .eq("comment_id", commentId).eq("user_id", userId).maybeSingle();

  let scoreDelta = 0;

  if (existing) {
    if (existing.vote === vote) {
      // Same vote — remove (toggle off)
      await supabase.from("address_comment_votes").delete().eq("id", existing.id);
      scoreDelta = -vote; // undo
    } else {
      // Different vote — switch
      await supabase.from("address_comment_votes").update({ vote }).eq("id", existing.id);
      scoreDelta = vote * 2; // undo old + apply new
    }
  } else {
    // New vote
    await supabase.from("address_comment_votes").insert({ comment_id: commentId, user_id: userId, vote });
    scoreDelta = vote;
  }

  // Update denormalized score
  if (scoreDelta !== 0) {
    // Use RPC-less approach: read then write
    const { data: comment } = await supabase.from("address_comments").select("score").eq("id", commentId).single();
    if (comment) {
      await supabase.from("address_comments").update({ score: comment.score + scoreDelta }).eq("id", commentId);
    }
  }

  // Return new vote state
  const { data: newVote } = await supabase.from("address_comment_votes").select("vote")
    .eq("comment_id", commentId).eq("user_id", userId).maybeSingle();

  return json({ vote: newVote?.vote || null, scoreDelta });
}

async function handleGetMyVotes(body: any, userId: string, supabase: ReturnType<typeof createClient>) {
  const { cid } = body;
  if (!cid) return json({ error: "Missing cid" }, 400);

  // Get all comment IDs for this address, then get user's votes
  const { data: comments } = await supabase
    .from("address_comments").select("id").eq("address_cid", cid);
  const commentIds = (comments ?? []).map(c => c.id);

  if (commentIds.length === 0) return json({ votes: {} });

  const { data: votes } = await supabase
    .from("address_comment_votes").select("comment_id, vote")
    .eq("user_id", userId).in("comment_id", commentIds);

  const voteMap: Record<string, number> = {};
  for (const v of votes ?? []) {
    voteMap[v.comment_id] = v.vote;
  }
  return json({ votes: voteMap });
}

/* ── Helpers ── */

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hashFingerprint(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}
