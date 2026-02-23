/**
 * UNS Core — Name Index
 *
 * In-memory secondary index mapping uns:name → Set<canonicalId>.
 *
 * Updated on every DHT put(). Enables queryByName() without a full
 * DHT keyspace scan. In production this would be backed by LevelDB
 * for restart persistence; here we use a Map for portability.
 *
 * The index is local to each node — not replicated across the DHT.
 * Each node builds its own index from records it stores or receives.
 */

/** A local name-to-canonicalId secondary index. */
export class NameIndex {
  /** name → Set<canonicalId> */
  private readonly index = new Map<string, Set<string>>();

  /**
   * Register a mapping from a name to a canonical ID.
   *
   * @param name         The human-readable UNS name (e.g., "example.uor").
   * @param canonicalId  The canonical ID of the record for that name.
   */
  add(name: string, canonicalId: string): void {
    let ids = this.index.get(name);
    if (!ids) {
      ids = new Set();
      this.index.set(name, ids);
    }
    ids.add(canonicalId);
  }

  /**
   * Look up all canonical IDs associated with a name.
   *
   * @param name  The UNS name to query.
   * @returns     Array of canonical IDs (empty if no records for this name).
   */
  lookup(name: string): string[] {
    const ids = this.index.get(name);
    return ids ? Array.from(ids) : [];
  }

  /**
   * Remove a canonical ID from a name's index entry.
   *
   * @param name         The UNS name.
   * @param canonicalId  The canonical ID to remove.
   */
  remove(name: string, canonicalId: string): void {
    const ids = this.index.get(name);
    if (ids) {
      ids.delete(canonicalId);
      if (ids.size === 0) this.index.delete(name);
    }
  }

  /** Clear the entire index (for testing). */
  clear(): void {
    this.index.clear();
  }

  /** Total number of indexed names. */
  get size(): number {
    return this.index.size;
  }
}
