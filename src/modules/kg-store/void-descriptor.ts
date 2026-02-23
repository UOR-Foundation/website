/**
 * UNS Knowledge Graph — VoID Dataset Descriptor.
 *
 * Generates a W3C VoID (Vocabulary of Interlinked Datasets) descriptor
 * for the UNS knowledge graph, enabling Linked Open Data discoverability.
 *
 * @see https://www.w3.org/TR/void/ — VoID specification
 * @see .well-known/uor.json — UNS graph configuration
 */

import type { UnsGraph } from "./uns-graph";

// ── VoID Descriptor ────────────────────────────────────────────────────────

export interface VoIDDescriptor {
  "@context": string;
  "@type": "void:Dataset";
  "void:sparqlEndpoint": string;
  "void:dataDump": string;
  "void:triples": number;
  "void:classes": number;
  "void:properties": number;
  "void:distinctSubjects": number;
  "dc:title": string;
  "dc:description": string;
  "dc:license": string;
  "dc:created": string;
  "void:vocabulary": string[];
}

/**
 * Generate a VoID dataset descriptor for a UnsGraph instance.
 *
 * The descriptor makes the UNS knowledge graph discoverable by
 * the Linked Open Data cloud and SPARQL federation engines.
 *
 * @param graph       The UnsGraph instance
 * @param baseUrl     Base URL for the SPARQL endpoint (default: local)
 * @returns           VoID descriptor object
 */
export function generateVoID(
  graph: UnsGraph,
  baseUrl: string = "http://localhost:8080"
): VoIDDescriptor {
  const stats = graph.stats();

  return {
    "@context": "https://www.w3.org/ns/void#",
    "@type": "void:Dataset",
    "void:sparqlEndpoint": `${baseUrl}/uns/graph/sparql`,
    "void:dataDump": `${baseUrl}/uns/graph/q0.jsonld`,
    "void:triples": stats.totalTriples,
    "void:classes": 82,
    "void:properties": 124,
    "void:distinctSubjects": 256 + Math.floor(stats.ontologyTriples / 2),
    "dc:title": "UNS Platform Knowledge Graph — Q0",
    "dc:description": "Complete materialization of the Z/256Z ring with partition classification, critical identity witnesses, and UNS name records.",
    "dc:license": "https://www.apache.org/licenses/LICENSE-2.0",
    "dc:created": new Date().toISOString(),
    "void:vocabulary": [
      "https://uor.foundation/contexts/uor-v1.jsonld",
      "https://uor.foundation/contexts/uns-v1.jsonld",
      "https://www.w3.org/2000/01/rdf-schema#",
      "https://www.w3.org/2002/07/owl#",
      "https://www.w3.org/ns/prov#",
    ],
  };
}

// ── Canonical SPARQL Queries ───────────────────────────────────────────────

/**
 * Pre-defined canonical SPARQL queries for the UNS knowledge graph.
 * These are the standard queries that agents and clients should use.
 */
export const CANONICAL_QUERIES = {
  /** All irreducible elements in Q0. */
  allIrreducible: `
    SELECT ?datum ?value WHERE {
      GRAPH <https://uor.foundation/graph/q0> {
        ?datum <https://uor.foundation/u/partitionClass> "IRREDUCIBLE" .
        ?datum <https://uor.foundation/schema/value> ?value .
      }
    }
  `.trim(),

  /** Critical identity witness for a specific element. */
  criticalIdentityWitness: (x: number) => `
    SELECT ?neg_bnot_x ?succ_x ?holds WHERE {
      GRAPH <https://uor.foundation/graph/q0> {
        <https://uor.foundation/proof/critical-identity/x${x}> <https://uor.foundation/proof/neg_bnot_x> ?neg_bnot_x .
        <https://uor.foundation/proof/critical-identity/x${x}> <https://uor.foundation/proof/succ_x> ?succ_x .
        <https://uor.foundation/proof/critical-identity/x${x}> <https://uor.foundation/proof/verified> ?holds .
      }
    }
  `.trim(),

  /** All UNS NameRecords in the graph. */
  allNameRecords: `
    SELECT ?record ?name ?target WHERE {
      GRAPH <https://uor.foundation/graph/q0> {
        ?record <https://uor.foundation/uns/name> ?name .
        ?record <https://uor.foundation/uns/target> ?target .
      }
    }
  `.trim(),

  /** All exterior elements. */
  allExterior: `
    SELECT ?datum ?value WHERE {
      GRAPH <https://uor.foundation/graph/q0> {
        ?datum <https://uor.foundation/u/partitionClass> "EXTERIOR" .
        ?datum <https://uor.foundation/schema/value> ?value .
      }
    }
  `.trim(),

  /** Graph statistics. */
  tripleCount: `
    SELECT ?s ?p ?o WHERE {
      GRAPH <https://uor.foundation/graph/q0> {
        ?s ?p ?o .
      }
    }
  `.trim(),
} as const;
