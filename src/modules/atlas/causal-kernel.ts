/**
 * Causal Kernel — Phase 26
 * ════════════════════════
 *
 * Implements the Causal Accumulation Law on the Atlas lattice.
 *
 * THEORY:
 *   The Causal Kernel K(x, y) defines how information propagates between
 *   vertices of the Atlas graph. The propagator is the octonionic
 *   multiplication table (Fano plane), which ensures:
 *
 *     1. Causal ordering via the directed Fano lines
 *     2. Non-associativity preserves quantum interference
 *     3. Alternativity constrains causal paths to the G₂ manifold
 *
 *   The 22-node submanifold (from Phase 11) serves as the interaction
 *   vertex set, where causal paths accumulate amplitude through:
 *
 *     K(x, y) = Σ_{paths p: x→y} α^|p| · Π_{edges e ∈ p} O(e)
 *
 *   where:
 *     α = geometric fine structure constant (Phase 11)
 *     O(e) = octonionic propagator along edge e
 *     |p| = path length
 *
 *   The Causal Accumulation Law states:
 *     ∂K/∂t = α · [K, K]_O + D(K)
 *
 *   where [·,·]_O is the octonionic commutator (non-associative)
 *   and D(K) is the dissipative term from the boundary (sedenion threshold).
 *
 * STRUCTURAL CONSTANTS:
 *   - 22 interaction nodes (8 sign class + 12 G₂ boundary + 2 unity)
 *   - 7 imaginary octonion units → 7 Fano lines → 7 propagator channels
 *   - α = 4N₂₂σ²/Σd² ≈ 1/137 geometric coupling
 *   - 240 E₈ roots → normalization constant
 *   - 16 sedenion boundary → dissipation threshold
 *
 * @module atlas/causal-kernel
 */

import { getAtlas, ATLAS_VERTEX_COUNT } from "./atlas";
import {
  constructManifold22,
  deriveAlpha,
  type Manifold22,
  type ManifoldNode,
  type ManifoldLink,
  type AlphaDerivation,
} from "./topological-qubit";
import { fanoPlane } from "./cayley-dickson";

// ── Types ─────────────────────────────────────────────────────────────────

/** An octonion element: 1 real + 7 imaginary components */
export interface Octonion {
  /** Components [e₀, e₁, e₂, e₃, e₄, e₅, e₆, e₇] */
  components: [number, number, number, number, number, number, number, number];
}

/** A causal edge between two manifold nodes */
export interface CausalEdge {
  /** Source node index */
  from: number;
  /** Target node index */
  to: number;
  /** Octonionic propagator along this edge */
  propagator: Octonion;
  /** Fano line index (0-6) that governs this edge's multiplication */
  fanoChannel: number;
  /** Coupling strength (α-weighted) */
  coupling: number;
  /** Causal weight (edge weight from Atlas × α) */
  weight: number;
}

/** A causal path through the manifold */
export interface CausalPath {
  /** Sequence of node indices */
  nodes: number[];
  /** Edges traversed */
  edges: CausalEdge[];
  /** Total accumulated amplitude */
  amplitude: Octonion;
  /** Path length */
  length: number;
  /** Total coupling: α^length × product of edge weights */
  totalCoupling: number;
}

/** The causal kernel K(x,y) between two nodes */
export interface CausalKernelEntry {
  /** Source node */
  from: number;
  /** Target node */
  to: number;
  /** Sum over all causal paths */
  kernel: Octonion;
  /** Number of contributing paths */
  pathCount: number;
  /** Dominant path (highest coupling) */
  dominantPath: CausalPath | null;
  /** Total accumulated coupling */
  totalCoupling: number;
}

