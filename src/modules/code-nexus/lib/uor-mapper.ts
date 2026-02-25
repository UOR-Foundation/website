/**
 * Code Nexus — UOR Mapper
 * ═══════════════════════
 *
 * Maps ingestion results to UOR-compliant triples and derivations.
 * Uses singleProofHash for canonical identity generation.
 */

import { singleProofHash } from "@/lib/uor-canonical";
import type { SingleProofResult } from "@/lib/uor-canonical";
import type { IngestionResult } from "./ingestion";
import type { CodeEntity, CodeRelation } from "@/modules/code-kg/analyzer";

// ── Types ───────────────────────────────────────────────────────────────────

export interface MappedEntity {
  entity: CodeEntity;
  proof: SingleProofResult;
  iri: string;
}

export interface MappedTriple {
  subject: string;
  predicate: string;
  object: string;
  graph_iri: string;
}

export interface UorMappingResult {
  sessionProof: SingleProofResult;
  mappedEntities: MappedEntity[];
  triples: MappedTriple[];
  repoName: string;
}

// ── Predicate vocabulary ────────────────────────────────────────────────────

const PREDICATES: Record<string, string> = {
  imports: "uor:pred:imports",
  calls: "uor:pred:invokes",
  extends: "uor:pred:extends",
  implements: "uor:pred:implements",
  exports: "uor:pred:exports",
};

// ── Mapper ──────────────────────────────────────────────────────────────────

/**
 * Map an IngestionResult into UOR-compliant entities and triples.
 * Every entity is content-addressed via singleProofHash (URDNA2015 pipeline).
 */
export async function mapToUor(
  result: IngestionResult,
  onProgress?: (msg: string) => void
): Promise<UorMappingResult> {
  onProgress?.("Computing session identity…");

  // Session-level proof from the full ingestion fingerprint
  const sessionProof = await singleProofHash({
    "@context": { "code-nexus": "https://uor.foundation/lens/code-nexus/" },
    "@type": "code-nexus:Session",
    "code-nexus:repo": result.repoName,
    "code-nexus:entityCount": result.entities.length,
    "code-nexus:relationCount": result.relations.length,
    "code-nexus:totalLines": result.totalLines,
    "code-nexus:fileCount": result.files.length,
  });

  const graphIri = `urn:uor:lens:code-nexus:${sessionProof.cid}`;

  onProgress?.("Deriving entity identities…");

  // Map entities
  const mappedEntities: MappedEntity[] = [];
  const iriMap = new Map<string, string>();

  for (const entity of result.entities) {
    const proof = await singleProofHash({
      "@context": { "code": "https://uor.foundation/lens/code-nexus/entity/" },
      "@type": `code:${entity.type}`,
      "code:name": entity.name,
      "code:content": entity.content,
      "code:hash": entity.hash,
    });

    const iri = `urn:uor:code:${sessionProof.cid}:${entity.type}:${encodeURIComponent(entity.name)}`;
    iriMap.set(entity.name, iri);
    mappedEntities.push({ entity, proof, iri });
  }

  onProgress?.("Generating triples…");

  // Map relations to triples
  const triples: MappedTriple[] = [];

  for (const rel of result.relations) {
    const subjectIri = iriMap.get(rel.source) ?? `urn:uor:code:${sessionProof.cid}:ref:${encodeURIComponent(rel.source)}`;
    const objectIri = iriMap.get(rel.target) ?? `urn:uor:code:${sessionProof.cid}:ref:${encodeURIComponent(rel.target)}`;
    const predicate = PREDICATES[rel.type] ?? `uor:pred:${rel.type}`;

    triples.push({
      subject: subjectIri,
      predicate,
      object: objectIri,
      graph_iri: graphIri,
    });
  }

  return {
    sessionProof,
    mappedEntities,
    triples,
    repoName: result.repoName,
  };
}
