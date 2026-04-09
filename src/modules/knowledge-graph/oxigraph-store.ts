/**
 * UOR Knowledge Graph — Oxigraph WASM Adapter.
 * ═════════════════════════════════════════════════════════════════
 *
 * Wraps Oxigraph (Rust/WASM) in-memory quad store with the same interface
 * the bus and local-store expect. Full SPARQL 1.1 via native engine.
 *
 * Persistence: serializes the entire store as N-Quads to IndexedDB on flush(),
 * and restores on init(). This replaces the hand-rolled cursor management.
 *
 * @version 1.0.0
 */

import type { KGNode, KGEdge, KGDerivation, KGStats } from "./local-store";

// ── Lazy Oxigraph loader (WASM) ────────────────────────────────────────────

let oxModule: typeof import("oxigraph") | null = null;
let storeInstance: any | null = null;

/**
 * Lazily load the Oxigraph WASM module and return the Store instance.
 * Singleton — one store per session.
 */
async function getOx(): Promise<typeof import("oxigraph")> {
  if (oxModule) return oxModule;
  oxModule = await import("oxigraph");
  return oxModule;
}

async function getStore(): Promise<any> {
  if (storeInstance) return storeInstance;
  const ox = await getOx();
  storeInstance = new (ox as any).Store();

  // Attempt to restore persisted N-Quads from IndexedDB
  try {
    const nquads = await idbGet("oxigraph-nquads");
    if (nquads && typeof nquads === "string" && nquads.length > 0) {
      storeInstance.load(nquads, { format: "application/n-quads" });
      console.log(`[oxigraph] Restored ${storeInstance.size} quads from IndexedDB`);
    }
  } catch (e) {
    console.warn("[oxigraph] Failed to restore from IndexedDB:", e);
  }

  return storeInstance;
}

// ── IRI helpers ─────────────────────────────────────────────────────────────

const UOR_NS = "https://uor.foundation/";
const DEFAULT_GRAPH = "urn:uor:local";

function nn(ox: any, iri: string) {
  return ox.namedNode(iri);
}

function lit(ox: any, value: string) {
  return ox.literal(value);
}

function defaultGraph(ox: any, graphIri?: string) {
  return graphIri ? ox.namedNode(graphIri) : ox.namedNode(DEFAULT_GRAPH);
}

// ── Change listeners ────────────────────────────────────────────────────────

let listeners: Array<() => void> = [];
function emit() {
  listeners.forEach((fn) => fn());
}

// ── Persistence (IndexedDB simple key-value) ────────────────────────────────

const IDB_NAME = "oxigraph-persistence";
const IDB_STORE = "nquads";

function idbOpen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) {
        req.result.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key: string): Promise<string | undefined> {
  try {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return undefined;
  }
}

async function idbSet(key: string, value: string): Promise<void> {
  try {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Silent fail — persistence is best-effort
  }
}

// ── SPARQL execution ────────────────────────────────────────────────────────

export interface SparqlBinding {
  [variable: string]: string;
}

/**
 * Execute a raw SPARQL 1.1 query against the Oxigraph store.
 * Supports SELECT, ASK, CONSTRUCT, DESCRIBE.
 */
export async function sparqlQuery(
  query: string
): Promise<SparqlBinding[] | boolean | Array<{ subject: string; predicate: string; object: string; graph?: string }>> {
  const store = await getStore();
  const ox = await getOx();

  const result = store.query(query);

  // SELECT → array of Maps
  if (Array.isArray(result) || (result && typeof result[Symbol.iterator] === "function")) {
    const bindings: SparqlBinding[] = [];
    for (const row of result) {
      const binding: SparqlBinding = {};
      if (row instanceof Map) {
        for (const [key, val] of row) {
          binding[`?${key}`] = val?.value ?? String(val);
        }
      } else if (row && typeof row.entries === "function") {
        for (const [key, val] of row.entries()) {
          binding[`?${key}`] = val?.value ?? String(val);
        }
      }
      bindings.push(binding);
    }
    return bindings;
  }

  // ASK → boolean
  if (typeof result === "boolean") return result;

  return [];
}

/**
 * Execute a SPARQL UPDATE (INSERT DATA, DELETE DATA, etc.).
 */
export async function sparqlUpdate(update: string): Promise<void> {
  const store = await getStore();
  store.update(update);
  emit();
}

// ── Node/Edge adapter (matching local-store interface) ──────────────────────

/**
 * Convert a KGNode into RDF quads and insert into Oxigraph.
 */
