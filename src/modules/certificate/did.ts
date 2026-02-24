/**
 * DID:UOR — Content-Addressed Decentralized Identifier Method
 * ════════════════════════════════════════════════════════════
 *
 * Maps UOR content identifiers to W3C DID Documents.
 *
 * DID Method:  did:uor:{cid}
 *
 * The DID is the CIDv1 content identifier — identity derived from
 * content, not assigned by an authority. Resolution produces a
 * DID Document containing the verification method (content hash)
 * and service endpoints for the UOR framework.
 *
 * W3C Compliance:
 *   - DID Core 1.0: https://www.w3.org/TR/did-core/
 *   - DID Resolution: https://www.w3.org/TR/did-resolution/
 *
 * Key design decisions:
 *   - `controller` set to self (DID Core §5.1.2 RECOMMENDED)
 *   - `alsoKnownAs` maps to UOR native addresses (DID Core §5.1.1)
 *   - `created` is in resolution metadata, NOT in document body (§7.1.4)
 *   - Service endpoints include both IPv6 and Braille address resolution
 *
 * @module certificate/did
 */

import type { UorCertificate } from "./types";

// ── Types ───────────────────────────────────────────────────────────────────

/**
 * W3C DID Document for a UOR content-addressed identity.
 * Follows https://www.w3.org/TR/did-core/#core-properties
 *
 * Core properties per DID Core §5:
 *   - id (REQUIRED)
 *   - controller (RECOMMENDED)
 *   - alsoKnownAs (OPTIONAL — used for UOR native addresses)
 *   - verificationMethod (OPTIONAL — at least one SHOULD exist)
 *   - authentication (OPTIONAL)
 *   - assertionMethod (OPTIONAL)
 *   - service (OPTIONAL)
 */
export interface UorDidDocument {
  /** DID Core §4.1: MUST include the DID context */
  "@context": readonly [
    "https://www.w3.org/ns/did/v1",
    "https://uor.foundation/contexts/uor-v1.jsonld"
  ];
  /** DID Core §5.1: The DID — did:uor:{cid} */
  id: string;
  /** DID Core §5.1.2: Controller of this DID Document */
  controller: string;
  /** DID Core §5.1.1: Equivalent identifiers (UOR native addresses) */
  alsoKnownAs: string[];
  /** DID Core §5.2: Verification methods for this identity */
  verificationMethod: Array<{
    /** DID Core §5.2: MUST be a URL */
    id: string;
    /** DID Core §5.2: Verification method type */
    type: "Multikey";
    /** DID Core §5.2: Controller of this verification method */
    controller: string;
    /**
     * Multikey public key — multibase-encoded content hash.
     * Per Multikey spec, uses 'f' prefix (base16 lowercase).
     * This makes the content hash itself the "public key" for
     * content-addressed verification.
     */
    publicKeyMultibase: string;
  }>;
  /** DID Core §5.3.1: Methods usable for asserting claims */
  assertionMethod: string[];
  /** DID Core §5.3.2: Methods usable for authentication */
  authentication: string[];
  /** DID Core §5.4: Service endpoints */
  service: Array<{
    /** DID Core §5.4: MUST be a URL */
    id: string;
    /** DID Core §5.4: Service type */
    type: string;
    /** DID Core §5.4: Service endpoint URL or URI */
    serviceEndpoint: string;
  }>;
}

/**
 * DID Resolution Metadata — per DID Resolution §3.1.
 * Separates document-level properties from resolution metadata.
 */
export interface DidResolutionMetadata {
  /** The content type of the DID Document */
  contentType: "application/did+ld+json";
  /** When the DID Document was created (ISO 8601) */
  created: string;
  /** The UOR source hash for independent verification */
  "uor:sourceHash": string;
  /** The UOR CID that this DID resolves from */
  "uor:cid": string;
}

/**
 * Complete DID Resolution Result per DID Resolution spec.
 */
export interface DidResolutionResult {
  /** The DID Document */
  didDocument: UorDidDocument;
  /** Resolution metadata (§3.1) */
  didResolutionMetadata: DidResolutionMetadata;
  /** Document metadata (§3.2) */
  didDocumentMetadata: {
    created: string;
    /** The UOR Braille address */
    "uor:address": string;
  };
}

// ── DID Resolution ──────────────────────────────────────────────────────────

/**
 * Resolve a UOR certificate into a W3C DID Document.
 *
 * The DID is content-addressed: did:uor:{cid}
 * This means the identifier IS the content — no registry needed.
 *
 * Per DID Core §5:
 *   - id: REQUIRED — the DID itself
 *   - controller: self-controlled (content controls its own identity)
 *   - alsoKnownAs: links to UOR native addresses (Braille, IPv6, URN)
 *   - verificationMethod: uses Multikey type with content hash as public key
 *   - service: IPv6 and UOR address resolution endpoints
 *
 * @param certificate  The UOR certificate to resolve
 * @returns            A W3C-compliant DID Document
 */
export function resolveDidDocument(certificate: UorCertificate): UorDidDocument {
  const cid = certificate["cert:cid"];
  const did = `did:uor:${cid}`;
  const verificationId = `${did}#content-hash`;

  return {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://uor.foundation/contexts/uor-v1.jsonld",
    ] as const,
    id: did,
    controller: did,
    alsoKnownAs: [
      `urn:uor:cid:${cid}`,
      `urn:uor:address:${certificate["store:uorAddress"]["u:glyph"]}`,
    ],
    verificationMethod: [
      {
        id: verificationId,
        type: "Multikey",
        controller: did,
        publicKeyMultibase: `f${certificate["cert:sourceHash"]}`,
      },
    ],
    assertionMethod: [verificationId],
    authentication: [verificationId],
    service: [
      {
        id: `${did}#ipv6-endpoint`,
        type: "UorContentAddress",
        serviceEndpoint: `ipv6://${certificate["store:ipv6Address"]["u:ipv6"]}`,
      },
      {
        id: `${did}#uor-address`,
        type: "UorBrailleAddress",
        serviceEndpoint: `urn:uor:address:${certificate["store:uorAddress"]["u:glyph"]}`,
      },
    ],
  };
}

/**
 * Full DID Resolution — returns document + metadata per DID Resolution spec.
 *
 * @param certificate  The UOR certificate to resolve
 * @returns            Complete resolution result with metadata
 */
export function resolveDidFull(certificate: UorCertificate): DidResolutionResult {
  return {
    didDocument: resolveDidDocument(certificate),
    didResolutionMetadata: {
      contentType: "application/did+ld+json",
      created: certificate["cert:issuedAt"],
      "uor:sourceHash": certificate["cert:sourceHash"],
      "uor:cid": certificate["cert:cid"],
    },
    didDocumentMetadata: {
      created: certificate["cert:issuedAt"],
      "uor:address": certificate["store:uorAddress"]["u:glyph"],
    },
  };
}

/**
 * Format a CID as a did:uor identifier.
 */
export function cidToDid(cid: string): string {
  return `did:uor:${cid}`;
}

/**
 * Extract the CID from a did:uor identifier.
 * @throws If the DID is not a valid did:uor
 */
export function didToCid(did: string): string {
  if (!did.startsWith("did:uor:")) {
    throw new Error(`Not a did:uor identifier: ${did}`);
  }
  return did.slice(8);
}

/**
 * Check if a string is a valid did:uor identifier.
 */
export function isDidUor(value: string): boolean {
  return value.startsWith("did:uor:") && value.length > 8;
}
