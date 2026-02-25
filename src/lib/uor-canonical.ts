/**
 * UOR Single Proof Hashing Standard — URDNA2015 Canonicalization.
 *
 * THE FUNDAMENTAL CONTRACT:
 *   nquads = URDNA2015(jsonld.canonize(obj))
 *   hash   = SHA-256(UTF-8(nquads))
 *
 *   derivation_id  = "urn:uor:derivation:sha256:" + hex(hash)
 *   store:uorCid   = CIDv1(dag-json, sha2-256, nquadsBytes)
 *   u:address      = toGlyph(hash[0..N])
 *
 * One input. One hash. Three derived forms.
 * W3C URDNA2015 ensures any agent in any language reproduces identical results.
 *
 * Pure functions. Single dependency: jsonld.js (W3C reference implementation).
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — jsonld v8 types may not resolve perfectly in all configurations
import jsonld from "jsonld";
import { computeCid, computeUorAddress, canonicalJsonLd, computeIpv6Address } from "./uor-address";

// ── UOR inline context for wrapping non-JSON-LD objects ─────────────────────
// Inline to avoid network dependency — any agent can reproduce this locally.

const UOR_WRAP_CONTEXT: Record<string, unknown> = {
  store: "https://uor.foundation/store/",
  xsd: "http://www.w3.org/2001/XMLSchema#",
  serialisation: {
    "@id": "https://uor.foundation/store/serialisation",
    "@type": "xsd:string",
  },
};

// ── UOR v1 context (inlined for offline canonicalization) ───────────────────

const UOR_V1_CONTEXT_URL = "https://uor.foundation/contexts/uor-v1.jsonld";

// Inline context matching public/contexts/uor-v1.jsonld — avoids network fetch.
// CRITICAL: This MUST be an exact mirror of the published context file.
// Any divergence causes different URDNA2015 canonicalization output,
// breaking content-addressed identity determinism.
const UOR_V1_INLINE_CONTEXT: Record<string, unknown> = {
  // ── W3C standard namespaces ──────────────────────────────────────────
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  owl: "http://www.w3.org/2002/07/owl#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
  skos: "http://www.w3.org/2004/02/skos/core#",
  dcterms: "http://purl.org/dc/terms/",
  foaf: "http://xmlns.com/foaf/0.1/",
  prov: "http://www.w3.org/ns/prov#",
  sdo: "https://schema.org/",

  // ── 17 UOR namespaces ────────────────────────────────────────────────
  u: "https://uor.foundation/u/",
  schema: "https://uor.foundation/schema/",
  op: "https://uor.foundation/op/",
  query: "https://uor.foundation/query/",
  resolver: "https://uor.foundation/resolver/",
  type: "https://uor.foundation/type/",
  partition: "https://uor.foundation/partition/",
  observable: "https://uor.foundation/observable/",
  proof: "https://uor.foundation/proof/",
  derivation: "https://uor.foundation/derivation/",
  trace: "https://uor.foundation/trace/",
  cert: "https://uor.foundation/cert/",
  morphism: "https://uor.foundation/morphism/",
  state: "https://uor.foundation/state/",
  store: "https://uor.foundation/store/",
  sobridge: "https://uor.foundation/sobridge/",

  // ── sobridge typed properties (mirrors uor-v1.jsonld exactly) ────────
  "sobridge:SchemaOrgType": { "@id": "sobridge:SchemaOrgType" },
  "sobridge:SchemaOrgInstance": { "@id": "sobridge:SchemaOrgInstance" },
  "sobridge:sourceType": { "@id": "sobridge:sourceType", "@type": "@id" },
  "sobridge:schemaOrgIri": { "@id": "sobridge:schemaOrgIri", "@type": "xsd:anyURI" },
  "sobridge:properties": { "@id": "sobridge:properties" },
  "sobridge:superClasses": { "@id": "sobridge:superClasses", "@type": "@id" },
  "sobridge:canonicalPayload": { "@id": "sobridge:canonicalPayload", "@type": "xsd:string" },
  "sobridge:storedCid": { "@id": "sobridge:storedCid", "@type": "xsd:string" },
  "sobridge:coherenceProof": { "@id": "sobridge:coherenceProof" },
  "sobridge:actionMapping": { "@id": "sobridge:actionMapping" },
  "sobridge:morphismType": { "@id": "sobridge:morphismType", "@type": "@id" },
  "sobridge:actionInput": { "@id": "sobridge:actionInput" },
  "sobridge:actionOutput": { "@id": "sobridge:actionOutput" },
  "sobridge:storachaCid": { "@id": "sobridge:storachaCid", "@type": "xsd:string" },
  "sobridge:pinataCid": { "@id": "sobridge:pinataCid", "@type": "xsd:string" },

  // ── store typed properties (mirrors uor-v1.jsonld exactly) ───────────
  "store:StoredObject": { "@id": "store:StoredObject" },
  "store:Cid": { "@id": "store:Cid" },
  "store:PinRecord": { "@id": "store:PinRecord" },
  "store:StoreContext": { "@id": "store:StoreContext" },
  "store:RetrievedObject": { "@id": "store:RetrievedObject" },
  "store:GatewayConfig": { "@id": "store:GatewayConfig" },

  "store:uorAddress": { "@id": "store:uorAddress", "@type": "@id" },
  "store:ipv6Address": { "@id": "store:ipv6Address" },
  "store:cid": { "@id": "store:cid", "@type": "xsd:string" },
  "store:storedType": { "@id": "store:storedType", "@type": "@id" },
  "store:serialisation": { "@id": "store:serialisation", "@type": "xsd:string" },
  "store:pinRecord": { "@id": "store:pinRecord", "@type": "@id" },
  "store:pinnedAt": { "@id": "store:pinnedAt", "@type": "xsd:dateTime" },
  "store:gatewayUrl": { "@id": "store:gatewayUrl", "@type": "xsd:anyURI" },
  "store:pinCertificate": { "@id": "store:pinCertificate", "@type": "@id" },
  "store:retrievedFrom": { "@id": "store:retrievedFrom", "@type": "xsd:string" },
  "store:storedUorAddress": { "@id": "store:storedUorAddress", "@type": "xsd:string" },
  "store:recomputedUorAddress": { "@id": "store:recomputedUorAddress", "@type": "xsd:string" },
  "store:verified": { "@id": "store:verified", "@type": "xsd:boolean" },
  "store:rootCid": { "@id": "store:rootCid", "@type": "xsd:string" },
  "store:ipnsKey": { "@id": "store:ipnsKey", "@type": "xsd:string" },
  "store:gatewayReadUrl": { "@id": "store:gatewayReadUrl", "@type": "xsd:anyURI" },
  "store:pinsApiUrl": { "@id": "store:pinsApiUrl", "@type": "xsd:anyURI" },
};

// ── FPP v1 context (inlined for offline canonicalization) ───────────────────

const FPP_V1_CONTEXT_URL = "https://www.firstperson.network/context/v1";

const FPP_V1_INLINE_CONTEXT: Record<string, unknown> = {
  fpp: "https://www.firstperson.network/ns/",
  xsd: "http://www.w3.org/2001/XMLSchema#",
  "fpp:PersonhoodCredential": { "@id": "fpp:PersonhoodCredential" },
  "fpp:VerifiableRelationshipCredential": { "@id": "fpp:VerifiableRelationshipCredential" },
  "fpp:VerifiableEndorsementCredential": { "@id": "fpp:VerifiableEndorsementCredential" },
  "fpp:AgentDelegationCredential": { "@id": "fpp:AgentDelegationCredential" },
  "fpp:Persona": { "@id": "fpp:Persona" },
  "fpp:RelationshipCard": { "@id": "fpp:RelationshipCard" },
  "fpp:TrustGraphNode": { "@id": "fpp:TrustGraphNode" },
  "fpp:VrcDelivery": { "@id": "fpp:VrcDelivery" },
  "fpp:ecosystem": { "@id": "fpp:ecosystem", "@type": "xsd:string" },
  "fpp:holder": { "@id": "fpp:holder", "@type": "xsd:string" },
  "fpp:issuedAt": { "@id": "fpp:issuedAt", "@type": "xsd:dateTime" },
  "fpp:expiresAt": { "@id": "fpp:expiresAt", "@type": "xsd:dateTime" },
  "fpp:issuer": { "@id": "fpp:issuer", "@type": "xsd:string" },
  "fpp:nonce": { "@id": "fpp:nonce", "@type": "xsd:string" },
  "fpp:issuerRdid": { "@id": "fpp:issuerRdid", "@type": "xsd:string" },
  "fpp:subjectRdid": { "@id": "fpp:subjectRdid", "@type": "xsd:string" },
  "fpp:issuerPhcRef": { "@id": "fpp:issuerPhcRef", "@type": "xsd:string" },
  "fpp:subjectPhcRef": { "@id": "fpp:subjectPhcRef", "@type": "xsd:string" },
  "fpp:endorserPdid": { "@id": "fpp:endorserPdid", "@type": "xsd:string" },
  "fpp:subjectPdid": { "@id": "fpp:subjectPdid", "@type": "xsd:string" },
  "fpp:endorsements": { "@id": "fpp:endorsements" },
  "fpp:context": { "@id": "fpp:context", "@type": "xsd:string" },
  "fpp:type": { "@id": "fpp:type", "@type": "xsd:string" },
  "fpp:label": { "@id": "fpp:label", "@type": "xsd:string" },
  "fpp:contexts": { "@id": "fpp:contexts" },
  "fpp:public": { "@id": "fpp:public", "@type": "xsd:boolean" },
  "fpp:createdAt": { "@id": "fpp:createdAt", "@type": "xsd:dateTime" },
  "fpp:personaDid": { "@id": "fpp:personaDid", "@type": "xsd:string" },
  "fpp:displayName": { "@id": "fpp:displayName", "@type": "xsd:string" },
  "fpp:title": { "@id": "fpp:title", "@type": "xsd:string" },
  "fpp:organization": { "@id": "fpp:organization", "@type": "xsd:string" },
  "fpp:endpoints": { "@id": "fpp:endpoints" },
  "fpp:version": { "@id": "fpp:version", "@type": "xsd:integer" },
  "fpp:updatedAt": { "@id": "fpp:updatedAt", "@type": "xsd:dateTime" },
  "fpp:nodeDid": { "@id": "fpp:nodeDid", "@type": "xsd:string" },
  "fpp:phcRefs": { "@id": "fpp:phcRefs" },
  "fpp:vrcCount": { "@id": "fpp:vrcCount", "@type": "xsd:integer" },
  "fpp:ecosystems": { "@id": "fpp:ecosystems" },
  "fpp:snapshotAt": { "@id": "fpp:snapshotAt", "@type": "xsd:dateTime" },
  "fpp:vrc": { "@id": "fpp:vrc", "@type": "xsd:string" },
  "fpp:delegatorRdid": { "@id": "fpp:delegatorRdid", "@type": "xsd:string" },
  "fpp:agentDid": { "@id": "fpp:agentDid", "@type": "xsd:string" },
  "fpp:delegatorPhcRef": { "@id": "fpp:delegatorPhcRef", "@type": "xsd:string" },
  "fpp:delegationVrcRef": { "@id": "fpp:delegationVrcRef", "@type": "xsd:string" },
  "fpp:delegatedCapabilities": { "@id": "fpp:delegatedCapabilities" },
  "fpp:agentModelUri": { "@id": "fpp:agentModelUri", "@type": "xsd:string" },
  "fpp:mcpEndpoint": { "@id": "fpp:mcpEndpoint", "@type": "xsd:string" },
};

// ── TSP v1 context (inlined for offline canonicalization) ───────────────────

const TSP_V1_CONTEXT_URL = "https://trustoverip.github.io/tswg-tsp-specification/context/v1";

const TSP_V1_INLINE_CONTEXT: Record<string, unknown> = {
  tsp: "https://trustoverip.github.io/tswg-tsp-specification/ns/",
  xsd: "http://www.w3.org/2001/XMLSchema#",
  "tsp:Envelope": { "@id": "tsp:Envelope" },
  "tsp:Relationship": { "@id": "tsp:Relationship" },
  "tsp:Rfi": { "@id": "tsp:Rfi" },
  "tsp:Rfa": { "@id": "tsp:Rfa" },
  "tsp:sender": { "@id": "tsp:sender", "@type": "xsd:string" },
  "tsp:receiver": { "@id": "tsp:receiver", "@type": "xsd:string" },
  "tsp:messageType": { "@id": "tsp:messageType", "@type": "xsd:string" },
  "tsp:payload": { "@id": "tsp:payload" },
  "tsp:timestamp": { "@id": "tsp:timestamp", "@type": "xsd:dateTime" },
  "tsp:nonce": { "@id": "tsp:nonce", "@type": "xsd:string" },
  "tsp:rfi": { "@id": "tsp:rfi" },
  "tsp:rfa": { "@id": "tsp:rfa" },
  "tsp:requester": { "@id": "tsp:requester", "@type": "xsd:string" },
  "tsp:responder": { "@id": "tsp:responder", "@type": "xsd:string" },
  "tsp:purpose": { "@id": "tsp:purpose", "@type": "xsd:string" },
  "tsp:accepted": { "@id": "tsp:accepted", "@type": "xsd:boolean" },
  "tsp:acceptedAt": { "@id": "tsp:acceptedAt", "@type": "xsd:dateTime" },
  "tsp:establishedAt": { "@id": "tsp:establishedAt", "@type": "xsd:dateTime" },
  "tsp:channelId": { "@id": "tsp:channelId", "@type": "xsd:string" },
  "tsp:route": { "@id": "tsp:route" },
  "tsp:finalReceiver": { "@id": "tsp:finalReceiver", "@type": "xsd:string" },
};

// ── Custom document loader (offline-first) ──────────────────────────────────

/**
 * Custom document loader that serves the UOR v1 context locally
 * and falls back to the default loader for other URLs.
 */
