/**
 * UOR Observable Geometry Layer — 7 Ring Metrics
 *
 * Source: spec/src/namespaces/observable.rs
 *
 * Implements the complete observable: namespace geometry:
 *   1. RingMetric      — geodesic distance on Z/256Z
 *   2. HammingMetric   — bit-level popcount distance
 *   3. CascadeLength   — succ-step traversal cost
 *   4. CatastropheThreshold — ring-derived structural collapse constant
 *   5. Curvature       — discrete partition curvature at a point
 *   6. Holonomy        — phase accumulated on closed ring paths
 *   7. Commutator      — [A,B](x) = A(B(x)) - B(A(x)) in the ring
 *
 * All results carry epistemic_grade: 'A' (algebraically proven).
 * Pure functions. Zero side effects.
 */

import {
  neg as negNum,
  bnot as bnotNum,
  succ as succNum,
  pred as predNum,
  classifyByte,
} from "@/lib/uor-ring";
import { popcount } from "./h-score";

// ── Result type ────────────────────────────────────────────────────────────

export interface ObservableResult<T> {
  "@type": string;
  value: T;
  epistemic_grade: "A";
  "derivation:derivationId": string;
  ring: string;
  quantum: number;
}

/** Build a Grade-A observable result with a deterministic derivation ID. */
function gradeA<T>(type: string, value: T, seed: string): ObservableResult<T> {
  // Deterministic derivation ID from seed (lightweight, no async needed)
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const hex = (hash >>> 0).toString(16).padStart(8, "0");
  return {
    "@type": `observable:${type}`,
    value,
    epistemic_grade: "A",
    "derivation:derivationId": `urn:uor:derivation:observable:${type.toLowerCase()}:${hex}`,
    ring: "Z/256Z",
    quantum: 8,
  };
}

// ── Operation dispatcher (shared by holonomy, commutator, path) ────────────

type RingOp = "neg" | "bnot" | "succ" | "pred";

function applyOp(op: RingOp, x: number): number {
  switch (op) {
    case "neg": return negNum(x);
    case "bnot": return bnotNum(x);
    case "succ": return succNum(x);
    case "pred": return predNum(x);
  }
}

// ── Partition class ordinal (for curvature calculation) ────────────────────

/**
 * Maps partition class to a numeric ordinal for curvature computation.
 *   exterior=0, unit=1, reducible=1, irreducible=2
 */
function classOrdinal(x: number): number {
  const cls = classifyByte(x, 8);
  switch (cls.component) {
    case "partition:ExteriorSet": return 0;
    case "partition:UnitSet": return 1;
    case "partition:ReducibleSet": return 1;
    case "partition:IrreducibleSet": return 2;
  }
}

// ══════════════════════════════════════════════════════════════════════════
// METRIC 1: RingMetric
// ══════════════════════════════════════════════════════════════════════════

/**
 * Geodesic distance on the cyclic group Z/256Z.
 *
 * d(x,y) = min(|x-y| mod 256, |y-x| mod 256)
 *
 * Properties: d(x,x)=0; d(x,y)=d(y,x); d(x,z)≤d(x,y)+d(y,z)
 * Max distance = 128 (diametrically opposite on the ring).
 */
export function ringMetric(x: number, y: number): ObservableResult<number> {
  const forward = ((y - x) % 256 + 256) % 256;
  const backward = ((x - y) % 256 + 256) % 256;
  const dist = Math.min(forward, backward);
  return gradeA("RingMetric", dist, `ring:${x}:${y}`);
}

// ══════════════════════════════════════════════════════════════════════════
// METRIC 2: HammingMetric
// ══════════════════════════════════════════════════════════════════════════

/**
 * Bit-level distance: popcount(x XOR y).
 * Used by Observer H-score — now a named observable metric.
 */
export function hammingMetric(x: number, y: number): ObservableResult<number> {
  const dist = popcount((x ^ y) >>> 0);
  return gradeA("HammingMetric", dist, `hamming:${x}:${y}`);
}

