/**
 * Delta Compression — Temporal State Diff as Triples
 * ═══════════════════════════════════════════════════
 *
 * Computes minimal diffs between successive JSON state snapshots
 * and encodes them as CompressibleTriples. When combined with the
 * UGC1 binary format, achieves 50-100x compression on temporal
 * session chain data vs storing full snapshots.
 *
 * The insight: session states evolve incrementally — typically
 * only 2-5% of keys change per tick. Storing full snapshots is
 * O(n × s) where n = sessions and s = snapshot size. Delta
 * encoding reduces this to O(n × δ) where δ << s.
 *
 * Delta operations are encoded as triples:
 *   (session_cid, delta:set,    "path:value")   — key added/changed
 *   (session_cid, delta:delete, "path")         — key removed
 *   (session_cid, delta:base,   parent_cid)     — links to parent
 *
 * To reconstruct: start from genesis snapshot, apply deltas forward.
 *
 * @module data-bank/lib/delta-compression
 */

import type { CompressibleTriple, CompressionStats } from "./graph-compression";
import { compressToBase64, decompressFromBase64 } from "./graph-compression";

// ── Delta Predicates ────────────────────────────────────────────────

export const DELTA_PREDICATES = {
  /** Key was set or changed: object = "path:json_value" */
  SET: "delta:set",
  /** Key was deleted: object = "path" */
  DELETE: "delta:delete",
  /** Links delta to its base snapshot CID */
  BASE: "delta:base",
  /** Marks a full snapshot (genesis or periodic keyframe) */
  SNAPSHOT: "delta:snapshot",
  /** Metadata: sequence number */
  SEQUENCE: "delta:sequence",
  /** Metadata: zone at this checkpoint */
  ZONE: "delta:zone",
  /** Metadata: h_score */
  H_SCORE: "delta:hScore",
  /** Metadata: observer phi */
  PHI: "delta:phi",
  /** Metadata: memory count */
  MEM_COUNT: "delta:memCount",
} as const;

// ── JSON Diff Engine ────────────────────────────────────────────────

interface DiffOp {
  op: "set" | "delete";
  path: string;
  value?: string; // JSON-encoded value for 'set'
}

/**
 * Compute a flat diff between two JSON objects.
 * Paths are dot-separated keys. Only leaf changes are tracked.
 * Handles nested objects up to 4 levels deep (sufficient for
 * agent state snapshots).
 */
export function diffObjects(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
  prefix = "",
  depth = 0,
): DiffOp[] {
  const ops: DiffOp[] = [];
  const maxDepth = 4;

  const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);

  for (const key of allKeys) {
    const path = prefix ? `${prefix}.${key}` : key;
    const prevVal = prev[key];
    const nextVal = next[key];

    if (!(key in next)) {
      // Key deleted
      ops.push({ op: "delete", path });
    } else if (!(key in prev)) {
      // Key added
      ops.push({ op: "set", path, value: JSON.stringify(nextVal) });
    } else if (
      depth < maxDepth &&
      typeof prevVal === "object" && prevVal !== null && !Array.isArray(prevVal) &&
      typeof nextVal === "object" && nextVal !== null && !Array.isArray(nextVal)
    ) {
      // Recurse into nested objects
      ops.push(
        ...diffObjects(
          prevVal as Record<string, unknown>,
          nextVal as Record<string, unknown>,
          path,
          depth + 1,
        ),
      );
    } else if (JSON.stringify(prevVal) !== JSON.stringify(nextVal)) {
      // Value changed
      ops.push({ op: "set", path, value: JSON.stringify(nextVal) });
    }
  }

  return ops;
}

// ── State Snapshot → Triples ────────────────────────────────────────

/**
 * Encode a full state snapshot as triples (for genesis / keyframes).
 */
export function snapshotToTriples(
  sessionCid: string,
  state: Record<string, unknown>,
  meta: { sequence: number; zone: string; hScore: number; phi: number; memCount: number },
): CompressibleTriple[] {
  const triples: CompressibleTriple[] = [];

  // Full snapshot marker
  triples.push({
    subject: sessionCid,
    predicate: DELTA_PREDICATES.SNAPSHOT,
    object: JSON.stringify(state),
  });

  // Metadata
  triples.push({ subject: sessionCid, predicate: DELTA_PREDICATES.SEQUENCE, object: `${meta.sequence}` });
  triples.push({ subject: sessionCid, predicate: DELTA_PREDICATES.ZONE, object: meta.zone });
  triples.push({ subject: sessionCid, predicate: DELTA_PREDICATES.H_SCORE, object: `${meta.hScore}` });
  triples.push({ subject: sessionCid, predicate: DELTA_PREDICATES.PHI, object: `${meta.phi}` });
  triples.push({ subject: sessionCid, predicate: DELTA_PREDICATES.MEM_COUNT, object: `${meta.memCount}` });

  return triples;
}

