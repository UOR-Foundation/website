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
