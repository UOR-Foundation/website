import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── FNV-1a hash (UOR content-address) ───────────────────────────────── */

function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/* ── Domain Reputation Tier System ───────────────────────────────────── */

const TIER1_DOMAINS: Record<string, number> = {
  "wikipedia.org": 98,
  "nature.com": 97,
  "science.org": 97,
  "arxiv.org": 96,
  "pubmed.ncbi.nlm.nih.gov": 96,
  "ncbi.nlm.nih.gov": 95,
  "plato.stanford.edu": 95,
  "britannica.com": 95,
  "sciencedirect.com": 94,
  "jstor.org": 94,
  "scholar.google.com": 93,
};

const TIER2_PATTERNS: Array<{ pattern: RegExp; score: number }> = [
  { pattern: /\.edu$/, score: 88 },
  { pattern: /\.gov$/, score: 90 },
  { pattern: /\.gov\.\w+$/, score: 88 },
  { pattern: /\.ac\.\w+$/, score: 86 },
];

const TIER2_DOMAINS: Record<string, number> = {
  "who.int": 92,
  "ieee.org": 90,
  "acm.org": 89,
  "springer.com": 88,
  "wiley.com": 87,
  "nih.gov": 92,
  "nasa.gov": 92,
  "cdc.gov": 91,
  "epa.gov": 89,
  "ipcc.ch": 91,
  "un.org": 89,
  "worldbank.org": 88,
  "oecd.org": 88,
  "mayoclinic.org": 88,
  "webmd.com": 75,
  "mathworld.wolfram.com": 88,
};

const TIER3_DOMAINS: Record<string, number> = {
  "bbc.com": 78,
  "bbc.co.uk": 78,
  "reuters.com": 79,
  "apnews.com": 78,
  "nytimes.com": 76,
  "theguardian.com": 75,
  "washingtonpost.com": 74,
  "economist.com": 77,
  "scientificamerican.com": 80,
  "nationalgeographic.com": 78,
  "smithsonianmag.com": 78,
  "newscientist.com": 77,
  "wired.com": 72,
  "arstechnica.com": 73,
  "theatlantic.com": 74,
};

function getDomainReputation(domain: string): number {
  const d = domain.replace(/^www\./, "").toLowerCase();

  // Check exact Tier 1
  for (const [key, score] of Object.entries(TIER1_DOMAINS)) {
    if (d === key || d.endsWith("." + key)) return score;
  }

  // Check exact Tier 2
  for (const [key, score] of Object.entries(TIER2_DOMAINS)) {
    if (d === key || d.endsWith("." + key)) return score;
  }

  // Check Tier 2 patterns (.edu, .gov, etc.)
  for (const { pattern, score } of TIER2_PATTERNS) {
    if (pattern.test(d)) return score;
  }

  // Check Tier 3
  for (const [key, score] of Object.entries(TIER3_DOMAINS)) {
    if (d === key || d.endsWith("." + key)) return score;
  }

  // Known but lower-tier
  if (d.endsWith(".org")) return 55;
  if (d.endsWith(".io")) return 40;

  return 30; // Unknown
}

function computeTitleRelevance(keyword: string, title: string, description: string): number {
  const kw = keyword.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  if (kw.length === 0) return 50;

  const text = (title + " " + description).toLowerCase();
  let matches = 0;
  for (const w of kw) {
    if (text.includes(w)) matches++;
  }

  // Full phrase match bonus
  if (text.includes(keyword.toLowerCase())) return 100;

  return Math.min(100, Math.round((matches / kw.length) * 90) + 10);
}

interface RankedSource {
  url: string;
  title: string;
  description: string;
  domain: string;
  type: "academic" | "institutional" | "news" | "web";
  score: number;
  markdown?: string;
}

