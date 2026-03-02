/**
 * HoloMem — Holographic Virtual Memory (v2)
 * ═══════════════════════════════════════════
 *
 * Browser-native software-defined memory inspired by Kove SDM/XPD.
 * Implements the holographic principle: large objects are encoded on a
 * fixed-size "horizon surface" (hot cache) with cold pages spilling
 * to OPFS (fast local swap) or remote storage (network swap).
 *
 * v2 upgrades (inspired by real-time 3D engine patterns):
 *   1. OPFS L2 — 5-10× faster than IndexedDB for random page I/O
 *   2. Object pool — zero-GC page buffers via pre-allocated Uint8Arrays
 *   3. Batch I/O — coalesced page reads/writes for sequential access
 *   4. Prefetch hints — predictive page loading for streaming models
 *
 * Architecture:
 *   ┌──────────────────────────────────────────────┐
 *   │  Virtual Address Space (unlimited page IDs)  │
 *   ├──────────────────────────────────────────────┤
 *   │  L1: Hot Cache (ArrayBuffer pool, ~256MB)    │ ← "registers"
 *   │  L2: Warm Cache (OPFS → IDB fallback, ~4GB)  │ ← "local swap"
 *   │  L3: Cold Store (Supabase Storage / HF)      │ ← "remote DRAM"
 *   └──────────────────────────────────────────────┘
 *
 * @module hologram-compute/holomem
 */

import { deflateSync, inflateSync } from "fflate";

// ── Constants ─────────────────────────────────────────────────────────

/** Page size: 64KB (matches Wasm page granularity) */
export const PAGE_SIZE = 65_536;

/** Default L1 hot cache: 4096 pages = 256MB */
const DEFAULT_L1_PAGES = 4096;

/** Object pool pre-allocation count */
const POOL_INITIAL = 64;

/** Prefetch window: how many pages ahead to speculatively load */
const PREFETCH_WINDOW = 4;

/** IDB fallback constants */
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
  /** Enable OPFS (default: true, falls back to IDB) */
  useOpfs: boolean;
  /** Enable speculative prefetch (default: true) */
  prefetch: boolean;
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
  poolSize: number;
  poolAvailable: number;
  opfsEnabled: boolean;
  prefetchHits: number;
}

// ── Page Buffer Object Pool ──────────────────────────────────────────
// Eliminates GC pressure by reusing pre-allocated Uint8Arrays.
// Critical for 60fps — avoids mid-frame allocation pauses.

class PagePool {
  private free: Uint8Array[] = [];
  private allocated = 0;

  constructor(initial: number = POOL_INITIAL) {
    for (let i = 0; i < initial; i++) {
      this.free.push(new Uint8Array(PAGE_SIZE));
      this.allocated++;
    }
  }

  /** Acquire a page buffer (zero-allocation if pool has free buffers) */
  acquire(): Uint8Array {
    if (this.free.length > 0) return this.free.pop()!;
    this.allocated++;
    return new Uint8Array(PAGE_SIZE);
  }

  /** Return a page buffer to the pool for reuse */
  release(buf: Uint8Array): void {
    if (buf.byteLength === PAGE_SIZE) {
      buf.fill(0); // clear for security
      this.free.push(buf);
    }
    // Non-standard size buffers are just dropped (GC'd)
  }

  get size(): number { return this.allocated; }
  get available(): number { return this.free.length; }
}

// ── OPFS Storage Backend ─────────────────────────────────────────────
// Origin Private File System: 5-10× faster than IndexedDB for
// random page I/O because it supports in-place writes without
// the overhead of IDB transactions.

interface StorageBackend {
  get(key: string): Promise<Uint8Array | undefined>;
  put(key: string, value: Uint8Array): Promise<void>;
  del(key: string): Promise<void>;
  count(): Promise<number>;
  clear(): Promise<void>;
}

class OpfsBackend implements StorageBackend {
  private dir: FileSystemDirectoryHandle | null = null;
  private ready: Promise<void>;

  constructor() {
    this.ready = this.init();
  }

  private async init() {
    try {
      const root = await navigator.storage.getDirectory();
      this.dir = await root.getDirectoryHandle("holomem-swap", { create: true });
    } catch {
      // OPFS not available — will be caught by the factory
      throw new Error("OPFS unavailable");
    }
  }

  private encode(key: string): string {
    // File names must be safe — hash the key to a hex filename
    let h = 0;
    for (let i = 0; i < key.length; i++) {
      h = ((h << 5) - h + key.charCodeAt(i)) | 0;
    }
    return `p${(h >>> 0).toString(16)}.bin`;
  }

