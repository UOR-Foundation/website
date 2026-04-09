/**
 * UOR Knowledge Graph — Ingestion Bridge.
 *
 * Connects the Universal Ingestion Pipeline to the local Knowledge Graph.
 * Every ingested file/paste/URL becomes a graph node with typed edges.
 *
 * UOR Integration Points:
 *   - Entity nodes: singleProofHash({ @type, value }) → IPv6 address
 *   - Column nodes: singleProofHash({ @type, name, dtype }) → IPv6 address
 *   - Dataset nodes: IPv6 address from pipeline Stage 5
 *   - Verification: verifySingleProof() on retrieval
 *
 * All node keys are IPv6 ULA addresses (fd00:0075:6f72::/48).
 * Same content → same IPv6 → same node (free dedup).
 */

import { localGraphStore, type KGNode, type KGEdge, type KGDerivation } from "./local-store";
import { singleProofHash } from "@/lib/uor-canonical";
import type { GuestContextItem } from "@/modules/sovereign-vault/lib/guest-context";
import { decomposeToBlueprint, serializeBlueprint } from "./blueprint";

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

  for (const match of text.matchAll(URL_RE)) addUnique(match[0], "url");
  for (const match of text.matchAll(EMAIL_RE)) addUnique(match[0], "email");
  for (const match of text.matchAll(DATE_RE)) addUnique(match[0], "date");
  for (const match of text.matchAll(CURRENCY_RE)) addUnique(match[0], "currency");

  const sample = text.slice(0, 5000);
  for (const match of sample.matchAll(PROPER_NOUN_RE)) {
    if (!COMMON_WORDS.has(match[0])) {
      addUnique(match[0], "entity");
    }
  }

  return entities.slice(0, 80);
}

// ── UOR Content-Addressed Entity/Column Nodes (IPv6) ────────────────────────

const UOR_CONTEXT = "https://uor.foundation/contexts/uor-v1.jsonld";

/**
 * Generate a canonical IPv6 address for an entity node.
 * Uses singleProofHash() (URDNA2015 → SHA-256 → IPv6 ULA).
 */
async function entityAddress(type: string, value: string): Promise<string> {
  const proof = await singleProofHash({
    "@context": UOR_CONTEXT,
    "@type": entityTypeToRdf(type),
    "schema:value": value.toLowerCase().trim(),
    "schema:entityType": type,
  });
  return proof.ipv6Address["u:ipv6"];
}

/**
 * Generate a canonical IPv6 address for a column node.
 * Uses singleProofHash() (URDNA2015 → SHA-256 → IPv6 ULA).
 */
async function columnAddress(columnName: string, dtype?: string): Promise<string> {
  const proof = await singleProofHash({
    "@context": UOR_CONTEXT,
    "@type": "schema:Column",
    "schema:name": columnName.toLowerCase().trim(),
    "schema:dataType": dtype || "unknown",
  });
  return proof.ipv6Address["u:ipv6"];
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
   *
   * UOR ENCODE: Every entity/column node is content-addressed via
   * singleProofHash() → IPv6 ULA. Same content = same IPv6 = same node.
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

    // ── Tabular data: create column sub-nodes (UOR ENCODE per column) ────

    if (item.structuredData?.columns) {
      const columnAddresses: { col: string; addr: string; dtype: string }[] = [];

      for (const col of item.structuredData.columns) {
        const dtype = item.structuredData.dtypes?.[col] || "unknown";
        const colAddr = await columnAddress(col, dtype);
        columnAddresses.push({ col, addr: colAddr, dtype });

        // Column node (shared across files with same column name + type)
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

      if (item.structuredData.rowCount) {
        primaryNode.properties.rowCount = item.structuredData.rowCount;
      }
    }

    // ── Text: extract entities → shared entity nodes (UOR ENCODE per entity)

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

    // ── Generate and store blueprint (edge-defined node decomposition) ──
    try {
      const ground = await decomposeToBlueprint(nodeAddr);
      const serialized = serializeBlueprint(ground);
      await localGraphStore.putBlueprint(
        nodeAddr,
        serialized,
        primaryNode.rdfType
      );
    } catch {
      // Blueprint generation is best-effort; don't block ingestion
    }

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
