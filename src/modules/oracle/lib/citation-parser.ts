/**
 * citation-parser — Detect [N] citation markers in markdown and provide
 * metadata for rendering inline citation badges.
 *
 * UOR-anchored: each source URL gets a deterministic fnv1a content-address
 * so readers can verify provenance in the UOR identity space.
 */

export interface SourceMeta {
  url: string;
  domain: string;
  type: "wikipedia" | "wikidata" | "web";
  /** Human-readable title for the source */
  title?: string;
  /** Deterministic UOR content hash (fnv1a hex of URL) */
  uorHash: string;
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

/** Normalize a raw source (string or object) into SourceMeta */
export function normalizeSource(
  raw: string | { url: string; domain?: string; type?: string; title?: string }
): SourceMeta {
  const url = typeof raw === "string" ? raw : raw.url;
  const title = typeof raw === "object" ? raw.title : undefined;
  const fullUrl = url.startsWith("http") ? url : `https://${url}`;
  const domain = (() => {
    try {
      return new URL(fullUrl).hostname.replace(/^www\./, "");
    } catch {
      return url.replace(/^https?:\/\//, "").split("/")[0];
    }
  })();

  const type: SourceMeta["type"] = domain.includes("wikipedia")
    ? "wikipedia"
    : domain.includes("wikidata")
    ? "wikidata"
    : "web";

  return {
    url: fullUrl,
    domain,
    type,
    title,
    uorHash: fnv1a(fullUrl),
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
 *
 * Returns an array of segments: either plain strings or { cite: N }.
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
