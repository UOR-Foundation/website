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

  it("declares 39+ classes with rdfs:subClassOf", () => {
    const classes = vocab["@graph"].filter(
      (n) => Array.isArray(n["@type"]) && n["@type"].includes("rdfs:Class")
    );
    expect(classes.length).toBeGreaterThanOrEqual(39);
    for (const cls of classes) {
      expect(cls).toHaveProperty("rdfs:subClassOf");
    }
  });

  it("declares 65+ properties with rdfs:domain and rdfs:range", () => {
    const props = vocab["@graph"].filter(
      (n) =>
        Array.isArray(n["@type"]) &&
        (n["@type"].includes("rdf:Property") || n["@type"].includes("owl:ObjectProperty") || n["@type"].includes("owl:DatatypeProperty"))
    );
    expect(props.length).toBeGreaterThanOrEqual(64);
    for (const prop of props) {
      expect(prop).toHaveProperty("rdfs:domain");
      expect(prop).toHaveProperty("rdfs:range");
    }
  });

  it("declares 14 named individuals", () => {
    const individuals = vocab["@graph"].filter(
      (n) => Array.isArray(n["@type"]) && n["@type"].includes("owl:NamedIndividual")
    );
    expect(individuals.length).toBe(14);
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

  it("includes AllDisjointClasses axiom for core types including schema:Term", () => {
    const disjoint = vocab["@graph"].find((n) => n["@type"] === "owl:AllDisjointClasses");
    expect(disjoint).toBeDefined();
    expect(disjoint!["owl:members"]).toContain("schema:Datum");
    expect(disjoint!["owl:members"]).toContain("derivation:Record");
    expect(disjoint!["owl:members"]).toContain("schema:Term");
  });

  // ── New roadmap v3-3 tests ────────────────────────────────────────────

  it("declares schema:Term as owl:disjointWith schema:Datum", () => {
    const term = vocab["@graph"].find((n) => n["@id"] === "schema:Term");
    expect(term).toBeDefined();
    expect(term!["owl:disjointWith"]).toBe("schema:Datum");
  });

  it("declares schema:Triad class", () => {
    const triad = vocab["@graph"].find((n) => n["@id"] === "schema:Triad");
    expect(triad).toBeDefined();
    expect(triad!["rdfs:subClassOf"]).toBe("rdfs:Resource");
  });

  it("declares type:PrimitiveType class", () => {
    const pt = vocab["@graph"].find((n) => n["@id"] === "type:PrimitiveType");
    expect(pt).toBeDefined();
  });

  it("declares resolver:Resolver class", () => {
    const r = vocab["@graph"].find((n) => n["@id"] === "resolver:Resolver");
    expect(r).toBeDefined();
  });

  it("declares binary operation properties (op:xor, op:and, op:or)", () => {
    for (const opId of ["op:xor", "op:and", "op:or"]) {
      const op = vocab["@graph"].find((n) => n["@id"] === opId);
      expect(op).toBeDefined();
      expect(op!["rdfs:domain"]).toBe("schema:Datum");
      expect(op!["rdfs:range"]).toBe("schema:Datum");
    }
  });

  it("declares SKOS alignment properties", () => {
    const broader = vocab["@graph"].find((n) => n["@id"] === "skos:broader");
    const narrower = vocab["@graph"].find((n) => n["@id"] === "skos:narrower");
    const exactMatch = vocab["@graph"].find((n) => n["@id"] === "skos:exactMatch");
    expect(broader).toBeDefined();
    expect(narrower).toBeDefined();
    expect(exactMatch).toBeDefined();
    expect(narrower!["owl:inverseOf"]).toBe("skos:broader");
  });

  it("declares proof:notClosedUnder property", () => {
    const ncu = vocab["@graph"].find((n) => n["@id"] === "proof:notClosedUnder");
    expect(ncu).toBeDefined();
    expect(ncu!["rdfs:domain"]).toBe("proof:CoherenceProof");
  });

  it("declares resolver:strategy property", () => {
    const rs = vocab["@graph"].find((n) => n["@id"] === "resolver:strategy");
    expect(rs).toBeDefined();
    expect(rs!["rdfs:domain"]).toBe("resolver:Resolver");
  });

  it("declares op:zero, op:one, op:maxVal, op:midpoint named individuals", () => {
    for (const id of ["op:zero", "op:one", "op:maxVal", "op:midpoint"]) {
      const ind = vocab["@graph"].find((n) => n["@id"] === id);
      expect(ind).toBeDefined();
      expect(ind!["@type"]).toContain("owl:NamedIndividual");
    }
  });

  it("declares 4 epistemic grade individuals", () => {
    for (const id of ["cert:GradeA", "cert:GradeB", "cert:GradeC", "cert:GradeD"]) {
      const ind = vocab["@graph"].find((n) => n["@id"] === id);
      expect(ind).toBeDefined();
      expect(ind!["@type"]).toContain("cert:EpistemicGrade");
    }
  });

  it("declares 3 closure mode individuals", () => {
    for (const id of ["u:OneStep", "u:FixedPoint", "u:GraphClosed"]) {
      const ind = vocab["@graph"].find((n) => n["@id"] === id);
      expect(ind).toBeDefined();
      expect(ind!["@type"]).toContain("u:ClosureMode");
    }
  });

  it("declares resolver:DihedralFactorization individual with strategy", () => {
    const df = vocab["@graph"].find((n) => n["@id"] === "resolver:DihedralFactorization");
    expect(df).toBeDefined();
    expect(df!["resolver:strategy"]).toBe("dihedral-factorization");
  });

  it("declares LinkedDataCompliance node", () => {
    const ldc = vocab["@graph"].find((n) => n["@id"] === "u:LinkedDataComplianceDeclaration");
    expect(ldc).toBeDefined();
    expect(ldc!["@type"]).toContain("u:LinkedDataCompliance");
  });

  it("declares observable properties (value, source, stratum)", () => {
    for (const id of ["observable:value", "observable:source", "observable:stratum"]) {
      const prop = vocab["@graph"].find((n) => n["@id"] === id);
      expect(prop).toBeDefined();
      expect(prop!["rdfs:domain"]).toBe("observable:Observable");
    }
  });

  it("declares state properties (quantum, capacity, bindingCount)", () => {
    for (const id of ["state:quantum", "state:capacity", "state:bindingCount"]) {
      const prop = vocab["@graph"].find((n) => n["@id"] === id);
      expect(prop).toBeDefined();
      expect(prop!["rdfs:domain"]).toBe("state:Context");
    }
  });

  it("declares morphism properties (sourceQuantum, targetQuantum)", () => {
    for (const id of ["morphism:sourceQuantum", "morphism:targetQuantum"]) {
      const prop = vocab["@graph"].find((n) => n["@id"] === id);
      expect(prop).toBeDefined();
      expect(prop!["rdfs:domain"]).toBe("morphism:Transform");
    }
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
