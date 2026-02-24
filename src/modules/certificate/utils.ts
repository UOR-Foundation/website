/**
 * UOR Certificate Utilities
 * ═════════════════════════
 *
 * Shared primitives used across the certificate module.
 * Each function appears exactly once. No duplication.
 *
 * @module certificate/utils
 */

import type { CompactBoundary } from "./types";
import type { BoundaryManifest } from "./boundary";

/**
 * SHA-256 hex digest of a UTF-8 string.
 * The single implementation used by boundary hashing and source hashing.
 */
export async function sha256hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * SHA-256 hex of a raw source object (pre-boundary).
 * Keys are sorted to ensure deterministic serialization.
 */
export async function sourceObjectHash(obj: Record<string, unknown>): Promise<string> {
  return sha256hex(JSON.stringify(obj, Object.keys(obj).sort()));
}

/**
 * Project a full BoundaryManifest into a CompactBoundary.
 * The compact form carries only what's needed for verification.
 */
export function toCompactBoundary(manifest: BoundaryManifest): CompactBoundary {
  return {
    boundaryHash: manifest.boundaryHash,
    keys: manifest.boundaryKeys,
    declaredType: manifest.declaredType,
    fieldCount: manifest.totalFields,
  };
}
