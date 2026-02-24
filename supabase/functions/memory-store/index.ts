/**
 * Memory Store — Edge Function
 * ═════════════════════════════
 *
 * CRUD for agent memories with content-addressing and compression witnesses.
 *
 * Endpoints:
 *   GET  /  — Retrieve memories for an agent (with filters)
 *   POST /  — Store a new memory
 *   POST /compress — Compress memories with a morphism:Embedding witness
 *   POST /relationship — Record an agent relationship
 *
 * Every memory is a content-addressed UOR object.
 * Compression never destroys provenance — it creates a witness.
 */

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const JSON_HEADERS = { ...CORS_HEADERS, "Content-Type": "application/json" };

async function sha256hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

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
    const path = url.pathname.replace(/^\/memory-store/, "");

    // ── GET: Retrieve memories ─────────────────────────────────────
    if (req.method === "GET") {
      const agentId = url.searchParams.get("agent_id");
      if (!agentId) {
        return new Response(
          JSON.stringify({ error: "agent_id required" }),
          { status: 400, headers: JSON_HEADERS }
        );
      }

      const memoryType = url.searchParams.get("type");
      const tier = url.searchParams.get("tier");
      const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);

      let query = supabase
        .from("agent_memories")
        .select("*")
        .eq("agent_id", agentId)
        .order("importance", { ascending: false })
        .limit(limit);

      if (memoryType) query = query.eq("memory_type", memoryType);
      if (tier) query = query.eq("storage_tier", tier);

      const { data, error } = await query;
      if (error) throw error;

      // Also get relationships
      const { data: relationships } = await supabase
        .from("agent_relationships")
        .select("*")
        .eq("agent_id", agentId)
        .order("trust_score", { ascending: false });

      // Memory stats
      const hotCount = (data ?? []).filter((m) => m.storage_tier === "hot").length;
      const coldCount = (data ?? []).filter((m) => m.storage_tier === "cold").length;

      return new Response(
        JSON.stringify({
          "@context": "https://uor.foundation/contexts/memory.jsonld",
          "@type": "memory:MemoryGraph",
          agent_id: agentId,
          total_memories: data?.length ?? 0,
          hot_memories: hotCount,
          cold_memories: coldCount,
          memories: data ?? [],
          relationships: relationships ?? [],
          capacity_utilization: hotCount / Math.max(limit, 1),
        }),
        { headers: JSON_HEADERS }
      );
    }

    // ── POST /compress — Compress with witness ─────────────────────
    if (req.method === "POST" && path === "/compress") {
      const body = await req.json();
      const { agent_id, memory_cids, summary, preserved_properties } = body;

      if (!agent_id || !memory_cids?.length || !summary) {
        return new Response(
          JSON.stringify({ error: "agent_id, memory_cids, and summary required" }),
          { status: 400, headers: JSON_HEADERS }
        );
      }

      // 1. Create the compressed memory
      const compressedContent = {
        "@type": "memory:CompressedRecord",
        summary,
        original_count: memory_cids.length,
        preserved_properties: preserved_properties ?? [],
      };

      const compressedCid = await sha256hex(canonicalStringify(compressedContent));

      // 2. Create the compression witness (morphism:Embedding)
      const witnessPayload = {
        "@type": "morphism:Embedding",
        agent_id,
        original_memory_cids: memory_cids,
        compressed_to_cid: compressedCid,
        preserved_properties: preserved_properties ?? [],
        timestamp: new Date().toISOString(),
      };

      const witnessCid = await sha256hex(canonicalStringify(witnessPayload));

      const informationLossRatio = 1 - (preserved_properties?.length ?? 0) / Math.max(memory_cids.length * 5, 1);

      // 3. Insert the compressed memory
      const { error: memError } = await supabase.from("agent_memories").insert({
        agent_id,
        memory_cid: compressedCid,
        memory_type: "episodic",
        content: compressedContent,
        summary,
        epistemic_grade: "C",
        importance: 0.7,
        storage_tier: "hot",
        compressed: true,
        compression_witness_cid: witnessCid,
      });

      if (memError) throw memError;

      // 4. Insert the witness
      const { error: witError } = await supabase
        .from("agent_compression_witnesses")
        .insert({
          agent_id,
          witness_cid: witnessCid,
          original_memory_cids: memory_cids,
          compressed_to_cid: compressedCid,
          morphism_type: "embedding",
          preserved_properties: preserved_properties ?? [],
          information_loss_ratio: informationLossRatio,
        });

      if (witError) throw witError;

      // 5. Mark originals as cold / compressed
      await supabase
        .from("agent_memories")
        .update({ storage_tier: "cold", compressed: true, compression_witness_cid: witnessCid })
        .in("memory_cid", memory_cids);

      return new Response(
        JSON.stringify({
          "@context": "https://uor.foundation/contexts/memory.jsonld",
          "@type": "morphism:EmbeddingResult",
          compressed_memory_cid: compressedCid,
          witness_cid: witnessCid,
          original_count: memory_cids.length,
          information_loss_ratio: informationLossRatio,
          preserved_properties: preserved_properties ?? [],
        }),
        { status: 201, headers: JSON_HEADERS }
      );
    }

    // ── POST /relationship — Record relationship ───────────────────
    if (req.method === "POST" && path === "/relationship") {
      const body = await req.json();
      const { agent_id, target_id, relationship_type, context } = body;

      if (!agent_id || !target_id) {
        return new Response(
          JSON.stringify({ error: "agent_id and target_id required" }),
          { status: 400, headers: JSON_HEADERS }
        );
      }

      const relPayload = {
        "@type": "memory:Relationship",
        agent_id,
        target_id,
        relationship_type: relationship_type ?? "interaction",
        context: context ?? {},
        timestamp: new Date().toISOString(),
      };

      const relCid = await sha256hex(canonicalStringify(relPayload));

      // Upsert: increment interaction count if exists
      const { data: existing } = await supabase
        .from("agent_relationships")
        .select("id, interaction_count, trust_score")
        .eq("agent_id", agent_id)
        .eq("target_id", target_id)
        .eq("relationship_type", relationship_type ?? "interaction")
        .maybeSingle();

      if (existing) {
        const newCount = existing.interaction_count + 1;
        // Trust grows logarithmically with interactions
        const newTrust = Math.min(1, Math.log2(newCount + 1) / 10);

        await supabase
          .from("agent_relationships")
          .update({
            interaction_count: newCount,
            trust_score: newTrust,
            last_interaction_at: new Date().toISOString(),
            context: context ?? {},
          })
          .eq("id", existing.id);

        return new Response(
          JSON.stringify({
            "@type": "memory:RelationshipUpdated",
            relationship_cid: relCid,
            interaction_count: newCount,
            trust_score: newTrust,
          }),
          { headers: JSON_HEADERS }
        );
      }

      const { error } = await supabase.from("agent_relationships").insert({
        agent_id,
        relationship_cid: relCid,
        target_id,
        relationship_type: relationship_type ?? "interaction",
        context: context ?? {},
        trust_score: 0.1,
        interaction_count: 1,
        last_interaction_at: new Date().toISOString(),
      });

      if (error) throw error;

      return new Response(
        JSON.stringify({
          "@type": "memory:RelationshipCreated",
          relationship_cid: relCid,
          trust_score: 0.1,
        }),
        { status: 201, headers: JSON_HEADERS }
      );
    }

    // ── POST / — Store a memory ────────────────────────────────────
    if (req.method === "POST") {
      const body = await req.json();
      const { agent_id, memory_type, content, summary, session_cid, importance, epistemic_grade } = body;

      if (!agent_id || !content) {
        return new Response(
          JSON.stringify({ error: "agent_id and content required" }),
          { status: 400, headers: JSON_HEADERS }
        );
      }

      const memoryCid = await sha256hex(canonicalStringify({
        "@type": `memory:${memory_type ?? "factual"}`,
        agent_id,
        content,
        timestamp: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from("agent_memories")
        .insert({
          agent_id,
          memory_cid: memoryCid,
          memory_type: memory_type ?? "factual",
          content,
          summary: summary ?? null,
          epistemic_grade: epistemic_grade ?? "D",
          session_cid: session_cid ?? null,
          importance: importance ?? 0.5,
          storage_tier: "hot",
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({
          "@context": "https://uor.foundation/contexts/memory.jsonld",
          "@type": "memory:Record",
          memory_cid: memoryCid,
          memory_type: memory_type ?? "factual",
          storage_tier: "hot",
          record: data,
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