function classifyDomain(domain: string): RankedSource["type"] {
  const d = domain.replace(/^www\./, "").toLowerCase();
  // Academic
  if (/\.edu$|\.ac\.\w+$/.test(d)) return "academic";
  if (["arxiv.org", "pubmed.ncbi.nlm.nih.gov", "ncbi.nlm.nih.gov", "nature.com", "science.org",
       "sciencedirect.com", "jstor.org", "springer.com", "wiley.com", "ieee.org", "acm.org",
       "scholar.google.com", "plato.stanford.edu", "mathworld.wolfram.com"].some(a => d === a || d.endsWith("." + a))) return "academic";
  // Institutional
  if (/\.gov($|\.\w+$)/.test(d)) return "institutional";
  if (["who.int", "un.org", "worldbank.org", "oecd.org", "ipcc.ch", "nasa.gov", "nih.gov",
       "cdc.gov", "epa.gov", "britannica.com", "mayoclinic.org"].some(a => d === a || d.endsWith("." + a))) return "institutional";
  // News
  if (Object.keys(TIER3_DOMAINS).some(a => d === a || d.endsWith("." + a))) return "news";
  return "web";
}

function rankSources(keyword: string, results: Array<{ url: string; title: string; description: string; markdown?: string }>): RankedSource[] {
  return results
    .map(r => {
      let domain: string;
      try {
        domain = new URL(r.url).hostname.replace(/^www\./, "");
      } catch {
        domain = r.url.split("/")[2] || r.url;
      }

      const domainRep = getDomainReputation(domain);
      const titleRel = computeTitleRelevance(keyword, r.title || "", r.description || "");
      const score = Math.round(domainRep * 0.6 + titleRel * 0.4);

      return {
        url: r.url,
        title: r.title || domain,
        description: (r.description || "").slice(0, 300),
        domain,
        type: classifyDomain(domain),
        score,
        markdown: r.markdown?.slice(0, 1500),
      };
    })
    .sort((a, b) => b.score - a.score);
}

/* ── Firecrawl Source Discovery ───────────────────────────────────────── */

async function fetchTopSources(keyword: string): Promise<RankedSource[]> {
  try {
    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) {
      console.log("FIRECRAWL_API_KEY not set — skipping source discovery");
      return [];
    }

    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: keyword,
        limit: 8,
        scrapeOptions: { formats: ["markdown"] },
      }),
    });

    if (!response.ok) {
      console.error("Firecrawl search failed:", response.status);
      return [];
    }

    const data = await response.json();
    const results: Array<{ url: string; title: string; description: string; markdown?: string }> = (data.data || []).map((r: any) => ({
      url: r.url || "",
      title: r.title || "",
      description: r.description || "",
      markdown: r.markdown || "",
    }));

    // Filter out Wikipedia (already have it) and duplicates
    const filtered = results.filter(r => {
      try {
        const domain = new URL(r.url).hostname.toLowerCase();
        return !domain.includes("wikipedia.org") && !domain.includes("wikidata.org");
      } catch {
        return true;
      }
    });

    const ranked = rankSources(keyword, filtered);

    // Return top 4 sources with score >= 40
    return ranked.filter(s => s.score >= 40).slice(0, 4);
  } catch (err) {
    console.error("fetchTopSources error:", err);
    return [];
  }
}

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
      pageTitle: data.titles?.display || data.title || null,
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

/* ── Wikimedia Commons media fetch ───────────────────────────────────── */

interface MediaImage {
  url: string;
  caption: string;
  uorHash: string;
  source: string;
}

interface MediaVideo {
  youtubeId: string;
  title: string;
  uorHash: string;
}

interface MediaAudio {
  url: string;
  title: string;
  uorHash: string;
}

