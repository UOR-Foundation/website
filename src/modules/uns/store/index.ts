/**
 * UNS Store — Content-Addressed Object Storage
 *
 * S3-compatible object storage, global KV, and edge caching.
 * Every object is stored by its canonical SHA-256 ID.
 * Cache staleness is impossible by design.
 */

export type { StoredObject } from "./object-store";
export { UnsObjectStore } from "./object-store";

export { UnsKv } from "./kv";

export type { CacheStats } from "./cache";
export { UnsCache } from "./cache";
