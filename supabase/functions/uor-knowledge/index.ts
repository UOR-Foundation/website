import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── Wikipedia fetch ─────────────────────────────────────────────────── */

async function fetchWikipedia(term: string) {
  try {
    const r = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`,
      { headers: { "Api-User-Agent": "UOR-Framework/1.0" } }
    );
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
  } catch {
    return null;
  }
}

/* ── Wikidata structured facts ───────────────────────────────────────── */

const WIKIDATA_PROPS: Record<string, string> = {
  P31: "Instance of",
  P17: "Country",
  P18: "Image",
  P569: "Date of birth",
  P570: "Date of death",
  P1082: "Population",
  P625: "Coordinates",
  P274: "Chemical formula",
  P106: "Occupation",
  P27: "Citizenship",
  P136: "Genre",
  P171: "Parent taxon",
  P225: "Taxon name",
  P105: "Taxon rank",
};

async function fetchWikidataFacts(qid: string): Promise<Record<string, string>> {
  const facts: Record<string, string> = {};
  try {
    const r = await fetch(
      `https://www.wikidata.org/w/api.php?action=wbgetentity&ids=${qid}&props=claims&format=json&origin=*`,
      { headers: { "Api-User-Agent": "UOR-Framework/1.0" } }
    );
    if (!r.ok) return facts;
    const data = await r.json();
    const claims = data.entities?.[qid]?.claims;
    if (!claims) return facts;

    for (const [pid, label] of Object.entries(WIKIDATA_PROPS)) {
      const claim = claims[pid]?.[0]?.mainsnak?.datavalue;
      if (!claim) continue;
      if (claim.type === "string") {
        facts[label] = claim.value;
      } else if (claim.type === "quantity") {
        facts[label] = Number(claim.value.amount).toLocaleString();
      } else if (claim.type === "time") {
        facts[label] = claim.value.time?.replace(/^\+/, "").split("T")[0] || "";
      } else if (claim.type === "wikibase-entityid") {
        facts[label] = claim.value.id || "";
      } else if (claim.type === "globecoordinate") {
        facts[label] = `${claim.value.latitude?.toFixed(4)}°, ${claim.value.longitude?.toFixed(4)}°`;
      }
    }
  } catch { /* wikidata fetch failed */ }
  return facts;
}

/* ── Build context-aware system prompt ───────────────────────────────── */

function buildSystemPrompt(context?: string[]): string {
  const base = `You are an encyclopedic knowledge writer. Write a comprehensive, Wikipedia-style article about a given topic. Follow these rules strictly:

1. Start with a lead section (NO heading) of 2-3 sentences. Bold the subject name on first mention using **Subject**.
2. After the lead, include 8-12 sections using ## headings. Choose from these as appropriate:
   - Etymology, Taxonomy and classification, Description / Anatomy, History, Behavior, Ecology, Distribution, Uses, Cultural significance, Conservation, See also
   - For non-biological topics adapt: Overview, History, Characteristics, Types/Variants, Applications, Impact, Notable examples, Contemporary relevance
3. Write 1000-1500 words total. Be encyclopedic: precise, neutral, factual.
4. Use concrete numbers, dates, proper nouns, and specific details throughout.
5. Do NOT add citations, reference brackets [1], annotation tags, or "Sources" sections.
6. Do NOT use ### sub-headings — only ## level.
7. Write in a neutral, encyclopedic tone. No first person, no hedging, no filler phrases.
8. Each section should be 2-4 paragraphs of substantive content.`;

  if (!context || context.length === 0) return base;

  const contextList = context.slice(0, 10).join(", ");
  return `${base}

9. CONTEXTUAL PERSONALIZATION: The user has recently explored these topics: [${contextList}]. Where relevant, emphasize connections between the current topic and their recent exploration. Include a ## Connections section near the end that explicitly draws parallels and relationships to these previously explored topics. This section should feel natural and insightful, not forced.`;
}

/* ── Main handler ────────────────────────────────────────────────────── */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { keyword, context } = await req.json();
    if (!keyword || typeof keyword !== "string" || keyword.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Missing keyword" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const term = keyword.trim();
    const userContext = Array.isArray(context) ? context.filter((c: unknown) => typeof c === "string").slice(0, 20) : [];
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // ── Phase 1: Wikipedia + Wikidata (fast, non-streaming) ──
    const wiki = await fetchWikipedia(term);

    // Fetch Wikidata structured facts if we have a QID
    let wikidataFacts: Record<string, string> = {};
    if (wiki?.qid) {
      wikidataFacts = await fetchWikidataFacts(wiki.qid);
    }

    // ── Phase 2: Stream AI synthesis via SSE ──
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: buildSystemPrompt(userContext) },
          {
            role: "user",
            content: `Write a comprehensive encyclopedic article about: ${term}`,
          },
        ],
        max_tokens: 2400,
        temperature: 0.3,
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", aiResponse.status, await aiResponse.text());

      // If AI fails but wiki succeeded, return wiki-only as non-streaming JSON
      if (wiki) {
        return new Response(JSON.stringify({
          keyword: term,
          wiki: { ...wiki, facts: wikidataFacts },
          synthesis: null,
          sources: wiki.pageUrl ? [wiki.pageUrl] : [],
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build sources list
    const sources: string[] = [];
    if (wiki?.pageUrl) sources.push(wiki.pageUrl);
    if (wiki?.qid) sources.push(`https://www.wikidata.org/wiki/${wiki.qid}`);

    // Create SSE stream: first emit wiki metadata + wikidata facts, then pipe AI tokens
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Emit wiki metadata + structured facts immediately
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            type: "wiki",
            wiki: wiki ? { ...wiki, facts: wikidataFacts } : null,
            sources,
            keyword: term,
          })}\n\n`)
        );

        // Pipe AI stream tokens
        if (!aiResponse.body) {
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
          return;
        }

        const reader = aiResponse.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            let nlIdx: number;
            while ((nlIdx = buffer.indexOf("\n")) !== -1) {
              let line = buffer.slice(0, nlIdx);
              buffer = buffer.slice(nlIdx + 1);
              if (line.endsWith("\r")) line = line.slice(0, -1);
              if (!line.startsWith("data: ")) continue;

              const jsonStr = line.slice(6).trim();
              if (jsonStr === "[DONE]") {
                controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                controller.close();
                return;
              }

              try {
                const parsed = JSON.parse(jsonStr);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: "delta", content })}\n\n`)
                  );
                }
              } catch {
                buffer = line + "\n" + buffer;
                break;
              }
            }
          }
        } catch (err) {
          console.error("Stream read error:", err);
        }

        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (e) {
    console.error("uor-knowledge error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
