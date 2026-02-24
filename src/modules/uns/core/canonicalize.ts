/**
 * UNS Core — URDNA2015 Canonicalization
 *
 * Wraps the W3C jsonld.js reference implementation to produce
 * deterministic N-Quads from any object (JSON-LD or plain).
 *
 * Non-JSON-LD objects are wrapped in a UOR store envelope before
 * canonicalization, ensuring every possible input can be identity-hashed.
 *
 * Single dependency: jsonld (W3C reference implementation).
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — jsonld v8 types may not resolve in all configurations
import jsonld from "jsonld";

// ── Inline Contexts (offline-first — no network dependency) ─────────────────

const UOR_WRAP_CONTEXT: Record<string, unknown> = {
  store: "https://uor.foundation/store/",
  xsd: "http://www.w3.org/2001/XMLSchema#",
  serialisation: {
    "@id": "https://uor.foundation/store/serialisation",
    "@type": "xsd:string",
  },
};

const UOR_V1_CONTEXT_URL = "https://uor.foundation/contexts/uor-v1.jsonld";
const UNS_V1_CONTEXT_URL = "https://uor.foundation/contexts/uns-v1.jsonld";

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

/** UNS v1 context — inlined for offline canonicalization. */
const UNS_V1_INLINE_CONTEXT: Record<string, unknown> = {
  uns: "https://uor.foundation/uns/",
  u: "https://uor.foundation/u/",
  cert: "https://uor.foundation/cert/",
  proof: "https://uor.foundation/proof/",
  partition: "https://uor.foundation/partition/",
  morphism: "https://uor.foundation/morphism/",
  state: "https://uor.foundation/state/",
  derivation: "https://uor.foundation/derivation/",
  trace: "https://uor.foundation/trace/",
  xsd: "http://www.w3.org/2001/XMLSchema#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  prov: "http://www.w3.org/ns/prov#",
  "uns:name": { "@id": "https://uor.foundation/uns/name", "@type": "xsd:string" },
  "uns:target": { "@id": "https://uor.foundation/uns/target", "@type": "@id" },
  "uns:services": { "@id": "https://uor.foundation/uns/services", "@container": "@list" },
  "uns:serviceType": { "@id": "https://uor.foundation/uns/serviceType", "@type": "xsd:string" },
  "uns:port": { "@id": "https://uor.foundation/uns/port", "@type": "xsd:integer" },
  "uns:priority": { "@id": "https://uor.foundation/uns/priority", "@type": "xsd:integer" },
  "uns:validFrom": { "@id": "https://uor.foundation/uns/validFrom", "@type": "xsd:dateTime" },
  "uns:validUntil": { "@id": "https://uor.foundation/uns/validUntil", "@type": "xsd:dateTime" },
  "uns:signerCanonicalId": { "@id": "https://uor.foundation/uns/signerCanonicalId", "@type": "xsd:string" },
  "uns:revoked": { "@id": "https://uor.foundation/uns/revoked", "@type": "xsd:boolean" },
  "uns:successorKeyCanonicalId": { "@id": "https://uor.foundation/uns/successorKeyCanonicalId", "@type": "xsd:string" },
  "u:canonicalId": { "@id": "https://uor.foundation/u/canonicalId", "@type": "xsd:string" },
  "u:ipv6": { "@id": "https://uor.foundation/u/ipv6", "@type": "xsd:string" },
  "u:cid": { "@id": "https://uor.foundation/u/cid", "@type": "xsd:string" },
  "cert:algorithm": { "@id": "https://uor.foundation/cert/algorithm", "@type": "xsd:string" },
  "cert:keyBytes": { "@id": "https://uor.foundation/cert/keyBytes", "@type": "xsd:base64Binary" },
  "cert:signature": { "@id": "https://uor.foundation/cert/signature" },
  "cert:signatureBytes": { "@id": "https://uor.foundation/cert/signatureBytes", "@type": "xsd:base64Binary" },
  "cert:signerCanonicalId": { "@id": "https://uor.foundation/cert/signerCanonicalId", "@type": "xsd:string" },
  "cert:signedAt": { "@id": "https://uor.foundation/cert/signedAt", "@type": "xsd:dateTime" },
  "partition:irreducibleDensity": { "@id": "https://uor.foundation/partition/irreducibleDensity", "@type": "xsd:decimal" },
};

// ── Schema.org Inline Context (offline-first) ───────────────────────────────