function createDocumentLoader() {
  // Use the built-in XHR/fetch loader for remote contexts (e.g. schema.org)
  const defaultLoader =
    typeof window !== "undefined"
      ? (jsonld as any).documentLoaders?.xhr?.()
      : (jsonld as any).documentLoaders?.node?.();

  return async (url: string) => {
    // Serve UOR context locally — no network dependency
    if (
      url === UOR_V1_CONTEXT_URL ||
      url === UOR_V1_CONTEXT_URL.replace("https://", "http://")
    ) {
      return {
        contextUrl: null,
        documentUrl: url,
        document: { "@context": UOR_V1_INLINE_CONTEXT },
      };
    }

    // Serve FPP context locally — no network dependency
    if (
      url === FPP_V1_CONTEXT_URL ||
      url === FPP_V1_CONTEXT_URL.replace("https://", "http://")
    ) {
      return {
        contextUrl: null,
        documentUrl: url,
        document: { "@context": FPP_V1_INLINE_CONTEXT },
      };
    }

    // Serve TSP context locally — no network dependency
    if (
      url === TSP_V1_CONTEXT_URL ||
      url === TSP_V1_CONTEXT_URL.replace("https://", "http://")
    ) {
      return {
        contextUrl: null,
        documentUrl: url,
        document: { "@context": TSP_V1_INLINE_CONTEXT },
      };
    }

    // Serve Lens/Executable/Session contexts locally — all use UOR v1 namespaces
    const UOR_DERIVED_CONTEXTS = [
      "https://uor.foundation/contexts/lens-v1.jsonld",
      "https://uor.foundation/contexts/executable-v1.jsonld",
      "https://uor.foundation/contexts/session-v1.jsonld",
    ];
    if (
      UOR_DERIVED_CONTEXTS.some(
        (ctx) => url === ctx || url === ctx.replace("https://", "http://"),
      )
    ) {
      return {
        contextUrl: null,
        documentUrl: url,
        document: { "@context": UOR_V1_INLINE_CONTEXT },
      };
    }
    if (defaultLoader) {
      return defaultLoader(url);
    }

    throw new Error(
      `[UOR Canonical] Cannot load remote context: ${url}. ` +
        `Provide an inline @context for offline canonicalization.`
    );
  };
}

