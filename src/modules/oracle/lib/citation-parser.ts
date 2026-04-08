/**
 * citation-parser — Detect [N] citation markers in markdown and provide
 * metadata for rendering inline citation badges.
 *
 * UOR-anchored: each source URL gets a deterministic fnv1a content-address
 * so readers can verify provenance in the UOR identity space.
 */

export type SourceType = "wikipedia" | "wikidata" | "academic" | "institutional" | "news" | "web";

export interface SourceMeta {
  url: string;
  domain: string;
  type: SourceType;
  /** Human-readable title for the source */
  title?: string;
  /** Deterministic UOR content hash (fnv1a hex of URL) */
  uorHash: string;
  /** Signal quality score (0-100) from the ranker */
  score?: number;
}

/** FNV-1a 32-bit hash — lightweight, deterministic content address */
function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/* ── Domain classification ───────────────────────────────────────────── */

const ACADEMIC_DOMAINS = [
  "arxiv.org", "pubmed.ncbi.nlm.nih.gov", "ncbi.nlm.nih.gov",
  "nature.com", "science.org", "sciencedirect.com", "jstor.org",
  "springer.com", "wiley.com", "ieee.org", "acm.org",
  "scholar.google.com", "plato.stanford.edu", "mathworld.wolfram.com",
];

const INSTITUTIONAL_DOMAINS = [
  "who.int", "un.org", "worldbank.org", "oecd.org", "ipcc.ch",
  "britannica.com", "mayoclinic.org",
];

const NEWS_DOMAINS = [
  "bbc.com", "bbc.co.uk", "reuters.com", "apnews.com", "nytimes.com",
  "theguardian.com", "washingtonpost.com", "economist.com",
  "scientificamerican.com", "nationalgeographic.com", "smithsonianmag.com",
  "newscientist.com", "wired.com", "arstechnica.com", "theatlantic.com",
];

function classifyDomain(domain: string): SourceType {
  const d = domain.replace(/^www\./, "").toLowerCase();
  if (d.includes("wikipedia")) return "wikipedia";
  if (d.includes("wikidata")) return "wikidata";
  if (/\.edu$|\.ac\.\w+$/.test(d)) return "academic";
  if (ACADEMIC_DOMAINS.some(a => d === a || d.endsWith("." + a))) return "academic";
  if (/\.gov($|\.\w+$)/.test(d)) return "institutional";
  if (INSTITUTIONAL_DOMAINS.some(a => d === a || d.endsWith("." + a))) return "institutional";
  if (NEWS_DOMAINS.some(a => d === a || d.endsWith("." + a))) return "news";
  return "web";
}

/** Normalize a raw source (string or object) into SourceMeta */
export function normalizeSource(
  raw: string | { url: string; domain?: string; type?: string; title?: string; score?: number }
): SourceMeta {
  const url = typeof raw === "string" ? raw : raw.url;
  const title = typeof raw === "object" ? raw.title : undefined;
  const score = typeof raw === "object" ? raw.score : undefined;
  const fullUrl = url.startsWith("http") ? url : `https://${url}`;
  const domain = (() => {
    try {
      return new URL(fullUrl).hostname.replace(/^www\./, "");
    } catch {
      return url.replace(/^https?:\/\//, "").split("/")[0];
    }
  })();

  // Use server-provided type if valid, otherwise classify locally
  const serverType = typeof raw === "object" ? raw.type : undefined;
  const type: SourceType = (serverType && ["wikipedia", "wikidata", "academic", "institutional", "news", "web"].includes(serverType))
    ? serverType as SourceType
    : classifyDomain(domain);

  return {
    url: fullUrl,
    domain,
    type,
    title,
    uorHash: fnv1a(fullUrl),
    score,
  };
}

/**
 * Parse [N] citation markers from markdown text.
 * Returns a list of unique citation indices found.
 */
export function extractCitationIndices(text: string): number[] {
  const indices = new Set<number>();
  const re = /\[(\d+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    indices.add(parseInt(m[1], 10));
  }
  return Array.from(indices).sort((a, b) => a - b);
}

/**
 * Split markdown text around [N] citation markers so React can render
 * InlineCitation components in place of the raw markers.
 */
export type Segment = string | { cite: number };

export function splitByCitations(text: string): Segment[] {
  const parts: Segment[] = [];
  const re = /\[(\d+)\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push({ cite: parseInt(m[1], 10) });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
