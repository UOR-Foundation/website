import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

/* ── helpers ─────────────────────────────────────────────────────────── */

async function firecrawlScrape(url: string): Promise<any> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY not configured");

  const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
  });
  if (!resp.ok) throw new Error(`Firecrawl scrape failed: ${resp.status}`);
  return resp.json();
}

async function firecrawlMap(url: string, limit = 500): Promise<string[]> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY not configured");

  const resp = await fetch("https://api.firecrawl.dev/v1/map", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, limit, includeSubdomains: false }),
  });
  if (!resp.ok) throw new Error(`Firecrawl map failed: ${resp.status}`);
  const data = await resp.json();
  return data.links || [];
}

function inferDomain(text: string): string {
  const lower = (text || "").toLowerCase();
  const map: Record<string, string[]> = {
    Physics: ["physics", "quantum", "relativity", "thermodynamics", "entropy"],
    Philosophy: ["philosophy", "stoic", "existential", "nietzsche", "plato", "aristotle", "ethics", "moral"],
    Business: ["business", "startup", "entrepreneurship", "management", "strategy", "marketing", "leadership"],
    Finance: ["finance", "investing", "economics", "money", "capital", "wealth", "market"],
    Psychology: ["psychology", "cognitive", "behavior", "brain", "mind", "habit", "thinking"],
    Biology: ["biology", "evolution", "genetics", "life", "organism", "darwin"],
    History: ["history", "civilization", "war", "empire", "ancient", "century"],
    Technology: ["technology", "computer", "software", "algorithm", "ai", "artificial intelligence"],
    Mathematics: ["math", "mathematics", "geometry", "algebra", "calculus", "probability"],
    Self_Improvement: ["self-help", "productivity", "discipline", "grit", "resilience", "mindset", "meditation"],
    Science: ["science", "experiment", "research", "theory", "discovery"],
    Literature: ["novel", "fiction", "poetry", "literature", "narrative", "story"],
  };
  for (const [domain, keywords] of Object.entries(map)) {
    if (keywords.some((k) => lower.includes(k))) return domain.replace("_", " ");
  }
  return "General";
}

/* ── INGEST action ───────────────────────────────────────────────── */

async function handleIngest(sourceUrl: string) {
  // 1. Map the site to find book URLs
  const allLinks = await firecrawlMap(sourceUrl, 300);

  // Filter for book summary pages (heuristic: /book-slug pattern, not category pages)
  const bookLinks = allLinks.filter((l: string) => {
    const path = new URL(l).pathname;
    // blas.com pattern: top-level slug like /the-art-of-war
    return path !== "/" && !path.startsWith("/category") && !path.startsWith("/about")
      && !path.startsWith("/contact") && !path.startsWith("/tag")
      && !path.startsWith("/page") && !path.startsWith("/books")
      && path.split("/").filter(Boolean).length === 1
      && path.length > 3;
  }).slice(0, 100); // cap at 100 books

  console.log(`Found ${bookLinks.length} potential book pages from ${allLinks.length} total links`);

  const results: any[] = [];
  // Process in batches of 5
  for (let i = 0; i < bookLinks.length; i += 5) {
    const batch = bookLinks.slice(i, i + 5);
    const batchResults = await Promise.allSettled(
      batch.map(async (url: string) => {
        // Check if already ingested
        const { data: existing } = await supabaseAdmin
          .from("book_summaries")
          .select("id")
          .eq("source_url", url)
          .maybeSingle();
        if (existing) return { skipped: true, url };

        const scraped = await firecrawlScrape(url);
        const md = scraped?.data?.markdown || scraped?.markdown || "";
        const title = scraped?.data?.metadata?.title || scraped?.metadata?.title || new URL(url).pathname.slice(1).replace(/-/g, " ");
        const ogImage = scraped?.data?.metadata?.ogImage || scraped?.metadata?.ogImage || null;

        if (!md || md.length < 100) return { skipped: true, url, reason: "too short" };

        const domain = inferDomain(md + " " + title);

        const { data: inserted, error } = await supabaseAdmin.from("book_summaries").insert({
          title: title.slice(0, 200),
          author: null,
          cover_url: ogImage,
          source_url: url,
          domain,
          tags: [domain.toLowerCase()],
          summary_markdown: md.slice(0, 15000),
          uor_hash: null,
        }).select("id, title, domain, cover_url, source_url").single();

        if (error) {
          console.error("Insert error:", error);
          return { error: error.message, url };
        }
        return inserted;
      })
    );
    for (const r of batchResults) {
      if (r.status === "fulfilled" && r.value && !(r.value as any).skipped) {
        results.push(r.value);
      }
    }
    // Rate limiting between batches
    if (i + 5 < bookLinks.length) await new Promise((r) => setTimeout(r, 1000));
  }

  return { success: true, ingested: results.length, books: results };
}

/* ── FUSE action (Manual mode) — streaming ───────────────────────── */

