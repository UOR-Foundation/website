/**
 * UOR Knowledge Graph — GrafeoDB WASM Adapter.
 * ═════════════════════════════════════════════════════════════════
 *
 * THE SINGLE CANONICAL KNOWLEDGE GRAPH ENGINE.
 *
 * Wraps GrafeoDB (Rust/WASM) — a multi-model graph database supporting
 * 6 query languages (GQL, Cypher, SPARQL, SQL, Gremlin, GraphQL).
 * Built-in IndexedDB persistence. Zero backend.
 *
 * Replaces Oxigraph — GrafeoDB supports SPARQL natively, so all existing
 * SPARQL queries continue to work unchanged. Additionally gains Cypher/GQL
 * for property graph patterns.
 *
 * @version 3.0.0 — GrafeoDB: multi-model, edge-to-cloud
 */

import type { KGNode, KGEdge, KGDerivation, KGStats } from "./types";

// ── Lazy GrafeoDB loader (WASM) ────────────────────────────────────────────

let dbInstance: any | null = null;

async function getDb(): Promise<any> {
  if (dbInstance) return dbInstance;
  const { GrafeoDB } = await import("@grafeo-db/web");
  dbInstance = await GrafeoDB.create({ persist: "uor-knowledge-graph" });

  console.log(`[GrafeoDB] Initialized with IndexedDB persistence`);
  return dbInstance;
}

// ── IRI / literal helpers ───────────────────────────────────────────────────

const UOR_NS = "https://uor.foundation/";
const DEFAULT_GRAPH = "urn:uor:local";

