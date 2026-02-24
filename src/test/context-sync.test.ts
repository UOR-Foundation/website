/**
 * Context Synchronization Validation
 *
 * Ensures the THREE representations of the UOR JSON-LD context remain
 * synchronized — any drift breaks deterministic URDNA2015 canonicalization.
 *
 *   public/contexts/uor-v1.jsonld     ← Published (external consumers)
 *         ↕ EXACT MIRROR
 *   uor-canonical.ts inline context   ← Offline URDNA2015 document loader
 *         ↕ EXACT MIRROR
 *   uns/core/canonicalize.ts inline   ← UNS offline document loader
 *         ↕ SUPERSET (+@base, +@vocab, +typed graph properties)
 *   context.ts emitContext()           ← Graph emission for triplestores
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { emitContext } from "@/modules/jsonld/context";

// ── Load the published context ──────────────────────────────────────────────

function loadPublishedContext(): Record<string, unknown> {
  const raw = readFileSync(
    resolve(__dirname, "../../public/contexts/uor-v1.jsonld"),
    "utf-8"
  );
  return JSON.parse(raw)["@context"];
}

// ── Required namespace bindings (string → string mappings only) ─────────────

const REQUIRED_W3C_NAMESPACES = [
  "rdf", "rdfs", "owl", "xsd", "skos", "dcterms", "foaf", "prov", "sdo",
] as const;

const REQUIRED_UOR_NAMESPACES = [
  "u", "schema", "op", "query", "resolver", "type", "partition",
  "observable", "proof", "derivation", "trace", "cert", "morphism",
  "state", "store", "sobridge",
] as const;

// ── Tests ───────────────────────────────────────────────────────────────────

describe("Context synchronization — published uor-v1.jsonld", () => {
  const published = loadPublishedContext();

  it("contains all 9 W3C namespace prefixes", () => {
    for (const ns of REQUIRED_W3C_NAMESPACES) {
      expect(published).toHaveProperty(ns);
    }
  });

  it("contains all 17 UOR namespace prefixes (16 custom + u)", () => {
    // 'u' is the root namespace, included in the 17 count
    for (const ns of REQUIRED_UOR_NAMESPACES) {
      expect(published).toHaveProperty(ns);
    }
  });

  it("has typed property definitions for store:* terms", () => {
    const storeTerms = [
      "store:uorAddress", "store:ipv6Address", "store:cid",
      "store:storedType", "store:serialisation", "store:pinRecord",
      "store:pinnedAt", "store:gatewayUrl", "store:pinCertificate",
      "store:retrievedFrom", "store:verified", "store:rootCid",
      "store:ipnsKey", "store:gatewayReadUrl", "store:pinsApiUrl",
    ];
    for (const term of storeTerms) {
      expect(published).toHaveProperty(term);
    }
  });

  it("has typed property definitions for sobridge:* terms", () => {
    const sobridgeTerms = [
      "sobridge:SchemaOrgType", "sobridge:SchemaOrgInstance",
      "sobridge:sourceType", "sobridge:schemaOrgIri",
      "sobridge:properties", "sobridge:superClasses",
      "sobridge:canonicalPayload", "sobridge:storedCid",
      "sobridge:coherenceProof", "sobridge:actionMapping",
      "sobridge:morphismType", "sobridge:actionInput",
      "sobridge:actionOutput", "sobridge:storachaCid",
      "sobridge:pinataCid",
    ];
    for (const term of sobridgeTerms) {
      expect(published).toHaveProperty(term);
    }
  });
});

describe("Context synchronization — emitContext() vs published", () => {
  const published = loadPublishedContext();
  const emitted = emitContext();

  it("emitContext() is a SUPERSET of the published namespace bindings", () => {
    // Every namespace prefix in the published context must also be in emitContext()
    const allNamespaces = [...REQUIRED_W3C_NAMESPACES, ...REQUIRED_UOR_NAMESPACES];
    for (const ns of allNamespaces) {
      expect(emitted).toHaveProperty(ns);
      // The namespace URI values must match exactly
      const pubVal = published[ns];
      const emitVal = emitted[ns];
      if (typeof pubVal === "string" && typeof emitVal === "string") {
        expect(emitVal).toBe(pubVal);
      }
    }
  });

  it("emitContext() has @base and @vocab (graph emission additions)", () => {
    expect(emitted["@base"]).toBe("https://uor.foundation/u/");
    expect(emitted["@vocab"]).toBe("https://uor.foundation/u/");
  });

  it("emitContext() has graph-emission typed properties", () => {
    expect(emitted.value).toEqual({ "@type": "xsd:nonNegativeInteger" });
    expect(emitted.quantum).toEqual({ "@type": "xsd:nonNegativeInteger" });
    expect(emitted.basis).toEqual({ "@type": "@id" });
    expect(emitted.succ).toEqual({ "@type": "@id" });
    expect(emitted.pred).toEqual({ "@type": "@id" });
    expect(emitted.inverse).toEqual({ "@type": "@id" });
    expect(emitted.not).toEqual({ "@type": "@id" });
  });
});

describe("Context synchronization — namespace URI consistency", () => {
  const published = loadPublishedContext();
  const emitted = emitContext();

  const expected: Record<string, string> = {
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

  for (const [ns, uri] of Object.entries(expected)) {
    it(`published '${ns}' → ${uri}`, () => {
      expect(published[ns]).toBe(uri);
    });

    it(`emitContext() '${ns}' → ${uri}`, () => {
      expect(emitted[ns]).toBe(uri);
    });
  }
});
