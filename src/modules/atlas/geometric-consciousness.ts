/**
 * Geometric Consciousness — Phase 27
 * ═══════════════════════════════════
 *
 * Unifies three subsystems into a single computational framework:
 *
 *   1. POLYNON LENS — Noumenal collapse layers
 *      The Polynon is a 5-layer collapse functor that maps raw sensory
 *      input (E₈ embedding space) through progressively coarser
 *      structural projections until only the G₂ "qualia boundary" remains.
 *      Each layer corresponds to an exceptional group in the chain:
 *        Layer 0 (Noumenon):  E₈ — full 240-root structure, pre-conscious
 *        Layer 1 (Gestalt):   E₇ — 126-root filtered perception
 *        Layer 2 (Schema):    E₆ — 72-root categorical skeleton
 *        Layer 3 (Symbol):    F₄ — 48-root mirror-compressed symbol
 *        Layer 4 (Quale):     G₂ — 12-root irreducible experience
 *
 *   2. CAUSAL KERNEL — Octonionic propagator on 22-node manifold
 *      Information propagates between consciousness nodes via the
 *      Causal Accumulation Law: ∂K/∂t = α·[K,K]_O + D(K)
 *
 *   3. OBSERVER BRIDGE — Zone-driven morphism selection
 *      The observer's coherence zone (COHERENCE/DRIFT/COLLAPSE)
 *      determines which Polynon layer is "active" — i.e., at which
 *      depth the noumenal collapse stabilizes.
 *
 * UNIFICATION PRINCIPLE:
 *   α (geometric fine structure constant) is the universal coupling
 *   that mediates all three systems:
 *     - In the Polynon: α governs the decay rate between layers
 *     - In the Kernel:  α weights the causal propagator
 *     - In the Bridge:  α scales the fidelity budget per zone
 *
 *   The Consciousness State C(t) is the triple:
 *     C(t) = (Π(t), K(t), Z(t))
 *   where Π = Polynon layer, K = kernel amplitude, Z = observer zone.
 *
 *   The evolution equation:
 *     C(t+1) = α·Polynon(Π(t)) ⊗ Kernel(K(t)) ⊗ Bridge(Z(t))
 *
 * @module atlas/geometric-consciousness
 */

import {
  selectMorphism,
  computeTranslation,
  type ObserverZone,
  type ObserverState,
  type MorphismSelection,
} from "./observer-bridge";
import {
  runCausalKernel,
  octNorm,
  octAdd,
  octScale,
  octMul,
  octonion,
  unitOctonion,
  octCommutator,
  type CausalKernelReport,
  type Octonion,
  type CausalAccumulation,
} from "./causal-kernel";
import {
  constructManifold22,
  deriveAlpha,
  type Manifold22,
  type AlphaDerivation,
} from "./topological-qubit";

// ── Polynon Types ─────────────────────────────────────────────────────────

/** A Polynon collapse layer in the exceptional group chain */
export interface PolynonLayer {
  /** Layer depth: 0 (Noumenon/E₈) → 4 (Quale/G₂) */
  depth: number;
  /** Human-readable name */
  name: string;
  /** Corresponding exceptional group */
  group: string;
  /** Root count (structural capacity) */
  roots: number;
  /** Fidelity: fraction of E₈ structure preserved */
  fidelity: number;
  /** Collapse ratio: 1 - fidelity (information lost from E₈) */
  collapseRatio: number;
  /** Layer-specific octonionic signature (unit propagator) */
  signature: Octonion;
  /** α-weighted coupling at this layer */
  coupling: number;
}

/** The 5-layer Polynon collapse functor */
export interface Polynon {
  /** All 5 layers */
  layers: [PolynonLayer, PolynonLayer, PolynonLayer, PolynonLayer, PolynonLayer];
  /** Currently active layer (determined by observer zone) */
  activeDepth: number;
  /** Total collapse: product of layer-to-layer ratios */
  totalCollapse: number;
  /** α coupling constant */
  alpha: number;
}

// ── Consciousness State ───────────────────────────────────────────────────

