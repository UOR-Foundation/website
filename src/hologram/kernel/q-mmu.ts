/**
 * Q-MMU — Content-Addressed Virtual Memory Manager
 * ═════════════════════════════════════════════════
 *
 * Every classical MMU concept maps to a content-addressed equivalent:
 *
 *   ┌───────────────┬────────────────────────────────────────────┐
 *   │ Linux MMU     │ Q-MMU                                      │
 *   ├───────────────┼────────────────────────────────────────────┤
 *   │ Page (4KB)    │ Datum: immutable, content-addressed block   │
 *   │ Virtual Addr  │ CID: content identifier (hash of content)  │
 *   │ Page Table    │ CID → StorageTier mapping                   │
 *   │ Page Fault    │ rehydrate(CID): fetch from cold storage     │
 *   │ Copy-on-Write │ Automatic: same content = same CID          │
 *   │ Protection    │ Derivation chain: ownership via hash lineage│
 *   │ TLB           │ Hot cache: recently-accessed CIDs           │
 *   └───────────────┴────────────────────────────────────────────┘
 *
 * The key insight: deduplication is FREE. If two processes produce
 * identical results, they share the same CID. No duplicate memory. Ever.
 *
 * ── CRYSTALLIZED ──
 * This module derives entirely from genesis/. Zero external dependencies.
 *
 * @module qkernel/q-mmu
 */

import { sha256 } from "@/hologram/genesis/axiom-hash";
import { createCid } from "@/hologram/genesis/axiom-cid";
import { toHex, encodeUtf8 } from "@/hologram/genesis/axiom-ring";

// ═══════════════════════════════════════════════════════════════════════
// Storage Tiers
// ═══════════════════════════════════════════════════════════════════════

/** Where a datum lives — mirrors Linux's memory hierarchy */
export type StorageTier =
  | "register"   // In-process (L1 — immediate access)
  | "hot"        // TLB / cache (L2 — fast lookup)
  | "warm"       // Main memory (RAM equivalent)
  | "cold"       // Persistent store (disk / database)
  | "frozen";    // Archival (tape / IPFS / dehydrated)

/** A single memory datum — the quantum equivalent of a page */
export interface Datum {
  readonly cid: string;
  readonly content: Uint8Array;
  readonly byteLength: number;
  readonly tier: StorageTier;
  readonly createdAt: number;
  readonly lastAccessedAt: number;
  readonly accessCount: number;
  readonly ownerPid: number;
  readonly derivationCid: string | null;  // parent datum this was derived from
  readonly checksum: string;              // first 16 hex chars of SHA-256
}

/** Page table entry: CID → Datum mapping */
export interface PageTableEntry {
  readonly cid: string;
  readonly tier: StorageTier;
  readonly byteLength: number;
  readonly ownerPid: number;
  readonly pinned: boolean;    // prevent eviction
}

/** A page fault — requested CID not in hot memory */
export interface PageFault {
  readonly cid: string;
  readonly requestedBy: number;  // PID
  readonly tier: StorageTier;    // where it was found
  readonly resolvedAt: number;
  readonly latencyMs: number;
}

/** MMU statistics */
export interface MmuStats {
  readonly totalDatums: number;
  readonly totalBytes: number;
  readonly tierDistribution: Record<StorageTier, number>;
  readonly cacheHitRate: number;
  readonly pageFaults: number;
  readonly uniqueCids: number;   // deduplication metric
  readonly dedupRatio: number;   // 1 - (unique / total accesses)
}

// ═══════════════════════════════════════════════════════════════════════
// Q-MMU Implementation
// ═══════════════════════════════════════════════════════════════════════

/** Maximum datums in hot cache before eviction */
const HOT_CACHE_LIMIT = 256;

/** Maximum datums in warm tier */
const WARM_LIMIT = 1024;

export class QMmu {
  /** The page table: CID → Datum */
  private datums = new Map<string, Datum>();

  /** Access log for LRU eviction */
  private accessOrder: string[] = [];

  /** Fault log */
  private faults: PageFault[] = [];

  /** Cold storage simulator (would be IndexedDB / IPFS in production) */
  private coldStore = new Map<string, Uint8Array>();

  /** Total store operations (for dedup ratio) */
  private totalStoreOps = 0;

  /** Cache hits */
  private cacheHits = 0;

  /** Cache misses */
  private cacheMisses = 0;

  // ── Core Operations ──────────────────────────────────────────────

  /**
   * mmap — Store content into virtual memory.
   * Returns the CID (content-addressed virtual address).
   * If the content already exists, returns existing CID (free dedup).
   *
   * Now SYNCHRONOUS — genesis hash is pure math, no Web Crypto needed.
   */
  store(content: Uint8Array, ownerPid: number, derivationCid?: string): string {
    this.totalStoreOps++;

    const hashBytes = sha256(content);
    const cid = createCid(content);

    // Deduplication: if CID exists, just bump access
    const existing = this.datums.get(cid.string);
    if (existing) {
      this.touch(cid.string);
      return cid.string;
    }

    const datum: Datum = {
      cid: cid.string,
      content: new Uint8Array(content),
      byteLength: content.byteLength,
      tier: "hot",
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 1,
      ownerPid,
      derivationCid: derivationCid ?? null,
      checksum: toHex(hashBytes).slice(0, 16),
    };

    this.datums.set(cid.string, datum);
    this.accessOrder.push(cid.string);
    this.maybeEvict();

    return cid.string;
  }

