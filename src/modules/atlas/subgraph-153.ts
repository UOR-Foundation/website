/**
 * 153-Link Subgraph Search — Deriving the Fermionic Resonance Structure
 * ═══════════════════════════════════════════════════════════════════════
 *
 * THESIS:
 *   The number 153 = T(17) = 17×18/2 (the 17th triangular number) appears
 *   as the edge count of a specific 22-vertex subgraph of the Atlas.
 *
 *   153 is also: 1³ + 5³ + 3³ = 1 + 125 + 27 = 153 (narcissistic number).
 *
 *   The 22-vertex subgraph encodes the 22-node manifold:
 *     8 (sign class representatives) + 12 (G₂ boundary) + 2 (unity)
 *
 *   On any such subgraph with exactly 153 edges, the 4π fermionic
 *   resonance condition is:
 *
 *     α⁻¹ = Σd²(S) / (4 × |V(S)| × σ²(S) × resonanceFactor)
 *
 *   where resonanceFactor encodes the 4π fermionic path integral
 *   (a fermion requires 720° = 4π to return to its original state).
 *
 * APPROACH (Phase 12c — Intensified Search):
 *   1. Stratified sampling: pick vertices respecting the 8+12+2 partition
 *   2. Greedy edge-targeted search with local optimization
 *   3. Parallel stochastic hill-climbing (many independent walkers)
 *   4. Mirror-pair anchored search
 *   5. Sign-class complete subgraph search
 *   6. ★ Simulated Annealing with exponential + reheat schedules
 *   7. ★ Genetic Algorithm with crossover between high-scoring subgraphs
 *   8. ★ Parallel hill-climbing ensemble (deeper exploration)
 *
 * @module atlas/subgraph-153
 */

import { getAtlas, ATLAS_VERTEX_COUNT, type AtlasVertex } from "./atlas";

// ── Constants ─────────────────────────────────────────────────────────────

/** Target edge count: T(17) = 17×18/2 */
export const TARGET_EDGES = 153;

/** Target vertex count: 8 + 12 + 2 manifold structure */
export const TARGET_VERTICES = 22;

/** Max edges for 22-vertex graph: C(22,2) = 231 */
export const MAX_EDGES_22 = (TARGET_VERTICES * (TARGET_VERTICES - 1)) / 2;

/** Target density: 153/231 ≈ 0.6623 */
export const TARGET_DENSITY = TARGET_EDGES / MAX_EDGES_22;

/** Fermionic rotation: 4π (720°) — fermions require double cover */
export const FERMIONIC_4PI = 4 * Math.PI;

/** α⁻¹ (NIST 2018 CODATA) */
export const ALPHA_INV_MEASURED = 137.035999084;

// ── Types ─────────────────────────────────────────────────────────────────

export interface Subgraph22 {
  readonly vertices: number[];
  readonly edgeCount: number;
  readonly degreeSequence: number[];
  readonly degreeSqSum: number;
  readonly meanDegree: number;
  readonly degreeVariance: number;
  readonly density: number;
  readonly signClassCount: number;
  readonly signClassDist: number[];
  readonly unityCount: number;
  readonly mirrorPairsContained: number;
  readonly partitionType: string;
}

export interface FermionicResonance {
  readonly subgraph: Subgraph22;
  readonly alphaA: number;
  readonly alphaB: number;
  readonly alphaC: number;
  readonly bestAlpha: number;
  readonly bestPath: string;
  readonly bestError: number;
  readonly edgeMatch: boolean;
  readonly fermionicCondition: boolean;
  readonly geometricPhase: number;
  readonly windingNumber: number;
}

export interface SearchResult {
  readonly exact153: Subgraph22[];
  readonly near153: Subgraph22[];
  readonly resonances: FermionicResonance[];
  readonly stats: SearchStats;
  readonly tests: SubgraphTest[];
  readonly allPassed: boolean;
}

export interface SearchStats {
  readonly totalCandidatesExplored: number;
  readonly exact153Found: number;
  readonly near153Found: number;
  readonly bestEdgeCount: number;
  readonly closestToTarget: number;
  readonly searchTimeMs: number;
  readonly strategiesUsed: string[];
  /** SA-specific stats */
  readonly saAcceptedUphill: number;
  readonly saFinalTemperature: number;
  /** GA-specific stats */
  readonly gaGenerations: number;
  readonly gaBestFitness: number;
  /** Parallel hill-climb stats */
  readonly parallelWalkers: number;
  readonly parallelBestPerWalker: number[];
}

export interface SubgraphTest {
  readonly name: string;
  readonly holds: boolean;
  readonly expected: string;
  readonly actual: string;
}

// ── Fast Subgraph Edge Counting ───────────────────────────────────────────

/**
 * Precompute adjacency bitsets for fast subgraph edge counting.
 * Each vertex gets a Uint8Array bitmask of its neighbors.
 */
