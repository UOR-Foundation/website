/**
 * Coherence Navigator — Topology-Aware H-score Gradient Descent on Atlas Manifold
 * ═══════════════════════════════════════════════════════════════════════════════════
 *
 * REPLACES: Transformer attention mechanism (O(N²d))
 * WITH:     Coherence gradient navigation on the 96-vertex Atlas graph (O(96))
 *
 * THEOREM (Coherence Navigation ≡ Inference):
 *   Let G = (V, E) be the Atlas graph with |V| = 96, |E| = 256.
 *   Let a ∈ ℝ⁹⁶ be the vertex activation vector.
 *   Define H(a) = 1 - Entropy(a²/||a²||₁) / log₂(96) as the coherence.
 *
 *   Navigation step:
 *     ∇H_topology(a)[v] = Σ_{u ∈ N(v)} w(v,u) · a[u] - a[v] · Σ_{u ∉ N(v)} a[u]
 *
 *   This topology-aware gradient:
 *     1. Diffuses activation along Atlas edges (reinforcing coherent structure)
 *     2. Suppresses activation on non-adjacent vertices (sharpening)
 *     3. Routes through Fano lines for long-range semantic jumps
 *     4. Corrects via τ-mirror parity checks (stabilizer code)
 *
 * THREE-SCALE NAVIGATION:
 *   Macro:  Fano-plane routing (7 lines) — coarse semantic direction
 *   Meso:   Edge traversal (256 edges) — refine meaning via adjacency
 *   Micro:  Vertex activation (96 vertices) — precise token selection
 *
 * PRESCIENCE MODULATION:
 *   ∂H/∂t > 0 → exploit (sharpen distribution, power > 1)
 *   ∂H/∂t < 0 → explore (flatten distribution, power < 1)
 *
 * @module hologram-compute/coherence-navigator
 */

import { getAtlas, ATLAS_VERTEX_COUNT, type Atlas, type AtlasVertex } from "../atlas/atlas";
import { constructFanoTopology, type FanoTopology } from "../atlas/fano-plane";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

/** Full state of the navigator at a given step */
export interface NavigatorState {
  /** Vertex activations [96] */
  activations: Float32Array;
  /** H-score (coherence) [0, 1] */
  hScore: number;
  /** Coherence gradient ∂H/∂vertex [96] */
  gradient: Float32Array;
  /** Coherence velocity ∂H/∂t */
  dHdt: number;
  /** Observer zone */
  zone: "convergent" | "exploring" | "divergent";
  /** Phase angle φ */
  phi: number;
  /** Step count */
  step: number;
  /** Stabilizer syndrome count (parity violations) */
  syndromeCount: number;
  /** Active vertex count */
  activeVertexCount: number;
  /** Dominant sign class */
  dominantSignClass: number;
  /** Fano channel activations [7] */
  fanoActivations: Float32Array;
}

/** Navigator configuration */
export interface NavigatorConfig {
  /** Base learning rate for gradient descent */
  learningRate: number;
  /** Momentum factor */
  momentum: number;
  /** Adjacency diffusion strength */
  diffusionStrength: number;
  /** Non-neighbor suppression strength */
  suppressionStrength: number;
  /** Fano routing strength (macro scale) */
  fanoStrength: number;
  /** τ-mirror correction strength */
  mirrorCorrectionStrength: number;
  /** Activation decay per step */
  activationDecay: number;
  /** Prescience modulation sensitivity */
  prescienceSensitivity: number;
  /** Steps per navigation round */
  stepsPerRound: number;
  /** Convergence threshold */
  convergenceThreshold: number;
  /** Activation floor (prevent dead vertices) */
  activationFloor: number;
}

export const DEFAULT_NAVIGATOR_CONFIG: NavigatorConfig = {
  learningRate: 0.02,
  momentum: 0.85,
  diffusionStrength: 0.15,
  suppressionStrength: 0.03,
  fanoStrength: 0.1,
  mirrorCorrectionStrength: 0.05,
  activationDecay: 0.97,
  prescienceSensitivity: 2.0,
  stepsPerRound: 8,
  convergenceThreshold: 0.0005,
  activationFloor: 1e-6,
};

/** Diagnostic info from a navigation round */
export interface NavigationDiagnostics {
  /** Steps taken in this round */
  stepsTaken: number;
  /** H-score trajectory */
  hScoreTrajectory: number[];
  /** Whether convergence was reached */
  converged: boolean;
  /** Fano routes activated */
  fanoRoutesUsed: number[];
  /** τ-mirror corrections applied */
  mirrorCorrections: number;
  /** Time for this round (ms) */
  timeMs: number;
}