async function nodeToQuads(node: KGNode): Promise<void> {
  const store = await getStore();
  const ox = await getOx();
  const s = nn(ox, node.uorAddress);
  const g = nn(ox, DEFAULT_GRAPH);

  store.add(ox.quad(s, nn(ox, "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
    nn(ox, node.rdfType || `${UOR_NS}schema/Datum`), g));
  store.add(ox.quad(s, nn(ox, "http://www.w3.org/2000/01/rdf-schema#label"),
    lit(ox, node.label), g));
  store.add(ox.quad(s, nn(ox, `${UOR_NS}schema/nodeType`), lit(ox, node.nodeType), g));

  if (node.qualityScore !== undefined) {
    store.add(ox.quad(s, nn(ox, `${UOR_NS}schema/qualityScore`),
      lit(ox, String(node.qualityScore)), g));
  }
  if (node.stratumLevel) {
    store.add(ox.quad(s, nn(ox, `${UOR_NS}schema/stratumLevel`),
      lit(ox, node.stratumLevel), g));
  }
  if (node.uorCid) {
    store.add(ox.quad(s, nn(ox, `${UOR_NS}u/cid`), lit(ox, node.uorCid), g));
  }

  // Serialize remaining properties as JSON blob triple
  if (Object.keys(node.properties).length > 0) {
    store.add(ox.quad(s, nn(ox, `${UOR_NS}meta/properties`),
      lit(ox, JSON.stringify(node.properties)), g));
  }
}

/**
 * Convert a KGEdge into an RDF quad and insert.
 */
async function edgeToQuad(edge: KGEdge): Promise<void> {
  const store = await getStore();
  const ox = await getOx();
  const g = nn(ox, edge.graphIri || DEFAULT_GRAPH);
  store.add(ox.quad(nn(ox, edge.subject), nn(ox, edge.predicate), nn(ox, edge.object), g));

  if (edge.metadata && Object.keys(edge.metadata).length > 0) {
    const metaNode = nn(ox, `${edge.subject}|${edge.predicate}|${edge.object}|meta`);
    store.add(ox.quad(metaNode, nn(ox, `${UOR_NS}meta/edgeMetadata`),
      lit(ox, JSON.stringify(edge.metadata)), g));
  }
}

// ── Public Oxigraph Store API ───────────────────────────────────────────────

export const oxigraphStore = {
  /**
   * Initialize Oxigraph WASM + restore from IndexedDB.
   * Call once at boot. Idempotent.
   */
  async init(): Promise<{ quadCount: number }> {
    const store = await getStore();
    return { quadCount: store.size ?? 0 };
  },

  subscribe(fn: () => void) {
    listeners.push(fn);
    return () => {
      listeners = listeners.filter((l) => l !== fn);
    };
  },

  // ── Node operations ─────────────────────────────────────────────────────

  async putNode(node: KGNode): Promise<void> {
    await nodeToQuads(node);
    emit();
  },

  async putNodes(nodes: KGNode[]): Promise<void> {
    for (const node of nodes) {
      await nodeToQuads(node);
    }
    emit();
  },

  async getNode(uorAddress: string): Promise<KGNode | undefined> {
    const results = await sparqlQuery(`
      SELECT ?label ?nodeType ?rdfType ?qualityScore ?stratumLevel ?cid ?props WHERE {
        <${uorAddress}> <http://www.w3.org/2000/01/rdf-schema#label> ?label .
        OPTIONAL { <${uorAddress}> <${UOR_NS}schema/nodeType> ?nodeType }
        OPTIONAL { <${uorAddress}> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> ?rdfType }
        OPTIONAL { <${uorAddress}> <${UOR_NS}schema/qualityScore> ?qualityScore }
        OPTIONAL { <${uorAddress}> <${UOR_NS}schema/stratumLevel> ?stratumLevel }
        OPTIONAL { <${uorAddress}> <${UOR_NS}u/cid> ?cid }
        OPTIONAL { <${uorAddress}> <${UOR_NS}meta/properties> ?props }
      } LIMIT 1
    `) as SparqlBinding[];

    if (!Array.isArray(results) || results.length === 0) return undefined;

    const r = results[0];
    return {
      uorAddress,
      label: r["?label"] || uorAddress,
      nodeType: r["?nodeType"] || "unknown",
      rdfType: r["?rdfType"],
      qualityScore: r["?qualityScore"] ? parseFloat(r["?qualityScore"]) : undefined,
      stratumLevel: (r["?stratumLevel"] as "low" | "medium" | "high") || undefined,
      uorCid: r["?cid"],
      properties: r["?props"] ? JSON.parse(r["?props"]) : {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncState: "local",
    };
  },

  async getAllNodes(): Promise<KGNode[]> {
    const results = await sparqlQuery(`
      SELECT DISTINCT ?s ?label ?nodeType WHERE {
        ?s <http://www.w3.org/2000/01/rdf-schema#label> ?label .
        OPTIONAL { ?s <${UOR_NS}schema/nodeType> ?nodeType }
      }
    `) as SparqlBinding[];

    if (!Array.isArray(results)) return [];

    return results.map((r) => ({
      uorAddress: r["?s"],
      label: r["?label"] || r["?s"],
      nodeType: r["?nodeType"] || "unknown",
      properties: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncState: "local" as const,
    }));
  },

  // ── Edge operations ─────────────────────────────────────────────────────

  async putEdge(
    subject: string,
    predicate: string,
    object: string,
    graphIri: string = DEFAULT_GRAPH,
    metadata?: Record<string, unknown>
  ): Promise<KGEdge> {
    const edge: KGEdge = {
      id: `${subject}|${predicate}|${object}`,
      subject,
      predicate,
      object,
      graphIri,
      metadata,
      createdAt: Date.now(),
      syncState: "local",
    };
    await edgeToQuad(edge);
    emit();
    return edge;
  },

  async getEdge(id: string): Promise<KGEdge | undefined> {
    const parts = id.split("|");
    if (parts.length < 3) return undefined;
    const [subject, predicate, object] = parts;

    const results = await sparqlQuery(`
      ASK { <${subject}> <${predicate}> <${object}> }
    `);

    if (results === true) {
      return {
        id,
        subject,
        predicate,
        object,
        graphIri: DEFAULT_GRAPH,
        createdAt: Date.now(),
        syncState: "local",
      };
    }
    return undefined;
  },

  async queryBySubject(subjectAddr: string): Promise<KGEdge[]> {
    const results = await sparqlQuery(`
      SELECT ?p ?o WHERE { <${subjectAddr}> ?p ?o }
    `) as SparqlBinding[];

    if (!Array.isArray(results)) return [];

    return results.map((r) => ({
      id: `${subjectAddr}|${r["?p"]}|${r["?o"]}`,
      subject: subjectAddr,
      predicate: r["?p"],
      object: r["?o"],
      graphIri: DEFAULT_GRAPH,
      createdAt: Date.now(),
      syncState: "local" as const,
    }));
  },

  async queryByPredicate(predicate: string): Promise<KGEdge[]> {
    const results = await sparqlQuery(`
      SELECT ?s ?o WHERE { ?s <${predicate}> ?o }
    `) as SparqlBinding[];

    if (!Array.isArray(results)) return [];

    return results.map((r) => ({
      id: `${r["?s"]}|${predicate}|${r["?o"]}`,
      subject: r["?s"],
      predicate,
      object: r["?o"],
      graphIri: DEFAULT_GRAPH,
      createdAt: Date.now(),
      syncState: "local" as const,
    }));
  },

  async queryByObject(objectAddr: string): Promise<KGEdge[]> {
    const results = await sparqlQuery(`
      SELECT ?s ?p WHERE { ?s ?p <${objectAddr}> }
    `) as SparqlBinding[];

    if (!Array.isArray(results)) return [];

    return results.map((r) => ({
      id: `${r["?s"]}|${r["?p"]}|${objectAddr}`,
      subject: r["?s"],
      predicate: r["?p"],
      object: objectAddr,
      graphIri: DEFAULT_GRAPH,
      createdAt: Date.now(),
      syncState: "local" as const,
    }));
  },

  // ── Derivation operations ───────────────────────────────────────────────

  async putDerivation(d: KGDerivation): Promise<void> {
    const store = await getStore();
    const ox = await getOx();
    const s = nn(ox, `${UOR_NS}derivation/${d.derivationId}`);
    const g = nn(ox, `${UOR_NS}graph/derivations`);

    store.add(ox.quad(s, nn(ox, `${UOR_NS}derivation/resultIri`), nn(ox, d.resultIri), g));
    store.add(ox.quad(s, nn(ox, `${UOR_NS}derivation/canonicalTerm`), lit(ox, d.canonicalTerm), g));
    store.add(ox.quad(s, nn(ox, `${UOR_NS}derivation/epistemicGrade`), lit(ox, d.epistemicGrade), g));
    emit();
  },

  async getDerivation(derivationId: string): Promise<KGDerivation | undefined> {
    const results = await sparqlQuery(`
      SELECT ?resultIri ?canonicalTerm ?grade WHERE {
        <${UOR_NS}derivation/${derivationId}> <${UOR_NS}derivation/resultIri> ?resultIri .
        OPTIONAL { <${UOR_NS}derivation/${derivationId}> <${UOR_NS}derivation/canonicalTerm> ?canonicalTerm }
        OPTIONAL { <${UOR_NS}derivation/${derivationId}> <${UOR_NS}derivation/epistemicGrade> ?grade }
      } LIMIT 1
    `) as SparqlBinding[];

    if (!Array.isArray(results) || results.length === 0) return undefined;

    const r = results[0];
    return {
      derivationId,
      resultIri: r["?resultIri"],
      canonicalTerm: r["?canonicalTerm"] || "",
      originalTerm: "",
      epistemicGrade: r["?grade"] || "C",
      metrics: {},
      createdAt: Date.now(),
      syncState: "local",
    };
  },

  async getAllDerivations(): Promise<KGDerivation[]> {
    const results = await sparqlQuery(`
      SELECT ?s ?resultIri ?canonicalTerm ?grade WHERE {
        ?s <${UOR_NS}derivation/resultIri> ?resultIri .
        OPTIONAL { ?s <${UOR_NS}derivation/canonicalTerm> ?canonicalTerm }
        OPTIONAL { ?s <${UOR_NS}derivation/epistemicGrade> ?grade }
      }
    `) as SparqlBinding[];

    if (!Array.isArray(results)) return [];

    return results.map((r) => ({
      derivationId: r["?s"].replace(`${UOR_NS}derivation/`, ""),
      resultIri: r["?resultIri"],
      canonicalTerm: r["?canonicalTerm"] || "",
      originalTerm: "",
      epistemicGrade: r["?grade"] || "C",
      metrics: {},
      createdAt: Date.now(),
      syncState: "local" as const,
    }));
  },

  // ── Stats ─────────────────────────────────────────────────────────────

  async getStats(): Promise<KGStats> {
    const store = await getStore();
    const nodes = await this.getAllNodes();
    const derivations = await this.getAllDerivations();

    return {
      nodeCount: nodes.length,
      edgeCount: store.size ?? 0,
      derivationCount: derivations.length,
      lastUpdated: Date.now(),
    };
  },

  /**
   * Get the raw quad count from Oxigraph.
   */
  async quadCount(): Promise<number> {
    const store = await getStore();
    return store.size ?? 0;
  },

  // ── Raw SPARQL ────────────────────────────────────────────────────────

  /**
   * Execute a raw SPARQL 1.1 query. Full spec support via Oxigraph.
   */
  sparqlQuery,

  /**
   * Execute a SPARQL UPDATE.
   */
  sparqlUpdate,

  // ── Persistence ───────────────────────────────────────────────────────

  /**
   * Serialize entire store as N-Quads and persist to IndexedDB.
   */
  async flush(): Promise<number> {
    const store = await getStore();
    try {
      const nquads = store.dump({ format: "application/n-quads" });
      await idbSet("oxigraph-nquads", nquads);
      const size = store.size ?? 0;
      console.log(`[oxigraph] Flushed ${size} quads to IndexedDB`);
      return size;
    } catch (e) {
      console.warn("[oxigraph] Flush failed:", e);
      return 0;
    }
  },

  /**
   * Load N-Quads string into the store.
   */
  async loadNQuads(nquads: string): Promise<number> {
    const store = await getStore();
    const before = store.size ?? 0;
    store.load(nquads, { format: "application/n-quads" });
    const after = store.size ?? 0;
    emit();
    return after - before;
  },

  /**
   * Export entire store as N-Quads string.
   */
  async dumpNQuads(): Promise<string> {
    const store = await getStore();
    return store.dump({ format: "application/n-quads" });
  },

  /**
   * Add a raw quad directly.
   */
  async addQuad(subject: string, predicate: string, object: string, graph?: string): Promise<void> {
    const store = await getStore();
    const ox = await getOx();
    const g = graph ? nn(ox, graph) : nn(ox, DEFAULT_GRAPH);

    // Determine if object is IRI or literal
    const obj = object.startsWith("http://") || object.startsWith("https://") || object.startsWith("urn:")
      ? nn(ox, object)
      : lit(ox, object);

    store.add(ox.quad(nn(ox, subject), nn(ox, predicate), obj, g));
    emit();
  },

  /**
   * Clear all quads.
   */
  async clear(): Promise<void> {
    storeInstance = null;
    const ox = await getOx();
    storeInstance = new (ox as any).Store();
    await idbSet("oxigraph-nquads", "");
    emit();
  },
};
