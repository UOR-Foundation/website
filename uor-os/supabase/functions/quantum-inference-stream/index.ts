/**
 * Quantum Inference Stream — Edge Function
 * ═════════════════════════════════════════
 *
 * Streams real AI text tokens via Lovable AI Gateway.
 * Supports latency-driven model cascade for crisp TTFT.
 */

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
    if (resp.status === 429 || resp.status === 402) return { response: resp, model };
  } catch (e) {
    clearTimeout(timer);
    if (!(e instanceof DOMException && e.name === "AbortError")) throw e;
  }
  const next = nextTier(tier);
  if (next) return fetchWithCascade(url, apiKey, body, next, timeoutMs);
  const finalModel = TIER_MODELS.fast;
  const resp = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, model: finalModel }),
  });
  return { response: resp, model: finalModel };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, model, latencyTier } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Explicit model param (70B/8B) overrides latency tier
    let tier: string;
    if (model === "70B") {
      tier = "quality";
    } else if (model === "8B") {
      tier = "fast";
    } else {
      tier = typeof latencyTier === "string" && TIER_MODELS[latencyTier] ? latencyTier : "balanced";
    }

    const systemPrompt = model === "70B"
      ? `You are an advanced AI assistant demonstrating deep expertise. Respond thoughtfully, precisely, and comprehensively in clear human language. Use natural paragraphs. Be articulate, insightful, and accessible.`
      : `You are a helpful AI assistant. Respond in clear, natural human language. Keep answers concise and readable.`;

    const { response, model: actualModel } = await fetchWithCascade(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      LOVABLE_API_KEY,
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        stream: true,
        max_tokens: 4096,
        temperature: 0.7,
      },
      tier,
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`quantum-inference: tier=${tier} model=${actualModel}`);

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("quantum-inference-stream error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
