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

/* ── Lens system prompts ─────────────────────────────────────────────── */

function buildLensPrompt(lens: string, context?: string[]): string {
  const contextSuffix = (context && context.length > 0)
    ? `\n\nCONTEXTUAL PERSONALIZATION: The user has recently explored these topics: [${context.slice(0, 10).join(", ")}]. Where relevant, emphasize connections between the current topic and their recent exploration. Include a ## Connections section near the end that explicitly draws parallels and relationships to these previously explored topics. This section should feel natural and insightful, not forced.`
    : "";

  switch (lens) {
    case "magazine":
      return `You are a world-class feature writer for a premium magazine like The Atlantic or National Geographic. Write a riveting, beautifully crafted feature article about the given topic. Follow these rules:

1. Open with a cinematic hook — a vivid scene, striking image, or provocative question. Bold the subject on first mention using **Subject**.
2. Use ## headings for 6-8 sections. Structure like a magazine feature: The Hook, The Discovery, The Science/History, The Human Story, The Controversy, The Future, The Takeaway.
3. Write 1000-1500 words. Be vivid, sensory, and engaging while remaining accurate.
4. Use dramatic pacing — short punchy paragraphs alternating with longer descriptive ones.
5. Include specific quotes (attributed to real experts when possible), concrete anecdotes, and surprising statistics.
6. Weave in human interest — how does this topic affect real people?
7. End with a thought-provoking final line that lingers.
8. Do NOT add citations, reference brackets, or "Sources" sections.
9. Do NOT use ### sub-headings — only ## level.
10. Tone: Intelligent, warm, occasionally witty. Like explaining something fascinating at a dinner party.${contextSuffix}`;

    case "explain-like-5":
      return `You are the world's most magical teacher, explaining things to a curious 8-year-old who asks "why?" about everything. Write about the given topic in a way that sparks wonder. Follow these rules:

1. Start with something amazing — "Did you know…?" or "Imagine if…". Bold the subject on first mention using **Subject**.
2. Use ## headings for 5-7 sections with fun, kid-friendly titles like "How Does It Work?", "Why Is It So Cool?", "The Biggest Surprise".
3. Write 600-900 words. Every sentence should be clear enough for a child but never condescending.
4. Use lots of analogies to everyday things: "It's like when you…", "Think of it as a giant…"
5. Include "Wow!" moments — surprising facts that make you go "No way!"
6. Use simple words but don't shy away from teaching real vocabulary — just explain it: "This is called 'photosynthesis' — it's basically how plants eat sunlight!"
7. Ask rhetorical questions to keep engagement: "Can you guess what happens next?"
8. End with something that encourages curiosity: "Next time you see a ___, think about…"
9. Do NOT add citations or reference brackets.
10. Do NOT use ### sub-headings — only ## level.${contextSuffix}`;

    case "expert":
      return `You are a senior researcher writing a technical review for an audience of graduate students and domain experts. Write a rigorous, in-depth analysis of the given topic. Follow these rules:

1. Open with a precise technical summary (NO heading). Bold the subject on first mention using **Subject**. State the current state of knowledge and key open questions.
2. Use ## headings for 8-12 sections. Choose from: Theoretical Framework, Methodology, Mechanisms, Quantitative Analysis, Current Models, Empirical Evidence, Limitations, Open Problems, Recent Advances, Interdisciplinary Connections, Future Directions.
3. Write 1200-1800 words. Be precise, rigorous, and data-driven.
4. Use domain-specific terminology without over-explaining — your audience knows the basics.
5. Include specific numbers, equations described in words, key parameters, and quantitative comparisons.
6. Reference key theoretical frameworks, seminal papers (by author name and year), and competing hypotheses.
7. Discuss limitations, edge cases, and where current understanding breaks down.
8. Maintain a scholarly but readable tone — not dry, but authoritative.
9. Add inline citation markers [1], [2] etc. after key factual claims to reference the source list. Use [1] for Wikipedia-sourced facts and [2] for Wikidata-sourced facts. Place markers right after the relevant sentence, before the period when mid-sentence or after the period for whole-paragraph claims.
10. Do NOT use ### sub-headings — only ## level.${contextSuffix}`;

    case "storyteller":
      return `You are a master storyteller in the tradition of Carl Sagan, David Attenborough, and Bill Bryson. Transform the given topic into a compelling narrative with characters, tension, and drama. Follow these rules:

1. Open in medias res — drop the reader into a moment of discovery, conflict, or wonder. Bold the subject on first mention using **Subject**.
2. Use ## headings for 6-8 chapters with evocative titles: "The Night Everything Changed", "A Universe in a Grain of Sand", "The Race Against Time".
3. Write 1000-1500 words. Every paragraph should pull the reader forward.
4. Build a narrative arc: setup → rising action → revelation → implications → denouement.
5. Make real people the heroes — scientists, explorers, thinkers. Give them dialogue, motivations, struggles.
6. Use the present tense for key moments to create immediacy: "She lifts the slide to the microscope. What she sees changes everything."
7. Weave factual content seamlessly into the story — the reader learns without realizing they're learning.
8. End with a resonant image or reflection that connects the topic to something universal about human experience.
9. Do NOT add citations, reference brackets, or "Sources" sections.
10. Do NOT use ### sub-headings — only ## level.${contextSuffix}`;

    case "encyclopedia":
    default:
      return `You are an encyclopedic knowledge writer. Write a comprehensive, Wikipedia-style article about a given topic. Follow these rules strictly:

1. Start with a lead section (NO heading) of 2-3 sentences. Bold the subject name on first mention using **Subject**.
2. After the lead, include 8-12 sections using ## headings. Choose from these as appropriate:
   - Etymology, Taxonomy and classification, Description / Anatomy, History, Behavior, Ecology, Distribution, Uses, Cultural significance, Conservation, See also
   - For non-biological topics adapt: Overview, History, Characteristics, Types/Variants, Applications, Impact, Notable examples, Contemporary relevance
3. Write 1000-1500 words total. Be encyclopedic: precise, neutral, factual.
4. Use concrete numbers, dates, proper nouns, and specific details throughout.
5. Add inline citation markers [1], [2] etc. after key factual claims to reference the source list. Use [1] for Wikipedia-sourced facts and [2] for Wikidata-sourced facts. Place markers right after the relevant claim.
6. Do NOT use ### sub-headings — only ## level.
7. Write in a neutral, encyclopedic tone. No first person, no hedging, no filler phrases.
8. Each section should be 2-4 paragraphs of substantive content.${contextSuffix}`;
  }
}

