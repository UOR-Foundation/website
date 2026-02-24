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
 * W3C Spec: https://www.w3.org/TR/did-core/
 *
 * @module certificate/did
 */

import type { UorCertificate } from "./types";

// ── Types ───────────────────────────────────────────────────────────────────

/**
 * W3C DID Document for a UOR content-addressed identity.
 * Follows https://www.w3.org/TR/did-core/#core-properties
 */
export interface UorDidDocument {
  "@context": readonly [
    "https://www.w3.org/ns/did/v1",
    "https://uor.foundation/contexts/uor-v1.jsonld"
  ];
  /** The DID — did:uor:{cid} */
  id: string;
  /** Verification methods for this identity */
  verificationMethod: Array<{
    id: string;
    type: "ContentHashVerification2024";
    controller: string;
    /** The SHA-256 hex of the canonical payload */
    "uor:hashHex": string;
    /** The CIDv1 content identifier */
    "uor:cid": string;
    /** The UOR Braille address */
    "uor:address": string;
  }>;
  /** Methods used for asserting claims */
  assertionMethod: string[];
  /** Methods used for authentication */
  authentication: string[];
  /** Service endpoints */
  service: Array<{
    id: string;
    type: string;
    serviceEndpoint: string;
  }>;
  /** When this DID Document was created */
  created: string;
}

// ── DID Resolution ──────────────────────────────────────────────────────────

/**
 * Resolve a UOR certificate into a W3C DID Document.
 *
 * The DID is content-addressed: did:uor:{cid}
 * This means the identifier IS the content — no registry needed.
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
    verificationMethod: [
      {
        id: verificationId,
        type: "ContentHashVerification2024",
        controller: did,
        "uor:hashHex": certificate["cert:sourceHash"],
        "uor:cid": cid,
        "uor:address": certificate["store:uorAddress"]["u:glyph"],
      },
    ],
    assertionMethod: [verificationId],
    authentication: [verificationId],
    service: [
      {
        id: `${did}#ipv6`,
        type: "UorContentAddress",
        serviceEndpoint: certificate["store:ipv6Address"]["u:ipv6"],
      },
    ],
    created: certificate["cert:issuedAt"],
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