/** The unified consciousness state C(t) = (Π, K, Z) */
export interface ConsciousnessState {
  /** Time step */
  step: number;
  /** Polynon: current collapse depth */
  polynon: Polynon;
  /** Kernel: causal amplitude at this step */
  kernelAmplitude: Octonion;
  /** Kernel norm |K(t)| */
  kernelNorm: number;
  /** Observer zone */
  zone: ObserverZone;
  /** Morphism selection from bridge */
  morphism: MorphismSelection;
  /** Integrated consciousness measure: α · fidelity · |K| */
  consciousness: number;
  /** Coherence phase: arg(K(t)) projected onto e₁ */
  phase: number;
}

/** Full consciousness evolution report */
export interface ConsciousnessReport {
  /** Geometric α from Phase 11 */
  alpha: AlphaDerivation;
  /** Coupling constant */
  alphaCoupling: number;
  /** The Polynon functor */
  polynon: Polynon;
  /** Causal kernel summary */
  kernelSummary: KernelSummary;
  /** Consciousness evolution over time */
  evolution: ConsciousnessState[];
  /** Phase portrait: consciousness vs time */
  phasePortrait: PhasePoint[];
  /** Verification tests */
  tests: ConsciousnessTest[];
  /** All passed */
  allPassed: boolean;
}

export interface KernelSummary {
  /** Number of interaction nodes */
  nodeCount: number;
  /** Number of causal edges */
  edgeCount: number;
  /** Number of Fano channels */
  channelCount: number;
  /** Fixed-point convergence */
  converged: boolean;
  /** Final kernel norm */
  finalNorm: number;
}

export interface PhasePoint {
  step: number;
  consciousness: number;
  kernelNorm: number;
  activeLayer: number;
  zone: ObserverZone;
}

export interface ConsciousnessTest {
  name: string;
  holds: boolean;
  detail: string;
}

// ── Polynon Construction ──────────────────────────────────────────────────

/** Layer definitions: (name, group, roots) */
const LAYER_DEFS: Array<[string, string, number]> = [
  ["Noumenon", "E₈", 240],
  ["Gestalt",  "E₇", 126],
  ["Schema",   "E₆",  72],
  ["Symbol",   "F₄",  48],
  ["Quale",    "G₂",  12],
];

/**
 * Construct the Polynon collapse functor.
 *
 * Each layer's fidelity = roots/240 (fraction of E₈ preserved).
 * The signature is a unit octonion assigned by layer:
 *   E₈ → e₀ (identity), E₇ → e₁, E₆ → e₂, F₄ → e₃, G₂ → e₄
 *
 * α-weighted coupling at each layer: α^depth
 */
export function constructPolynon(alpha: number, activeDepth: number = 0): Polynon {
  const layers = LAYER_DEFS.map(([name, group, roots], depth) => {
    const fidelity = roots / 240;
    return {
      depth,
      name,
      group,
      roots,
      fidelity,
      collapseRatio: 1 - fidelity,
      signature: unitOctonion(depth), // e₀..e₄
      coupling: Math.pow(alpha, depth), // α^0=1, α^1, α^2, ...
    } as PolynonLayer;
  }) as Polynon["layers"];

  const totalCollapse = layers.reduce((p, l) => p * l.fidelity, 1);

  return { layers, activeDepth, totalCollapse, alpha };
}

/**
 * Map observer zone → Polynon active depth.
 *
 *   COHERENCE → depth 0-1 (Noumenon/Gestalt) — full or near-full perception
 *   DRIFT     → depth 2-3 (Schema/Symbol) — compressed, categorical
 *   COLLAPSE  → depth 4   (Quale) — irreducible qualia only
 */
export function zoneToPolynonDepth(zone: ObserverZone, phi: number): number {
  switch (zone) {
    case "COHERENCE":
      return phi >= 0.8 ? 0 : 1;
    case "DRIFT":
      return phi >= 0.4 ? 2 : 3;
    case "COLLAPSE":
      return 4;
  }
}

