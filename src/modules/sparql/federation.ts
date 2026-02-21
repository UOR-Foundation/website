/**
 * SPARQL Federation — multi-endpoint query dispatcher.
 *
 * Currently supports:
 *   1. Local Supabase store (default)
 *   2. Live UOR API (https://api.uor.foundation)
 *
 * Future: additional SPARQL-compliant endpoints.
 *
 * Delegates to sparql/executor for local queries.
 */

import { executeSparql } from "./executor";
import type { SparqlResult, SparqlResultRow } from "./executor";

// ── Types ───────────────────────────────────────────────────────────────────

export type EndpointType = "local" | "uor-api";

export interface FederationEndpoint {
  id: string;
  type: EndpointType;
  label: string;
  url?: string;
}

export interface FederatedResult {
  endpoint: FederationEndpoint;
  result: SparqlResult;
}

// ── Default endpoints ───────────────────────────────────────────────────────

export const LOCAL_ENDPOINT: FederationEndpoint = {
  id: "local",
  type: "local",
  label: "Local Knowledge Graph",
};

export const UOR_API_ENDPOINT: FederationEndpoint = {
  id: "uor-api",
  type: "uor-api",
  label: "UOR Live API",
  url: "https://api.uor.foundation",
};

export const DEFAULT_ENDPOINTS: FederationEndpoint[] = [LOCAL_ENDPOINT];

// ── Federated query ─────────────────────────────────────────────────────────

/**
 * Execute a SPARQL query against one or more endpoints.
 * Currently only the local endpoint is fully implemented.
 */
export async function federatedQuery(
  query: string,
  endpoints: FederationEndpoint[] = DEFAULT_ENDPOINTS
): Promise<FederatedResult[]> {
  const results: FederatedResult[] = [];

  for (const endpoint of endpoints) {
    if (endpoint.type === "local") {
      const result = await executeSparql(query);
      results.push({ endpoint, result });
    } else if (endpoint.type === "uor-api") {
      // Federated query against UOR Live API
      const apiStart = performance.now();
      try {
        // Extract numeric values from query for ring-grounded resolution
        const numMatch = query.match(/(\d+)/);
        const value = numMatch ? parseInt(numMatch[1]) : 0;

        const response = await fetch(
          `${endpoint.url}/v1/kernel/op/compute`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ op: "neg", x: value, quantum: 0 }),
            signal: AbortSignal.timeout(5000),
          }
        );

        if (response.ok) {
          const data = await response.json();
          // Parse API response into SparqlResult format
          const rows: SparqlResultRow[] = [{
            subject: data?.result?.iri ?? `urn:uor:api:${value}`,
            predicate: "u:value",
            object: String(data?.result?.value ?? value),
            graph_iri: "urn:uor:graph:api",
            epistemic_grade: "B" as const,
          }];

          results.push({
            endpoint,
            result: {
              rows,
              totalCount: rows.length,
              executionTimeMs: Math.round(performance.now() - apiStart),
              query,
              parsed: { prefixes: [], variables: [], patterns: [], filters: [] },
            },
          });
        } else {
          // API returned error — return empty result
          results.push({
            endpoint,
            result: {
              rows: [],
              totalCount: 0,
              executionTimeMs: Math.round(performance.now() - apiStart),
              query,
              parsed: { prefixes: [], variables: [], patterns: [], filters: [] },
            },
          });
        }
      } catch {
        // Network error — return empty result gracefully
        results.push({
          endpoint,
          result: {
            rows: [],
            totalCount: 0,
            executionTimeMs: Math.round(performance.now() - apiStart),
            query,
            parsed: { prefixes: [], variables: [], patterns: [], filters: [] },
          },
        });
      }
    }
  }

  return results;
}