async function fetchCommonsMedia(term: string, _qid: string | null): Promise<{
  images: MediaImage[];
  videos: MediaVideo[];
  audio: MediaAudio[];
}> {
  const images: MediaImage[] = [];
  const videos: MediaVideo[] = [];
  const audio: MediaAudio[] = [];

  // ── Wikipedia images ──
  try {
    const wikiTitle = encodeURIComponent(term);
    const r = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${wikiTitle}&prop=images&imlimit=10&format=json&origin=*`,
      { headers: { "Api-User-Agent": "UOR-Framework/1.0" } }
    );
    if (r.ok) {
      const data = await r.json();
      const pages = data.query?.pages || {};
      for (const page of Object.values(pages) as Array<{ images?: Array<{ title: string }> }>) {
        if (!page.images) continue;
        for (const img of page.images) {
          const filename = img.title;
          if (/\.(svg|ico)$/i.test(filename)) continue;
          if (/Flag_of_|Commons-logo|Wiki|Symbol|Icon|Pictogram|Ambox|Edit-|Question_book|Text_document/i.test(filename)) continue;

          try {
            const infoR = await fetch(
              `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(filename)}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=800&format=json&origin=*`,
              { headers: { "Api-User-Agent": "UOR-Framework/1.0" } }
            );
            if (infoR.ok) {
              const infoData = await infoR.json();
              const infoPages = infoData.query?.pages || {};
              for (const infoPage of Object.values(infoPages) as Array<{ imageinfo?: Array<{ thumburl?: string; url?: string; extmetadata?: Record<string, { value?: string }> }> }>) {
                const info = infoPage.imageinfo?.[0];
                if (!info) continue;
                const imgUrl = info.thumburl || info.url;
                if (!imgUrl) continue;
                const caption = info.extmetadata?.ImageDescription?.value?.replace(/<[^>]*>/g, "").slice(0, 200) ||
                  filename.replace(/^File:/, "").replace(/\.[^.]+$/, "").replace(/_/g, " ");
                images.push({
                  url: imgUrl,
                  caption,
                  uorHash: fnv1a(imgUrl),
                  source: "wikimedia-commons",
                });
              }
            }
          } catch { /* skip this image */ }

          if (images.length >= 8) break;
        }
      }
    }
  } catch { /* commons fetch failed */ }

  // ── YouTube videos via Invidious ──
  try {
    const searchTerm = encodeURIComponent(`${term} explained documentary`);
    const invidiousR = await fetch(
      `https://vid.puffyan.us/api/v1/search?q=${searchTerm}&type=video&sort_by=relevance&page=1`,
      { headers: { "User-Agent": "UOR-Framework/1.0" }, signal: AbortSignal.timeout(4000) }
    );
    if (invidiousR.ok) {
      const results = await invidiousR.json();
      const validVideos = (results as Array<{ videoId?: string; title?: string; lengthSeconds?: number }>)
        .filter((v) => v.videoId && v.title && (v.lengthSeconds || 0) > 60 && (v.lengthSeconds || 0) < 3600)
        .slice(0, 3);
      for (const v of validVideos) {
        videos.push({
          youtubeId: v.videoId!,
          title: v.title!,
          uorHash: fnv1a(v.videoId!),
        });
      }
    }
  } catch { /* invidious fetch failed — try fallback */ }

  // ── Fallback YouTube via piped.video ──
  if (videos.length === 0) {
    try {
      const searchTerm = encodeURIComponent(`${term} explained`);
      const pipedR = await fetch(
        `https://pipedapi.kavin.rocks/search?q=${searchTerm}&filter=videos`,
        { headers: { "User-Agent": "UOR-Framework/1.0" }, signal: AbortSignal.timeout(4000) }
      );
      if (pipedR.ok) {
        const data = await pipedR.json();
        const items = (data.items || []) as Array<{ url?: string; title?: string; duration?: number }>;
        for (const item of items.slice(0, 3)) {
          if (!item.url || !item.title) continue;
          const match = item.url.match(/\/watch\?v=([^&]+)/);
          if (match) {
            videos.push({
              youtubeId: match[1],
              title: item.title,
              uorHash: fnv1a(match[1]),
            });
          }
        }
      }
    } catch { /* piped fetch failed */ }
  }

  // ── Wikipedia pronunciation audio ──
  try {
    const wikiTitle = encodeURIComponent(term);
    const audioR = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${wikiTitle}&prop=images&format=json&origin=*`,
      { headers: { "Api-User-Agent": "UOR-Framework/1.0" }, signal: AbortSignal.timeout(3000) }
    );
    if (audioR.ok) {
      const data = await audioR.json();
      const pages = data.query?.pages || {};
      for (const page of Object.values(pages) as Array<{ images?: Array<{ title: string }> }>) {
        if (!page.images) continue;
        for (const f of page.images) {
          if (/\.(ogg|oga|wav|mp3|flac)$/i.test(f.title)) {
            try {
              const infoR = await fetch(
                `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(f.title)}&prop=imageinfo&iiprop=url&format=json&origin=*`,
                { headers: { "Api-User-Agent": "UOR-Framework/1.0" } }
              );
              if (infoR.ok) {
                const infoData = await infoR.json();
                const infoPages = infoData.query?.pages || {};
                for (const p of Object.values(infoPages) as Array<{ imageinfo?: Array<{ url?: string }> }>) {
                  const url = p.imageinfo?.[0]?.url;
                  if (url) {
                    audio.push({
                      url,
                      title: f.title.replace(/^File:/, "").replace(/\.[^.]+$/, "").replace(/_/g, " "),
                      uorHash: fnv1a(url),
                    });
                  }
                }
              }
            } catch { /* skip */ }
            if (audio.length >= 2) break;
          }
        }
      }
    }
  } catch { /* audio fetch failed */ }

  return { images, videos, audio };
}

/* ── Lens system prompts ─────────────────────────────────────────────── */

/** Build a dynamic prompt from blueprint params (new adaptive system) */
function buildBlueprintPrompt(params: {
  tone?: string;
  depth?: string;
  audience?: string;
  structure?: string;
  citationDensity?: string;
  focusAreas?: string[];
  excludeAreas?: string[];
}, context?: string[], sourceCount?: number): string {
  const totalSources = sourceCount || 2;
  const citationNote = totalSources > 2
    ? `Use [1] for Wikipedia, [2] for Wikidata, and [3]-[${totalSources}] for additional sources.`
    : `Use [1] for Wikipedia and [2] for Wikidata.`;

  const toneMap: Record<string, string> = {
    neutral: "Write in a neutral, encyclopedic tone. No first person, no hedging.",
    vivid: "Write in a vivid, cinematic style with dramatic flair and sensory language.",
    technical: "Write in a precise, rigorous, scholarly tone using domain-specific terminology.",
    conversational: "Write in a warm, accessible, conversational tone using simple everyday language.",
    poetic: "Write in a lyrical, evocative style that finds beauty and drama in the subject.",
  };

  const depthMap: Record<string, string> = {
    overview: "Write 500-800 words. Give a clear high-level overview without excessive detail.",
    standard: "Write 1000-1500 words. Be comprehensive but concise.",
    deep: "Write 1500-2200 words. Provide substantial depth and technical detail.",
    exhaustive: "Write 2000-3000 words. Leave no significant aspect uncovered.",
  };

  const audienceMap: Record<string, string> = {
    beginner: "Explain for someone with no background. Use analogies to everyday things. Define all terms.",
    curious: "Write for an intelligent general reader. Explain specialized terms briefly.",
    informed: "Assume the reader has basic domain knowledge. Focus on insights rather than definitions.",
    expert: "Write for domain experts. Use technical terminology without over-explaining.",
  };

  const structureMap: Record<string, string> = {
    sections: "Structure with ## headings for 6-12 organized sections.",
    narrative: "Structure as a narrative arc: setup → discovery → implications → reflection.",
    qa: "Structure as a series of compelling questions and thorough answers.",
    timeline: "Structure chronologically, tracing the evolution of the topic over time.",
    comparison: "Structure around comparisons: different perspectives, approaches, or schools of thought.",
  };

  const citMap: Record<string, string> = {
    minimal: "Add only 2-4 citation markers for the most critical claims.",
    moderate: "Add citation markers after key factual claims. " + citationNote,
    thorough: "Add citation markers after every significant factual claim. " + citationNote,
  };

  const parts: string[] = [
    "You are a world-class knowledge writer. Write a comprehensive article about the given topic.",
    "",
    `TONE: ${toneMap[params.tone || "neutral"] || toneMap.neutral}`,
    `DEPTH: ${depthMap[params.depth || "standard"] || depthMap.standard}`,
    `AUDIENCE: ${audienceMap[params.audience || "curious"] || audienceMap.curious}`,
    `STRUCTURE: ${structureMap[params.structure || "sections"] || structureMap.sections}`,
    `CITATIONS: ${citMap[params.citationDensity || "moderate"] || citMap.moderate}`,
    "",
    "Bold the subject on first mention using **Subject**.",
    "Do NOT use ### sub-headings — only ## level.",
  ];

  if (params.focusAreas && params.focusAreas.length > 0) {
    parts.push(`\nFOCUS AREAS: Emphasize these aspects: ${params.focusAreas.join(", ")}.`);
  }
  if (params.excludeAreas && params.excludeAreas.length > 0) {
    parts.push(`\nEXCLUDE: Do not cover or minimize these aspects: ${params.excludeAreas.join(", ")}.`);
  }

  if (context && context.length > 0) {
    parts.push(`\nCONTEXTUAL PERSONALIZATION: The user has recently explored: [${context.slice(0, 10).join(", ")}]. Where relevant, emphasize connections. Include a ## Connections section near the end.`);
  }

  return parts.join("\n");
}

