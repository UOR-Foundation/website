/**
 * UNS Store — Content-Addressed Object Storage
 *
 * Every object is stored by its canonical SHA-256 ID. Identical content
 * is stored exactly once (automatic deduplication). Cache staleness is
 * structurally impossible: canonical ID X always maps to the exact bytes
 * that produced canonical ID X.
 *
 * Two access patterns:
 *   1. Canonical ID (primary) — content-addressed, zero-staleness
 *   2. Bucket/Key (S3-compatible) — maps key → canonical ID via index
 *
 * Deletion is a metadata operation — content-addressed bytes are immutable.
 *
 * @see store: namespace — UOR object storage
 * @see u: namespace — canonical identity
 */

import { singleProofHash } from "../core/identity";
import { analyzePayloadFast } from "../shield/partition";

// ── Types ───────────────────────────────────────────────────────────────────

/** Metadata for a stored object. */
export interface StoredObject {
  /** Canonical ID: urn:uor:derivation:sha256:{hex64}. */
  canonicalId: string;
  /** CIDv1/dag-json/base32lower. */
  cid: string;
  /** IPv6 content address: fd00:0075:6f72:... */
  ipv6: string;
  /** Size in bytes. */
  sizeBytes: number;
  /** MIME content type. */
  contentType: string;
  /** ISO 8601 storage timestamp. */
  storedAt: string;
  /** Irreducible partition density of content bytes. */
  partitionDensity: number;
  /** User-defined metadata. */
  metadata: Record<string, string>;
}

/** Internal storage entry: bytes + metadata. */
interface StoreEntry {
  bytes: Uint8Array;
  meta: StoredObject;
  deleted: boolean;
}

/** S3 key index entry: bucket/key → canonical ID. */
interface KeyIndexEntry {
  canonicalId: string;
  bucket: string;
  key: string;
}

// ── UNS Object Store ────────────────────────────────────────────────────────

/**
 * Content-addressed object store.
 *
 * In-memory implementation for dev; interface designed for distributed backends.
 * Objects are keyed by canonical SHA-256 ID — deduplication is automatic.
 */
export class UnsObjectStore {
  /** Primary store: canonicalId → entry. */
  private readonly objects = new Map<string, StoreEntry>();
  /** S3-compatible key index: "bucket/key" → canonical ID. */
  private readonly keyIndex = new Map<string, KeyIndexEntry>();

  /**
   * Store bytes by canonical ID (content-addressed).
   *
   * If the canonical ID already exists, returns the existing entry
   * without rewriting — deduplication is automatic.
   */
  async put(
    bytes: Uint8Array,
    contentType: string,
    metadata: Record<string, string> = {}
  ): Promise<StoredObject> {
    // Compute canonical identity from raw bytes wrapped as a hashable object
    const identity = await singleProofHash({ raw: uint8ToBase64(bytes) });
    const canonicalId = identity["u:canonicalId"];

    // Deduplication: if already stored, return existing
    const existing = this.objects.get(canonicalId);
    if (existing && !existing.deleted) {
      return existing.meta;
    }

    // Partition analysis for quality scoring
    const partition = analyzePayloadFast(bytes);

    const meta: StoredObject = {
      canonicalId,
      cid: identity["u:cid"],
      ipv6: identity["u:ipv6"],
      sizeBytes: bytes.length,
      contentType,
      storedAt: new Date().toISOString(),
      partitionDensity: partition.density,
      metadata,
    };

    this.objects.set(canonicalId, { bytes: new Uint8Array(bytes), meta, deleted: false });
    return meta;
  }

  /**
   * Retrieve object by canonical ID.
   *
   * Always returns the correct content — staleness is impossible.
   */
  async get(
    canonicalId: string
  ): Promise<{ bytes: Uint8Array; meta: StoredObject } | null> {
    const entry = this.objects.get(canonicalId);
    if (!entry || entry.deleted) return null;
    return { bytes: new Uint8Array(entry.bytes), meta: entry.meta };
  }

  /**
   * Store by S3-compatible bucket/key, mapping to canonical ID.
   */
  async putByKey(
    bucket: string,
    key: string,
    bytes: Uint8Array,
    contentType: string,
    metadata: Record<string, string> = {}
  ): Promise<StoredObject> {
    const meta = await this.put(bytes, contentType, metadata);

    // Map bucket/key → canonical ID
    const indexKey = `${bucket}/${key}`;
    this.keyIndex.set(indexKey, { canonicalId: meta.canonicalId, bucket, key });

    return meta;
  }

  /**
   * Retrieve by S3-compatible bucket/key.
   * Resolves key → canonical ID via index, then fetches by canonical ID.
   */
  async getByKey(
    bucket: string,
    key: string
  ): Promise<{ bytes: Uint8Array; meta: StoredObject } | null> {
    const indexKey = `${bucket}/${key}`;
    const entry = this.keyIndex.get(indexKey);
    if (!entry) return null;
    return this.get(entry.canonicalId);
  }

  /**
   * Mark object as deleted (metadata operation only).
   * Content-addressed bytes are immutable — deletion removes the index entry.
   */
  async delete(canonicalId: string): Promise<void> {
    const entry = this.objects.get(canonicalId);
    if (entry) {
      entry.deleted = true;
    }
    // Remove any key index entries pointing to this canonical ID
    for (const [indexKey, indexEntry] of this.keyIndex.entries()) {
      if (indexEntry.canonicalId === canonicalId) {
        this.keyIndex.delete(indexKey);
      }
    }
  }

  /**
   * List objects in a bucket, with optional prefix filter.
   *
   * @param bucket   Bucket name
   * @param prefix   Optional key prefix filter
   * @param maxKeys  Maximum results (default 1000)
   */
  async list(
    bucket: string,
    prefix?: string,
    maxKeys = 1000
  ): Promise<StoredObject[]> {
    const results: StoredObject[] = [];
    const seen = new Set<string>();

    for (const [, entry] of this.keyIndex.entries()) {
      if (entry.bucket !== bucket) continue;
      if (prefix && !entry.key.startsWith(prefix)) continue;
      if (seen.has(entry.canonicalId)) continue;

      const obj = this.objects.get(entry.canonicalId);
      if (!obj || obj.deleted) continue;

      seen.add(entry.canonicalId);
      results.push(obj.meta);

      if (results.length >= maxKeys) break;
    }

    return results;
  }

  /**
   * Verify integrity: recompute canonical ID from stored bytes.
   *
   * Returns true iff the recomputed ID matches the stored ID.
   * This proves the bytes have not been corrupted or tampered with.
   */
  async verify(canonicalId: string): Promise<boolean> {
    const entry = this.objects.get(canonicalId);
    if (!entry || entry.deleted) return false;

    const identity = await singleProofHash({ raw: uint8ToBase64(entry.bytes) });
    return identity["u:canonicalId"] === canonicalId;
  }

  /** Clear all storage (for testing). */
  clear(): void {
    this.objects.clear();
    this.keyIndex.clear();
  }

  /** Get total object count (excluding deleted). */
  get size(): number {
    let count = 0;
    for (const entry of this.objects.values()) {
      if (!entry.deleted) count++;
    }
    return count;
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
