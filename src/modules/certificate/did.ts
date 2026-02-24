/**
 * DID:UOR — Content-Addressed Decentralized Identifier Method
 * ════════════════════════════════════════════════════════════
 *
 * Maps UOR content identifiers to W3C DID Documents.
 *
 * DID Method:  did:uor:{cid}
 *
 * The DID Document is a VIEW of the hologram — its `alsoKnownAs` is the
 * set of all lossless projections, and its `service` endpoints are the
 * protocol-specific resolution URLs derived from the same identity.
 *
 * W3C Compliance:
 *   - DID Core 1.0: https://www.w3.org/TR/did-core/
 *   - DID Resolution: https://www.w3.org/TR/did-resolution/
 *
 * @module certificate/did
 */

import type { UorCertificate } from "./types";
import { project, PROJECTIONS } from "@/modules/uns/core/hologram";
import type { ProjectionInput } from "@/modules/uns/core/hologram";

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
  id: string;
  controller: string;
  alsoKnownAs: string[];
  verificationMethod: Array<{
    id: string;
    type: "Multikey";
    controller: string;
    publicKeyMultibase: string;
  }>;
  assertionMethod: string[];
  authentication: string[];
  service: Array<{
    id: string;
    type: string;
    serviceEndpoint: string;
  }>;
}

/**
 * DID Resolution Metadata — per DID Resolution §3.1.
 */
export interface DidResolutionMetadata {
  contentType: "application/did+ld+json";
  created: string;
  "uor:sourceHash": string;
  "uor:cid": string;
}

/**
 * Complete DID Resolution Result per DID Resolution spec.
 */
export interface DidResolutionResult {
  didDocument: UorDidDocument;
  didResolutionMetadata: DidResolutionMetadata;
  didDocumentMetadata: {
    created: string;
    "uor:address": string;
  };
}

// ── Hologram → DID Document ─────────────────────────────────────────────────

/**
 * Build a ProjectionInput from a UOR certificate's identity fields.
 */
function certToInput(certificate: UorCertificate): ProjectionInput {
  const hex = certificate["cert:sourceHash"];
  // Reconstruct hashBytes from source hash hex
  const hashBytes = new Uint8Array(32);
  for (let i = 0; i < 64; i += 2) {
    hashBytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return { hashBytes, cid: certificate["cert:cid"], hex };
}

/**
 * DID Core §5.1.1 — `alsoKnownAs`: all lossless hologram projections.
 *
 * The hologram provides every protocol-native identifier for this identity.
 * We include all lossless projections as equivalent identifiers,
 * excluding the DID itself (it's the document's `id`, not an alias).
 */
function buildAlsoKnownAs(input: ProjectionInput): string[] {
  const aliases: string[] = [];
  for (const [name, spec] of PROJECTIONS) {
    if (name === "did") continue; // DID is the document id, not an alias
    if (spec.fidelity === "lossless") {
      aliases.push(spec.project(input));
    }
  }
  return aliases;
}

/**
 * DID Core §5.4 — `service`: protocol-specific resolution endpoints
 * derived from the hologram's protocol projections.
 */
function buildServiceEndpoints(did: string, input: ProjectionInput): Array<{
  id: string;
  type: string;
  serviceEndpoint: string;
}> {
  // Map specific hologram projections to DID service endpoints.
  // Only include projections that resolve to actionable URLs/URIs.
  const services: Array<{ id: string; type: string; serviceEndpoint: string }> = [];

  const endpointMap: Array<[projection: string, type: string]> = [
    ["ipv6",        "UorContentAddress"],
    ["glyph",       "UorBrailleAddress"],
    ["activitypub", "ActivityPubObject"],
    ["atproto",     "AtProtocolRecord"],
    ["oidc",        "OpenIdConnectSubject"],
    ["gs1",         "GS1DigitalLink"],
    ["openbadges",  "OpenBadgeCredential"],
    ["solid",       "SolidWebID"],
    ["webfinger",   "WebFingerDiscovery"],
    ["dnssd",       "DnsServiceDiscovery"],
  ];

  for (const [name, type] of endpointMap) {
    const spec = PROJECTIONS.get(name);
    if (spec) {
      const value = spec.project(input);
      const prefix = name === "ipv6" ? "ipv6://" : name === "glyph" ? "urn:uor:address:" : "";
      services.push({
        id: `${did}#${name}`,
        type,
        serviceEndpoint: prefix + value,
      });
    }
  }

  return services;
}

// ── DID Resolution ──────────────────────────────────────────────────────────

/**
 * Resolve a UOR certificate into a W3C DID Document.
 *
 * The DID Document IS a holographic projection — every field derived
 * from the same canonical identity through the projection registry.
 */
export function resolveDidDocument(certificate: UorCertificate): UorDidDocument {
  const input = certToInput(certificate);
  const did = project(input, "did").value;
  const verificationId = `${did}#content-hash`;

  return {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://uor.foundation/contexts/uor-v1.jsonld",
    ] as const,
    id: did,
    controller: did,
    alsoKnownAs: buildAlsoKnownAs(input),
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
    service: buildServiceEndpoints(did, input),
  };
}

/**
 * Full DID Resolution — returns document + metadata per DID Resolution spec.
 */
export function resolveDidFull(certificate: UorCertificate): DidResolutionResult {
  const input = certToInput(certificate);
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
      "uor:address": project(input, "glyph").value,
    },
  };
}

/**
 * Format a CID as a did:uor identifier.
 * Delegates to the hologram DID projection semantics.
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
