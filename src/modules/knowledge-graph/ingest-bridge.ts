/**
 * UOR Knowledge Graph — Ingestion Bridge.
 *
 * Connects the Universal Ingestion Pipeline to the local Knowledge Graph.
 * Every ingested file/paste/URL becomes a graph node with typed edges.
 *
 * Key features:
 *  - Tabular data: each column becomes a sub-node (shared across files)
 *  - Text: extracts entities (URLs, emails, dates, currencies, proper nouns) → shared entity nodes
 *  - Entity/column nodes use SHA-256 UOR content-addressing (not FNV)
 *  - Processing lineage mapped to KG derivations
 *  - Duplicate detection is free: same UOR address = same node
 */

import { localGraphStore, type KGNode, type KGEdge, type KGDerivation } from "./local-store";
import { sha256hex } from "@/lib/crypto";
import type { GuestContextItem } from "@/modules/sovereign-vault/lib/guest-context";

// ── Entity extraction (lightweight, zero-dependency NLP) ────────────────────

const URL_RE = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PROPER_NOUN_RE = /\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){0,3}\b/g;
const DATE_RE = /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s+\d{4}\b/gi;
const CURRENCY_RE = /[$€£¥₹]\s?\d{1,3}(?:[,.\s]\d{3})*(?:\.\d{2})?\b/g;

interface ExtractedEntity {
  value: string;
  type: "url" | "email" | "entity" | "date" | "currency";
}

const COMMON_WORDS = new Set([
  "The", "This", "That", "These", "Those", "When", "Where", "What",
  "How", "But", "And", "For", "Not", "Are", "Was", "Were", "Has",
  "Had", "Have", "Will", "Would", "Could", "Should", "May", "Might",
]);

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

  // Dates
  for (const match of text.matchAll(DATE_RE)) {
    addUnique(match[0], "date");
  }

  // Currencies
  for (const match of text.matchAll(CURRENCY_RE)) {
    addUnique(match[0], "currency");
  }

  // Proper nouns (scan first 5000 chars for performance)
  const sample = text.slice(0, 5000);
  for (const match of sample.matchAll(PROPER_NOUN_RE)) {
    if (!COMMON_WORDS.has(match[0])) {
      addUnique(match[0], "entity");
    }
  }

  return entities.slice(0, 80); // Cap at 80 entities per document
}

// ── UOR Content-Addressed Entity/Column Nodes ───────────────────────────────

async function entityAddress(type: string, value: string): Promise<string> {
  const normalized = `entity:${type}:${value.toLowerCase().trim()}`;
  const hex = await sha256hex(normalized);
  return `urn:uor:entity:${hex.slice(0, 16)}`;
}

async function columnAddress(columnName: string): Promise<string> {
  const normalized = `column:${columnName.toLowerCase().trim()}`;
  const hex = await sha256hex(normalized);
  return `urn:uor:column:${hex.slice(0, 16)}`;
}

// ── Entity type → RDF mapping ───────────────────────────────────────────────

function entityTypeToRdf(type: string): string {
  switch (type) {
    case "url": return "schema:URL";
    case "email": return "schema:ContactPoint";
    case "date": return "schema:Date";
    case "currency": return "schema:MonetaryAmount";
    case "entity": return "schema:Thing";
    default: return "schema:Thing";
  }
}

function entityPredicate(type: string): string {
  switch (type) {
    case "url": return "schema:mentions";
    case "email": return "schema:contactPoint";
    case "date": return "schema:temporal";
    case "currency": return "schema:monetaryAmount";
    default: return "schema:mentions";
  }
}

function mapSourceToRdfType(source: string, mimeType?: string): string {
  switch (source) {
    case "file":
      if (mimeType?.includes("csv") || mimeType?.includes("spreadsheet")) return "schema:Dataset";
      if (mimeType?.includes("json")) return "schema:DataFeed";
      if (mimeType?.includes("image")) return "schema:ImageObject";
      if (mimeType?.includes("pdf")) return "schema:DigitalDocument";
      if (mimeType?.includes("yaml") || mimeType?.includes("xml")) return "schema:DataFeed";
      return "schema:MediaObject";
    case "paste": return "schema:TextDigitalDocument";
    case "url": return "schema:WebPage";
    case "workspace": return "schema:Workspace";
    case "folder": return "schema:Collection";
    default: return "schema:Thing";
  }
}

