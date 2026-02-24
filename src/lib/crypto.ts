/**
 * UOR Shared Cryptographic Primitives
 * ════════════════════════════════════
 *
 * The single canonical implementation of SHA-256 hashing
 * used across every module in the UOR framework.
 *
 * One function. One truth. No duplication.
 *
 * @module lib/crypto
 */

/**
 * SHA-256 hex digest of a UTF-8 string.
 *
 * This is the ONE implementation used by every module that needs
 * content hashing: certificates, derivations, code-kg, donations,
 * datum pages, and boundary enforcement.
 *
 * Uses the Web Crypto API (SubtleCrypto) — available in all
 * modern browsers and edge runtimes.
 */
export async function sha256hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
