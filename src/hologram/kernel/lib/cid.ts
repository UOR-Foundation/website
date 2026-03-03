/**
 * kernel/lib/cid — Content Identifier Utilities
 * ≡ Linux lib/sha1.c, lib/crc32.c
 *
 * Pure functions for generating and validating content-addressed
 * identifiers used throughout the kernel.
 */

/**
 * Generate a deterministic CID from arbitrary data.
 * Uses SHA-256 → base32-lower multibase prefix 'b'.
 */
export async function cidFromBytes(data: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(hash);
  return "b" + base32Lower(bytes);
}

/**
 * Synchronous CID from string (uses simple hash for in-kernel use).
 * Deterministic but not cryptographically strong — use cidFromBytes for persistence.
 */
export function cidSync(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return "b" + (h >>> 0).toString(32).padStart(7, "0");
}

/**
 * Validate that a string looks like a well-formed CID.
 */
export function isValidCid(s: string): boolean {
  return typeof s === "string" && s.length >= 2 && s[0] === "b" && /^[a-z2-7]+$/.test(s.slice(1));
}

/** RFC 4648 base32 lower-case (no padding) */
function base32Lower(bytes: Uint8Array): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz234567";
  let bits = 0, value = 0, out = "";
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += alphabet[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) out += alphabet[(value << (5 - bits)) & 0x1f];
  return out;
}