/**
 * Encode a delta (diff from parent) as triples.
 */
export function deltaToTriples(
  sessionCid: string,
  parentCid: string,
  prevState: Record<string, unknown>,
  nextState: Record<string, unknown>,
  meta: { sequence: number; zone: string; hScore: number; phi: number; memCount: number },
): CompressibleTriple[] {
  const triples: CompressibleTriple[] = [];
  const ops = diffObjects(prevState, nextState);

  // Link to parent
  triples.push({
    subject: sessionCid,
    predicate: DELTA_PREDICATES.BASE,
    object: parentCid,
  });

  // Diff operations
  for (const op of ops) {
    if (op.op === "set") {
      triples.push({
        subject: sessionCid,
        predicate: DELTA_PREDICATES.SET,
        object: `${op.path}:${op.value}`,
      });
    } else {
      triples.push({
        subject: sessionCid,
        predicate: DELTA_PREDICATES.DELETE,
        object: op.path,
      });
    }
  }

  // Metadata
  triples.push({ subject: sessionCid, predicate: DELTA_PREDICATES.SEQUENCE, object: `${meta.sequence}` });
  triples.push({ subject: sessionCid, predicate: DELTA_PREDICATES.ZONE, object: meta.zone });
  triples.push({ subject: sessionCid, predicate: DELTA_PREDICATES.H_SCORE, object: `${meta.hScore}` });
  triples.push({ subject: sessionCid, predicate: DELTA_PREDICATES.PHI, object: `${meta.phi}` });
  triples.push({ subject: sessionCid, predicate: DELTA_PREDICATES.MEM_COUNT, object: `${meta.memCount}` });

  return triples;
}

// ── Reconstruction ──────────────────────────────────────────────────

/**
 * Apply a delta's SET/DELETE ops to a base state, producing the next state.
 */
export function applyDelta(
  base: Record<string, unknown>,
  deltaTriples: CompressibleTriple[],
): Record<string, unknown> {
  const state = structuredClone(base);

  for (const t of deltaTriples) {
    if (t.predicate === DELTA_PREDICATES.SET) {
      const colonIdx = t.object.indexOf(":");
      if (colonIdx === -1) continue;
      const path = t.object.slice(0, colonIdx);
      const valueJson = t.object.slice(colonIdx + 1);
      setNestedValue(state, path, JSON.parse(valueJson));
    } else if (t.predicate === DELTA_PREDICATES.DELETE) {
      deleteNestedValue(state, t.object);
    }
  }

  return state;
}

/**
 * Reconstruct full state from a chain of delta-encoded triple sets.
 * First element must be a snapshot (genesis), rest are deltas.
 */
export function reconstructChain(
  tripleSets: CompressibleTriple[][],
): Record<string, unknown>[] {
  const states: Record<string, unknown>[] = [];

  for (let i = 0; i < tripleSets.length; i++) {
    const triples = tripleSets[i];
    const snapshotTriple = triples.find(t => t.predicate === DELTA_PREDICATES.SNAPSHOT);

    if (snapshotTriple) {
      // Full snapshot — parse directly
      states.push(JSON.parse(snapshotTriple.object));
    } else if (states.length > 0) {
      // Delta — apply to previous state
      states.push(applyDelta(states[states.length - 1], triples));
    }
  }

  return states;
}

// ── Compression round-trip ──────────────────────────────────────────

export interface DeltaChainStats {
  sessionCount: number;
  totalTriples: number;
  rawSnapshotBytes: number;
  compressedBytes: number;
  ratio: number;
  keyframeCount: number;
  avgDeltaOps: number;
}

/** Keyframe interval: store a full snapshot every N sessions for fast random access */
const KEYFRAME_INTERVAL = 10;

/**
 * Compress an entire session chain into a single UGC1 blob.
 * Automatically inserts keyframes every KEYFRAME_INTERVAL sessions.
 */
