/**
 * Optimal Rewrite Chain Engine
 * ════════════════════════════
 *
 * Given a source gate sequence and a target gate set, finds the minimal-length
 * composition of transform elements that rewrites every gate in the source
 * sequence into a gate from the target set.
 *
 * Algorithm:
 *   1. Build a lookup table: vertex → gate name (from quantum-isa).
 *   2. For each source vertex, BFS over the 192-element transform group
 *      to find the shortest transform chain mapping it to a vertex whose
 *      gate is in the target set.
 *   3. Compose per-gate chains into a full circuit rewrite plan.
 *
 * The 4 generators {R₁, D₁, T₁, M} serve as BFS edges, so chain length
 * measures the number of elementary group operations needed.
 *
 * @module atlas/rewrite-chain
 */

import {
  applyTransform,
  compose,
  IDENTITY,
  enumerateGroup,
  type TransformElement,
} from "./transform-group";
import {
  mapVerticesToGates,
  computeRewrite,
  type QuantumGate,
  type CircuitRewrite,
  type VertexGateMapping,
} from "./quantum-isa";
import { ATLAS_VERTEX_COUNT } from "./atlas";

// ── Types ─────────────────────────────────────────────────────────────────

/** A single step in a rewrite chain. */
export interface RewriteStep {
  /** The elementary generator applied at this step. */
  readonly generator: TransformElement;
  /** Generator label (R₁, D₁, T₁, or M). */
  readonly label: string;
  /** Vertex index after applying this step. */
  readonly resultVertex: number;
  /** Gate at the result vertex. */
  readonly resultGate: QuantumGate;
}

/** A complete rewrite chain for one gate. */
export interface RewriteChain {
  /** Source vertex index. */
  readonly sourceVertex: number;
  /** Source gate. */
  readonly sourceGate: QuantumGate;
  /** Target vertex index. */
  readonly targetVertex: number;
  /** Target gate. */
  readonly targetGate: QuantumGate;
  /** Ordered steps from source to target. */
  readonly steps: ReadonlyArray<RewriteStep>;
  /** Total chain length (number of elementary generators). */
  readonly length: number;
  /** Composed transform (product of all steps). */
  readonly composedTransform: TransformElement;
  /** Whether this is a trivial (identity) rewrite. */
  readonly isTrivial: boolean;
}

/** Result of optimizing a full circuit. */
export interface CircuitRewritePlan {
  /** Original gate sequence (as vertex indices). */
  readonly sourceCircuit: number[];
  /** Target gate set names. */
  readonly targetGateSet: ReadonlySet<string>;
  /** Per-gate rewrite chains. */
  readonly chains: ReadonlyArray<RewriteChain>;
  /** Total rewrite cost (sum of chain lengths). */
  readonly totalCost: number;
  /** Maximum single-gate chain length. */
  readonly maxChainLength: number;
  /** Whether every gate was successfully rewritten. */
  readonly allRewritten: boolean;
  /** Gates that could not be rewritten into the target set. */
  readonly unrewritable: number[];
}

/** Summary statistics for reachability analysis. */
export interface ReachabilityReport {
  /** For each gate name, which other gate names are reachable. */
  readonly reachableFrom: ReadonlyMap<string, ReadonlySet<string>>;
  /** Maximum BFS distance across all source→target pairs. */
  readonly maxDistance: number;
  /** Average BFS distance. */
  readonly avgDistance: number;
  /** Total reachable pairs. */
  readonly totalPairs: number;
}

// ── Generators ────────────────────────────────────────────────────────────

/** The 4 elementary generators of Aut(Atlas). */
const GENERATORS: { elem: TransformElement; label: string }[] = [
  { elem: { r: 1, d: 0, t: 0, m: 0 }, label: "R₁" },
  { elem: { r: 0, d: 1, t: 0, m: 0 }, label: "D₁" },
  { elem: { r: 0, d: 0, t: 1, m: 0 }, label: "T₁" },
  { elem: { r: 0, d: 0, t: 0, m: 1 }, label: "M" },
];

// ── Cached gate mapping ───────────────────────────────────────────────────

let _cachedMappings: VertexGateMapping[] | null = null;

function getMappings(): VertexGateMapping[] {
  if (!_cachedMappings) _cachedMappings = mapVerticesToGates();
  return _cachedMappings;
}

function gateAtVertex(v: number): QuantumGate {
  return getMappings()[v].gate;
}

// ── BFS: Find shortest generator chain from vertex to target gate set ─────

interface BFSNode {
  vertex: number;
  steps: { generator: TransformElement; label: string }[];
}

/**
 * BFS from a source vertex, finding the shortest chain of elementary
 * generators that maps it to any vertex whose gate is in `targetGates`.
 *
 * Returns null if no such chain exists (impossible if group is transitive).
 */