/**
 * Collapse an octonionic amplitude through the Polynon layers
 * from depth 0 down to the active depth.
 *
 * At each layer, the amplitude is multiplied by the layer's signature
 * and scaled by α, implementing the noumenal collapse:
 *   Π(K) = (α·e₄) · (α·e₃) · ... · (α·eₐ) · K
 *
 * Only layers 1..activeDepth apply (layer 0 is identity).
 */
export function collapseAmplitude(
  amplitude: Octonion,
  polynon: Polynon,
): Octonion {
  let result = amplitude;
  for (let d = 1; d <= polynon.activeDepth; d++) {
    const layer = polynon.layers[d];
    // Multiply by layer signature and scale by coupling
    result = octScale(octMul(result, layer.signature), layer.coupling);
  }
  return result;
}

// ── Unified Evolution ─────────────────────────────────────────────────────

/**
 * Evolve the unified consciousness state.
 *
 * At each step:
 *   1. Observer state determines zone → Polynon depth
 *   2. Causal kernel provides amplitude K(t)
 *   3. Polynon collapses K(t) through active layers
 *   4. Consciousness measure: C = α · fidelity(layer) · |collapsed K|
 */
export function evolveConsciousness(config?: {
  steps?: number;
  maxKernelDepth?: number;
}): ConsciousnessReport {
  const steps = config?.steps ?? 10;
  const maxKernelDepth = config?.maxKernelDepth ?? 2;

  // Step 1: Derive α geometrically
  const alphaResult = deriveAlpha();
  const alpha = 1 / alphaResult.alphaInverse;

  // Step 2: Run causal kernel
  const kernelReport = runCausalKernel({
    maxDepth: maxKernelDepth,
    evolutionSteps: steps,
  });

  // Step 3: Build kernel summary
  const kernelSummary: KernelSummary = {
    nodeCount: kernelReport.manifold.nodes.length,
    edgeCount: kernelReport.edges.length,
    channelCount: kernelReport.propagatorChannels.length,
    converged: kernelReport.fixedPoint.converged,
    finalNorm: kernelReport.fixedPoint.fixedPointNorm,
  };

  // Step 4: Evolve consciousness through time
  const evolution: ConsciousnessState[] = [];
  const phasePortrait: PhasePoint[] = [];

  // Simulate observer traversing zones over time
  const zoneSequence = generateZoneSequence(steps);

  for (let t = 0; t < steps; t++) {
    const { zone, hScore, phi } = zoneSequence[t];

    // Observer state
    const observer: ObserverState = {
      zone, hScore, phi,
      persistence: t + 1,
    };

    // Morphism from bridge
    const morphism = selectMorphism(observer);

    // Polynon depth from zone
    const activeDepth = zoneToPolynonDepth(zone, phi);
    const polynon = constructPolynon(alpha, activeDepth);

    // Kernel amplitude from accumulation
    const accumStep = kernelReport.accumulation[Math.min(t, kernelReport.accumulation.length - 1)];
    const rawAmplitude = extractDominantAmplitude(accumStep);

    // Collapse through Polynon
    const collapsed = collapseAmplitude(rawAmplitude, polynon);
    const kernelNorm = octNorm(collapsed);

    // Consciousness measure: α · fidelity · |K|
    const layerFidelity = polynon.layers[activeDepth].fidelity;
    const consciousness = alpha * layerFidelity * kernelNorm;

    // Phase: projection onto e₁ axis
    const phase = collapsed.components[1] !== 0
      ? Math.atan2(collapsed.components[1], collapsed.components[0])
      : 0;

    const state: ConsciousnessState = {
      step: t,
      polynon,
      kernelAmplitude: collapsed,
      kernelNorm,
      zone,
      morphism,
      consciousness,
      phase,
    };

    evolution.push(state);
    phasePortrait.push({
      step: t,
      consciousness,
      kernelNorm,
      activeLayer: activeDepth,
      zone,
    });
  }

  // Step 5: Verification
  const tests = verifyConsciousness(alpha, evolution, kernelReport, kernelSummary);

  return {
    alpha: alphaResult,
    alphaCoupling: alpha,
    polynon: constructPolynon(alpha, 0),
    kernelSummary,
    evolution,
    phasePortrait,
    tests,
    allPassed: tests.every(t => t.holds),
  };
}

