/**
 * Certificate Decoding
 * ════════════════════
 *
 * Extracts human-readable information from a UOR certificate.
 *
 * A raw certificate is a machine-readable JSON-LD document.
 * This module translates it into a format that humans can
 * understand at a glance — including the three-word coordinate
 * (triword) that serves as the memorable identity label.
 *
 * WHAT EACH FIELD MEANS:
 *
 *   subject     — What was certified (e.g., "project:hologram")
 *   triword     — Human-readable identity: "Meadow · Steep · Keep"
 *   coordinates — The three dimensions of the triword:
 *                   Entity (who)  · Property (what) · Frame (where)
 *   fingerprint — The CID (content identifier) — the proof
 *   payload     — The original content in canonical form
 *   computedAt  — When the certificate was generated
 *   braille     — Visual encoding of the hash
 *   ipv6        — Network-routable content address
 */

import type { UorCertificate } from "./types";
import { certificateToTriword, triwordBreakdown } from "./triword";

/**
 * A decoded certificate with all fields translated for human consumption.
 */
export interface DecodedCertificate {
  /** What was certified */
  subject: string;

  /** Three-word human-readable label: "Word · Word · Word" */
  triword: string;

  /** The three coordinate dimensions */
  coordinates: {
    entity: string;
    property: string;
    frame: string;
  } | null;

  /** The CID fingerprint */
  fingerprint: string;

  /** The canonical N-Quads payload */
  payload: string;

  /** When the certificate was generated */
  computedAt: string;

  /** UOR Braille visual address */
  braille: string;

  /** IPv6 content address */
  ipv6: string;
}

/**
 * Decode a UOR certificate into human-readable fields.
 *
 * @param certificate — The raw UOR certificate
 * @returns Decoded certificate with triword, coordinates, and all fields
 *
 * @example
 * ```ts
 * const decoded = decodeCertificate(cert);
 * console.log(decoded.triword);      // "Meadow · Steep · Keep"
 * console.log(decoded.coordinates);  // { entity: "Meadow", property: "Steep", frame: "Keep" }
 * console.log(decoded.fingerprint);  // "baguqeera..."
 * ```
 */
export function decodeCertificate(certificate: UorCertificate): DecodedCertificate {
  const triword = certificateToTriword(certificate);
  const breakdown = triwordBreakdown(triword);

  return {
    subject: certificate["cert:subject"],
    triword,
    coordinates: breakdown
      ? {
          entity: breakdown.observer,
          property: breakdown.observable,
          frame: breakdown.context,
        }
      : null,
    fingerprint: certificate["cert:cid"],
    payload: certificate["cert:canonicalPayload"],
    computedAt: certificate["cert:computedAt"],
    braille: certificate["store:uorAddress"]["u:glyph"],
    ipv6: certificate["store:ipv6Address"]["u:ipv6"],
  };
}
