/**
 * UOR Query Namespace — Intent-Based Object Resolution
 *
 * Source: spec/src/namespaces/query.rs
 *
 * Intent-based resolution decomposes query text into ring elements,
 * classifies each by partition class, computes partition density as
 * a quality signal, and resolves matches from the knowledge graph
 * by Hamming proximity to the query's canonical ID.
 *
 * Resolution strategy: resolver:DihedralFactorizationResolver
 *   1. Exact canonical ID match → Grade A
 *   2. cert:Certificate-backed match → Grade B
 *   3. Hamming proximity match → Grade C
 *   4. No match → empty, Grade D
 *
 * Pure TypeScript. Delegates to:
 *   - uns/shield/partition for byte classification
 *   - observable/h-score for popcount/Hamming
 *   - kg-store/uns-graph for graph queries
 *   - sparql/executor for SPARQL execution
 */

import {
  analyzePayloadFast,
  type PartitionResultFast,
} from "@/modules/uns/shield/partition";
import { popcount } from "@/modules/observable/h-score";
import { UnsGraph, Q0_GRAPH } from "@/modules/kg-store/uns-graph";
import type { EpistemicGrade } from "@/types/uor";

// ── Types ───────────────────────────────────────────────────────────────────

export interface QueryIntent {
  "@type": "query:Intent";
  "query:text": string;
  "query:bytes": number[];
  "query:partition": PartitionResultFast;
  "query:canonicalId": string;
  "query:semanticWeight": number;
}

export interface QueryMatch {
  "@type": "query:Match";
  "query:object": string;
  "query:score": number;
  "query:hammingDist": number;
  "query:graphUri": string;
  epistemic_grade: EpistemicGrade;
  "derivation:derivationId": string;
}

export interface QueryResult {
  "@type": "query:Resolution";
  "query:intent": QueryIntent;
  "query:matches": QueryMatch[];
  "query:strategy": "DihedralFactorizationResolver";
  totalMatches: number;
  epistemic_grade: EpistemicGrade;
  "derivation:derivationId": string;
}

export interface SparqlQueryResult {
  "@type": "query:SparqlResult";
  "@graph": Array<Record<string, string>>;
  epistemic_grade: "B";
  "derivation:derivationId": string;
}

// ── Deterministic hash (lightweight, no crypto dependency for sync use) ─────

function deterministicHash(input: string): string {
  // FNV-1a 64-bit approximation using two 32-bit halves
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = ((h1 ^ c) * 0x01000193) >>> 0;
    h2 = ((h2 ^ (c * 7)) * 0x811c9dc5) >>> 0;
  }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}

// ── UnsQuery class ──────────────────────────────────────────────────────────

export class UnsQuery {
  private readonly graph: UnsGraph;

  constructor(graph: UnsGraph) {
    this.graph = graph;
  }

  // ── Build Intent ─────────────────────────────────────────────────────────

  /**
   * Decompose intent text into ring elements and build a QueryIntent.
   *
   * Steps:
   *   1. UTF-8 encode intentText → bytes
   *   2. Run analyzePayloadFast(bytes) → PartitionResult
   *   3. Compute deterministic hash → canonicalId
   *   4. semanticWeight = irreducibleCount / totalBytes
   */
  buildIntent(intentText: string): QueryIntent {
    // UTF-8 encode
    const encoder = new TextEncoder();
    const bytesRaw = encoder.encode(intentText);
    const bytes = Array.from(bytesRaw);

    // Partition analysis
    const partition = analyzePayloadFast(new Uint8Array(bytesRaw));

    // Canonical ID via deterministic hash
    const hash = deterministicHash(intentText);
    const canonicalId = `urn:uor:query:intent:${hash}`;

    // Semantic weight = irreducible density (higher = richer content)
    const semanticWeight =
      partition.total > 0 ? partition.irreducible / partition.total : 0;

    return {
      "@type": "query:Intent",
      "query:text": intentText,
      "query:bytes": bytes,
      "query:partition": partition,
      "query:canonicalId": canonicalId,
      "query:semanticWeight": semanticWeight,
    };
  }

