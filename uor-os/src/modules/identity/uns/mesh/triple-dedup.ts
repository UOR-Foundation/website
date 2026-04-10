/**
 * UNS Mesh — Content-Addressed Triple Deduplication
 * ═════════════════════════════════════════════════════════════════
 *
 * Every triple (subject, predicate, object, graphIri) maps to a
 * deterministic CID via singleProofHash. Identical triples on
 * different devices produce the same CID — merge is automatic.
 *
 * Conflict resolution for competing writes to the same
 * subject+predicate uses Lamport timestamps embedded in the
 * change envelope. Deletions are tombstones.
 *
 * @module uns/mesh/triple-dedup
 * @layer 1
 */

import { sha256hex } from "@/lib/crypto";
import type { ChangeEnvelope, ChangePayload } from "@/modules/data/sovereign-spaces/types";

// ── Triple CID ──────────────────────────────────────────────────────────────

/**
 * Compute the canonical CID for a triple.
 * Same triple always produces the same CID regardless of device or time.
 */
export async function tripleCid(
  subject: string,
  predicate: string,
  object: string,
  graphIri: string,
): Promise<string> {
  return sha256hex(JSON.stringify({
    "@type": "uor:Triple",
    "uor:subject": subject,
    "uor:predicate": predicate,
    "uor:object": object,
    "uor:graph": graphIri,
  }));
}

/**
 * Compute the canonical CID for a change payload's triple content.
 */
export async function payloadTripleCid(
  payload: ChangePayload,
  graphIri: string,
): Promise<string | null> {
  if (!payload.subject || !payload.predicate || !payload.object) return null;
  return tripleCid(payload.subject, payload.predicate, payload.object, graphIri);
}

// ── Dedup Index ─────────────────────────────────────────────────────────────

interface TripleEntry {
  /** CID of the triple content */
  tripleCid: string;
  /** CID of the change envelope that last wrote this triple */
  changeCid: string;
  /** Lamport timestamp of the last write */
  lamport: number;
  /** Operation: insert or delete (tombstone) */
  operation: "insert" | "delete";
}

/**
 * In-memory dedup index keyed by triple CID.
 * In production, this backs onto the local GrafeoDB store.
 */
const dedupIndex = new Map<string, TripleEntry>();

/** Exported for testing */
export function getDedupIndex(): ReadonlyMap<string, TripleEntry> {
  return dedupIndex;
}

export function clearDedupIndex(): void {
  dedupIndex.clear();
}

// ── Merge with Dedup ────────────────────────────────────────────────────────

export interface DedupResult {
  /** Changes that were actually applied (not duplicates) */
  applied: ChangeEnvelope[];
  /** Changes that were deduplicated (identical content) */
  deduplicated: number;
  /** Changes that were skipped (older Lamport) */
  conflictsResolved: number;
  /** Total triples in the index after merge */
  totalTriples: number;
}

/**
 * Apply a batch of change envelopes with content-addressed deduplication.
 *
 * For each change:
 * 1. Compute the triple's canonical CID
 * 2. If the CID exists in the index with the same operation → dedup (skip)
 * 3. If the CID exists but with a different operation or older Lamport → LWW
 * 4. If the CID is new → apply
 *
 * @param changes - Sorted change envelopes (topological order from mergeChanges)
 * @param graphIri - The graph IRI for triple CID computation
 */
export async function applyWithDedup(
  changes: ChangeEnvelope[],
  graphIri: string,
): Promise<DedupResult> {
  const applied: ChangeEnvelope[] = [];
  let deduplicated = 0;
  let conflictsResolved = 0;

  for (const change of changes) {
    const { payload } = change;

    // Non-triple operations (node-level) always apply
    if (!payload.subject || !payload.predicate || !payload.object) {
      applied.push(change);
      continue;
    }

    const tcid = await tripleCid(
      payload.subject, payload.predicate, payload.object, graphIri,
    );

    const existing = dedupIndex.get(tcid);

    if (!existing) {
      // New triple — apply
      dedupIndex.set(tcid, {
        tripleCid: tcid,
        changeCid: change.changeCid,
        lamport: change.createdAt, // Use timestamp as Lamport proxy
        operation: payload.operation === "delete" ? "delete" : "insert",
      });
      applied.push(change);
      continue;
    }

    // Same operation on same triple → pure dedup
    const op = payload.operation === "delete" ? "delete" : "insert";
    if (existing.operation === op && existing.changeCid === change.changeCid) {
      deduplicated++;
      continue;
    }

    // Conflict: different operation or different change on same triple
    // Last-Writer-Wins by Lamport timestamp
    if (change.createdAt > existing.lamport) {
      dedupIndex.set(tcid, {
        tripleCid: tcid,
        changeCid: change.changeCid,
        lamport: change.createdAt,
        operation: op,
      });
      applied.push(change);
      conflictsResolved++;
    } else if (change.createdAt === existing.lamport) {
      // Tie-break by CID (deterministic)
      if (change.changeCid > existing.changeCid) {
        dedupIndex.set(tcid, {
          tripleCid: tcid,
          changeCid: change.changeCid,
          lamport: change.createdAt,
          operation: op,
        });
        applied.push(change);
        conflictsResolved++;
      } else {
        deduplicated++;
      }
    } else {
      // Older — skip
      deduplicated++;
    }
  }

  return {
    applied,
    deduplicated,
    conflictsResolved,
    totalTriples: dedupIndex.size,
  };
}

// ── Subject+Predicate Conflict Detection ────────────────────────────────────

/**
 * For a set of changes, identify subject+predicate pairs that have
 * competing values from different devices.
 */
export function detectConflicts(
  changes: ChangeEnvelope[],
): Array<{ subject: string; predicate: string; competing: ChangeEnvelope[] }> {
  const byKey = new Map<string, ChangeEnvelope[]>();

  for (const c of changes) {
    if (!c.payload.subject || !c.payload.predicate) continue;
    if (c.payload.operation === "delete") continue;
    const key = `${c.payload.subject}::${c.payload.predicate}`;
    const group = byKey.get(key) ?? [];
    group.push(c);
    byKey.set(key, group);
  }

  const conflicts: Array<{ subject: string; predicate: string; competing: ChangeEnvelope[] }> = [];

  for (const [key, group] of byKey) {
    if (group.length <= 1) continue;
    // Multiple changes to the same s+p from different devices
    const devices = new Set(group.map(c => c.authorDeviceId));
    if (devices.size > 1) {
      const [subject, predicate] = key.split("::");
      conflicts.push({ subject, predicate, competing: group });
    }
  }

  return conflicts;
}

// ── Stats ───────────────────────────────────────────────────────────────────

export function getDedupStats(): {
  totalTriples: number;
  insertCount: number;
  tombstoneCount: number;
} {
  let insertCount = 0;
  let tombstoneCount = 0;
  for (const entry of dedupIndex.values()) {
    if (entry.operation === "insert") insertCount++;
    else tombstoneCount++;
  }
  return { totalTriples: dedupIndex.size, insertCount, tombstoneCount };
}
