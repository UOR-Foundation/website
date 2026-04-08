import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { keyword } = await req.json();
    if (!keyword || typeof keyword !== "string" || keyword.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Missing keyword" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const term = keyword.trim();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Parallel: Wikipedia + AI synthesis
    const [wikiResult, aiResult] = await Promise.allSettled([
      // Wikipedia REST API
      fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`,
        { headers: { "Api-User-Agent": "UOR-Framework/1.0" } }
      ).then(async (r) => {
        if (!r.ok) return null;
        const data = await r.json();
        if (data.type !== "standard") return null;
        return {
          qid: data.wikibase_item || null,
          thumbnail: data.thumbnail?.source || data.originalimage?.source || null,
          description: data.description || null,
          extract: data.extract || null,
          pageUrl: data.content_urls?.desktop?.page || null,
        };
      }),

      // AI synthesis via Lovable AI Gateway
      fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: `You are an expert knowledge synthesizer. Write a concise, authoritative, beautifully structured article about a given topic. Follow these rules:
1. Use markdown with clear ## section headers.
2. Start with a one-paragraph overview — no heading for this opening.
3. Include 3-5 focused sections covering key facts, history/origin, significance, and interesting details.
4. Write 500-700 words. Be precise, engaging, and informative.
5. Use concrete numbers, dates, and comparisons to make concepts tangible.
6. Do not add source citations, brackets, or annotation tags.
7. Write naturally — no filler phrases or hedging.`,
            },
            {
              role: "user",
              content: `Write a knowledge article about: ${term}`,
            },
          ],
          max_tokens: 1200,
          temperature: 0.35,
        }),
      }).then(async (r) => {
        if (!r.ok) {
          console.error("AI gateway error:", r.status, await r.text());
          return null;
        }
        const data = await r.json();
        return data.choices?.[0]?.message?.content || null;
      }),
    ]);

    const wiki =
      wikiResult.status === "fulfilled" ? wikiResult.value : null;
    const synthesis =
      aiResult.status === "fulfilled" ? aiResult.value : null;

    if (!wiki && !synthesis) {
      return new Response(
        JSON.stringify({ error: "Could not find information for this term." }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const sources: string[] = [];
    if (wiki?.pageUrl) sources.push(wiki.pageUrl);
    if (wiki?.qid) sources.push(`https://www.wikidata.org/wiki/${wiki.qid}`);

    return new Response(
      JSON.stringify({
        keyword: term,
        wiki,
        synthesis,
        sources,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("uor-knowledge error:", e);

    // Handle rate limits and credit errors
    if (e instanceof Response) {
      if (e.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (e.status === 402) {
        return new Response(
          JSON.stringify({ error: "Credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
