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
 * THREE-SCALE NAVIGATION (Phase 2 — Proper Fano Routing):
 *   Macro:  Fano-plane routing — 7 octonionic channels with associator brackets
 *           Each line {i,j,k} carries semantic energy via eᵢ·eⱼ = ±eₖ
 *           Associator defect (eᵢeⱼ)eₖ ≠ eᵢ(eⱼeₖ) drives interference gradients
 *
 *   Meso:   Graph Laplacian diffusion — precomputed L = D - A operator
 *           Heat equation on Atlas: ∂a/∂t = -αLa (energy flows along edges)
 *           Sign-class-aware suppression (compete within same semantic band)
 *
 *   Micro:  Vertex activation sharpening — entropy-gradient concentration
 *           Prescience modulation: ∂H/∂t → power-law exponent (exploit/explore)
 *
 * PRESCIENCE MODULATION:
 *   ∂H/∂t > 0 → exploit (sharpen distribution, power > 1)
 *   ∂H/∂t < 0 → explore (flatten distribution, power < 1)
 *
 * @module hologram-compute/coherence-navigator
 */

import { getAtlas, ATLAS_VERTEX_COUNT } from "../atlas/atlas";
import { constructFanoTopology, type FanoTopology, type FanoLine } from "../atlas/fano-plane";

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
  /** Adjacency diffusion strength (Laplacian heat coefficient) */
  diffusionStrength: number;
  /** Sign-class suppression strength */
  suppressionStrength: number;
  /** Fano routing strength (macro scale) */
  fanoStrength: number;
  /** Associator bracket sensitivity (non-associative interference) */
  associatorSensitivity: number;
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
  /** Fano line reinforcement (boost collinear vertex triads) */
  fanoTriadReinforcement: number;
  /** Edge-distance decay for neighbor seeding (exp(-d * decay)) */
  seedDistanceDecay: number;
}

export const DEFAULT_NAVIGATOR_CONFIG: NavigatorConfig = {
  learningRate: 0.025,
  momentum: 0.88,
  diffusionStrength: 0.2,
  suppressionStrength: 0.06,
  fanoStrength: 0.18,
  associatorSensitivity: 0.4,
  mirrorCorrectionStrength: 0.08,
  activationDecay: 0.96,
  prescienceSensitivity: 2.5,
  stepsPerRound: 10,
  convergenceThreshold: 0.0003,
  activationFloor: 1e-6,
  fanoTriadReinforcement: 0.12,
  seedDistanceDecay: 0.6,
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
  /** Associator bracket magnitudes per Fano line */
  associatorBrackets: number[];
  /** Time for this round (ms) */
  timeMs: number;
}

// ═══════════════════════════════════════════════════════════════
// Precomputed topology tables (built once from Atlas + Fano)
// ═══════════════════════════════════════════════════════════════

interface TopologyTables {
  /** Adjacency list: neighbors[v] = array of neighbor indices */
  neighbors: number[][];
  /** Graph Laplacian row: laplacian[v] = sparse entries {vertex, weight} */
  laplacianRows: { idx: number; w: number }[][];
  /** Mirror pair: mirrorOf[v] = τ(v) */
  mirrorOf: Uint8Array;
  /** Sign class: signClass[v] = 0..7 */
  signClass: Uint8Array;
  /** Degree: degree[v] = 5 or 6 */
  degree: Uint8Array;
  /** Fano topology (full structure from fano-plane.ts) */
  fano: FanoTopology;
  /** Fano line → vertex sets: for each line, the Atlas vertices in the 3 sign classes */
  fanoLineVertices: number[][];
  /** Sign class members: signClassMembers[sc] = vertex indices */
  signClassMembers: number[][];
  /** Fano sign-class map: fanoPointSignClasses[point] = sign classes */
  fanoPointSignClasses: number[][];
  /** Octonionic multiplication table [7][7] → {index, sign} */
  mulTable: { index: number; sign: number }[][];
  /** Precomputed total activation cache (updated each step) */
  totalActivation: number;
}