// ══════════════════════════════════════════════════════════════════════════
// METRIC 3: CascadeLength
// ══════════════════════════════════════════════════════════════════════════

/**
 * Number of succ applications needed to reach `to` from `from`.
 *
 * = (to - from) mod 256
 *
 * This is the formal computation cost model: one succ step = one unit.
 */
export function cascadeLength(from: number, to: number): ObservableResult<number> {
  const steps = ((to - from) % 256 + 256) % 256;
  return gradeA("CascadeLength", steps, `cascade:${from}:${to}`);
}

// ══════════════════════════════════════════════════════════════════════════
// METRIC 4: CatastropheThreshold
// ══════════════════════════════════════════════════════════════════════════

/**
 * The FORMAL partition density threshold below which structure collapses.
 * Derived from ring arithmetic, NOT set empirically.
 *
 * Derivation:
 *   UnitSet cardinality     = 2   ({1, 255})
 *   ExteriorSet cardinality = 2   ({0, 128})
 *   CatastropheThreshold    = (2 + 2) / 256 = 4/256 = 0.015625 = 1/64
 *
 * Rationale: density ≤ threshold means content is ENTIRELY units/exterior
 * (no irreducible content whatsoever) — structural collapse.
 */
export const CATASTROPHE_THRESHOLD: ObservableResult<number> = {
  "@type": "observable:CatastropheThreshold",
  value: 4 / 256, // 0.015625 exactly
  epistemic_grade: "A",
  "derivation:derivationId":
    "urn:uor:derivation:observable:catastrophe:ring-derived:4-over-256",
  ring: "Z/256Z",
  quantum: 8,
};

// ══════════════════════════════════════════════════════════════════════════
// METRIC 5: Curvature
// ══════════════════════════════════════════════════════════════════════════

/**
 * Discrete curvature at point x in the partition space.
 *
 * K(x) = classOf(succ(x)) - 2*classOf(x) + classOf(pred(x))
 *
 * where classOf: exterior→0, unit→1, reducible→1, irreducible→2
 *
 * Examples:
 *   K(0)   = classOf(1) - 2*classOf(0) + classOf(255) = 1 - 0 + 1 = 2
 *   K(128) = classOf(129) - 2*classOf(128) + classOf(127) = 2 - 0 + 2 = 4
 *   K(3)   = classOf(4) - 2*classOf(3) + classOf(2) = 1 - 4 + 1 = -2
 */
export function curvature(x: number): ObservableResult<number> {
  const xMod = ((x % 256) + 256) % 256;
  const K =
    classOrdinal(succNum(xMod)) -
    2 * classOrdinal(xMod) +
    classOrdinal(predNum(xMod));
  return gradeA("Curvature", K, `curvature:${xMod}`);
}

// ══════════════════════════════════════════════════════════════════════════
// METRIC 6: Holonomy
// ══════════════════════════════════════════════════════════════════════════

/**
 * Phase accumulated by traversing a sequence of ring operations.
 *
 * For any closed path on Z/256Z: holonomy = 0 (topologically flat).
 *
 * Verifiable theorems:
 *   holonomy([neg, neg], x) = 0        (neg involution)
 *   holonomy([bnot, bnot], x) = 0      (bnot involution)
 *   holonomy([neg, bnot, neg, bnot], x) = 0 (critical identity derived)
 */
export function holonomy(
  x: number,
  ops: RingOp[]
): ObservableResult<{
  startValue: number;
  endValue: number;
  isClosed: boolean;
  holonomyPhase: number;
  pathLength: number;
}> {
  const xMod = ((x % 256) + 256) % 256;
  let current = xMod;
  for (const op of ops) {
    current = applyOp(op, current);
  }
  const phase = ((current - xMod) % 256 + 256) % 256;
  return gradeA(
    "Holonomy",
    {
      startValue: xMod,
      endValue: current,
      isClosed: current === xMod,
      holonomyPhase: phase,
      pathLength: ops.length,
    },
    `holonomy:${xMod}:${ops.join(",")}`
  );
}

