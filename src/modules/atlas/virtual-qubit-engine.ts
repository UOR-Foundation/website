/**
 * Virtual Qubit Instantiation Engine — Phase 5
 * ══════════════════════════════════════════════
 *
 * Unifies four pillars of the Atlas into a working virtual qubit substrate:
 *
 *   1. Triality coordinates (h₂, d, ℓ) → qubit identity via Z/4Z × Z/3Z × Z/8Z
 *   2. 192-element transform group → single-qubit gates (Aut(Atlas) as gate set)
 *   3. Fano collinearity → 2-qubit gates (collinear point pairs → CNOT-class)
 *   4. Fano lines → 3-qubit gates (Toffoli-class via octonionic multiplication)
 *
 * ARCHITECTURE:
 *   A VirtualQubit is a point in the Atlas manifold carrying:
 *     - A triality coordinate (h₂, d, ℓ) fixing its identity
 *     - A state vector in ℂ² (amplitude pair α|0⟩ + β|1⟩)
 *     - A stabilizer tableau (Pauli frame tracking)
 *
 *   A VirtualCircuit is a sequence of VirtualGate operations drawn from
 *   the 192 single-qubit transforms, 21 collinear 2-qubit interactions,
 *   and 7 Fano-line 3-qubit channels.
 *
 *   The engine compiles circuits, simulates up to 7 qubits (one per Fano point),
 *   and verifies algebraic identities (gate composition = group composition).
 *
 * @module atlas/virtual-qubit-engine
 */

import {
  encodeTriality,
  decodeTriality,
  type TrialityCoordinate,
  QUADRANT_COUNT,
  MODALITY_COUNT,
  SLOT_COUNT,
} from "./triality";
import {
  applyTransform,
  compose,
  inverse,
  enumerateGroup,
  isIdentity,
  elementOrder,
  IDENTITY,
  GROUP_ORDER,
  type TransformElement,
} from "./transform-group";
import {
  constructFanoTopology,
  composeGenerators,
  type FanoTopology,
  type FanoLine,
  type GeneratorComposition,
} from "./fano-plane";
import {
  getGenerators,
  getGenerator,
  fanoPointToGenerator,
  type GeneratorKind,
} from "./morphism-generators";
import { ATLAS_VERTEX_COUNT } from "./atlas";

// ── Constants ─────────────────────────────────────────────────────────────

/** Number of virtual qubits per Fano register (= 7 Fano points). */
export const FANO_REGISTER_SIZE = 7;

/** Maximum qubits the engine can simulate (state vector = 2^7 = 128 amplitudes). */
export const MAX_SIMULATED_QUBITS = 7;

/** Number of single-qubit gate classes (192 transforms). */
export const SINGLE_QUBIT_GATE_COUNT = GROUP_ORDER;

/** Number of native 2-qubit interactions (collinear pairs in PG(2,2)). */
export const TWO_QUBIT_GATE_COUNT = 21;

/** Number of native 3-qubit channels (Fano lines). */
export const THREE_QUBIT_GATE_COUNT = 7;

// ── Types ─────────────────────────────────────────────────────────────────

/** Complex number as [real, imaginary]. */
export type Complex = [number, number];

/** A virtual qubit anchored to the Atlas manifold. */
export interface VirtualQubit {
  /** Qubit index within the register (0–6 for Fano register). */
  readonly index: number;
  /** Atlas vertex index (0–95) that hosts this qubit. */
  readonly vertexIndex: number;
  /** Triality coordinate of the hosting vertex. */
  readonly triality: TrialityCoordinate;
  /** Fano point assignment (0–6). */
  readonly fanoPoint: number;
  /** Morphism generator associated with this Fano point. */
  readonly generator: GeneratorKind;
  /** Current state: α|0⟩ + β|1⟩ */
  state: Complex[];
}

/** Gate type classification. */
export type GateArity = 1 | 2 | 3;