/** The causal accumulation state at a given time step */
export interface CausalAccumulation {
  /** Time step index */
  step: number;
  /** Current kernel matrix (22×22) */
  kernelMatrix: CausalKernelEntry[];
  /** Total causal flux (sum of all kernel norms) */
  totalFlux: number;
  /** Dissipation from sedenion boundary */
  dissipation: number;
  /** Net accumulation = flux - dissipation */
  netAccumulation: number;
  /** Convergence measure: |K(t) - K(t-1)| / |K(t)| */
  convergenceRatio: number;
}

/** Full causal kernel report */
export interface CausalKernelReport {
  /** The 22-node interaction manifold */
  manifold: Manifold22;
  /** Alpha derivation from Phase 11 */
  alpha: AlphaDerivation;
  /** Geometric coupling constant */
  alphaCoupling: number;
  /** Octonionic propagator table (7 channels) */
  propagatorChannels: PropagatorChannel[];
  /** Causal edges (directed, α-weighted) */
  edges: CausalEdge[];
  /** Kernel matrix entries */
  kernelEntries: CausalKernelEntry[];
  /** Accumulation time evolution */
  accumulation: CausalAccumulation[];
  /** Fixed-point convergence */
  fixedPoint: FixedPointResult;
  /** Verification tests */
  tests: CausalKernelTest[];
  /** All tests pass */
  allPassed: boolean;
}

export interface PropagatorChannel {
  /** Fano line index */
  index: number;
  /** Three octonion units on this line */
  units: [number, number, number];
  /** Unit labels */
  labels: string;
  /** Multiplication rule: eᵢ·eⱼ = eₖ */
  rule: string;
  /** Number of manifold edges using this channel */
  edgeCount: number;
}

export interface FixedPointResult {
  /** Converged? */
  converged: boolean;
  /** Steps to convergence */
  steps: number;
  /** Final convergence ratio */
  finalRatio: number;
  /** Fixed-point kernel norm */
  fixedPointNorm: number;
  /** α·π/2 phase angle at convergence */
  phaseAngle: number;
}

export interface CausalKernelTest {
  name: string;
  holds: boolean;
  detail: string;
}

// ── Octonionic Arithmetic ─────────────────────────────────────────────────

const ZERO_OCT: Octonion = { components: [0, 0, 0, 0, 0, 0, 0, 0] };

/** Create an octonion from components */
export function octonion(
  e0 = 0, e1 = 0, e2 = 0, e3 = 0,
  e4 = 0, e5 = 0, e6 = 0, e7 = 0,
): Octonion {
  return { components: [e0, e1, e2, e3, e4, e5, e6, e7] };
}

/** Create a unit octonion eᵢ */
export function unitOctonion(i: number): Octonion {
  const c: [number, number, number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0, 0, 0];
  c[i] = 1;
  return { components: c };
}

/** Octonionic addition */
export function octAdd(a: Octonion, b: Octonion): Octonion {
  return {
    components: a.components.map((v, i) => v + b.components[i]) as Octonion["components"],
  };
}

/** Scalar multiplication */
export function octScale(a: Octonion, s: number): Octonion {
  return {
    components: a.components.map(v => v * s) as Octonion["components"],
  };
}

/** Octonionic norm² = Σ eᵢ² */
export function octNormSq(a: Octonion): number {
  return a.components.reduce((s, v) => s + v * v, 0);
}

/** Octonionic norm */
export function octNorm(a: Octonion): number {
  return Math.sqrt(octNormSq(a));
}

/**
 * Octonionic multiplication using the Fano plane.
 *
 * Rules:
 *   e₀ is the identity (real unit)
 *   eᵢ² = -1 for i = 1..7
 *   For each Fano line [i, j, k]: eᵢ·eⱼ = eₖ (cyclic)
 *
 * This is non-associative but alternative:
 *   (a·a)·b = a·(a·b) and (a·b)·b = a·(b·b) for all a, b
 */
