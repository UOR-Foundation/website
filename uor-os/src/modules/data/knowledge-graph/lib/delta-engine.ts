/**
 * Delta Engine — Morphism-Only Computation & Storage.
 * ════════════════════════════════════════════════════
 *
 * The CANONICAL computation substrate. Every state transition is a
 * content-addressed delta (morphism chain) between UOR addresses.
 * Full objects are never stored twice — only the edge connecting
 * address A to address B exists. Reconstruction is lazy navigation.
 *
 * Computation ≡ Graph Traversal ≡ Address Resolution.
 *
 * This module replaces all competing compute/store patterns with a
 * single unified delta-based paradigm:
 *
 *   computeDelta()       — Find minimal morphism path between addresses
 *   applyDelta()         — Navigate from source through delta to target
 *   composeDelta()       — Concatenate delta chains (functorial)
 *   invertDelta()        — Reverse a delta chain
 *   compressDeltaChain() — Collapse redundant operations
 *   createPool()         — Lazily-evaluated address set from root
 *   poolReach()          — All reachable addresses without materialization
 *   poolMaterialize()    — On-demand reconstruction via delta navigation
 *
 * @module knowledge-graph/lib/delta-engine
 */

import { adjacencyIndex } from "./adjacency-index";
import {
  applyMorphism,
  composeMorphisms,
  materializeMorphismEdge,
  type PrimitiveOp,
  type GraphMorphism,
} from "./graph-morphisms";
import { singleProofHash } from "@/lib/uor-canonical";
import { sparqlQuery, sparqlUpdate, type SparqlBinding } from "../grafeo-store";

// ── Types ───────────────────────────────────────────────────────────────────

/** A content-addressed delta between two UOR addresses. */
export interface Delta {
  /** Source UOR address (IRI). */
  source: string;
  /** Target UOR address (IRI). */
  target: string;
  /** Ordered morphism chain: the minimal transformation path. */
  chain: DeltaStep[];
  /** Content-addressed digest of this delta. */
  digest: string;
  /** Byte size of the delta representation. */
  byteSize: number;
  /** Timestamp of creation. */
  createdAt: number;
}

/** A single step in a delta chain. */
export interface DeltaStep {
  op: PrimitiveOp;
  operand?: number;
  /** IRI of intermediate result (for chain verification). */
  intermediateIri?: string;
}

/** A lazily-evaluated pool of addresses reachable from a root. */
export interface DeltaPool {
  /** Root address anchoring this pool. */
  rootIri: string;
  /** Known deltas indexed by "source|target". */
  deltas: Map<string, Delta>;
  /** Cached reachable set (invalidated on mutation). */
  _reachableCache: Set<string> | null;
  /** Creation timestamp. */
  createdAt: number;
}

/** Performance metrics collected during delta operations. */
export interface DeltaMetrics {
  /** Total deltas computed. */
  deltasComputed: number;
  /** Total deltas applied (navigated). */
  deltasApplied: number;
  /** Total compositions performed. */
  compositions: number;
  /** Total inversions performed. */
  inversions: number;
  /** Total compressions performed. */
  compressions: number;
  /** Cumulative bytes saved by compression. */
  bytesSaved: number;
  /** Average delta chain length. */
  avgChainLength: number;
  /** Average compute latency in ms. */
  avgLatencyMs: number;
  /** Compression ratio: original / compressed. */
  compressionRatio: number;
  /** Total latency samples. */
  _latencySamples: number[];
  /** Total chain lengths. */
  _chainLengths: number[];
}

/** Inverse operation map for algebraic cancellation. */
const INVERSE_OPS: Record<string, PrimitiveOp> = {
  add: "sub",
  sub: "add",
  succ: "pred",
  pred: "succ",
  neg: "neg",
  bnot: "bnot",
};

/** Identity pairs that cancel out. */
const IDENTITY_PAIRS: Array<[PrimitiveOp, PrimitiveOp]> = [
  ["succ", "pred"],
  ["pred", "succ"],
  ["neg", "neg"],
  ["bnot", "bnot"],
];

// ── Singleton Metrics ───────────────────────────────────────────────────────

const metrics: DeltaMetrics = {
  deltasComputed: 0,
  deltasApplied: 0,
  compositions: 0,
  inversions: 0,
  compressions: 0,
  bytesSaved: 0,
  avgChainLength: 0,
  avgLatencyMs: 0,
  compressionRatio: 1,
  _latencySamples: [],
  _chainLengths: [],
};

