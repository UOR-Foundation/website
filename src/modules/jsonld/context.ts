/**
 * UOR JSON-LD Context — W3C JSON-LD 1.1 @context with all 14 UOR namespaces.
 *
 * Requirement R6: All UOR output must be valid W3C JSON-LD 1.1.
 * This module emits the canonical @context object used by every JSON-LD document.
 *
 * Zero duplication — this is the single source of truth for namespace bindings.
 */

export interface UorJsonLdContext {
  "@base": string;
  "@vocab": string;
  [key: string]: string | { "@type": string } | { "@type": "@id" };
}

/**
 * Emit the full UOR @context object with all 14 namespaces and typed properties.
 *
 * Namespaces:
 *   xsd, schema, op, type, resolver, partition, observable,
 *   proof, derivation, trace, cert, morphism, state, u
 *
 * Typed properties:
 *   value, quantum, totalStratum → xsd:nonNegativeInteger
 *   basis, succ, pred, inverse, not → @id references
 */
export function emitContext(): UorJsonLdContext {
  return {
    "@base": "https://uor.foundation/u/",
    "@vocab": "https://uor.foundation/u/",

    // ── 14 namespaces ────────────────────────────────────────────────────
    xsd: "http://www.w3.org/2001/XMLSchema#",
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
    u: "https://uor.foundation/u/",

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