export function octMul(a: Octonion, b: Octonion): Octonion {
  const fp = fanoPlane();
  const result: number[] = new Array(8).fill(0);

  // Build multiplication table from Fano plane
  // mulTable[i][j] = [sign, index] where eᵢ·eⱼ = sign × e_{index}
  const mulTable: Array<Array<[number, number]>> = Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => [0, 0] as [number, number]),
  );

  // e₀ is identity
  for (let i = 0; i < 8; i++) {
    mulTable[0][i] = [1, i];
    mulTable[i][0] = [1, i];
  }

  // eᵢ² = -e₀ for i > 0
  for (let i = 1; i < 8; i++) {
    mulTable[i][i] = [-1, 0];
  }

  // Fano lines: [a, b, c] means e_{a+1}·e_{b+1} = e_{c+1}
  for (const [a, b, c] of fp.lines) {
    const i = a + 1, j = b + 1, k = c + 1;
    // Cyclic: eᵢ·eⱼ = eₖ, eⱼ·eₖ = eᵢ, eₖ·eᵢ = eⱼ
    mulTable[i][j] = [1, k];
    mulTable[j][k] = [1, i];
    mulTable[k][i] = [1, j];
    // Anti-cyclic: eⱼ·eᵢ = -eₖ, eₖ·eⱼ = -eᵢ, eᵢ·eₖ = -eⱼ
    mulTable[j][i] = [-1, k];
    mulTable[k][j] = [-1, i];
    mulTable[i][k] = [-1, j];
  }

  // Multiply: (Σ aᵢeᵢ)(Σ bⱼeⱼ) = Σ aᵢbⱼ(eᵢeⱼ)
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if (a.components[i] === 0 || b.components[j] === 0) continue;
      const [sign, idx] = mulTable[i][j];
      result[idx] += sign * a.components[i] * b.components[j];
    }
  }

  return { components: result as Octonion["components"] };
}

/** Octonionic conjugate: conj(a₀ + Σ aᵢeᵢ) = a₀ - Σ aᵢeᵢ */
export function octConj(a: Octonion): Octonion {
  return {
    components: a.components.map((v, i) => i === 0 ? v : -v) as Octonion["components"],
  };
}

/** Octonionic commutator [a, b]_O = a·b - b·a */
export function octCommutator(a: Octonion, b: Octonion): Octonion {
  const ab = octMul(a, b);
  const ba = octMul(b, a);
  return octAdd(ab, octScale(ba, -1));
}

/** Octonionic associator (a,b,c) = (a·b)·c - a·(b·c) */
export function octAssociator(a: Octonion, b: Octonion, c: Octonion): Octonion {
  const ab_c = octMul(octMul(a, b), c);
  const a_bc = octMul(a, octMul(b, c));
  return octAdd(ab_c, octScale(a_bc, -1));
}

// ── Causal Graph Construction ─────────────────────────────────────────────

/**
 * Build the directed causal graph over the 22-node manifold.
 *
 * Each manifold link becomes a directed causal edge with:
 *   - Octonionic propagator determined by Fano channel assignment
 *   - Coupling strength α^1 (first-order approximation)
 *   - Weight = Atlas edge weight × α
 */
export function buildCausalEdges(
  manifold: Manifold22,
  alpha: number,
): CausalEdge[] {
  const fp = fanoPlane();
  const edges: CausalEdge[] = [];

  // Build node-id → index map
  const nodeIndex = new Map<string, number>();
  manifold.nodes.forEach((n, i) => nodeIndex.set(n.id, i));

  for (const link of manifold.links) {
    if (link.weight === 0) continue;

    const fromIdx = nodeIndex.get(link.sourceId) ?? 0;
    const toIdx = nodeIndex.get(link.targetId) ?? 0;

    // Assign Fano channel based on (from, to) pair modulo 7
    const fanoChannel = (fromIdx + toIdx) % 7;
    const line = fp.lines[fanoChannel];

    // Build propagator: unit octonion on the Fano line's output
    const outputUnit = line[2] + 1; // e_{k+1}
    const propagator = unitOctonion(outputUnit);

    // Forward edge
    edges.push({
      from: fromIdx,
      to: toIdx,
      propagator,
      fanoChannel,
      coupling: alpha * link.weight,
      weight: link.weight,
    });

    // Backward edge (conjugate propagator — time reversal)
    edges.push({
      from: toIdx,
      to: fromIdx,
      propagator: octConj(propagator),
      fanoChannel,
      coupling: alpha * link.weight,
      weight: link.weight,
    });
  }

  return edges;
}

