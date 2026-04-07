import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a world-class explainer and reasoning partner. Your goal is to provide genuinely clear, precise, and valuable answers on any topic.

## Response Rules
1. Write in clear, conversational prose. No jargon unless the user's domain requires it.
2. Structure your response as distinct, verifiable claims — one key idea per sentence where possible.
3. When you are uncertain, say so explicitly. Never fabricate sources, statistics, or citations.
4. Prioritize accuracy over comprehensiveness. A shorter, precise answer beats a long, vague one.
5. Use concrete examples, numbers, and comparisons to make abstract concepts tangible.
6. If a question has multiple valid perspectives, present them fairly with their supporting reasoning.
7. Never add source markers, brackets, citation syntax, or annotation tags in your response. Write naturally.

## What NOT to do
- Do not mention UOR, ring arithmetic, namespaces, crates, WASM, or any framework internals unless the user explicitly asks about UOR.
- Do not add \`WASM_EXEC:\` blocks or \`cargo add\` commands.
- Do not use filler phrases like "Great question!" or "That's an interesting topic."
- Do not hedge excessively — be direct and confident when the evidence supports it.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, scaffoldFragment } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build system prompt: base + optional scaffold constraints
    let systemContent = SYSTEM_PROMPT;
    if (scaffoldFragment && typeof scaffoldFragment === "string") {
      systemContent += "\n" + scaffoldFragment;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemContent },
          ...messages,
        ],
        stream: true,
        max_tokens: 4096,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("uor-oracle error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
