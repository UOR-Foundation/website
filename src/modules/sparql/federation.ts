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
      // Stub: future API integration
      results.push({
        endpoint,
        result: {
          rows: [],
          totalCount: 0,
          executionTimeMs: 0,
          query,
          parsed: { prefixes: [], variables: [], patterns: [], filters: [] },
        },
      });
    }
  }

  return results;
}