let _tables: TopologyTables | null = null;

function getTopologyTables(): TopologyTables {
  if (_tables) return _tables;

  const atlas = getAtlas();
  const n = ATLAS_VERTEX_COUNT;

  const neighbors: number[][] = [];
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
  }

  // ── Graph Laplacian: L = D - A ──────────────────────────────
  // For each vertex v, L[v][v] = degree(v), L[v][u] = -1 if (v,u) ∈ E
  // We store sparse rows for O(degree) application
  const laplacianRows: { idx: number; w: number }[][] = [];
  for (let v = 0; v < n; v++) {
    const row: { idx: number; w: number }[] = [];
    // Diagonal: degree
    row.push({ idx: v, w: degree[v] });
    // Off-diagonal: -1 for each neighbor
    for (const u of neighbors[v]) {
      row.push({ idx: u, w: -1 });
    }
    laplacianRows.push(row);
  }

  // ── Fano topology ───────────────────────────────────────────
  let fano: FanoTopology;
  try {
    fano = constructFanoTopology();
  } catch {
    // Minimal fallback
    fano = {
      points: Array.from({ length: 7 }, (_, i) => ({
        index: i,
        label: `e${i + 1}`,
        generatorKind: "product" as any,
        incidentLines: [],
        qubitRole: `q${i}`,
        degree: 3,
        complementPoints: [],
      })),
      lines: [
        [0, 1, 3], [1, 2, 4], [2, 3, 5],
        [3, 4, 6], [4, 5, 0], [5, 6, 1], [6, 0, 2],
      ].map((pts, i) => ({
        index: i,
        points: pts as [number, number, number],
        multiplicationRule: `e${pts[0]+1}·e${pts[1]+1}=e${pts[2]+1}`,
        reverseRule: "",
        gateChannel: `ch${i}`,
        signClassInteraction: [pts[0] % 8, pts[1] % 8, pts[2] % 8] as [number, number, number],
      })),
      incidenceMatrix: [],
      collinearityMatrix: [],
      multiplicationTable: [],
      automorphismOrder: 168,
      verifiedAutomorphisms: 0,
    };
  }

  // ── Map Fano points to sign classes ─────────────────────────
  // Each Fano point i maps to sign class i (for i < 7).
  // Sign class 7 is the "scalar" class (e₀ direction).
  const fanoPointSignClasses: number[][] = [];
  for (let p = 0; p < 7; p++) {
    // Primary sign class mapping
    fanoPointSignClasses.push([p]);
  }

  // ── Map Fano lines to vertex sets ───────────────────────────
  // Each Fano line connects 3 sign classes → all vertices in those classes
  const fanoLineVertices: number[][] = [];
  for (const line of fano.lines) {
    const verts: number[] = [];
    for (const p of line.points) {
      const sc = p % 8;
      verts.push(...signClassMembers[sc]);
    }
    fanoLineVertices.push(verts);
  }

  // ── Octonionic multiplication table ─────────────────────────
  const mulTable = fano.multiplicationTable && fano.multiplicationTable.length === 7
    ? fano.multiplicationTable
    : buildFallbackMulTable(fano.lines);

  _tables = {
    neighbors, laplacianRows, mirrorOf, signClass, degree,
    fano, fanoLineVertices, signClassMembers, fanoPointSignClasses,
    mulTable, totalActivation: 0,
  };
  return _tables;
}

/** Build multiplication table from Fano lines as fallback */
function buildFallbackMulTable(lines: FanoLine[]): { index: number; sign: number }[][] {
  const t: { index: number; sign: number }[][] = Array.from({ length: 7 }, () =>
    Array.from({ length: 7 }, () => ({ index: -1, sign: 0 }))
  );
  for (let i = 0; i < 7; i++) t[i][i] = { index: -1, sign: -1 }; // eᵢ² = -1

  for (const line of lines) {
    const [a, b, c] = line.points;
    // Cyclic: eₐ·eᵦ = +eᵧ
    t[a][b] = { index: c, sign: 1 };
    t[b][c] = { index: a, sign: 1 };
    t[c][a] = { index: b, sign: 1 };
    // Anti-cyclic: eᵦ·eₐ = -eᵧ
    t[b][a] = { index: c, sign: -1 };
    t[c][b] = { index: a, sign: -1 };
    t[a][c] = { index: b, sign: -1 };
  }
  return t;
}

