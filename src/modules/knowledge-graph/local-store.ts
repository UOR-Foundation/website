/**
 * UOR Knowledge Graph — Local IndexedDB Triple Store.
 *
 * Fully offline-first graph persistence. Every node is keyed by its UOR address
 * (content-addressed), edges are typed subject-predicate-object triples, and
 * derivations carry the full audit trail.
 *
 * Follows the weight-store.ts pattern for IndexedDB lifecycle management.
 *
 * Zero network dependency. Pure local computation.
 */

// ── Types ───────────────────────────────────────────────────────────────────

export interface KGNode {
  /** UOR address (content-addressed primary key) */
  uorAddress: string;
  /** UOR CID (IPFS-compatible) */
  uorCid?: string;
  /** Human-readable label */
  label: string;
  /** Node type: file, paste, url, column, entity, workspace, folder */
  nodeType: string;
  /** JSON-LD @type */
  rdfType?: string;
  /** Triadic stratum level */
  stratumLevel?: "low" | "medium" | "high";
  /** Total stratum (popcount sum) */
  totalStratum?: number;
  /** Quality score 0.0–1.0 */
  qualityScore?: number;
  /** Serialized properties (filename, size, format, etc.) */
  properties: Record<string, unknown>;
  /** Canonical term serialization (for canonicalization-based compression) */
  canonicalForm?: string;
  /** Creation timestamp */
  createdAt: number;
  /** Last modified */
  updatedAt: number;
  /** Sync state: local-only, synced, pending */
  syncState: "local" | "synced" | "pending";
}

export interface KGEdge {
  /** Composite key: subject|predicate|object */
  id: string;
  subject: string;
  predicate: string;
  object: string;
  /** Named graph IRI */
  graphIri: string;
  /** Edge metadata */
  metadata?: Record<string, unknown>;
  createdAt: number;
  syncState: "local" | "synced" | "pending";
}

export interface KGDerivation {
  derivationId: string;
  resultIri: string;
  canonicalTerm: string;
  originalTerm: string;
  epistemicGrade: string;
  metrics: Record<string, unknown>;
  createdAt: number;
  syncState: "local" | "synced" | "pending";
}

export interface KGStats {
  nodeCount: number;
  edgeCount: number;
  derivationCount: number;
  lastUpdated: number;
}

// ── Constants ───────────────────────────────────────────────────────────────

const DB_NAME = "uor-knowledge-graph";
const DB_VERSION = 1;
const STORES = {
  nodes: "nodes",
  edges: "edges",
  derivations: "derivations",
  meta: "meta",
} as const;

