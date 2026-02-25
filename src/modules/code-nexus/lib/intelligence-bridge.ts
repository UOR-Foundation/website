/**
 * Code Nexus — Intelligence Bridge
 * ═════════════════════════════════
 *
 * Translates natural language questions into graph operations
 * via the AI gateway, then executes them against the local graph store.
 * Minimal surface: one function does everything.
 */

import type { CodeGraphStore, QueryResult, GraphNode } from "./graph-store";

// ── Types ───────────────────────────────────────────────────────────────────

interface BridgeOperation {
  type: "dependencies" | "impact" | "callChain" | "cluster" | "search" | "stats" | "byType";
  entityId?: string;
  query?: string;
  typeName?: string;
}

export interface BridgeResponse {
  interpretation: string;
  operations: BridgeOperation[];
  insight: string;
}

export interface BridgeResult {
  response: BridgeResponse;
  results: { label: string; data: QueryResult | GraphNode[] | Record<string, number> }[];
}

// ── Graph summary generator ─────────────────────────────────────────────────

function buildGraphSummary(store: CodeGraphStore): string {
  const stats = store.stats();
  const lines: string[] = [`Entities: ${stats.totalNodes}, Relations: ${stats.totalEdges}`];

  // Type breakdown
  const types = ["class", "function", "interface", "variable", "type", "enum"];
  const typeLine = types.filter((t) => stats[t]).map((t) => `${t}:${stats[t]}`).join(", ");
  if (typeLine) lines.push(`Types: ${typeLine}`);

  // Relation breakdown
  const rels = ["imports", "extends", "implements", "calls", "exports"];
  const relLine = rels.filter((r) => stats[r]).map((r) => `${r}:${stats[r]}`).join(", ");
  if (relLine) lines.push(`Relations: ${relLine}`);

  // Sample entity names (up to 30 for context)
  const names = Array.from(store.nodes.values()).slice(0, 30).map((n) => n.name);
  lines.push(`Sample entities: ${names.join(", ")}`);

  return lines.join("\n");
}

// ── Execute bridge operations against store ─────────────────────────────────

function executeOperations(
  store: CodeGraphStore,
  ops: BridgeOperation[]
): BridgeResult["results"] {
  return ops.map((op) => {
    switch (op.type) {
      case "dependencies":
        return { label: `Dependencies of ${op.entityId}`, data: store.getDependencies(op.entityId!) };
      case "impact":
        return { label: `Impact of ${op.entityId}`, data: store.getImpact(op.entityId!) };
      case "callChain":
        return { label: `Call chain from ${op.entityId}`, data: store.getCallChain(op.entityId!) };
      case "cluster":
        return { label: `Cluster around ${op.entityId}`, data: store.getCluster(op.entityId!) };
      case "search":
        return { label: `Search: "${op.query}"`, data: store.search(op.query!, 20) };
      case "stats":
        return { label: "Graph Statistics", data: store.stats() };
      case "byType":
        return { label: `All ${op.typeName}s`, data: store.byType(op.typeName!) };
      default:
        return { label: "Unknown", data: { columns: [], rows: [] } };
    }
  });
}

// ── Fuzzy entity resolution ─────────────────────────────────────────────────

function resolveEntityIds(store: CodeGraphStore, ops: BridgeOperation[]): BridgeOperation[] {
  return ops.map((op) => {
    if (!op.entityId) return op;
    // If exact match exists, use it
    if (store.nodes.has(op.entityId)) return op;
    // Try fuzzy search
    const matches = store.search(op.entityId, 1);
    if (matches.length > 0) return { ...op, entityId: matches[0].id };
    return op;
  });
}

// ── Main bridge function ────────────────────────────────────────────────────

export async function askCodeNexus(
  store: CodeGraphStore,
  question: string
): Promise<BridgeResult> {
  const summary = buildGraphSummary(store);

  const resp = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/code-nexus-query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ question, graphSummary: summary }),
    }
  );

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error ?? `HTTP ${resp.status}`);
  }

  const response: BridgeResponse = await resp.json();

  // Resolve entity IDs (AI may return short names)
  const resolved = resolveEntityIds(store, response.operations ?? []);
  const results = executeOperations(store, resolved);

  return { response, results };
}