function buildLensPrompt(lens: string, context?: string[], sourceCount?: number): string {
  const totalSources = sourceCount || 2;
  const citationNote = totalSources > 2
    ? `Use [1] for Wikipedia, [2] for Wikidata, and [3]-[${totalSources}] for additional authoritative sources. Distribute citations across all available sources based on which source best supports each claim.`
    : `Use [1] for Wikipedia-sourced facts and [2] for Wikidata-sourced facts.`;

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
8. Add inline citation markers [1], [2] etc. after key factual claims. ${citationNote} Keep citations minimal — they should never interrupt the narrative flow.
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
9. Add light inline citation markers [1], [2] after 2-4 key factual claims. ${citationNote} Keep citations very minimal — they should feel invisible.
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
9. Add inline citation markers [1], [2] etc. after key factual claims. ${citationNote} Place markers right after the relevant sentence, before the period when mid-sentence or after the period for whole-paragraph claims.
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
9. Add light inline citation markers [1], [2] etc. after key factual claims. ${citationNote} Keep citations minimal — they must never break the storytelling momentum.
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
5. Add inline citation markers [1], [2] etc. after key factual claims. ${citationNote} Place markers right after the relevant claim.
6. Do NOT use ### sub-headings — only ## level.
7. Write in a neutral, encyclopedic tone. No first person, no hedging, no filler phrases.
8. Each section should be 2-4 paragraphs of substantive content.${contextSuffix}`;
  }
}

/* ── Build enriched user message with source context ─────────────────── */

function buildUserMessage(term: string, lens: string, wiki: any, topSources: RankedSource[]): string {
  let msg = `Write a comprehensive ${lens === "encyclopedia" ? "encyclopedic article" : "article"} about: ${term}`;

  if (wiki?.extract) {
    msg += `\n\nWikipedia summary: ${wiki.extract}`;
  }

  if (topSources.length > 0) {
    msg += `\n\nAdditional authoritative sources discovered for this topic:`;
    topSources.forEach((s, i) => {
      msg += `\n[Source ${i + 3}] ${s.title} (${s.domain}, ${s.type})`;
      if (s.description) msg += `: ${s.description}`;
      if (s.markdown) msg += `\nExcerpt: ${s.markdown.slice(0, 800)}`;
    });
    msg += `\n\nUse information from these sources where relevant and cite them with the appropriate [N] markers.`;
  }

  return msg;
}

/* ── Main handler ────────────────────────────────────────────────────── */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { keyword, context, lens, lensParams } = await req.json();
    if (!keyword || typeof keyword !== "string" || keyword.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Missing keyword" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const term = keyword.trim();
    const userContext = Array.isArray(context) ? context.filter((c: unknown) => typeof c === "string").slice(0, 20) : [];
    const activeLens = typeof lens === "string" ? lens : "encyclopedia";
    const blueprintParams = lensParams && typeof lensParams === "object" ? lensParams : null;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // ── Fire Wikipedia + Firecrawl in parallel, but don't wait for Firecrawl ──
    const wikiPromise = fetchWikipedia(term);
    const firecrawlPromise = fetchTopSources(term);

    // Await Wikipedia immediately — this is the critical path
    const wiki = await wikiPromise;

    // Give Firecrawl a 500ms head start; if it's not done, proceed without it
    let topSources: RankedSource[] = [];
    try {
      topSources = await Promise.race([
        firecrawlPromise,
        new Promise<RankedSource[]>((resolve) => setTimeout(() => resolve([]), 500)),
      ]);
    } catch { /* proceed without firecrawl */ }

    // Build enriched sources list
    const sources: Array<{ url: string; title: string; type: string; score?: number }> = [];
    if (wiki?.pageUrl) sources.push({ url: wiki.pageUrl, title: wiki.pageTitle || term, type: "wikipedia", score: 98 });
    if (wiki?.qid) sources.push({ url: `https://www.wikidata.org/wiki/${wiki.qid}`, title: `${term} — Wikidata`, type: "wikidata", score: 95 });
    for (const s of topSources) {
      sources.push({ url: s.url, title: s.title, type: s.type, score: s.score });
    }

    console.log(`Sources for "${term}": ${sources.length} total (${topSources.length} from Firecrawl, waited ≤500ms)`);

    // Build AI prompt — use blueprint params if available, otherwise use lens ID
    const systemPrompt = blueprintParams
      ? buildBlueprintPrompt(blueprintParams, userContext, sources.length)
      : buildLensPrompt(activeLens, userContext, sources.length);

    const userMessage = buildUserMessage(term, activeLens, wiki, topSources);

    // Determine temperature and max tokens from params or lens
    const effectiveDepth = blueprintParams?.depth || (activeLens === "expert" ? "exhaustive" : "standard");
    const effectiveTone = blueprintParams?.tone || activeLens;
    const maxTokens = effectiveDepth === "exhaustive" ? 3200 : effectiveDepth === "deep" ? 2800 : 2400;
    const temperature = (effectiveTone === "poetic" || effectiveTone === "vivid" || activeLens === "storyteller" || activeLens === "magazine") ? 0.6 : 0.3;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: maxTokens,
        temperature,
        stream: true,
      }),
    });

    const isPersonalized = userContext.length > 0;

    // Kick off Wikidata + Commons media in background
    const wikidataPromise = wiki?.qid
      ? fetchWikidataFacts(wiki.qid)
      : Promise.resolve({} as Record<string, string>);

    const mediaPromise = fetchCommonsMedia(term, wiki?.qid || null);

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
          sources: sources,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
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
            model: "uor-synthesis",
            personalized: isPersonalized,
            personalizedTopics: isPersonalized ? userContext.slice(0, 5) : [],
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
                    model: "uor-synthesis",
                    personalized: isPersonalized,
                    personalizedTopics: isPersonalized ? userContext.slice(0, 5) : [],
                  })}\n\n`)
                );
              } catch { /* stream may be closed */ }
            }
          }).catch(() => {});
        }

        // Emit media event when Commons data arrives
        mediaPromise.then((media) => {
          if (media.images.length > 0 || media.videos.length > 0) {
            try {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: "media",
                  media,
                })}\n\n`)
              );
            } catch { /* stream may be closed */ }
          }
        }).catch(() => {});

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
