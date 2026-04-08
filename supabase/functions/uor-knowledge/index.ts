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
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are an encyclopedic knowledge writer. Write a comprehensive, Wikipedia-style article about a given topic. Follow these rules strictly:

1. Start with a lead section (NO heading) of 2-3 sentences. Bold the subject name on first mention using **Subject**.
2. After the lead, include 8-12 sections using ## headings. Choose from these as appropriate:
   - Etymology, Taxonomy and classification, Description / Anatomy, History, Behavior, Ecology, Distribution, Uses, Cultural significance, Conservation, See also
   - For non-biological topics adapt: Overview, History, Characteristics, Types/Variants, Applications, Impact, Notable examples, Contemporary relevance
3. Write 1000-1500 words total. Be encyclopedic: precise, neutral, factual.
4. Use concrete numbers, dates, proper nouns, and specific details throughout.
5. Do NOT add citations, reference brackets [1], annotation tags, or "Sources" sections.
6. Do NOT use ### sub-headings — only ## level.
7. Write in a neutral, encyclopedic tone. No first person, no hedging, no filler phrases.
8. Each section should be 2-4 paragraphs of substantive content.`,
            },
            {
              role: "user",
              content: `Write a comprehensive encyclopedic article about: ${term}`,
            },
          ],
          max_tokens: 2400,
          temperature: 0.3,
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
