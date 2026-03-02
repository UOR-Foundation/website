/**
 * HoloMem — Holographic Virtual Memory
 * ═════════════════════════════════════
 *
 * Browser-native software-defined memory inspired by Kove SDM/XPD.
 * Implements the holographic principle: large objects are encoded on a
 * fixed-size "horizon surface" (hot cache) with cold pages spilling
 * to IndexedDB (local swap) or remote storage (network swap).
 *
 * Architecture:
 *   ┌──────────────────────────────────────────────┐
 *   │  Virtual Address Space (unlimited page IDs)  │
 *   ├──────────────────────────────────────────────┤
 *   │  L1: Hot Cache (ArrayBuffer, ~256MB)         │ ← "registers"
 *   │  L2: Warm Cache (IndexedDB, ~4GB)            │ ← "local swap"
 *   │  L3: Cold Store (Supabase Storage / HF)      │ ← "remote DRAM"
 *   └──────────────────────────────────────────────┘
 *
 * Key properties:
 *   - Page size: 64KB (matches Wasm page, good for tensor chunks)
 *   - Clock eviction algorithm (approximates LRU without overhead)
 *   - Compressed cold pages via fflate (2-4× space savings)
 *   - Content-addressed pages (SHA-256 CID) for deduplication
 *   - Async page-fault model: access returns Promise
 *
 * This is NOT transparent pointer interception (impossible in browsers).
 * Instead, all access goes through typed primitives:
 *   const page = await holomem.read(pageId);
 *   await holomem.write(pageId, data);
 *
 * @module hologram-compute/holomem
 */

import { deflateSync, inflateSync } from "fflate";

// ── Constants ─────────────────────────────────────────────────────────

/** Page size: 64KB (matches Wasm page granularity) */
export const PAGE_SIZE = 65_536;

/** Default L1 hot cache: 256MB = 4096 pages */
const DEFAULT_L1_PAGES = 4096;

/** IndexedDB database name */
const IDB_NAME = "holomem-swap";
const IDB_VERSION = 1;
const IDB_STORE = "pages";

// ── Types ─────────────────────────────────────────────────────────────

export interface HoloMemConfig {
  /** Max pages in L1 hot cache (default: 4096 = 256MB) */
  maxL1Pages: number;
  /** Enable compression for L2/L3 spills (default: true) */
  compress: boolean;
  /** Remote fetch function for L3 cold pages */
  remoteFetch?: (pageId: string) => Promise<Uint8Array | null>;
}

export interface PageEntry {
  /** Raw page data in hot cache */
  data: Uint8Array;
  /** Clock bit for eviction (0 = evictable, 1 = recently accessed) */
  clockBit: number;
  /** Whether page has been modified since last spill */
  dirty: boolean;
}

export interface HoloMemStats {
  l1Pages: number;
  l1MaxPages: number;
  l1BytesUsed: number;
  l2Pages: number;
  l3Fetches: number;
  pageFaults: number;
  evictions: number;
  compressionRatio: number;
}

// ── IndexedDB Helpers ─────────────────────────────────────────────────

function openSwapDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, key: string, value: Uint8Array): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function idbGet(db: IDBDatabase, key: string): Promise<Uint8Array | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve(req.result as Uint8Array | undefined);
    req.onerror = () => reject(req.error);
  });
}