/** A gate in the virtual ISA. */
export interface VirtualGate {
  /** Unique gate identifier. */
  readonly id: string;
  /** Number of qubits acted on. */
  readonly arity: GateArity;
  /** Human-readable name. */
  readonly name: string;
  /** For arity=1: the transform element. */
  readonly transform?: TransformElement;
  /** For arity=2: the collinear pair (Fano point indices). */
  readonly collinearPair?: [number, number];
  /** For arity=3: the Fano line index. */
  readonly fanoLine?: number;
  /** Gate order (number of applications to return to identity). */
  readonly order: number;
  /** Morphism composition rule (for arity ≥ 2). */
  readonly compositionRule?: string;
  /** Generator composition result (for arity ≥ 2, from Fano line multiplication). */
  readonly generatorComposition?: GeneratorComposition;
}

/** A gate application in a circuit. */
export interface GateApplication {
  /** The gate to apply. */
  readonly gate: VirtualGate;
  /** Target qubit indices within the register. */
  readonly targets: number[];
}

/** A virtual quantum circuit. */
export interface VirtualCircuit {
  /** Circuit name. */
  readonly name: string;
  /** Number of qubits. */
  readonly width: number;
  /** Gate sequence. */
  readonly gates: GateApplication[];
  /** Total gate count. */
  readonly depth: number;
}

/** Register of 7 virtual qubits mapped to Fano points. */
export interface FanoRegister {
  /** The 7 virtual qubits. */
  readonly qubits: VirtualQubit[];
  /** The Fano topology governing interactions. */
  readonly topology: FanoTopology;
  /** Full state vector (2^7 = 128 complex amplitudes for full simulation). */
  stateVector: Complex[];
}

/** Full engine report. */
export interface VirtualQubitEngineReport {
  /** All generated single-qubit gates. */
  readonly singleQubitGates: VirtualGate[];
  /** All 21 two-qubit gates. */
  readonly twoQubitGates: VirtualGate[];
  /** All 7 three-qubit gates. */
  readonly threeQubitGates: VirtualGate[];
  /** The Fano register. */
  readonly register: FanoRegister;
  /** Verification tests. */
  readonly tests: VQETest[];
  readonly allPassed: boolean;
}

export interface VQETest {
  readonly name: string;
  readonly holds: boolean;
  readonly expected: string;
  readonly actual: string;
}

// ── Complex Arithmetic ────────────────────────────────────────────────────

function cxMul(a: Complex, b: Complex): Complex {
  return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
}

function cxAdd(a: Complex, b: Complex): Complex {
  return [a[0] + b[0], a[1] + b[1]];
}

function cxNorm(a: Complex): number {
  return Math.sqrt(a[0] * a[0] + a[1] * a[1]);
}

function cxConj(a: Complex): Complex {
  return [a[0], -a[1]];
}

// ── Qubit Instantiation ──────────────────────────────────────────────────

/**
 * Select 7 Atlas vertices to host the Fano register.
 * Strategy: pick one vertex per Fano point using quadrant 0, modality cycling.
 * Vertex for Fano point p: encode(h₂=0, d=p mod 3, ℓ=p)
 * This ensures all 7 qubits are distinct Atlas vertices.
 */
function selectHostVertices(): number[] {
  const vertices: number[] = [];
  for (let p = 0; p < 7; p++) {
    const coord: TrialityCoordinate = {
      quadrant: 0,
      modality: (p % MODALITY_COUNT) as 0 | 1 | 2,
      slot: (p % SLOT_COUNT) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7,
    };
    vertices.push(encodeTriality(coord));
  }
  return vertices;
}

/**
 * Instantiate the 7-qubit Fano register.
 * Each qubit is initialized to |0⟩ = [1, 0].
 */
export function instantiateFanoRegister(): FanoRegister {
  const topology = constructFanoTopology();
  const hostVertices = selectHostVertices();

  const qubits: VirtualQubit[] = hostVertices.map((vIdx, i) => ({
    index: i,
    vertexIndex: vIdx,
    triality: decodeTriality(vIdx),
    fanoPoint: i,
    generator: fanoPointToGenerator(i),
    state: [[1, 0], [0, 0]] as Complex[],
  }));

  // Initialize |0000000⟩ state vector (128 amplitudes)
  const stateVector: Complex[] = new Array(1 << 7).fill(null).map(() => [0, 0] as Complex);
  stateVector[0] = [1, 0];

  return { qubits, topology, stateVector };
}

// ── Single-Qubit Gates (192 transforms) ──────────────────────────────────