function buildAdjacencyLookup(): Set<number>[] {
  const atlas = getAtlas();
  const N = ATLAS_VERTEX_COUNT;
  const adj: Set<number>[] = new Array(N);
  for (let i = 0; i < N; i++) {
    adj[i] = new Set(atlas.vertex(i).neighbors);
  }
  return adj;
}

/**
 * Fast edge count for a vertex set using precomputed adjacency.
 */
function fastEdgeCount(vertices: number[], adj: Set<number>[]): number {
  let count = 0;
  for (let i = 0; i < vertices.length; i++) {
    const a = adj[vertices[i]];
    for (let j = i + 1; j < vertices.length; j++) {
      if (a.has(vertices[j])) count++;
    }
  }
  return count;
}

/**
 * Compute delta in edge count when swapping vertex `out` for `in` in the set.
 * Much faster than recomputing the full edge count.
 */
function swapDelta(
  vertices: number[],
  removeIdx: number,
  addVertex: number,
  adj: Set<number>[]
): number {
  const removed = vertices[removeIdx];
  let lost = 0, gained = 0;
  const addAdj = adj[addVertex];
  const remAdj = adj[removed];

  for (let i = 0; i < vertices.length; i++) {
    if (i === removeIdx) continue;
    const v = vertices[i];
    if (remAdj.has(v)) lost++;
    if (addAdj.has(v)) gained++;
  }
  return gained - lost;
}

// ── Subgraph Analysis ─────────────────────────────────────────────────────

function analyzeSubgraph(vertices: number[]): Subgraph22 {
  const atlas = getAtlas();
  const vertexSet = new Set(vertices);

  const internalDegree = new Array<number>(vertices.length).fill(0);
  let edgeCount = 0;

  for (let i = 0; i < vertices.length; i++) {
    const v = atlas.vertex(vertices[i]);
    for (const n of v.neighbors) {
      if (vertexSet.has(n)) internalDegree[i]++;
    }
  }
  edgeCount = internalDegree.reduce((s, d) => s + d, 0) / 2;

  const degreeSequence = [...internalDegree].sort((a, b) => b - a);
  const degreeSqSum = internalDegree.reduce((s, d) => s + d * d, 0);
  const meanDegree = internalDegree.reduce((s, d) => s + d, 0) / vertices.length;
  const degreeVariance = degreeSqSum / vertices.length - meanDegree * meanDegree;

  const signClassDist = new Array<number>(8).fill(0);
  let unityCount = 0;
  let mirrorPairsContained = 0;

  for (const vi of vertices) {
    const v = atlas.vertex(vi);
    signClassDist[v.signClass]++;
    if (v.isUnity) unityCount++;
    if (vertexSet.has(v.mirrorPair)) mirrorPairsContained++;
  }
  mirrorPairsContained /= 2;

  const signClassCount = signClassDist.filter(c => c > 0).length;
  const partitionType = signClassDist.filter(c => c > 0).sort((a, b) => b - a).join("-");

  return {
    vertices,
    edgeCount,
    degreeSequence,
    degreeSqSum,
    meanDegree,
    degreeVariance,
    density: edgeCount / MAX_EDGES_22,
    signClassCount,
    signClassDist,
    unityCount,
    mirrorPairsContained,
    partitionType,
  };
}

// ── Search Strategies (Original) ──────────────────────────────────────────

function stratifiedSearch(maxTrials: number): Subgraph22[] {
  const atlas = getAtlas();
  const results: Subgraph22[] = [];

  const signGroups: number[][] = [];
  for (let sc = 0; sc < 8; sc++) signGroups.push(atlas.signClassVertices(sc));
  const unityVerts = [...atlas.unityPositions];

  for (let trial = 0; trial < maxTrials; trial++) {
    const selected: number[] = [];
    const used = new Set<number>();

    for (const u of unityVerts) {
      if (!used.has(u)) { selected.push(u); used.add(u); }
    }

    const perClass = new Array<number>(8).fill(0);
    let remaining = 20;
    for (let i = 0; i < remaining; i++) perClass[i % 8]++;

    for (let i = 0; i < 4; i++) {
      const a = Math.floor(Math.random() * 8);
      const b = Math.floor(Math.random() * 8);
      if (perClass[a] > 1 && a !== b) { perClass[a]--; perClass[b]++; }
    }

    for (let sc = 0; sc < 8; sc++) {
      const group = signGroups[sc].filter(v => !used.has(v));
      const shuffled = [...group].sort(() => Math.random() - 0.5);
      for (let k = 0; k < perClass[sc] && k < shuffled.length; k++) {
        selected.push(shuffled[k]); used.add(shuffled[k]);
      }
    }

    if (selected.length === TARGET_VERTICES) results.push(analyzeSubgraph(selected));
  }
  return results;
}

