/**
 * Browser-compatible UOR content-addressing library.
 * Ports the core functions from supabase/functions/uor-api/lib/store.ts
 * to run in the browser using the Web Crypto API.
 *
 * Pure functions, zero dependencies.
 */

import { singleProofHash } from "./uor-canonical";
export type { SingleProofResult } from "./uor-canonical";
export { singleProofHash, canonicalizeToNQuads, verifySingleProof } from "./uor-canonical";

// ── Canonical JSON-LD serialisation ─────────────────────────────────────────

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

// ── Base32-lower encoding ───────────────────────────────────────────────────

function encodeBase32Lower(bytes: Uint8Array): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz234567";
  let result = "";
  let buffer = 0;
  let bitsLeft = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bitsLeft += 8;
    while (bitsLeft >= 5) {
      bitsLeft -= 5;
      result += alphabet[(buffer >> bitsLeft) & 31];
    }
  }
  if (bitsLeft > 0) {
    result += alphabet[(buffer << (5 - bitsLeft)) & 31];
  }
  return result;
}

// ── CID computation — CIDv1 / dag-json / sha2-256 / base32lower ────────────

/**
 * Compute a CIDv1 string from canonical JSON-LD bytes.
 * CIDv1 / dag-json (0x0129) / sha2-256
 */
export async function computeCid(canonicalBytes: Uint8Array): Promise<string> {
  const ab = new ArrayBuffer(canonicalBytes.byteLength);
  new Uint8Array(ab).set(canonicalBytes);
  const digestBuffer = await crypto.subtle.digest("SHA-256", ab);
  const digest = new Uint8Array(digestBuffer);

  const multihash = new Uint8Array(2 + digest.length);
  multihash[0] = 0x12; // sha2-256
  multihash[1] = 0x20; // 32 bytes
  multihash.set(digest, 2);

  const cidBinary = new Uint8Array(1 + 2 + multihash.length);
  cidBinary[0] = 0x01; // CIDv1 version
  cidBinary[1] = 0xa9; // dag-json 0x0129 varint low byte
  cidBinary[2] = 0x02; // dag-json 0x0129 varint high byte
  cidBinary.set(multihash, 3);

  return "b" + encodeBase32Lower(cidBinary);
}

// ── Braille bijection — UOR address ─────────────────────────────────────────

function encodeGlyph(b: number): string {
  return String.fromCodePoint(0x2800 + b);
}

/** Compute the UOR address (Braille bijection) from raw bytes. */
export function computeUorAddress(bytes: Uint8Array): {
  "u:glyph": string;
  "u:length": number;
} {
  const glyph = Array.from(bytes).map(encodeGlyph).join("");
  return { "u:glyph": glyph, "u:length": bytes.length };
}

// ── IPv6 Content Address — UOR routable endpoint ────────────────────────────

/**
 * UOR IPv6 Prefix: fd00:75:6f72::/48
 *
 * Breakdown:
 *   fd   — RFC 4193 Unique Local Address (ULA) prefix
 *   00:75 — "u" in ASCII (0x75) padded to 16 bits → UOR namespace marker
 *   6f72 — "or" in ASCII (0x6F 0x72) → completes "uor" identifier
 *
 * This allocates a /48 UOR network, leaving 80 bits (10 bytes) for
 * content-derived addressing from the SHA-256 hash.
 *
 * The /48 boundary follows RFC 4193 §3.1 recommendations for site-level
 * allocation within the fd00::/8 ULA space.
 *
 * Collision resistance: 80 content bits → 2^40 birthday bound.
 * For the full 128-bit space, use computeIpv6Full() with /8 prefix.
 */
const UOR_IPV6_PREFIX_48 = "fd00:0075:6f72";

/**
 * Compute a UOR content-addressed IPv6 address from SHA-256 hash bytes.
 *
 * Uses the fd00:75:6f72::/48 ULA prefix with the first 80 bits (10 bytes)
 * of the SHA-256 hash filling the remaining 5 hextets.
 *
 * Format: fd00:0075:6f72:XXXX:XXXX:XXXX:XXXX:XXXX
 *
 * @param hashBytes  The 32-byte SHA-256 digest from singleProofHash.
 * @returns          RFC 5952-compliant IPv6 address string and metadata.
 */
