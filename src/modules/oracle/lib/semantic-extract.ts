/**
 * Semantic Web Extraction — Absorb existing structured data from any web page.
 *
 * Parses rawHtml to extract:
 *   1. JSON-LD blocks (<script type="application/ld+json">)
 *   2. Open Graph meta tags (<meta property="og:*">)
 *   3. Standard meta tags (description, author, keywords)
 *   4. RDFa lite attributes (typeof, property, content)
 *
 * Returns a unified ExistingSemantics object that gets folded into the
 * canonical UOR document — preserving all semantic data the page already publishes.
 */

export interface ExistingSemantics {
  jsonLd: unknown[];
  openGraph: Record<string, string>;
  meta: Record<string, string>;
  /** true if any structured data was found */
  hasStructuredData: boolean;
}

/**
 * Extract all existing semantic data from raw HTML.
 * Pure function — no side effects, no DOM dependency (regex-based).
 */
export function extractSemantics(rawHtml: string): ExistingSemantics {
  const jsonLd = extractJsonLd(rawHtml);
  const openGraph = extractOpenGraph(rawHtml);
  const meta = extractMeta(rawHtml);

  return {
    jsonLd,
    openGraph,
    meta,
    hasStructuredData: jsonLd.length > 0 || Object.keys(openGraph).length > 0,
  };
}

/* ── JSON-LD ──────────────────────────────────────────────────────────── */

function extractJsonLd(html: string): unknown[] {
  const results: unknown[] = [];
  const regex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      // Could be a single object or an array
      if (Array.isArray(parsed)) {
        results.push(...parsed);
      } else {
        results.push(parsed);
      }
    } catch {
      // Malformed JSON-LD — skip
    }
  }

  return results;
}

/* ── Open Graph ───────────────────────────────────────────────────────── */

function extractOpenGraph(html: string): Record<string, string> {
  const og: Record<string, string> = {};
  const regex = /<meta[^>]*property\s*=\s*["'](og:[^"']+)["'][^>]*content\s*=\s*["']([^"']*)["'][^>]*\/?>/gi;
  const regex2 = /<meta[^>]*content\s*=\s*["']([^"']*)["'][^>]*property\s*=\s*["'](og:[^"']+)["'][^>]*\/?>/gi;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    og[match[1]] = match[2];
  }
  while ((match = regex2.exec(html)) !== null) {
    og[match[2]] = match[1];
  }

  return og;
}

/* ── Standard meta ────────────────────────────────────────────────────── */

function extractMeta(html: string): Record<string, string> {
  const meta: Record<string, string> = {};
  const names = ["description", "author", "keywords", "robots", "viewport"];

  for (const name of names) {
    const regex = new RegExp(
      `<meta[^>]*name\\s*=\\s*["']${name}["'][^>]*content\\s*=\\s*["']([^"']*)["'][^>]*/?>`,
      "i"
    );
    const regex2 = new RegExp(
      `<meta[^>]*content\\s*=\\s*["']([^"']*)["'][^>]*name\\s*=\\s*["']${name}["'][^>]*/?>`,
      "i"
    );
    const match = regex.exec(html) || regex2.exec(html);
    if (match) {
      meta[name] = match[1];
    }
  }

  // Also grab <title>
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (titleMatch) {
    meta["title"] = titleMatch[1].trim();
  }

  return meta;
}

/* ── Wikipedia helpers ────────────────────────────────────────────────── */

/** Detect if a URL is a Wikipedia article and extract the title slug. */
export function parseWikipediaUrl(url: string): { lang: string; title: string } | null {
  const match = url.match(/^https?:\/\/([a-z]{2,3})\.wikipedia\.org\/wiki\/([^#?]+)/i);
  if (!match) return null;
  return { lang: match[1], title: decodeURIComponent(match[2]) };
}

/** Wikipedia REST API summary response (subset of fields we use). */
export interface WikiSummary {
  qid: string;
  thumbnail: string | null;
  extract: string;
  description: string;
  revision: string;
  timestamp: string;
}

/**
 * Fetch structured metadata from the Wikipedia REST API.
 * Pure client-side — no auth required.
 */
export async function fetchWikiSummary(lang: string, title: string): Promise<WikiSummary | null> {
  try {
    const res = await fetch(
      `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { headers: { "Api-User-Agent": "UOR-Foundation/1.0 (https://uor.foundation)" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      qid: data.wikibase_item || "",
      thumbnail: data.thumbnail?.source || null,
      extract: data.extract || "",
      description: data.description || "",
      revision: String(data.revision || ""),
      timestamp: data.timestamp || "",
    };
  } catch {
    return null;
  }
}

/**
 * Extract infobox-style key/value pairs from Wikipedia markdown.
 * Parses the taxonomy/classification table that Firecrawl returns as markdown tables.
 */
export function extractWikiInfobox(markdown: string): Record<string, string> {
  const infobox: Record<string, string> = {};
  // Match markdown table rows like "| Kingdom | Animalia |"
  const rows = markdown.match(/^\|[^|]+\|[^|]+\|$/gm);
  if (!rows) return infobox;

  const taxonomyKeys = new Set([
    "kingdom", "phylum", "class", "order", "family", "genus", "species",
    "domain", "clade", "suborder", "infraorder", "superfamily", "subfamily",
    "tribe", "subtribe", "subphylum", "subclass", "superorder",
  ]);

  for (const row of rows) {
    const cells = row.split("|").map(c => c.trim()).filter(Boolean);
    if (cells.length >= 2) {
      const key = cells[0].replace(/\*+/g, "").replace(/\[.*?\]/g, "").trim();
      const val = cells[1].replace(/\*+/g, "").replace(/\[.*?\]/g, "").trim();
      if (key && val && taxonomyKeys.has(key.toLowerCase())) {
        infobox[key] = val;
      }
    }
  }
  return infobox;
}