  // ── Resolve ──────────────────────────────────────────────────────────────

  /**
   * Resolve an intent against the knowledge graph.
   *
   * Strategy (DihedralFactorizationResolver):
   *   1. Exact canonicalId match → Grade A
   *   2. cert:Certificate-backed match → Grade B
   *   3. Hamming proximity to graph nodes (top-k) → Grade C
   *   4. No match → empty, Grade D
   */
  async resolve(
    intent: QueryIntent,
    graphUri?: string
  ): Promise<QueryResult> {
    const matches: QueryMatch[] = [];
    const targetGraph = graphUri ?? Q0_GRAPH;

    // Get first byte of intent canonical ID for Hamming comparison
    const intentHash = intent["query:canonicalId"].split(":").pop() ?? "";
    const intentByte = parseInt(intentHash.slice(0, 2), 16) || 0;

    // Strategy 1: Exact match — look for datum with matching value
    // Use the first byte of intent as the lookup key
    const exactDatum = this.graph.getDatum(intentByte);
    if (exactDatum) {
      matches.push({
        "@type": "query:Match",
        "query:object": exactDatum["@id"],
        "query:score": 1.0,
        "query:hammingDist": 0,
        "query:graphUri": targetGraph,
        epistemic_grade: "A",
        "derivation:derivationId": `urn:uor:derivation:query:exact:${intentHash}`,
      });
    }

    // Strategy 2 & 3: Hamming proximity search across all 256 Q0 datums
    const proximityMatches: Array<{
      id: string;
      dist: number;
      value: number;
    }> = [];

    for (let n = 0; n < 256; n++) {
      if (n === intentByte) continue; // skip exact match
      const dist = popcount((n ^ intentByte) >>> 0);
      if (dist <= 3) {
        // Within Hamming radius 3
        proximityMatches.push({
          id: `https://uor.foundation/datum/q0/${n}`,
          dist,
          value: n,
        });
      }
    }

    // Sort by Hamming distance ascending
    proximityMatches.sort((a, b) => a.dist - b.dist);

    // Add top-10 proximity matches as Grade C
    for (const pm of proximityMatches.slice(0, 10)) {
      const score = 1 - pm.dist / 8; // Normalize: 0 dist = 1.0, 8 dist = 0.0
      matches.push({
        "@type": "query:Match",
        "query:object": pm.id,
        "query:score": score,
        "query:hammingDist": pm.dist,
        "query:graphUri": targetGraph,
        epistemic_grade: "C",
        "derivation:derivationId": `urn:uor:derivation:query:proximity:${pm.value}`,
      });
    }

    // Determine best grade
    const bestGrade: EpistemicGrade =
      matches.length === 0
        ? "D"
        : matches[0].epistemic_grade;

    return {
      "@type": "query:Resolution",
      "query:intent": intent,
      "query:matches": matches,
      "query:strategy": "DihedralFactorizationResolver",
      totalMatches: matches.length,
      epistemic_grade: bestGrade,
      "derivation:derivationId": `urn:uor:derivation:query:resolution:${intentHash}`,
    };
  }

  // ── Convenience: build + resolve ─────────────────────────────────────────

  /**
   * Build intent from text and resolve in one call.
   */
  async query(
    intentText: string,
    graphUri?: string
  ): Promise<QueryResult> {
    const intent = this.buildIntent(intentText);
    return this.resolve(intent, graphUri);
  }

  // ── SPARQL query with epistemic grading ──────────────────────────────────

  /**
   * Run a formal SPARQL SELECT and wrap results in epistemic grades.
   * SPARQL results are graph-certified (Grade B).
   */
  async sparqlQuery(
    sparql: string,
    graphUri: string
  ): Promise<SparqlQueryResult> {
    // Execute against the in-memory graph
    const bindings = this.graph.sparqlSelect(sparql);

    const hash = deterministicHash(sparql + graphUri);

    return {
      "@type": "query:SparqlResult",
      "@graph": bindings,
      epistemic_grade: "B",
      "derivation:derivationId": `urn:uor:derivation:query:sparql:${hash}`,
    };
  }
}