export function compressSessionChain(
  sessions: Array<{
    sessionCid: string;
    parentCid: string | null;
    state: Record<string, unknown>;
    sequence: number;
    zone: string;
    hScore: number;
    phi: number;
    memCount: number;
  }>,
): { encoded: string; stats: DeltaChainStats } {
  const allTriples: CompressibleTriple[] = [];
  let totalDeltaOps = 0;
  let keyframeCount = 0;
  const rawSnapshots = JSON.stringify(sessions.map(s => s.state));
  const rawBytes = new TextEncoder().encode(rawSnapshots).length;

  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i];
    const isKeyframe = i === 0 || i % KEYFRAME_INTERVAL === 0;
    const meta = {
      sequence: s.sequence,
      zone: s.zone,
      hScore: s.hScore,
      phi: s.phi,
      memCount: s.memCount,
    };

    if (isKeyframe || !s.parentCid) {
      // Store full snapshot
      allTriples.push(...snapshotToTriples(s.sessionCid, s.state, meta));
      keyframeCount++;
    } else {
      // Store delta from previous
      const prevState = sessions[i - 1].state;
      const delta = deltaToTriples(s.sessionCid, s.parentCid, prevState, s.state, meta);
      allTriples.push(...delta);
      // Count actual diff ops (exclude metadata)
      const diffOps = delta.filter(
        t => t.predicate === DELTA_PREDICATES.SET || t.predicate === DELTA_PREDICATES.DELETE,
      );
      totalDeltaOps += diffOps.length;
    }
  }

  const { encoded, stats: compressionStats } = compressToBase64(allTriples);
  const deltaSessionCount = Math.max(1, sessions.length - keyframeCount);

  return {
    encoded,
    stats: {
      sessionCount: sessions.length,
      totalTriples: allTriples.length,
      rawSnapshotBytes: rawBytes,
      compressedBytes: compressionStats.compressedBytes,
      ratio: rawBytes / compressionStats.compressedBytes,
      keyframeCount,
      avgDeltaOps: totalDeltaOps / deltaSessionCount,
    },
  };
}

/**
 * Decompress a UGC1 blob back to reconstructed session states.
 */
export function decompressSessionChain(
  encoded: string,
): Array<{ sessionCid: string; state: Record<string, unknown>; sequence: number; zone: string }> {
  const triples = decompressFromBase64(encoded);

  // Group triples by subject (session CID)
  const grouped = new Map<string, CompressibleTriple[]>();
  const orderMap = new Map<string, number>(); // session CID → sequence

  for (const t of triples) {
    if (!grouped.has(t.subject)) grouped.set(t.subject, []);
    grouped.get(t.subject)!.push(t);

    if (t.predicate === DELTA_PREDICATES.SEQUENCE) {
      orderMap.set(t.subject, parseInt(t.object, 10));
    }
  }

  // Sort by sequence number
  const sortedCids = [...grouped.keys()].sort(
    (a, b) => (orderMap.get(a) ?? 0) - (orderMap.get(b) ?? 0),
  );

  // Reconstruct chain
  const results: Array<{ sessionCid: string; state: Record<string, unknown>; sequence: number; zone: string }> = [];
  let prevState: Record<string, unknown> = {};

  for (const cid of sortedCids) {
    const sessionTriples = grouped.get(cid)!;
    const snapshotTriple = sessionTriples.find(t => t.predicate === DELTA_PREDICATES.SNAPSHOT);
    const zoneTriple = sessionTriples.find(t => t.predicate === DELTA_PREDICATES.ZONE);
    const seqTriple = sessionTriples.find(t => t.predicate === DELTA_PREDICATES.SEQUENCE);

    let state: Record<string, unknown>;
    if (snapshotTriple) {
      state = JSON.parse(snapshotTriple.object);
    } else {
      state = applyDelta(prevState, sessionTriples);
    }

    results.push({
      sessionCid: cid,
      state,
      sequence: seqTriple ? parseInt(seqTriple.object, 10) : 0,
      zone: zoneTriple?.object ?? "COHERENCE",
    });

    prevState = state;
  }

  return results;
}

// ── Nested value helpers ────────────────────────────────────────────

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof current[parts[i]] !== "object" || current[parts[i]] === null) {
      current[parts[i]] = {};
    }
    current = current[parts[i]] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

function deleteNestedValue(obj: Record<string, unknown>, path: string): void {
  const parts = path.split(".");
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof current[parts[i]] !== "object" || current[parts[i]] === null) return;
    current = current[parts[i]] as Record<string, unknown>;
  }
  delete current[parts[parts.length - 1]];
}