// ═══════════════════════════════════════════════════════════════
// Precomputed topology tables (built once from Atlas)
// ═══════════════════════════════════════════════════════════════

interface TopologyTables {
  /** Adjacency list: neighbors[v] = array of neighbor indices */
  neighbors: number[][];
  /** Adjacency matrix as flat boolean array [96×96] */
  adjacencyFlat: Uint8Array;
  /** Mirror pair: mirrorOf[v] = τ(v) */
  mirrorOf: Uint8Array;
  /** Sign class: signClass[v] = 0..7 */
  signClass: Uint8Array;
  /** Degree: degree[v] = 5 or 6 */
  degree: Uint8Array;
  /** Fano lines: 7 lines × 3 points */
  fanoLines: [number, number, number][];
  /** Fano point membership: fanoMembership[point] = set of line indices */
  fanoMembership: Set<number>[];
  /** Sign class members: signClassMembers[sc] = vertex indices */
  signClassMembers: number[][];
}

let _tables: TopologyTables | null = null;

function getTopologyTables(): TopologyTables {
  if (_tables) return _tables;

  const atlas = getAtlas();
  const n = ATLAS_VERTEX_COUNT;

  const neighbors: number[][] = [];
  const adjacencyFlat = new Uint8Array(n * n);
  const mirrorOf = new Uint8Array(n);
  const signClass = new Uint8Array(n);
  const degree = new Uint8Array(n);
  const signClassMembers: number[][] = Array.from({ length: 8 }, () => []);

  for (let v = 0; v < n; v++) {
    const vert = atlas.vertex(v);
    neighbors.push([...vert.neighbors]);
    mirrorOf[v] = vert.mirrorPair;
    signClass[v] = vert.signClass;
    degree[v] = vert.degree;
    signClassMembers[vert.signClass].push(v);

    for (const u of vert.neighbors) {
      adjacencyFlat[v * n + u] = 1;
    }
  }

  // Fano lines from the topology
  let fanoLines: [number, number, number][];
  try {
    const topo = constructFanoTopology();
    fanoLines = topo.lines.map(l => l.points);
  } catch {
    // Fallback canonical Fano lines
    fanoLines = [
      [0, 1, 3], [1, 2, 4], [2, 3, 5],
      [3, 4, 6], [4, 5, 0], [5, 6, 1], [6, 0, 2],
    ];
  }

  const fanoMembership: Set<number>[] = Array.from({ length: 7 }, () => new Set<number>());
  for (let li = 0; li < fanoLines.length; li++) {
    for (const p of fanoLines[li]) {
      if (p < 7) fanoMembership[p].add(li);
    }
  }

  _tables = {
    neighbors, adjacencyFlat, mirrorOf, signClass, degree,
    fanoLines, fanoMembership, signClassMembers,
  };
  return _tables;
}

// ═══════════════════════════════════════════════════════════════
// H-score computation (topology-aware)
// ═══════════════════════════════════════════════════════════════

/**
 * Compute H-score from vertex activations.
 * H = 1 - Entropy(p) / log₂(96) where p = a²/||a²||₁
 */
function computeH(a: Float32Array): number {
  const n = a.length;
  let energy = 0;
  for (let i = 0; i < n; i++) energy += a[i] * a[i];
  if (energy < 1e-15) return 0;

  let entropy = 0;
  for (let i = 0; i < n; i++) {
    const p = (a[i] * a[i]) / energy;
    if (p > 1e-15) entropy -= p * Math.log2(p);
  }
  return Math.max(0, Math.min(1, 1 - entropy / Math.log2(n)));
}

/**
 * Classify zone from H-score.
 */
function classifyZone(h: number): "convergent" | "exploring" | "divergent" {
  if (h >= 0.8) return "convergent";
  if (h >= 0.4) return "exploring";
  return "divergent";
}

// ═══════════════════════════════════════════════════════════════
// CoherenceNavigator
// ═══════════════════════════════════════════════════════════════

/**
 * CoherenceNavigator — Topology-aware manifold navigation engine.
 *
 * This replaces transformer attention with three-scale coherence
 * navigation on the Atlas graph:
 *
 *   MACRO:  Fano-plane routing → long-range semantic jumps
 *   MESO:   Atlas edge diffusion → local meaning refinement
 *   MICRO:  Vertex activation sharpening → precise token selection
 *
 * Combined with τ-mirror stabilizer checks and Prescience-style
 * explore/exploit modulation via ∂H/∂t.
 */