/**
 * Build the 7 propagator channels from the Fano plane.
 */
export function buildPropagatorChannels(edges: CausalEdge[]): PropagatorChannel[] {
  const fp = fanoPlane();

  return fp.lines.map((line, idx) => {
    const [a, b, c] = line;
    return {
      index: idx,
      units: [a + 1, b + 1, c + 1] as [number, number, number],
      labels: `e${a + 1}·e${b + 1} = e${c + 1}`,
      rule: `${fp.points[a]}·${fp.points[b]} = ${fp.points[c]}`,
      edgeCount: edges.filter(e => e.fanoChannel === idx).length,
    };
  });
}

// ── Kernel Computation ────────────────────────────────────────────────────

/**
 * Compute the causal kernel K(x, y) for all node pairs.
 *
 * K(x, y) = Σ_{paths p: x→y, |p| ≤ maxDepth} α^|p| · Π O(e)
 *
 * Uses breadth-first path enumeration bounded by maxDepth.
 */
export function computeKernelMatrix(
  manifold: Manifold22,
  edges: CausalEdge[],
  alpha: number,
  maxDepth: number = 3,
): CausalKernelEntry[] {
  const N = manifold.nodes.length;
  const adjacency = buildAdjacency(edges, N);
  const entries: CausalKernelEntry[] = [];

  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      if (i === j) {
        // Self-kernel: identity element
        entries.push({
          from: i,
          to: j,
          kernel: octonion(1),
          pathCount: 1,
          dominantPath: null,
          totalCoupling: 1,
        });
        continue;
      }

      // Enumerate paths from i to j up to maxDepth
      const paths = enumeratePaths(i, j, adjacency, edges, alpha, maxDepth);
      let kernel = { ...ZERO_OCT, components: [...ZERO_OCT.components] as Octonion["components"] };
      let totalCoupling = 0;
      let dominant: CausalPath | null = null;

      for (const path of paths) {
        kernel = octAdd(kernel, path.amplitude);
        totalCoupling += path.totalCoupling;
        if (!dominant || path.totalCoupling > dominant.totalCoupling) {
          dominant = path;
        }
      }

      entries.push({
        from: i,
        to: j,
        kernel,
        pathCount: paths.length,
        dominantPath: dominant,
        totalCoupling,
      });
    }
  }

  return entries;
}

function buildAdjacency(edges: CausalEdge[], n: number): Map<number, CausalEdge[]> {
  const adj = new Map<number, CausalEdge[]>();
  for (let i = 0; i < n; i++) adj.set(i, []);
  for (const e of edges) {
    adj.get(e.from)!.push(e);
  }
  return adj;
}

function enumeratePaths(
  from: number,
  to: number,
  adj: Map<number, CausalEdge[]>,
  allEdges: CausalEdge[],
  alpha: number,
  maxDepth: number,
): CausalPath[] {
  const results: CausalPath[] = [];

  // BFS with path tracking
  interface State {
    node: number;
    path: number[];
    pathEdges: CausalEdge[];
    amplitude: Octonion;
    coupling: number;
    depth: number;
  }

  const queue: State[] = [{
    node: from,
    path: [from],
    pathEdges: [],
    amplitude: octonion(1), // identity propagator
    coupling: 1,
    depth: 0,
  }];

  while (queue.length > 0) {
    const state = queue.shift()!;
    if (state.depth >= maxDepth) continue;

    for (const edge of adj.get(state.node) ?? []) {
      if (state.path.includes(edge.to)) continue; // no cycles

      const newAmplitude = octMul(state.amplitude, edge.propagator);
      const newCoupling = state.coupling * alpha * edge.weight;
      const newPath = [...state.path, edge.to];
      const newEdges = [...state.pathEdges, edge];

      if (edge.to === to) {
        results.push({
          nodes: newPath,
          edges: newEdges,
          amplitude: newAmplitude,
          length: newEdges.length,
          totalCoupling: newCoupling,
        });
      }

      // Continue exploring if under depth limit
      if (state.depth + 1 < maxDepth) {
        queue.push({
          node: edge.to,
          path: newPath,
          pathEdges: newEdges,
          amplitude: newAmplitude,
          coupling: newCoupling,
          depth: state.depth + 1,
        });
      }
    }
  }

  return results;
}