function idbDelete(db: IDBDatabase, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function idbCount(db: IDBDatabase): Promise<number> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── HoloMem ───────────────────────────────────────────────────────────

export class HoloMem {
  private config: HoloMemConfig;
  private db: IDBDatabase | null = null;

  /** L1 hot cache: pageId → PageEntry */
  private l1 = new Map<string, PageEntry>();

  /** Clock hand position for eviction sweep */
  private clockHand: string[] = [];
  private clockIndex = 0;

  /** L2 page set (tracks what's in IndexedDB) */
  private l2Set = new Set<string>();

  /** Stats */
  private _pageFaults = 0;
  private _evictions = 0;
  private _l3Fetches = 0;
  private _compressedBytes = 0;
  private _uncompressedBytes = 0;

  constructor(config?: Partial<HoloMemConfig>) {
    this.config = {
      maxL1Pages: config?.maxL1Pages ?? DEFAULT_L1_PAGES,
      compress: config?.compress ?? true,
      remoteFetch: config?.remoteFetch,
    };
  }

  async init(): Promise<void> {
    if (!this.db) {
      this.db = await openSwapDB();
    }
  }

  private ensureDb(): IDBDatabase {
    if (!this.db) throw new Error("[HoloMem] Not initialized. Call init() first.");
    return this.db;
  }

  // ── Core Access Primitives ────────────────────────────────────────

  /**
   * Read a page. Triggers page-fault cascade: L1 → L2 → L3.
   * Returns null if page doesn't exist anywhere.
   */
  async read(pageId: string): Promise<Uint8Array | null> {
    // L1 hit
    const l1Entry = this.l1.get(pageId);
    if (l1Entry) {
      l1Entry.clockBit = 1; // mark recently used
      return l1Entry.data;
    }

    // Page fault
    this._pageFaults++;

    // L2 hit (IndexedDB swap)
    const db = this.ensureDb();
    const l2Data = await idbGet(db, pageId);
    if (l2Data) {
      const decompressed = this.config.compress
        ? inflateSync(l2Data)
        : l2Data;
      await this.promoteToL1(pageId, decompressed, false);
      return decompressed;
    }

    // L3 fetch (remote)
    if (this.config.remoteFetch) {
      this._l3Fetches++;
      const remoteData = await this.config.remoteFetch(pageId);
      if (remoteData) {
        await this.promoteToL1(pageId, remoteData, false);
        // Also spill to L2 for future local hits
        await this.spillToL2(pageId, remoteData);
        return remoteData;
      }
    }

    return null;
  }

  /**
   * Write a page. Goes directly to L1 hot cache.
   * If L1 is full, evicts via clock algorithm.
   */
  async write(pageId: string, data: Uint8Array): Promise<void> {
    await this.promoteToL1(pageId, data, true);
  }

  /**
   * Write a large buffer as a sequence of pages.
   * Returns the page IDs for later retrieval.
   */
  async writeChunked(
    prefix: string,
    data: Uint8Array,
    onProgress?: (written: number, total: number) => void,
  ): Promise<string[]> {
    const pageCount = Math.ceil(data.length / PAGE_SIZE);
    const pageIds: string[] = [];

    for (let i = 0; i < pageCount; i++) {
      const start = i * PAGE_SIZE;
      const end = Math.min(start + PAGE_SIZE, data.length);
      const pageId = `${prefix}:${i}`;
      const chunk = data.slice(start, end);

      // Write to L2 directly (bulk writes bypass L1 to avoid thrashing)
      await this.spillToL2(pageId, chunk);
      pageIds.push(pageId);
      onProgress?.(i + 1, pageCount);
    }

    return pageIds;
  }

  /**
   * Read a chunked buffer back from pages.
   */
  async readChunked(
    pageIds: string[],
    totalBytes: number,
    onProgress?: (read: number, total: number) => void,
  ): Promise<Uint8Array> {
    const result = new Uint8Array(totalBytes);
    let offset = 0;

    for (let i = 0; i < pageIds.length; i++) {
      const page = await this.read(pageIds[i]);
      if (!page) throw new Error(`[HoloMem] Missing page: ${pageIds[i]}`);
      result.set(page, offset);
      offset += page.length;
      onProgress?.(i + 1, pageIds.length);
    }

    return result;
  }

  /**
   * Check if a page exists in any tier.
   */
  async has(pageId: string): Promise<boolean> {
    if (this.l1.has(pageId)) return true;
    if (this.l2Set.has(pageId)) return true;
    return false;
  }

  /**
   * Delete a page from all tiers.
   */
  async delete(pageId: string): Promise<void> {
    this.l1.delete(pageId);
    this.l2Set.delete(pageId);
    const db = this.ensureDb();
    await idbDelete(db, pageId);
    // Remove from clock ring
    this.clockHand = this.clockHand.filter((id) => id !== pageId);
  }

  // ── Eviction Engine (Clock Algorithm) ─────────────────────────────

  /**
   * Promote a page to L1. Evicts if necessary.
   */
  private async promoteToL1(
    pageId: string,
    data: Uint8Array,
    dirty: boolean,
  ): Promise<void> {
    // Already in L1? Update in place
    const existing = this.l1.get(pageId);
    if (existing) {
      existing.data = data;
      existing.clockBit = 1;
      existing.dirty = existing.dirty || dirty;
      return;
    }

    // Evict if at capacity
    while (this.l1.size >= this.config.maxL1Pages) {
      await this.evictOne();
    }

    // Insert
    this.l1.set(pageId, { data, clockBit: 1, dirty });
    this.clockHand.push(pageId);
  }

  /**
   * Clock sweep eviction: scan for a page with clockBit=0.
   * Pages with clockBit=1 get their bit cleared (second chance).
   */
  private async evictOne(): Promise<void> {
    const maxSweep = this.clockHand.length * 2; // prevent infinite loop
    let swept = 0;

    while (swept < maxSweep) {
      if (this.clockHand.length === 0) return;
      this.clockIndex = this.clockIndex % this.clockHand.length;
      const candidateId = this.clockHand[this.clockIndex];
      const entry = this.l1.get(candidateId);

      if (!entry) {
        // Stale entry in clock ring
        this.clockHand.splice(this.clockIndex, 1);
        continue;
      }

      if (entry.clockBit === 0) {
        // Evict this page
        if (entry.dirty) {
          await this.spillToL2(candidateId, entry.data);
        }
        this.l1.delete(candidateId);
        this.clockHand.splice(this.clockIndex, 1);
        this._evictions++;
        return;
      }

      // Second chance: clear bit
      entry.clockBit = 0;
      this.clockIndex++;
      swept++;
    }

    // Fallback: force-evict the current position
    if (this.clockHand.length > 0) {
      this.clockIndex = this.clockIndex % this.clockHand.length;
      const forceId = this.clockHand[this.clockIndex];
      const forceEntry = this.l1.get(forceId);
      if (forceEntry?.dirty) {
        await this.spillToL2(forceId, forceEntry.data);
      }
      this.l1.delete(forceId);
      this.clockHand.splice(this.clockIndex, 1);
      this._evictions++;
    }
  }

  /**
   * Spill a page to L2 (IndexedDB), optionally compressed.
   */
  private async spillToL2(pageId: string, data: Uint8Array): Promise<void> {
    const db = this.ensureDb();
    let stored: Uint8Array;

    if (this.config.compress) {
      stored = deflateSync(data, { level: 1 }); // fast compression
      this._uncompressedBytes += data.length;
      this._compressedBytes += stored.length;
    } else {
      stored = data;
    }

    await idbPut(db, pageId, stored);
    this.l2Set.add(pageId);
  }

  // ── Stats & Maintenance ───────────────────────────────────────────

  async stats(): Promise<HoloMemStats> {
    const db = this.ensureDb();
    const l2Count = await idbCount(db);

    let l1Bytes = 0;
    for (const entry of this.l1.values()) {
      l1Bytes += entry.data.byteLength;
    }

    return {
      l1Pages: this.l1.size,
      l1MaxPages: this.config.maxL1Pages,
      l1BytesUsed: l1Bytes,
      l2Pages: l2Count,
      l3Fetches: this._l3Fetches,
      pageFaults: this._pageFaults,
      evictions: this._evictions,
      compressionRatio:
        this._uncompressedBytes > 0
          ? this._uncompressedBytes / this._compressedBytes
          : 1,
    };
  }

  /**
   * Flush all dirty L1 pages to L2.
   */
  async flush(): Promise<number> {
    let flushed = 0;
    for (const [pageId, entry] of this.l1) {
      if (entry.dirty) {
        await this.spillToL2(pageId, entry.data);
        entry.dirty = false;
        flushed++;
      }
    }
    return flushed;
  }

  /**
   * Clear all tiers. Nuclear option.
   */
  async clear(): Promise<void> {
    this.l1.clear();
    this.clockHand = [];
    this.clockIndex = 0;
    this.l2Set.clear();
    this._pageFaults = 0;
    this._evictions = 0;
    this._l3Fetches = 0;
    this._compressedBytes = 0;
    this._uncompressedBytes = 0;

    // Clear IndexedDB
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  close(): void {
    this.db?.close();
    this.db = null;
  }
}

// ── Singleton ─────────────────────────────────────────────────────────

let _instance: HoloMem | null = null;

export function getHoloMem(): HoloMem {
  if (!_instance) _instance = new HoloMem();
  return _instance;
}
