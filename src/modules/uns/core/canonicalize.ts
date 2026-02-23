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

const UOR_V1_INLINE_CONTEXT: Record<string, unknown> = {
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  owl: "http://www.w3.org/2002/07/owl#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
  skos: "http://www.w3.org/2004/02/skos/core#",
  dcterms: "http://purl.org/dc/terms/",
  foaf: "http://xmlns.com/foaf/0.1/",
  prov: "http://www.w3.org/ns/prov#",
  sdo: "https://schema.org/",
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