export function findOptimalChain(
  sourceVertex: number,
  targetGates: ReadonlySet<string>,
  maxDepth: number = 12,
): RewriteChain | null {
  const sourceGate = gateAtVertex(sourceVertex);

  // Trivial case: source gate already in target set
  if (targetGates.has(sourceGate.name)) {
    return {
      sourceVertex,
      sourceGate,
      targetVertex: sourceVertex,
      targetGate: sourceGate,
      steps: [],
      length: 0,
      composedTransform: IDENTITY,
      isTrivial: true,
    };
  }

  // BFS over generator applications
  const visited = new Set<number>();
  visited.add(sourceVertex);

  const queue: BFSNode[] = [{ vertex: sourceVertex, steps: [] }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.steps.length >= maxDepth) continue;

    for (const gen of GENERATORS) {
      const nextVertex = applyTransform(current.vertex, gen.elem);
      if (visited.has(nextVertex)) continue;
      visited.add(nextVertex);

      const nextGate = gateAtVertex(nextVertex);
      const newSteps = [...current.steps, { generator: gen.elem, label: gen.label }];

      if (targetGates.has(nextGate.name)) {
        // Found optimal chain — compose transforms
        let composed = IDENTITY;
        const fullSteps: RewriteStep[] = [];
        let v = sourceVertex;

        for (const step of newSteps) {
          v = applyTransform(v, step.generator);
          composed = compose(composed, step.generator);
          fullSteps.push({
            generator: step.generator,
            label: step.label,
            resultVertex: v,
            resultGate: gateAtVertex(v),
          });
        }

        return {
          sourceVertex,
          sourceGate,
          targetVertex: nextVertex,
          targetGate: nextGate,
          steps: fullSteps,
          length: newSteps.length,
          composedTransform: composed,
          isTrivial: false,
        };
      }

      queue.push({ vertex: nextVertex, steps: newSteps });
    }
  }

  return null; // No chain found within maxDepth
}

// ── Circuit-level optimization ────────────────────────────────────────────

/**
 * Rewrite an entire circuit (sequence of vertex indices) into a target gate set.
 * Returns the optimal rewrite plan with per-gate chains.
 */
export function rewriteCircuit(
  sourceCircuit: number[],
  targetGateNames: string[],
  maxDepthPerGate: number = 12,
): CircuitRewritePlan {
  const targetSet = new Set(targetGateNames);
  const chains: RewriteChain[] = [];
  const unrewritable: number[] = [];

  for (const vertex of sourceCircuit) {
    const chain = findOptimalChain(vertex, targetSet, maxDepthPerGate);
    if (chain) {
      chains.push(chain);
    } else {
      unrewritable.push(vertex);
      // Push a placeholder trivial chain
      const gate = gateAtVertex(vertex);
      chains.push({
        sourceVertex: vertex,
        sourceGate: gate,
        targetVertex: vertex,
        targetGate: gate,
        steps: [],
        length: Infinity,
        composedTransform: IDENTITY,
        isTrivial: false,
      });
    }
  }

  const finiteCosts = chains.filter(c => isFinite(c.length));
  const totalCost = finiteCosts.reduce((s, c) => s + c.length, 0);
  const maxChainLength = finiteCosts.length > 0
    ? Math.max(...finiteCosts.map(c => c.length))
    : 0;

  return {
    sourceCircuit,
    targetGateSet: targetSet,
    chains,
    totalCost,
    maxChainLength,
    allRewritten: unrewritable.length === 0,
    unrewritable,
  };
}

// ── Reachability analysis ─────────────────────────────────────────────────

/**
 * Compute full reachability: for each distinct gate, which other gates
 * can it be rewritten to, and at what BFS distance?
 */
export function computeReachability(maxDepth: number = 8): ReachabilityReport {
  const mappings = getMappings();

  // Build gate → representative vertices map
  const gateVertices = new Map<string, number[]>();
  for (const m of mappings) {
    if (!gateVertices.has(m.gate.name)) gateVertices.set(m.gate.name, []);
    gateVertices.get(m.gate.name)!.push(m.vertexIndex);
  }

  const allGateNames = [...gateVertices.keys()];
  const reachableFrom = new Map<string, Set<string>>();
  let maxDist = 0;
  let totalDist = 0;
  let totalPairs = 0;

  for (const srcGateName of allGateNames) {
    const reachable = new Set<string>();
    reachable.add(srcGateName); // trivially reachable

    // BFS from ONE representative vertex of this gate
    const srcVertex = gateVertices.get(srcGateName)![0];
    const visited = new Set<number>();
    visited.add(srcVertex);
    let frontier = [srcVertex];
    let depth = 0;

    while (frontier.length > 0 && depth < maxDepth) {
      depth++;
      const nextFrontier: number[] = [];

      for (const v of frontier) {
        for (const gen of GENERATORS) {
          const nv = applyTransform(v, gen.elem);
          if (visited.has(nv)) continue;
          visited.add(nv);

          const gateName = gateAtVertex(nv).name;
          if (!reachable.has(gateName)) {
            reachable.add(gateName);
            totalDist += depth;
            totalPairs++;
            if (depth > maxDist) maxDist = depth;
          }

          nextFrontier.push(nv);
        }
      }

      frontier = nextFrontier;
    }

    reachableFrom.set(srcGateName, reachable);
  }

  return {
    reachableFrom,
    maxDistance: maxDist,
    avgDistance: totalPairs > 0 ? totalDist / totalPairs : 0,
    totalPairs,
  };
}

// ── Predefined target gate sets ───────────────────────────────────────────

/** Clifford+T: the standard universal gate set. */
export const CLIFFORD_T_SET = new Set([
  "H", "S", "S†", "CNOT", "CZ", "T", "T†",
  "I", "X", "Y", "Z",
]);

/** Pauli-only: maximally simple. */
export const PAULI_SET = new Set([
  "I", "X", "Y", "Z", "IX", "IY", "IZ", "XI", "XX", "XY", "XZ", "YI",
]);

/** Clifford-only: no T gates. */
export const CLIFFORD_SET = new Set([
  "I", "X", "Y", "Z", "H", "S", "S†", "CNOT", "CZ", "SWAP", "√X", "iSWAP",
  "IX", "IY", "IZ", "XI", "XX", "XY", "XZ", "YI",
]);

/** Fault-tolerant logical gate set. */
export const FAULT_TOLERANT_SET = new Set([
  "X̄_L", "Z̄_L", "H̄_L", "S̄_L", "T̄_L", "CNOT_L",
]);