// ── IndexedDB Lifecycle ─────────────────────────────────────────────────────

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      // Nodes: keyed by uorAddress
      if (!db.objectStoreNames.contains(STORES.nodes)) {
        const nodeStore = db.createObjectStore(STORES.nodes, { keyPath: "uorAddress" });
        nodeStore.createIndex("by_type", "nodeType", { unique: false });
        nodeStore.createIndex("by_stratum", "stratumLevel", { unique: false });
        nodeStore.createIndex("by_sync", "syncState", { unique: false });
        nodeStore.createIndex("by_updated", "updatedAt", { unique: false });
        nodeStore.createIndex("by_canonical", "canonicalForm", { unique: false });
      }

      // Edges: keyed by composite id
      if (!db.objectStoreNames.contains(STORES.edges)) {
        const edgeStore = db.createObjectStore(STORES.edges, { keyPath: "id" });
        edgeStore.createIndex("by_subject", "subject", { unique: false });
        edgeStore.createIndex("by_predicate", "predicate", { unique: false });
        edgeStore.createIndex("by_object", "object", { unique: false });
        edgeStore.createIndex("by_graph", "graphIri", { unique: false });
        edgeStore.createIndex("by_sync", "syncState", { unique: false });
      }

      // Derivations: keyed by derivationId
      if (!db.objectStoreNames.contains(STORES.derivations)) {
        const derivStore = db.createObjectStore(STORES.derivations, { keyPath: "derivationId" });
        derivStore.createIndex("by_result", "resultIri", { unique: false });
        derivStore.createIndex("by_grade", "epistemicGrade", { unique: false });
        derivStore.createIndex("by_sync", "syncState", { unique: false });
      }

      // Meta: key-value store for graph-level metadata
      if (!db.objectStoreNames.contains(STORES.meta)) {
        db.createObjectStore(STORES.meta, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

// ── Transaction helpers ─────────────────────────────────────────────────────

async function tx(
  storeNames: string | string[],
  mode: IDBTransactionMode
): Promise<IDBTransaction> {
  const db = await openDB();
  return db.transaction(storeNames, mode);
}

function req<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ── Change listeners ────────────────────────────────────────────────────────

let listeners: Array<() => void> = [];

function emit() {
  listeners.forEach((fn) => fn());
}

// ── Public API ──────────────────────────────────────────────────────────────

export const localGraphStore = {
  // ── Subscriptions ───────────────────────────────────────────────────────

  subscribe(fn: () => void) {
    listeners.push(fn);
    return () => {
      listeners = listeners.filter((l) => l !== fn);
    };
  },

  // ── Node Operations ─────────────────────────────────────────────────────

  async putNode(node: KGNode): Promise<void> {
    const t = await tx(STORES.nodes, "readwrite");
    const store = t.objectStore(STORES.nodes);
    await req(store.put(node));
    emit();
  },

  async putNodes(nodes: KGNode[]): Promise<void> {
    if (nodes.length === 0) return;
    const t = await tx(STORES.nodes, "readwrite");
    const store = t.objectStore(STORES.nodes);
    for (const node of nodes) {
      store.put(node);
    }
    await new Promise<void>((resolve, reject) => {
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
    emit();
  },

  async getNode(uorAddress: string): Promise<KGNode | undefined> {
    const t = await tx(STORES.nodes, "readonly");
    const store = t.objectStore(STORES.nodes);
    return req(store.get(uorAddress));
  },

  async getAllNodes(): Promise<KGNode[]> {
    const t = await tx(STORES.nodes, "readonly");
    const store = t.objectStore(STORES.nodes);
    return req(store.getAll());
  },

  async getNodesByType(nodeType: string): Promise<KGNode[]> {
    const t = await tx(STORES.nodes, "readonly");
    const store = t.objectStore(STORES.nodes);
    const index = store.index("by_type");
    return req(index.getAll(nodeType));
  },

  async getNodesByStratum(level: "low" | "medium" | "high"): Promise<KGNode[]> {
    const t = await tx(STORES.nodes, "readonly");
    const store = t.objectStore(STORES.nodes);
    const index = store.index("by_stratum");
    return req(index.getAll(level));
  },

  async getNodesBySyncState(state: "local" | "synced" | "pending"): Promise<KGNode[]> {
    const t = await tx(STORES.nodes, "readonly");
    const store = t.objectStore(STORES.nodes);
    const index = store.index("by_sync");
    return req(index.getAll(state));
  },

  async removeNode(uorAddress: string): Promise<void> {
    const t = await tx(STORES.nodes, "readwrite");
    const store = t.objectStore(STORES.nodes);
    await req(store.delete(uorAddress));
    emit();
  },

  // ── Edge Operations ─────────────────────────────────────────────────────

  async putEdge(
    subject: string,
    predicate: string,
    object: string,
    graphIri: string = "urn:uor:local",
    metadata?: Record<string, unknown>
  ): Promise<KGEdge> {
    const id = `${subject}|${predicate}|${object}`;
    const edge: KGEdge = {
      id,
      subject,
      predicate,
      object,
      graphIri,
      metadata,
      createdAt: Date.now(),
      syncState: "local",
    };
    const t = await tx(STORES.edges, "readwrite");
    const store = t.objectStore(STORES.edges);
    await req(store.put(edge));
    emit();
    return edge;
  },

  async putEdges(edges: KGEdge[]): Promise<void> {
    if (edges.length === 0) return;
    const t = await tx(STORES.edges, "readwrite");
    const store = t.objectStore(STORES.edges);
    for (const edge of edges) {
      store.put(edge);
    }
    await new Promise<void>((resolve, reject) => {
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
    emit();
  },

  async getEdge(id: string): Promise<KGEdge | undefined> {
    const t = await tx(STORES.edges, "readonly");
    const store = t.objectStore(STORES.edges);
    return req(store.get(id));
  },

  async getAllEdges(): Promise<KGEdge[]> {
    const t = await tx(STORES.edges, "readonly");
    const store = t.objectStore(STORES.edges);
    return req(store.getAll());
  },

  async queryBySubject(subjectAddr: string): Promise<KGEdge[]> {
    const t = await tx(STORES.edges, "readonly");
    const store = t.objectStore(STORES.edges);
    const index = store.index("by_subject");
    return req(index.getAll(subjectAddr));
  },

  async queryByPredicate(predicate: string): Promise<KGEdge[]> {
    const t = await tx(STORES.edges, "readonly");
    const store = t.objectStore(STORES.edges);
    const index = store.index("by_predicate");
    return req(index.getAll(predicate));
  },

  async queryByObject(objectAddr: string): Promise<KGEdge[]> {
    const t = await tx(STORES.edges, "readonly");
    const store = t.objectStore(STORES.edges);
    const index = store.index("by_object");
    return req(index.getAll(objectAddr));
  },

  async removeEdge(id: string): Promise<void> {
    const t = await tx(STORES.edges, "readwrite");
    const store = t.objectStore(STORES.edges);
    await req(store.delete(id));
    emit();
  },

  async removeEdgesBySubject(subjectAddr: string): Promise<void> {
    const edges = await this.queryBySubject(subjectAddr);
    if (edges.length === 0) return;
    const t = await tx(STORES.edges, "readwrite");
    const store = t.objectStore(STORES.edges);
    for (const edge of edges) {
      store.delete(edge.id);
    }
    await new Promise<void>((resolve, reject) => {
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
    emit();
  },

  // ── Derivation Operations ───────────────────────────────────────────────

  async putDerivation(d: KGDerivation): Promise<void> {
    const t = await tx(STORES.derivations, "readwrite");
    const store = t.objectStore(STORES.derivations);
    await req(store.put(d));
    emit();
  },

  async getDerivation(derivationId: string): Promise<KGDerivation | undefined> {
    const t = await tx(STORES.derivations, "readonly");
    const store = t.objectStore(STORES.derivations);
    return req(store.get(derivationId));
  },

  async getDerivationsByResult(resultIri: string): Promise<KGDerivation[]> {
    const t = await tx(STORES.derivations, "readonly");
    const store = t.objectStore(STORES.derivations);
    const index = store.index("by_result");
    return req(index.getAll(resultIri));
  },

  async getAllDerivations(): Promise<KGDerivation[]> {
    const t = await tx(STORES.derivations, "readonly");
    const store = t.objectStore(STORES.derivations);
    return req(store.getAll());
  },

  // ── Graph Traversal ─────────────────────────────────────────────────────

  /**
   * Breadth-first traversal from a starting node.
   * Returns all reachable nodes within `maxDepth` hops.
   */
  async traverseBFS(
    startAddr: string,
    maxDepth: number = 3
  ): Promise<{ nodes: KGNode[]; edges: KGEdge[] }> {
    const visited = new Set<string>();
    const resultNodes: KGNode[] = [];
    const resultEdges: KGEdge[] = [];
    let frontier = [startAddr];

    for (let depth = 0; depth <= maxDepth && frontier.length > 0; depth++) {
      const nextFrontier: string[] = [];

      for (const addr of frontier) {
        if (visited.has(addr)) continue;
        visited.add(addr);

        const node = await this.getNode(addr);
        if (node) resultNodes.push(node);

        // Fan out via edges
        const outEdges = await this.queryBySubject(addr);
        for (const edge of outEdges) {
          resultEdges.push(edge);
          if (!visited.has(edge.object)) {
            nextFrontier.push(edge.object);
          }
        }

        // Also follow incoming edges
        const inEdges = await this.queryByObject(addr);
        for (const edge of inEdges) {
          resultEdges.push(edge);
          if (!visited.has(edge.subject)) {
            nextFrontier.push(edge.subject);
          }
        }
      }

      frontier = nextFrontier;
    }

    return { nodes: resultNodes, edges: resultEdges };
  },

  /**
   * Pattern query: find edges matching optional subject/predicate/object patterns.
   * null = wildcard.
   */
  async queryPattern(
    subject?: string | null,
    predicate?: string | null,
    object?: string | null
  ): Promise<KGEdge[]> {
    // Use the most selective index available
    if (subject) {
      const edges = await this.queryBySubject(subject);
      return edges.filter(
        (e) =>
          (!predicate || e.predicate === predicate) &&
          (!object || e.object === object)
      );
    }
    if (predicate) {
      const edges = await this.queryByPredicate(predicate);
      return edges.filter(
        (e) => (!subject || e.subject === subject) && (!object || e.object === object)
      );
    }
    if (object) {
      const edges = await this.queryByObject(object);
      return edges.filter(
        (e) =>
          (!subject || e.subject === subject) &&
          (!predicate || e.predicate === predicate)
      );
    }
    // Full scan (all edges)
    return this.getAllEdges();
  },

  // ── Stats ─────────────────────────────────────────────────────────────

  async getStats(): Promise<KGStats> {
    const [nodes, edges, derivations] = await Promise.all([
      this.getAllNodes(),
      this.getAllEdges(),
      this.getAllDerivations(),
    ]);
    return {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      derivationCount: derivations.length,
      lastUpdated: Date.now(),
    };
  },

  // ── Export / Import (JSON-LD) ─────────────────────────────────────────

  async exportAsJsonLd(): Promise<object> {
    const nodes = await this.getAllNodes();
    const edges = await this.getAllEdges();

    const graph = nodes.map((node) => ({
      "@id": node.uorAddress,
      "@type": node.rdfType || "schema:Datum",
      "rdfs:label": node.label,
      "schema:nodeType": node.nodeType,
      "schema:qualityScore": node.qualityScore,
      "schema:stratumLevel": node.stratumLevel,
      ...node.properties,
    }));

    // Add edge triples as properties on subjects
    for (const edge of edges) {
      const subjectNode = graph.find((n) => n["@id"] === edge.subject);
      if (subjectNode) {
        const existing = subjectNode[edge.predicate];
        if (existing) {
          if (Array.isArray(existing)) {
            (existing as string[]).push(edge.object);
          } else {
            subjectNode[edge.predicate] = [existing as string, edge.object];
          }
        } else {
          subjectNode[edge.predicate] = edge.object;
        }
      }
    }

    return {
      "@context": {
        schema: "https://uor.foundation/schema/",
        rdfs: "http://www.w3.org/2000/01/rdf-schema#",
        u: "https://uor.foundation/u/",
      },
      "@graph": graph,
    };
  },

  async importFromJsonLd(doc: { "@graph"?: Array<Record<string, unknown>> }): Promise<number> {
    const graphNodes = doc["@graph"];
    if (!graphNodes || !Array.isArray(graphNodes)) return 0;

    const now = Date.now();
    const nodes: KGNode[] = [];
    const edges: KGEdge[] = [];

    for (const entry of graphNodes) {
      const id = entry["@id"] as string;
      if (!id) continue;

      const props: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(entry)) {
        if (key.startsWith("@") || key === "rdfs:label" || key === "schema:nodeType" ||
            key === "schema:qualityScore" || key === "schema:stratumLevel") continue;

        // String values pointing to other nodes become edges
        if (typeof value === "string" && value.startsWith("https://uor.foundation/")) {
          edges.push({
            id: `${id}|${key}|${value}`,
            subject: id,
            predicate: key,
            object: value,
            graphIri: "urn:uor:imported",
            createdAt: now,
            syncState: "local",
          });
        } else {
          props[key] = value;
        }
      }

      nodes.push({
        uorAddress: id,
        label: (entry["rdfs:label"] as string) || id,
        nodeType: (entry["schema:nodeType"] as string) || "unknown",
        rdfType: (entry["@type"] as string) || "schema:Datum",
        qualityScore: (entry["schema:qualityScore"] as number) || undefined,
        stratumLevel: (entry["schema:stratumLevel"] as "low" | "medium" | "high") || undefined,
        properties: props,
        createdAt: now,
        updatedAt: now,
        syncState: "local",
      });
    }

    await this.putNodes(nodes);
    await this.putEdges(edges);
    return nodes.length;
  },

  // ── Clear ─────────────────────────────────────────────────────────────

  async clear(): Promise<void> {
    const t = await tx(
      [STORES.nodes, STORES.edges, STORES.derivations, STORES.meta],
      "readwrite"
    );
    t.objectStore(STORES.nodes).clear();
    t.objectStore(STORES.edges).clear();
    t.objectStore(STORES.derivations).clear();
    t.objectStore(STORES.meta).clear();
    await new Promise<void>((resolve, reject) => {
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
    emit();
  },
};
