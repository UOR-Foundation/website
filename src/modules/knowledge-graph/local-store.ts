/**
 * UOR Knowledge Graph — Local Store (DEPRECATED)
 * ═════════════════════════════════════════════════════════════════
 *
 * @deprecated This module now delegates to the canonical Oxigraph store.
 * Import from `@/modules/knowledge-graph` or `./oxigraph-store` directly.
 *
 * The IndexedDB implementation has been removed. All graph operations
 * go through the single Oxigraph WASM instance, which persists its
 * own data as N-Quads to IndexedDB.
 */

// Re-export types from canonical location
export type { KGNode, KGEdge, KGDerivation, KGStats } from "./types";

// Re-export the Oxigraph store as localGraphStore for backward compatibility
export { oxigraphStore as localGraphStore } from "./oxigraph-store";
