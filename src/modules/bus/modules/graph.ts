/**
 * Sovereign Bus — Graph Module Registration.
 * ═════════════════════════════════════════════════════════════════
 *
 * Exposes Knowledge Graph operations: put, get, query, similar, stats, verify.
 * All local — IndexedDB triple store, zero network dependency.
 *
 * @version 1.0.0
 */

import { register } from "../registry";

register({
  ns: "graph",
  label: "Knowledge Graph",
  operations: {
    put: {
      handler: async (params: any) => {
        const { localGraphStore } = await import("@/modules/knowledge-graph");
        if (params?.subject && params?.predicate && params?.object) {
          const edge = await localGraphStore.putEdge(
            params.subject,
            params.predicate,
            params.object,
            params.graphIri,
            params.metadata,
          );
          return { ok: true, type: "edge", id: edge.id };
        }
        await localGraphStore.putNode(params?.node ?? params);
        return { ok: true, type: "node" };
      },
      description: "Insert or update a node or edge in the knowledge graph",
    },
    get: {
      handler: async (params: any) => {
        const { localGraphStore } = await import("@/modules/knowledge-graph");
        if (params?.uorAddress) {
          return localGraphStore.getNode(params.uorAddress);
        }
        if (params?.edgeId) {
          return localGraphStore.getEdge(params.edgeId);
        }
        throw new Error("Provide uorAddress (node) or edgeId (edge)");
      },
      description: "Retrieve a node by UOR address or an edge by ID",
    },
    query: {
      handler: async (params: any) => {
        const { localGraphStore } = await import("@/modules/knowledge-graph");
        if (params?.subject) {
          return localGraphStore.queryBySubject(params.subject);
        }
        if (params?.predicate) {
          return localGraphStore.queryByPredicate(params.predicate);
        }
        if (params?.object) {
          return localGraphStore.queryByObject(params.object);
        }
        return localGraphStore.getAllNodes();
      },
      description: "Query nodes/edges by subject, predicate, or object pattern",
    },
    similar: {
      handler: async (params: any) => {
        const { findSimilarNodes } = await import("@/modules/knowledge-graph");
        return findSimilarNodes(params?.query, params?.threshold, params?.limit);
      },
      description: "Find semantically similar nodes using trigram cosine similarity",
      paramsSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          threshold: { type: "number", default: 0.3 },
          limit: { type: "number", default: 20 },
        },
        required: ["query"],
      },
    },
    stats: {
      handler: async () => {
        const { localGraphStore } = await import("@/modules/knowledge-graph");
        return localGraphStore.getStats();
      },
      description: "Get graph statistics: node count, edge count, derivation count",
    },
    verify: {
      handler: async () => {
        const { verifyGraphCoherence } = await import("@/modules/knowledge-graph");
        return verifyGraphCoherence();
      },
      description: "Verify self-consistency of the entire knowledge graph",
    },
    compress: {
      handler: async () => {
        const { compressGraph } = await import("@/modules/knowledge-graph");
        return compressGraph();
      },
      description: "Merge nodes with identical canonical forms (deduplication)",
    },
    summary: {
      handler: async () => {
        const { graphSummary } = await import("@/modules/knowledge-graph");
        return graphSummary();
      },
      description: "Generate a human-readable summary of the graph contents",
    },
  },
});