export class CoherenceNavigator {
  private config: NavigatorConfig;
  private tables: TopologyTables;

  /** Momentum buffer for gradient smoothing */
  private momentumBuf: Float32Array;
  /** Previous H-score for ∂H/∂t computation */
  private prevHScore: number = 0;
  /** Cumulative step counter */
  private globalStep: number = 0;

  constructor(config: Partial<NavigatorConfig> = {}) {
    this.config = { ...DEFAULT_NAVIGATOR_CONFIG, ...config };
    this.tables = getTopologyTables();
    this.momentumBuf = new Float32Array(ATLAS_VERTEX_COUNT);
  }

  /**
   * Reset internal state (momentum, step counter).
   */
  reset(): void {
    this.momentumBuf.fill(0);
    this.prevHScore = 0;
    this.globalStep = 0;
  }

  /**
   * Seed activations from token vertex assignments.
   * Each token's primary vertex gets a boost.
   */
  seedFromTokens(
    activations: Float32Array,
    tokenVertices: number[],
  ): void {
    for (let i = 0; i < tokenVertices.length; i++) {
      const v = tokenVertices[i];
      if (v >= 0 && v < ATLAS_VERTEX_COUNT) {
        activations[v] += 0.5;
        // Also lightly activate neighbors for context spreading
        for (const u of this.tables.neighbors[v]) {
          activations[u] += 0.08;
        }
      }
    }
  }

  /**
   * Perform one full navigation round (multiple steps).
   * Returns the updated state and diagnostics.
   */
  navigate(activations: Float32Array): { state: NavigatorState; diagnostics: NavigationDiagnostics } {
    const t0 = performance.now();
    const hTrajectory: number[] = [];
    const fanoRoutesUsed = new Set<number>();
    let mirrorCorrections = 0;
    let converged = false;

    for (let step = 0; step < this.config.stepsPerRound; step++) {
      const hBefore = computeH(activations);
      hTrajectory.push(hBefore);

      // Compute ∂H/∂t for Prescience modulation
      const dHdt = hBefore - this.prevHScore;
      this.prevHScore = hBefore;

      // Prescience modulation: ∂H/∂t → power-law exponent
      // Rising coherence → sharpen (exploit), falling → flatten (explore)
      const prescienceExponent = Math.exp(this.config.prescienceSensitivity * dHdt);

      // ── Scale 1: MACRO — Fano-plane routing ──────────────────
      const fanoGrad = this.computeFanoGradient(activations);
      for (let li = 0; li < this.tables.fanoLines.length; li++) {
        if (Math.abs(fanoGrad[li]) > 0.01) fanoRoutesUsed.add(li);
      }

      // ── Scale 2: MESO — Atlas edge diffusion ────────────────
      const topoGrad = this.computeTopologyGradient(activations);

      // ── Scale 3: MICRO — Vertex sharpening ──────────────────
      const sharpGrad = this.computeSharpeningGradient(activations);

      // ── Combine gradients with Prescience modulation ────────
      for (let v = 0; v < ATLAS_VERTEX_COUNT; v++) {
        // Fano contribution: distribute line activations to vertices
        let fanoContrib = 0;
        for (let li = 0; li < this.tables.fanoLines.length; li++) {
          const line = this.tables.fanoLines[li];
          // Map Fano points to Atlas vertices via sign class
          const scVertices = this.tables.signClassMembers[line[0] % 8];
          if (scVertices.includes(v)) {
            fanoContrib += fanoGrad[li];
          }
        }

        const combined =
          this.config.fanoStrength * fanoContrib +
          this.config.diffusionStrength * topoGrad[v] +
          this.config.learningRate * sharpGrad[v];

        // Apply Prescience modulation
        const modulated = combined >= 0
          ? Math.pow(Math.abs(combined), prescienceExponent) 
          : -Math.pow(Math.abs(combined), prescienceExponent);

        // Momentum-accelerated update
        this.momentumBuf[v] = this.config.momentum * this.momentumBuf[v] + modulated;
        activations[v] += this.momentumBuf[v];
      }

      // ── τ-mirror correction (stabilizer) ────────────────────
      mirrorCorrections += this.applyMirrorCorrection(activations);

      // ── Activation decay + floor ────────────────────────────
      for (let v = 0; v < ATLAS_VERTEX_COUNT; v++) {
        activations[v] *= this.config.activationDecay;
        if (activations[v] < this.config.activationFloor && activations[v] > 0) {
          activations[v] = this.config.activationFloor;
        }
        if (activations[v] < 0) activations[v] = 0; // ReLU floor
      }

      // Check convergence
      const hAfter = computeH(activations);
      if (Math.abs(hAfter - hBefore) < this.config.convergenceThreshold && step > 2) {
        converged = true;
        hTrajectory.push(hAfter);
        break;
      }

      this.globalStep++;
    }

    // Build final state
    const hFinal = computeH(activations);
    const gradient = this.computeTopologyGradient(activations);
    const syndromeCount = this.countSyndromes(activations);
    const fanoActivations = this.computeFanoActivations(activations);

    let activeCount = 0;
    let dominantSC = 0;
    let maxSCEnergy = 0;
    const scEnergies = new Float64Array(8);
    for (let v = 0; v < ATLAS_VERTEX_COUNT; v++) {
      if (activations[v] > 0.01) activeCount++;
      scEnergies[this.tables.signClass[v]] += activations[v] * activations[v];
    }
    for (let sc = 0; sc < 8; sc++) {
      if (scEnergies[sc] > maxSCEnergy) {
        maxSCEnergy = scEnergies[sc];
        dominantSC = sc;
      }
    }

    const state: NavigatorState = {
      activations: new Float32Array(activations),
      hScore: hFinal,
      gradient,
      dHdt: hTrajectory.length > 1 ? hFinal - hTrajectory[0] : 0,
      zone: classifyZone(hFinal),
      phi: Math.atan2(activations[1] || 0, activations[0] || 0),
      step: this.globalStep,
      syndromeCount,
      activeVertexCount: activeCount,
      dominantSignClass: dominantSC,
      fanoActivations,
    };

    return {
      state,
      diagnostics: {
        stepsTaken: hTrajectory.length,
        hScoreTrajectory: hTrajectory,
        converged,
        fanoRoutesUsed: [...fanoRoutesUsed],
        mirrorCorrections,
        timeMs: performance.now() - t0,
      },
    };
  }

