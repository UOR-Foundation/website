/**
 * UNS Cache — Content-Addressed Edge Cache
 *
 * A read-through LRU cache in front of UNS Store.
 *
 * Zero-staleness guarantee: cache keys are canonical IDs (SHA-256
 * of content). A cache HIT is always correct because canonical ID X
 * maps to the exact bytes that produced it — by definition.
 *
 * No TTL eviction: content-addressed entries never go stale.
 * LRU eviction by total size is the only eviction policy.
 *
 * @see store: namespace — UOR object storage
 * @see u: namespace — canonical identity (two-address model)
 */

import type { UnsObjectStore } from "./object-store";

// ── Types ───────────────────────────────────────────────────────────────────

/** Cache entry in the LRU list. */
interface CacheEntry {
  canonicalId: string;
  bytes: Uint8Array;
  sizeBytes: number;
}

/** Cache statistics. */
export interface CacheStats {
  hits: number;
  misses: number;
  sizeBytes: number;
  entries: number;
}

// ── UNS Cache ───────────────────────────────────────────────────────────────

export class UnsCache {
  /** LRU ordered map: most recently used at end. */
  private readonly lru = new Map<string, CacheEntry>();
  private readonly maxBytes: number;
  private currentBytes = 0;
  private hitCount = 0;
  private missCount = 0;

  constructor(maxBytes: number) {
    this.maxBytes = maxBytes;
  }

  /**
   * Get bytes by canonical ID. On miss, fetch from origin and cache.
   *
   * @returns { bytes, hit } or null if not in origin either.
   */
  async get(
    canonicalId: string,
    origin: UnsObjectStore
  ): Promise<{ bytes: Uint8Array; hit: boolean } | null> {
    // Check cache
    const cached = this.lru.get(canonicalId);
    if (cached) {
      this.hitCount++;
      // Move to end (most recently used)
      this.lru.delete(canonicalId);
      this.lru.set(canonicalId, cached);
      return { bytes: new Uint8Array(cached.bytes), hit: true };
    }

    // Cache miss — fetch from origin
    this.missCount++;
    const result = await origin.get(canonicalId);
    if (!result) return null;

    // Populate cache
    this.insert(canonicalId, result.bytes);

    return { bytes: new Uint8Array(result.bytes), hit: false };
  }

  /**
   * Pre-fetch and cache an object by canonical ID.
   * Subsequent get() calls will be cache HITs.
   */
  async warm(canonicalId: string, origin: UnsObjectStore): Promise<void> {
    if (this.lru.has(canonicalId)) return; // Already cached

    const result = await origin.get(canonicalId);
    if (result) {
      this.insert(canonicalId, result.bytes);
    }
  }

  /** Cache statistics. */
  stats(): CacheStats {
    return {
      hits: this.hitCount,
      misses: this.missCount,
      sizeBytes: this.currentBytes,
      entries: this.lru.size,
    };
  }

  /** Clear all cache state (for testing). */
  clear(): void {
    this.lru.clear();
    this.currentBytes = 0;
    this.hitCount = 0;
    this.missCount = 0;
  }

  // ── Private ─────────────────────────────────────────────────────────────

  /** Insert into LRU cache, evicting oldest entries if over capacity. */
  private insert(canonicalId: string, bytes: Uint8Array): void {
    const sizeBytes = bytes.length;

    // Evict LRU entries until there's room
    while (this.currentBytes + sizeBytes > this.maxBytes && this.lru.size > 0) {
      const oldest = this.lru.keys().next().value;
      if (oldest === undefined) break;
      const entry = this.lru.get(oldest)!;
      this.currentBytes -= entry.sizeBytes;
      this.lru.delete(oldest);
    }

    // Don't cache if single entry exceeds max
    if (sizeBytes > this.maxBytes) return;

    this.lru.set(canonicalId, {
      canonicalId,
      bytes: new Uint8Array(bytes),
      sizeBytes,
    });
    this.currentBytes += sizeBytes;
  }
}