const SCHEMA_ORG_INLINE_CONTEXT: Record<string, unknown> = {
  schema: "https://schema.org/",
  name: "schema:name",
  description: "schema:description",
  url: "schema:url",
  image: { "@id": "schema:image", "@type": "@id" },
  author: { "@id": "schema:author", "@type": "@id" },
  datePublished: "schema:datePublished",
  dateCreated: "schema:dateCreated",
  identifier: "schema:identifier",
  keywords: "schema:keywords",
  license: { "@id": "schema:license", "@type": "@id" },
  version: "schema:version",
  contentUrl: { "@id": "schema:contentUrl", "@type": "@id" },
  encodingFormat: "schema:encodingFormat",
  duration: "schema:duration",
  genre: "schema:genre",
  inLanguage: "schema:inLanguage",
};

// ── FPP v1 context (inlined for offline canonicalization) ───────────────────

const FPP_V1_CONTEXT_URL = "https://www.firstperson.network/context/v1";

const FPP_V1_INLINE_CONTEXT: Record<string, unknown> = {
  fpp: "https://www.firstperson.network/ns/",
  xsd: "http://www.w3.org/2001/XMLSchema#",
  "fpp:PersonhoodCredential": { "@id": "fpp:PersonhoodCredential" },
  "fpp:VerifiableRelationshipCredential": { "@id": "fpp:VerifiableRelationshipCredential" },
  "fpp:VerifiableEndorsementCredential": { "@id": "fpp:VerifiableEndorsementCredential" },
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

// ── Custom Document Loader ──────────────────────────────────────────────────

function createDocumentLoader() {
  const defaultLoader =
    typeof window !== "undefined"
      ? (jsonld as any).documentLoaders?.xhr?.()
      : (jsonld as any).documentLoaders?.node?.();

  return async (url: string) => {
    // UOR v1 context — served locally
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

    // UNS v1 context — served locally
    if (
      url === UNS_V1_CONTEXT_URL ||
      url === UNS_V1_CONTEXT_URL.replace("https://", "http://")
    ) {
      return {
        contextUrl: null,
        documentUrl: url,
        document: { "@context": UNS_V1_INLINE_CONTEXT },
      };
    }

    // Schema.org — served locally to avoid CORS failures in-browser
    if (
      url === "https://schema.org" ||
      url === "https://schema.org/" ||
      url === "http://schema.org" ||
      url === "http://schema.org/"
    ) {
      return {
        contextUrl: null,
        documentUrl: url,
        document: { "@context": SCHEMA_ORG_INLINE_CONTEXT },
      };
    }

    // FPP v1 context — served locally
    if (url === FPP_V1_CONTEXT_URL || url === FPP_V1_CONTEXT_URL.replace("https://", "http://")) {
      return { contextUrl: null, documentUrl: url, document: { "@context": FPP_V1_INLINE_CONTEXT } };
    }

    // TSP v1 context — served locally
    if (url === TSP_V1_CONTEXT_URL || url === TSP_V1_CONTEXT_URL.replace("https://", "http://")) {
      return { contextUrl: null, documentUrl: url, document: { "@context": TSP_V1_INLINE_CONTEXT } };
    }

    if (defaultLoader) return defaultLoader(url);

    throw new Error(
      `[UNS Canonical] Cannot load remote context: ${url}. ` +
        `Provide an inline @context for offline canonicalization.`
    );
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function isJsonLd(obj: unknown): obj is Record<string, unknown> {
  return (
    obj !== null &&
    typeof obj === "object" &&
    !Array.isArray(obj) &&
    "@context" in (obj as Record<string, unknown>)
  );
}

/** Deterministic JSON serialization with recursively sorted keys. */
function canonicalJson(obj: unknown): string {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj))
    return "[" + obj.map(canonicalJson).join(",") + "]";
  const sorted = Object.keys(obj as Record<string, unknown>).sort();
  return (
    "{" +
    sorted
      .map(
        (k) =>
          JSON.stringify(k) +
          ":" +
          canonicalJson((obj as Record<string, unknown>)[k])
      )
      .join(",") +
    "}"
  );
}

function wrapAsJsonLd(obj: unknown): Record<string, unknown> {
  return {
    "@context": UOR_WRAP_CONTEXT,
    "@type": "store:StoredObject",
    serialisation: canonicalJson(obj),
  };
}

// ── Public API ──────────────────────────────────────────────────────────────

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
