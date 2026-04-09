import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.97.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Delete messages with per-message self-destruct that have expired
    const { error: selfDestructErr } = await supabase.rpc("purge_self_destruct_messages");
    
    // Fallback: direct delete for self-destruct messages
    const { data: expired, error: queryErr } = await supabase
      .from("encrypted_messages")
      .select("id, created_at, self_destruct_seconds")
      .not("self_destruct_seconds", "is", null)
      .is("deleted_at", null);

    if (!queryErr && expired) {
      const now = Date.now();
      const toDelete = expired.filter((msg: any) => {
        const createdAt = new Date(msg.created_at).getTime();
        return now >= createdAt + msg.self_destruct_seconds * 1000;
      });

      if (toDelete.length > 0) {
        const ids = toDelete.map((m: any) => m.id);
        await supabase
          .from("encrypted_messages")
          .update({ deleted_at: new Date().toISOString() })
          .in("id", ids);
      }
    }

    // Delete messages in sessions with session-level TTL
    const { data: sessions } = await supabase
      .from("conduit_sessions")
      .select("id, expires_after_seconds")
      .not("expires_after_seconds", "is", null);

    if (sessions) {
      for (const session of sessions as any[]) {
        const cutoff = new Date(Date.now() - session.expires_after_seconds * 1000).toISOString();
        await supabase
          .from("encrypted_messages")
          .update({ deleted_at: new Date().toISOString() })
          .eq("session_id", session.id)
          .lt("created_at", cutoff)
          .is("deleted_at", null);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