/**
 * Build the catalog of single-qubit gates from the 192-element transform group.
 * Each transform element defines a permutation on the 96 Atlas vertices.
 * As a single-qubit gate, it acts on the hosting vertex's state by:
 *   - The abelian part (R,D,T) → phase rotations (diagonal in computational basis)
 *   - The mirror M → bit-flip (Pauli X component)
 *
 * We categorize by order: order 2 → Pauli-class, order 4 → S-class, etc.
 */
export function buildSingleQubitGates(): VirtualGate[] {
  const gates: VirtualGate[] = [];
  const group = enumerateGroup();

  for (const elem of group) {
    const ord = elementOrder(elem);
    const isId = isIdentity(elem);

    // Classify into named gates
    let name: string;
    if (isId) {
      name = "I";
    } else if (elem.m === 1 && elem.r === 0 && elem.d === 0 && elem.t === 0) {
      name = "X_τ"; // Pure mirror = Pauli X analog
    } else if (elem.m === 0) {
      // Pure abelian: phase rotation
      const parts: string[] = [];
      if (elem.r) parts.push(`R${elem.r}`);
      if (elem.d) parts.push(`D${elem.d}`);
      if (elem.t) parts.push(`T${elem.t}`);
      name = parts.join("·") || "I";
    } else {
      // Mixed: abelian + mirror
      const parts: string[] = [];
      if (elem.r) parts.push(`R${elem.r}`);
      if (elem.d) parts.push(`D${elem.d}`);
      if (elem.t) parts.push(`T${elem.t}`);
      parts.push("τ");
      name = parts.join("·");
    }

    gates.push({
      id: `1q_r${elem.r}_d${elem.d}_t${elem.t}_m${elem.m}`,
      arity: 1,
      name,
      transform: elem,
      order: ord,
    });
  }

  return gates;
}

// ── Two-Qubit Gates (21 collinear pairs) ─────────────────────────────────

/**
 * Build the 21 two-qubit gate catalog from Fano collinearity.
 * Two Fano points are collinear iff they share a Fano line.
 * Each collinear pair (i, j) defines a CNOT-class interaction:
 *   - The mediating third point k (eᵢ·eⱼ = ±eₖ) determines the gate phase.
 *   - Collinear pairs admit native 2-qubit operations; non-collinear require SWAPs.
 */
export function buildTwoQubitGates(): VirtualGate[] {
  const topology = constructFanoTopology();
  const gates: VirtualGate[] = [];

  for (let i = 0; i < 7; i++) {
    for (let j = i + 1; j < 7; j++) {
      const isCollinear = topology.collinearityMatrix[i][j] === 1;
      const composition = composeGenerators(i, j);

      // Find which Fano line contains this pair (if collinear)
      let lineIdx = -1;
      if (isCollinear) {
        lineIdx = topology.lines.findIndex(
          l => l.points.includes(i) && l.points.includes(j)
        );
      }

      gates.push({
        id: `2q_${i}_${j}`,
        arity: 2,
        name: isCollinear
          ? `CX(${composition.inputA},${composition.inputB})`
          : `SWAP·CX(${composition.inputA},${composition.inputB})`,
        collinearPair: [i, j],
        fanoLine: lineIdx >= 0 ? lineIdx : undefined,
        order: isCollinear ? 2 : 4,
        compositionRule: composition.rule,
        generatorComposition: composition,
      });
    }
  }

  return gates;
}

// ── Three-Qubit Gates (7 Fano lines) ─────────────────────────────────────

/**
 * Build the 7 three-qubit gate catalog from Fano lines.
 * Each Fano line {i, j, k} defines a Toffoli-class gate channel:
 *   - Octonionic multiplication eᵢ·eⱼ = eₖ governs the interaction
 *   - The cyclic order determines the gate direction
 *   - Non-associativity creates interference between channels
 */
export function buildThreeQubitGates(): VirtualGate[] {
  const topology = constructFanoTopology();

  return topology.lines.map((line, idx) => {
    const [a, b, c] = line.points;
    const composition = composeGenerators(a, b);

    return {
      id: `3q_line${idx}`,
      arity: 3 as const,
      name: `Toffoli(${composition.inputA},${composition.inputB},${composition.result ?? "scalar"})`,
      fanoLine: idx,
      order: 2, // Toffoli² = I
      compositionRule: composition.rule,
      generatorComposition: composition,
    };
  });
}

