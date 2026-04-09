/**
 * UOR Shared Cryptographic Primitives
 * ════════════════════════════════════
 *
 * The single canonical implementation of SHA-256 hashing
 * used across every module in the UOR framework.
 *
 * One function. One truth. No duplication.
 *
 * Powered by @noble/hashes — audited, zero-dependency, synchronous.
 * Replaces the async-only Web Crypto API for deterministic, streaming hashing.
 *
 * @module lib/crypto
 */

import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex } from "@noble/hashes/utils";

/**
 * SHA-256 hex digest of a UTF-8 string.
 *
 * This is the ONE implementation used by every module that needs
 * content hashing: certificates, derivations, code-kg, donations,
 * datum pages, and boundary enforcement.
 *
 * Uses @noble/hashes (audited, MIT, zero-dep, runs on browser + Node + Deno + Bun + Workers).
 * Synchronous internally — the async signature is preserved for backward compatibility.
 */
export async function sha256hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  return bytesToHex(sha256(bytes));
}

/**
 * SHA-256 raw bytes from a UTF-8 string.
 * Synchronous. Returns the 32-byte Uint8Array digest.
 */
export function sha256bytes(input: string): Uint8Array {
  return sha256(new TextEncoder().encode(input));
}

/**
 * SHA-256 hex digest from raw bytes.
 * Synchronous.
 */
export function sha256hexSync(bytes: Uint8Array): string {
  return bytesToHex(sha256(bytes));
}
