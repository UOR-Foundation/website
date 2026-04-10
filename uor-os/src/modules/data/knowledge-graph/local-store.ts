/**
 * UOR Knowledge Graph — Local Store (DEPRECATED)
 * ═════════════════════════════════════════════════════════════════
 *
 * @deprecated This module now delegates to the canonical GrafeoDB store.
 * Import from `@/modules/knowledge-graph` or `./grafeo-store` directly.
 *
 * The IndexedDB implementation has been removed. All graph operations
 * go through the single GrafeoDB WASM instance with built-in IndexedDB
 * persistence.
 */

// Re-export types from canonical location
export type { KGNode, KGEdge, KGDerivation, KGStats } from "./types";

// Re-export the GrafeoDB store as localGraphStore for backward compatibility
export { grafeoStore as localGraphStore } from "./grafeo-store";