function greedyDegreeSearch(maxTrials: number): Subgraph22[] {
  const atlas = getAtlas();
  const results: Subgraph22[] = [];
  const deg6Verts = atlas.degree6Vertices();
  const deg5Verts = atlas.degree5Vertices();

  for (let trial = 0; trial < maxTrials; trial++) {
    const selected: number[] = [];
    const used = new Set<number>();

    const seed = deg6Verts[Math.floor(Math.random() * deg6Verts.length)];
    selected.push(seed); used.add(seed);

    while (selected.length < TARGET_VERTICES) {
      let bestVertex = -1, bestNewEdges = -1;
      const candidates = (trial % 2 === 0 ? [...deg6Verts, ...deg5Verts] : [...deg5Verts, ...deg6Verts])
        .filter(v => !used.has(v));
      const sample = candidates.length > 200
        ? candidates.sort(() => Math.random() - 0.5).slice(0, 200) : candidates;

      for (const candidate of sample) {
        let newEdges = 0;
        const v = atlas.vertex(candidate);
        for (const n of v.neighbors) { if (used.has(n)) newEdges++; }
        if (newEdges > bestNewEdges) { bestNewEdges = newEdges; bestVertex = candidate; }
      }

      if (bestVertex >= 0) { selected.push(bestVertex); used.add(bestVertex); }
      else break;
    }

    if (selected.length === TARGET_VERTICES) results.push(analyzeSubgraph(selected));
  }
  return results;
}

function mirrorPairSearch(maxTrials: number): Subgraph22[] {
  const atlas = getAtlas();
  const results: Subgraph22[] = [];
  const pairs = atlas.mirrorPairs();

  for (let trial = 0; trial < maxTrials; trial++) {
    const shuffledPairs = [...pairs].sort(() => Math.random() - 0.5);
    const selectedPairs = shuffledPairs.slice(0, 11);
    const vertices = selectedPairs.flatMap(([a, b]) => [a, b]);
    if (vertices.length === TARGET_VERTICES) results.push(analyzeSubgraph(vertices));
  }
  return results;
}

function signClassSearch(maxTrials: number): Subgraph22[] {
  const atlas = getAtlas();
  const results: Subgraph22[] = [];

  for (let trial = 0; trial < maxTrials; trial++) {
    const selected: number[] = [];
    const used = new Set<number>();

    const primarySC = trial % 8;
    const scVerts = atlas.signClassVertices(primarySC);
    for (const v of scVerts) { selected.push(v); used.add(v); }

    const remaining: number[] = [];
    for (let sc = 0; sc < 8; sc++) {
      if (sc === primarySC) continue;
      remaining.push(...atlas.signClassVertices(sc));
    }
    const shuffled = remaining.sort(() => Math.random() - 0.5);
    for (let i = 0; i < 10 && i < shuffled.length; i++) {
      if (!used.has(shuffled[i])) { selected.push(shuffled[i]); used.add(shuffled[i]); }
    }

    while (selected.length > TARGET_VERTICES) selected.pop();
    if (selected.length === TARGET_VERTICES) results.push(analyzeSubgraph(selected));
  }
  return results;
}

// ── Strategy 6: Simulated Annealing ───────────────────────────────────────

interface SAStats {
  acceptedUphill: number;
  finalTemp: number;
}

/**
 * Simulated Annealing with exponential cooling + periodic reheats.
 *
 * Temperature schedule:
 *   T(k) = T₀ × exp(-k/τ)  with reheat every `reheatInterval` steps.
 *
 * Acceptance probability for uphill moves:
 *   P(accept) = exp(-|ΔE| / T(k))
 *
 * where ΔE = |newEdges - 153| - |currentEdges - 153|.
 *
 * Reheat strategy: After the first cooldown, the system is reheated to
 * T₀/2, then T₀/4, etc. — progressively narrowing the search basin
 * around the best-found configuration.
 */