// ── URDNA2015 Canonicalization ──────────────────────────────────────────────

/**
 * Check if an object appears to be JSON-LD (has @context).
 */
function isJsonLd(obj: unknown): obj is Record<string, unknown> {
  return (
    obj !== null &&
    typeof obj === "object" &&
    !Array.isArray(obj) &&
    "@context" in (obj as Record<string, unknown>)
  );
}

/**
 * Wrap a non-JSON-LD object as JSON-LD using the UOR store context.
 * The payload is pre-canonicalized via sorted-key JSON to ensure determinism
 * across all systems that use the same wrapping convention.
 */
function wrapAsJsonLd(obj: unknown): Record<string, unknown> {
  return {
    "@context": UOR_WRAP_CONTEXT,
    "@type": "store:StoredObject",
    serialisation: canonicalJsonLd(obj),
  };
}

/**
 * Canonicalize any object to W3C URDNA2015 N-Quads.
 *
 * - JSON-LD objects (with @context): canonized directly.
 * - Plain objects: wrapped in a UOR store envelope, then canonized.
 *
 * The result is a deterministic string that any W3C-compliant implementation
 * (Python rdflib, Java Titanium, Rust sophia) will produce identically.
 */
export async function canonicalizeToNQuads(obj: unknown): Promise<string> {
  const doc = isJsonLd(obj) ? obj : wrapAsJsonLd(obj);
  const nquads: string = await (jsonld as any).canonize(doc, {
    algorithm: "URDNA2015",
    format: "application/n-quads",
    documentLoader: createDocumentLoader(),
    safe: false,
  });
  return nquads;
}