// ── Lineage → Epistemic Grade ───────────────────────────────────────────────

function lineageStageToGrade(stage: string): string {
  switch (stage) {
    case "extract": return "A";
    case "uor-identity": return "A";
    case "structured-parse": return "A";
    case "text-quality": return "B";
    case "uor-identity-fallback": return "C";
    case "receive": return "B";
    case "complete": return "A";
    default: return "B";
  }
}

// ── Main Bridge ─────────────────────────────────────────────────────────────

export const ingestBridge = {
  /**
   * Add an ingested item to the Knowledge Graph.
   * Creates the primary node + typed edges to columns/entities.
   * Entity and column nodes use SHA-256 UOR content-addressing.
   */
  async addToGraph(item: GuestContextItem): Promise<{
    nodeCount: number;
    edgeCount: number;
    derivationCount: number;
  }> {
    const now = Date.now();
    const nodeAddr = item.uorAddress || `urn:uor:local:${item.id}`;

    // Check if node already exists (dedup via UOR address)
    const existing = await localGraphStore.getNode(nodeAddr);
    if (existing) {
      return { nodeCount: 0, edgeCount: 0, derivationCount: 0 };
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
    let derivationCount = 0;

    // ── Tabular data: create column sub-nodes ─────────────────────────────

    if (item.structuredData?.columns) {
      const columnAddresses: { col: string; addr: string; dtype: string }[] = [];

      for (const col of item.structuredData.columns) {
        const colAddr = await columnAddress(col);
        const dtype = item.structuredData.dtypes?.[col] || "unknown";
        columnAddresses.push({ col, addr: colAddr, dtype });

        // Column node (shared across files with same column name)
        nodesToPut.push({
          uorAddress: colAddr,
          label: col,
          nodeType: "column",
          rdfType: "schema:Column",
          properties: {
            columnName: col,
            dataType: dtype,
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

      // Create sameDataType edges between columns sharing types
      const typeGroups = new Map<string, string[]>();
      for (const { addr, dtype } of columnAddresses) {
        if (dtype !== "unknown" && dtype !== "null") {
          const group = typeGroups.get(dtype) || [];
          group.push(addr);
          typeGroups.set(dtype, group);
        }
      }
      for (const [, addrs] of typeGroups) {
        if (addrs.length >= 2) {
          // Link first to second only (avoid quadratic edges)
          edgesToPut.push({
            id: `${addrs[0]}|schema:sameDataType|${addrs[1]}`,
            subject: addrs[0],
            predicate: "schema:sameDataType",
            object: addrs[1],
            graphIri: "urn:uor:local",
            createdAt: now,
            syncState: "local",
          });
        }
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
        const entAddr = await entityAddress(entity.type, entity.value);

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

        edgesToPut.push({
          id: `${nodeAddr}|${entityPredicate(entity.type)}|${entAddr}`,
          subject: nodeAddr,
          predicate: entityPredicate(entity.type),
          object: entAddr,
          graphIri: "urn:uor:local",
          createdAt: now,
          syncState: "local",
        });
      }
    }

    // ── Processing lineage → KG derivations ──────────────────────────────

    if (item.lineage && Array.isArray(item.lineage)) {
      for (const entry of item.lineage) {
        const stage = (entry as { stage: string; timestamp: string; detail?: string }).stage;
        const detail = (entry as { stage: string; timestamp: string; detail?: string }).detail || "";
        const derivationId = `${nodeAddr}:lineage:${stage}`;

        const derivation: KGDerivation = {
          derivationId,
          resultIri: nodeAddr,
          canonicalTerm: `${stage}:${detail}`,
          originalTerm: `${item.filename}:${stage}`,
          epistemicGrade: lineageStageToGrade(stage),
          metrics: {
            stage,
            detail,
            timestamp: (entry as { timestamp: string }).timestamp,
          },
          createdAt: now,
          syncState: "local",
        };

        await localGraphStore.putDerivation(derivation);
        derivationCount++;
      }
    }

    // ── Commit all to IndexedDB ───────────────────────────────────────────

    await localGraphStore.putNodes(nodesToPut);
    await localGraphStore.putEdges(edgesToPut);

    return { nodeCount: nodesToPut.length, edgeCount: edgesToPut.length, derivationCount };
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