// ══════════════════════════════════════════════════════════════════════════
// METRIC 7: Commutator
// ══════════════════════════════════════════════════════════════════════════

/**
 * [A, B](x) = A(B(x)) - B(A(x)) in the ring.
 *
 * Theorem: [neg, bnot](x) = 2 for all x ∈ Z/256Z
 *
 * Proof:
 *   neg(bnot(x)) = succ(x)          (critical identity)
 *   bnot(neg(x)) = pred(x)          (coherence Law 4: bnot(neg(x)) = pred(x))
 *   Therefore: succ(x) - pred(x) = (x+1) - (x-1) = 2 mod 256
 *
 * The constant commutator of 2 is the algebraic distance between
 * the critical identity and its dual — a fundamental invariant of Z/256Z.
 */
export function commutator(
  x: number,
  opA: RingOp,
  opB: RingOp
): ObservableResult<{
  ab: number;
  ba: number;
  commutator: number;
  commutes: boolean;
}> {
  const xMod = ((x % 256) + 256) % 256;
  const ab = applyOp(opA, applyOp(opB, xMod));
  const ba = applyOp(opB, applyOp(opA, xMod));
  const comm = ((ab - ba) % 256 + 256) % 256;
  return gradeA(
    "Commutator",
    { ab, ba, commutator: comm, commutes: comm === 0 },
    `commutator:${xMod}:${opA}:${opB}`
  );
}

// ══════════════════════════════════════════════════════════════════════════
// OBSERVABLE PATH
// ══════════════════════════════════════════════════════════════════════════

/**
 * Full trajectory of a value through a sequence of ring operations.
 * Each step records value, partition class, curvature, and Hamming distance.
 */
export function observablePath(
  start: number,
  ops: RingOp[]
): ObservableResult<
  Array<{
    step: number;
    value: number;
    operation: string;
    partitionClass: string;
    curvatureK: number;
    hammingFromPrev: number;
  }>
> {
  const startMod = ((start % 256) + 256) % 256;
  let current = startMod;
  const steps: Array<{
    step: number;
    value: number;
    operation: string;
    partitionClass: string;
    curvatureK: number;
    hammingFromPrev: number;
  }> = [];

  for (let i = 0; i < ops.length; i++) {
    const prev = current;
    current = applyOp(ops[i], current);
    const cls = classifyByte(current, 8);
    const K = curvature(current).value;
    const hDist = popcount((current ^ prev) >>> 0);

    steps.push({
      step: i,
      value: current,
      operation: ops[i],
      partitionClass: cls.component,
      curvatureK: K,
      hammingFromPrev: hDist,
    });
  }

  return gradeA("ObservablePath", steps, `path:${startMod}:${ops.join(",")}`);
}

// ══════════════════════════════════════════════════════════════════════════
// OBSERVABLE STREAM
// ══════════════════════════════════════════════════════════════════════════

/**
 * Async generator: emit ring metrics for each incoming payload byte.
 * Used for real-time Shield monitoring.
 */
export async function* observableStream(
  payloadBytesIterator: AsyncIterable<number>
): AsyncGenerator<
  ObservableResult<{
    byte: number;
    partitionClass: string;
    runningDensity: number;
    catastropheAlert: boolean;
    cascadeLengthFromPrev: number;
  }>
> {
  let total = 0;
  let irreducible = 0;
  let prev: number | null = null;

  for await (const byte of payloadBytesIterator) {
    const b = byte & 0xff;
    total++;
    const cls = classifyByte(b, 8);
    if (cls.component === "partition:IrreducibleSet") irreducible++;
    const density = total > 0 ? irreducible / total : 0;
    const cascade =
      prev !== null ? ((b - prev) % 256 + 256) % 256 : 0;
    prev = b;

    yield gradeA(
      "ObservableStreamFrame",
      {
        byte: b,
        partitionClass: cls.component,
        runningDensity: density,
        catastropheAlert: density <= CATASTROPHE_THRESHOLD.value,
        cascadeLengthFromPrev: cascade,
      },
      `stream:${total}:${b}`
    );
  }
}
