/**
 * Graph Namespace Partitioning.
 * ══════════════════════════════
 *
 * Named namespace registry for scoped subgraph queries.
 * Each namespace maps to a graph IRI, enabling logical
 * partitioning without physical separation.
 */

import { sparqlQuery } from "../grafeo-store";
import type { SparqlBinding } from "../grafeo-store";

// ── Namespace Registry ──────────────────────────────────────────────────────

export type GraphNamespace =
  | "default"
  | "messenger"
  | "identity"
  | "agent"
  | "atlas"
  | "vault"
  | "audio"
  | "blueprints";

const NAMESPACE_IRIS: Record<GraphNamespace, string> = {
  default: "urn:uor:default",
  messenger: "urn:uor:ns:messenger",
  identity: "urn:uor:ns:identity",
  agent: "urn:uor:ns:agent",
  atlas: "urn:uor:ns:atlas",
  vault: "urn:uor:ns:vault",
  audio: "urn:uor:ns:audio",
  blueprints: "https://uor.foundation/graph/blueprints",
};

/**
 * Get the graph IRI for a namespace.
 */
export function getNamespaceIri(ns: GraphNamespace): string {
  return NAMESPACE_IRIS[ns] || `urn:uor:ns:${ns}`;
}

/**
 * List all registered namespaces.
 */
export function listNamespaces(): GraphNamespace[] {
  return Object.keys(NAMESPACE_IRIS) as GraphNamespace[];
}

/**
 * Execute a SPARQL query scoped to a specific namespace.
 * Wraps the WHERE clause with GRAPH <iri> { ... }.
 */
export async function queryNamespace(ns: GraphNamespace, sparql: string): Promise<SparqlBinding[]> {
  const iri = getNamespaceIri(ns);

  // Wrap WHERE clause with GRAPH scope
  const scoped = sparql.replace(
    /WHERE\s*\{/i,
    `WHERE { GRAPH <${iri}> {`
  ).replace(/\}\s*$/, "} }");

  const results = await sparqlQuery(scoped);
  return (results as SparqlBinding[]) || [];
}

/**
 * Execute a SPARQL query across multiple namespaces (federated).
 */
export async function queryAcross(namespaces: GraphNamespace[], sparql: string): Promise<SparqlBinding[]> {
  const results: SparqlBinding[] = [];
  for (const ns of namespaces) {
    const nsResults = await queryNamespace(ns, sparql);
    results.push(...nsResults);
  }
  return results;
}

/**
 * Get quad counts per namespace.
 */
export async function getNamespaceStats(): Promise<Record<string, number>> {
  const stats: Record<string, number> = {};

  for (const [name, iri] of Object.entries(NAMESPACE_IRIS)) {
    try {
      const result = await sparqlQuery(
        `SELECT (COUNT(*) AS ?count) WHERE { GRAPH <${iri}> { ?s ?p ?o } }`
      );
      const bindings = result as SparqlBinding[];
      stats[name] = bindings[0]?.["?count"] ? parseInt(bindings[0]["?count"]) : 0;
    } catch {
      stats[name] = 0;
    }
  }

  return stats;
}
