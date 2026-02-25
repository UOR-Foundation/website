/**
 * Code Nexus — In-Memory Graph Store
 * ═══════════════════════════════════
 *
 * Lightweight, queryable graph engine that replaces KuzuDB WASM
 * for maximum coherence and zero-dependency simplicity.
 * Supports traversal queries (call chains, impact, dependencies, clusters).
 */

import type { MappedEntity, MappedTriple, UorMappingResult } from "./uor-mapper";
import type { IngestionResult } from "./ingestion";

// ── Types ───────────────────────────────────────────────────────────────────

export interface GraphNode {
  id: string;          // entity name (file::Name)
  name: string;        // short display name
  type: string;        // class | function | interface | variable | type | enum
  filePath: string;    // source file path
  line: number;
  iri: string;         // UOR IRI
  cid: string;         // UOR CID
}

export interface GraphEdge {
  source: string;      // node id
  target: string;      // node id
  type: string;        // imports | invokes | extends | implements | exports
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, string | number>[];
}

// ── Graph Store ─────────────────────────────────────────────────────────────

export class CodeGraphStore {
  readonly nodes: Map<string, GraphNode> = new Map();
  readonly edges: GraphEdge[] = [];
  readonly outgoing: Map<string, GraphEdge[]> = new Map();
  readonly incoming: Map<string, GraphEdge[]> = new Map();

  /**
   * Populate from Phase 1 ingestion + UOR mapping results.
   */
  populate(ingestion: IngestionResult, mapping: UorMappingResult) {
    this.nodes.clear();
    this.edges.length = 0;
    this.outgoing.clear();
    this.incoming.clear();

    // Build nodes from mapped entities
    for (const me of mapping.mappedEntities) {
      const e = me.entity;
      const parts = e.name.split("::");
      const shortName = parts.length > 1 ? parts[parts.length - 1] : e.name;
      const filePath = parts.length > 1 ? parts.slice(0, -1).join("::") : "";

      this.nodes.set(e.name, {
        id: e.name,
        name: shortName,
        type: e.type,
        filePath,
        line: e.line,
        iri: me.iri,
        cid: me.proof.cid,
      });
    }

    // Build edges from relations
    for (const rel of ingestion.relations) {
      const edge: GraphEdge = {
        source: rel.source,
        target: rel.target,
        type: rel.type,
      };
      this.edges.push(edge);

      if (!this.outgoing.has(rel.source)) this.outgoing.set(rel.source, []);
      this.outgoing.get(rel.source)!.push(edge);

      if (!this.incoming.has(rel.target)) this.incoming.set(rel.target, []);
      this.incoming.get(rel.target)!.push(edge);
    }
  }

  // ── Pre-built queries ───────────────────────────────────────────────────

  /** Count all entities. */
  entityCount(): number {
    return this.nodes.size;
  }

  /** Count all relationships. */
  relationCount(): number {
    return this.edges.length;
  }

  /** Get all entities of a given type. */
  byType(type: string): GraphNode[] {
    return Array.from(this.nodes.values()).filter((n) => n.type === type);
  }

  /** What does this entity call/import? (outgoing edges) */
  getDependencies(entityId: string): QueryResult {
    const edges = this.outgoing.get(entityId) ?? [];
    return {
      columns: ["source", "relation", "target"],
      rows: edges.map((e) => ({
        source: this.shortName(e.source),
        relation: e.type,
        target: this.shortName(e.target),
      })),
    };
  }

  /** What calls/imports this entity? (incoming edges) */
  getImpact(entityId: string): QueryResult {
    const edges = this.incoming.get(entityId) ?? [];
    return {
      columns: ["source", "relation", "target"],
      rows: edges.map((e) => ({
        source: this.shortName(e.source),
        relation: e.type,
        target: this.shortName(e.target),
      })),
    };
  }

  /** Trace the full call chain from an entity (BFS). */
  getCallChain(entityId: string, maxDepth = 5): QueryResult {
    const visited = new Set<string>();
    const rows: Record<string, string | number>[] = [];
    const queue: { id: string; depth: number }[] = [{ id: entityId, depth: 0 }];

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (visited.has(id) || depth > maxDepth) continue;
      visited.add(id);

      const outEdges = this.outgoing.get(id) ?? [];
      for (const edge of outEdges) {
        if (edge.type === "calls" || edge.type === "imports") {
          rows.push({
            from: this.shortName(edge.source),
            relation: edge.type,
            to: this.shortName(edge.target),
            depth,
          });
          if (!visited.has(edge.target)) {
            queue.push({ id: edge.target, depth: depth + 1 });
          }
        }
      }
    }

    return { columns: ["from", "relation", "to", "depth"], rows };
  }

  /** BFS cluster detection — all nodes reachable from a starting entity. */
  getCluster(entityId: string, maxSize = 50): QueryResult {
    const visited = new Set<string>();
    const queue = [entityId];

    while (queue.length > 0 && visited.size < maxSize) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);

      for (const e of this.outgoing.get(id) ?? []) {
        if (!visited.has(e.target)) queue.push(e.target);
      }
      for (const e of this.incoming.get(id) ?? []) {
        if (!visited.has(e.source)) queue.push(e.source);
      }
    }

    const rows = Array.from(visited).map((id) => {
      const node = this.nodes.get(id);
      return {
        name: node?.name ?? id,
        type: node?.type ?? "unknown",
        file: node?.filePath ?? "",
      };
    });

    return { columns: ["name", "type", "file"], rows };
  }

  /** Search entities by name substring. */
  search(query: string, limit = 20): GraphNode[] {
    const q = query.toLowerCase();
    const results: GraphNode[] = [];
    for (const node of this.nodes.values()) {
      if (node.name.toLowerCase().includes(q) || node.id.toLowerCase().includes(q)) {
        results.push(node);
        if (results.length >= limit) break;
      }
    }
    return results;
  }

  /** Summary statistics. */
  stats(): Record<string, number> {
    const typeCounts: Record<string, number> = {};
    for (const node of this.nodes.values()) {
      typeCounts[node.type] = (typeCounts[node.type] ?? 0) + 1;
    }
    const relCounts: Record<string, number> = {};
    for (const edge of this.edges) {
      relCounts[edge.type] = (relCounts[edge.type] ?? 0) + 1;
    }
    return {
      totalNodes: this.nodes.size,
      totalEdges: this.edges.length,
      ...typeCounts,
      ...relCounts,
    };
  }

  /** Get serializable snapshot for persistence. */
  toSnapshot(): { nodes: GraphNode[]; edges: GraphEdge[] } {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: [...this.edges],
    };
  }

  /** Restore from a snapshot. */
  fromSnapshot(snapshot: { nodes: GraphNode[]; edges: GraphEdge[] }) {
    this.nodes.clear();
    this.edges.length = 0;
    this.outgoing.clear();
    this.incoming.clear();

    for (const node of snapshot.nodes) {
      this.nodes.set(node.id, node);
    }

    for (const edge of snapshot.edges) {
      this.edges.push(edge);
      if (!this.outgoing.has(edge.source)) this.outgoing.set(edge.source, []);
      this.outgoing.get(edge.source)!.push(edge);
      if (!this.incoming.has(edge.target)) this.incoming.set(edge.target, []);
      this.incoming.get(edge.target)!.push(edge);
    }
  }

  private shortName(id: string): string {
    const parts = id.split("::");
    return parts[parts.length - 1] ?? id;
  }
}