/* ── Main handler ────────────────────────────────────────────────────── */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { keyword, context, lens } = await req.json();
    if (!keyword || typeof keyword !== "string" || keyword.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Missing keyword" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const term = keyword.trim();
    const userContext = Array.isArray(context) ? context.filter((c: unknown) => typeof c === "string").slice(0, 20) : [];
    const activeLens = typeof lens === "string" ? lens : "encyclopedia";
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // ── Fire Wikipedia + AI in parallel (TTFT optimization) ──
    const wikiPromise = fetchWikipedia(term);
    const aiPromise = fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: buildLensPrompt(activeLens, userContext) },
          {
            role: "user",
            content: `Write a comprehensive ${activeLens === "encyclopedia" ? "encyclopedic article" : "article"} about: ${term}`,
          },
        ],
        max_tokens: activeLens === "expert" ? 3200 : 2400,
        temperature: activeLens === "storyteller" || activeLens === "magazine" ? 0.6 : 0.3,
        stream: true,
      }),
    });

    // Wait for both — AI starts warming up while wiki fetches
    const [wiki, aiResponse] = await Promise.all([wikiPromise, aiPromise]);

    // Kick off Wikidata in background (don't block the stream)
    const wikidataPromise = wiki?.qid
      ? fetchWikidataFacts(wiki.qid)
      : Promise.resolve({} as Record<string, string>);

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

      const wikidataFacts = await wikidataPromise;
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

    // Build initial sources list (wikidata facts still loading)
    const sources: string[] = [];
    if (wiki?.pageUrl) sources.push(wiki.pageUrl);
    if (wiki?.qid) sources.push(`https://www.wikidata.org/wiki/${wiki.qid}`);

    // Create SSE stream — emit wiki immediately, then AI tokens
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Emit wiki event right away (wikidata facts may arrive later)
        // Try to get wikidata within 150ms, otherwise emit without and update later
        let wikidataFacts: Record<string, string> = {};
        try {
          wikidataFacts = await Promise.race([
            wikidataPromise,
            new Promise<Record<string, string>>((resolve) =>
              setTimeout(() => resolve({}), 150)
            ),
          ]);
        } catch { /* proceed without facts */ }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            type: "wiki",
            wiki: wiki ? { ...wiki, facts: wikidataFacts } : null,
            sources,
            keyword: term,
          })}\n\n`)
        );

        // If wikidata was still loading, emit an update when it arrives
        if (wiki?.qid && Object.keys(wikidataFacts).length === 0) {
          wikidataPromise.then((facts) => {
            if (Object.keys(facts).length > 0) {
              try {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({
                    type: "wiki",
                    wiki: { ...wiki, facts },
                    sources,
                    keyword: term,
                  })}\n\n`)
                );
              } catch { /* stream may be closed */ }
            }
          }).catch(() => {});
        }

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