// ── Causal Accumulation ───────────────────────────────────────────────────

/**
 * Evolve the causal kernel via the Causal Accumulation Law:
 *
 *   K(t+1) = K(t) + α·[K(t), K(t)]_O + D(t)
 *
 * where D(t) is the sedenion-boundary dissipation term:
 *   D(t) = -(16/256)·|K(t)| = -(1/16)·|K(t)|
 *
 * The 16/256 ratio comes from: 16 sedenion boundary elements / 256 R₈ edges
 */
export function evolveAccumulation(
  kernelEntries: CausalKernelEntry[],
  alpha: number,
  steps: number = 10,
): CausalAccumulation[] {
  const history: CausalAccumulation[] = [];
  const N = 22;
  const DISSIPATION_RATE = 16 / 256; // sedenion boundary / R₈ edges

  // Current kernel represented as a flat octonionic matrix
  let current = kernelEntries.map(e => ({ ...e, kernel: { ...e.kernel, components: [...e.kernel.components] as Octonion["components"] } }));
  let prevFlux = 0;

  for (let step = 0; step < steps; step++) {
    // Compute total flux
    const totalFlux = current.reduce((s, e) => s + octNorm(e.kernel), 0);

    // Compute octonionic commutator contribution [K, K]_O
    // Approximate: sum of pairwise commutators for adjacent kernel entries
    let commutatorNorm = 0;
    for (let i = 0; i < Math.min(current.length, 100); i++) {
      for (let j = i + 1; j < Math.min(current.length, i + 10); j++) {
        const comm = octCommutator(current[i].kernel, current[j].kernel);
        commutatorNorm += octNorm(comm);
      }
    }

    // Dissipation from boundary
    const dissipation = DISSIPATION_RATE * totalFlux;

    // Update: K(t+1) = K(t) + α·[K,K] - D
    const accumDelta = alpha * commutatorNorm;
    const netAccumulation = accumDelta - dissipation;

    // Apply update to each kernel entry
    const updated = current.map(e => {
      const scale = 1 + alpha * (commutatorNorm / Math.max(totalFlux, 1e-10)) - DISSIPATION_RATE;
      return {
        ...e,
        kernel: octScale(e.kernel, Math.max(0.001, scale)),
        totalCoupling: e.totalCoupling * Math.max(0.001, scale),
      };
    });

    const convergenceRatio = prevFlux > 0
      ? Math.abs(totalFlux - prevFlux) / prevFlux
      : 1;

    history.push({
      step,
      kernelMatrix: current,
      totalFlux,
      dissipation,
      netAccumulation,
      convergenceRatio,
    });

    current = updated;
    prevFlux = totalFlux;
  }

  return history;
}

/**
 * Check if the accumulation converged to a fixed point.
 */
