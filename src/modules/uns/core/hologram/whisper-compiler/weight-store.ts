/**
 * Hologram Weight Store
 * ═════════════════════
 *
 * Content-addressed tensor storage using IndexedDB.
 * Each tensor is stored by its SHA-256 hash (CID), enabling:
 *   - Deduplication across model versions
 *   - Integrity verification on rehydration
 *   - Permanent persistence (survives page reloads)
 *
 * No external dependencies. Pure Web APIs.
 *
 * @module uns/core/hologram/whisper-compiler/weight-store
 */

import type { OnnxTensor, HologramTensorDescriptor } from "./types";
import { DTYPE_NAME } from "./types";

// ── Constants ──────────────────────────────────────────────────────────────

const DB_NAME = "hologram-weights";
const DB_VERSION = 1;
const TENSOR_STORE = "tensors";     // key: CID, value: Uint8Array
const MANIFEST_STORE = "manifests"; // key: modelId, value: HologramCompiledModel
const GRAPH_STORE = "graphs";       // key: modelId, value: HologramComputeNode[]

// ── IndexedDB Helpers ──────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(TENSOR_STORE)) {
        db.createObjectStore(TENSOR_STORE);
      }
      if (!db.objectStoreNames.contains(MANIFEST_STORE)) {
        db.createObjectStore(MANIFEST_STORE);
      }
      if (!db.objectStoreNames.contains(GRAPH_STORE)) {
        db.createObjectStore(GRAPH_STORE);
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, store: string, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function idbGet<T>(db: IDBDatabase, store: string, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

function idbHas(db: IDBDatabase, store: string, key: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).count(key);
    req.onsuccess = () => resolve(req.result > 0);
    req.onerror = () => reject(req.error);
  });
}

function idbDelete(db: IDBDatabase, store: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── SHA-256 Content Addressing ─────────────────────────────────────────────

/**
 * Compute the SHA-256 hex hash of raw bytes.
 * This is the Content Identifier (CID) for the tensor.
 */
async function sha256Hex(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data as Uint8Array<ArrayBuffer>);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── HologramWeightStore ────────────────────────────────────────────────────

export class HologramWeightStore {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (!this.db) {
      this.db = await openDB();
    }
  }

  private ensureDb(): IDBDatabase {
    if (!this.db) throw new Error("[WeightStore] Not initialized. Call init() first.");
    return this.db;
  }

  // ── Tensor operations ────────────────────────────────────────────

  /**
   * Store a single tensor. Returns its content-addressed descriptor.
   * If a tensor with the same CID already exists, it's a no-op (dedup).
   */
  async storeTensor(tensor: OnnxTensor): Promise<HologramTensorDescriptor> {
    const db = this.ensureDb();

    // Compute content address
    const cid = await sha256Hex(tensor.rawData);

    // Deduplicate: skip write if already stored
    const exists = await idbHas(db, TENSOR_STORE, cid);
    if (!exists) {
      // Copy the data (since rawData may be a view into a larger buffer
      // that will be GC'd after compilation)
      const copy = new Uint8Array(tensor.rawData.length);
      copy.set(tensor.rawData);
      await idbPut(db, TENSOR_STORE, cid, copy);
    }

    return {
      name: tensor.name,
      cid,
      dims: tensor.dims,
      dataType: tensor.dataType,
      dtypeName: DTYPE_NAME[tensor.dataType] ?? `unknown(${tensor.dataType})`,
      byteLength: tensor.rawData.byteLength,
      elementCount: tensor.elementCount,
    };
  }

  /**
   * Store multiple tensors in batch. Returns descriptors in order.
   */
  async storeTensors(
    tensors: OnnxTensor[],
    onProgress?: (stored: number, total: number) => void,
  ): Promise<HologramTensorDescriptor[]> {
    const results: HologramTensorDescriptor[] = [];

    for (let i = 0; i < tensors.length; i++) {
      const desc = await this.storeTensor(tensors[i]);
      results.push(desc);
      onProgress?.(i + 1, tensors.length);
    }

    return results;
  }

  /**
   * Retrieve raw tensor bytes by CID.
   * Returns null if the tensor is not in the store.
   */
  async loadTensor(cid: string): Promise<Uint8Array | null> {
    const db = this.ensureDb();
    const data = await idbGet<Uint8Array>(db, TENSOR_STORE, cid);
    return data ?? null;
  }

  /**
   * Verify tensor integrity: recompute SHA-256 and compare to CID.
   */
  async verifyTensor(cid: string): Promise<boolean> {
    const data = await this.loadTensor(cid);
    if (!data) return false;
    const computed = await sha256Hex(data);
    return computed === cid;
  }

  // ── Manifest operations ──────────────────────────────────────────

  /**
   * Store a compiled model manifest.
   */
  async storeManifest(modelId: string, manifest: unknown): Promise<void> {
    const db = this.ensureDb();
    await idbPut(db, MANIFEST_STORE, modelId, manifest);
  }

  /**
   * Load a compiled model manifest.
   */
  async loadManifest<T>(modelId: string): Promise<T | null> {
    const db = this.ensureDb();
    const data = await idbGet<T>(db, MANIFEST_STORE, modelId);
    return data ?? null;
  }

  /**
   * Check if a compiled model exists in the store.
   */
  async hasModel(modelId: string): Promise<boolean> {
    const db = this.ensureDb();
    return idbHas(db, MANIFEST_STORE, modelId);
  }

  // ── Graph operations ─────────────────────────────────────────────

  /**
   * Store a compute graph.
   */
  async storeGraph(modelId: string, graph: unknown): Promise<void> {
    const db = this.ensureDb();
    await idbPut(db, GRAPH_STORE, modelId, graph);
  }

  /**
   * Load a compute graph.
   */
  async loadGraph<T>(modelId: string): Promise<T | null> {
    const db = this.ensureDb();
    const data = await idbGet<T>(db, GRAPH_STORE, modelId);
    return data ?? null;
  }

  // ── Maintenance ──────────────────────────────────────────────────

  /**
   * Delete a compiled model and all its unique tensors.
   */
  async deleteModel(
    modelId: string,
    tensorCids: string[],
  ): Promise<void> {
    const db = this.ensureDb();
    await idbDelete(db, MANIFEST_STORE, modelId);
    await idbDelete(db, GRAPH_STORE, modelId);

    for (const cid of tensorCids) {
      await idbDelete(db, TENSOR_STORE, cid);
    }
  }

  /**
   * Get storage statistics.
   */
  async stats(): Promise<{
    tensorCount: number;
    manifestCount: number;
    graphCount: number;
  }> {
    const db = this.ensureDb();

    const count = (store: string): Promise<number> =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readonly");
        const req = tx.objectStore(store).count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

    return {
      tensorCount: await count(TENSOR_STORE),
      manifestCount: await count(MANIFEST_STORE),
      graphCount: await count(GRAPH_STORE),
    };
  }

  close(): void {
    this.db?.close();
    this.db = null;
  }
}

// ── Singleton ──────────────────────────────────────────────────────────────

let _instance: HologramWeightStore | null = null;

export function getWeightStore(): HologramWeightStore {
  if (!_instance) _instance = new HologramWeightStore();
  return _instance;
}
