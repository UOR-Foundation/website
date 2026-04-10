/**
 * UOR Knowledge Graph — Wiki-Link & Hashtag Parser (Roam-inspired).
 *
 * Detects [[wiki-links]] and #hashtags in text content and resolves
 * them to content-addressed UOR node addresses via singleProofHash.
 */

import { singleProofHash } from "@/lib/uor-canonical";

// ── Regex patterns ──────────────────────────────────────────────────────────

/** Matches [[Page Name]] or [[multi word link]] */
const WIKI_LINK_RE = /\[\[([^\]]+)\]\]/g;

/** Matches #hashtag (word chars, hyphens, no trailing punctuation) */
const HASHTAG_RE = /(?:^|\s)#([a-zA-Z][\w-]{1,48})\b/g;

/** Matches ((block-ref-id)) for future transclusion support */
const BLOCK_REF_RE = /\(\(([a-f0-9-]{8,})\)\)/g;

// ── Types ───────────────────────────────────────────────────────────────────

export interface WikiLink {
  /** Raw text inside [[ ]] */
  raw: string;
  /** Normalized label (trimmed, title-cased) */
  label: string;
  /** UOR IPv6 address (content-addressed) */
  address: string;
  /** Character offset in source text */
  offset: number;
}

export interface Hashtag {
  /** Tag text without # prefix */
  tag: string;
  /** Normalized label */
  label: string;
  /** UOR IPv6 address */
  address: string;
  /** Character offset */
  offset: number;
}

export interface BlockRef {
  /** Block reference ID */
  refId: string;
  /** Character offset */
  offset: number;
}

export interface ParseResult {
  wikiLinks: WikiLink[];
  hashtags: Hashtag[];
  blockRefs: BlockRef[];
}

// ── UOR address generation ──────────────────────────────────────────────────

const UOR_CONTEXT = "https://uor.foundation/contexts/uor-v1.jsonld";

async function wikiLinkAddress(label: string): Promise<string> {
  const proof = await singleProofHash({
    "@context": UOR_CONTEXT,
    "@type": "schema:Thing",
    "schema:name": label.toLowerCase().trim(),
    "schema:additionalType": "uor:WikiPage",
  });
  return proof.ipv6Address["u:ipv6"];
}

async function hashtagAddress(tag: string): Promise<string> {
  const proof = await singleProofHash({
    "@context": UOR_CONTEXT,
    "@type": "schema:DefinedTerm",
    "schema:name": tag.toLowerCase().trim(),
    "schema:additionalType": "uor:Topic",
  });
  return proof.ipv6Address["u:ipv6"];
}

// ── Normalize label ─────────────────────────────────────────────────────────

function normalizeLabel(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

// ── Main parse function ─────────────────────────────────────────────────────

/**
 * Parse text for [[wiki-links]], #hashtags, and ((block-refs)).
 * Resolves each wiki-link and hashtag to a content-addressed UOR address.
 */
export async function parseWikiLinks(text: string): Promise<ParseResult> {
  const wikiLinks: WikiLink[] = [];
  const hashtags: Hashtag[] = [];
  const blockRefs: BlockRef[] = [];
  const seen = new Set<string>();

  // Extract wiki-links
  for (const match of text.matchAll(WIKI_LINK_RE)) {
    const raw = match[1];
    const label = normalizeLabel(raw);
    const key = `wl:${label.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const address = await wikiLinkAddress(label);
    wikiLinks.push({
      raw,
      label,
      address,
      offset: match.index ?? 0,
    });
  }

  // Extract hashtags
  for (const match of text.matchAll(HASHTAG_RE)) {
    const tag = match[1];
    const label = `#${tag}`;
    const key = `ht:${tag.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const address = await hashtagAddress(tag);
    hashtags.push({
      tag,
      label,
      address,
      offset: match.index ?? 0,
    });
  }

  // Extract block references (for future transclusion)
  for (const match of text.matchAll(BLOCK_REF_RE)) {
    blockRefs.push({
      refId: match[1],
      offset: match.index ?? 0,
    });
  }

  return { wikiLinks, hashtags, blockRefs };
}

/**
 * Strip wiki-link syntax from text, leaving just the label.
 * "See [[Roam Research]] for details" → "See Roam Research for details"
 */
export function stripWikiLinks(text: string): string {
  return text.replace(WIKI_LINK_RE, "$1");
}

/**
 * Check if text contains any wiki-links or hashtags.
 */
export function hasWikiSyntax(text: string): boolean {
  return WIKI_LINK_RE.test(text) || HASHTAG_RE.test(text);
}
