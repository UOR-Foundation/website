/**
 * UOR Universal Codec
 * ═══════════════════
 *
 * THE single canonical entry point for encoding and decoding
 * in the entire UOR framework.
 *
 *   encode(obj)     → Content → Address  (URDNA2015 → SHA-256 → WASM ring → registry)
 *   decode(address) → Address → Content  (triword | CID | derivation ID → source object)
 *   isEncoded(addr) → boolean
 *
 * Pipeline (encode):
 *   1. URDNA2015 canonicalization (JSON-LD → N-Quads)
 *   2. SHA-256 hash (Web Crypto, W3C-standard, hardware-accelerated)
 *   3. WASM Rust ring algebra enrichment (from uor-foundation crate)
 *   4. Four identity forms: derivationId, CID, IPv6, Braille glyph
 *   5. Triword human-readable address
 *   6. Auto-register source↔address in global registry
 *
 * Every address produced by encode() can be resolved back to its
 * original content via decode(). This is the universal lossless
 * encoder-decoder, anchored in the WASM Rust implementation.
 *
 * @module uor-codec
 */

import {
  computeAndRegister,
  lookupReceipt,
  type EnrichedReceipt,
  type RegistryEntry,
} from "@/modules/intelligence/oracle/lib/receipt-registry";

// ── THE Universal Encoder ──────────────────────────────────────────────────
// Content → Address. Deterministic. Lossless. WASM-anchored.

export const encode = computeAndRegister;

// ── THE Universal Decoder ──────────────────────────────────────────────────
// Address → Content. Accepts triword, CID, or derivation ID.

export function decode(address: string): unknown | undefined {
  return lookupReceipt(address)?.source;
}

// ── Lookup with full metadata ──────────────────────────────────────────────

export function lookup(address: string): RegistryEntry | undefined {
  return lookupReceipt(address);
}

// ── Registry membership check ──────────────────────────────────────────────

export function isEncoded(address: string): boolean {
  return lookupReceipt(address) !== undefined;
}

// ── Re-exports for convenience ─────────────────────────────────────────────

export type { EnrichedReceipt, RegistryEntry };
