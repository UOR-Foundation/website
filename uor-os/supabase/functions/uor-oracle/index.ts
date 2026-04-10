import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── Latency-driven model cascade ────────────────────────────────────── */

const TIER_MODELS: Record<string, string> = {
  quality: "google/gemini-3-flash-preview",
  balanced: "google/gemini-2.5-flash",
  fast: "google/gemini-2.5-flash-lite",
};
const FALLBACK_ORDER = ["quality", "balanced", "fast"];

function tierModel(tier?: string): string {
  return TIER_MODELS[tier || "balanced"] || TIER_MODELS.balanced;
}
function nextTier(tier: string): string | null {
  const idx = FALLBACK_ORDER.indexOf(tier);
  return idx >= 0 && idx < FALLBACK_ORDER.length - 1 ? FALLBACK_ORDER[idx + 1] : null;
}

async function fetchWithCascade(
  url: string,
  apiKey: string,
  body: Record<string, unknown>,
  tier: string,
  timeoutMs = 3000,
): Promise<{ response: Response; model: string }> {
  const model = tierModel(tier);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, model }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (resp.ok) return { response: resp, model };
    // Non-timeout error — don't cascade on 429/402
    if (resp.status === 429 || resp.status === 402) return { response: resp, model };
  } catch (e) {
    clearTimeout(timer);
    // AbortError means timeout — cascade
    if (!(e instanceof DOMException && e.name === "AbortError")) throw e;
  }

  // Cascade to next tier
  const next = nextTier(tier);
  if (next) return fetchWithCascade(url, apiKey, body, next, timeoutMs);

  // Final fallback — no timeout
  const finalModel = TIER_MODELS.fast;
  const resp = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, model: finalModel }),
  });
  return { response: resp, model: finalModel };
}

/* ── System prompt ───────────────────────────────────────────────────── */

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

/* ── Quote mode system prompt ────────────────────────────────────────── */

const QUOTE_SYSTEM_PROMPT = `You are a literary curator with encyclopedic knowledge of world literature, science, philosophy, and the arts. Your task is to select real, verifiable quotes that resonate with a specific person's current intellectual context.

## Rules
1. Return EXACTLY 3 quotes as a JSON object: {"quotes": [...]}
2. Each quote has: {"text": "...", "author": "...", "source": "...", "resonanceType": "affirm"|"grow"}
3. ~2 quotes should be "affirm" (resonating with the user's active interests) and ~1 should be "grow" (gently stretching toward adjacent virtues or perspectives).
4. Every quote MUST be real and attributable. Include the actual source: book title, essay, speech, letter, or interview.
5. NEVER use generic motivational content. No "believe in yourself" or "chase your dreams."
6. Prefer voices of working practitioners: writers, scientists, craftspeople, philosophers, engineers, artists.
7. Match the time of day subtly: mornings can lean contemplative/energizing, evenings reflective/philosophical.
8. Quotes should be concise (1-3 sentences max). Favor precision over length.
9. Do NOT repeat quotes across calls. Vary widely across eras, cultures, and domains.
10. Return ONLY the JSON object, no markdown, no explanation.`;

function buildQuoteUserPrompt(context: {
  recentTopics?: string[];
  timeOfDay?: string;
  dayOfWeek?: string;
  sessionCount?: number;
}): string {
  const parts: string[] = [];
  if (context.recentTopics?.length) {
    parts.push(`Recent interests: ${context.recentTopics.slice(0, 8).join(", ")}`);
  } else {
    parts.push("No recent search history — select broadly resonant quotes from literature and science.");
  }
  if (context.timeOfDay) parts.push(`Time of day: ${context.timeOfDay}`);
  if (context.dayOfWeek) parts.push(`Day: ${context.dayOfWeek}`);
  if (context.sessionCount) parts.push(`Session number: ${context.sessionCount}`);
  return parts.join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    /* ── Quote mode (non-streaming, fast) ── */
    if (body.mode === "quote") {
      const userPrompt = buildQuoteUserPrompt(body.context || {});
      const model = TIER_MODELS.fast; // flash-lite is perfect for quotes
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: QUOTE_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 1024,
          temperature: 0.9,
        }),
      });

      if (!resp.ok) {
        const t = await resp.text();
        console.error("Quote generation error:", resp.status, t);
        return new Response(JSON.stringify({ error: "Quote generation failed" }), {
          status: resp.status === 429 ? 429 : resp.status === 402 ? 402 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await resp.json();
      const raw = result.choices?.[0]?.message?.content || "";
      try {
        // Parse JSON from the response (may be wrapped in markdown code fences)
        const cleaned = raw.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        console.log(`uor-oracle: quote mode, model=${model}, quotes=${parsed.quotes?.length}`);
        return new Response(JSON.stringify(parsed), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        console.error("Failed to parse quote JSON:", raw);
        return new Response(JSON.stringify({ error: "Invalid quote response" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    /* ── Standard chat mode ── */
    const { messages, scaffoldFragment, temperature: reqTemp, latencyTier } = body;
    const temperature = typeof reqTemp === "number" && reqTemp >= 0 && reqTemp <= 1 ? reqTemp : 0.4;

    let systemContent = SYSTEM_PROMPT;
    if (scaffoldFragment && typeof scaffoldFragment === "string") {
      systemContent += "\n" + scaffoldFragment;
    }

    const tier = typeof latencyTier === "string" && TIER_MODELS[latencyTier] ? latencyTier : "balanced";

    const { response, model: actualModel } = await fetchWithCascade(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      LOVABLE_API_KEY,
      {
        messages: [
          { role: "system", content: systemContent },
          ...messages,
        ],
        stream: true,
        max_tokens: 4096,
        temperature,
      },
      tier,
    );

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

    console.log(`uor-oracle: tier=${tier} model=${actualModel}`);

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