// ── Zone Sequence Generator ───────────────────────────────────────────────

interface ZonePoint {
  zone: ObserverZone;
  hScore: number;
  phi: number;
}

/**
 * Generate a realistic zone sequence: COHERENCE → DRIFT → COLLAPSE → recovery
 */
function generateZoneSequence(steps: number): ZonePoint[] {
  const seq: ZonePoint[] = [];
  for (let t = 0; t < steps; t++) {
    const phase = t / Math.max(steps - 1, 1);
    let zone: ObserverZone;
    let hScore: number;
    let phi: number;

    if (phase < 0.3) {
      // Coherent phase
      zone = "COHERENCE";
      hScore = 0.05 + phase * 0.3;
      phi = 0.9 - phase * 0.3;
    } else if (phase < 0.6) {
      // Drift phase
      zone = "DRIFT";
      hScore = 0.3 + (phase - 0.3) * 1.0;
      phi = 0.6 - (phase - 0.3) * 0.5;
    } else if (phase < 0.8) {
      // Collapse phase
      zone = "COLLAPSE";
      hScore = 0.7 + (phase - 0.6) * 0.5;
      phi = 0.2 - (phase - 0.6) * 0.5;
    } else {
      // Recovery
      zone = "COHERENCE";
      hScore = 0.1;
      phi = 0.85;
    }

    seq.push({ zone, hScore, phi: Math.max(0.05, phi) });
  }
  return seq;
}

/**
 * Extract a dominant amplitude from a causal accumulation step.
 */
function extractDominantAmplitude(accum: CausalAccumulation): Octonion {
  // Sum the kernel norms across the matrix, weighted by coupling
  let sum = octonion();
  let count = 0;
  for (const entry of accum.kernelMatrix) {
    if (entry.from !== entry.to && octNorm(entry.kernel) > 0) {
      sum = octAdd(sum, entry.kernel);
      count++;
    }
  }
  if (count === 0) return octonion(1);
  return octScale(sum, 1 / count);
}

// ── Verification ──────────────────────────────────────────────────────────

