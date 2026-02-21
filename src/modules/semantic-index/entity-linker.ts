/**
 * UOR Entity Linker — resolves text mentions to canonical UOR IRIs.
 *
 * Resolution strategy:
 *   1. Exact match in index → confidence 1.0, grade B
 *   2. Fuzzy match via correlation → fidelity > 0.8 = grade B, else grade D
 *
 * Delegates to:
 *   - semantic-index/index-builder for lookup
 *   - resolver/correlation for fidelity scoring
 */

import type { SemanticIndex, IndexEntry, SimilarEntry } from "./index-builder";
import { exactLookup, findSimilar } from "./index-builder";
import type { EpistemicGrade } from "@/types/uor";

// ── Types ───────────────────────────────────────────────────────────────────

export interface EntityResolution {
  iri: string | null;
  confidence: number;
  grade: EpistemicGrade;
  matchType: "exact" | "fuzzy" | "none";
  entry: IndexEntry | null;
  similar: SimilarEntry[];
}

// ── resolveEntity ───────────────────────────────────────────────────────────

/**
 * Resolve a text mention to a canonical UOR IRI.
 *
 * @param mention - text, value, hex, IRI, or glyph
 * @param index - pre-built semantic index
 * @param fuzzyThreshold - minimum fidelity for fuzzy match (default 0.6)
 */
export function resolveEntity(
  mention: string,
  index: SemanticIndex,
  fuzzyThreshold: number = 0.6
): EntityResolution {
  // 1. Exact match
  const exact = exactLookup(index, mention);
  if (exact) {
    return {
      iri: exact.iri,
      confidence: 1.0,
      grade: "B",
      matchType: "exact",
      entry: exact,
      similar: [],
    };
  }

  // 2. Try parsing as numeric for fuzzy match
  const numVal = parseInt(mention, 10);
  if (!isNaN(numVal) && numVal >= 0 && numVal <= 255) {
    const similar = findSimilar(index, numVal, fuzzyThreshold, 5);
    if (similar.length > 0 && similar[0].fidelity > 0.8) {
      return {
        iri: similar[0].entry.iri,
        confidence: similar[0].fidelity,
        grade: "B",
        matchType: "fuzzy",
        entry: similar[0].entry,
        similar,
      };
    }
    if (similar.length > 0) {
      return {
        iri: similar[0].entry.iri,
        confidence: similar[0].fidelity,
        grade: "D",
        matchType: "fuzzy",
        entry: similar[0].entry,
        similar,
      };
    }
  }

  // 3. Try hex parsing
  const hexMatch = mention.match(/^(?:0x)?([0-9a-fA-F]{1,2})$/);
  if (hexMatch) {
    const hexVal = parseInt(hexMatch[1], 16);
    const similar = findSimilar(index, hexVal, fuzzyThreshold, 5);
    if (similar.length > 0) {
      return {
        iri: similar[0].entry.iri,
        confidence: similar[0].fidelity,
        grade: similar[0].fidelity > 0.8 ? "B" : "D",
        matchType: "fuzzy",
        entry: similar[0].entry,
        similar,
      };
    }
  }

  // 4. No match
  return {
    iri: null,
    confidence: 0,
    grade: "D",
    matchType: "none",
    entry: null,
    similar: [],
  };
}