async function handleFuse(bookIds: string[], latencyTier?: string) {
  const { data: books, error } = await supabaseAdmin
    .from("book_summaries")
    .select("id, title, author, domain, summary_markdown")
    .in("id", bookIds);

  if (error || !books?.length) throw new Error("Could not load selected books");

  const bookContext = books.map((b: any, i: number) =>
    `### Book ${i + 1}: "${b.title}" (Domain: ${b.domain})\n${(b.summary_markdown || "").slice(0, 3000)}`
  ).join("\n\n---\n\n");

  const systemPrompt = `You are a cross-domain pattern recognition engine rooted in the Universal Object Reference (UOR) framework. Your task is to analyze multiple book summaries and discover INVARIANT PATTERNS — structural principles that transcend individual domains.

## Your output format

Return a JSON array of discovered invariants. Each invariant object has:
- "name": A concise, evocative name for the pattern (3-6 words)
- "description": A clear explanation of the invariant (2-4 sentences)
- "books": Array of book titles that share this pattern
- "domains": Array of domain names involved
- "resonance": A score from 0.0 to 1.0 indicating how strongly this pattern connects the books
- "uor_form": A one-line canonical expression of the invariant in abstract form (e.g. "∀x: compress(x) → emerge(higher_order(x))")
- "insight": A novel insight or prediction this invariant enables

## Rules
1. Find patterns that appear across AT LEAST 2 different domains
2. Prioritize surprising, non-obvious connections over trivial similarities
3. Each invariant should feel like a genuine intellectual discovery
4. Score resonance honestly — higher scores only for deep structural parallels
5. Return 3-7 invariants, ordered by resonance score (highest first)

Return ONLY the JSON array, no markdown fences.`;

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const tier = typeof latencyTier === "string" && TIER_MODELS[latencyTier] ? latencyTier : "balanced";

  const { response } = await fetchWithCascade(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    LOVABLE_API_KEY,
    {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Analyze these ${books.length} books and discover cross-domain invariant patterns:\n\n${bookContext}` },
      ],
      stream: true,
      max_tokens: 4096,
      temperature: 0.5,
    },
    tier,
  );

  if (!response.ok) {
    const status = response.status;
    if (status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    throw new Error(`AI gateway error: ${status}`);
  }

  return new Response(response.body, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
  });
}

/* ── DISCOVER action (Auto mode) — streaming ─────────────────────── */

async function handleDiscover(userContext?: string, latencyTier?: string) {
  const { data: books, error } = await supabaseAdmin
    .from("book_summaries")
    .select("id, title, author, domain, summary_markdown")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error || !books?.length) throw new Error("No books in library yet");

  // Group by domain for the AI
  const domainGroups: Record<string, any[]> = {};
  for (const b of books) {
    const d = b.domain || "General";
    if (!domainGroups[d]) domainGroups[d] = [];
    domainGroups[d].push(b);
  }

  const libraryContext = Object.entries(domainGroups).map(([domain, dBooks]) => {
    const bookList = dBooks.map((b: any) =>
      `- "${b.title}": ${(b.summary_markdown || "").slice(0, 1500)}`
    ).join("\n");
    return `## Domain: ${domain}\n${bookList}`;
  }).join("\n\n===\n\n");

  const systemPrompt = `You are a cross-domain invariant discovery engine. You have access to a library of book summaries spanning multiple domains. Your mission: find the most surprising, deep, structural patterns that connect books ACROSS domains.

## Output format

Return a JSON array of invariant clusters. Each cluster:
- "name": Evocative pattern name (3-6 words)
- "description": What this invariant means and why it matters (3-5 sentences)
- "books": Array of book titles that share this pattern
- "domains": Array of distinct domains connected
- "resonance": Score 0.0-1.0 (only 0.8+ for truly deep structural parallels)
- "uor_form": Abstract canonical expression
- "insight": A novel prediction or application this pattern enables
- "why_surprising": Why this connection is non-obvious (1-2 sentences)

${userContext ? `\n## User Context\nThe user's recent areas of interest: ${userContext}\nPrioritize patterns relevant to their exploration trajectory.\n` : ""}

## Rules
1. Each invariant must span AT LEAST 2 different domains
2. Favor depth over breadth — a profound 2-domain link beats a shallow 5-domain one
3. Think like a polymath: what would connect physics to philosophy? finance to biology?
4. Return 5-10 invariants, ordered by resonance × surprise
5. Return ONLY the JSON array, no markdown fences.`;

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Discover hidden cross-domain invariants across this library of ${books.length} books:\n\n${libraryContext}` },
      ],
      stream: true,
      max_tokens: 6144,
      temperature: 0.6,
    }),
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    throw new Error(`AI gateway error: ${status}`);
  }

  return new Response(response.body, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
  });
}

/* ── Main handler ────────────────────────────────────────────────── */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "ingest") {
      const { sourceUrl } = body;
      if (!sourceUrl) return new Response(JSON.stringify({ error: "sourceUrl required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const result = await handleIngest(sourceUrl);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "fuse") {
      const { bookIds } = body;
      if (!bookIds?.length || bookIds.length < 2) return new Response(JSON.stringify({ error: "Select at least 2 books" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const result = await handleFuse(bookIds);
      if (result instanceof Response) return result;
      // Shouldn't reach here but just in case
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "discover") {
      const { userContext } = body;
      const result = await handleDiscover(userContext);
      if (result instanceof Response) return result;
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // List books
    if (action === "list") {
      const { data, error } = await supabaseAdmin
        .from("book_summaries")
        .select("id, title, author, domain, cover_url, source_url, tags, created_at")
        .order("domain")
        .order("title");
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, books: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("book-resonance error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
