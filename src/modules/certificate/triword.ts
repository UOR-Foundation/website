/**
 * Certificate Triword Utilities
 * ═════════════════════════════
 *
 * Bridges the certificate module with the triword encoding system.
 *
 * The triword is the human-readable name for any UOR object.
 * It maps the first 24 bits of the SHA-256 hash to three words
 * from dimension-aligned wordlists:
 *
 *   Byte 0 → Observer   (Entity)   — who or what
 *   Byte 1 → Observable (Property) — nature or quality
 *   Byte 2 → Context    (Frame)    — where or when
 *
 * Example: "Meadow · Steep · Keep"
 *   Meadow = the entity being described
 *   Steep  = a distinguishing property
 *   Keep   = the contextual frame
 *
 * This creates 256³ = 16,777,216 unique human-readable labels —
 * more than enough for practical disambiguation. The full CID
 * remains the authoritative, collision-free reference.
 */

import {
  canonicalToTriword,
  formatTriword,
  triwordBreakdown as rawTriwordBreakdown,
} from "@/lib/uor-triword";
import type { UorCertificate } from "./types";

/**
 * Derive the triword for a certificate.
 *
 * @param certificate — The UOR certificate
 * @returns Formatted triword: "Word · Word · Word"
 */
export function certificateToTriword(certificate: UorCertificate): string {
  const raw = canonicalToTriword(certificate["cert:cid"]);
  return formatTriword(raw);
}

/**
 * Break a triword into its three dimensions.
 *
 * @param triword — Formatted or dot-separated triword
 * @returns Object with observer, observable, context fields, or null
 */
export { rawTriwordBreakdown as triwordBreakdown };
