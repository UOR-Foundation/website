/**
 * UOR JSON-LD Context — W3C JSON-LD 1.1 @context with all 17 UOR namespaces.
 *
 * Requirement R6: All UOR output must be valid W3C JSON-LD 1.1.
 * This module emits the canonical @context object used by every JSON-LD document.
 *
 * IMPORTANT: This context is a SUPERSET of public/contexts/uor-v1.jsonld,
 * adding @base/@vocab and graph-emission typed properties. The published
 * context file and the inline context in uor-canonical.ts must remain
 * synchronized for deterministic URDNA2015 canonicalization.
 *
 * Zero duplication — this is the single source of truth for namespace bindings
 * used in graph emission (emitter.ts).
 */

export interface UorJsonLdContext {
  "@base": string;
  "@vocab": string;
  [key: string]: string | { "@type": string } | { "@type": "@id" };
}

/**
 * Emit the full UOR @context object with all 17 namespaces and typed properties.
 *
 * Namespaces (9 W3C + 17 UOR):
 *   W3C:  rdf, rdfs, owl, xsd, skos, dcterms, foaf, prov, sdo
 *   UOR:  schema, op, type, resolver, partition, observable,
 *         proof, derivation, trace, cert, morphism, state, store,
 *         u, query, sobridge
 *
 * Typed properties:
 *   value, quantum, totalStratum → xsd:nonNegativeInteger
 *   basis, succ, pred, inverse, not → @id references
 */
export function emitContext(): UorJsonLdContext {
  return {
    "@base": "https://uor.foundation/u/",
    "@vocab": "https://uor.foundation/u/",

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
    schema: "https://uor.foundation/schema/",
    op: "https://uor.foundation/op/",
    type: "https://uor.foundation/type/",
    resolver: "https://uor.foundation/resolver/",
    partition: "https://uor.foundation/partition/",
    observable: "https://uor.foundation/observable/",
    proof: "https://uor.foundation/proof/",
    derivation: "https://uor.foundation/derivation/",
    trace: "https://uor.foundation/trace/",
    cert: "https://uor.foundation/cert/",
    morphism: "https://uor.foundation/morphism/",
    state: "https://uor.foundation/state/",
    store: "https://uor.foundation/store/",
    u: "https://uor.foundation/u/",
    query: "https://uor.foundation/query/",
    sobridge: "https://uor.foundation/sobridge/",

    // ── Typed properties (xsd:nonNegativeInteger) ────────────────────────
    value: { "@type": "xsd:nonNegativeInteger" },
    quantum: { "@type": "xsd:nonNegativeInteger" },
    totalStratum: { "@type": "xsd:nonNegativeInteger" },

    // ── @id-typed references ─────────────────────────────────────────────
    basis: { "@type": "@id" },
    succ: { "@type": "@id" },
    pred: { "@type": "@id" },
    inverse: { "@type": "@id" },
    not: { "@type": "@id" },
  };
}
