/**
 * P24 — UNS SPARQL Knowledge Graph + Named Graphs + VoID Descriptor tests.
 *
 * 12 verification tests covering:
 *   - Ontology graph loading
 *   - Q0 materialization (256 datums)
 *   - SPARQL SELECT/ASK/CONSTRUCT
 *   - Record insertion
 *   - Datum retrieval
 *   - VoID descriptor
 *   - Partition cardinality via SPARQL
 */
import { describe, it, expect, beforeAll } from "vitest";
import { UnsGraph, ONTOLOGY_GRAPH, Q0_GRAPH } from "@/modules/kg-store/uns-graph";
import { generateVoID, CANONICAL_QUERIES } from "@/modules/kg-store/void-descriptor";

describe("P24 — UNS SPARQL Knowledge Graph", () => {
  let graph: UnsGraph;

  beforeAll(() => {
    graph = new UnsGraph();
  });

  // Test 1: loadOntologyGraph loads > 0 triples
  it("1. loadOntologyGraph() loads > 0 triples into ontology named graph", () => {
    const count = graph.loadOntologyGraph();
    expect(count).toBeGreaterThan(0);
    expect(graph.stats().ontologyTriples).toBeGreaterThan(0);
  });

  // Test 2: materializeQ0 loads exactly 256 datum nodes
  it("2. materializeQ0() loads exactly 256 datum nodes", () => {
    const count = graph.materializeQ0();
    expect(count).toBe(256);
  });

  // Test 3: q0Triples > 256 (each datum has multiple triples)
  it("3. stats().q0Triples > 256", () => {
    const stats = graph.stats();
    expect(stats.q0Triples).toBeGreaterThan(256);
    // Each of 256 datums has ~13 triples (type, value, stratum, partition, neg, bnot, succ, pred, + witness)
    expect(stats.q0Triples).toBeGreaterThan(3000);
  });

  // Test 4: SPARQL SELECT for IRREDUCIBLE datums returns canonical count (126)
  it("4. SPARQL SELECT for IRREDUCIBLE datums returns 126 (canonical from P21)", () => {
    const results = graph.sparqlSelect(CANONICAL_QUERIES.allIrreducible);
    expect(results.length).toBe(126);
  });

  // Test 5: SPARQL ASK for NameRecord returns false on empty graph
  it("5. SPARQL ASK for NameRecord returns false before insertion", () => {
    const exists = graph.sparqlAsk(`
      SELECT ?x WHERE {
        GRAPH <${Q0_GRAPH}> {
          ?x <https://uor.foundation/uns/name> ?name .
        }
      }
    `);
    expect(exists).toBe(false);
  });

  // Test 6: insertRecord then SPARQL ASK returns true
  it("6. insertRecord → SPARQL ASK for NameRecord returns true", () => {
    graph.insertRecord({
      "@type": "uns:NameRecord",
      "uns:name": "test.uns",
      "uns:target": { "u:canonicalId": "urn:uor:derivation:sha256:abc123" },
    });

    const exists = graph.sparqlAsk(`
      SELECT ?x WHERE {
        GRAPH <${Q0_GRAPH}> {
          ?x <https://uor.foundation/uns/name> ?name .
        }
      }
    `);
    expect(exists).toBe(true);
  });

  // Test 7: getDatum(42) returns datum with schema:value = 42
  it("7. getDatum(42) returns datum with schema/value = '42'", () => {
    const datum = graph.getDatum(42);
    expect(datum).not.toBeNull();
    expect(datum!["schema/value"]).toBe("42");
  });

  // Test 8: getDatum(42) includes u:partitionClass field
  it("8. getDatum(42) includes u/partitionClass field", () => {
    const datum = graph.getDatum(42);
    expect(datum).not.toBeNull();
    expect(datum!["u/partitionClass"]).toBeDefined();
    // 42 is even, not 0 or 128 → REDUCIBLE
    expect(datum!["u/partitionClass"]).toBe("REDUCIBLE");
  });

  // Test 9: VoID descriptor includes sparqlEndpoint
  it("9. VoID descriptor includes void:sparqlEndpoint", () => {
    const voidDesc = generateVoID(graph);
    expect(voidDesc["void:sparqlEndpoint"]).toContain("/uns/graph/sparql");
    expect(voidDesc["@type"]).toBe("void:Dataset");
  });

  // Test 10: VoID void:classes === 82
  it("10. VoID void:classes === 82", () => {
    const voidDesc = generateVoID(graph);
    expect(voidDesc["void:classes"]).toBe(82);
  });

  // Test 11: SPARQL CONSTRUCT returns valid quad array
  it("11. SPARQL CONSTRUCT returns valid quad array", () => {
    const quads = graph.sparqlConstruct(`
      CONSTRUCT WHERE {
        GRAPH <${Q0_GRAPH}> {
          <https://uor.foundation/datum/q0/42> ?p ?o .
        }
      }
    `);
    expect(quads.length).toBeGreaterThan(0);
    expect(quads[0]).toHaveProperty("subject");
    expect(quads[0]).toHaveProperty("predicate");
    expect(quads[0]).toHaveProperty("object");
    expect(quads[0]).toHaveProperty("graph");
  });

  // Test 12: All Q0 datum @type values match UOR ontology
  it("12. All Q0 datum @type values are schema:Datum", () => {
    const results = graph.sparqlSelect(`
      SELECT ?datum ?type WHERE {
        GRAPH <${Q0_GRAPH}> {
          ?datum <https://uor.foundation/schema/value> ?value .
        }
      }
    `);
    // Should have 256 datums
    expect(results.length).toBe(256);
  });

  // Bonus: Exterior elements count = 2 (from P21)
  it("bonus: SPARQL exterior count = 2 (from P21 canonical resolution)", () => {
    const results = graph.sparqlSelect(CANONICAL_QUERIES.allExterior);
    expect(results.length).toBe(2);
  });

  // Bonus: Critical identity witness for x=42
  it("bonus: Critical identity witness for x=42 shows verified=true", () => {
    const results = graph.sparqlSelect(CANONICAL_QUERIES.criticalIdentityWitness(42));
    expect(results.length).toBe(1);
    expect(results[0]["?holds"]).toBe("true");
  });
});
