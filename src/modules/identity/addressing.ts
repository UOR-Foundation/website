/**
 * UOR Content-Addressed Identity Layer — deterministic algebraic projection.
 *
 * Every datum gets a permanent IRI derived from its content via the Braille
 * bijection. This is NOT a hash — it is a lossless, invertible mapping.
 *
 * Delegates to the existing Braille primitives in src/lib/uor-address.ts
 * for glyph encoding, and extends with IRI/U+ notation and reverse parsing.
 *
 * THE FUNDAMENTAL GUARANTEE: contentAddress(data) === contentAddress(data) ALWAYS.
 *
 * Zero external dependencies. Pure arithmetic.
 */

import type { ByteTuple } from "@/types/uor";
import type { UORRing } from "@/modules/ring-core/ring";

// ── Base IRI ────────────────────────────────────────────────────────────────

const BASE_IRI = "https://uor.foundation/u/";

// ── Byte → Braille codepoint ────────────────────────────────────────────────

/** Map a single byte to its Braille codepoint: byte → U+2800 + byte. */
export function bytesToCodepoint(byte: number): number {
  return 0x2800 + (byte & 0xff);
}

// ── ByteTuple → Braille glyph string ────────────────────────────────────────

/** Convert a ByteTuple to its Braille glyph string (one char per byte). */
export function bytesToGlyph(bytes: ByteTuple): string {
  return bytes.map((b) => String.fromCodePoint(bytesToCodepoint(b))).join("");
}

// ── ByteTuple → U+XXXX notation ─────────────────────────────────────────────

/** Convert a ByteTuple to "U+2855U+28AA" format (one U+XXXX per byte). */
export function bytesToUPlus(bytes: ByteTuple): string {
  return bytes
    .map((b) => `U+${bytesToCodepoint(b).toString(16).toUpperCase().padStart(4, "0")}`)
    .join("");
}

// ── ByteTuple → UOR IRI ─────────────────────────────────────────────────────

/**
 * Convert a ByteTuple to its full UOR IRI.
 * Format: https://uor.foundation/u/U{HEX4} per byte, concatenated.
 * Example: [0x55] → "https://uor.foundation/u/U2855"
 * Example: [0x55, 0xAA] → "https://uor.foundation/u/U2855U28AA"
 */
export function bytesToIRI(bytes: ByteTuple): string {
  const uParts = bytes
    .map((b) => `U${bytesToCodepoint(b).toString(16).toUpperCase().padStart(4, "0")}`)
    .join("");
  return BASE_IRI + uParts;
}

// ── UOR IRI → ByteTuple (reverse parsing) ───────────────────────────────────

/**
 * Parse a UOR IRI back to its ByteTuple.
 * Accepts full IRI ("https://uor.foundation/u/U2855U28AA")
 * or just the path segment ("U2855U28AA").
 * Throws on invalid format.
 */
export function iriToBytes(iri: string): ByteTuple {
  // Strip the base IRI if present
  let path = iri;
  if (path.startsWith(BASE_IRI)) {
    path = path.slice(BASE_IRI.length);
  }

  // Parse U{HEX4} segments
  const bytes: ByteTuple = [];
  const pattern = /U([0-9A-Fa-f]{4})/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(path)) !== null) {
    const codepoint = parseInt(match[1], 16);
    if (codepoint < 0x2800 || codepoint > 0x28ff) {
      throw new Error(
        `Invalid UOR codepoint 0x${codepoint.toString(16)}: must be in Braille range U+2800..U+28FF`
      );
    }
    bytes.push(codepoint - 0x2800);
  }

  if (bytes.length === 0) {
    throw new Error(`No valid U{HEX4} segments found in IRI: ${iri}`);
  }

  return bytes;
}

// ── High-level: value → canonical IRI ───────────────────────────────────────

/**
 * Compute the canonical UOR IRI for a value in the given ring.
 * This is the deterministic content address — identical inputs always
 * produce identical IRIs.
 */
export function contentAddress(ring: UORRing, value: number): string {
  const bytes = ring.toBytes(value);
  return bytesToIRI(bytes);
}

// ── Verification helpers ────────────────────────────────────────────────────

/**
 * Verify the fundamental guarantee: contentAddress is deterministic.
 * Returns true iff contentAddress(ring, value) === contentAddress(ring, value).
 * This is trivially true by construction but serves as a runtime assertion.
 */
export function verifyDeterminism(ring: UORRing, value: number): boolean {
  return contentAddress(ring, value) === contentAddress(ring, value);
}

/**
 * Verify round-trip: bytesToIRI(bytes) → iriToBytes → bytes.
 * Returns true iff the round-trip is lossless.
 */
export function verifyRoundTrip(bytes: ByteTuple): boolean {
  const iri = bytesToIRI(bytes);
  const recovered = iriToBytes(iri);
  return (
    bytes.length === recovered.length &&
    bytes.every((b, i) => b === recovered[i])
  );
}

/** Build the live API datum URL for a value at a given bit width. */
export function datumApiUrl(value: number, bits: number): string {
  return `https://api.uor.foundation/v1/kernel/schema/datum?value=${value}&n=${bits}`;
}