function recordLatency(ms: number): void {
  metrics._latencySamples.push(ms);
  if (metrics._latencySamples.length > 1000) metrics._latencySamples.shift();
  metrics.avgLatencyMs =
    metrics._latencySamples.reduce((a, b) => a + b, 0) /
    metrics._latencySamples.length;
}

function recordChainLength(len: number): void {
  metrics._chainLengths.push(len);
  if (metrics._chainLengths.length > 1000) metrics._chainLengths.shift();
  metrics.avgChainLength =
    metrics._chainLengths.reduce((a, b) => a + b, 0) /
    metrics._chainLengths.length;
}

// ── Core Delta Operations ───────────────────────────────────────────────────

/**
 * Compute the minimal delta (morphism path) between two UOR addresses.
 * Uses the adjacency index for O(1)-per-hop shortest-path search.
 */
export async function computeDelta(
  sourceIri: string,
  targetIri: string,
): Promise<Delta> {
  const t0 = performance.now();
  metrics.deltasComputed++;

  // Use adjacency index for shortest path
  const path = adjacencyIndex.shortestPath(sourceIri, targetIri, 20);

  const chain: DeltaStep[] = [];

  if (path && path.length > 1) {
    // Convert path to delta steps using edge labels
    for (let i = 0; i < path.length - 1; i++) {
      const label = adjacencyIndex.getEdgeLabel(path[i], path[i + 1]);
      const op = extractOp(label || "related");
      chain.push({
        op,
        intermediateIri: path[i + 1],
      });
    }
  } else {
    // Direct computation: identity delta
    chain.push({ op: "add" as PrimitiveOp, operand: 0, intermediateIri: targetIri });
  }

  // Content-address the delta itself
  const deltaPayload = {
    "@type": "uor:Delta",
    "uor:source": sourceIri,
    "uor:target": targetIri,
    "uor:chain": chain.map((s) => ({ op: s.op, operand: s.operand })),
  };
  const proof = await singleProofHash(deltaPayload);
  const digest = proof.cid;

  const serialized = JSON.stringify(deltaPayload);
  const byteSize = new TextEncoder().encode(serialized).length;

  recordLatency(performance.now() - t0);
  recordChainLength(chain.length);

  return {
    source: sourceIri,
    target: targetIri,
    chain,
    digest,
    byteSize,
    createdAt: Date.now(),
  };
}

/**
 * Apply a delta: navigate from source through the chain to arrive at target.
 * Pure address lookup — no recomputation of full objects.
 */
export async function applyDelta(
  sourceIri: string,
  delta: Delta,
): Promise<string> {
  const t0 = performance.now();
  metrics.deltasApplied++;

  if (delta.chain.length === 0) return sourceIri;

  // Navigate through intermediate IRIs if available
  let currentIri = sourceIri;
  for (const step of delta.chain) {
    if (step.intermediateIri) {
      currentIri = step.intermediateIri;
    } else {
      // Fallback: compute via morphism
      const result = await applyMorphism(currentIri, step.op, step.operand);
      currentIri = result.resultIri;
    }
  }

  recordLatency(performance.now() - t0);
  return currentIri;
}

/**
 * Compose two deltas into one (functorial composition).
 * If A→B and B→C, produces A→C as a single content-addressed delta.
 */
export async function composeDelta(a: Delta, b: Delta): Promise<Delta> {
  const t0 = performance.now();
  metrics.compositions++;

  const composedChain: DeltaStep[] = [...a.chain, ...b.chain];

  const deltaPayload = {
    "@type": "uor:Delta",
    "uor:source": a.source,
    "uor:target": b.target,
    "uor:chain": composedChain.map((s) => ({ op: s.op, operand: s.operand })),
  };
  const proof = await singleProofHash(deltaPayload);

  const serialized = JSON.stringify(deltaPayload);
  const byteSize = new TextEncoder().encode(serialized).length;

  recordLatency(performance.now() - t0);
  recordChainLength(composedChain.length);

  return {
    source: a.source,
    target: b.target,
    chain: composedChain,
    digest: proof.cid,
    byteSize,
    createdAt: Date.now(),
  };
}

/**
 * Invert a delta: produce the reverse transformation (target→source).
 * Every ring operation has a known algebraic inverse.
 */
