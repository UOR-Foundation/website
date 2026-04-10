/**
 * Time Machine — Checkpoint Store.
 * ═════════════════════════════════════════════════════════════════
 *
 * IndexedDB-backed persistent storage for system checkpoints.
 * Separate DB from GrafeoDB to avoid I/O contention.
 * Implements retention policy with auto-pruning.
 *
 * @module time-machine/checkpoint-store
 */

import type {
  SystemCheckpoint,
  CheckpointMeta,
  TimeMachineConfig,
  BranchInfo,
} from "./types";
import { DEFAULT_CONFIG } from "./types";

// ── Constants ───────────────────────────────────────────────────────────

const DB_NAME = "uor-time-machine";
const DB_VERSION = 1;
const STORE_CHECKPOINTS = "checkpoints";
const STORE_CONFIG = "config";
const CONFIG_KEY = "tm-config";

// ── IndexedDB Helpers ───────────────────────────────────────────────────

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_CHECKPOINTS)) {
        const store = db.createObjectStore(STORE_CHECKPOINTS, { keyPath: "id" });
        store.createIndex("sequence", "sequence", { unique: false });
        store.createIndex("branch", "branchName", { unique: false });
        store.createIndex("timestamp", "timestamp", { unique: false });
        store.createIndex("type", "type", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_CONFIG)) {
        db.createObjectStore(STORE_CONFIG);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txRW(db: IDBDatabase, store: string): IDBObjectStore {
  return db.transaction(store, "readwrite").objectStore(store);
}

function txRO(db: IDBDatabase, store: string): IDBObjectStore {
  return db.transaction(store, "readonly").objectStore(store);
}

function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbCursor(store: IDBObjectStore | IDBIndex, query?: IDBValidKey | IDBKeyRange, direction?: IDBCursorDirection): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    const req = store.openCursor(query, direction);
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

// ── Checkpoint Store ────────────────────────────────────────────────────

export const checkpointStore = {
  // ── Write ──────────────────────────────────────────────────────────

  async save(checkpoint: SystemCheckpoint): Promise<void> {
    const db = await openDb();
    try {
      await idbRequest(txRW(db, STORE_CHECKPOINTS).put(checkpoint));
    } finally {
      db.close();
    }
  },

  // ── Read ───────────────────────────────────────────────────────────

  async get(id: string): Promise<SystemCheckpoint | undefined> {
    const db = await openDb();
    try {
      const result = await idbRequest(txRO(db, STORE_CHECKPOINTS).get(id));
      return result ?? undefined;
    } finally {
      db.close();
    }
  },

  async getBySequence(sequence: number, branch = "main"): Promise<SystemCheckpoint | undefined> {
    const all = await this.listAll(branch);
    return all.find((c) => c.sequence === sequence);
  },

  async listAll(branch?: string): Promise<SystemCheckpoint[]> {
    const db = await openDb();
    try {
      const store = txRO(db, STORE_CHECKPOINTS);
      let results: SystemCheckpoint[];
      if (branch) {
        const idx = store.index("branch");
        results = await idbCursor(idx, branch);
      } else {
        results = await idbCursor(store);
      }
      return results.sort((a, b) => b.sequence - a.sequence);
    } finally {
      db.close();
    }
  },

  async listMeta(branch?: string): Promise<CheckpointMeta[]> {
    const all = await this.listAll(branch);
    return all.map(({ id, sequence, parentId, branchName, timestamp, type, label, quadCount, sealHash }) => ({
      id, sequence, parentId, branchName, timestamp, type, label, quadCount, sealHash,
    }));
  },

  async getLatest(branch = "main"): Promise<SystemCheckpoint | undefined> {
    const all = await this.listAll(branch);
    return all[0]; // Already sorted newest-first
  },

  async getNextSequence(): Promise<number> {
    const all = await this.listAll();
    if (all.length === 0) return 1;
    return Math.max(...all.map((c) => c.sequence)) + 1;
  },

  // ── Branches ───────────────────────────────────────────────────────

  async listBranches(): Promise<BranchInfo[]> {
    const all = await this.listAll();
    const branchMap = new Map<string, SystemCheckpoint[]>();
    for (const cp of all) {
      const arr = branchMap.get(cp.branchName) || [];
      arr.push(cp);
      branchMap.set(cp.branchName, arr);
    }

    const branches: BranchInfo[] = [];
    for (const [name, cps] of branchMap) {
      const sorted = cps.sort((a, b) => b.sequence - a.sequence);
      branches.push({
        name,
        headId: sorted[0].id,
        headSequence: sorted[0].sequence,
        createdAt: sorted[sorted.length - 1].timestamp,
        checkpointCount: cps.length,
      });
    }
    return branches.sort((a, b) => (a.name === "main" ? -1 : b.name === "main" ? 1 : a.name.localeCompare(b.name)));
  },

  // ── Retention ──────────────────────────────────────────────────────

  async prune(maxCheckpoints: number): Promise<number> {
    const all = await this.listAll();
    if (all.length <= maxCheckpoints) return 0;

    // Never prune manual checkpoints; prune oldest auto-saves first
    const manual = all.filter((c) => c.type === "manual");
    const auto = all.filter((c) => c.type === "auto").sort((a, b) => a.sequence - b.sequence);

    const toKeep = maxCheckpoints - manual.length;
    if (toKeep >= auto.length) return 0;

    const toDelete = auto.slice(0, auto.length - Math.max(toKeep, 0));
    const db = await openDb();
    try {
      const store = txRW(db, STORE_CHECKPOINTS);
      for (const cp of toDelete) {
        await idbRequest(store.delete(cp.id));
      }
    } finally {
      db.close();
    }
    return toDelete.length;
  },

  async delete(id: string): Promise<void> {
    const db = await openDb();
    try {
      await idbRequest(txRW(db, STORE_CHECKPOINTS).delete(id));
    } finally {
      db.close();
    }
  },

  async count(): Promise<number> {
    const db = await openDb();
    try {
      return await idbRequest(txRO(db, STORE_CHECKPOINTS).count());
    } finally {
      db.close();
    }
  },

  // ── Config ─────────────────────────────────────────────────────────

  async loadConfig(): Promise<TimeMachineConfig> {
    const db = await openDb();
    try {
      const result = await idbRequest(txRO(db, STORE_CONFIG).get(CONFIG_KEY));
      return result ?? { ...DEFAULT_CONFIG };
    } finally {
      db.close();
    }
  },

  async saveConfig(config: TimeMachineConfig): Promise<void> {
    const db = await openDb();
    try {
      await idbRequest(txRW(db, STORE_CONFIG).put(config, CONFIG_KEY));
    } finally {
      db.close();
    }
  },

  // ── Full Chain Reconstruction (for delta resolution) ───────────────

  async resolveFullNQuads(checkpoint: SystemCheckpoint): Promise<string> {
    if (!checkpoint.isDelta) return checkpoint.graphNQuads;

    // Walk the chain back to the base full snapshot
    const chain: SystemCheckpoint[] = [checkpoint];
    let current = checkpoint;
    while (current.isDelta && current.baseCheckpointId) {
      const base = await this.get(current.baseCheckpointId);
      if (!base) {
        console.warn(`[TimeMachine] Missing base checkpoint ${current.baseCheckpointId}, using delta as-is`);
        break;
      }
      chain.unshift(base);
      current = base;
    }

    // chain[0] should be a full snapshot
    if (chain[0].isDelta) {
      console.warn("[TimeMachine] Could not resolve full base; returning accumulated deltas");
      return chain.map((c) => c.graphNQuads).join("\n");
    }

    // Start with full, apply each delta
    const parts = [chain[0].graphNQuads];
    for (let i = 1; i < chain.length; i++) {
      parts.push(chain[i].graphNQuads);
    }
    return parts.join("\n");
  },
};
