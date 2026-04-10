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
import { sha256hex } from "@/lib/crypto";

// Re-export so existing consumers keep working
export { sha256hex };

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
