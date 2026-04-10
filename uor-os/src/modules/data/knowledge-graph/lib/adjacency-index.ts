/**
 * Adjacency Index — O(1) Graph Traversal.
 * ═════════════════════════════════════════
 *
 * Neo4j's killer feature: index-free adjacency.
 * Maintains a Map<string, Set<string>> for instant neighbor lookups.
 * BFS/DFS/shortest-path without any SPARQL overhead.
 *
 * Auto-updates via grafeoStore.subscribe().
 */

// ── Core Index ──────────────────────────────────────────────────────────────

const outgoing = new Map<string, Set<string>>();
const incoming = new Map<string, Set<string>>();
const edgeLabels = new Map<string, string>(); // "s|o" → predicate

let initialized = false;

function addEdge(subject: string, predicate: string, object: string): void {
  if (!outgoing.has(subject)) outgoing.set(subject, new Set());
  if (!incoming.has(object)) incoming.set(object, new Set());
  outgoing.get(subject)!.add(object);
  incoming.get(object)!.add(subject);
  edgeLabels.set(`${subject}|${object}`, predicate);
}

// ── Public API ──────────────────────────────────────────────────────────────

export const adjacencyIndex = {
  /**
   * Build the index from a set of edges.
   */
  build(edges: Array<{ subject: string; predicate: string; object: string }>): void {
    outgoing.clear();
    incoming.clear();
    edgeLabels.clear();
    for (const e of edges) {
      addEdge(e.subject, e.predicate, e.object);
    }
    initialized = true;
    console.log(`[Adjacency] Built index: ${edges.length} edges, ${outgoing.size} nodes`);
  },

  /**
   * Incrementally add an edge.
   */
  addEdge(subject: string, predicate: string, object: string): void {
    addEdge(subject, predicate, object);
  },

  /**
   * O(1) neighbor lookup — outgoing neighbors.
   */
  getNeighbors(iri: string): string[] {
    const out = outgoing.get(iri);
    const inc = incoming.get(iri);
    const result = new Set<string>();
    if (out) for (const n of out) result.add(n);
    if (inc) for (const n of inc) result.add(n);
    return Array.from(result);
  },

  /**
   * Outgoing neighbors only.
   */
  getOutgoing(iri: string): string[] {
    return Array.from(outgoing.get(iri) ?? []);
  },

  /**
   * Incoming neighbors only.
   */
  getIncoming(iri: string): string[] {
    return Array.from(incoming.get(iri) ?? []);
  },

  /**
   * Get the predicate label for a specific edge.
   */
  getEdgeLabel(subject: string, object: string): string | undefined {
    return edgeLabels.get(`${subject}|${object}`);
  },

  /**
   * BFS shortest path. Returns the path as an array of IRIs, or null.
   */
  shortestPath(from: string, to: string, maxHops: number = 10): string[] | null {
    if (from === to) return [from];

    const visited = new Set<string>([from]);
    const queue: Array<{ node: string; path: string[] }> = [{ node: from, path: [from] }];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.path.length > maxHops + 1) return null;

      const neighbors = this.getNeighbors(current.node);
      for (const neighbor of neighbors) {
        if (neighbor === to) return [...current.path, neighbor];
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({ node: neighbor, path: [...current.path, neighbor] });
        }
      }
    }
    return null;
  },

  /**
   * Extract N-hop subgraph around a node.
   */
  getSubgraph(iri: string, depth: number = 2): { nodes: Set<string>; edges: Array<[string, string, string]> } {
    const nodes = new Set<string>([iri]);
    const edges: Array<[string, string, string]> = [];
    let frontier = [iri];

    for (let d = 0; d < depth && frontier.length > 0; d++) {
      const next: string[] = [];
      for (const node of frontier) {
        for (const neighbor of this.getNeighbors(node)) {
          const label = this.getEdgeLabel(node, neighbor) || this.getEdgeLabel(neighbor, node) || "related";
          edges.push([node, label, neighbor]);
          if (!nodes.has(neighbor)) {
            nodes.add(neighbor);
            next.push(neighbor);
          }
        }
      }
      frontier = next;
    }

    return { nodes, edges };
  },

  /**
   * Total node count in the index.
   */
  nodeCount(): number {
    const all = new Set<string>();
    for (const k of outgoing.keys()) all.add(k);
    for (const k of incoming.keys()) all.add(k);
    return all.size;
  },

  /**
   * Total edge count in the index.
   */
  edgeCount(): number {
    return edgeLabels.size;
  },

  /**
   * Whether the index has been initialized.
   */
  isInitialized(): boolean {
    return initialized;
  },

  /**
   * Clear the index.
   */
  clear(): void {
    outgoing.clear();
    incoming.clear();
    edgeLabels.clear();
    initialized = false;
  },
};