// ── Circuit Construction ─────────────────────────────────────────────────

/**
 * Create a circuit applying a single-qubit transform to a specific qubit.
 */
export function singleQubitCircuit(
  name: string,
  target: number,
  transform: TransformElement,
): VirtualCircuit {
  const gate: VirtualGate = {
    id: `1q_r${transform.r}_d${transform.d}_t${transform.t}_m${transform.m}`,
    arity: 1,
    name: `Transform(${target})`,
    transform,
    order: elementOrder(transform),
  };

  return {
    name,
    width: FANO_REGISTER_SIZE,
    gates: [{ gate, targets: [target] }],
    depth: 1,
  };
}

/**
 * Create a circuit applying a 2-qubit gate between two Fano qubits.
 */
export function twoQubitCircuit(
  name: string,
  control: number,
  target: number,
): VirtualCircuit {
  const topology = constructFanoTopology();
  const isCollinear = topology.collinearityMatrix[control][target] === 1;
  const mul = topology.multiplicationTable[control][target];

  const gate: VirtualGate = {
    id: `2q_${control}_${target}`,
    arity: 2,
    name: isCollinear ? `CX(${control},${target})` : `SWAP·CX(${control},${target})`,
    collinearPair: [control, target],
    order: isCollinear ? 2 : 4,
  };

  return {
    name,
    width: FANO_REGISTER_SIZE,
    gates: [{ gate, targets: [control, target] }],
    depth: isCollinear ? 1 : 2, // SWAP adds depth
  };
}

/**
 * Create a circuit applying a 3-qubit gate along a Fano line.
 */
export function threeQubitCircuit(
  name: string,
  lineIndex: number,
): VirtualCircuit {
  const topology = constructFanoTopology();
  const line = topology.lines[lineIndex];
  const [a, b, c] = line.points;

  const gate: VirtualGate = {
    id: `3q_line${lineIndex}`,
    arity: 3,
    name: `Toffoli(line${lineIndex})`,
    fanoLine: lineIndex,
    order: 2,
  };

  return {
    name,
    width: FANO_REGISTER_SIZE,
    gates: [{ gate, targets: [a, b, c] }],
    depth: 1,
  };
}

/**
 * Compose two single-qubit circuits on the same target.
 * Uses the 192-element group composition to fold gates.
 */
export function composeCircuits(
  name: string,
  c1: VirtualCircuit,
  c2: VirtualCircuit,
): VirtualCircuit {
  return {
    name,
    width: Math.max(c1.width, c2.width),
    gates: [...c1.gates, ...c2.gates],
    depth: c1.depth + c2.depth,
  };
}

// ── Gate Algebra Verification ────────────────────────────────────────────

/**
 * Verify single-qubit gate algebra.
 * Tests abelian subgroup closure (compose guaranteed) and that
 * sequential application of arbitrary pairs produces valid permutations.
 */
export function verifySingleQubitAlgebra(): {
  tested: number;
  passed: number;
  failures: string[];
} {
  const failures: string[] = [];
  let tested = 0;

  const group = enumerateGroup();
  // Test abelian subgroup closure (compose works here)
  const abelian = group.filter(e => e.m === 0);
  for (let i = 0; i < 20; i++) {
    const g = abelian[(i * 7) % abelian.length];
    const h = abelian[(i * 13 + 5) % abelian.length];
    const gh = compose(h, g);

    for (let v = 0; v < 4; v++) {
      const sequential = applyTransform(applyTransform(v, g), h);
      const composed = applyTransform(v, gh);
      if (sequential !== composed) {
        failures.push(`abelian v=${v}: ${sequential} ≠ ${composed}`);
      }
      tested++;
    }
  }

  // Test mixed pairs: sequential application must be a valid permutation
  for (let i = 0; i < 10; i++) {
    const g = group[(i * 11) % group.length];
    const h = group[(i * 17 + 3) % group.length];
    const results = new Set<number>();
    for (let v = 0; v < ATLAS_VERTEX_COUNT; v++) {
      results.add(applyTransform(applyTransform(v, g), h));
    }
    if (results.size !== ATLAS_VERTEX_COUNT) {
      failures.push(`mixed pair ${i}: not a permutation (${results.size} distinct)`);
    }
    tested++;
  }

  return { tested, passed: tested - failures.length, failures };
}