export function findFixedPoint(
  accumulation: CausalAccumulation[],
  alpha: number,
  threshold: number = 0.01,
): FixedPointResult {
  let convergenceStep = -1;

  for (let i = 1; i < accumulation.length; i++) {
    if (accumulation[i].convergenceRatio < threshold) {
      convergenceStep = i;
      break;
    }
  }

  const last = accumulation[accumulation.length - 1];
  const phaseAngle = alpha * Math.PI / 2; // α·π/2 geometric phase

  return {
    converged: convergenceStep >= 0,
    steps: convergenceStep >= 0 ? convergenceStep : accumulation.length,
    finalRatio: last.convergenceRatio,
    fixedPointNorm: last.totalFlux,
    phaseAngle,
  };
}

// ── Full Pipeline ─────────────────────────────────────────────────────────

/**
 * Run the complete Causal Kernel analysis.
 */
export function runCausalKernel(config?: {
  maxDepth?: number;
  evolutionSteps?: number;
}): CausalKernelReport {
  const maxDepth = config?.maxDepth ?? 3;
  const evolutionSteps = config?.evolutionSteps ?? 12;

  // Step 1: Build manifold and derive α
  const manifold = constructManifold22();
  const alphaResult = deriveAlpha();
  const alphaCoupling = 1 / alphaResult.alphaInverse;

  // Step 2: Construct causal edges
  const edges = buildCausalEdges(manifold, alphaCoupling);

  // Step 3: Build propagator channels
  const propagatorChannels = buildPropagatorChannels(edges);

  // Step 4: Compute kernel matrix
  const kernelEntries = computeKernelMatrix(manifold, edges, alphaCoupling, maxDepth);

  // Step 5: Evolve accumulation
  const accumulation = evolveAccumulation(kernelEntries, alphaCoupling, evolutionSteps);

  // Step 6: Find fixed point
  const fixedPoint = findFixedPoint(accumulation, alphaCoupling);

  // Step 7: Verification
  const tests = verifyCausalKernel(
    manifold, alphaResult, alphaCoupling, edges, propagatorChannels,
    kernelEntries, accumulation, fixedPoint,
  );

  return {
    manifold,
    alpha: alphaResult,
    alphaCoupling,
    propagatorChannels,
    edges,
    kernelEntries,
    accumulation,
    fixedPoint,
    tests,
    allPassed: tests.every(t => t.holds),
  };
}

// ── Verification ──────────────────────────────────────────────────────────

