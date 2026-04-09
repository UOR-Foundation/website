/**
 * UOR Knowledge Graph — Oxigraph WASM Adapter.
 * ═════════════════════════════════════════════════════════════════
 *
 * THE SINGLE CANONICAL KNOWLEDGE GRAPH ENGINE.
 *
 * Wraps Oxigraph (Rust/WASM) in-memory quad store. Full SPARQL 1.1 via native engine.
 * Persistence: serializes the entire store as N-Quads to IndexedDB on flush(),
 * and restores on init().
 *
 * All node/edge/derivation operations go through this store.
 * There is NO other graph instance in the system.
 *
 * @version 2.0.0 — Sole canonical graph engine
 */

import type { KGNode, KGEdge, KGDerivation, KGStats } from "./types";

// ── Lazy Oxigraph loader (WASM) ────────────────────────────────────────────

let oxModule: typeof import("oxigraph") | null = null;
let storeInstance: any | null = null;

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

// ── Node → Quad conversion ─────────────────────────────────────────────────

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
  if (node.totalStratum !== undefined) {
    store.add(ox.quad(s, nn(ox, `${UOR_NS}schema/totalStratum`),
      lit(ox, String(node.totalStratum)), g));
  }
  if (node.canonicalForm) {
    store.add(ox.quad(s, nn(ox, `${UOR_NS}schema/canonicalForm`),
      lit(ox, node.canonicalForm), g));
  }
  // Sync state
  store.add(ox.quad(s, nn(ox, `${UOR_NS}meta/syncState`), lit(ox, node.syncState), g));
  store.add(ox.quad(s, nn(ox, `${UOR_NS}meta/createdAt`), lit(ox, String(node.createdAt)), g));
  store.add(ox.quad(s, nn(ox, `${UOR_NS}meta/updatedAt`), lit(ox, String(node.updatedAt)), g));

  // Properties as JSON blob
  if (Object.keys(node.properties).length > 0) {
    store.add(ox.quad(s, nn(ox, `${UOR_NS}meta/properties`),
      lit(ox, JSON.stringify(node.properties)), g));
  }
}

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

// ── Quad → Node reconstruction ──────────────────────────────────────────────