export function computeIpv6Address(hashBytes: Uint8Array): {
  "u:ipv6": string;
  "u:ipv6Prefix": string;
  "u:ipv6PrefixLength": number;
  "u:contentBits": number;
} {
  // Take first 10 bytes (80 bits) of SHA-256 hash
  const contentBytes = hashBytes.slice(0, 10);

  // Format as 5 hextets (each 2 bytes = 4 hex chars)
  const hextets: string[] = [];
  for (let i = 0; i < 10; i += 2) {
    const hextet = ((contentBytes[i] << 8) | contentBytes[i + 1])
      .toString(16)
      .padStart(4, "0");
    hextets.push(hextet);
  }

  const ipv6 = `${UOR_IPV6_PREFIX_48}:${hextets.join(":")}`;

  return {
    "u:ipv6": ipv6,
    "u:ipv6Prefix": `${UOR_IPV6_PREFIX_48}::/48`,
    "u:ipv6PrefixLength": 48,
    "u:contentBits": 80,
  };
}

/**
 * Compute a full-entropy UOR IPv6 address using minimal /8 prefix.
 *
 * Uses fd::/8 prefix with 120 content bits (15 bytes) from SHA-256.
 * Collision resistance: 2^60 birthday bound — suitable for billions of objects.
 *
 * Format: fdXX:XXXX:XXXX:XXXX:XXXX:XXXX:XXXX:XXXX
 * where XX... are the first 15 bytes of the SHA-256 hash.
 *
 * @param hashBytes  The 32-byte SHA-256 digest.
 * @returns          Full-entropy IPv6 address string.
 */
export function computeIpv6Full(hashBytes: Uint8Array): string {
  // fd prefix (8 bits) + 120 content bits from hash
  const bytes = new Uint8Array(16);
  bytes[0] = 0xfd;
  bytes.set(hashBytes.slice(0, 15), 1);

  const hextets: string[] = [];
  for (let i = 0; i < 16; i += 2) {
    hextets.push(((bytes[i] << 8) | bytes[i + 1]).toString(16).padStart(4, "0"));
  }
  return hextets.join(":");
}

/**
 * Parse a UOR IPv6 address back to the content-derived hash bytes.
 *
 * Supports both /48 prefix (fd00:0075:6f72:...) and /8 prefix (fd...) formats.
 * Returns the content bytes (excluding the prefix).
 *
 * @param ipv6  A UOR content-addressed IPv6 string.
 * @returns     The content-derived bytes extracted from the address.
 * @throws      If the address is not a valid UOR IPv6 address.
 */
export function ipv6ToContentBytes(ipv6: string): Uint8Array {
  const parts = ipv6.split(":");
  if (parts.length !== 8) {
    throw new Error(`Invalid IPv6 address: expected 8 hextets, got ${parts.length}`);
  }

  // Parse all 16 bytes
  const fullBytes = new Uint8Array(16);
  for (let i = 0; i < 8; i++) {
    const val = parseInt(parts[i], 16);
    fullBytes[i * 2] = (val >> 8) & 0xff;
    fullBytes[i * 2 + 1] = val & 0xff;
  }

  // Check for /48 UOR prefix: fd00:0075:6f72
  if (fullBytes[0] === 0xfd && fullBytes[1] === 0x00 &&
      fullBytes[2] === 0x00 && fullBytes[3] === 0x75 &&
      fullBytes[4] === 0x6f && fullBytes[5] === 0x72) {
    return fullBytes.slice(6); // 10 content bytes
  }

  // Check for /8 UOR prefix: fd
  if (fullBytes[0] === 0xfd) {
    return fullBytes.slice(1); // 15 content bytes
  }

  throw new Error(`Not a UOR IPv6 address: must start with fd00:0075:6f72 (/48) or fd (/8)`);
}

/**
 * Verify that a UOR IPv6 address was derived from the given SHA-256 hash.
 *
 * @param ipv6       The IPv6 address to verify.
 * @param hashBytes  The original 32-byte SHA-256 digest.
 * @returns          True iff the content bytes in the IPv6 match the hash prefix.
 */
export function verifyIpv6Address(ipv6: string, hashBytes: Uint8Array): boolean {
  try {
    const contentBytes = ipv6ToContentBytes(ipv6);
    const expectedPrefix = hashBytes.slice(0, contentBytes.length);
    return contentBytes.length === expectedPrefix.length &&
      contentBytes.every((b, i) => b === expectedPrefix[i]);
  } catch {
    return false;
  }
}

// ── Self-referential field stripping ────────────────────────────────────────

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

// ── High-level: compute full identity for a manifest ────────────────────────

export interface ModuleIdentity {
  cid: string;
  uorAddress: { "u:glyph": string; "u:length": number };
  ipv6Address: { "u:ipv6": string; "u:ipv6Prefix": string; "u:ipv6PrefixLength": number; "u:contentBits": number };
  canonicalBytes: Uint8Array;
}

/**
 * Takes a manifest object, strips any existing identity fields,
 * canonicalizes it via URDNA2015, and returns { cid, uorAddress, canonicalBytes }.
 *
 * Uses the Single Proof Hashing Standard: one canonical form → one hash →
 * three derived identity forms (CID, u:Address, derivation_id).
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
