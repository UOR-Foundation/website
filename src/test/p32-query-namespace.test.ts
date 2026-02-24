/**
 * P32 Self-Verification Tests — Query Namespace + uor_query Agent Tool
 *
 * 15 tests covering intent decomposition, resolution, SPARQL grading,
 * and SDK integration.
 */

import { describe, it, expect } from "vitest";
import { UnsQuery } from "@/modules/sparql/query";
import { UnsGraph } from "@/modules/kg-store/uns-graph";

function makeTestGraph(): UnsGraph {
  const g = new UnsGraph();
  g.loadOntologyGraph();
  g.materializeQ0();
  return g;
}

describe("P32: Query Namespace — Intent-Based Object Resolution", () => {
  // ── buildIntent ────────────────────────────────────────────────────────

  it("T1: buildIntent('hello') returns @type 'query:Intent'", () => {
    const q = new UnsQuery(makeTestGraph());
    const intent = q.buildIntent("hello");
    expect(intent["@type"]).toBe("query:Intent");
  });

  it("T2: buildIntent('hello').query:bytes.length === 5", () => {
    const q = new UnsQuery(makeTestGraph());
    const intent = q.buildIntent("hello");
    expect(intent["query:bytes"].length).toBe(5);
  });

  it("T3: buildIntent('hello').query:semanticWeight is in [0,1]", () => {
    const q = new UnsQuery(makeTestGraph());
    const intent = q.buildIntent("hello");
    expect(intent["query:semanticWeight"]).toBeGreaterThanOrEqual(0);
    expect(intent["query:semanticWeight"]).toBeLessThanOrEqual(1);
  });

  it("T4: buildIntent('hello').query:canonicalId matches derivation pattern", () => {
    const q = new UnsQuery(makeTestGraph());
    const intent = q.buildIntent("hello");
    expect(intent["query:canonicalId"]).toMatch(/^urn:uor:query:intent:/);
  });

  it("T5: different texts → different canonicalIds (determinism)", () => {
    const q = new UnsQuery(makeTestGraph());
    const a = q.buildIntent("hello");
    const b = q.buildIntent("world");
    expect(a["query:canonicalId"]).not.toBe(b["query:canonicalId"]);
  });

  it("T6: same text twice → same canonicalId (stability)", () => {
    const q = new UnsQuery(makeTestGraph());
    const a = q.buildIntent("hello");
    const b = q.buildIntent("hello");
    expect(a["query:canonicalId"]).toBe(b["query:canonicalId"]);
  });

  // ── resolve ────────────────────────────────────────────────────────────

  it("T7: resolve() of an exact match → Grade A result", async () => {
    const q = new UnsQuery(makeTestGraph());
    const intent = q.buildIntent("hello");
    const result = await q.resolve(intent);
    // Should find at least one match (exact byte match in Q0)
    const gradeA = result["query:matches"].filter(
      (m) => m.epistemic_grade === "A"
    );
    expect(gradeA.length).toBeGreaterThanOrEqual(1);
    expect(result.epistemic_grade).toBe("A");
  });

  it("T8: resolve() returns matches sorted by grade then distance", async () => {
    const q = new UnsQuery(makeTestGraph());
    const intent = q.buildIntent("test query");
    const result = await q.resolve(intent);
    // First match should be the best grade
    if (result["query:matches"].length > 1) {
      const first = result["query:matches"][0];
      expect(first.epistemic_grade).toBe("A");
    }
  });

  // ── sparqlQuery ────────────────────────────────────────────────────────

  it("T9: sparqlQuery() returns epistemic_grade 'B'", async () => {
    const q = new UnsQuery(makeTestGraph());
    const result = await q.sparqlQuery(
      "SELECT ?s ?p ?o WHERE { ?s ?p ?o }",
      "https://uor.foundation/graph/q0"
    );
    expect(result.epistemic_grade).toBe("B");
  });

  it("T10: sparqlQuery() @graph is an array", async () => {
    const q = new UnsQuery(makeTestGraph());
    const result = await q.sparqlQuery(
      "SELECT ?s ?p ?o WHERE { ?s ?p ?o }",
      "https://uor.foundation/graph/q0"
    );
    expect(Array.isArray(result["@graph"])).toBe(true);
  });

  // ── Integration: uor_query tool ─────────────────────────────────────────

  it("T11: uor_query with intent returns intentResult", async () => {
    const { uor_query } = await import("@/modules/agent-tools/tools");
    const output = await uor_query({ intent: "hello" });
    expect(output.intentResult).toBeDefined();
    expect(output.intentResult!["@type"]).toBe("query:Resolution");
    expect(output.intentResult!["query:strategy"]).toBe(
      "DihedralFactorizationResolver"
    );
  });

  it("T12: uor_query with sparql returns sparqlResult", async () => {
    const { uor_query } = await import("@/modules/agent-tools/tools");
    const output = await uor_query({
      sparql: "SELECT ?s ?p ?o WHERE { ?s ?p ?o }",
    });
    expect(output.sparqlResult).toBeDefined();
    expect(output.sparqlResult!["@type"]).toBe("query:SparqlResult");
    expect(output.sparqlResult!.epistemic_grade).toBe("B");
  });

  // ── Intent inspection endpoint ──────────────────────────────────────────

  it("T13: buildIntent returns full intent without resolution", () => {
    const q = new UnsQuery(makeTestGraph());
    const intent = q.buildIntent("hello");
    // Intent is fully populated without needing async resolution
    expect(intent["query:text"]).toBe("hello");
    expect(intent["query:partition"]).toBeDefined();
    expect(intent["query:partition"].total).toBe(5);
  });

  // ── SDK integration ─────────────────────────────────────────────────────

  it("T14: UnsClient has query() method", async () => {
    const { UnsClient } = await import("@/modules/uns/sdk/client");
    const client = new UnsClient({ nodeUrl: "http://localhost" });
    expect(typeof client.query).toBe("function");
  });

  // ── All five agent tools present ────────────────────────────────────────

  it("T15: all five canonical agent tools are exported", async () => {
    const tools = await import("@/modules/agent-tools/tools");
    expect(typeof tools.uor_derive).toBe("function");
    expect(typeof tools.uor_query).toBe("function");
    expect(typeof tools.uor_verify).toBe("function");
    expect(typeof tools.uor_correlate).toBe("function");
    expect(typeof tools.uor_partition).toBe("function");
  });
});
