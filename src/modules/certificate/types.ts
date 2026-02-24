/**
 * UOR Certificate Types
 * ═════════════════════
 *
 * The certificate is a JSON-LD document that carries all information
 * needed for independent verification. Every field is self-describing:
 *
 *   @context              — The JSON-LD context (UOR ontology)
 *   @type                 — Always "cert:ModuleCertificate"
 *   cert:subject          — What this certificate is about
 *   cert:cid              — The content identifier (CIDv1)
 *   cert:canonicalPayload — The original content in canonical form
 *   cert:boundary         — The object boundary manifest (what was certified)
 *   store:uorAddress      — Braille visual encoding of the hash
 *   store:ipv6Address     — Routable network address derived from content
 *   cert:computedAt       — When the certificate was generated
 *   cert:specification    — Version of the certificate format
 */

import type { BoundaryManifest } from "./boundary";

export interface UorCertificate {
  /** JSON-LD context linking to the UOR ontology */
  "@context": "https://uor.foundation/contexts/uor-v1.jsonld";

  /** Certificate type identifier */
  "@type": "cert:ModuleCertificate";

  /** Human-readable subject of the certificate (e.g., "project:hologram") */
  "cert:subject": string;

  /** CIDv1 content identifier — the primary fingerprint */
  "cert:cid": string;

  /**
   * The original content in URDNA2015 canonical form (N-Quads).
   * This is the raw material from which the CID is derived.
   * Preserving it enables anyone to re-verify the certificate.
   */
  "cert:canonicalPayload": string;

  /**
   * The boundary manifest documenting exactly what fields were
   * included in the certified object. This enables verifiers to
   * confirm that the object's boundary hasn't shifted.
   */
  "cert:boundary": BoundaryManifest;

  /** UOR Braille address — visual, bijective encoding of the hash */
  "store:uorAddress": {
    "u:glyph": string;
    "u:length": number;
  };

  /** IPv6 content address — routable network projection of the hash */
  "store:ipv6Address": {
    "u:ipv6": string;
    "u:ipv6Prefix": string;
    "u:ipv6PrefixLength": number;
    "u:contentBits": number;
  };

  /** ISO 8601 timestamp of certificate generation */
  "cert:computedAt": string;

  /** Specification version */
  "cert:specification": "1.0.0";
}