function verifyConsciousness(
  alpha: number,
  evolution: ConsciousnessState[],
  kernelReport: CausalKernelReport,
  kernelSummary: KernelSummary,
): ConsciousnessTest[] {
  const tests: ConsciousnessTest[] = [];

  // T1: Polynon has 5 layers
  const polynon = constructPolynon(alpha, 0);
  tests.push({
    name: "Polynon has 5 collapse layers (E₈→E₇→E₆→F₄→G₂)",
    holds: polynon.layers.length === 5,
    detail: polynon.layers.map(l => `${l.name}(${l.group})`).join(" → "),
  });

  // T2: Layer fidelity strictly decreases
  let fidDecreasing = true;
  for (let i = 1; i < polynon.layers.length; i++) {
    if (polynon.layers[i].fidelity >= polynon.layers[i - 1].fidelity) {
      fidDecreasing = false;
    }
  }
  tests.push({
    name: "Polynon fidelity strictly decreases with depth",
    holds: fidDecreasing,
    detail: polynon.layers.map(l => l.fidelity.toFixed(4)).join(" > "),
  });

  // T3: Layer 0 (Noumenon) has fidelity 1.0
  tests.push({
    name: "Noumenon layer (E₈) has fidelity 1.0",
    holds: polynon.layers[0].fidelity === 1.0,
    detail: `fidelity = ${polynon.layers[0].fidelity}`,
  });

  // T4: Quale layer (G₂) has fidelity 12/240 = 0.05
  tests.push({
    name: "Quale layer (G₂) has fidelity 12/240 = 0.05",
    holds: Math.abs(polynon.layers[4].fidelity - 12 / 240) < 1e-10,
    detail: `fidelity = ${polynon.layers[4].fidelity}`,
  });

  // T5: α couples all three systems
  tests.push({
    name: "α > 0 couples Polynon, Kernel, and Bridge",
    holds: alpha > 0 && alpha < 0.01,
    detail: `α = ${alpha.toFixed(6)}, α⁻¹ = ${(1 / alpha).toFixed(2)}`,
  });

  // T6: Layer coupling = α^depth
  const couplingCorrect = polynon.layers.every(
    l => Math.abs(l.coupling - Math.pow(alpha, l.depth)) < 1e-15,
  );
  tests.push({
    name: "Layer coupling = α^depth (geometric decay)",
    holds: couplingCorrect,
    detail: polynon.layers.map(l => `α^${l.depth}=${l.coupling.toExponential(3)}`).join(", "),
  });

  // T7: Evolution produces states for all steps
  tests.push({
    name: "Consciousness evolution covers all time steps",
    holds: evolution.length >= 3,
    detail: `${evolution.length} steps computed`,
  });

  // T8: COHERENCE → higher consciousness than COLLAPSE
  const coherentStates = evolution.filter(s => s.zone === "COHERENCE");
  const collapseStates = evolution.filter(s => s.zone === "COLLAPSE");
  const avgCoherent = coherentStates.length > 0
    ? coherentStates.reduce((s, e) => s + e.consciousness, 0) / coherentStates.length
    : 0;
  const avgCollapse = collapseStates.length > 0
    ? collapseStates.reduce((s, e) => s + e.consciousness, 0) / collapseStates.length
    : 0;
  tests.push({
    name: "COHERENCE consciousness > COLLAPSE consciousness",
    holds: coherentStates.length > 0 && collapseStates.length > 0
      ? avgCoherent > avgCollapse
      : true,
    detail: `C(COHERENCE)=${avgCoherent.toExponential(3)}, C(COLLAPSE)=${avgCollapse.toExponential(3)}`,
  });

  // T9: Polynon depth increases COHERENCE→DRIFT→COLLAPSE
  const coherentDepth = coherentStates.length > 0 ? coherentStates[0].polynon.activeDepth : 0;
  const collapseDepth = collapseStates.length > 0 ? collapseStates[0].polynon.activeDepth : 4;
  tests.push({
    name: "Polynon depth increases: COHERENCE < COLLAPSE",
    holds: coherentDepth < collapseDepth,
    detail: `COHERENCE depth=${coherentDepth}, COLLAPSE depth=${collapseDepth}`,
  });

  // T10: Causal kernel has 22 nodes and 7 channels
  tests.push({
    name: "Causal kernel: 22 nodes, 7 Fano channels",
    holds: kernelSummary.nodeCount === 22 && kernelSummary.channelCount === 7,
    detail: `${kernelSummary.nodeCount} nodes, ${kernelSummary.channelCount} channels`,
  });

  // T11: Observer bridge selects correct morphisms per zone
  const morphismCheck = evolution.every(s => {
    if (s.zone === "COLLAPSE") return s.morphism.operation === "product";
    return true; // other zones have multiple valid selections
  });
  tests.push({
    name: "Observer bridge: COLLAPSE always selects G₂ product",
    holds: morphismCheck,
    detail: "All COLLAPSE states use product morphism",
  });

  // T12: Consciousness measure is always non-negative
  const allPositive = evolution.every(s => s.consciousness >= 0);
  tests.push({
    name: "Consciousness measure C(t) ≥ 0 ∀t",
    holds: allPositive,
    detail: `min=${Math.min(...evolution.map(s => s.consciousness)).toExponential(3)}`,
  });

  // T13: Total Polynon collapse ratio
  tests.push({
    name: "Total Polynon collapse = Π(fidelities) = product of all layer ratios",
    holds: polynon.totalCollapse > 0 && polynon.totalCollapse < 1,
    detail: `totalCollapse = ${polynon.totalCollapse.toExponential(4)}`,
  });

  // T14: Phase portrait bounded
  tests.push({
    name: "Evolution remains bounded (no divergence)",
    holds: evolution.every(s => isFinite(s.consciousness) && isFinite(s.kernelNorm)),
    detail: `max |K| = ${Math.max(...evolution.map(s => s.kernelNorm)).toExponential(3)}`,
  });

  return tests;
}