// ── SHA-256 helpers ─────────────────────────────────────────────────────────

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", ab);
  return new Uint8Array(digest);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Single Proof Hash ──────────────────────────────────────────────────────

export interface SingleProofResult {
  /** The W3C URDNA2015 canonical N-Quads string. */
  nquads: string;
  /** The canonical N-Quads encoded as UTF-8 bytes — THE single input. */
  canonicalBytes: Uint8Array;
  /** Raw SHA-256 digest of canonical bytes (32 bytes). */
  hashBytes: Uint8Array;
  /** SHA-256 hex string. */
  hashHex: string;
  /** Deterministic derivation ID: urn:uor:derivation:sha256:{hex} */
  derivationId: string;
  /** CIDv1 / dag-json / sha2-256 / base32lower — from canonical bytes. */
  cid: string;
  /** UOR Braille bijection address — from hash bytes (32 bytes). */
  uorAddress: { "u:glyph": string; "u:length": number };
  /** UOR content-addressed IPv6 (ULA fd00:75:6f72::/48) — from hash bytes. */
  ipv6Address: {
    "u:ipv6": string;
    "u:ipv6Prefix": string;
    "u:ipv6PrefixLength": number;
    "u:contentBits": number;
  };
}

/**
 * THE SINGLE PROOF HASH.
 *
 * Takes any object (JSON-LD or plain), canonicalizes via URDNA2015,
 * computes one SHA-256 hash, and derives all four identity forms.
 *
 * Same object → same nquads → same hash → same {derivation_id, cid, u:address, u:ipv6}.
 * On every system. At any time. Forever. No registries. No DNS.
 *
 * @param obj  Any JSON-LD object or plain JavaScript object.
 * @returns    SingleProofResult with all four derived identity forms.
 */
