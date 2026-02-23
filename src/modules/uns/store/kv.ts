/**
 * UNS KV — Linearizable Global Key-Value Store
 *
 * Keys: arbitrary strings up to 512 bytes (no path separators or quotes).
 * Values: Uint8Array up to 25 MB.
 * Every write returns the canonical ID of the value bytes.
 *
 * Consistency model: linearizable writes. In production, the DHT
 * provides quorum agreement (k=20) before confirming a write.
 * This implementation uses an in-memory Map for dev; the interface
 * is designed for distributed backends.
 *
 * Content-addressing guarantee: the canonical ID of a value is
 * derived from the value bytes themselves — identical values
 * always produce identical canonical IDs.
 *
 * @see store: namespace — UOR object storage
 * @see resolver: namespace — DHT-backed global consistency
 */

import { singleProofHash } from "../core/identity";

// ── Constants ───────────────────────────────────────────────────────────────

const MAX_KEY_BYTES = 512;
const MAX_VALUE_BYTES = 25 * 1024 * 1024; // 25 MB
const KEY_FORBIDDEN = /[/"']/;

// ── Types ───────────────────────────────────────────────────────────────────

/** KV entry stored internally. */
interface KvEntry {
  key: string;
  value: Uint8Array;
  canonicalId: string;
  writtenAt: string;
}

// ── UNS KV ──────────────────────────────────────────────────────────────────

export class UnsKv {
  private readonly entries = new Map<string, KvEntry>();

  /** Retrieve a value by key. Returns null if not found. */
  async get(
    key: string
  ): Promise<{ value: Uint8Array; canonicalId: string } | null> {
    const entry = this.entries.get(key);
    if (!entry) return null;
    return { value: new Uint8Array(entry.value), canonicalId: entry.canonicalId };
  }

  /**
   * Write a key-value pair. Returns the canonical ID of the value bytes.
   *
   * @throws Error if key exceeds 512 bytes or contains forbidden characters.
   * @throws Error if value exceeds 25 MB.
   */
  async put(
    key: string,
    value: Uint8Array
  ): Promise<{ canonicalId: string; writtenAt: string }> {
    this.validateKey(key);
    this.validateValue(value);

    const canonicalId = await this.computeValueCanonicalId(value);
    const writtenAt = new Date().toISOString();

    this.entries.set(key, {
      key,
      value: new Uint8Array(value),
      canonicalId,
      writtenAt,
    });

    return { canonicalId, writtenAt };
  }

  /**
   * Conditional put: write only if the current value's canonical ID
   * matches the expected one. Enables optimistic concurrency control.
   */
  async putIfMatch(
    key: string,
    value: Uint8Array,
    expectedCanonicalId: string
  ): Promise<{ ok: boolean; canonicalId?: string }> {
    const current = this.entries.get(key);
    const currentId = current?.canonicalId ?? null;

    if (currentId !== expectedCanonicalId) {
      return { ok: false };
    }

    const { canonicalId } = await this.put(key, value);
    return { ok: true, canonicalId };
  }

  /** Delete a key. Idempotent — deleting a nonexistent key is a no-op. */
  async delete(key: string): Promise<void> {
    this.entries.delete(key);
  }

  /**
   * List keys with optional prefix filter.
   *
   * @param prefix  Key prefix to match (default: all keys).
   * @param limit   Maximum results (default: 1000).
   */
  async list(
    prefix?: string,
    limit = 1000
  ): Promise<Array<{ key: string; canonicalId: string }>> {
    const results: Array<{ key: string; canonicalId: string }> = [];

    for (const entry of this.entries.values()) {
      if (prefix && !entry.key.startsWith(prefix)) continue;
      results.push({ key: entry.key, canonicalId: entry.canonicalId });
      if (results.length >= limit) break;
    }

    return results;
  }

  /** Clear all entries (for testing). */
  clear(): void {
    this.entries.clear();
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private validateKey(key: string): void {
    const keyBytes = new TextEncoder().encode(key);
    if (keyBytes.length > MAX_KEY_BYTES) {
      throw new Error(`Key exceeds ${MAX_KEY_BYTES} bytes`);
    }
    if (KEY_FORBIDDEN.test(key)) {
      throw new Error("Key contains forbidden characters (/, \", ')");
    }
  }

  private validateValue(value: Uint8Array): void {
    if (value.length > MAX_VALUE_BYTES) {
      throw new Error(`Value exceeds ${MAX_VALUE_BYTES} bytes`);
    }
  }

  private async computeValueCanonicalId(value: Uint8Array): Promise<string> {
    let binary = "";
    for (const b of value) binary += String.fromCharCode(b);
    const identity = await singleProofHash({ raw: btoa(binary) });
    return identity["u:canonicalId"];
  }
}