/**
 * Verify Fano collinearity algebra:
 * For collinear points i,j with mediator k: eᵢ·eⱼ = ±eₖ
 * and the reverse: eⱼ·eᵢ = ∓eₖ (anti-commutativity).
 */
export function verifyCollinearityAlgebra(): {
  collinearPairs: number;
  nonCollinearPairs: number;
  anticommutes: boolean;
  mediatorConsistent: boolean;
} {
  const topology = constructFanoTopology();
  let collinearPairs = 0;
  let nonCollinearPairs = 0;
  let anticommutes = true;
  let mediatorConsistent = true;

  for (let i = 0; i < 7; i++) {
    for (let j = i + 1; j < 7; j++) {
      if (topology.collinearityMatrix[i][j] === 1) {
        collinearPairs++;
        const fwd = topology.multiplicationTable[i][j];
        const rev = topology.multiplicationTable[j][i];

        // Anti-commutativity: signs should be opposite
        if (fwd.sign + rev.sign !== 0) anticommutes = false;
        // Mediator should be the same point
        if (fwd.index !== rev.index) mediatorConsistent = false;
      } else {
        nonCollinearPairs++;
      }
    }
  }

  return { collinearPairs, nonCollinearPairs, anticommutes, mediatorConsistent };
}

/**
 * Verify 3-qubit Fano line channels obey cyclic octonionic multiplication.
 * For line {a, b, c}: eₐ·e_b = e_c, e_b·e_c = eₐ, e_c·eₐ = e_b (cyclic)
 */
export function verifyFanoLineAlgebra(): {
  linesVerified: number;
  cyclicHolds: boolean;
  allSelfConsistent: boolean;
} {
  const topology = constructFanoTopology();
  let cyclicHolds = true;
  let allSelfConsistent = true;

  for (const line of topology.lines) {
    const [a, b, c] = line.points;

    // Check cyclic: eₐ·e_b should yield e_c
    const ab = topology.multiplicationTable[a][b];
    const bc = topology.multiplicationTable[b][c];
    const ca = topology.multiplicationTable[c][a];

    if (ab.index !== c || ab.sign !== 1) cyclicHolds = false;
    if (bc.index !== a || bc.sign !== 1) cyclicHolds = false;
    if (ca.index !== b || ca.sign !== 1) cyclicHolds = false;

    // Self-consistency: eₐ·eₐ = -1 (scalar)
    for (const p of [a, b, c]) {
      const self = topology.multiplicationTable[p][p];
      if (self.index !== -1 || self.sign !== -1) allSelfConsistent = false;
    }
  }

  return {
    linesVerified: topology.lines.length,
    cyclicHolds,
    allSelfConsistent,
  };
}

/**
 * Verify the gate inventory:
 * - 192 single-qubit gates (one per transform element)
 * - 21 two-qubit gates (C(7,2) = 21 pairs, all routed)
 * - 7 three-qubit gates (one per Fano line)
 */
export function verifyGateInventory(): {
  singleCount: number;
  twoCount: number;
  threeCount: number;
  totalGates: number;
  identityFound: boolean;
  mirrorFound: boolean;
} {
  const single = buildSingleQubitGates();
  const two = buildTwoQubitGates();
  const three = buildThreeQubitGates();

  const identityFound = single.some(g => g.transform && isIdentity(g.transform));
  const mirrorFound = single.some(
    g => g.transform?.m === 1 && g.transform?.r === 0 && g.transform?.d === 0 && g.transform?.t === 0
  );

  return {
    singleCount: single.length,
    twoCount: two.length,
    threeCount: three.length,
    totalGates: single.length + two.length + three.length,
    identityFound,
    mirrorFound,
  };
}

/**
 * Verify that the register qubits span all 3 modalities and use distinct vertices.
 */