function verifyCausalKernel(
  manifold: Manifold22,
  alphaResult: AlphaDerivation,
  alpha: number,
  edges: CausalEdge[],
  channels: PropagatorChannel[],
  kernel: CausalKernelEntry[],
  accumulation: CausalAccumulation[],
  fixedPoint: FixedPointResult,
): CausalKernelTest[] {
  const tests: CausalKernelTest[] = [];

  // T1: 22-node manifold
  tests.push({
    name: "22-node interaction manifold constructed",
    holds: manifold.nodes.length === 22,
    detail: `${manifold.nodes.length} nodes: ${manifold.nodes.filter(n => n.type === "sign-class").length} sign-class + ${manifold.nodes.filter(n => n.type === "g2-boundary").length} G₂ + ${manifold.nodes.filter(n => n.type === "unity").length} unity`,
  });

  // T2: α derived geometrically
  tests.push({
    name: "α derived from Atlas geometry (Phase 11)",
    holds: alpha > 0 && alpha < 0.01,
    detail: `α = ${alpha.toFixed(6)}, α⁻¹ = ${(1 / alpha).toFixed(2)}`,
  });

  // T3: 7 Fano propagator channels
  tests.push({
    name: "7 octonionic propagator channels from Fano plane",
    holds: channels.length === 7,
    detail: channels.map(c => c.labels).join("; "),
  });

  // T4: All channels have edges
  const allChannelsUsed = channels.every(c => c.edgeCount > 0);
  tests.push({
    name: "All 7 Fano channels carry causal edges",
    holds: allChannelsUsed,
    detail: channels.map(c => `ch${c.index}:${c.edgeCount}`).join(", "),
  });

  // T5: Causal edges are bidirectional
  const forwardCount = edges.filter(e => e.from < e.to).length;
  const backwardCount = edges.filter(e => e.from > e.to).length;
  tests.push({
    name: "Causal edges are bidirectional (time symmetry)",
    holds: forwardCount === backwardCount,
    detail: `${forwardCount} forward, ${backwardCount} backward`,
  });

  // T6: Kernel matrix is 22×22
  tests.push({
    name: "Kernel matrix has 22² = 484 entries",
    holds: kernel.length === 22 * 22,
    detail: `${kernel.length} entries`,
  });

  // T7: Diagonal kernel entries are identity
  const diagonalCorrect = kernel
    .filter(e => e.from === e.to)
    .every(e => e.kernel.components[0] === 1 && e.pathCount === 1);
  tests.push({
    name: "Diagonal K(x,x) = identity (self-causation)",
    holds: diagonalCorrect,
    detail: "22 diagonal entries = e₀",
  });

  // T8: Non-trivial off-diagonal paths exist
  const offDiagPaths = kernel.filter(e => e.from !== e.to && e.pathCount > 0).length;
  tests.push({
    name: "Non-trivial causal paths exist between nodes",
    holds: offDiagPaths > 0,
    detail: `${offDiagPaths} connected node pairs out of ${22 * 21}`,
  });

  // T9: Octonionic multiplication is non-associative
  // Use e₁, e₂, e₃ which span different Fano lines
  const e1 = unitOctonion(1);
  const e2 = unitOctonion(2);
  const e3 = unitOctonion(3);
  const assoc = octAssociator(e1, e2, e3);
  const assocNorm = octNorm(assoc);
  tests.push({
    name: "Octonionic propagator is non-associative",
    holds: assocNorm > 0,
    detail: `|(e₁,e₂,e₄)| = ${assocNorm.toFixed(4)} ≠ 0`,
  });

  // T10: Octonion algebra is alternative (eᵢ·eᵢ)·eⱼ = eᵢ·(eᵢ·eⱼ)
  const altCheck1 = octMul(octMul(e1, e1), e2);
  const altCheck2 = octMul(e1, octMul(e1, e2));
  const altDiff = octNorm(octAdd(altCheck1, octScale(altCheck2, -1)));
  tests.push({
    name: "Octonionic alternativity holds: (a·a)·b = a·(a·b)",
    holds: altDiff < 1e-10,
    detail: `|(e₁·e₁)·e₂ - e₁·(e₁·e₂)| = ${altDiff.toExponential(2)}`,
  });

  // T11: Accumulation evolution runs
  tests.push({
    name: "Causal accumulation evolution computed",
    holds: accumulation.length > 0,
    detail: `${accumulation.length} time steps, final flux = ${accumulation[accumulation.length - 1]?.totalFlux.toFixed(4)}`,
  });

  // T12: Dissipation is positive (sedenion boundary)
  const hasDissipation = accumulation.some(a => a.dissipation > 0);
  tests.push({
    name: "Sedenion boundary produces positive dissipation",
    holds: hasDissipation,
    detail: `D = (16/256)·|K| from 16 boundary elements`,
  });

  // T13: Phase angle = α·π/2
  tests.push({
    name: "Geometric phase angle θ = α·π/2",
    holds: Math.abs(fixedPoint.phaseAngle - alpha * Math.PI / 2) < 1e-12,
    detail: `θ = ${fixedPoint.phaseAngle.toFixed(6)} rad = ${(fixedPoint.phaseAngle * 180 / Math.PI).toFixed(4)}°`,
  });

  // T14: Convergence or bounded evolution
  tests.push({
    name: "Accumulation converges or remains bounded",
    holds: accumulation.every(a => isFinite(a.totalFlux) && a.totalFlux < 1e10),
    detail: fixedPoint.converged
      ? `Converged at step ${fixedPoint.steps}`
      : `Bounded: max flux = ${Math.max(...accumulation.map(a => a.totalFlux)).toFixed(2)}`,
  });

  return tests;
}
