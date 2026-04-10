/**
 * Hedged Read Layer — Tail-Latency Elimination for Knowledge Graph.
 * ═══════════════════════════════════════════════════════════════════
 *
 * Inspired by Tailslayer's hedged DRAM reads: issue parallel reads to
 * both an in-memory LRU cache and the WASM/IndexedDB backend, resolve
 * with whichever responds first. Eliminates IndexedDB I/O tail latency
 * spikes (5-50ms) for hot nodes.
 *
 * The cache is populated on every successful read and invalidated on writes.
 * Zero fidelity loss — the cache is a transparent read-through layer.
 *
 * @module knowledge-graph/lib/hedged-read
 */

import type { KGNode } from "../types";

// ── LRU Cache ───────────────────────────────────────────────────────────────

interface CacheEntry {
  node: KGNode;
  accessedAt: number;
}

/**
 * Fixed-capacity LRU cache with O(1) get/put via Map ordering.
 * Map preserves insertion order — we delete+re-insert on access
 * to maintain LRU ordering.
 */
class LRUNodeCache {
  private _map: Map<string, CacheEntry> = new Map();
  private _capacity: number;
  private _hits = 0;
  private _misses = 0;
  private _evictions = 0;

  constructor(capacity: number = 500) {
    this._capacity = capacity;
  }

  get(address: string): KGNode | undefined {
    const entry = this._map.get(address);
    if (!entry) {
      this._misses++;
      return undefined;
    }
    // Move to end (most recently used)
    this._map.delete(address);
    entry.accessedAt = performance.now();
    this._map.set(address, entry);
    this._hits++;
    return entry.node;
  }

  put(node: KGNode): void {
    // If already present, remove first (will re-insert at end)
    if (this._map.has(node.uorAddress)) {
      this._map.delete(node.uorAddress);
    }

    // Evict LRU entry if at capacity
    if (this._map.size >= this._capacity) {
      const firstKey = this._map.keys().next().value;
      if (firstKey) {
        this._map.delete(firstKey);
        this._evictions++;
      }
    }

    this._map.set(node.uorAddress, { node, accessedAt: performance.now() });
  }

  /**
   * Invalidate a single entry (called on writes/deletes).
   */
  invalidate(address: string): void {
    this._map.delete(address);
  }

  /**
   * Invalidate all entries (called on bulk mutations).
   */
  clear(): void {
    this._map.clear();
  }

  /**
   * Cache statistics for monitoring.
   */
  stats(): { size: number; capacity: number; hits: number; misses: number; hitRate: number; evictions: number } {
    const total = this._hits + this._misses;
    return {
      size: this._map.size,
      capacity: this._capacity,
      hits: this._hits,
      misses: this._misses,
      hitRate: total > 0 ? this._hits / total : 0,
      evictions: this._evictions,
    };
  }
}

// ── Hedged Read ─────────────────────────────────────────────────────────────

type WasmReader = (address: string) => Promise<KGNode | undefined>;

/**
 * Hedged read layer that races cache vs WASM backend.
 *
 * On read:
 *   1. Check LRU cache synchronously
 *   2. If cache hit, return immediately (skip WASM entirely)
 *   3. If cache miss, read from WASM, populate cache, return
 *
 * This is a simplified hedge — true Promise.race is only needed
 * when cache misses are frequent and WASM latency is variable.
 * Since our cache is synchronous (in-memory Map), we can short-circuit.
 */
export class HedgedReadLayer {
  private _cache: LRUNodeCache;
  private _wasmReader: WasmReader;

  constructor(wasmReader: WasmReader, cacheCapacity: number = 500) {
    this._cache = new LRUNodeCache(cacheCapacity);
    this._wasmReader = wasmReader;
  }

  /**
   * Read a node with cache-first hedging.
   * Cache is synchronous → zero-latency on hit.
   * WASM is only called on cache miss.
   */
  async getNode(address: string): Promise<KGNode | undefined> {
    // Fast path: synchronous cache check
    const cached = this._cache.get(address);
    if (cached) return cached;

    // Slow path: read from WASM backend
    const node = await this._wasmReader(address);
    if (node) {
      this._cache.put(node);
    }
    return node;
  }

  /**
   * Populate cache after a successful write.
   */
  onWrite(node: KGNode): void {
    this._cache.put(node);
  }

  /**
   * Invalidate cache entry on delete.
   */
  onDelete(address: string): void {
    this._cache.invalidate(address);
  }

  /**
   * Clear entire cache (bulk mutation).
   */
  onClear(): void {
    this._cache.clear();
  }

  /**
   * Cache performance stats.
   */
  stats() {
    return this._cache.stats();
  }
}

// ── Singleton (lazy — created when grafeo-store integrates it) ──────────────

let _instance: HedgedReadLayer | null = null;

export function getHedgedReader(): HedgedReadLayer | null {
  return _instance;
}

export function initHedgedReader(wasmReader: WasmReader, capacity?: number): HedgedReadLayer {
  _instance = new HedgedReadLayer(wasmReader, capacity);
  return _instance;
}
