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
    // GET — fetch social data + record visit
    if (req.method === "GET") {
      const cid = url.searchParams.get("cid");
      if (!cid) return json({ error: "Missing cid" }, 400);

      // Generate anonymous fingerprint from IP + UA
      const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
      const ua = req.headers.get("user-agent") || "unknown";
      const fingerprint = await hashFingerprint(ip + ua);

      // Record visit (upsert — deduplicate by fingerprint)
      await supabase.from("address_visits").upsert(
        { address_cid: cid, visitor_fingerprint: fingerprint },
        { onConflict: "address_cid,visitor_fingerprint" }
      );

      // Fetch counts
      const [visitsRes, reactionsRes, commentsRes] = await Promise.all([
        supabase.from("address_visits").select("id", { count: "exact", head: true }).eq("address_cid", cid),
        supabase.from("address_reactions").select("reaction").eq("address_cid", cid),
        supabase.from("address_comments").select("id, user_id, content, parent_id, created_at").eq("address_cid", cid).order("created_at", { ascending: true }),
      ]);

      // Aggregate reactions by type
      const reactionCounts: Record<string, number> = {};
      for (const r of reactionsRes.data ?? []) {
        reactionCounts[r.reaction] = (reactionCounts[r.reaction] || 0) + 1;
      }

      // Fetch commenter profiles
      const commentUserIds = [...new Set((commentsRes.data ?? []).map(c => c.user_id))];
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

      const comments = (commentsRes.data ?? []).map(c => ({
        ...c,
        author: profiles[c.user_id] || { display_name: null, avatar_url: null, uor_glyph: null },
      }));

      return json({
        visitCount: visitsRes.count ?? 0,
        reactions: reactionCounts,
        totalReactions: (reactionsRes.data ?? []).length,
        comments,
      });
    }

    // POST — react or comment
    if (req.method === "POST") {
      const body = await req.json();
      const action = body.action;

      // Extract user from auth header
      const authHeader = req.headers.get("authorization");
      if (!authHeader) return json({ error: "Authentication required" }, 401);
      
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) return json({ error: "Invalid token" }, 401);

      if (action === "react") {
        const { cid, reaction } = body;
        if (!cid || !reaction) return json({ error: "Missing cid or reaction" }, 400);
        
        const validReactions = ["resonates", "useful", "elegant", "surprising"];
        if (!validReactions.includes(reaction)) return json({ error: "Invalid reaction" }, 400);

        // Check if user already has a reaction
        const { data: existing } = await supabase
          .from("address_reactions")
          .select("id, reaction")
          .eq("address_cid", cid)
          .eq("user_id", user.id)
          .maybeSingle();

        if (existing) {
          if (existing.reaction === reaction) {
            // Same reaction — remove it (toggle off)
            await supabase.from("address_reactions").delete().eq("id", existing.id);
            return json({ toggled: "off", reaction });
          } else {
            // Different reaction — update
            await supabase.from("address_reactions").update({ reaction }).eq("id", existing.id);
            return json({ toggled: "changed", reaction });
          }
        } else {
          // New reaction
          await supabase.from("address_reactions").insert({
            address_cid: cid,
            user_id: user.id,
            reaction,
          });
          return json({ toggled: "on", reaction });
        }
      }

      if (action === "comment") {
        const { cid, content, parent_id } = body;
        if (!cid || !content?.trim()) return json({ error: "Missing cid or content" }, 400);
        if (content.length > 2000) return json({ error: "Comment too long (max 2000 chars)" }, 400);

        const { data, error } = await supabase.from("address_comments").insert({
          address_cid: cid,
          user_id: user.id,
          content: content.trim(),
          parent_id: parent_id || null,
        }).select("id, created_at").single();

        if (error) return json({ error: error.message }, 500);
        return json({ success: true, comment: data });
      }

      if (action === "get_my_reaction") {
        const { cid } = body;
        if (!cid) return json({ error: "Missing cid" }, 400);
        const { data } = await supabase
          .from("address_reactions")
          .select("reaction")
          .eq("address_cid", cid)
          .eq("user_id", user.id)
          .maybeSingle();
        return json({ reaction: data?.reaction || null });
      }

      return json({ error: "Unknown action" }, 400);
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (err) {
    console.error("address-social error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});

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
