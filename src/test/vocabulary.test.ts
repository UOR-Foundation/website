import { describe, it, expect } from "vitest";
import { emitVocabulary } from "@/modules/jsonld/vocabulary";
import { emitContext } from "@/modules/jsonld/context";

describe("emitVocabulary", () => {
  const vocab = emitVocabulary();

  it("is a valid owl:Ontology", () => {
    expect(vocab["@type"]).toBe("owl:Ontology");
    expect(vocab["@id"]).toBe("https://uor.foundation/ontology/uor-v1");
    expect(vocab["owl:versionInfo"]).toBe("1.0.0");
  });

  it("includes dcterms metadata", () => {
    expect(vocab["dcterms:title"]).toContain("UOR");
    expect(vocab["dcterms:creator"]).toBe("UOR Foundation");
  });

  it("every class has rdfs:subClassOf", () => {
    const classes = vocab["@graph"].filter(
      (n) => Array.isArray(n["@type"]) && n["@type"].includes("rdfs:Class")
    );
    expect(classes.length).toBeGreaterThan(10);
    for (const cls of classes) {
      expect(cls).toHaveProperty("rdfs:subClassOf");
    }
  });

  it("every property has rdfs:domain and rdfs:range", () => {
    const props = vocab["@graph"].filter(
      (n) =>
        Array.isArray(n["@type"]) &&
        (n["@type"].includes("rdf:Property") || n["@type"].includes("owl:ObjectProperty") || n["@type"].includes("owl:DatatypeProperty"))
    );
    expect(props.length).toBeGreaterThan(10);
    for (const prop of props) {
      expect(prop).toHaveProperty("rdfs:domain");
      expect(prop).toHaveProperty("rdfs:range");
    }
  });

  it("declares op:neg as involution (owl:inverseOf self)", () => {
    const neg = vocab["@graph"].find((n) => n["@id"] === "op:neg");
    expect(neg).toBeDefined();
    expect(neg!["owl:inverseOf"]).toBe("op:neg");
  });

  it("declares op:bnot as involution (owl:inverseOf self)", () => {
    const bnot = vocab["@graph"].find((n) => n["@id"] === "op:bnot");
    expect(bnot).toBeDefined();
    expect(bnot!["owl:inverseOf"]).toBe("op:bnot");
  });

  it("declares succ as property chain of bnot then neg", () => {
    const succ = vocab["@graph"].find((n) => n["@id"] === "u:succ");
    expect(succ).toBeDefined();
    expect(succ!["owl:propertyChainAxiom"]).toEqual(["op:bnot", "op:neg"]);
  });

  it("maps derivation:Record to prov:Activity", () => {
    const rec = vocab["@graph"].find((n) => n["@id"] === "derivation:Record");
    expect(rec).toBeDefined();
    expect(rec!["rdfs:subClassOf"]).toBe("prov:Activity");
  });

  it("maps trace:ComputationTrace to prov:Activity", () => {
    const tr = vocab["@graph"].find((n) => n["@id"] === "trace:ComputationTrace");
    expect(tr).toBeDefined();
    expect(tr!["rdfs:subClassOf"]).toBe("prov:Activity");
  });

  it("maps cert:DerivationCertificate to prov:Entity", () => {
    const cert = vocab["@graph"].find((n) => n["@id"] === "cert:DerivationCertificate");
    expect(cert).toBeDefined();
    expect(cert!["rdfs:subClassOf"]).toBe("prov:Entity");
  });

  it("partition classes are mutually disjoint", () => {
    const unit = vocab["@graph"].find((n) => n["@id"] === "partition:UnitSet");
    expect(unit).toBeDefined();
    expect(unit!["owl:disjointWith"]).toContain("partition:ExteriorSet");
    expect(unit!["owl:disjointWith"]).toContain("partition:IrreducibleSet");
    expect(unit!["owl:disjointWith"]).toContain("partition:ReducibleSet");
  });

  it("includes AllDisjointClasses axiom for core types", () => {
    const disjoint = vocab["@graph"].find((n) => n["@type"] === "owl:AllDisjointClasses");
    expect(disjoint).toBeDefined();
    expect(disjoint!["owl:members"]).toContain("schema:Datum");
    expect(disjoint!["owl:members"]).toContain("derivation:Record");
  });
});

describe("emitContext W3C prefixes", () => {
  const ctx = emitContext();

  it("has all 7 W3C standard namespace prefixes", () => {
    const w3c = ["rdf", "rdfs", "owl", "skos", "dcterms", "foaf", "prov"];
    for (const ns of w3c) {
      expect(ctx).toHaveProperty(ns);
    }
  });

  it("rdf points to correct IRI", () => {
    expect(ctx.rdf).toBe("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
  });

  it("prov points to correct IRI", () => {
    expect(ctx.prov).toBe("http://www.w3.org/ns/prov#");
  });
});
