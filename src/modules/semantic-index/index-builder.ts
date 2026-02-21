/**
 * UOR Semantic Index Builder — in-memory lookup index over kg-store datums.
 *
 * Indexes by: IRI, glyph, value (string), hex string.
 * Supports fuzzy matching via correlation (fidelity score).
 *
 * Delegates to:
 *   - kg-store for data retrieval
 *   - resolver/correlation for fidelity scoring
 *   - identity for glyph/IRI computation
 */

import { supabase } from "@/integrations/supabase/client";
import { Q0 } from "@/modules/ring-core/ring";
import { correlate } from "@/modules/resolver/correlation";
import type { CorrelationResult } from "@/modules/resolver/correlation";

// ── Types ───────────────────────────────────────────────────────────────────

export interface IndexEntry {
  iri: string;
  value: number;
  quantum: number;
  glyph: string;
  hex: string;
  totalStratum: number;
}

export interface SemanticIndex {
  entries: IndexEntry[];
  byIri: Map<string, IndexEntry>;
  byGlyph: Map<string, IndexEntry>;
  byValue: Map<string, IndexEntry>;
  byHex: Map<string, IndexEntry>;
  builtAt: string;
}

export interface SimilarEntry {
  entry: IndexEntry;
  fidelity: number;
}

// ── buildIndex ──────────────────────────────────────────────────────────────

/**
 * Scan all datums from kg-store and build an in-memory lookup index.
 * Indexed by IRI, glyph, value (as string), and hex.
 */
export async function buildIndex(quantum?: number): Promise<SemanticIndex> {
  const q = quantum ?? 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("uor_datums")
    .select("iri, value, quantum, glyph, total_stratum, bytes")
    .eq("quantum", q)
    .order("value", { ascending: true })
    .limit(1000);

  const { data, error } = await query;
  if (error) throw new Error(`buildIndex failed: ${error.message}`);

  const entries: IndexEntry[] = [];
  const byIri = new Map<string, IndexEntry>();
  const byGlyph = new Map<string, IndexEntry>();
  const byValue = new Map<string, IndexEntry>();
  const byHex = new Map<string, IndexEntry>();

  for (const row of data ?? []) {
    const hex = (row.value as number).toString(16).toUpperCase().padStart(2, "0");
    const entry: IndexEntry = {
      iri: row.iri,
      value: row.value as number,
      quantum: row.quantum,
      glyph: row.glyph,
      hex,
      totalStratum: row.total_stratum,
    };

    entries.push(entry);
    byIri.set(entry.iri, entry);
    byGlyph.set(entry.glyph, entry);
    byValue.set(String(entry.value), entry);
    byHex.set(hex, entry);
    byHex.set("0x" + hex, entry);
    byHex.set("0x" + hex.toLowerCase(), entry);
  }

  return {
    entries,
    byIri,
    byGlyph,
    byValue,
    byHex,
    builtAt: new Date().toISOString(),
  };
}

// ── findSimilar ─────────────────────────────────────────────────────────────

/**
 * Find entries similar to a given value using correlation fidelity.
 * Returns entries with fidelity > threshold, sorted by fidelity descending.
 */
export function findSimilar(
  index: SemanticIndex,
  value: number,
  threshold: number = 0.6,
  limit: number = 10
): SimilarEntry[] {
  const ring = Q0();
  const results: SimilarEntry[] = [];

  for (const entry of index.entries) {
    if (entry.value === value) continue;
    const c = correlate(ring, value, entry.value);
    if (c.fidelity >= threshold) {
      results.push({ entry, fidelity: c.fidelity });
    }
  }

  return results
    .sort((a, b) => b.fidelity - a.fidelity)
    .slice(0, limit);
}

// ── exactLookup ─────────────────────────────────────────────────────────────

/**
 * Try exact match across all index keys.
 */
export function exactLookup(
  index: SemanticIndex,
  mention: string
): IndexEntry | undefined {
  const trimmed = mention.trim();

  // Try IRI
  if (index.byIri.has(trimmed)) return index.byIri.get(trimmed);

  // Try glyph
  if (index.byGlyph.has(trimmed)) return index.byGlyph.get(trimmed);

  // Try value (numeric string)
  if (index.byValue.has(trimmed)) return index.byValue.get(trimmed);

  // Try hex
  const upper = trimmed.toUpperCase();
  if (index.byHex.has(upper)) return index.byHex.get(upper);
  if (index.byHex.has(trimmed)) return index.byHex.get(trimmed);

  return undefined;
}
