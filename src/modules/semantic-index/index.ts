/**
 * semantic-index module barrel export.
 */

export { buildIndex, findSimilar, exactLookup } from "./index-builder";
export type { SemanticIndex, IndexEntry, SimilarEntry } from "./index-builder";
export { resolveEntity } from "./entity-linker";
export type { EntityResolution } from "./entity-linker";
export { deduplicateEntities } from "./deduplication";
export type { DeduplicationGroup, DeduplicationResult } from "./deduplication";
