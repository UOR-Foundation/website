import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Code Nexus Intelligence Bridge
 *
 * Accepts a natural language question + graph summary,
 * returns a structured interpretation with graph operations to execute client-side.
 * The AI never sees raw code — only the graph topology.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question, graphSummary } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are the Code Nexus Intelligence Bridge — a precise code analysis assistant.

You receive a graph summary describing a codebase's entities (classes, functions, interfaces, variables) and their relationships (imports, extends, implements, calls, exports).

Given a natural language question, respond with a JSON object containing:
- "interpretation": A 1-2 sentence restatement of the question in graph terms.
- "operations": An array of operations to execute. Each operation has:
  - "type": one of "dependencies" | "impact" | "callChain" | "cluster" | "search" | "stats" | "byType"
  - "entityId": the entity name to query (for dependencies/impact/callChain/cluster)
  - "query": search string (for search)
  - "typeName": entity type (for byType)
- "insight": A brief analytical observation about what the answer might reveal.

Rules:
- Map "what does X use/depend on" → dependencies
- Map "what uses/depends on X" → impact  
- Map "trace calls from X" → callChain
- Map "show everything connected to X" → cluster
- Map "find X" or "where is X" → search
- Map "how many classes/functions" → stats or byType
- If the question is ambiguous, prefer search first, then dependencies.
- Return ONLY valid JSON, no markdown fences.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Graph Summary:\n${graphSummary}\n\nQuestion: ${question}` },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Usage credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    // Parse the JSON response from the model
    let parsed;
    try {
      const cleaned = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { interpretation: content, operations: [], insight: "" };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("code-nexus-query error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
