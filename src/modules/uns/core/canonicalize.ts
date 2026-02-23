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

// ── Custom Document Loader ──────────────────────────────────────────────────

function createDocumentLoader() {
  const defaultLoader =
    typeof window !== "undefined"
      ? (jsonld as any).documentLoaders?.xhr?.()
      : (jsonld as any).documentLoaders?.node?.();

  return async (url: string) => {
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
  });
  return nquads;
}
