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

    // ── Phase 1: Wikipedia (fast, non-streaming) ──
    let wiki: Record<string, unknown> | null = null;
    try {
      const r = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`,
        { headers: { "Api-User-Agent": "UOR-Framework/1.0" } }
      );
      if (r.ok) {
        const data = await r.json();
        if (data.type === "standard") {
          wiki = {
            qid: data.wikibase_item || null,
            thumbnail: data.thumbnail?.source || data.originalimage?.source || null,
            description: data.description || null,
            extract: data.extract || null,
            pageUrl: data.content_urls?.desktop?.page || null,
          };
        }
      }
    } catch { /* wiki fetch failed, continue */ }

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
          wiki,
          synthesis: null,
          sources: wiki.pageUrl ? [wiki.pageUrl as string] : [],
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
    if (wiki?.pageUrl) sources.push(wiki.pageUrl as string);
    if (wiki?.qid) sources.push(`https://www.wikidata.org/wiki/${wiki.qid}`);

    // Create SSE stream: first emit wiki metadata, then pipe AI tokens
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Emit wiki metadata immediately
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "wiki", wiki, sources, keyword: term })}\n\n`)
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
                // partial JSON, put back
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
