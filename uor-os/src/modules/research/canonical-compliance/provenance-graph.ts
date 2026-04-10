/**
 * Canonical Compliance — Knowledge Graph Projection
 * ═════════════════════════════════════════════════════════════════
 *
 * Ingests the provenance map into the knowledge graph as triples,
 * making the entire atom → module derivation tree navigable
 * in the Sovereign Graph Explorer.
 *
 * @version 1.0.0
 */

import { ALL_ATOMS } from "./atoms";
import { PROVENANCE_REGISTRY } from "./provenance-map";

// ── Triple Types ────────────────────────────────────────────────

export interface ProvenanceTriple {
  subject: string;
  predicate: string;
  object: string;
}

// ── Graph Projection ────────────────────────────────────────────

/**
 * Generate the complete set of provenance triples for KG ingestion.
 *
 * Node types:
 *   - uor:Atom           — each UOR primitive
 *   - uor:Module          — each registered module
 *   - uor:DerivedExport   — each exported function/class
 *
 * Edge predicates:
 *   - uor:derivedFrom     — export → atom
 *   - uor:belongsTo       — export → module
 *   - uor:hasCategory     — atom → category
 *   - uor:pipeline        — export → pipeline description
 */
export function buildProvenanceTriples(): ProvenanceTriple[] {
  const triples: ProvenanceTriple[] = [];

  // 1. Atom nodes with categories
  for (const atom of ALL_ATOMS) {
    triples.push({
      subject: atom.id,
      predicate: "rdf:type",
      object: "uor:Atom",
    });
    triples.push({
      subject: atom.id,
      predicate: "uor:hasCategory",
      object: `uor:${atom.category}`,
    });
    triples.push({
      subject: atom.id,
      predicate: "rdfs:label",
      object: atom.label,
    });
  }

  // 2. Module and export nodes with derivation edges
  for (const mod of PROVENANCE_REGISTRY) {
    const moduleUri = `uor:module/${mod.module}`;

    triples.push({
      subject: moduleUri,
      predicate: "rdf:type",
      object: "uor:Module",
    });
    triples.push({
      subject: moduleUri,
      predicate: "rdfs:comment",
      object: mod.description,
    });

    for (const exp of mod.exports) {
      const exportUri = `uor:export/${mod.module}/${exp.export}`;

      triples.push({
        subject: exportUri,
        predicate: "rdf:type",
        object: "uor:DerivedExport",
      });
      triples.push({
        subject: exportUri,
        predicate: "uor:belongsTo",
        object: moduleUri,
      });
      triples.push({
        subject: exportUri,
        predicate: "uor:pipeline",
        object: exp.pipeline,
      });

      for (const atomId of exp.atoms) {
        triples.push({
          subject: exportUri,
          predicate: "uor:derivedFrom",
          object: atomId,
        });
      }
    }
  }

  return triples;
}

/**
 * Returns adjacency list for visualization.
 * Keys are node IDs, values are arrays of { target, predicate }.
 */
export function buildProvenanceAdjacency(): Map<string, { target: string; predicate: string }[]> {
  const adj = new Map<string, { target: string; predicate: string }[]>();
  const triples = buildProvenanceTriples();

  for (const t of triples) {
    if (!adj.has(t.subject)) adj.set(t.subject, []);
    adj.get(t.subject)!.push({ target: t.object, predicate: t.predicate });
  }

  return adj;
}
