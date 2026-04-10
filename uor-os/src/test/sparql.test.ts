import { describe, it, expect } from "vitest";
import { parseSparql } from "@/modules/sparql/parser";

describe("parseSparql", () => {
  it("parses basic SELECT * WHERE { ?s ?p ?o }", () => {
    const r = parseSparql("SELECT * WHERE { ?s ?p ?o }");
    expect(r.variables).toEqual(["?s", "?p", "?o"]);
    expect(r.patterns).toHaveLength(1);
    expect(r.patterns[0].subject.kind).toBe("variable");
  });

  it("parses fixed subject IRI", () => {
    const r = parseSparql("SELECT ?s ?p ?o WHERE { <https://example.com/1> ?p ?o }");
    expect(r.patterns[0].subject.kind).toBe("iri");
    expect(r.patterns[0].subject.value).toBe("https://example.com/1");
  });

  it("parses LIMIT and OFFSET", () => {
    const r = parseSparql("SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 20 OFFSET 10");
    expect(r.limit).toBe(20);
    expect(r.offset).toBe(10);
  });

  it("parses FILTER clause", () => {
    const r = parseSparql('SELECT ?s ?p ?o WHERE { ?s ?p ?o . FILTER(?o = "42") }');
    expect(r.filters).toHaveLength(1);
    expect(r.filters[0].variable).toBe("?o");
    expect(r.filters[0].operator).toBe("=");
    expect(r.filters[0].value).toBe("42");
  });

  it("parses PREFIX declarations", () => {
    const r = parseSparql("PREFIX schema: <https://schema.org/> SELECT ?s ?p ?o WHERE { ?s schema:name ?o }");
    expect(r.prefixes).toHaveLength(1);
    expect(r.patterns[0].predicate.kind).toBe("iri");
    expect(r.patterns[0].predicate.value).toBe("https://schema.org/name");
  });

  it("parses literal object", () => {
    const r = parseSparql('SELECT ?s ?p ?o WHERE { ?s ?p "hello" }');
    expect(r.patterns[0].object.kind).toBe("literal");
    expect(r.patterns[0].object.value).toBe("hello");
  });

  it("handles multiple patterns", () => {
    const r = parseSparql("SELECT ?s ?p ?o WHERE { ?s ?p ?o . <urn:a> ?p ?o }");
    expect(r.patterns).toHaveLength(2);
    expect(r.patterns[1].subject.kind).toBe("iri");
  });
});
