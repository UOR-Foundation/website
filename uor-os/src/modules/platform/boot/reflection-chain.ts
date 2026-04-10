/**
 * Reflection Chain — Content-addressed IndexedDB store for LLM self-reflections.
 *
 * Each reflection is hashed and stored alongside the report hash that triggered it,
 * creating an immutable chain the system can reference for improvement trajectory.
 *
 * @module boot/reflection-chain
 */

import { sha256hex } from "@/lib/crypto";

const DB_NAME = "uor-reflections";
const STORE_NAME = "chain";
const DB_VERSION = 1;
const MAX_ENTRIES = 20;

export interface ReflectionEntry {
  id: string;            // SHA-256 of the reflection content
  reportHash: string;    // SHA-256 of the report that triggered it
  content: string;       // The LLM's reflection markdown
  timestamp: string;     // ISO timestamp
  promptsEvolved?: string; // Evolved prompts extracted from the reflection
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("by_time", "timestamp", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Get the most recent reflection entry (if any). */
export async function getLatestReflection(): Promise<ReflectionEntry | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const idx = tx.objectStore(STORE_NAME).index("by_time");
    const cursor = idx.openCursor(null, "prev");
    cursor.onsuccess = () => resolve(cursor.result?.value ?? null);
    cursor.onerror = () => reject(cursor.error);
  });
}

/** Push a new reflection, prune if over MAX_ENTRIES. */
export async function pushReflection(
  reportMarkdown: string,
  reflectionContent: string,
  promptsEvolved?: string,
): Promise<ReflectionEntry> {
  const [reportHash, id] = await Promise.all([
    sha256hex(reportMarkdown),
    sha256hex(reflectionContent),
  ]);

  const entry: ReflectionEntry = {
    id,
    reportHash,
    content: reflectionContent,
    timestamp: new Date().toISOString(),
    promptsEvolved,
  };

  const db = await openDB();

  // Store
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // Prune oldest beyond MAX_ENTRIES
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const idx = store.index("by_time");
    const all: string[] = [];
    const cursor = idx.openCursor(null, "prev");
    cursor.onsuccess = () => {
      const c = cursor.result;
      if (c) {
        all.push(c.value.id);
        if (all.length > MAX_ENTRIES) store.delete(c.value.id);
        c.continue();
      }
    };
    tx.oncomplete = () => resolve();
  });

  return entry;
}

/** Get all reflections ordered by time (newest first). */
export async function getAllReflections(): Promise<ReflectionEntry[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const idx = tx.objectStore(STORE_NAME).index("by_time");
    const entries: ReflectionEntry[] = [];
    const cursor = idx.openCursor(null, "prev");
    cursor.onsuccess = () => {
      const c = cursor.result;
      if (c) { entries.push(c.value); c.continue(); }
    };
    tx.oncomplete = () => resolve(entries);
    tx.onerror = () => reject(tx.error);
  });
}