  async get(key: string): Promise<Uint8Array | undefined> {
    await this.ready;
    try {
      const fh = await this.dir!.getFileHandle(this.encode(key));
      const file = await fh.getFile();
      const ab = await file.arrayBuffer();
      return new Uint8Array(ab);
    } catch {
      return undefined;
    }
  }

  async put(key: string, value: Uint8Array): Promise<void> {
    await this.ready;
    const fh = await this.dir!.getFileHandle(this.encode(key), { create: true });
    const w = await fh.createWritable();
    // Copy to plain ArrayBuffer to satisfy FileSystemWritableFileStream types
    const copy = new Uint8Array(value.length);
    copy.set(value);
    await w.write(copy.buffer as ArrayBuffer);
    await w.close();
  }

  async del(key: string): Promise<void> {
    await this.ready;
    try {
      await this.dir!.removeEntry(this.encode(key));
    } catch { /* already gone */ }
  }

  async count(): Promise<number> {
    await this.ready;
    let n = 0;
    // @ts-ignore — entries() exists on FileSystemDirectoryHandle
    for await (const _ of this.dir!.values()) n++;
    return n;
  }

  async clear(): Promise<void> {
    await this.ready;
    const entries: string[] = [];
    // @ts-ignore
    for await (const [name] of this.dir!.entries()) entries.push(name);
    for (const name of entries) {
      try { await this.dir!.removeEntry(name); } catch { /* ok */ }
    }
  }
}

class IdbBackend implements StorageBackend {
  private db: IDBDatabase | null = null;

