/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  AXIOM-CID  —  Content Identifier from Ring + Hash      ║
 * ║                                                          ║
 * ║  Implements CIDv1 (dag-json + sha2-256) using only      ║
 * ║  axiom-ring and axiom-hash. No multiformats library.     ║
 * ║                                                          ║
 * ║  A CID is how the kernel names anything it creates.      ║
 * ║  Name = Hash(Content) = permanent, verifiable address.   ║
 * ╚══════════════════════════════════════════════════════════╝
 */

import { type ByteTuple, concatBytes, toHex } from "./axiom-ring";
import { sha256 } from "./axiom-hash";

// ── Multicodec constants ──────────────────────────────────
// These are just numbers — no library needed.
const CID_VERSION  = 0x01;       // CIDv1
const CODEC_RAW    = 0x55;       // raw binary
const CODEC_DAG_JSON = 0x0129;   // dag-json (our default)
const HASH_SHA256  = 0x12;       // sha2-256
const HASH_LEN     = 0x20;       // 32 bytes

// ── Unsigned varint encoding (used in CID wire format) ────
export function encodeVarint(n: number): ByteTuple {
  const bytes: number[] = [];
  while (n >= 0x80) {
    bytes.push((n & 0x7f) | 0x80);
    n >>>= 7;
  }
  bytes.push(n & 0x7f);
  return new Uint8Array(bytes);
}

export function decodeVarint(buf: ByteTuple, offset = 0): [number, number] {
  let n = 0;
  let shift = 0;
  let pos = offset;
  while (pos < buf.length) {
    const b = buf[pos];
    n |= (b & 0x7f) << shift;
    pos++;
    if ((b & 0x80) === 0) break;
    shift += 7;
  }
  return [n, pos];
}

// ── Multibase: base32lower (RFC 4648, no padding) ─────────
const B32_ALPHA = "abcdefghijklmnopqrstuvwxyz234567";

function base32Encode(bytes: ByteTuple): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += B32_ALPHA[(value >>> bits) & 31];
    }
  }
  if (bits > 0) {
    out += B32_ALPHA[(value << (5 - bits)) & 31];
  }
  return out;
}

// ── CID: the kernel's universal name ──────────────────────

export interface Cid {
  /** CIDv1 raw bytes */
  readonly bytes: ByteTuple;
  /** base32lower multibase string (prefixed with 'b') */
  readonly string: string;
  /** hex representation of the digest only */
  readonly digestHex: string;
  /** The raw 32-byte SHA-256 digest */
  readonly digest: ByteTuple;
}

/**
 * Create a CIDv1 from raw content bytes.
 * codec defaults to dag-json (0x0129).
 */
export function createCid(content: ByteTuple, codec = CODEC_DAG_JSON): Cid {
  const digest = sha256(content);

  // CID wire format: <version><codec><hash-fn><hash-len><digest>
  const versionBytes = encodeVarint(CID_VERSION);
  const codecBytes   = encodeVarint(codec);
  const hashFnBytes  = encodeVarint(HASH_SHA256);
  const hashLenBytes = encodeVarint(HASH_LEN);

  const cidBytes = concatBytes(versionBytes, codecBytes, hashFnBytes, hashLenBytes, digest);

  return {
    bytes: cidBytes,
    string: "b" + base32Encode(cidBytes),
    digestHex: toHex(digest),
    digest,
  };
}

/**
 * Create a CID for raw binary content.
 */
export function createRawCid(content: ByteTuple): Cid {
  return createCid(content, CODEC_RAW);
}

/**
 * Verify that a CID matches the given content.
 * This is the fundamental verification operation:
 * "Does this name still refer to this thing?"
 */
export function verifyCid(cid: Cid, content: ByteTuple, codec = CODEC_DAG_JSON): boolean {
  const recomputed = createCid(content, codec);
  return cid.digestHex === recomputed.digestHex;
}

/**
 * Create a CID from a UTF-8 string (convenience).
 */
export function cidFromString(s: string, codec = CODEC_DAG_JSON): Cid {
  return createCid(new TextEncoder().encode(s), codec);
}

// ── UOR address formats (derived from CID) ────────────────

/**
 * UOR IRI: the canonical semantic web address.
 * Format: urn:uor:sha256:<hex-digest>
 */
export function cidToIri(cid: Cid): string {
  return `urn:uor:sha256:${cid.digestHex}`;
}

/**
 * UOR IPv6: content-addressed network address.
 * Maps the first 16 bytes of the digest into an IPv6 address.
 * Prefix: fd00::/8 (ULA — unique local address)
 */
export function cidToIpv6(cid: Cid): string {
  const d = cid.digest;
  const groups: string[] = [];
  for (let i = 0; i < 16; i += 2) {
    groups.push(((d[i] << 8) | d[i + 1]).toString(16));
  }
  // Replace first group prefix with fd (ULA)
  groups[0] = "fd" + groups[0].slice(2);
  return groups.join(":");
}

/**
 * UOR Braille glyph: a compact visual fingerprint.
 * Maps first 8 bytes to 8 Braille characters (U+2800..U+28FF).
 */
export function cidToGlyph(cid: Cid): string {
  let glyph = "";
  for (let i = 0; i < 8; i++) {
    glyph += String.fromCodePoint(0x2800 + cid.digest[i]);
  }
  return glyph;
}
