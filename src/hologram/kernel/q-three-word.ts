/**
 * Q-Three-Word — Canonical Three-Word Identity Names
 * ═══════════════════════════════════════════════════
 *
 * Deterministic bijection: 256-bit hash → three canonical words.
 *
 * Each word is selected from the canonical UOR triword vocabulary,
 * one per position:
 *   Position 0 (Observer):   hash byte [0] → 256 nouns      (who)
 *   Position 1 (Observable): hash byte [1] → 256 adjectives (what)
 *   Position 2 (Context):    hash byte [2] → 256 nouns      (where)
 *
 * This follows the triadic ontology (Observer, Observable, Context) ensuring
 * the name encodes structural meaning, not just arbitrary symbols.
 *
 * IMPORTANT: This module delegates to the canonical triword vocabulary
 * defined in src/lib/uor-triword.ts. The wordlists are NOT duplicated
 * here — the triword module is the single source of truth.
 *
 * Properties:
 *   - Bijective for 3-byte prefix: words → bytes → words (lossless round-trip)
 *   - 256³ = 16,777,216 unique combinations
 *   - Deterministic: same hash always yields same name
 *   - Human-memorable: "Deer · Bold · Canyon" vs "a7f3...b2c1"
 *
 * The separator is the interpunct (·) — chosen for its typographic
 * neutrality and distinction from dots, hyphens, and spaces.
 *
 * @module qkernel/q-three-word
 */

import { getWordlist } from "@/lib/uor-triword";

// ═══════════════════════════════════════════════════════════════════════
// Canonical Wordlists — sourced from uor-triword genesis vocabulary
// ═══════════════════════════════════════════════════════════════════════

const OBSERVER_WORDS = getWordlist("observer");
const OBSERVABLE_WORDS = getWordlist("observable");
const CONTEXT_WORDS = getWordlist("context");

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

/** A three-word canonical name */
export interface ThreeWordName {
  /** The display string: "Word·Word·Word" */
  readonly display: string;
  /** The three individual words */
  readonly words: readonly [string, string, string];
  /** The three hash bytes used for derivation */
  readonly sourceBytes: readonly [number, number, number];
  /** Whether the mapping is bijective (always true for valid input) */
  readonly bijective: true;
}

// ═══════════════════════════════════════════════════════════════════════
// Core Functions
// ═══════════════════════════════════════════════════════════════════════

/**
 * Derive a three-word canonical name from a 256-bit hash.
 *
 * Takes the first 3 bytes of the hash and maps each to a word
 * from the corresponding position's wordlist.
 *
 * Deterministic: same hash → same name. Always.
 */
export function deriveThreeWordName(hashBytes: Uint8Array): ThreeWordName {
  if (hashBytes.length < 3) {
    throw new Error("ThreeWord: requires at least 3 bytes of hash input");
  }

  const b0 = hashBytes[0];
  const b1 = hashBytes[1];
  const b2 = hashBytes[2];

  const w0 = OBSERVER_WORDS[b0];
  const w1 = OBSERVABLE_WORDS[b1];
  const w2 = CONTEXT_WORDS[b2];

  return {
    display: `${capitalize(w0)}·${capitalize(w1)}·${capitalize(w2)}`,
    words: [w0, w1, w2] as const,
    sourceBytes: [b0, b1, b2] as const,
    bijective: true,
  };
}

/**
 * Reverse a three-word name back to its source bytes.
 *
 * This is the inverse of deriveThreeWordName — the bijection guarantee.
 * Returns null if any word is not found in its position's wordlist.
 */
export function reverseThreeWordName(
  words: readonly [string, string, string]
): Uint8Array | null {
  const b0 = OBSERVER_WORDS.indexOf(words[0].toLowerCase());
  const b1 = OBSERVABLE_WORDS.indexOf(words[1].toLowerCase());
  const b2 = CONTEXT_WORDS.indexOf(words[2].toLowerCase());

  if (b0 === -1 || b1 === -1 || b2 === -1) return null;

  return new Uint8Array([b0, b1, b2]);
}

/**
 * Parse a display string ("Word·Word·Word") back to component words.
 */
export function parseThreeWordDisplay(display: string): readonly [string, string, string] | null {
  const parts = display.split("·").map(w => w.toLowerCase().trim());
  if (parts.length !== 3) return null;
  return [parts[0], parts[1], parts[2]] as const;
}

/**
 * Verify that a three-word name correctly maps to a hash.
 * Round-trip check: name → bytes → name must be identical.
 */
export function verifyThreeWordBijection(
  name: ThreeWordName,
  hashBytes: Uint8Array
): boolean {
  const rederived = deriveThreeWordName(hashBytes);
  return (
    rederived.words[0] === name.words[0] &&
    rederived.words[1] === name.words[1] &&
    rederived.words[2] === name.words[2]
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
