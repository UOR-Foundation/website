/**
 * UNS Core. Two-Address Model
 *
 * Architecturally critical: every piece of content in UNS has TWO addresses:
 *
 *   1. u:canonicalId . LOSSLESS 256-bit derivation URN (the source of truth)
 *   2. u:ipv6        . LOSSY 80-bit routing projection (for network transport)
 *
 * Plus two supplementary forms:
 *   3. u:cid         . CIDv1/dag-json/sha2-256/base32lower (IPFS interop)
 *   4. u:glyph       . Braille bijection of 32 SHA-256 bytes (visual identity)
 *
 * SHA-256 powered by @noble/hashes — audited, synchronous, edge-to-cloud.
 *
 * @see RFC 4193. Unique Local IPv6 Unicast Addresses
 * @see RFC 8200. Internet Protocol, Version 6 (IPv6) Specification
 */

import { sha256 as nobleSha256 } from "@noble/hashes/sha2";
import { bytesToHex as nobleHex } from "@noble/hashes/utils";

// ── UOR IPv6 Prefix ─────────────────────────────────────────────────────────

const UOR_IPV6_PREFIX = "fd00:0075:6f72";
const LOSS_WARNING = "ipv6-is-routing-projection-only" as const;

// ── Canonical Identity Type ─────────────────────────────────────────────────

export interface UorCanonicalIdentity {
  "u:canonicalId": string;
  "u:ipv6": string;
  "u:ipv6PrefixLength": 48;
  "u:contentBits": 80;
  "u:lossWarning": typeof LOSS_WARNING;
  "u:cid": string;
  "u:glyph": string;
  "u:length": 32;
  hashBytes: Uint8Array;
}

// ── IPv6 Formatting ─────────────────────────────────────────────────────────

export function formatIpv6(hashBytes: Uint8Array): string {
  const hextets: string[] = [];
  for (let i = 0; i < 10; i += 2) {
    hextets.push(
      ((hashBytes[i] << 8) | hashBytes[i + 1])
        .toString(16)
        .padStart(4, "0")
    );
  }
  return `${UOR_IPV6_PREFIX}:${hextets.join(":")}`;
}

// ── IPv6 Parsing (reverse) ──────────────────────────────────────────────────

export function ipv6ToContentBytes(ipv6: string): Uint8Array {
  const parts = ipv6.split(":");
  if (parts.length !== 8) {
    throw new Error(`Invalid IPv6: expected 8 hextets, got ${parts.length}`);
  }
  const prefix = parts.slice(0, 3).join(":");
  if (prefix !== UOR_IPV6_PREFIX) {
    throw new Error(`Not a UOR IPv6 address: prefix ${prefix} !== ${UOR_IPV6_PREFIX}`);
  }
  const contentBytes = new Uint8Array(10);
  for (let i = 0; i < 5; i++) {
    const val = parseInt(parts[i + 3], 16);
    contentBytes[i * 2] = (val >> 8) & 0xff;
    contentBytes[i * 2 + 1] = val & 0xff;
  }
  return contentBytes;
}

// ── Braille Glyph Encoding ──────────────────────────────────────────────────

export function encodeGlyph(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => String.fromCodePoint(0x2800 + b))
    .join("");
}

// ── CIDv1 Computation ───────────────────────────────────────────────────────

const BASE32 = "abcdefghijklmnopqrstuvwxyz234567";

function encodeBase32Lower(bytes: Uint8Array): string {
  let result = "";
  let buffer = 0;
  let bitsLeft = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bitsLeft += 8;
    while (bitsLeft >= 5) {
      bitsLeft -= 5;
      result += BASE32[(buffer >> bitsLeft) & 31];
    }
  }
  if (bitsLeft > 0) {
    result += BASE32[(buffer << (5 - bitsLeft)) & 31];
  }
  return result;
}

/**
 * Compute CIDv1/dag-json/sha2-256/base32lower from canonical bytes.
 * Now synchronous internally using @noble/hashes.
 */
export async function computeCid(canonicalBytes: Uint8Array): Promise<string> {
  const digest = nobleSha256(canonicalBytes);

  const multihash = new Uint8Array(2 + digest.length);
  multihash[0] = 0x12; // sha2-256
  multihash[1] = 0x20; // 32 bytes
  multihash.set(digest, 2);

  const cidBinary = new Uint8Array(3 + multihash.length);
  cidBinary[0] = 0x01; // CIDv1
  cidBinary[1] = 0xa9; // dag-json varint low
  cidBinary[2] = 0x02; // dag-json varint high
  cidBinary.set(multihash, 3);

  return "b" + encodeBase32Lower(cidBinary);
}

// ── SHA-256 Helper ──────────────────────────────────────────────────────────

/**
 * SHA-256 of raw bytes. Now synchronous via @noble/hashes.
 * Async signature preserved for backward compatibility.
 */
export async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  return nobleSha256(bytes);
}

/** Convert bytes to lowercase hex string. */
export function bytesToHex(bytes: Uint8Array): string {
  return nobleHex(bytes);
}

// ── Verification Helpers ────────────────────────────────────────────────────

export function verifyIpv6Routing(ipv6: string, hashBytes: Uint8Array): boolean {
  try {
    const content = ipv6ToContentBytes(ipv6);
    const expected = hashBytes.slice(0, 10);
    return (
      content.length === expected.length &&
      content.every((b, i) => b === expected[i])
    );
  } catch {
    return false;
  }
}

// ── Identity Builder ────────────────────────────────────────────────────────

export async function buildIdentity(
  hashBytes: Uint8Array,
  canonicalBytes: Uint8Array
): Promise<UorCanonicalIdentity> {
  const hexHash = nobleHex(hashBytes);
  const cid = await computeCid(canonicalBytes);
  const glyph = encodeGlyph(hashBytes);
  const ipv6 = formatIpv6(hashBytes);

  return {
    "u:canonicalId": `urn:uor:derivation:sha256:${hexHash}`,
    "u:ipv6": ipv6,
    "u:ipv6PrefixLength": 48,
    "u:contentBits": 80,
    "u:lossWarning": LOSS_WARNING,
    "u:cid": cid,
    "u:glyph": glyph,
    "u:length": 32,
    hashBytes,
  };
}