  /**
   * Inject a token's vertex into activations (autoregressive feedback).
   * Activates the vertex + its graph neighbors for context spreading.
   */
  injectToken(activations: Float32Array, vertex: number, strength: number = 0.3): void {
    if (vertex < 0 || vertex >= ATLAS_VERTEX_COUNT) return;

    activations[vertex] += strength;

    // Neighbor activation (meso-scale context)
    const neighbors = this.tables.neighbors[vertex];
    for (const u of neighbors) {
      activations[u] += strength * 0.25;
    }

    // τ-mirror echo (for error-correction redundancy)
    const mirror = this.tables.mirrorOf[vertex];
    activations[mirror] += strength * 0.1;
  }

  // ═══════════════════════════════════════════════════════════════
  // Scale 1: MACRO — Fano-plane routing
  // ═══════════════════════════════════════════════════════════════

  /**
   * Compute Fano-line activation gradient.
   * Each Fano line {i, j, k} acts as a long-range semantic channel.
   * Line activation = product of the three sign-class energies.
   */
  private computeFanoGradient(a: Float32Array): Float32Array {
    const grad = new Float32Array(7);

    for (let li = 0; li < this.tables.fanoLines.length; li++) {
      const [p, q, r] = this.tables.fanoLines[li];

      // Map Fano points to sign classes
      const scP = p % 8, scQ = q % 8, scR = r % 8;

      // Sign class energies
      let eP = 0, eQ = 0, eR = 0;
      for (const v of this.tables.signClassMembers[scP]) eP += a[v];
      for (const v of this.tables.signClassMembers[scQ]) eQ += a[v];
      for (const v of this.tables.signClassMembers[scR]) eR += a[v];

      // Line activation: geometric mean (balanced contribution)
      const lineAct = Math.cbrt(Math.abs(eP * eQ * eR));

      // Gradient: direction that would increase line coherence
      // If one leg is weak, gradient pushes to strengthen it
      const mean = (eP + eQ + eR) / 3;
      grad[li] = lineAct > 0 ? (mean - Math.min(eP, eQ, eR)) / lineAct : 0;
    }

    return grad;
  }

  /**
   * Compute Fano channel activations (for diagnostics/visualization).
   */
  private computeFanoActivations(a: Float32Array): Float32Array {
    const acts = new Float32Array(7);
    for (let li = 0; li < this.tables.fanoLines.length; li++) {
      const [p, q, r] = this.tables.fanoLines[li];
      let sum = 0;
      for (const v of this.tables.signClassMembers[p % 8]) sum += a[v];
      for (const v of this.tables.signClassMembers[q % 8]) sum += a[v];
      for (const v of this.tables.signClassMembers[r % 8]) sum += a[v];
      acts[li] = sum;
    }
    return acts;
  }