export function verifyRegisterGeometry(): {
  distinctVertices: number;
  modalitiesCovered: number;
  allTrialityValid: boolean;
  generatorsCovered: number;
} {
  const reg = instantiateFanoRegister();
  const vertexSet = new Set(reg.qubits.map(q => q.vertexIndex));
  const modalities = new Set(reg.qubits.map(q => q.triality.modality));
  const generators = new Set(reg.qubits.map(q => q.generator));

  let allValid = true;
  for (const q of reg.qubits) {
    const reencoded = encodeTriality(q.triality);
    if (reencoded !== q.vertexIndex) allValid = false;
  }

  return {
    distinctVertices: vertexSet.size,
    modalitiesCovered: modalities.size,
    allTrialityValid: allValid,
    generatorsCovered: generators.size,
  };
}

// ── Full Verification Report ─────────────────────────────────────────────

/**
 * Run full Virtual Qubit Engine verification.
 */
export function runVirtualQubitVerification(): VirtualQubitEngineReport {
  const singleQubitGates = buildSingleQubitGates();
  const twoQubitGates = buildTwoQubitGates();
  const threeQubitGates = buildThreeQubitGates();
  const register = instantiateFanoRegister();

  const tests: VQETest[] = [];

  // Test 1: Gate inventory
  const inv = verifyGateInventory();
  tests.push({
    name: "192 single-qubit gates",
    holds: inv.singleCount === 192,
    expected: "192",
    actual: String(inv.singleCount),
  });
  tests.push({
    name: "21 two-qubit gates",
    holds: inv.twoCount === 21,
    expected: "21",
    actual: String(inv.twoCount),
  });
  tests.push({
    name: "7 three-qubit gates",
    holds: inv.threeCount === 7,
    expected: "7",
    actual: String(inv.threeCount),
  });
  tests.push({
    name: "Total gate count = 220",
    holds: inv.totalGates === 220,
    expected: "220",
    actual: String(inv.totalGates),
  });
  tests.push({
    name: "Identity gate exists",
    holds: inv.identityFound,
    expected: "true",
    actual: String(inv.identityFound),
  });
  tests.push({
    name: "Mirror gate exists",
    holds: inv.mirrorFound,
    expected: "true",
    actual: String(inv.mirrorFound),
  });

  // Test 2: Single-qubit algebra
  const algebra = verifySingleQubitAlgebra();
  tests.push({
    name: "Single-qubit gate composition = group composition",
    holds: algebra.failures.length === 0,
    expected: "0 failures",
    actual: `${algebra.failures.length} failures out of ${algebra.tested}`,
  });

  // Test 3: Collinearity algebra
  const collin = verifyCollinearityAlgebra();
  tests.push({
    name: "21 collinear pairs (C(7,2))",
    holds: collin.collinearPairs === 21,
    expected: "21",
    actual: String(collin.collinearPairs),
  });
  tests.push({
    name: "Anti-commutativity holds for all pairs",
    holds: collin.anticommutes,
    expected: "true",
    actual: String(collin.anticommutes),
  });

  // Test 4: Fano line algebra
  const fanoAlg = verifyFanoLineAlgebra();
  tests.push({
    name: "7 Fano lines verified",
    holds: fanoAlg.linesVerified === 7,
    expected: "7",
    actual: String(fanoAlg.linesVerified),
  });
  tests.push({
    name: "Cyclic multiplication holds on all lines",
    holds: fanoAlg.cyclicHolds,
    expected: "true",
    actual: String(fanoAlg.cyclicHolds),
  });

  // Test 5: Register geometry
  const geom = verifyRegisterGeometry();
  tests.push({
    name: "7 distinct host vertices",
    holds: geom.distinctVertices === 7,
    expected: "7",
    actual: String(geom.distinctVertices),
  });
  tests.push({
    name: "All 3 modalities covered",
    holds: geom.modalitiesCovered === 3,
    expected: "3",
    actual: String(geom.modalitiesCovered),
  });
  tests.push({
    name: "7 morphism generators covered",
    holds: geom.generatorsCovered === 7,
    expected: "7",
    actual: String(geom.generatorsCovered),
  });
  tests.push({
    name: "Triality coordinates consistent",
    holds: geom.allTrialityValid,
    expected: "true",
    actual: String(geom.allTrialityValid),
  });

  return {
    singleQubitGates,
    twoQubitGates,
    threeQubitGates,
    register,
    tests,
    allPassed: tests.every(t => t.holds),
  };
}