function bindingToNode(r: SparqlBinding, uorAddress: string): KGNode {
  return {
    uorAddress,
    label: r["?label"] || uorAddress,
    nodeType: r["?nodeType"] || "unknown",
    rdfType: r["?rdfType"],
    qualityScore: r["?qualityScore"] ? parseFloat(r["?qualityScore"]) : undefined,
    stratumLevel: (r["?stratumLevel"] as "low" | "medium" | "high") || undefined,
    totalStratum: r["?totalStratum"] ? parseInt(r["?totalStratum"]) : undefined,
    uorCid: r["?cid"],
    canonicalForm: r["?canonicalForm"],
    properties: r["?props"] ? (() => { try { return JSON.parse(r["?props"]); } catch { return {}; } })() : {},
    createdAt: r["?createdAt"] ? parseInt(r["?createdAt"]) : Date.now(),
    updatedAt: r["?updatedAt"] ? parseInt(r["?updatedAt"]) : Date.now(),
    syncState: (r["?syncState"] as "local" | "synced" | "pending") || "local",
  };
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
    // Remove existing quads for this node first (upsert)
    await this.removeNode(node.uorAddress);
    await nodeToQuads(node);
    emit();
  },

  async putNodes(nodes: KGNode[]): Promise<void> {
    for (const node of nodes) {
      await this.removeNode(node.uorAddress);
      await nodeToQuads(node);
    }
    emit();
  },

  async getNode(uorAddress: string): Promise<KGNode | undefined> {
    const results = await sparqlQuery(`
      SELECT ?label ?nodeType ?rdfType ?qualityScore ?stratumLevel ?totalStratum ?cid ?canonicalForm ?props ?syncState ?createdAt ?updatedAt WHERE {
        <${uorAddress}> <http://www.w3.org/2000/01/rdf-schema#label> ?label .
        OPTIONAL { <${uorAddress}> <${UOR_NS}schema/nodeType> ?nodeType }
        OPTIONAL { <${uorAddress}> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> ?rdfType }
        OPTIONAL { <${uorAddress}> <${UOR_NS}schema/qualityScore> ?qualityScore }
        OPTIONAL { <${uorAddress}> <${UOR_NS}schema/stratumLevel> ?stratumLevel }
        OPTIONAL { <${uorAddress}> <${UOR_NS}schema/totalStratum> ?totalStratum }
        OPTIONAL { <${uorAddress}> <${UOR_NS}u/cid> ?cid }
        OPTIONAL { <${uorAddress}> <${UOR_NS}schema/canonicalForm> ?canonicalForm }
        OPTIONAL { <${uorAddress}> <${UOR_NS}meta/properties> ?props }
        OPTIONAL { <${uorAddress}> <${UOR_NS}meta/syncState> ?syncState }
        OPTIONAL { <${uorAddress}> <${UOR_NS}meta/createdAt> ?createdAt }
        OPTIONAL { <${uorAddress}> <${UOR_NS}meta/updatedAt> ?updatedAt }
      } LIMIT 1
    `) as SparqlBinding[];

    if (!Array.isArray(results) || results.length === 0) return undefined;
    return bindingToNode(results[0], uorAddress);
  },

  async getAllNodes(): Promise<KGNode[]> {
    const results = await sparqlQuery(`
      SELECT DISTINCT ?s ?label ?nodeType ?rdfType ?qualityScore ?stratumLevel ?totalStratum ?cid ?canonicalForm ?props ?syncState ?createdAt ?updatedAt WHERE {
        ?s <http://www.w3.org/2000/01/rdf-schema#label> ?label .
        OPTIONAL { ?s <${UOR_NS}schema/nodeType> ?nodeType }
        OPTIONAL { ?s <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> ?rdfType }
        OPTIONAL { ?s <${UOR_NS}schema/qualityScore> ?qualityScore }
        OPTIONAL { ?s <${UOR_NS}schema/stratumLevel> ?stratumLevel }
        OPTIONAL { ?s <${UOR_NS}schema/totalStratum> ?totalStratum }
        OPTIONAL { ?s <${UOR_NS}u/cid> ?cid }
        OPTIONAL { ?s <${UOR_NS}schema/canonicalForm> ?canonicalForm }
        OPTIONAL { ?s <${UOR_NS}meta/properties> ?props }
        OPTIONAL { ?s <${UOR_NS}meta/syncState> ?syncState }
        OPTIONAL { ?s <${UOR_NS}meta/createdAt> ?createdAt }
        OPTIONAL { ?s <${UOR_NS}meta/updatedAt> ?updatedAt }
      }
    `) as SparqlBinding[];

    if (!Array.isArray(results)) return [];
    return results.map((r) => bindingToNode(r, r["?s"]));
  },

  async getNodesByType(nodeType: string): Promise<KGNode[]> {
    const results = await sparqlQuery(`
      SELECT DISTINCT ?s ?label ?rdfType ?qualityScore ?stratumLevel ?props ?syncState ?createdAt ?updatedAt WHERE {
        ?s <${UOR_NS}schema/nodeType> "${nodeType}" .
        ?s <http://www.w3.org/2000/01/rdf-schema#label> ?label .
        OPTIONAL { ?s <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> ?rdfType }
        OPTIONAL { ?s <${UOR_NS}schema/qualityScore> ?qualityScore }
        OPTIONAL { ?s <${UOR_NS}schema/stratumLevel> ?stratumLevel }
        OPTIONAL { ?s <${UOR_NS}meta/properties> ?props }
        OPTIONAL { ?s <${UOR_NS}meta/syncState> ?syncState }
        OPTIONAL { ?s <${UOR_NS}meta/createdAt> ?createdAt }
        OPTIONAL { ?s <${UOR_NS}meta/updatedAt> ?updatedAt }
      }
    `) as SparqlBinding[];

    if (!Array.isArray(results)) return [];
    return results.map((r) => bindingToNode({ ...r, "?nodeType": nodeType }, r["?s"]));
  },

  async getNodesByStratum(level: "low" | "medium" | "high"): Promise<KGNode[]> {
    const results = await sparqlQuery(`
      SELECT DISTINCT ?s ?label ?nodeType ?rdfType ?qualityScore ?props ?syncState ?createdAt ?updatedAt WHERE {
        ?s <${UOR_NS}schema/stratumLevel> "${level}" .
        ?s <http://www.w3.org/2000/01/rdf-schema#label> ?label .
        OPTIONAL { ?s <${UOR_NS}schema/nodeType> ?nodeType }
        OPTIONAL { ?s <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> ?rdfType }
        OPTIONAL { ?s <${UOR_NS}schema/qualityScore> ?qualityScore }
        OPTIONAL { ?s <${UOR_NS}meta/properties> ?props }
        OPTIONAL { ?s <${UOR_NS}meta/syncState> ?syncState }
        OPTIONAL { ?s <${UOR_NS}meta/createdAt> ?createdAt }
        OPTIONAL { ?s <${UOR_NS}meta/updatedAt> ?updatedAt }
      }
    `) as SparqlBinding[];

    if (!Array.isArray(results)) return [];
    return results.map((r) => bindingToNode({ ...r, "?stratumLevel": level }, r["?s"]));
  },

  async getNodesBySyncState(state: "local" | "synced" | "pending"): Promise<KGNode[]> {
    const results = await sparqlQuery(`
      SELECT DISTINCT ?s ?label ?nodeType ?rdfType ?qualityScore ?stratumLevel ?props ?createdAt ?updatedAt WHERE {
        ?s <${UOR_NS}meta/syncState> "${state}" .
        ?s <http://www.w3.org/2000/01/rdf-schema#label> ?label .
        OPTIONAL { ?s <${UOR_NS}schema/nodeType> ?nodeType }
        OPTIONAL { ?s <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> ?rdfType }
        OPTIONAL { ?s <${UOR_NS}schema/qualityScore> ?qualityScore }
        OPTIONAL { ?s <${UOR_NS}schema/stratumLevel> ?stratumLevel }
        OPTIONAL { ?s <${UOR_NS}meta/properties> ?props }
        OPTIONAL { ?s <${UOR_NS}meta/createdAt> ?createdAt }
        OPTIONAL { ?s <${UOR_NS}meta/updatedAt> ?updatedAt }
      }
    `) as SparqlBinding[];

    if (!Array.isArray(results)) return [];
    return results.map((r) => bindingToNode({ ...r, "?syncState": state }, r["?s"]));
  },

  async removeNode(uorAddress: string): Promise<void> {
    try {
      await sparqlUpdate(`
        DELETE WHERE { <${uorAddress}> ?p ?o }
      `);
    } catch {
      // Node may not exist — that's fine
    }
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

  async putEdges(edges: KGEdge[]): Promise<void> {
    for (const edge of edges) {
      await edgeToQuad(edge);
    }
    emit();
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

  async getAllEdges(): Promise<KGEdge[]> {
    const results = await sparqlQuery(`
      SELECT ?s ?p ?o WHERE {
        GRAPH ?g { ?s ?p ?o }
        FILTER(?p != <http://www.w3.org/1999/02/22-rdf-syntax-ns#type>)
        FILTER(?p != <http://www.w3.org/2000/01/rdf-schema#label>)
        FILTER(!STRSTARTS(STR(?p), "${UOR_NS}schema/"))
        FILTER(!STRSTARTS(STR(?p), "${UOR_NS}meta/"))
        FILTER(!STRSTARTS(STR(?p), "${UOR_NS}derivation/"))
        FILTER(!STRSTARTS(STR(?p), "${UOR_NS}u/"))
      }
    `) as SparqlBinding[];

    if (!Array.isArray(results)) return [];

    return results.map((r) => ({
      id: `${r["?s"]}|${r["?p"]}|${r["?o"]}`,
      subject: r["?s"],
      predicate: r["?p"],
      object: r["?o"],
      graphIri: DEFAULT_GRAPH,
      createdAt: Date.now(),
      syncState: "local" as const,
    }));
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

  async removeEdge(id: string): Promise<void> {
    const parts = id.split("|");
    if (parts.length < 3) return;
    const [subject, predicate, object] = parts;
    try {
      await sparqlUpdate(`
        DELETE DATA { <${subject}> <${predicate}> <${object}> }
      `);
    } catch {
      // Edge may not exist
    }
    emit();
  },

  async removeEdgesBySubject(subjectAddr: string): Promise<void> {
    try {
      await sparqlUpdate(`
        DELETE WHERE { <${subjectAddr}> ?p ?o }
      `);
    } catch {
      // No edges
    }
    emit();
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
    store.add(ox.quad(s, nn(ox, `${UOR_NS}derivation/originalTerm`), lit(ox, d.originalTerm), g));
    store.add(ox.quad(s, nn(ox, `${UOR_NS}meta/createdAt`), lit(ox, String(d.createdAt)), g));
    store.add(ox.quad(s, nn(ox, `${UOR_NS}meta/syncState`), lit(ox, d.syncState), g));
    if (Object.keys(d.metrics).length > 0) {
      store.add(ox.quad(s, nn(ox, `${UOR_NS}derivation/metrics`), lit(ox, JSON.stringify(d.metrics)), g));
    }
    emit();
  },

  async getDerivation(derivationId: string): Promise<KGDerivation | undefined> {
    const results = await sparqlQuery(`
      SELECT ?resultIri ?canonicalTerm ?grade ?originalTerm ?metrics ?createdAt ?syncState WHERE {
        <${UOR_NS}derivation/${derivationId}> <${UOR_NS}derivation/resultIri> ?resultIri .
        OPTIONAL { <${UOR_NS}derivation/${derivationId}> <${UOR_NS}derivation/canonicalTerm> ?canonicalTerm }
        OPTIONAL { <${UOR_NS}derivation/${derivationId}> <${UOR_NS}derivation/epistemicGrade> ?grade }
        OPTIONAL { <${UOR_NS}derivation/${derivationId}> <${UOR_NS}derivation/originalTerm> ?originalTerm }
        OPTIONAL { <${UOR_NS}derivation/${derivationId}> <${UOR_NS}derivation/metrics> ?metrics }
        OPTIONAL { <${UOR_NS}derivation/${derivationId}> <${UOR_NS}meta/createdAt> ?createdAt }
        OPTIONAL { <${UOR_NS}derivation/${derivationId}> <${UOR_NS}meta/syncState> ?syncState }
      } LIMIT 1
    `) as SparqlBinding[];

    if (!Array.isArray(results) || results.length === 0) return undefined;

    const r = results[0];
    return {
      derivationId,
      resultIri: r["?resultIri"],
      canonicalTerm: r["?canonicalTerm"] || "",
      originalTerm: r["?originalTerm"] || "",
      epistemicGrade: r["?grade"] || "C",
      metrics: r["?metrics"] ? (() => { try { return JSON.parse(r["?metrics"]); } catch { return {}; } })() : {},
      createdAt: r["?createdAt"] ? parseInt(r["?createdAt"]) : Date.now(),
      syncState: (r["?syncState"] as "local" | "synced" | "pending") || "local",
    };
  },

  async getDerivationsByResult(resultIri: string): Promise<KGDerivation[]> {
    const results = await sparqlQuery(`
      SELECT ?s ?canonicalTerm ?grade ?originalTerm ?metrics ?createdAt ?syncState WHERE {
        ?s <${UOR_NS}derivation/resultIri> <${resultIri}> .
        OPTIONAL { ?s <${UOR_NS}derivation/canonicalTerm> ?canonicalTerm }
        OPTIONAL { ?s <${UOR_NS}derivation/epistemicGrade> ?grade }
        OPTIONAL { ?s <${UOR_NS}derivation/originalTerm> ?originalTerm }
        OPTIONAL { ?s <${UOR_NS}derivation/metrics> ?metrics }
        OPTIONAL { ?s <${UOR_NS}meta/createdAt> ?createdAt }
        OPTIONAL { ?s <${UOR_NS}meta/syncState> ?syncState }
      }
    `) as SparqlBinding[];

    if (!Array.isArray(results)) return [];

    return results.map((r) => ({
      derivationId: r["?s"].replace(`${UOR_NS}derivation/`, ""),
      resultIri,
      canonicalTerm: r["?canonicalTerm"] || "",
      originalTerm: r["?originalTerm"] || "",
      epistemicGrade: r["?grade"] || "C",
      metrics: r["?metrics"] ? (() => { try { return JSON.parse(r["?metrics"]); } catch { return {}; } })() : {},
      createdAt: r["?createdAt"] ? parseInt(r["?createdAt"]) : Date.now(),
      syncState: (r["?syncState"] as "local" | "synced" | "pending") || "local",
    }));
  },

  async getAllDerivations(): Promise<KGDerivation[]> {
    const results = await sparqlQuery(`
      SELECT ?s ?resultIri ?canonicalTerm ?grade ?originalTerm ?metrics ?createdAt ?syncState WHERE {
        ?s <${UOR_NS}derivation/resultIri> ?resultIri .
        OPTIONAL { ?s <${UOR_NS}derivation/canonicalTerm> ?canonicalTerm }
        OPTIONAL { ?s <${UOR_NS}derivation/epistemicGrade> ?grade }
        OPTIONAL { ?s <${UOR_NS}derivation/originalTerm> ?originalTerm }
        OPTIONAL { ?s <${UOR_NS}derivation/metrics> ?metrics }
        OPTIONAL { ?s <${UOR_NS}meta/createdAt> ?createdAt }
        OPTIONAL { ?s <${UOR_NS}meta/syncState> ?syncState }
      }
    `) as SparqlBinding[];

    if (!Array.isArray(results)) return [];

    return results.map((r) => ({
      derivationId: r["?s"].replace(`${UOR_NS}derivation/`, ""),
      resultIri: r["?resultIri"],
      canonicalTerm: r["?canonicalTerm"] || "",
      originalTerm: r["?originalTerm"] || "",
      epistemicGrade: r["?grade"] || "C",
      metrics: r["?metrics"] ? (() => { try { return JSON.parse(r["?metrics"]); } catch { return {}; } })() : {},
      createdAt: r["?createdAt"] ? parseInt(r["?createdAt"]) : Date.now(),
      syncState: "local" as const,
    }));
  },

  // ── Graph Traversal ─────────────────────────────────────────────────────

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

        const outEdges = await this.queryBySubject(addr);
        for (const edge of outEdges) {
          resultEdges.push(edge);
          if (!visited.has(edge.object)) {
            nextFrontier.push(edge.object);
          }
        }

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
    return this.getAllEdges();
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

  async quadCount(): Promise<number> {
    const store = await getStore();
    return store.size ?? 0;
  },

  // ── Blueprint Operations ──────────────────────────────────────────────

  async putBlueprint(address: string, blueprint: string, rdfType?: string): Promise<void> {
    const store = await getStore();
    const ox = await getOx();
    const s = nn(ox, address);
    const g = nn(ox, `${UOR_NS}graph/blueprints`);

    store.add(ox.quad(s, nn(ox, `${UOR_NS}blueprint/content`), lit(ox, blueprint), g));
    store.add(ox.quad(s, nn(ox, "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
      nn(ox, rdfType || `${UOR_NS}schema/Blueprint`), g));
    store.add(ox.quad(s, nn(ox, `${UOR_NS}meta/updatedAt`), lit(ox, String(Date.now())), g));
    emit();
  },

  async getBlueprint(address: string): Promise<string | undefined> {
    const results = await sparqlQuery(`
      SELECT ?content WHERE {
        <${address}> <${UOR_NS}blueprint/content> ?content .
      } LIMIT 1
    `) as SparqlBinding[];

    if (!Array.isArray(results) || results.length === 0) return undefined;
    return results[0]["?content"];
  },

  async getAllBlueprints(): Promise<Array<{ address: string; blueprint: string }>> {
    const results = await sparqlQuery(`
      SELECT ?s ?content WHERE {
        ?s <${UOR_NS}blueprint/content> ?content .
      }
    `) as SparqlBinding[];

    if (!Array.isArray(results)) return [];
    return results.map((r) => ({
      address: r["?s"],
      blueprint: r["?content"],
    }));
  },

  // ── JSON-LD Export/Import ─────────────────────────────────────────────

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

    for (const edge of edges) {
      const subjectNode = graph.find((n) => n["@id"] === edge.subject);
      if (subjectNode) {
        const existing = subjectNode[edge.predicate as keyof typeof subjectNode];
        if (existing) {
          if (Array.isArray(existing)) {
            (existing as string[]).push(edge.object);
          } else {
            (subjectNode as any)[edge.predicate] = [existing as string, edge.object];
          }
        } else {
          (subjectNode as any)[edge.predicate] = edge.object;
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

  // ── Raw SPARQL ────────────────────────────────────────────────────────

  sparqlQuery,
  sparqlUpdate,

  // ── Persistence ───────────────────────────────────────────────────────

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

  async loadNQuads(nquads: string): Promise<number> {
    const store = await getStore();
    const before = store.size ?? 0;
    store.load(nquads, { format: "application/n-quads" });
    const after = store.size ?? 0;
    emit();
    return after - before;
  },

  async dumpNQuads(): Promise<string> {
    const store = await getStore();
    return store.dump({ format: "application/n-quads" });
  },

  async addQuad(subject: string, predicate: string, object: string, graph?: string): Promise<void> {
    const store = await getStore();
    const ox = await getOx();
    const g = graph ? nn(ox, graph) : nn(ox, DEFAULT_GRAPH);

    const obj = object.startsWith("http://") || object.startsWith("https://") || object.startsWith("urn:")
      ? nn(ox, object)
      : lit(ox, object);

    store.add(ox.quad(nn(ox, subject), nn(ox, predicate), obj, g));
    emit();
  },

  async clear(): Promise<void> {
    storeInstance = null;
    const ox = await getOx();
    storeInstance = new (ox as any).Store();
    await idbSet("oxigraph-nquads", "");
    emit();
  },
};
