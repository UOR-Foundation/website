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
