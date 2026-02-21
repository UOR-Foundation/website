import { describe, it, expect } from "vitest";
import { emitContext } from "@/modules/jsonld/context";
import { emitDatum, emitDerivation, emitCoherenceProof, emitGraph } from "@/modules/jsonld/emitter";
import { validateJsonLd } from "@/modules/jsonld/validator";
import { Q0 } from "@/modules/ring-core/ring";

describe("emitContext", () => {
  it("has @base and @vocab", () => {
    const ctx = emitContext();
    expect(ctx["@base"]).toBe("https://uor.foundation/u/");
    expect(ctx["@vocab"]).toBe("https://uor.foundation/u/");
  });

  it("has all 14 UOR namespaces plus 7 W3C prefixes", () => {
    const ctx = emitContext();
    const namespaces = ["xsd", "schema", "op", "type", "resolver", "partition",
      "observable", "proof", "derivation", "trace", "cert", "morphism", "state", "u",
      "rdf", "rdfs", "owl", "skos", "dcterms", "foaf", "prov"];
    for (const ns of namespaces) {
      expect(ctx).toHaveProperty(ns);
    }
  });

  it("has typed properties", () => {
    const ctx = emitContext();
    expect(ctx.value).toEqual({ "@type": "xsd:nonNegativeInteger" });
    expect(ctx.basis).toEqual({ "@type": "@id" });
    expect(ctx.succ).toEqual({ "@type": "@id" });
  });
});

describe("emitDatum", () => {
  const ring = Q0();

  it("emits valid @id IRI for value 0x55", () => {
    const node = emitDatum(ring, 0x55);
    expect(node["@id"]).toBe("https://uor.foundation/u/U2855");
    expect(node["@type"]).toBe("schema:Datum");
    expect(node["schema:value"]).toBe(0x55);
  });

  it("emits correct succ/pred/inverse/not IRIs", () => {
    const node = emitDatum(ring, 42);
    // succ(42) = 43
    expect(node.succ).toBe("https://uor.foundation/u/U282B");
    // pred(42) = 41
    expect(node.pred).toBe("https://uor.foundation/u/U2829");
  });

  it("includes derivationIds when provided", () => {
    const node = emitDatum(ring, 42, ["urn:uor:derivation:sha256:abc123"]);
    expect(node["derivation:derivedBy"]).toEqual(["urn:uor:derivation:sha256:abc123"]);
  });

  it("includes partition classification", () => {
    const node = emitDatum(ring, 0);
    expect(node["partition:component"]).toBe("partition:ExteriorSet");
    const node1 = emitDatum(ring, 1);
    expect(node1["partition:component"]).toBe("partition:UnitSet");
  });
});

describe("emitCoherenceProof", () => {
  it("emits proof node with correct structure", () => {
    const ring = Q0();
    const proof = emitCoherenceProof(ring);
    expect(proof["@type"]).toBe("proof:CoherenceProof");
    expect(proof["proof:criticalIdentity"]).toBe("neg(bnot(x)) = succ(x)");
    expect(proof["proof:verified"]).toBe(true);
  });
});

describe("emitGraph", () => {
  it("emits complete JSON-LD document for Q0 subset", () => {
    const ring = Q0();
    const doc = emitGraph(ring, { values: [0, 1, 42, 255] });
    expect(doc["@context"]["@base"]).toBe("https://uor.foundation/u/");
    // 1 proof + 4 datums = 5 nodes
    expect(doc["@graph"].length).toBe(5);
  });

  it("validates against validator", () => {
    const ring = Q0();
    const doc = emitGraph(ring, { values: [0, 1, 255] });
    const result = validateJsonLd(doc);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.nodeCount).toBe(4); // 1 proof + 3 datums
  });

  it("full Q0 graph has 257 nodes (1 proof + 256 datums)", () => {
    const ring = Q0();
    const doc = emitGraph(ring);
    expect(doc["@graph"].length).toBe(257);
  });
});

describe("validateJsonLd", () => {
  it("rejects missing @context", () => {
    const r = validateJsonLd({ "@graph": [] });
    expect(r.valid).toBe(false);
    expect(r.errors).toContain("Missing @context");
  });

  it("rejects missing @graph", () => {
    const r = validateJsonLd({ "@context": {} });
    expect(r.valid).toBe(false);
    expect(r.errors).toContain("Missing @graph");
  });

  it("reports type counts", () => {
    const ring = Q0();
    const doc = emitGraph(ring, { values: [0, 1] });
    const r = validateJsonLd(doc);
    expect(r.typeCounts["schema:Datum"]).toBe(2);
    expect(r.typeCounts["proof:CoherenceProof"]).toBe(1);
  });
});
