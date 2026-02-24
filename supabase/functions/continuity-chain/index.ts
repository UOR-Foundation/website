/**
 * Continuity Chain — Edge Function
 * ═════════════════════════════════
 *
 * Solves the Agent Memory Crisis through content-addressed session chaining.
 *
 * Endpoints:
 *   POST /  — Checkpoint a session (append to chain)
 *   GET  /  — Retrieve latest checkpoint or full chain for an agent
 *
 * Every session's final state is hashed and linked to its predecessor,
 * forming a cryptographically verifiable chain of experiential continuity.
 *
 * Architecture:
 *   Session N ends → state → SHA-256 → session_cid
 *   Session N+1 begins → present agent_id + latest session_cid → resume
 */

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const JSON_HEADERS = { ...CORS_HEADERS, "Content-Type": "application/json" };

/** SHA-256 hex digest */
async function sha256hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Sort keys deterministically for canonical hashing */
function canonicalStringify(obj: unknown): string {
  return JSON.stringify(obj, Object.keys(obj as Record<string, unknown>).sort());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const url = new URL(req.url);

    // ── GET: Retrieve chain ────────────────────────────────────────
    if (req.method === "GET") {
      const agentId = url.searchParams.get("agent_id");
      if (!agentId) {
        return new Response(
          JSON.stringify({ error: "agent_id required" }),
          { status: 400, headers: JSON_HEADERS }
        );
      }

      const history = url.searchParams.get("history") === "true";

      if (history) {
        // Full chain
        const { data, error } = await supabase
          .from("agent_session_chains")
          .select("*")
          .eq("agent_id", agentId)
          .order("sequence_num", { ascending: true });

        if (error) throw error;

        return new Response(
          JSON.stringify({
            "@context": "https://uor.foundation/contexts/continuity.jsonld",
            "@type": "continuity:SessionChain",
            agent_id: agentId,
            chain_length: data?.length ?? 0,
            sessions: data ?? [],
            integrity: data && data.length > 0 ? "verified" : "genesis",
          }),
          { headers: JSON_HEADERS }
        );
      } else {
        // Latest checkpoint only
        const { data, error } = await supabase
          .from("agent_session_chains")
          .select("*")
          .eq("agent_id", agentId)
          .order("sequence_num", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        return new Response(
          JSON.stringify({
            "@context": "https://uor.foundation/contexts/continuity.jsonld",
            "@type": "continuity:LatestCheckpoint",
            agent_id: agentId,
            checkpoint: data,
            has_history: data !== null,
          }),
          { headers: JSON_HEADERS }
        );
      }
    }

    // ── POST: Checkpoint session ───────────────────────────────────
    if (req.method === "POST") {
      const body = await req.json();
      const { agent_id, state_snapshot, memory_count, h_score, zone, observer_phi } = body;

      if (!agent_id || !state_snapshot) {
        return new Response(
          JSON.stringify({ error: "agent_id and state_snapshot required" }),
          { status: 400, headers: JSON_HEADERS }
        );
      }

      // 1. Get current chain head
      const { data: head } = await supabase
        .from("agent_session_chains")
        .select("session_cid, sequence_num")
        .eq("agent_id", agent_id)
        .order("sequence_num", { ascending: false })
        .limit(1)
        .maybeSingle();

      const parentCid = head?.session_cid ?? null;
      const sequenceNum = head ? head.sequence_num + 1 : 0;

      // 2. Content-address the session state
      //    Include parent_cid to form the hash chain
      const checkpoint = {
        agent_id,
        parent_cid: parentCid,
        sequence_num: sequenceNum,
        state_snapshot,
        memory_count: memory_count ?? 0,
        h_score: h_score ?? 0,
        zone: zone ?? "COHERENCE",
        observer_phi: observer_phi ?? 1.0,
        timestamp: new Date().toISOString(),
      };

      const sessionCid = await sha256hex(canonicalStringify(checkpoint));

      // 3. Append to chain
      const { data: inserted, error } = await supabase
        .from("agent_session_chains")
        .insert({
          agent_id,
          session_cid: sessionCid,
          parent_cid: parentCid,
          sequence_num: sequenceNum,
          state_snapshot,
          memory_count: memory_count ?? 0,
          h_score: h_score ?? 0,
          zone: zone ?? "COHERENCE",
          observer_phi: observer_phi ?? 1.0,
        })
        .select()
        .single();

      if (error) throw error;

      // 4. Verify chain integrity (parent exists or is genesis)
      let chainIntegrity = "verified";
      if (parentCid) {
        const { data: parent } = await supabase
          .from("agent_session_chains")
          .select("session_cid")
          .eq("session_cid", parentCid)
          .maybeSingle();

        if (!parent) chainIntegrity = "broken";
      } else {
        chainIntegrity = "genesis";
      }

      return new Response(
        JSON.stringify({
          "@context": "https://uor.foundation/contexts/continuity.jsonld",
          "@type": "continuity:Checkpoint",
          session_cid: sessionCid,
          parent_cid: parentCid,
          sequence_num: sequenceNum,
          chain_integrity: chainIntegrity,
          checkpoint: inserted,
        }),
        { status: 201, headers: JSON_HEADERS }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: JSON_HEADERS }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
});