/** Escape a string for SPARQL literal inclusion */
function esc(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

/** Format a value as a SPARQL term (IRI or literal) */
function asTerm(value: string, isIri: boolean): string {
  return isIri ? `<${value}>` : `"${esc(value)}"`;
}

function isIri(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("urn:");
}

// ── Change listeners ────────────────────────────────────────────────────────

let listeners: Array<() => void> = [];
function emit() {
  listeners.forEach((fn) => fn());
}

// ── SPARQL execution ────────────────────────────────────────────────────────

export interface SparqlBinding {
  [variable: string]: string;
}

/**
 * Normalize GrafeoDB SPARQL SELECT results to our SparqlBinding format.
 * GrafeoDB may return results as arrays of objects or Maps.
 */
function normalizeBindings(raw: any): SparqlBinding[] {
  if (!raw) return [];

  // If it's an array, normalize each row
  if (Array.isArray(raw)) {
    return raw.map((row: any) => {
      const binding: SparqlBinding = {};
      if (row instanceof Map) {
        for (const [key, val] of row) {
          binding[`?${key}`] = val?.value ?? String(val ?? "");
        }
      } else if (row && typeof row === "object") {
        for (const [key, val] of Object.entries(row)) {
          const k = key.startsWith("?") ? key : `?${key}`;
          binding[k] = typeof val === "object" && val !== null && "value" in (val as any)
            ? (val as any).value
            : String(val ?? "");
        }
      }
      return binding;
    });
  }

  // If iterable (generator etc.), collect
  if (raw && typeof raw[Symbol.iterator] === "function") {
    return normalizeBindings([...raw]);
  }

  return [];
}

/**
 * Execute a raw SPARQL 1.1 query against the GrafeoDB store.
 * Supports SELECT, ASK, CONSTRUCT, DESCRIBE.
 */
export async function sparqlQuery(
  query: string
): Promise<SparqlBinding[] | boolean | Array<{ subject: string; predicate: string; object: string; graph?: string }>> {
  const db = await getDb();
  const result = await db.execute(query);

  // ASK → boolean
  if (typeof result === "boolean") return result;

  // SELECT → normalized bindings
  return normalizeBindings(result);
}

/**
 * Execute a SPARQL UPDATE (INSERT DATA, DELETE DATA, etc.).
 */
export async function sparqlUpdate(update: string): Promise<void> {
  const db = await getDb();
  await db.execute(update);
  emit();
}

// ── Quad-level insert (via SPARQL INSERT DATA) ──────────────────────────────

async function insertQuad(s: string, p: string, o: string, g: string, oIsLiteral: boolean = false): Promise<void> {
  const db = await getDb();
  const obj = oIsLiteral ? `"${esc(o)}"` : `<${o}>`;
  await db.execute(`INSERT DATA { GRAPH <${g}> { <${s}> <${p}> ${obj} } }`);
}

// ── Node → Quads ────────────────────────────────────────────────────────────

async function nodeToQuads(node: KGNode): Promise<void> {
  const s = node.uorAddress;
  const g = DEFAULT_GRAPH;

  await insertQuad(s, "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
    node.rdfType || `${UOR_NS}schema/Datum`, g);
  await insertQuad(s, "http://www.w3.org/2000/01/rdf-schema#label", node.label, g, true);
  await insertQuad(s, `${UOR_NS}schema/nodeType`, node.nodeType, g, true);

  if (node.qualityScore !== undefined) {
    await insertQuad(s, `${UOR_NS}schema/qualityScore`, String(node.qualityScore), g, true);
  }
  if (node.stratumLevel) {
    await insertQuad(s, `${UOR_NS}schema/stratumLevel`, node.stratumLevel, g, true);
  }
  if (node.uorCid) {
    await insertQuad(s, `${UOR_NS}u/cid`, node.uorCid, g, true);
  }
  if (node.totalStratum !== undefined) {
    await insertQuad(s, `${UOR_NS}schema/totalStratum`, String(node.totalStratum), g, true);
  }
  if (node.canonicalForm) {
    await insertQuad(s, `${UOR_NS}schema/canonicalForm`, node.canonicalForm, g, true);
  }
  await insertQuad(s, `${UOR_NS}meta/syncState`, node.syncState, g, true);
  await insertQuad(s, `${UOR_NS}meta/createdAt`, String(node.createdAt), g, true);
  await insertQuad(s, `${UOR_NS}meta/updatedAt`, String(node.updatedAt), g, true);

  if (Object.keys(node.properties).length > 0) {
    await insertQuad(s, `${UOR_NS}meta/properties`, JSON.stringify(node.properties), g, true);
  }
}

async function edgeToQuad(edge: KGEdge): Promise<void> {
  const g = edge.graphIri || DEFAULT_GRAPH;
  await insertQuad(edge.subject, edge.predicate, edge.object, g);

  if (edge.metadata && Object.keys(edge.metadata).length > 0) {
    const metaNode = `${edge.subject}|${edge.predicate}|${edge.object}|meta`;
    await insertQuad(metaNode, `${UOR_NS}meta/edgeMetadata`, JSON.stringify(edge.metadata), g, true);
  }
}

// ── Binding → Node ──────────────────────────────────────────────────────────

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

// ── Public GrafeoDB Store API ───────────────────────────────────────────────

export const grafeoStore = {
  async init(): Promise<{ quadCount: number }> {
    const db = await getDb();
    try {
      const result = await db.execute(`SELECT (COUNT(*) AS ?count) WHERE { ?s ?p ?o }`);
      const bindings = normalizeBindings(result);
      const count = bindings[0]?.["?count"] ? parseInt(bindings[0]["?count"]) : 0;
      return { quadCount: count };
    } catch {
      return { quadCount: 0 };
    }
  },

  subscribe(fn: () => void) {
    listeners.push(fn);
    return () => {
      listeners = listeners.filter((l) => l !== fn);
    };
  },

  // ── Node operations ─────────────────────────────────────────────────────

  async putNode(node: KGNode): Promise<void> {
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
      await sparqlUpdate(`DELETE WHERE { <${uorAddress}> ?p ?o }`);
    } catch {
      // Node may not exist
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

    const results = await sparqlQuery(`ASK { <${subject}> <${predicate}> <${object}> }`);

    if (results === true) {
      return { id, subject, predicate, object, graphIri: DEFAULT_GRAPH, createdAt: Date.now(), syncState: "local" };
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
    const results = await sparqlQuery(`SELECT ?p ?o WHERE { <${subjectAddr}> ?p ?o }`) as SparqlBinding[];
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
    const results = await sparqlQuery(`SELECT ?s ?o WHERE { ?s <${predicate}> ?o }`) as SparqlBinding[];
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
    const results = await sparqlQuery(`SELECT ?s ?p WHERE { ?s ?p <${objectAddr}> }`) as SparqlBinding[];
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
      await sparqlUpdate(`DELETE DATA { <${subject}> <${predicate}> <${object}> }`);
    } catch { /* Edge may not exist */ }
    emit();
  },

  async removeEdgesBySubject(subjectAddr: string): Promise<void> {
    try {
      await sparqlUpdate(`DELETE WHERE { <${subjectAddr}> ?p ?o }`);
    } catch { /* No edges */ }
    emit();
  },

  // ── Derivation operations ───────────────────────────────────────────────

  async putDerivation(d: KGDerivation): Promise<void> {
    const s = `${UOR_NS}derivation/${d.derivationId}`;
    const g = `${UOR_NS}graph/derivations`;

    await insertQuad(s, `${UOR_NS}derivation/resultIri`, d.resultIri, g);
    await insertQuad(s, `${UOR_NS}derivation/canonicalTerm`, d.canonicalTerm, g, true);
    await insertQuad(s, `${UOR_NS}derivation/epistemicGrade`, d.epistemicGrade, g, true);
    await insertQuad(s, `${UOR_NS}derivation/originalTerm`, d.originalTerm, g, true);
    await insertQuad(s, `${UOR_NS}meta/createdAt`, String(d.createdAt), g, true);
    await insertQuad(s, `${UOR_NS}meta/syncState`, d.syncState, g, true);
    if (Object.keys(d.metrics).length > 0) {
      await insertQuad(s, `${UOR_NS}derivation/metrics`, JSON.stringify(d.metrics), g, true);
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

  async traverseBFS(startAddr: string, maxDepth: number = 3): Promise<{ nodes: KGNode[]; edges: KGEdge[] }> {
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
          if (!visited.has(edge.object)) nextFrontier.push(edge.object);
        }
        const inEdges = await this.queryByObject(addr);
        for (const edge of inEdges) {
          resultEdges.push(edge);
          if (!visited.has(edge.subject)) nextFrontier.push(edge.subject);
        }
      }
      frontier = nextFrontier;
    }
    return { nodes: resultNodes, edges: resultEdges };
  },

  async queryPattern(subject?: string | null, predicate?: string | null, object?: string | null): Promise<KGEdge[]> {
    if (subject) {
      const edges = await this.queryBySubject(subject);
      return edges.filter((e) => (!predicate || e.predicate === predicate) && (!object || e.object === object));
    }
    if (predicate) {
      const edges = await this.queryByPredicate(predicate);
      return edges.filter((e) => (!subject || e.subject === subject) && (!object || e.object === object));
    }
    if (object) {
      const edges = await this.queryByObject(object);
      return edges.filter((e) => (!subject || e.subject === subject) && (!predicate || e.predicate === predicate));
    }
    return this.getAllEdges();
  },

  // ── Stats ─────────────────────────────────────────────────────────────

  async getStats(): Promise<KGStats> {
    const nodes = await this.getAllNodes();
    const derivations = await this.getAllDerivations();
    const qc = await this.quadCount();
    return { nodeCount: nodes.length, edgeCount: qc, derivationCount: derivations.length, lastUpdated: Date.now() };
  },

  async quadCount(): Promise<number> {
    try {
      const result = await sparqlQuery(`SELECT (COUNT(*) AS ?count) WHERE { ?s ?p ?o }`);
      const bindings = result as SparqlBinding[];
      return bindings[0]?.["?count"] ? parseInt(bindings[0]["?count"]) : 0;
    } catch {
      return 0;
    }
  },

  // ── Blueprint Operations ──────────────────────────────────────────────

  async putBlueprint(address: string, blueprint: string, rdfType?: string): Promise<void> {
    const g = `${UOR_NS}graph/blueprints`;
    await insertQuad(address, `${UOR_NS}blueprint/content`, blueprint, g, true);
    await insertQuad(address, "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
      rdfType || `${UOR_NS}schema/Blueprint`, g);
    await insertQuad(address, `${UOR_NS}meta/updatedAt`, String(Date.now()), g, true);
    emit();
  },

  async getBlueprint(address: string): Promise<string | undefined> {
    const results = await sparqlQuery(`
      SELECT ?content WHERE { <${address}> <${UOR_NS}blueprint/content> ?content . } LIMIT 1
    `) as SparqlBinding[];
    if (!Array.isArray(results) || results.length === 0) return undefined;
    return results[0]["?content"];
  },

  async getAllBlueprints(): Promise<Array<{ address: string; blueprint: string }>> {
    const results = await sparqlQuery(`
      SELECT ?s ?content WHERE { ?s <${UOR_NS}blueprint/content> ?content . }
    `) as SparqlBinding[];
    if (!Array.isArray(results)) return [];
    return results.map((r) => ({ address: r["?s"], blueprint: r["?content"] }));
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
            id: `${id}|${key}|${value}`, subject: id, predicate: key, object: value,
            graphIri: "urn:uor:imported", createdAt: now, syncState: "local",
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
        properties: props, createdAt: now, updatedAt: now, syncState: "local",
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
  // GrafeoDB handles persistence automatically via IndexedDB.
  // flush() is kept for API compatibility but is a no-op.

  async flush(): Promise<number> {
    const count = await this.quadCount();
    console.log(`[GrafeoDB] Auto-persisted (${count} quads in IndexedDB)`);
    return count;
  },

  async loadNQuads(nquads: string): Promise<number> {
    const beforeCount = await this.quadCount();
    // Parse N-Quads line by line and insert via SPARQL
    const lines = nquads.split("\n").filter(l => l.trim().length > 0 && !l.trim().startsWith("#"));
    for (const line of lines) {
      try {
        await sparqlUpdate(`INSERT DATA { ${line} }`);
      } catch {
        // Skip malformed lines
      }
    }
    const afterCount = await this.quadCount();
    emit();
    return afterCount - beforeCount;
  },

  async dumpNQuads(): Promise<string> {
    const results = await sparqlQuery(`
      SELECT ?s ?p ?o ?g WHERE { GRAPH ?g { ?s ?p ?o } }
    `) as SparqlBinding[];

    if (!Array.isArray(results)) return "";
    return results.map((r) => {
      const obj = isIri(r["?o"]) ? `<${r["?o"]}>` : `"${esc(r["?o"])}"`;
      return `<${r["?s"]}> <${r["?p"]}> ${obj} <${r["?g"]}> .`;
    }).join("\n");
  },

  async addQuad(subject: string, predicate: string, object: string, graph?: string): Promise<void> {
    const g = graph || DEFAULT_GRAPH;
    const oIsLit = !isIri(object);
    await insertQuad(subject, predicate, object, g, oIsLit);
    emit();
  },

  async clear(): Promise<void> {
    dbInstance = null;
    const { GrafeoDB } = await import("@grafeo-db/web");
    dbInstance = await GrafeoDB.create({ persist: "uor-knowledge-graph" });
    // Clear persisted data
    try {
      await dbInstance.execute(`DELETE WHERE { ?s ?p ?o }`);
    } catch { /* empty store */ }
    emit();
  },
};