export async function invertDelta(delta: Delta): Promise<Delta> {
  const t0 = performance.now();
  metrics.inversions++;

  const invertedChain: DeltaStep[] = delta.chain
    .slice()
    .reverse()
    .map((step) => ({
      op: (INVERSE_OPS[step.op] || step.op) as PrimitiveOp,
      operand: step.operand,
      intermediateIri: undefined, // Intermediates must be recomputed
    }));

  const deltaPayload = {
    "@type": "uor:Delta",
    "uor:source": delta.target,
    "uor:target": delta.source,
    "uor:chain": invertedChain.map((s) => ({ op: s.op, operand: s.operand })),
  };
  const proof = await singleProofHash(deltaPayload);
  const serialized = JSON.stringify(deltaPayload);

  recordLatency(performance.now() - t0);

  return {
    source: delta.target,
    target: delta.source,
    chain: invertedChain,
    digest: proof.cid,
    byteSize: new TextEncoder().encode(serialized).length,
    createdAt: Date.now(),
  };
}

/**
 * Compress a delta chain by eliminating algebraically redundant steps.
 * E.g. succ→pred = identity, neg→neg = identity, add(5)→sub(5) = identity.
 */
export async function compressDeltaChain(delta: Delta): Promise<Delta> {
  const t0 = performance.now();
  metrics.compressions++;

  const originalSize = delta.byteSize;
  let chain = [...delta.chain];
  let changed = true;

  // Iteratively cancel identity pairs
  while (changed) {
    changed = false;
    const next: DeltaStep[] = [];

    for (let i = 0; i < chain.length; i++) {
      if (i + 1 < chain.length && isIdentityPair(chain[i], chain[i + 1])) {
        // Cancel the pair
        i++; // Skip next
        changed = true;
        continue;
      }
      next.push(chain[i]);
    }
    chain = next;
  }

  // Merge consecutive same-ops (e.g. add(3) + add(5) → add(8))
  const merged: DeltaStep[] = [];
  for (const step of chain) {
    const prev = merged[merged.length - 1];
    if (
      prev &&
      prev.op === step.op &&
      prev.operand !== undefined &&
      step.operand !== undefined &&
      isMergeable(step.op)
    ) {
      prev.operand = (prev.operand + step.operand) & 0xff; // mod 256 for ring
      continue;
    }
    merged.push({ ...step });
  }

  const deltaPayload = {
    "@type": "uor:Delta",
    "uor:source": delta.source,
    "uor:target": delta.target,
    "uor:chain": merged.map((s) => ({ op: s.op, operand: s.operand })),
  };
  const proof = await singleProofHash(deltaPayload);
  const serialized = JSON.stringify(deltaPayload);
  const newSize = new TextEncoder().encode(serialized).length;

  const saved = originalSize - newSize;
  if (saved > 0) metrics.bytesSaved += saved;

  // Update compression ratio
  if (metrics.compressions > 0 && originalSize > 0) {
    metrics.compressionRatio =
      (metrics.compressionRatio * (metrics.compressions - 1) + originalSize / Math.max(newSize, 1)) /
      metrics.compressions;
  }

  recordLatency(performance.now() - t0);

  return {
    source: delta.source,
    target: delta.target,
    chain: merged,
    digest: proof.cid,
    byteSize: newSize,
    createdAt: Date.now(),
  };
}

/**
 * Materialize a delta as graph edges in GrafeoDB.
 * Stores the delta as a first-class graph object.
 */
export async function materializeDelta(delta: Delta): Promise<void> {
  const sparql = `
    INSERT DATA {
      <${delta.source}>
        <urn:uor:delta:to> <${delta.target}> .
      <${delta.source}>
        <urn:uor:delta:digest> "${delta.digest}" .
      <${delta.source}>
        <urn:uor:delta:chainLength> "${delta.chain.length}" .
      <${delta.source}>
        <urn:uor:delta:byteSize> "${delta.byteSize}" .
    }
  `;
  await sparqlUpdate(sparql);

  // Update adjacency index
  adjacencyIndex.addEdge(delta.source, `delta:${delta.chain.map((s) => s.op).join("→")}`, delta.target);
}

// ── Delta Pool ──────────────────────────────────────────────────────────────

/**
 * Create a pool anchored at a root address.
 * The pool lazily evaluates all reachable addresses via known deltas.
 */
export function createPool(rootIri: string): DeltaPool {
  return {
    rootIri,
    deltas: new Map(),
    _reachableCache: null,
    createdAt: Date.now(),
  };
}

/**
 * Add a delta to a pool.
 */
export function poolAddDelta(pool: DeltaPool, delta: Delta): void {
  pool.deltas.set(`${delta.source}|${delta.target}`, delta);
  pool._reachableCache = null; // Invalidate cache
}

/**
 * Get all reachable addresses from the pool root without materializing objects.
 */
