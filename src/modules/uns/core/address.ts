/**
 * UNS Core — Two-Address Model
 *
 * Architecturally critical: every piece of content in UNS has TWO addresses:
 *
 *   1. u:canonicalId  — LOSSLESS 256-bit derivation URN (the source of truth)
 *   2. u:ipv6         — LOSSY 80-bit routing projection (for network transport)
 *
 * Plus two supplementary forms:
 *   3. u:cid          — CIDv1/dag-json/sha2-256/base32lower (IPFS interop)
 *   4. u:glyph        — Braille bijection of 32 SHA-256 bytes (visual identity)
 *
 * The u:lossWarning field is ALWAYS present to make the routing-vs-canonical
 * distinction explicit in the type system. This prevents downstream consumers
 * from treating the IPv6 address as a full identity.
 *
 * IPv6 construction follows RFC 4193 (ULA) with the UOR prefix:
 *   fd00:0075:6f72::/48 — "uor" encoded in ASCII within ULA space
 *   80 content bits from hashBytes[0..9] fill the remaining 5 hextets
 *
 * @see RFC 4193 — Unique Local IPv6 Unicast Addresses
 * @see RFC 8200 — Internet Protocol, Version 6 (IPv6) Specification
 */

// ── UOR IPv6 Prefix ─────────────────────────────────────────────────────────

/**
 * fd00:0075:6f72::/48
 *
 *   fd   — RFC 4193 ULA prefix (locally assigned)
 *   00:75 — 'u' in ASCII (0x75), zero-padded to 16 bits
 *   6f72  — 'or' in ASCII (0x6F 0x72)
 *
 * Together: "uor" → 48-bit network prefix, leaving 80 bits for content.
 */
const UOR_IPV6_PREFIX = "fd00:0075:6f72";

/** The constant loss warning — MUST appear on every identity object. */
const LOSS_WARNING = "ipv6-is-routing-projection-only" as const;

// ── Canonical Identity Type ─────────────────────────────────────────────────

/**
 * The complete UOR canonical identity for any content object.
 *
 * This is the output of singleProofHash() and the foundational type
 * for all UNS services. Every field is derived from ONE SHA-256 hash.
 */
export interface UorCanonicalIdentity {
  /** Lossless 256-bit identity: urn:uor:derivation:sha256:{hex64} — NEVER lossy. */
  "u:canonicalId": string;
  /** Routing-only IPv6 ULA: fd00:0075:6f72:xxxx:xxxx:xxxx:xxxx:xxxx */
  "u:ipv6": string;
  /** Prefix length — always 48 for the /48 UOR ULA allocation. */
  "u:ipv6PrefixLength": 48;
  /** Number of content-derived bits in the IPv6 address. */
  "u:contentBits": 80;
  /** Explicit loss warning — ALWAYS present. */
  "u:lossWarning": typeof LOSS_WARNING;
  /** CIDv1/dag-json/sha2-256/base32lower — IPFS-compatible content identifier. */
  "u:cid": string;
  /** Braille bijection of all 32 SHA-256 bytes — visual lossless identity. */
  "u:glyph": string;
  /** Length of the glyph string (always 32 for SHA-256). */
  "u:length": 32;
  /** Raw 32-byte SHA-256 digest — for internal computations only. */
  hashBytes: Uint8Array;
}

// ── IPv6 Formatting ─────────────────────────────────────────────────────────

/**
 * Format 10 content bytes as a UOR IPv6 address.
 *
 * Takes hashBytes[0..9] and constructs:
 *   fd00:0075:6f72:{h[0]h[1]}:{h[2]h[3]}:{h[4]h[5]}:{h[6]h[7]}:{h[8]h[9]}
 */
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

/**
 * Extract the 10 content bytes from a UOR IPv6 address.
 *
 * @param ipv6  A fd00:0075:6f72:... address string.
 * @returns     The 10 content-derived bytes.
 * @throws      If the address is not a valid UOR IPv6 address.
 */
export function ipv6ToContentBytes(ipv6: string): Uint8Array {
  const parts = ipv6.split(":");
  if (parts.length !== 8) {
    throw new Error(
      `Invalid IPv6: expected 8 hextets, got ${parts.length}`
    );
  }

  // Verify the /48 UOR prefix
  const prefix = parts.slice(0, 3).join(":");
  if (prefix !== UOR_IPV6_PREFIX) {
    throw new Error(
      `Not a UOR IPv6 address: prefix ${prefix} !== ${UOR_IPV6_PREFIX}`
    );
  }

  // Parse content hextets (indices 3..7 → 10 bytes)
  const contentBytes = new Uint8Array(10);
  for (let i = 0; i < 5; i++) {
    const val = parseInt(parts[i + 3], 16);
    contentBytes[i * 2] = (val >> 8) & 0xff;
    contentBytes[i * 2 + 1] = val & 0xff;
  }

  return contentBytes;
}

// ── Braille Glyph Encoding ──────────────────────────────────────────────────

/**
 * Encode a byte array as a Braille glyph string.
 * Each byte b maps to U+2800 + b — a lossless, invertible bijection.
 */
export function encodeGlyph(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => String.fromCodePoint(0x2800 + b))
    .join("");
}

// ── CIDv1 Computation ───────────────────────────────────────────────────────

/** Base32-lower alphabet (RFC 4648). */
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
 *
 * Binary layout:
 *   0x01       — CIDv1 version
 *   0xa9 0x02  — dag-json codec (0x0129 as varint)
 *   0x12 0x20  — sha2-256 multihash header
 *   {32 bytes} — SHA-256 digest
 */
export async function computeCid(canonicalBytes: Uint8Array): Promise<string> {
  const ab = new ArrayBuffer(canonicalBytes.byteLength);
  new Uint8Array(ab).set(canonicalBytes);
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", ab)
  );

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

export async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  return new Uint8Array(await crypto.subtle.digest("SHA-256", ab));
}

/** Convert bytes to lowercase hex string. */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Verification Helpers ────────────────────────────────────────────────────

/**
 * Verify that a UOR IPv6 address was correctly derived from the given hash.
 *
 * Extracts the 10 content bytes from the IPv6 address and compares them
 * to hashBytes[0..9]. Returns false on any mismatch or parse error.
 */
export function verifyIpv6Routing(
  ipv6: string,
  hashBytes: Uint8Array
): boolean {
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

/**
 * Build a complete UorCanonicalIdentity from a SHA-256 hash and canonical bytes.
 *
 * This is the final assembly step — called by identity.ts after canonicalization.
 */
export async function buildIdentity(
  hashBytes: Uint8Array,
  canonicalBytes: Uint8Array
): Promise<UorCanonicalIdentity> {
  const hexHash = bytesToHex(hashBytes);
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
