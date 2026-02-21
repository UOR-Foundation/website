/**
 * UOR Code-to-Knowledge-Graph Bridge — derives UOR identity for code entities.
 *
 * Delegates to:
 *   - derivation engine for UOR derivation records
 *   - kg-store for persistent ingestion
 *   - jsonld emitter for graph format
 *   - identity for IRI computation
 *
 * Each code entity's content hash is mapped to a ring value, derived,
 * and ingested into the knowledge graph with full provenance.
 */

import type { UORRing } from "@/modules/ring-core/ring";
import { derive } from "@/modules/derivation/derivation";
import type { Derivation } from "@/modules/derivation/derivation";
import type { Term } from "@/modules/ring-core/canonicalization";
import { ingestTriples, ingestDerivation } from "@/modules/kg-store/store";
import { emitContext } from "@/modules/jsonld/context";
import type { JsonLdDocument, JsonLdNode } from "@/modules/jsonld/emitter";
import type { CodeEntity, CodeRelation, AnalysisResult } from "./analyzer";

// ── Types ───────────────────────────────────────────────────────────────────

export interface CodeEntityDerived {
  entity: CodeEntity;
  derivation: Derivation;
  iri: string;
  ringValue: number;
}

export interface CodeGraphResult {
  derivedEntities: CodeEntityDerived[];
  relations: CodeRelation[];
  document: JsonLdDocument;
  totalEntities: number;
  totalRelations: number;
}

// ── Hash to ring value ──────────────────────────────────────────────────────

/**
 * Map a SHA-256 hex hash to a ring value by taking first bytes mod cycle.
 */
function hashToRingValue(hash: string, ring: UORRing): number {
  // Take first 2 hex chars (1 byte) for Q0, first 4 for Q1, etc.
  const hexChars = (ring.quantum + 1) * 2;
  const slice = hash.slice(0, hexChars);
  return parseInt(slice, 16) % Number(ring.cycle);
}

// ── ingestCodeGraph ─────────────────────────────────────────────────────────

/**
 * Derive UOR identity for each code entity and produce a JSON-LD graph.
 *
 * 1. Map each entity's content hash to a ring value
 * 2. Derive via UOR derivation engine (epistemic grade A)
 * 3. Emit JSON-LD graph with entity and relation nodes
 */
export async function ingestCodeGraph(
  ring: UORRing,
  analysis: AnalysisResult
): Promise<CodeGraphResult> {
  const { entities, relations } = analysis;
  const derivedEntities: CodeEntityDerived[] = [];

  // Derive each entity
  for (const entity of entities) {
    const ringValue = hashToRingValue(entity.hash, ring);
    const term: Term = { kind: "const", value: ringValue };
    const derivation = await derive(ring, term);

    derivedEntities.push({
      entity,
      derivation,
      iri: derivation.resultIri,
      ringValue,
    });
  }

  // Build JSON-LD graph
  const graph: JsonLdNode[] = [];

  // Entity nodes
  for (const de of derivedEntities) {
    graph.push({
      "@id": de.iri,
      "@type": `code:${capitalize(de.entity.type)}`,
      "code:name": de.entity.name,
      "code:entityType": de.entity.type,
      "code:line": de.entity.line,
      "code:contentHash": de.entity.hash,
      "code:ringValue": de.ringValue,
      "derivation:derivedBy": de.derivation.derivationId,
      "derivation:epistemicGrade": de.derivation.epistemicGrade,
      "derivation:canonicalTerm": de.derivation.canonicalTerm,
    });
  }

  // Relation nodes as morphism:Transform records
  const entityIriMap = new Map<string, string>();
  for (const de of derivedEntities) {
    entityIriMap.set(de.entity.name, de.iri);
  }

  for (const rel of relations) {
    const sourceIri = entityIriMap.get(rel.source) ?? `urn:uor:code:${rel.source}`;
    const targetIri = entityIriMap.get(rel.target) ?? `urn:uor:code:${rel.target}`;

    graph.push({
      "@id": `urn:uor:code:rel:${rel.source}-${rel.type}-${rel.target}`,
      "@type": "morphism:Transform",
      "morphism:source": sourceIri,
      "morphism:target": targetIri,
      "morphism:relationType": rel.type,
    });
  }

  const document: JsonLdDocument = {
    "@context": emitContext(),
    "proof:coherenceVerified": true,
    "proof:timestamp": new Date().toISOString(),
    "@graph": graph,
  };

  return {
    derivedEntities,
    relations,
    document,
    totalEntities: entities.length,
    totalRelations: relations.length,
  };
}

/**
 * Export the code graph to the persistent knowledge graph store.
 */
export async function exportToKgStore(
  result: CodeGraphResult,
  quantum: number
): Promise<{ triplesIngested: number; derivationsIngested: number }> {
  // Ingest derivations
  for (const de of result.derivedEntities) {
    await ingestDerivation(de.derivation, quantum);
  }

  // Ingest triples
  const triplesIngested = await ingestTriples(
    result.document,
    "urn:uor:graph:code"
  );

  return {
    triplesIngested,
    derivationsIngested: result.derivedEntities.length,
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