  private async getDb(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(IDB_STORE)) {
          req.result.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => { this.db = req.result; resolve(req.result); };
      req.onerror = () => reject(req.error);
    });
  }

  async get(key: string): Promise<Uint8Array | undefined> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve(req.result as Uint8Array | undefined);
      req.onerror = () => reject(req.error);
    });
  }

  async put(key: string, value: Uint8Array): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async del(key: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async count(): Promise<number> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async clear(): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

// ── Page Entry ────────────────────────────────────────────────────────

interface PageEntry {
  data: Uint8Array;
  clockBit: number;
  dirty: boolean;
}

// ── HoloMem ───────────────────────────────────────────────────────────

export class HoloMem {
  private config: HoloMemConfig;
  private backend: StorageBackend | null = null;
  private pool: PagePool;

  /** L1 hot cache */
  private l1 = new Map<string, PageEntry>();
  private clockHand: string[] = [];
  private clockIndex = 0;

  /** L2 tracking */
  private l2Set = new Set<string>();

  /** Stats */
  private _pageFaults = 0;
  private _evictions = 0;
  private _l3Fetches = 0;
  private _compressedBytes = 0;
  private _uncompressedBytes = 0;
  private _prefetchHits = 0;

  /** Prefetch tracking — in-flight promises to avoid duplicate fetches */
  private _prefetchInFlight = new Map<string, Promise<void>>();

  constructor(config?: Partial<HoloMemConfig>) {
    this.config = {
      maxL1Pages: config?.maxL1Pages ?? DEFAULT_L1_PAGES,
      compress: config?.compress ?? true,
      remoteFetch: config?.remoteFetch,
      useOpfs: config?.useOpfs ?? true,
      prefetch: config?.prefetch ?? true,
    };
    this.pool = new PagePool(POOL_INITIAL);
  }

  async init(): Promise<void> {
    if (this.backend) return;

    if (this.config.useOpfs) {
      try {
        this.backend = new OpfsBackend();
        // Force await init to verify OPFS works
        await this.backend.count();
        console.log("[HoloMem] L2 backend: OPFS (high-performance)");
        return;
      } catch {
        console.log("[HoloMem] OPFS unavailable, falling back to IndexedDB");
      }
    }

    this.backend = new IdbBackend();
    console.log("[HoloMem] L2 backend: IndexedDB (fallback)");
  }

  private ensureBackend(): StorageBackend {
    if (!this.backend) throw new Error("[HoloMem] Not initialized. Call init() first.");
    return this.backend;
  }

  // ── Core Access Primitives ────────────────────────────────────────

  /**
   * Read a page. Triggers page-fault cascade: L1 → L2 → L3.
   * Fires speculative prefetch for sequential access patterns.
   */
  async read(pageId: string): Promise<Uint8Array | null> {
    // L1 hit — fast path, zero allocation
    const l1Entry = this.l1.get(pageId);
    if (l1Entry) {
      l1Entry.clockBit = 1;
      // Trigger prefetch for sequential pattern
      if (this.config.prefetch) this.prefetchAhead(pageId);
      return l1Entry.data;
    }

    // Check if this was prefetched (count it)
    if (this._prefetchInFlight.has(pageId)) {
      await this._prefetchInFlight.get(pageId);
      this._prefetchInFlight.delete(pageId);
      const prefetched = this.l1.get(pageId);
      if (prefetched) {
        this._prefetchHits++;
        prefetched.clockBit = 1;
        return prefetched.data;
      }
    }

    // Page fault
    this._pageFaults++;

    // L2 hit
    const backend = this.ensureBackend();
    const l2Data = await backend.get(pageId);
    if (l2Data) {
      const decompressed = this.config.compress ? inflateSync(l2Data) : l2Data;
      const buf = this.pool.acquire();
      buf.set(decompressed.subarray(0, PAGE_SIZE));
      await this.promoteToL1(pageId, buf, false);
      if (this.config.prefetch) this.prefetchAhead(pageId);
      return buf;
    }

    // L3 fetch
    if (this.config.remoteFetch) {
      this._l3Fetches++;
      const remoteData = await this.config.remoteFetch(pageId);
      if (remoteData) {
        const buf = this.pool.acquire();
        buf.set(remoteData.subarray(0, PAGE_SIZE));
        await this.promoteToL1(pageId, buf, false);
        await this.spillToL2(pageId, buf);
        if (this.config.prefetch) this.prefetchAhead(pageId);
        return buf;
      }
    }

    return null;
  }

  /** Write a page to L1 hot cache */
  async write(pageId: string, data: Uint8Array): Promise<void> {
    const buf = this.pool.acquire();
    buf.set(data.subarray(0, PAGE_SIZE));
    await this.promoteToL1(pageId, buf, true);
  }

  /**
   * Write a large buffer as a sequence of pages.
   * Uses batch I/O — coalesces writes to backend for throughput.
   */
  async writeChunked(
    prefix: string,
    data: Uint8Array,
    onProgress?: (written: number, total: number) => void,
  ): Promise<string[]> {
    const pageCount = Math.ceil(data.length / PAGE_SIZE);
    const pageIds: string[] = [];
    const backend = this.ensureBackend();

    // Batch: accumulate writes, flush in groups of 16
    const BATCH_SIZE = 16;
    const batch: Array<{ id: string; chunk: Uint8Array }> = [];

    for (let i = 0; i < pageCount; i++) {
      const start = i * PAGE_SIZE;
      const end = Math.min(start + PAGE_SIZE, data.length);
      const pageId = `${prefix}:${i}`;
      const chunk = data.slice(start, end);
      batch.push({ id: pageId, chunk });
      pageIds.push(pageId);

      if (batch.length >= BATCH_SIZE || i === pageCount - 1) {
        // Flush batch in parallel
        await Promise.all(batch.map(({ id, chunk: c }) => this.spillToL2(id, c)));
        batch.length = 0;
        onProgress?.(i + 1, pageCount);
      }
    }

    return pageIds;
  }

  /**
   * Read a chunked buffer. Uses batch prefetch for throughput.
   */
  async readChunked(
    pageIds: string[],
    totalBytes: number,
    onProgress?: (read: number, total: number) => void,
  ): Promise<Uint8Array> {
    const result = new Uint8Array(totalBytes);
    let offset = 0;

    // Prefetch first window
    const BATCH = 8;
    for (let i = 0; i < pageIds.length; i += BATCH) {
      const batchIds = pageIds.slice(i, i + BATCH);
      const pages = await Promise.all(batchIds.map((id) => this.read(id)));
      for (const page of pages) {
        if (!page) throw new Error(`[HoloMem] Missing page`);
        const len = Math.min(page.length, totalBytes - offset);
        result.set(page.subarray(0, len), offset);
        offset += len;
      }
      onProgress?.(Math.min(i + BATCH, pageIds.length), pageIds.length);
    }

    return result;
  }

  async has(pageId: string): Promise<boolean> {
    if (this.l1.has(pageId)) return true;
    if (this.l2Set.has(pageId)) return true;
    return false;
  }

  async delete(pageId: string): Promise<void> {
    const entry = this.l1.get(pageId);
    if (entry) {
      this.pool.release(entry.data);
      this.l1.delete(pageId);
    }
    this.l2Set.delete(pageId);
    await this.ensureBackend().del(pageId);
    this.clockHand = this.clockHand.filter((id) => id !== pageId);
  }

  // ── Speculative Prefetch ──────────────────────────────────────────
  // Detects sequential page access (e.g., "model:layer0:5" → prefetch :6, :7, :8, :9)
  // Analogous to hardware prefetch units in CPUs.

  private prefetchAhead(pageId: string): void {
    const match = pageId.match(/^(.+):(\d+)$/);
    if (!match) return;
    const prefix = match[1];
    const idx = parseInt(match[2], 10);

    for (let ahead = 1; ahead <= PREFETCH_WINDOW; ahead++) {
      const nextId = `${prefix}:${idx + ahead}`;
      if (this.l1.has(nextId) || this._prefetchInFlight.has(nextId)) continue;

      const promise = (async () => {
        const backend = this.ensureBackend();
        const data = await backend.get(nextId);
        if (data) {
          const decompressed = this.config.compress ? inflateSync(data) : data;
          const buf = this.pool.acquire();
          buf.set(decompressed.subarray(0, PAGE_SIZE));
          await this.promoteToL1(nextId, buf, false);
        }
        this._prefetchInFlight.delete(nextId);
      })();

      this._prefetchInFlight.set(nextId, promise);
    }
  }

  // ── Eviction Engine (Clock Algorithm) ─────────────────────────────

  private async promoteToL1(pageId: string, data: Uint8Array, dirty: boolean): Promise<void> {
    const existing = this.l1.get(pageId);
    if (existing) {
      if (existing.data !== data) this.pool.release(existing.data);
      existing.data = data;
      existing.clockBit = 1;
      existing.dirty = existing.dirty || dirty;
      return;
    }

    while (this.l1.size >= this.config.maxL1Pages) {
      await this.evictOne();
    }

    this.l1.set(pageId, { data, clockBit: 1, dirty });
    this.clockHand.push(pageId);
  }

  private async evictOne(): Promise<void> {
    const maxSweep = this.clockHand.length * 2;
    let swept = 0;

    while (swept < maxSweep) {
      if (this.clockHand.length === 0) return;
      this.clockIndex = this.clockIndex % this.clockHand.length;
      const candidateId = this.clockHand[this.clockIndex];
      const entry = this.l1.get(candidateId);

      if (!entry) {
        this.clockHand.splice(this.clockIndex, 1);
        continue;
      }

      if (entry.clockBit === 0) {
        if (entry.dirty) await this.spillToL2(candidateId, entry.data);
        this.pool.release(entry.data);
        this.l1.delete(candidateId);
        this.clockHand.splice(this.clockIndex, 1);
        this._evictions++;
        return;
      }

      entry.clockBit = 0;
      this.clockIndex++;
      swept++;
    }

    // Force evict
    if (this.clockHand.length > 0) {
      this.clockIndex = this.clockIndex % this.clockHand.length;
      const forceId = this.clockHand[this.clockIndex];
      const forceEntry = this.l1.get(forceId);
      if (forceEntry) {
        if (forceEntry.dirty) await this.spillToL2(forceId, forceEntry.data);
        this.pool.release(forceEntry.data);
      }
      this.l1.delete(forceId);
      this.clockHand.splice(this.clockIndex, 1);
      this._evictions++;
    }
  }

  private async spillToL2(pageId: string, data: Uint8Array): Promise<void> {
    const backend = this.ensureBackend();
    let stored: Uint8Array;

    if (this.config.compress) {
      stored = deflateSync(data, { level: 1 });
      this._uncompressedBytes += data.length;
      this._compressedBytes += stored.length;
    } else {
      stored = data;
    }

    await backend.put(pageId, stored);
    this.l2Set.add(pageId);
  }

  // ── Stats & Maintenance ───────────────────────────────────────────

  async stats(): Promise<HoloMemStats> {
    const l2Count = await this.ensureBackend().count();
    let l1Bytes = 0;
    for (const entry of this.l1.values()) l1Bytes += entry.data.byteLength;

    return {
      l1Pages: this.l1.size,
      l1MaxPages: this.config.maxL1Pages,
      l1BytesUsed: l1Bytes,
      l2Pages: l2Count,
      l3Fetches: this._l3Fetches,
      pageFaults: this._pageFaults,
      evictions: this._evictions,
      compressionRatio: this._uncompressedBytes > 0
        ? this._uncompressedBytes / this._compressedBytes : 1,
      poolSize: this.pool.size,
      poolAvailable: this.pool.available,
      opfsEnabled: this.backend instanceof OpfsBackend,
      prefetchHits: this._prefetchHits,
    };
  }

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

  async clear(): Promise<void> {
    // Release all pooled buffers
    for (const entry of this.l1.values()) this.pool.release(entry.data);
    this.l1.clear();
    this.clockHand = [];
    this.clockIndex = 0;
    this.l2Set.clear();
    this._pageFaults = 0;
    this._evictions = 0;
    this._l3Fetches = 0;
    this._compressedBytes = 0;
    this._uncompressedBytes = 0;
    this._prefetchHits = 0;
    this._prefetchInFlight.clear();
    await this.ensureBackend().clear();
  }

  close(): void {
    this.backend = null;
  }
}

// ── Singleton ─────────────────────────────────────────────────────────

let _instance: HoloMem | null = null;

export function getHoloMem(): HoloMem {
  if (!_instance) _instance = new HoloMem();
  return _instance;
}
