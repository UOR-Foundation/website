/**
 * UOR Knowledge Graph — Backlink Index (Roam-inspired).
 *
 * Provides a reverse-index layer: given node B, efficiently answer
 * "what nodes link TO B?" with caching and TTL invalidation.
 */

import { localGraphStore } from "./local-store";
import type { KGEdge } from "./types";

export interface Backlink {
  /** UOR address of the source node */
  source: string;
  /** Edge predicate (schema:mentions, schema:hasColumn, etc.) */
  predicate: string;
  /** Human-readable label of the source node */
  label: string;
  /** Node type of the source */
  nodeType: string;
  /** When the edge was created */
  createdAt: number;
}

// ── In-memory cache with TTL ────────────────────────────────────────────────

const CACHE_TTL_MS = 30_000; // 30 seconds

interface CacheEntry {
  backlinks: Backlink[];
  cachedAt: number;
}

const cache = new Map<string, CacheEntry>();

/** Invalidate cache for a specific node or the entire cache */
export function invalidateBacklinks(address?: string): void {
  if (address) {
    cache.delete(address);
  } else {
    cache.clear();
  }
}

/**
 * Get all backlinks (incoming references) for a given node address.
 * Returns nodes that have edges pointing TO the target node.
 */
export async function getBacklinks(address: string): Promise<Backlink[]> {
  // Check cache
  const cached = cache.get(address);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.backlinks;
  }

  // Query all edges where object === address (incoming)
  const incomingEdges: KGEdge[] = await localGraphStore.queryByObject(address);

  // Resolve source node metadata
  const backlinks: Backlink[] = [];
  for (const edge of incomingEdges) {
    const sourceNode = await localGraphStore.getNode(edge.subject);
    backlinks.push({
      source: edge.subject,
      predicate: edge.predicate,
      label: sourceNode?.label || edge.subject.split("/").pop() || edge.subject.slice(-12),
      nodeType: sourceNode?.nodeType || "entity",
      createdAt: edge.createdAt,
    });
  }

  // Sort by recency
  backlinks.sort((a, b) => b.createdAt - a.createdAt);

  // Cache
  cache.set(address, { backlinks, cachedAt: Date.now() });

  return backlinks;
}

/**
 * Get backlink count without fetching full metadata (cheaper).
 */
export async function getBacklinkCount(address: string): Promise<number> {
  const cached = cache.get(address);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.backlinks.length;
  }
  const edges = await localGraphStore.queryByObject(address);
  return edges.length;
}

// ── Unlinked References ─────────────────────────────────────────────────────

export interface UnlinkedReference {
  nodeAddress: string;
  nodeLabel: string;
  nodeType: string;
  contextSnippet: string;
}

/**
 * Find nodes whose text content mentions `topic` but lack an explicit edge.
 * Scans all nodes for fuzzy matches, filters out already-linked ones.
 */
export async function findUnlinkedReferences(
  topic: string,
  targetAddress: string,
  limit = 10,
): Promise<UnlinkedReference[]> {
  if (!topic || topic.length < 2) return [];

  const allNodes = await localGraphStore.getAllNodes();
  const linkedEdges = await localGraphStore.queryByObject(targetAddress);
  const linkedSources = new Set(linkedEdges.map(e => e.subject));

  const needle = topic.toLowerCase();
  const results: UnlinkedReference[] = [];

  for (const node of allNodes) {
    if (node.uorAddress === targetAddress) continue;
    if (linkedSources.has(node.uorAddress)) continue;
    if (node.nodeType === "entity" || node.nodeType === "column") continue;

    // Check label and text properties for mentions
    const text = [
      node.label,
      typeof node.properties?.text === "string" ? node.properties.text : "",
      Array.isArray(node.properties?.blocks)
        ? (node.properties.blocks as Array<{ content: string }>).map(b => b.content).join(" ")
        : "",
    ].join(" ").toLowerCase();

    if (text.includes(needle)) {
      // Extract context snippet around the mention
      const idx = text.indexOf(needle);
      const start = Math.max(0, idx - 40);
      const end = Math.min(text.length, idx + needle.length + 40);
      const snippet = (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");

      results.push({
        nodeAddress: node.uorAddress,
        nodeLabel: node.label,
        nodeType: node.nodeType,
        contextSnippet: snippet,
      });

      if (results.length >= limit) break;
    }
  }

  return results;
}
