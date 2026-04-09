/**
 * UOR Knowledge Graph — Immutable Raw-Bytes Audit Store.
 *
 * Every ingested item gets an immutable audit record BEFORE any processing.
 * Raw bytes → SHA-256 hash → audit record → then process.
 *
 * Keyed by UOR address. Once written, never modified.
 * No UOR involvement here — plain SHA-256 for audit trail.
 */

import { sha256hex } from "@/lib/crypto";

// ── Types ───────────────────────────────────────────────────────────────────

export interface RawAuditRecord {
  /** UOR content address (primary key) */
  uorAddress: string;
  /** SHA-256 of original raw bytes */
  rawHash: string;
  /** Original size in bytes */
  size: number;
  /** MIME type */
  mimeType: string;
  /** Original filename (if applicable) */
  filename?: string;
  /** Source: file, paste, url */
  source: string;
  /** Raw text content (stored for text-based items) */
  rawText?: string;
  /** Immutable creation timestamp */
  createdAt: number;
}

// ── Constants ───────────────────────────────────────────────────────────────

const DB_NAME = "uor-raw-audit";
const DB_VERSION = 1;
const STORE_NAME = "raw-bytes";


// ── IndexedDB Lifecycle ─────────────────────────────────────────────────────

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "uorAddress" });
        store.createIndex("by_hash", "rawHash", { unique: false });
        store.createIndex("by_source", "source", { unique: false });
        store.createIndex("by_created", "createdAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

function req<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ── Public API ──────────────────────────────────────────────────────────────

export const rawStore = {
  /**
   * Record a raw audit entry. Immutable — if the address already exists, skip.
   */
  async putRaw(params: {
    uorAddress: string;
    rawText: string;
    size: number;
    mimeType: string;
    filename?: string;
    source: string;
  }): Promise<RawAuditRecord> {
    const db = await openDB();

    // Check if already exists (immutable)
    const existing = await this.getRaw(params.uorAddress);
    if (existing) return existing;

    const rawHash = await sha256hex(params.rawText);

    const record: RawAuditRecord = {
      uorAddress: params.uorAddress,
      rawHash,
      size: params.size,
      mimeType: params.mimeType,
      filename: params.filename,
      source: params.source,
      rawText: params.rawText,
      createdAt: Date.now(),
    };

    const t = db.transaction(STORE_NAME, "readwrite");
    const store = t.objectStore(STORE_NAME);
    await req(store.put(record));

    return record;
  },

  /**
   * Record audit for binary data (ArrayBuffer).
   */
  async putRawBinary(params: {
    uorAddress: string;
    buffer: ArrayBuffer;
    mimeType: string;
    filename?: string;
    source: string;
  }): Promise<RawAuditRecord> {
    const existing = await this.getRaw(params.uorAddress);
    if (existing) return existing;

    // SHA-256 of raw bytes
    const digest = await crypto.subtle.digest("SHA-256", params.buffer);
    const rawHash = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const record: RawAuditRecord = {
      uorAddress: params.uorAddress,
      rawHash,
      size: params.buffer.byteLength,
      mimeType: params.mimeType,
      filename: params.filename,
      source: params.source,
      createdAt: Date.now(),
    };

    const db = await openDB();
    const t = db.transaction(STORE_NAME, "readwrite");
    const store = t.objectStore(STORE_NAME);
    await req(store.put(record));

    return record;
  },

  async getRaw(uorAddress: string): Promise<RawAuditRecord | undefined> {
    const db = await openDB();
    const t = db.transaction(STORE_NAME, "readonly");
    const store = t.objectStore(STORE_NAME);
    return req(store.get(uorAddress));
  },

  async hasRaw(uorAddress: string): Promise<boolean> {
    const record = await this.getRaw(uorAddress);
    return !!record;
  },

  async getAll(): Promise<RawAuditRecord[]> {
    const db = await openDB();
    const t = db.transaction(STORE_NAME, "readonly");
    const store = t.objectStore(STORE_NAME);
    return req(store.getAll());
  },

  async getStats(): Promise<{ count: number; totalBytes: number }> {
    const all = await this.getAll();
    return {
      count: all.length,
      totalBytes: all.reduce((sum, r) => sum + r.size, 0),
    };
  },

  /**
   * Retrieve raw content by UOR address (for replay/verification).
   */
  async retrieveRaw(uorAddress: string): Promise<string | undefined> {
    const record = await this.getRaw(uorAddress);
    return record?.rawText;
  },

  /**
   * Look up by raw hash (dedup detection before processing).
   */
  async getByHash(rawHash: string): Promise<RawAuditRecord | undefined> {
    const db = await openDB();
    const t = db.transaction(STORE_NAME, "readonly");
    const store = t.objectStore(STORE_NAME);
    const index = store.index("by_hash");
    const results: RawAuditRecord[] = await req(index.getAll(rawHash));
    return results[0];
  },
};
