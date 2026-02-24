/**
 * UOR Content-Addressing Library — Unified Re-exports
 * ════════════════════════════════════════════════════
 *
 * This module consolidates all content-addressing primitives by delegating
 * to the canonical source in `src/modules/uns/core/address.ts`.
 *
 * Previously, this file contained duplicate implementations of computeCid,
 * IPv6 addressing, and Braille glyph encoding. Now it re-exports from the
 * single source of truth (UNS Core Address Model) and extends it with
 * additional utilities that belong at the library layer:
 *
 *   - computeIpv6Full()         — /8 prefix full-entropy IPv6
 *   - stripSelfReferentialFields() — manifest cleanup for verification
 *   - computeModuleIdentity()   — high-level module identity builder
 *   - canonicalJsonLd()         — deterministic JSON-LD serialization
 *
 * @module lib/uor-address
 */

import { singleProofHash } from "./uor-canonical";
export type { SingleProofResult } from "./uor-canonical";
export { singleProofHash, canonicalizeToNQuads, verifySingleProof } from "./uor-canonical";

// ── Re-exports from UNS Core (single source of truth) ──────────────────────

export {
  computeCid,
  formatIpv6,
  ipv6ToContentBytes,
  encodeGlyph,
  sha256,
  bytesToHex,
  verifyIpv6Routing,
  buildIdentity,
} from "@/modules/uns/core/address";

export type { UorCanonicalIdentity } from "@/modules/uns/core/address";

// ── Hologram Projections (re-export the unified registry) ──────────────────

export { project, PROJECTIONS } from "@/modules/uns/core/hologram";
export type { Hologram, HologramProjection, ProjectionInput } from "@/modules/uns/core/hologram";

// ── computeUorAddress — Braille bijection wrapper ──────────────────────────

import { encodeGlyph } from "@/modules/uns/core/address";

/** Compute the UOR address (Braille bijection) from raw bytes. */
export function computeUorAddress(bytes: Uint8Array): {
  "u:glyph": string;
  "u:length": number;
} {
  const glyph = encodeGlyph(bytes);
  return { "u:glyph": glyph, "u:length": bytes.length };
}

// ── computeIpv6Address — structured IPv6 result ────────────────────────────

import { formatIpv6 } from "@/modules/uns/core/address";

const UOR_IPV6_PREFIX_48 = "fd00:0075:6f72";

export function computeIpv6Address(hashBytes: Uint8Array): {
  "u:ipv6": string;
  "u:ipv6Prefix": string;
  "u:ipv6PrefixLength": number;
  "u:contentBits": number;
} {
  return {
    "u:ipv6": formatIpv6(hashBytes),
    "u:ipv6Prefix": `${UOR_IPV6_PREFIX_48}::/48`,
    "u:ipv6PrefixLength": 48,
    "u:contentBits": 80,
  };
}

// ── computeIpv6Full — /8 prefix full-entropy IPv6 ──────────────────────────

/**
 * Full-entropy UOR IPv6 address using minimal /8 prefix.
 * fd::/8 prefix with 120 content bits (15 bytes) from SHA-256.
 */
export function computeIpv6Full(hashBytes: Uint8Array): string {
  const bytes = new Uint8Array(16);
  bytes[0] = 0xfd;
  bytes.set(hashBytes.slice(0, 15), 1);

  const hextets: string[] = [];
  for (let i = 0; i < 16; i += 2) {
    hextets.push(((bytes[i] << 8) | bytes[i + 1]).toString(16).padStart(4, "0"));
  }
  return hextets.join(":");
}

// ── verifyIpv6Address — supports both /48 and /8 prefix formats ────────────

/**
 * Verify that a UOR IPv6 address was derived from the given SHA-256 hash.
 * Supports both /48 (fd00:0075:6f72:...) and /8 (fd...) prefix formats.
 */
export function verifyIpv6Address(ipv6: string, hashBytes: Uint8Array): boolean {
  try {
    const parts = ipv6.split(":");
    if (parts.length !== 8) return false;

    const fullBytes = new Uint8Array(16);
    for (let i = 0; i < 8; i++) {
      const val = parseInt(parts[i], 16);
      fullBytes[i * 2] = (val >> 8) & 0xff;
      fullBytes[i * 2 + 1] = val & 0xff;
    }

    // /48 prefix: fd00:0075:6f72 — 10 content bytes
    if (fullBytes[0] === 0xfd && fullBytes[1] === 0x00 &&
        fullBytes[2] === 0x00 && fullBytes[3] === 0x75 &&
        fullBytes[4] === 0x6f && fullBytes[5] === 0x72) {
      const content = fullBytes.slice(6);
      const expected = hashBytes.slice(0, 10);
      return content.every((b, i) => b === expected[i]);
    }

    // /8 prefix: fd — 15 content bytes
    if (fullBytes[0] === 0xfd) {
      const content = fullBytes.slice(1);
      const expected = hashBytes.slice(0, 15);
      return content.every((b, i) => b === expected[i]);
    }

    return false;
  } catch {
    return false;
  }
}

// ── Canonical JSON-LD serialization ────────────────────────────────────────

/** Deterministic JSON-LD serialization with recursively sorted keys. */
export function canonicalJsonLd(obj: unknown): string {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj))
    return "[" + obj.map(canonicalJsonLd).join(",") + "]";
  const sorted = Object.keys(obj as Record<string, unknown>).sort();
  return (
    "{" +
    sorted
      .map(
        (k) =>
          JSON.stringify(k) +
          ":" +
          canonicalJsonLd((obj as Record<string, unknown>)[k])
      )
      .join(",") +
    "}"
  );
}

// ── Self-referential field stripping ───────────────────────────────────────

/** Strip identity fields before recomputing CID for verification. */
export function stripSelfReferentialFields(
  parsed: Record<string, unknown>
): Record<string, unknown> {
  const round1 = { ...parsed };
  delete round1["store:cid"];
  delete round1["store:cidScope"];
  delete round1["store:uorAddress"];
  return round1;
}

// ── High-level: compute full identity for a manifest ───────────────────────

export interface ModuleIdentity {
  cid: string;
  uorAddress: { "u:glyph": string; "u:length": number };
  ipv6Address: { "u:ipv6": string; "u:ipv6Prefix": string; "u:ipv6PrefixLength": number; "u:contentBits": number };
  canonicalBytes: Uint8Array;
}

/**
 * Takes a manifest object, strips any existing identity fields,
 * canonicalizes it via URDNA2015, and returns { cid, uorAddress, canonicalBytes }.
 */
export async function computeModuleIdentity(
  manifest: Record<string, unknown>
): Promise<ModuleIdentity> {
  const clean = stripSelfReferentialFields(manifest);
  const proof = await singleProofHash(clean);
  return {
    cid: proof.cid,
    uorAddress: proof.uorAddress,
    ipv6Address: proof.ipv6Address,
    canonicalBytes: proof.canonicalBytes,
  };
}
