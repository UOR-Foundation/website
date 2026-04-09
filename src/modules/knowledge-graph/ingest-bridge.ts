/**
 * UOR Knowledge Graph — Ingestion Bridge.
 *
 * Connects the Universal Ingestion Pipeline to the local Knowledge Graph.
 * Every ingested file/paste/URL becomes a graph node with typed edges.
 *
 * Key features:
 *  - Tabular data: each column becomes a sub-node (shared across files)
 *  - Text: extracts entities (URLs, emails, proper nouns) → shared entity nodes
 *  - Duplicate detection is free: same UOR address = same node
 *  - Structured data columns enable cross-file queries
 */

import { localGraphStore, type KGNode, type KGEdge } from "./local-store";
import type { GuestContextItem } from "@/modules/sovereign-vault/lib/guest-context";
import type { StructuredData } from "@/modules/sovereign-vault/lib/structured-extractor";

// ── Entity extraction (lightweight, zero-dependency NLP) ────────────────────

const URL_RE = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PROPER_NOUN_RE = /\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){0,3}\b/g;

interface ExtractedEntity {
  value: string;
  type: "url" | "email" | "entity";
}

function extractEntities(text: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];
  const seen = new Set<string>();

  const addUnique = (value: string, type: ExtractedEntity["type"]) => {
    const key = `${type}:${value.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      entities.push({ value, type });
    }
  };

  // URLs
  for (const match of text.matchAll(URL_RE)) {
    addUnique(match[0], "url");
  }

  // Emails
  for (const match of text.matchAll(EMAIL_RE)) {
    addUnique(match[0], "email");
  }

  // Proper nouns (limited to first 2000 chars for performance)
  const sample = text.slice(0, 2000);
  for (const match of sample.matchAll(PROPER_NOUN_RE)) {
    // Filter out common English words that start sentences
    const commonWords = new Set(["The", "This", "That", "These", "Those", "When", "Where", "What", "How", "But", "And", "For", "Not"]);
    if (!commonWords.has(match[0])) {
      addUnique(match[0], "entity");
    }
  }

  return entities.slice(0, 50); // Cap at 50 entities per document
}

// ── Entity address (simple deterministic hash for entity nodes) ─────────────

function entityAddress(type: string, value: string): string {
  // Deterministic address for shared entity nodes
  const normalized = `${type}:${value.toLowerCase().trim()}`;
  // Simple FNV-1a hash → hex string as address
  let hash = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return `urn:uor:entity:${hash.toString(16).padStart(8, "0")}`;
}

// ── Column address (deterministic for shared column nodes) ──────────────────

function columnAddress(columnName: string): string {
  const normalized = columnName.toLowerCase().trim();
  let hash = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return `urn:uor:column:${hash.toString(16).padStart(8, "0")}`;
}

// ── Main Bridge ─────────────────────────────────────────────────────────────

export const ingestBridge = {
  /**
   * Add an ingested item to the Knowledge Graph.
   * Creates the primary node + typed edges to columns/entities.
   */
  async addToGraph(item: GuestContextItem): Promise<{
    nodeCount: number;
    edgeCount: number;
  }> {
    const now = Date.now();
    const nodeAddr = item.uorAddress || `urn:uor:local:${item.id}`;

    // Check if node already exists (dedup via UOR address)
    const existing = await localGraphStore.getNode(nodeAddr);
    if (existing) {
      return { nodeCount: 0, edgeCount: 0 };
    }

    // ── Primary node ──────────────────────────────────────────────────────

    const primaryNode: KGNode = {
      uorAddress: nodeAddr,
      uorCid: item.uorCid,
      label: item.filename,
      nodeType: item.source,
      rdfType: mapSourceToRdfType(item.source, item.mimeType),
      qualityScore: item.qualityScore,
      properties: {
        filename: item.filename,
        mimeType: item.mimeType,
        size: item.size,
        format: item.format,
        addedAt: item.addedAt,
      },
      createdAt: now,
      updatedAt: now,
      syncState: "local",
    };

    const nodesToPut: KGNode[] = [primaryNode];
    const edgesToPut: KGEdge[] = [];

    // ── Tabular data: create column sub-nodes ─────────────────────────────

    if (item.structuredData?.columns) {
      for (const col of item.structuredData.columns) {
        const colAddr = columnAddress(col);
        const dtype = item.structuredData.dtypes?.[col];

        // Column node (shared across files with same column name)
        nodesToPut.push({
          uorAddress: colAddr,
          label: col,
          nodeType: "column",
          rdfType: "schema:Column",
          properties: {
            columnName: col,
            dataType: dtype || "unknown",
          },
          createdAt: now,
          updatedAt: now,
          syncState: "local",
        });

        // Edge: file → hasColumn → column
        edgesToPut.push({
          id: `${nodeAddr}|schema:hasColumn|${colAddr}`,
          subject: nodeAddr,
          predicate: "schema:hasColumn",
          object: colAddr,
          graphIri: "urn:uor:local",
          createdAt: now,
          syncState: "local",
        });
      }

      // Add row count as property
      if (item.structuredData.rowCount) {
        primaryNode.properties.rowCount = item.structuredData.rowCount;
      }
    }

    // ── Text: extract entities → shared entity nodes ──────────────────────

    if (item.text && item.source !== "workspace" && item.source !== "folder") {
      const entities = extractEntities(item.text);

      for (const entity of entities) {
        const entAddr = entityAddress(entity.type, entity.value);

        nodesToPut.push({
          uorAddress: entAddr,
          label: entity.value,
          nodeType: "entity",
          rdfType: entityTypeToRdf(entity.type),
          properties: {
            entityType: entity.type,
            value: entity.value,
          },
          createdAt: now,
          updatedAt: now,
          syncState: "local",
        });

        const predicate = entity.type === "url" ? "schema:mentions"
          : entity.type === "email" ? "schema:contactPoint"
          : "schema:mentions";

        edgesToPut.push({
          id: `${nodeAddr}|${predicate}|${entAddr}`,
          subject: nodeAddr,
          predicate,
          object: entAddr,
          graphIri: "urn:uor:local",
          createdAt: now,
          syncState: "local",
        });
      }
    }

    // ── Commit all to IndexedDB ───────────────────────────────────────────

    await localGraphStore.putNodes(nodesToPut);
    await localGraphStore.putEdges(edgesToPut);

    return { nodeCount: nodesToPut.length, edgeCount: edgesToPut.length };
  },

  /**
   * Remove an item and its exclusive edges from the graph.
   */
  async removeFromGraph(uorAddress: string): Promise<void> {
    await localGraphStore.removeEdgesBySubject(uorAddress);
    await localGraphStore.removeNode(uorAddress);
  },

  /**
   * Get graph connections for an item — what it links to and what links to it.
   */
  async getConnections(uorAddress: string): Promise<{
    outgoing: KGEdge[];
    incoming: KGEdge[];
  }> {
    const [outgoing, incoming] = await Promise.all([
      localGraphStore.queryBySubject(uorAddress),
      localGraphStore.queryByObject(uorAddress),
    ]);
    return { outgoing, incoming };
  },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function mapSourceToRdfType(source: string, mimeType?: string): string {
  switch (source) {
    case "file":
      if (mimeType?.includes("csv") || mimeType?.includes("spreadsheet")) return "schema:Dataset";
      if (mimeType?.includes("json")) return "schema:DataFeed";
      if (mimeType?.includes("image")) return "schema:ImageObject";
      if (mimeType?.includes("pdf")) return "schema:DigitalDocument";
      return "schema:MediaObject";
    case "paste": return "schema:TextDigitalDocument";
    case "url": return "schema:WebPage";
    case "workspace": return "schema:Workspace";
    case "folder": return "schema:Collection";
    default: return "schema:Thing";
  }
}

function entityTypeToRdf(type: string): string {
  switch (type) {
    case "url": return "schema:URL";
    case "email": return "schema:ContactPoint";
    case "entity": return "schema:Thing";
    default: return "schema:Thing";
  }
}