  /**
   * read — Load content from virtual memory by CID.
   * Triggers page fault if not in hot/warm tier.
   */
  load(cid: string): Uint8Array | null {
    const datum = this.datums.get(cid);

    if (datum) {
      this.cacheHits++;
      this.touch(cid);
      return datum.content;
    }

    // Page fault: check cold storage
    const cold = this.coldStore.get(cid);
    if (cold) {
      this.cacheMisses++;
      this.faults.push({
        cid,
        requestedBy: 0,
        tier: "cold",
        resolvedAt: Date.now(),
        latencyMs: 1, // simulated
      });

      // Promote to hot
      this.datums.set(cid, {
        cid,
        content: cold,
        byteLength: cold.byteLength,
        tier: "hot",
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        accessCount: 1,
        ownerPid: 0,
        derivationCid: null,
        checksum: "",
      });
      this.accessOrder.push(cid);
      this.maybeEvict();
      return cold;
    }

    this.cacheMisses++;
    return null;
  }

  /**
   * pin — Prevent a datum from being evicted (like mlock).
   */
  pin(cid: string): boolean {
    const datum = this.datums.get(cid);
    if (!datum) return false;
    this.datums.set(cid, { ...datum, tier: "register" });
    return true;
  }

  /**
   * unpin — Allow eviction again.
   */
  unpin(cid: string): boolean {
    const datum = this.datums.get(cid);
    if (!datum) return false;
    this.datums.set(cid, { ...datum, tier: "hot" });
    return true;
  }

  /**
   * free — Release a datum. Moves to cold storage (not deleted — 
   * content-addressed data is eternal, just deprioritized).
   */
  free(cid: string): boolean {
    const datum = this.datums.get(cid);
    if (!datum) return false;

    this.coldStore.set(cid, datum.content);
    this.datums.delete(cid);
    this.accessOrder = this.accessOrder.filter(c => c !== cid);
    return true;
  }

  /**
   * exists — Check if a CID is in memory (any tier).
   */
  exists(cid: string): boolean {
    return this.datums.has(cid) || this.coldStore.has(cid);
  }

  /**
   * lookup — Get page table entry without loading content.
   */
  lookup(cid: string): PageTableEntry | null {
    const datum = this.datums.get(cid);
    if (!datum) return null;
    return {
      cid: datum.cid,
      tier: datum.tier,
      byteLength: datum.byteLength,
      ownerPid: datum.ownerPid,
      pinned: datum.tier === "register",
    };
  }

  /**
   * Get MMU statistics.
   */
  stats(): MmuStats {
    const tiers: Record<StorageTier, number> = {
      register: 0, hot: 0, warm: 0, cold: 0, frozen: 0,
    };
    let totalBytes = 0;
    for (const d of this.datums.values()) {
      tiers[d.tier]++;
      totalBytes += d.byteLength;
    }
    tiers.cold = this.coldStore.size;

    const totalAccesses = this.cacheHits + this.cacheMisses;
    const uniqueCids = this.datums.size + this.coldStore.size;

    return {
      totalDatums: this.datums.size,
      totalBytes,
      tierDistribution: tiers,
      cacheHitRate: totalAccesses > 0 ? this.cacheHits / totalAccesses : 1,
      pageFaults: this.faults.length,
      uniqueCids,
      dedupRatio: this.totalStoreOps > 0
        ? 1 - (uniqueCids / this.totalStoreOps)
        : 0,
    };
  }

  /** Get recent page faults */
  getPageFaults(): readonly PageFault[] {
    return this.faults;
  }

  /** Get all page table entries */
  pageTable(): PageTableEntry[] {
    return Array.from(this.datums.values()).map(d => ({
      cid: d.cid,
      tier: d.tier,
      byteLength: d.byteLength,
      ownerPid: d.ownerPid,
      pinned: d.tier === "register",
    }));
  }

  // ── Internal ─────────────────────────────────────────────────────

  private touch(cid: string): void {
    const datum = this.datums.get(cid);
    if (datum) {
      this.datums.set(cid, {
        ...datum,
        lastAccessedAt: Date.now(),
        accessCount: datum.accessCount + 1,
      });
      // Move to end of access order (MRU)
      this.accessOrder = this.accessOrder.filter(c => c !== cid);
      this.accessOrder.push(cid);
    }
  }

  /** LRU eviction: demote oldest hot datums to cold when cache is full */
  private maybeEvict(): void {
    while (this.datums.size > HOT_CACHE_LIMIT + WARM_LIMIT) {
      // Find oldest non-pinned datum
      for (let i = 0; i < this.accessOrder.length; i++) {
        const cid = this.accessOrder[i];
        const datum = this.datums.get(cid);
        if (datum && datum.tier !== "register") {
          this.coldStore.set(cid, datum.content);
          this.datums.delete(cid);
          this.accessOrder.splice(i, 1);
          break;
        }
      }
    }
  }
}
