/**
 * UOR Knowledge Graph Manager — Sovereign (Backend-Agnostic).
 * ════════════════════════════════════════════════════════════
 *
 * Named graph management and stats, routed through GrafeoDB.
 * NO DIRECT SUPABASE IMPORTS.
 */

import { grafeoStore, sparqlQuery } from "./grafeo-store";
import type { SparqlBinding } from "./grafeo-store";
import { getNamespaceStats } from "./lib/graph-namespaces";

// ── Graph stats ─────────────────────────────────────────────────────────────

export interface GraphStats {
  datumCount: number;
  derivationCount: number;
  certificateCount: number;
  receiptCount: number;
  tripleCount: number;
}

/**
 * Get aggregate stats from GrafeoDB (local-first).
 */
export async function getGraphStats(): Promise<GraphStats> {
  const stats = await grafeoStore.getStats();
  const derivations = await grafeoStore.getAllDerivations();

  // Count certificates and receipts via SPARQL
  let certificateCount = 0;
  let receiptCount = 0;

  try {
    const certResult = await sparqlQuery(
      `SELECT (COUNT(*) AS ?count) WHERE { GRAPH <https://uor.foundation/graph/certificates> { ?s ?p ?o } }`
    ) as SparqlBinding[];
    certificateCount = certResult[0]?.["?count"] ? parseInt(certResult[0]["?count"]) : 0;
  } catch { /* empty */ }

  try {
    const receiptResult = await sparqlQuery(
      `SELECT (COUNT(*) AS ?count) WHERE { GRAPH <https://uor.foundation/graph/receipts> { ?s ?p ?o } }`
    ) as SparqlBinding[];
    receiptCount = receiptResult[0]?.["?count"] ? parseInt(receiptResult[0]["?count"]) : 0;
  } catch { /* empty */ }

  return {
    datumCount: stats.nodeCount,
    derivationCount: derivations.length,
    certificateCount,
    receiptCount,
    tripleCount: stats.edgeCount,
  };
}

// ── Named graphs ────────────────────────────────────────────────────────────

/**
 * List all distinct named graphs in GrafeoDB.
 */
export async function listGraphs(): Promise<string[]> {
  try {
    const results = await sparqlQuery(
      `SELECT DISTINCT ?g WHERE { GRAPH ?g { ?s ?p ?o } }`
    ) as SparqlBinding[];

    if (!Array.isArray(results)) return [];
    return results.map(r => r["?g"]).filter(Boolean).sort();
  } catch {
    return [];
  }
}

/**
 * Get triple count for a specific named graph.
 */
export async function getNamedGraphTripleCount(graphIri: string): Promise<number> {
  try {
    const results = await sparqlQuery(
      `SELECT (COUNT(*) AS ?count) WHERE { GRAPH <${graphIri}> { ?s ?p ?o } }`
    ) as SparqlBinding[];
    return results[0]?.["?count"] ? parseInt(results[0]["?count"]) : 0;
  } catch {
    return 0;
  }
}

export { getNamespaceStats };
