/**
 * UOR Certificate Types
 * ═════════════════════
 *
 * The certificate is a self-verifying JSON-LD document carrying
 * everything needed for independent verification:
 *
 *   @context              — The JSON-LD context (UOR ontology)
 *   @type                 — Always "cert:ModuleCertificate"
 *   cert:subject          — What this certificate is about
 *   cert:cid              — The content identifier (CIDv1)
 *   cert:canonicalPayload — The original content in canonical form
 *   cert:boundary         — Compact boundary (hash + keys)
 *   cert:sourceHash       — SHA-256 of the pre-boundary source object
 *   cert:coherence        — Algebraic coherence witness
 *   store:uorAddress      — Braille visual encoding of the hash
 *   store:ipv6Address     — Routable network address derived from content
 *   cert:computedAt       — When the certificate was last computed
 *   cert:issuedAt         — Immutable birth timestamp
 *   cert:specification    — Version of the certificate format
 */

/**
 * Compact boundary record — only the essential shape identity.
 * The full diagnostic manifest is available on-demand during verification.
 */
export interface CompactBoundary {
  /** SHA-256 hex of the sorted boundary key list */
  boundaryHash: string;
  /** The sorted top-level keys that define the object's scope */
  keys: string[];
  /** The declared @type of the object */
  declaredType: string;
  /** Total field count (all levels) */
  fieldCount: number;
}

/**
 * Algebraic coherence witness — binds the certificate to UOR ring identity.
 *
 * A witness value x is extracted from the certificate's hash.
 * The critical identity neg(bnot(x)) ≡ succ(x) must hold in Z/256Z.
 * This proves the certificate was issued within a coherent UOR system.
 */
export interface CoherenceWitness {
  /** The witness value x (0–255), derived from the first byte of the hash */
  witness: number;
  /** neg(bnot(x)) — must equal succ(x) */
  negBnot: number;
  /** succ(x) */
  succ: number;
  /** Whether the identity holds */
  holds: boolean;
  /** The identity being proved */
  identity: "neg(bnot(x)) ≡ succ(x)";
}

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
   * Preserving it enables anyone to re-verify the certificate.
   */
  "cert:canonicalPayload": string;

  /**
   * Compact boundary — the object's shape identity.
   * Hash + keys + type + field count. Enough to verify scope.
   */
  "cert:boundary": CompactBoundary;

  /**
   * SHA-256 hex of the raw source object (pre-boundary enforcement).
   * Allows verifiers to detect if the wrong source object is used.
   */
  "cert:sourceHash": string;

  /**
   * Algebraic coherence witness — proves this certificate was
   * issued within a system where neg(bnot(x)) ≡ succ(x) holds.
   */
  "cert:coherence": CoherenceWitness;

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

  /** ISO 8601 timestamp of last computation */
  "cert:computedAt": string;

  /**
   * Immutable creation timestamp — set once at first issuance,
   * never modified. The canonical birth moment of the object.
   */
  "cert:issuedAt": string;

  /** Specification version */
  "cert:specification": "1.0.0";
}