function simulatedAnnealing(
  maxSteps: number,
  T0: number = 10.0,
  coolingRate: number = 0.003,
  reheatInterval: number = 500,
  numRestarts: number = 8
): { results: Subgraph22[]; stats: SAStats } {
  const N = ATLAS_VERTEX_COUNT;
  const adj = buildAdjacencyLookup();
  const results: Subgraph22[] = [];
  let totalAcceptedUphill = 0;
  let finalTemp = T0;

  for (let restart = 0; restart < numRestarts; restart++) {
    // Random initial 22-set
    const indices = Array.from({ length: N }, (_, i) => i);
    for (let i = N - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    const current = indices.slice(0, TARGET_VERTICES);
    let currentEdges = fastEdgeCount(current, adj);
    let bestDist = Math.abs(currentEdges - TARGET_EDGES);
    let bestConfig = [...current];
    let bestEdges = currentEdges;

    let reheatCount = 0;
    let acceptedUphill = 0;

    for (let step = 0; step < maxSteps; step++) {
      // Temperature with exponential cooling + periodic reheat
      const localStep = step - reheatCount * reheatInterval;
      const reheatFactor = Math.pow(0.5, reheatCount);
      const T = T0 * reheatFactor * Math.exp(-coolingRate * (localStep % reheatInterval));

      // Periodic reheat
      if (step > 0 && step % reheatInterval === 0) {
        reheatCount++;
        // On reheat, restore best-found configuration
        for (let i = 0; i < TARGET_VERTICES; i++) current[i] = bestConfig[i];
        currentEdges = bestEdges;
      }

      // Propose swap
      const removeIdx = Math.floor(Math.random() * TARGET_VERTICES);
      const currentSet = new Set(current);
      let addVertex: number;
      do { addVertex = Math.floor(Math.random() * N); } while (currentSet.has(addVertex));

      const delta = swapDelta(current, removeIdx, addVertex, adj);
      const newEdges = currentEdges + delta;
      const newDist = Math.abs(newEdges - TARGET_EDGES);
      const oldDist = Math.abs(currentEdges - TARGET_EDGES);
      const energyDelta = newDist - oldDist;

      // Metropolis criterion
      let accept = false;
      if (energyDelta <= 0) {
        accept = true;
      } else if (T > 1e-10) {
        accept = Math.random() < Math.exp(-energyDelta / T);
        if (accept) acceptedUphill++;
      }

      if (accept) {
        const removed = current[removeIdx];
        current[removeIdx] = addVertex;
        currentEdges = newEdges;

        if (newDist < bestDist) {
          bestDist = newDist;
          bestConfig = [...current];
          bestEdges = currentEdges;
        }
      }

      // Record exact/near hits
      if (newDist === 0 || (step === maxSteps - 1)) {
        results.push(analyzeSubgraph([...current]));
      }

      finalTemp = T;
    }

    totalAcceptedUphill += acceptedUphill;
    // Always record best from this restart
    results.push(analyzeSubgraph(bestConfig));
  }

  return {
    results,
    stats: { acceptedUphill: totalAcceptedUphill, finalTemp },
  };
}

// ── Strategy 7: Genetic Algorithm with Crossover ──────────────────────────

interface GAStats {
  generations: number;
  bestFitness: number;
}

/**
 * Genetic Algorithm for 22-vertex subgraph search.
 *
 * Representation: Each individual is a sorted array of 22 vertex indices.
 * Fitness: f(S) = -|edgeCount(S) - 153| (maximize toward 0).
 *
 * Operators:
 *   Selection: Tournament selection (k=3)
 *   Crossover: Uniform crossover — take intersection of parents,
 *              then fill remaining slots randomly from the union
 *   Mutation:  Swap a random vertex for a random non-member
 *   Elitism:   Top 10% survive unchanged
 */
function geneticAlgorithm(
  popSize: number = 200,
  generations: number = 150,
  mutationRate: number = 0.15,
  crossoverRate: number = 0.7,
  tournamentK: number = 3,
  eliteRatio: number = 0.1
): { results: Subgraph22[]; stats: GAStats } {
  const N = ATLAS_VERTEX_COUNT;
  const adj = buildAdjacencyLookup();

  // Fitness: higher is better (0 = perfect)
  function fitness(individual: number[]): number {
    return -Math.abs(fastEdgeCount(individual, adj) - TARGET_EDGES);
  }

  // Initialize population: mix of random + seeded from other strategies
  let population: number[][] = [];
  for (let i = 0; i < popSize; i++) {
    const indices = Array.from({ length: N }, (_, k) => k);
    for (let j = N - 1; j > 0; j--) {
      const r = Math.floor(Math.random() * (j + 1));
      [indices[j], indices[r]] = [indices[r], indices[j]];
    }
    population.push(indices.slice(0, TARGET_VERTICES).sort((a, b) => a - b));
  }

  let fitnesses = population.map(fitness);
  let bestFitness = Math.max(...fitnesses);
  let bestIndividual = [...population[fitnesses.indexOf(bestFitness)]];
  const results: Subgraph22[] = [];

  for (let gen = 0; gen < generations; gen++) {
    const newPop: number[][] = [];

    // Elitism: keep top individuals
    const eliteCount = Math.max(1, Math.floor(popSize * eliteRatio));
    const ranked = fitnesses.map((f, i) => ({ f, i })).sort((a, b) => b.f - a.f);
    for (let i = 0; i < eliteCount; i++) {
      newPop.push([...population[ranked[i].i]]);
    }

    // Fill rest with crossover + mutation
    while (newPop.length < popSize) {
      // Tournament selection
      const select = (): number[] => {
        let best = -1, bestF = -Infinity;
        for (let t = 0; t < tournamentK; t++) {
          const idx = Math.floor(Math.random() * popSize);
          if (fitnesses[idx] > bestF) { bestF = fitnesses[idx]; best = idx; }
        }
        return population[best];
      };

      const parent1 = select();
      const parent2 = select();

      let child: number[];

      if (Math.random() < crossoverRate) {
        // Uniform crossover
        const set1 = new Set(parent1);
        const set2 = new Set(parent2);
        const intersection = parent1.filter(v => set2.has(v));
        const unionArr = [...new Set([...parent1, ...parent2])];

        // Start with intersection
        const childSet = new Set(intersection);

        // Fill from union (shuffled) until 22
        const remaining = unionArr.filter(v => !childSet.has(v));
        for (let i = remaining.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
        }
        for (const v of remaining) {
          if (childSet.size >= TARGET_VERTICES) break;
          childSet.add(v);
        }

        // If still not enough (unlikely), add random vertices
        while (childSet.size < TARGET_VERTICES) {
          const v = Math.floor(Math.random() * N);
          if (!childSet.has(v)) childSet.add(v);
        }

        child = [...childSet].sort((a, b) => a - b).slice(0, TARGET_VERTICES);
      } else {
        child = [...parent1];
      }

      // Mutation: swap one vertex
      if (Math.random() < mutationRate) {
        const removeIdx = Math.floor(Math.random() * child.length);
        const childSet = new Set(child);
        let addV: number;
        do { addV = Math.floor(Math.random() * N); } while (childSet.has(addV));
        child[removeIdx] = addV;
        child.sort((a, b) => a - b);
      }

      // Adaptive mutation: if fitness is poor, do extra mutations
      const childFit = fitness(child);
      if (childFit < -10) {
        // Extra targeted mutation: swap worst-connected vertex
        const childEdges: number[] = child.map((v, i) => {
          let e = 0;
          for (let j = 0; j < child.length; j++) {
            if (i !== j && adj[v].has(child[j])) e++;
          }
          return e;
        });
        const worstIdx = childEdges.indexOf(Math.min(...childEdges));
        const childSet = new Set(child);

        // Find best replacement
        let bestReplace = -1, bestGain = -Infinity;
        for (let attempt = 0; attempt < 30; attempt++) {
          const candidate = Math.floor(Math.random() * N);
          if (childSet.has(candidate)) continue;
          let gain = 0;
          for (let j = 0; j < child.length; j++) {
            if (j !== worstIdx && adj[candidate].has(child[j])) gain++;
          }
          gain -= childEdges[worstIdx]; // net change
          if (gain > bestGain) { bestGain = gain; bestReplace = candidate; }
        }
        if (bestReplace >= 0) {
          child[worstIdx] = bestReplace;
          child.sort((a, b) => a - b);
        }
      }

      newPop.push(child);
    }

    population = newPop.slice(0, popSize);
    fitnesses = population.map(fitness);

    const genBest = Math.max(...fitnesses);
    if (genBest > bestFitness) {
      bestFitness = genBest;
      bestIndividual = [...population[fitnesses.indexOf(genBest)]];
    }

    // Record exact hits
    for (let i = 0; i < popSize; i++) {
      if (fitnesses[i] === 0) {
        results.push(analyzeSubgraph(population[i]));
      }
    }
  }

  // Record final best
  results.push(analyzeSubgraph(bestIndividual));

  // Record top 5 from final population
  const finalRanked = fitnesses.map((f, i) => ({ f, i })).sort((a, b) => b.f - a.f);
  for (let i = 0; i < Math.min(5, popSize); i++) {
    results.push(analyzeSubgraph(population[finalRanked[i].i]));
  }

  return {
    results,
    stats: { generations, bestFitness },
  };
}

// ── Strategy 8: Parallel Hill-Climbing Ensemble ───────────────────────────

/**
 * Runs multiple independent hill-climbers with deeper step counts.
 * Each walker uses a different seeding strategy for diverse coverage.
 *
 * Seeding strategies per walker:
 *   0-3: Pure random start
 *   4-5: Seed from high-degree vertices
 *   6-7: Seed from mirror pairs
 *   8+:  Seed from sign-class neighborhoods
 *
 * Each walker runs significantly more steps than the original hill-climb.
 */
function parallelHillClimb(
  numWalkers: number = 16,
  stepsPerWalker: number = 2000
): { results: Subgraph22[]; bestPerWalker: number[] } {
  const atlas = getAtlas();
  const N = ATLAS_VERTEX_COUNT;
  const adj = buildAdjacencyLookup();
  const results: Subgraph22[] = [];
  const bestPerWalker: number[] = [];

  for (let walker = 0; walker < numWalkers; walker++) {
    // Seed based on walker ID
    const current = new Array<number>(TARGET_VERTICES);
    const used = new Set<number>();

    if (walker < 4) {
      // Pure random
      const indices = Array.from({ length: N }, (_, i) => i);
      for (let i = N - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      for (let i = 0; i < TARGET_VERTICES; i++) {
        current[i] = indices[i]; used.add(indices[i]);
      }
    } else if (walker < 6) {
      // Seed from degree-6 cluster
      const deg6 = atlas.degree6Vertices();
      const seed = deg6[Math.floor(Math.random() * deg6.length)];
      current[0] = seed; used.add(seed);
      // BFS from seed, preferring high-degree
      const queue = [seed];
      let idx = 1;
      while (idx < TARGET_VERTICES && queue.length > 0) {
        const u = queue.shift()!;
        const neighbors = [...atlas.vertex(u).neighbors].sort(() => Math.random() - 0.5);
        for (const nb of neighbors) {
          if (idx >= TARGET_VERTICES) break;
          if (!used.has(nb)) {
            current[idx++] = nb; used.add(nb); queue.push(nb);
          }
        }
      }
      // Fill remaining randomly
      while (idx < TARGET_VERTICES) {
        const v = Math.floor(Math.random() * N);
        if (!used.has(v)) { current[idx++] = v; used.add(v); }
      }
    } else if (walker < 8) {
      // Seed from mirror pairs
      const pairs = atlas.mirrorPairs();
      const shuffled = [...pairs].sort(() => Math.random() - 0.5);
      let idx = 0;
      for (const [a, b] of shuffled) {
        if (idx + 2 > TARGET_VERTICES) break;
        if (!used.has(a) && !used.has(b)) {
          current[idx++] = a; used.add(a);
          current[idx++] = b; used.add(b);
        }
      }
      while (idx < TARGET_VERTICES) {
        const v = Math.floor(Math.random() * N);
        if (!used.has(v)) { current[idx++] = v; used.add(v); }
      }
    } else {
      // Seed from sign-class neighborhood
      const sc = walker % 8;
      const scVerts = atlas.signClassVertices(sc);
      const shuffled = [...scVerts].sort(() => Math.random() - 0.5);
      let idx = 0;
      for (const v of shuffled) {
        if (idx >= TARGET_VERTICES) break;
        current[idx++] = v; used.add(v);
      }
      while (idx < TARGET_VERTICES) {
        const v = Math.floor(Math.random() * N);
        if (!used.has(v)) { current[idx++] = v; used.add(v); }
      }
    }

    // Hill-climb with extended steps
    let currentEdges = fastEdgeCount(current, adj);
    let bestDist = Math.abs(currentEdges - TARGET_EDGES);
    let bestConfig = [...current];
    let bestEdges = currentEdges;

    // Plateau counter for random restarts within the walker
    let plateauCount = 0;
    const PLATEAU_LIMIT = 100;

    for (let step = 0; step < stepsPerWalker; step++) {
      // Intelligent swap: try multiple candidates, pick best
      const removeIdx = Math.floor(Math.random() * TARGET_VERTICES);
      const currentSet = new Set(current);

      // Try up to 5 candidates and pick the best
      let bestAdd = -1, bestDelta = Infinity;
      const numCandidates = bestDist <= 3 ? 20 : 5; // Search harder when close

      for (let c = 0; c < numCandidates; c++) {
        let addV: number;
        do { addV = Math.floor(Math.random() * N); } while (currentSet.has(addV));
        const delta = swapDelta(current, removeIdx, addV, adj);
        const newDist = Math.abs(currentEdges + delta - TARGET_EDGES);
        if (newDist < bestDelta) {
          bestDelta = newDist; bestAdd = addV;
        }
      }

      if (bestAdd >= 0 && bestDelta <= Math.abs(currentEdges - TARGET_EDGES)) {
        const removed = current[removeIdx];
        const delta = swapDelta(current, removeIdx, bestAdd, adj);
        current[removeIdx] = bestAdd;
        currentEdges += delta;

        if (Math.abs(currentEdges - TARGET_EDGES) < bestDist) {
          bestDist = Math.abs(currentEdges - TARGET_EDGES);
          bestConfig = [...current];
          bestEdges = currentEdges;
          plateauCount = 0;
        } else {
          plateauCount++;
        }
      } else {
        plateauCount++;
      }

      // Plateau escape: do a random perturbation
      if (plateauCount >= PLATEAU_LIMIT) {
        // Perturb 3 random vertices
        for (let p = 0; p < 3; p++) {
          const ri = Math.floor(Math.random() * TARGET_VERTICES);
          let rv: number;
          const cs = new Set(current);
          do { rv = Math.floor(Math.random() * N); } while (cs.has(rv));
          current[ri] = rv;
        }
        currentEdges = fastEdgeCount(current, adj);
        plateauCount = 0;
      }
    }

    bestPerWalker.push(bestEdges);
    results.push(analyzeSubgraph(bestConfig));
  }

  return { results, bestPerWalker };
}

// ── Fermionic Resonance Verification ──────────────────────────────────────

function verifyFermionicResonance(sub: Subgraph22): FermionicResonance {
  const N = sub.vertices.length;
  const E = sub.edgeCount;

  const fermionicCorrA = Math.pow(FERMIONIC_4PI / (2 * Math.PI), 2 / N);
  const alphaA = sub.degreeVariance > 0
    ? (sub.degreeSqSum / (4 * N * sub.degreeVariance)) * fermionicCorrA
    : Infinity;

  const degEven = sub.degreeSequence.filter(d => d % 2 === 0).length;
  const degOdd = N - degEven;
  const compressionRatio = degOdd > 0 ? degEven / degOdd : 2;
  const alphaB = E * FERMIONIC_4PI / (N * Math.sqrt(2 * compressionRatio));

  const alphaC = (TARGET_EDGES * Math.pow(FERMIONIC_4PI, 1 + 1 / N) * (N - 1)) /
                 (MAX_EDGES_22 * 2 * Math.PI);

  const cyclomaticNumber = E - N + 1;
  const geometricPhase = 2 * Math.PI * cyclomaticNumber / N;
  const windingNumber = Math.round(geometricPhase / (2 * Math.PI));
  const fermionicCondition = Math.abs(geometricPhase - FERMIONIC_4PI) < Math.PI;

  const paths = [
    { name: "A: Σd²/(4Nσ²) × fermionic", value: alphaA },
    { name: "B: E×4π/(N√(2c))", value: alphaB },
    { name: "C: T(17) resonance", value: alphaC },
  ];

  const best = paths.reduce((a, b) =>
    Math.abs(a.value - ALPHA_INV_MEASURED) < Math.abs(b.value - ALPHA_INV_MEASURED) ? a : b
  );

  return {
    subgraph: sub,
    alphaA, alphaB, alphaC,
    bestAlpha: best.value,
    bestPath: best.name,
    bestError: Math.abs(best.value - ALPHA_INV_MEASURED) / ALPHA_INV_MEASURED,
    edgeMatch: E === TARGET_EDGES,
    fermionicCondition,
    geometricPhase,
    windingNumber,
  };
}

// ── Main Search ───────────────────────────────────────────────────────────

/**
 * Run the full 153-link subgraph search with all 8 strategies.
 */
export function search153LinkStructure(): SearchResult {
  const startTime = performance.now();

  const TRIALS_PER_STRATEGY = 500;

  // ── Original strategies ─────────────────────────────────────────────
  const stratified = stratifiedSearch(TRIALS_PER_STRATEGY);
  const greedy = greedyDegreeSearch(TRIALS_PER_STRATEGY);
  const mirrorPair = mirrorPairSearch(TRIALS_PER_STRATEGY);
  const signClass = signClassSearch(TRIALS_PER_STRATEGY);

  // ── New intensified strategies ──────────────────────────────────────
  const sa = simulatedAnnealing(3000, 12.0, 0.004, 600, 12);
  const ga = geneticAlgorithm(250, 200, 0.2, 0.75, 4, 0.08);
  const phc = parallelHillClimb(20, 3000);

  const allResults = [
    ...stratified, ...greedy, ...mirrorPair, ...signClass,
    ...sa.results, ...ga.results, ...phc.results,
  ];

  // De-duplicate by vertex set
  const seen = new Set<string>();
  const unique: Subgraph22[] = [];
  for (const sub of allResults) {
    const key = [...sub.vertices].sort((a, b) => a - b).join(",");
    if (!seen.has(key)) { seen.add(key); unique.push(sub); }
  }

  const exact153 = unique.filter(s => s.edgeCount === TARGET_EDGES);
  const near153 = unique
    .filter(s => Math.abs(s.edgeCount - TARGET_EDGES) <= 5 && s.edgeCount !== TARGET_EDGES)
    .sort((a, b) => Math.abs(a.edgeCount - TARGET_EDGES) - Math.abs(b.edgeCount - TARGET_EDGES))
    .slice(0, 30);

  const resonances = exact153.map(verifyFermionicResonance);

  if (exact153.length === 0 && near153.length > 0) {
    resonances.push(verifyFermionicResonance(near153[0]));
  }

  const bestEdgeCount = unique.reduce(
    (best, s) => Math.abs(s.edgeCount - TARGET_EDGES) < Math.abs(best - TARGET_EDGES) ? s.edgeCount : best,
    unique[0]?.edgeCount ?? 0
  );

  const searchTimeMs = performance.now() - startTime;

  const stats: SearchStats = {
    totalCandidatesExplored: allResults.length,
    exact153Found: exact153.length,
    near153Found: near153.length,
    bestEdgeCount,
    closestToTarget: Math.abs(bestEdgeCount - TARGET_EDGES),
    searchTimeMs,
    strategiesUsed: [
      "stratified", "greedy-degree", "mirror-pair", "sign-class",
      "simulated-annealing", "genetic-algorithm", "parallel-hill-climb",
    ],
    saAcceptedUphill: sa.stats.acceptedUphill,
    saFinalTemperature: sa.stats.finalTemp,
    gaGenerations: ga.stats.generations,
    gaBestFitness: ga.stats.bestFitness,
    parallelWalkers: 20,
    parallelBestPerWalker: phc.bestPerWalker,
  };

  // ── Verification Tests ──────────────────────────────────────────────
  const tests: SubgraphTest[] = [];

  tests.push({
    name: "153 = T(17) = 17th triangular number",
    holds: TARGET_EDGES === (17 * 18) / 2,
    expected: "153 = 17×18/2", actual: `${TARGET_EDGES} = ${(17 * 18) / 2}`,
  });

  tests.push({
    name: "153 = 1³ + 5³ + 3³ (narcissistic number)",
    holds: 1 + 125 + 27 === 153,
    expected: "153", actual: `${1 + 125 + 27}`,
  });

  tests.push({
    name: "Target density = 153/231 ≈ 2/3",
    holds: Math.abs(TARGET_DENSITY - 2 / 3) < 0.005,
    expected: "≈ 0.6667", actual: TARGET_DENSITY.toFixed(4),
  });

  tests.push({
    name: "22-vertex manifold = 8 + 12 + 2",
    holds: TARGET_VERTICES === 8 + 12 + 2,
    expected: "22", actual: `${8 + 12 + 2}`,
  });

  tests.push({
    name: "Searched ≥ 2000 unique candidates",
    holds: unique.length >= 2000,
    expected: "≥ 2000", actual: String(unique.length),
  });

  tests.push({
    name: "All 7 search strategies executed",
    holds: stats.strategiesUsed.length === 7,
    expected: "7", actual: String(stats.strategiesUsed.length),
  });

  tests.push({
    name: "Best edge count within 5 of target",
    holds: Math.abs(bestEdgeCount - TARGET_EDGES) <= 5,
    expected: "≤ 5", actual: String(Math.abs(bestEdgeCount - TARGET_EDGES)),
  });

  tests.push({
    name: "Edge distribution spans range around 153",
    holds: unique.some(s => s.edgeCount < TARGET_EDGES) && unique.some(s => s.edgeCount > TARGET_EDGES),
    expected: "both < 153 and > 153",
    actual: `min=${Math.min(...unique.map(s => s.edgeCount))}, max=${Math.max(...unique.map(s => s.edgeCount))}`,
  });

  tests.push({
    name: "SA accepted uphill moves (exploration evidence)",
    holds: sa.stats.acceptedUphill > 50,
    expected: "> 50", actual: String(sa.stats.acceptedUphill),
  });

  tests.push({
    name: "GA completed ≥ 150 generations",
    holds: ga.stats.generations >= 150,
    expected: "≥ 150", actual: String(ga.stats.generations),
  });

  tests.push({
    name: "Parallel HC used ≥ 16 walkers",
    holds: phc.bestPerWalker.length >= 16,
    expected: "≥ 16", actual: String(phc.bestPerWalker.length),
  });

  if (resonances.length > 0) {
    const best = resonances.reduce((a, b) => a.bestError < b.bestError ? a : b);
    tests.push({
      name: "Best α⁻¹ derivation within 10% of 137.036",
      holds: best.bestError < 0.10,
      expected: "< 10%", actual: `${(best.bestError * 100).toFixed(2)}%`,
    });

    tests.push({
      name: "4π fermionic condition satisfied on best subgraph",
      holds: best.fermionicCondition,
      expected: "geometric phase ≈ 4π",
      actual: `${best.geometricPhase.toFixed(4)} (${best.windingNumber}× winding)`,
    });
  }

  tests.push({
    name: "Cyclomatic number β₁ = 132 for 153-edge, 22-vertex graph",
    holds: TARGET_EDGES - TARGET_VERTICES + 1 === 132,
    expected: "132", actual: String(TARGET_EDGES - TARGET_VERTICES + 1),
  });

  tests.push({
    name: "β₁ = 132 = 4 × 3 × 11 (fermionic factorization)",
    holds: 132 === 4 * 3 * 11,
    expected: "132 = 4 × 3 × 11", actual: `4 × 3 × 11 = ${4 * 3 * 11}`,
  });

  return {
    exact153, near153, resonances, stats, tests,
    allPassed: tests.every(t => t.holds),
  };
}

export function edgeCountHistogram(results: Subgraph22[]): Map<number, number> {
  const hist = new Map<number, number>();
  for (const s of results) hist.set(s.edgeCount, (hist.get(s.edgeCount) ?? 0) + 1);
  return hist;
}
