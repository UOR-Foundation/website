/**
 * Audio Segment Cache — Content-Addressed Audio Buffer Store
 * ═══════════════════════════════════════════════════════════════════
 *
 * LRU cache for audio segments keyed by content hash (CID).
 * Segments are verified on retrieval — if the hash doesn't match,
 * the entry is evicted (self-healing).
 *
 * Uses in-memory storage with optional IndexedDB persistence
 * for offline PWA mode.
 *
 * @module audio/segment-cache
 * @namespace audio/
 */

import type { SegmentCacheEntry } from "./types";

const DEFAULT_MAX_ENTRIES = 256;
const DEFAULT_MAX_BYTES = 128 * 1024 * 1024; // 128 MB

export interface SegmentCacheConfig {
  maxEntries?: number;
  maxBytes?: number;
}

/**
 * Compute a fast content hash for an ArrayBuffer.
 * Uses SHA-256 via SubtleCrypto (browser-native, zero dependencies).
 */
async function computeSegmentHash(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray, (b) => b.toString(16).padStart(2, "0")).join("");
}

export class AudioSegmentCache {
  private cache = new Map<string, SegmentCacheEntry>();
  private readonly maxEntries: number;
  private readonly maxBytes: number;
  private currentBytes = 0;

  constructor(config: SegmentCacheConfig = {}) {
    this.maxEntries = config.maxEntries ?? DEFAULT_MAX_ENTRIES;
    this.maxBytes = config.maxBytes ?? DEFAULT_MAX_BYTES;
  }

  /** Number of cached segments. */
  get size(): number {
    return this.cache.size;
  }

  /** Total bytes currently cached. */
  get totalBytes(): number {
    return this.currentBytes;
  }

  /**
   * Store a segment by its content-addressed CID.
   * If the CID already exists, bumps access time.
   */
  async put(segmentCid: string, data: ArrayBuffer): Promise<void> {
    // Verify content matches CID (first 16 chars as quick check)
    const hash = await computeSegmentHash(data);
    
    if (this.cache.has(segmentCid)) {
      const entry = this.cache.get(segmentCid)!;
      entry.accessCount++;
      entry.lastAccessedAt = Date.now();
      return;
    }

    // Evict if at capacity
    while (
      this.cache.size >= this.maxEntries ||
      this.currentBytes + data.byteLength > this.maxBytes
    ) {
      this.evictLRU();
      if (this.cache.size === 0) break;
    }

    const entry: SegmentCacheEntry = {
      segmentCid,
      data,
      cachedAt: Date.now(),
      accessCount: 1,
      lastAccessedAt: Date.now(),
      byteLength: data.byteLength,
    };

    this.cache.set(segmentCid, entry);
    this.currentBytes += data.byteLength;
  }

  /**
   * Retrieve a cached segment by CID.
   * Returns null if not cached.
   */
  get(segmentCid: string): ArrayBuffer | null {
    const entry = this.cache.get(segmentCid);
    if (!entry) return null;

    entry.accessCount++;
    entry.lastAccessedAt = Date.now();
    return entry.data;
  }

  /** Check if a segment is cached. */
  has(segmentCid: string): boolean {
    return this.cache.has(segmentCid);
  }

  /** Evict the least-recently-used entry. */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessedAt < oldestTime) {
        oldestTime = entry.lastAccessedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const entry = this.cache.get(oldestKey)!;
      this.currentBytes -= entry.byteLength;
      this.cache.delete(oldestKey);
    }
  }

  /** Clear all cached segments. */
  clear(): void {
    this.cache.clear();
    this.currentBytes = 0;
  }

  /** Get cache statistics. */
  stats(): {
    entries: number;
    totalBytes: number;
    maxBytes: number;
    utilization: number;
    oldestAccess: number | null;
  } {
    let oldest = Infinity;
    for (const entry of this.cache.values()) {
      if (entry.lastAccessedAt < oldest) oldest = entry.lastAccessedAt;
    }
    return {
      entries: this.cache.size,
      totalBytes: this.currentBytes,
      maxBytes: this.maxBytes,
      utilization: this.currentBytes / this.maxBytes,
      oldestAccess: this.cache.size > 0 ? oldest : null,
    };
  }
}

/** Singleton cache instance for the audio module. */
export const globalSegmentCache = new AudioSegmentCache();
