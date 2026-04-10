/**
 * WASM Module Compile Cache — IndexedDB Persistence
 * ═══════════════════════════════════════════════════════════════
 *
 * Caches compiled WebAssembly.Module objects in IndexedDB to
 * eliminate recompilation on subsequent page loads.
 *
 * Tier strategy:
 *   1. IndexedDB cached module  → ~5-20ms (instant)
 *   2. Network fetch + compile  → ~100-500ms (first load)
 *   3. TypeScript fallback      → 0ms (no WASM)
 *
 * The cache key includes the WASM file URL + ETag/version so
 * stale modules are automatically evicted on crate bumps.
 *
 * @layer 0
 * @module engine/wasm-cache
 */

const DB_NAME = "uor-wasm-cache";
const DB_VERSION = 1;
const STORE_NAME = "modules";

interface CacheEntry {
  key: string;
  module: WebAssembly.Module;
  version: string;
  cachedAt: number;
}

// ── IndexedDB helpers ───────────────────────────────────────────────────

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Retrieve a cached compiled WebAssembly.Module from IndexedDB.
 * Returns null if no valid cache entry exists or if the version mismatches.
 */
export async function getCachedModule(
  wasmUrl: string,
  expectedVersion: string,
): Promise<WebAssembly.Module | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(wasmUrl);
      req.onsuccess = () => {
        const entry = req.result as CacheEntry | undefined;
        if (entry && entry.version === expectedVersion) {
          resolve(entry.module);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Store a compiled WebAssembly.Module in IndexedDB for future loads.
 */
export async function cacheModule(
  wasmUrl: string,
  module: WebAssembly.Module,
  version: string,
): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const entry: CacheEntry = {
      key: wasmUrl,
      module,
      version,
      cachedAt: Date.now(),
    };
    store.put(entry);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Silently fail — cache is best-effort
  }
}

/**
 * Load a WASM module with compile caching.
 * Tries IndexedDB cache first, then falls back to network fetch + streaming compile.
 * Caches the compiled module for next load.
 */
export async function loadWithCache(
  wasmUrl: string,
  expectedVersion: string,
  imports: WebAssembly.Imports,
): Promise<{ instance: WebAssembly.Instance; module: WebAssembly.Module }> {
  // Tier 1: Try cached module
  const cached = await getCachedModule(wasmUrl, expectedVersion);
  if (cached) {
    console.log("[WASM Cache] Hit — instantiating from IndexedDB cache");
    const instance = await WebAssembly.instantiate(cached, imports);
    return { instance, module: cached };
  }

  // Tier 2: Network fetch + streaming compile
  console.log("[WASM Cache] Miss — fetching and compiling from network");
  const response = fetch(wasmUrl);

  let module: WebAssembly.Module;
  let instance: WebAssembly.Instance;

  if (typeof WebAssembly.instantiateStreaming === "function") {
    try {
      const result = await WebAssembly.instantiateStreaming(response, imports);
      module = result.module;
      instance = result.instance;
    } catch (e) {
      // Fallback for incorrect MIME type
      const bytes = await (await response).arrayBuffer();
      const result = await WebAssembly.instantiate(bytes, imports);
      module = result.module;
      instance = result.instance;
    }
  } else {
    const bytes = await (await response).arrayBuffer();
    const result = await WebAssembly.instantiate(bytes, imports);
    module = result.module;
    instance = result.instance;
  }

  // Background cache the compiled module
  cacheModule(wasmUrl, module, expectedVersion).catch(() => {});

  return { instance, module };
}

/**
 * Evict all cached WASM modules. Useful on crate version bump.
 */
export async function clearCache(): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
    });
  } catch {
    // best-effort
  }
}

/**
 * Check if WASM SIMD is supported in the current environment.
 * Uses a minimal WASM module with a v128 instruction.
 */
export async function detectSimdSupport(): Promise<boolean> {
  try {
    // Minimal WASM module that uses a v128.const instruction
    const simdTest = new Uint8Array([
      0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10,
      10, 1, 8, 0, 65, 0, 253, 17, 0, 0, 11,
    ]);
    await WebAssembly.compile(simdTest);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if SharedArrayBuffer is available (requires COOP/COEP headers).
 */
export function detectSharedMemory(): boolean {
  try {
    return typeof SharedArrayBuffer !== "undefined";
  } catch {
    return false;
  }
}