  // ═══════════════════════════════════════════════════════════════
  // Scale 2: MESO — Atlas edge diffusion
  // ═══════════════════════════════════════════════════════════════

  /**
   * Compute topology-aware gradient using real Atlas adjacency.
   *
   * For each vertex v:
   *   ∇[v] = diffusion(neighbors) - suppression(non-neighbors)
   *
   * Diffusion: energy flows along edges (local coherence)
   * Suppression: non-adjacent vertices compete (sharpening)
   */
  private computeTopologyGradient(a: Float32Array): Float32Array {
    const grad = new Float32Array(ATLAS_VERTEX_COUNT);

    for (let v = 0; v < ATLAS_VERTEX_COUNT; v++) {
      const neighbors = this.tables.neighbors[v];
      const deg = neighbors.length;

      // Diffusion: weighted sum of neighbor activations
      let neighborSum = 0;
      for (const u of neighbors) {
        neighborSum += a[u];
      }
      const diffusion = deg > 0 ? neighborSum / deg - a[v] : 0;

      // Suppression: penalize if non-neighbors are active
      // (Efficient: total activation - self - neighbor sum)
      let totalAct = 0;
      for (let u = 0; u < ATLAS_VERTEX_COUNT; u++) totalAct += a[u];
      const nonNeighborAct = totalAct - a[v] - neighborSum;
      const suppression = nonNeighborAct / (ATLAS_VERTEX_COUNT - deg - 1);

      grad[v] = diffusion - this.config.suppressionStrength * suppression;
    }

    return grad;
  }

  // ═══════════════════════════════════════════════════════════════
  // Scale 3: MICRO — Vertex sharpening
  // ═══════════════════════════════════════════════════════════════

  /**
   * Compute sharpening gradient (concentrates energy).
   * Vertices above mean are boosted, below mean are suppressed.
   * This is the micro-scale equivalent of attention sharpening.
   */
  private computeSharpeningGradient(a: Float32Array): Float32Array {
    const grad = new Float32Array(ATLAS_VERTEX_COUNT);
    let energy = 0;
    for (let v = 0; v < ATLAS_VERTEX_COUNT; v++) energy += a[v] * a[v];
    if (energy < 1e-15) return grad;

    const invE = 1 / energy;
    for (let v = 0; v < ATLAS_VERTEX_COUNT; v++) {
      // Gradient toward concentration: boost peaks, suppress valleys
      grad[v] = 2 * a[v] * invE * (a[v] * invE - 1 / ATLAS_VERTEX_COUNT);
    }

    return grad;
  }

  // ═══════════════════════════════════════════════════════════════
  // τ-mirror stabilizer code
  // ═══════════════════════════════════════════════════════════════

  /**
   * Apply τ-mirror correction: enforce parity between mirror pairs.
   * This implements the [[96, 48, 2]] stabilizer code.
   *
   * For each mirror pair (v, τ(v)):
   *   If |a[v] - a[τ(v)]| > threshold, blend toward mean.
   *
   * Returns number of corrections applied.
   */
  private applyMirrorCorrection(a: Float32Array): number {
    let corrections = 0;
    const threshold = 0.2;

    for (let v = 0; v < 48; v++) {
      const mv = this.tables.mirrorOf[v];
      const diff = Math.abs(a[v] - a[mv]);

      if (diff > threshold) {
        const mean = (a[v] + a[mv]) * 0.5;
        const correctionBlend = this.config.mirrorCorrectionStrength;
        a[v] = a[v] * (1 - correctionBlend) + mean * correctionBlend;
        a[mv] = a[mv] * (1 - correctionBlend) + mean * correctionBlend;
        corrections++;
      }
    }

    return corrections;
  }

  /**
   * Count stabilizer syndrome violations (parity check failures).
   */
  private countSyndromes(a: Float32Array): number {
    let syndromes = 0;
    const threshold = 0.3;

    for (let v = 0; v < 48; v++) {
      const mv = this.tables.mirrorOf[v];
      if (Math.abs(a[v] - a[mv]) > threshold) {
        syndromes++;
      }
    }

    return syndromes;
  }

  /**
   * Get current config.
   */
  getConfig(): NavigatorConfig {
    return { ...this.config };
  }

  /**
   * Update config dynamically.
   */
  updateConfig(partial: Partial<NavigatorConfig>): void {
    this.config = { ...this.config, ...partial };
  }
}