export async function singleProofHash(
  obj: unknown
): Promise<SingleProofResult> {
  // Step 1: URDNA2015 canonical N-Quads
  const nquads = await canonicalizeToNQuads(obj);

  // Step 2: UTF-8 encode — THE single canonical byte sequence
  const canonicalBytes = new TextEncoder().encode(nquads);

  // Step 3: SHA-256 — THE single hash
  const hashBytes = await sha256(canonicalBytes);
  const hashHex = bytesToHex(hashBytes);

  // Step 4: Derive all four identity forms from ONE hash
  //   derivation_id — from hex
  //   store:uorCid  — CIDv1 wrapping the SHA-256 of canonical bytes
  //   u:address     — Braille bijection of hash bytes
  //   u:ipv6        — Content-addressed IPv6 ULA from hash bytes
  const derivationId = `urn:uor:derivation:sha256:${hashHex}`;
  const cid = await computeCid(canonicalBytes);
  const uorAddress = computeUorAddress(hashBytes);
  const ipv6Address = computeIpv6Address(hashBytes);

  return {
    nquads,
    canonicalBytes,
    hashBytes,
    hashHex,
    derivationId,
    cid,
    uorAddress,
    ipv6Address,
  };
}

/**
 * Verify a derivation ID by recomputing the single proof hash.
 * Returns true iff the recomputed derivation_id matches the given one.
 *
 * Any agent, anywhere, can call this to verify identity — no trusted third party.
 */
export async function verifySingleProof(
  obj: unknown,
  expectedDerivationId: string
): Promise<boolean> {
  const proof = await singleProofHash(obj);
  return proof.derivationId === expectedDerivationId;
}