export function poolReach(pool: DeltaPool): Set<string> {
  if (pool._reachableCache) return pool._reachableCache;

  const reachable = new Set<string>([pool.rootIri]);
  const queue = [pool.rootIri];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const [key, delta] of pool.deltas) {
      if (delta.source === current && !reachable.has(delta.target)) {
        reachable.add(delta.target);
        queue.push(delta.target);
      }
    }
  }

  pool._reachableCache = reachable;
  return reachable;
}

/**
 * Lazily reconstruct one specific address by navigating deltas from root.
 * Returns the delta chain that reaches the target, or null if unreachable.
 */
export async function poolMaterialize(
  pool: DeltaPool,
  targetIri: string,
): Promise<Delta | null> {
  if (targetIri === pool.rootIri) {
    return {
      source: pool.rootIri,
      target: pool.rootIri,
      chain: [],
      digest: "identity",
      byteSize: 0,
      createdAt: Date.now(),
    };
  }

  // BFS to find path from root to target through pool deltas
  const visited = new Set<string>([pool.rootIri]);
  const queue: Array<{ iri: string; path: Delta[] }> = [
    { iri: pool.rootIri, path: [] },
  ];

  while (queue.length > 0) {
    const { iri, path } = queue.shift()!;

    for (const [, delta] of pool.deltas) {
      if (delta.source === iri && !visited.has(delta.target)) {
        const newPath = [...path, delta];

        if (delta.target === targetIri) {
          // Compose all deltas in path into single delta
          if (newPath.length === 1) return newPath[0];
          let composed = newPath[0];
          for (let i = 1; i < newPath.length; i++) {
            composed = await composeDelta(composed, newPath[i]);
          }
          return composed;
        }

        visited.add(delta.target);
        queue.push({ iri: delta.target, path: newPath });
      }
    }
  }

  return null;
}

/**
 * Get pool statistics.
 */
export function poolStats(pool: DeltaPool): {
  rootIri: string;
  deltaCount: number;
  reachableCount: number;
  totalBytes: number;
  avgChainLength: number;
} {
  const reachable = poolReach(pool);
  let totalBytes = 0;
  let totalChain = 0;

  for (const [, delta] of pool.deltas) {
    totalBytes += delta.byteSize;
    totalChain += delta.chain.length;
  }

  return {
    rootIri: pool.rootIri,
    deltaCount: pool.deltas.size,
    reachableCount: reachable.size,
    totalBytes,
    avgChainLength: pool.deltas.size > 0 ? totalChain / pool.deltas.size : 0,
  };
}

// ── Metrics API ─────────────────────────────────────────────────────────────

/** Get current delta engine performance metrics (read-only snapshot). */
export function getDeltaMetrics(): Omit<DeltaMetrics, "_latencySamples" | "_chainLengths"> {
  const { _latencySamples, _chainLengths, ...public_ } = metrics;
  return { ...public_ };
}

/** Reset all metrics (for testing). */
export function resetDeltaMetrics(): void {
  metrics.deltasComputed = 0;
  metrics.deltasApplied = 0;
  metrics.compositions = 0;
  metrics.inversions = 0;
  metrics.compressions = 0;
  metrics.bytesSaved = 0;
  metrics.avgChainLength = 0;
  metrics.avgLatencyMs = 0;
  metrics.compressionRatio = 1;
  metrics._latencySamples = [];
  metrics._chainLengths = [];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function extractOp(label: string): PrimitiveOp {
  // Extract op from edge labels like "urn:uor:morphism:add" or "delta:add→sub"
  const match = label.match(/(?:morphism:|delta:)?(\w+)/);
  const op = match?.[1] || "add";
  const valid: PrimitiveOp[] = ["add", "sub", "mul", "neg", "bnot", "succ", "pred", "xor", "and", "or"];
  return valid.includes(op as PrimitiveOp) ? (op as PrimitiveOp) : "add";
}

function isIdentityPair(a: DeltaStep, b: DeltaStep): boolean {
  for (const [x, y] of IDENTITY_PAIRS) {
    if (a.op === x && b.op === y) return true;
  }
  // add(n) + sub(n) = identity
  if (a.op === "add" && b.op === "sub" && a.operand === b.operand) return true;
  if (a.op === "sub" && b.op === "add" && a.operand === b.operand) return true;
  if (a.op === "mul" && b.op === "mul" && a.operand === 1 && b.operand === 1) return true;
  return false;
}

function isMergeable(op: PrimitiveOp): boolean {
  return op === "add" || op === "sub" || op === "xor" || op === "and" || op === "or";
}