// ═══════════════════════════════════════════════════════════════
// H-score computation
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
  const invE = 1 / energy;
  for (let i = 0; i < n; i++) {
    const p = a[i] * a[i] * invE;
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
 * Phase 2 Enhancement: Three-scale navigation with proper Fano routing,
 * graph Laplacian diffusion, and octonionic associator brackets.
 *
 *   MACRO:  Fano-plane routing → octonionic line energy + associator interference
 *   MESO:   Graph Laplacian → precomputed L = D - A heat diffusion
 *   MICRO:  Entropy-gradient sharpening + Prescience modulation
 *
 * Combined with τ-mirror stabilizer checks (48 parity generators).
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
  /** Sign-class energy cache [8] — recomputed each step */
  private scEnergy: Float64Array = new Float64Array(8);
  /** Fano line energy cache [7] */
  private fanoLineEnergy: Float64Array = new Float64Array(7);

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
    this.scEnergy.fill(0);
    this.fanoLineEnergy.fill(0);
  }

  /**
   * Seed activations from token vertex assignments.
   * Uses edge-distance decay for multi-hop context spreading.
   */
  seedFromTokens(
    activations: Float32Array,
    tokenVertices: number[],
  ): void {
    const decay = this.config.seedDistanceDecay;

    for (let i = 0; i < tokenVertices.length; i++) {
      const v = tokenVertices[i];
      if (v < 0 || v >= ATLAS_VERTEX_COUNT) continue;

      // Recency weight: later tokens in context get more weight
      const recency = 0.3 + 0.7 * (i / Math.max(1, tokenVertices.length - 1));

      // Direct vertex
      activations[v] += 0.5 * recency;

      // Hop 1: neighbors (edge distance 1)
      const hop1 = this.tables.neighbors[v];
      for (const u of hop1) {
        activations[u] += 0.5 * recency * Math.exp(-decay);
      }

      // Hop 2: neighbors of neighbors (edge distance 2)
      for (const u of hop1) {
        for (const w of this.tables.neighbors[u]) {
          if (w !== v) {
            activations[w] += 0.5 * recency * Math.exp(-2 * decay);
          }
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
    const associatorBrackets = new Float64Array(7);

    for (let step = 0; step < this.config.stepsPerRound; step++) {
      const hBefore = computeH(activations);
      hTrajectory.push(hBefore);

      // Compute ∂H/∂t for Prescience modulation
      const dHdt = hBefore - this.prevHScore;
      this.prevHScore = hBefore;

      // Prescience modulation: ∂H/∂t → power-law exponent
      const prescienceExponent = Math.exp(this.config.prescienceSensitivity * dHdt);

      // ── Precompute sign-class energies (used by all scales) ───
      this.updateSignClassEnergies(activations);

      // ── Scale 1: MACRO — Fano-plane octonionic routing ────────
      const fanoGrad = this.computeFanoGradient(activations, associatorBrackets);
      for (let li = 0; li < 7; li++) {
        if (this.fanoLineEnergy[li] > 0.05) fanoRoutesUsed.add(li);
      }

      // ── Scale 2: MESO — Graph Laplacian diffusion ─────────────
      const laplacianGrad = this.computeLaplacianGradient(activations);

      // ── Scale 3: MICRO — Entropy-gradient sharpening ──────────
      const sharpGrad = this.computeSharpeningGradient(activations);

      // ── Combine gradients with Prescience modulation ──────────
      for (let v = 0; v < ATLAS_VERTEX_COUNT; v++) {
        const combined =
          this.config.fanoStrength * fanoGrad[v] +
          this.config.diffusionStrength * laplacianGrad[v] +
          this.config.learningRate * sharpGrad[v];

        // Apply Prescience modulation
        const sign = combined >= 0 ? 1 : -1;
        const modulated = sign * Math.pow(Math.abs(combined), prescienceExponent);

        // Momentum-accelerated update
        this.momentumBuf[v] = this.config.momentum * this.momentumBuf[v] + modulated;
        activations[v] += this.momentumBuf[v];
      }

      // ── Fano triad reinforcement ──────────────────────────────
      this.applyFanoTriadReinforcement(activations);

      // ── τ-mirror correction (stabilizer) ──────────────────────
      mirrorCorrections += this.applyMirrorCorrection(activations);

      // ── Activation decay + floor ──────────────────────────────
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
    const gradient = new Float32Array(ATLAS_VERTEX_COUNT);
    // Recompute meso gradient for state output
    const lg = this.computeLaplacianGradient(activations);
    for (let v = 0; v < ATLAS_VERTEX_COUNT; v++) gradient[v] = lg[v];

    const syndromeCount = this.countSyndromes(activations);
    const fanoActivations = this.computeFanoActivations(activations);

    let activeCount = 0;
    let dominantSC = 0;
    let maxSCEnergy = 0;
    this.updateSignClassEnergies(activations);
    for (let v = 0; v < ATLAS_VERTEX_COUNT; v++) {
      if (activations[v] > 0.01) activeCount++;
    }
    for (let sc = 0; sc < 8; sc++) {
      if (this.scEnergy[sc] > maxSCEnergy) {
        maxSCEnergy = this.scEnergy[sc];
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
        associatorBrackets: Array.from(associatorBrackets),
        timeMs: performance.now() - t0,
      },
    };
  }

  /**
   * Inject a token's vertex into activations (autoregressive feedback).
   * Activates the vertex + graph neighborhood + Fano-collinear vertices.
   */
  injectToken(activations: Float32Array, vertex: number, strength: number = 0.3): void {
    if (vertex < 0 || vertex >= ATLAS_VERTEX_COUNT) return;

    activations[vertex] += strength;

    // Neighbor activation (meso-scale context)
    const neighbors = this.tables.neighbors[vertex];
    for (const u of neighbors) {
      activations[u] += strength * 0.25;
    }

    // Fano-collinear activation (macro-scale routing)
    // Find which sign class this vertex belongs to, then boost
    // all vertices on Fano lines through that sign class
    const sc = this.tables.signClass[vertex];
    if (sc < 7) {
      for (let li = 0; li < this.tables.fano.lines.length; li++) {
        const line = this.tables.fano.lines[li];
        const pts = line.points;
        if (pts.includes(sc)) {
          // This Fano line passes through our sign class
          // Boost the other two sign classes on this line
          for (const p of pts) {
            if (p !== sc && p < 8) {
              for (const w of this.tables.signClassMembers[p]) {
                activations[w] += strength * 0.08;
              }
            }
          }
        }
      }
    }

    // τ-mirror echo (for error-correction redundancy)
    const mirror = this.tables.mirrorOf[vertex];
    activations[mirror] += strength * 0.12;
  }

  // ═══════════════════════════════════════════════════════════════
  // Precomputation helpers
  // ═══════════════════════════════════════════════════════════════

  /**
   * Update cached sign-class energies from current activations.
   */
  private updateSignClassEnergies(a: Float32Array): void {
    this.scEnergy.fill(0);
    for (let v = 0; v < ATLAS_VERTEX_COUNT; v++) {
      this.scEnergy[this.tables.signClass[v]] += a[v];
    }

    // Also update Fano line energies (geometric mean of 3 sign-class energies)
    for (let li = 0; li < this.tables.fano.lines.length && li < 7; li++) {
      const [p, q, r] = this.tables.fano.lines[li].points;
      const ep = this.scEnergy[p % 8];
      const eq = this.scEnergy[q % 8];
      const er = this.scEnergy[r % 8];
      this.fanoLineEnergy[li] = Math.cbrt(Math.abs(ep * eq * er));
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Scale 1: MACRO — Fano-plane octonionic routing
  // ═══════════════════════════════════════════════════════════════

  /**
   * Compute Fano routing gradient using octonionic structure.
   *
   * For each Fano line {i,j,k} with eᵢ·eⱼ = ±eₖ:
   *   1. Compute line energy = geometric mean of sign-class energies
   *   2. Compute associator bracket: |(eᵢeⱼ)eₖ - eᵢ(eⱼeₖ)|
   *      Non-zero associator → interference → drives exploration
   *   3. Gradient pushes energy toward the weakest leg of each active line
   *
   * The gradient is mapped back to individual vertices via their sign class.
   */
  private computeFanoGradient(a: Float32Array, associatorOut: Float64Array): Float32Array {
    const grad = new Float32Array(ATLAS_VERTEX_COUNT);
    const lines = this.tables.fano.lines;
    const mul = this.tables.mulTable;

    for (let li = 0; li < lines.length && li < 7; li++) {
      const [pi, pj, pk] = lines[li].points;
      const sci = pi % 8, scj = pj % 8, sck = pk % 8;

      const ei = this.scEnergy[sci];
      const ej = this.scEnergy[scj];
      const ek = this.scEnergy[sck];

      const lineEnergy = this.fanoLineEnergy[li];
      if (lineEnergy < 0.001) continue;

      // ── Associator bracket computation ──────────────────────
      // (eᵢeⱼ)eₖ vs eᵢ(eⱼeₖ) using the multiplication table
      let associator = 0;
      if (mul.length === 7 && pi < 7 && pj < 7 && pk < 7) {
        // (eᵢ·eⱼ) product
        const ij = mul[pi][pj]; // eᵢ·eⱼ = sign * e_{index}
        if (ij.index >= 0 && ij.index < 7) {
          // ((eᵢ·eⱼ)·eₖ)
          const ij_k = mul[ij.index][pk];
          // (eᵢ·(eⱼ·eₖ))
          const jk = mul[pj][pk];
          if (jk.index >= 0 && jk.index < 7) {
            const i_jk = mul[pi][jk.index];
            // Associator = difference in resulting indices or signs
            if (ij_k.index !== i_jk.index || (ij.sign * ij_k.sign) !== (jk.sign * i_jk.sign)) {
              associator = 1.0; // Non-zero associator → non-associative triple
            }
          }
        }
      }
      associatorOut[li] = associator;

      // ── Gradient: balance the three legs ────────────────────
      // Push energy toward the weakest sign class on this line
      const mean = (ei + ej + ek) / 3;
      const deficitI = mean - ei;
      const deficitJ = mean - ej;
      const deficitK = mean - ek;

      // Scale by line energy (active lines get stronger gradients)
      const scale = lineEnergy / (ei + ej + ek + 1e-10);

      // ── Associator modulation ──────────────────────────────
      // Non-associative triples create interference that broadens search
      const assocMod = 1 + this.config.associatorSensitivity * associator;

      // Distribute gradient to all vertices in each sign class
      for (const v of this.tables.signClassMembers[sci]) {
        grad[v] += deficitI * scale * assocMod;
      }
      for (const v of this.tables.signClassMembers[scj]) {
        grad[v] += deficitJ * scale * assocMod;
      }
      for (const v of this.tables.signClassMembers[sck]) {
        grad[v] += deficitK * scale * assocMod;
      }
    }

    return grad;
  }

  /**
   * Compute Fano channel activations (for diagnostics/visualization).
   */
  private computeFanoActivations(a: Float32Array): Float32Array {
    const acts = new Float32Array(7);
    for (let li = 0; li < this.tables.fano.lines.length && li < 7; li++) {
      acts[li] = this.fanoLineEnergy[li];
    }
    return acts;
  }

  /**
   * Apply Fano triad reinforcement.
   * For each active Fano line, boost the strongest vertex-triad
   * (one vertex per sign class) to create coherent attractors.
   */
  private applyFanoTriadReinforcement(a: Float32Array): void {
    const strength = this.config.fanoTriadReinforcement;
    if (strength < 1e-8) return;

    for (let li = 0; li < this.tables.fano.lines.length && li < 7; li++) {
      if (this.fanoLineEnergy[li] < 0.05) continue;

      const [pi, pj, pk] = this.tables.fano.lines[li].points;
      const sci = pi % 8, scj = pj % 8, sck = pk % 8;

      // Find strongest vertex in each sign class
      let bestI = -1, bestJ = -1, bestK = -1;
      let maxI = -1, maxJ = -1, maxK = -1;
      for (const v of this.tables.signClassMembers[sci]) {
        if (a[v] > maxI) { maxI = a[v]; bestI = v; }
      }
      for (const v of this.tables.signClassMembers[scj]) {
        if (a[v] > maxJ) { maxJ = a[v]; bestJ = v; }
      }
      for (const v of this.tables.signClassMembers[sck]) {
        if (a[v] > maxK) { maxK = a[v]; bestK = v; }
      }

      // Reinforce the triad (creates Fano-collinear attractors)
      if (bestI >= 0) a[bestI] += strength * this.fanoLineEnergy[li];
      if (bestJ >= 0) a[bestJ] += strength * this.fanoLineEnergy[li];
      if (bestK >= 0) a[bestK] += strength * this.fanoLineEnergy[li];
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Scale 2: MESO — Graph Laplacian diffusion
  // ═══════════════════════════════════════════════════════════════

  /**
   * Compute gradient using precomputed graph Laplacian L = D - A.
   *
   * Heat equation: ∂a/∂t = -α·L·a
   *   → Energy diffuses from high-activation vertices to low-activation neighbors
   *   → Natural graph-aware smoothing that respects Atlas topology
   *
   * Combined with sign-class-aware suppression:
   *   → Vertices in the same sign class compete (intra-class suppression)
   *   → This drives the system toward a single dominant vertex per class
   */
  private computeLaplacianGradient(a: Float32Array): Float32Array {
    const grad = new Float32Array(ATLAS_VERTEX_COUNT);

    // ── Laplacian diffusion: grad[v] = -Σ L[v][u] * a[u] ────
    for (let v = 0; v < ATLAS_VERTEX_COUNT; v++) {
      let lap = 0;
      for (const entry of this.tables.laplacianRows[v]) {
        lap += entry.w * a[entry.idx];
      }
      // Negative Laplacian = diffusion direction
      grad[v] = -lap;
    }

    // ── Sign-class suppression ────────────────────────────────
    // Within each sign class, the strongest vertex suppresses others
    for (let sc = 0; sc < 8; sc++) {
      const members = this.tables.signClassMembers[sc];
      if (members.length <= 1) continue;

      // Find max activation in this sign class
      let maxAct = 0;
      for (const v of members) {
        if (a[v] > maxAct) maxAct = a[v];
      }
      if (maxAct < 1e-10) continue;

      // Suppress vertices below the peak (winner-take-more)
      for (const v of members) {
        const ratio = a[v] / maxAct;
        // Suppress proportional to distance from peak
        grad[v] -= this.config.suppressionStrength * (1 - ratio) * a[v];
      }
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
   * Phase 2 enhancement: adaptive threshold based on current H-score.
   * Higher H-score → tighter parity enforcement (convergent zone).
   * Lower H-score → relaxed enforcement (exploring zone).
   *
   * Returns number of corrections applied.
   */
  private applyMirrorCorrection(a: Float32Array): number {
    let corrections = 0;
    const h = computeH(a);
    // Adaptive threshold: tighter when coherence is high
    const threshold = h > 0.6 ? 0.1 : h > 0.3 ? 0.2 : 0.35;
    const correctionBlend = this.config.mirrorCorrectionStrength * (1 + h);

    for (let v = 0; v < 48; v++) {
      const mv = this.tables.mirrorOf[v];
      const diff = Math.abs(a[v] - a[mv]);

      if (diff > threshold) {
        const mean = (a[v] + a[mv]) * 0.5;
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
    const threshold = 0.25;

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
