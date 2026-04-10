/**
 * Knowledge Graph Store Factory
 * ═════════════════════════════════════════════════════════════════
 *
 * Runtime-aware store selection:
 *   - Tauri → Native SQLite (fast, reliable)
 *   - Browser → GrafeoDB WASM + IndexedDB (existing behavior)
 *
 * @layer knowledge-graph/stores
 */

import { isLocal } from "@/lib/runtime";

export type StoreBackend = "sqlite" | "grafeo-wasm";

/**
 * Get the active store backend type.
 */
export function getStoreBackend(): StoreBackend {
  return isLocal() ? "sqlite" : "grafeo-wasm";
}

/**
 * Initialize the appropriate store backend.
 * Returns a boolean indicating if SQLite native store is active.
 */
export async function initStoreBackend(): Promise<{ backend: StoreBackend; ready: boolean }> {
  const backend = getStoreBackend();

  if (backend === "sqlite") {
    try {
      const { createSQLiteStore } = await import("./sqlite-store");
      const store = createSQLiteStore();
      await store.init();
      console.log("[StoreFactory] Using native SQLite backend");
      return { backend: "sqlite", ready: true };
    } catch (err) {
      console.warn("[StoreFactory] SQLite init failed, falling back to GrafeoDB:", (err as Error).message);
      return { backend: "grafeo-wasm", ready: true };
    }
  }

  // GrafeoDB WASM is initialized lazily by grafeo-store.ts
  console.log("[StoreFactory] Using GrafeoDB WASM backend");
  return { backend: "grafeo-wasm", ready: true };
}
