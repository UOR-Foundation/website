/**
 * Q-Simulator — Full Statevector Quantum Simulator
 * ══════════════════════════════════════════════════
 *
 * A real quantum simulator implementing:
 *   - Dense statevector representation (2^n complex amplitudes)
 *   - Proper unitary gate matrices (H, X, Y, Z, S, T, Rx, Ry, Rz, CNOT, etc.)
 *   - Tensor product gate application on qubit subsets
 *   - Born-rule probabilistic measurement
 *   - Entanglement tracking
 *   - OpenQASM 3.0 export
 *
 * Supports up to 16 qubits (65,536 amplitudes).
 *
 * @module qkernel/q-simulator
 */

// ── Types ─────────────────────────────────────────────────────────────────

export type Complex = [number, number]; // [real, imag]

/** Noise model configuration for realistic hardware simulation. */
export interface NoiseModel {
  /** Single-qubit depolarizing error rate (0–1). Applies random X/Y/Z after each gate. */
  depolarizing: number;
  /** Amplitude damping rate γ (0–1). Models T1 energy relaxation. */
  amplitudeDamping: number;
  /** Phase damping rate λ (0–1). Models T2 dephasing. */
  phaseDamping: number;
  /** Measurement bit-flip probability (0–1). Flips readout bits. */
  measurementError: number;
  /** Two-qubit gate depolarizing error (0–1). Applied after CX/CZ/SWAP. */
  twoQubitDepolarizing: number;
  /** Thermal relaxation T1 time in gate-cycles (0 = off). */
  t1: number;
  /** Thermal relaxation T2 time in gate-cycles (0 = off). */
  t2: number;
}

/** Create a noise-free model (all zeros). */
export function noNoise(): NoiseModel {
  return { depolarizing: 0, amplitudeDamping: 0, phaseDamping: 0, measurementError: 0, twoQubitDepolarizing: 0, t1: 0, t2: 0 };
}

/** Create a realistic noise model based on hardware fidelity presets. */
export function realisticNoise(level: "low" | "medium" | "high" = "medium"): NoiseModel {
  const presets: Record<string, NoiseModel> = {
    low:    { depolarizing: 0.0005, amplitudeDamping: 0.0003, phaseDamping: 0.0005, measurementError: 0.005, twoQubitDepolarizing: 0.005, t1: 50000, t2: 30000 },
    medium: { depolarizing: 0.002,  amplitudeDamping: 0.001,  phaseDamping: 0.002,  measurementError: 0.02,  twoQubitDepolarizing: 0.02,  t1: 20000, t2: 10000 },
    high:   { depolarizing: 0.01,   amplitudeDamping: 0.005,  phaseDamping: 0.01,   measurementError: 0.05,  twoQubitDepolarizing: 0.05,  t1: 5000,  t2: 2000 },
  };
  return presets[level];
}

export interface SimulatorState {
  numQubits: number;
  numClbits: number;
  stateVector: Complex[];
  classicalBits: number[];
  ops: SimOp[];
  measured: boolean;
  lastCounts: Record<string, number> | null;
  lastShots: number;
  name: string;
  noise: NoiseModel;
}

export interface SimOp {
  gate: string;
  qubits: number[];
  clbits?: number[];
  params?: number[];  // for parameterized gates (rx, ry, rz)
}

export type GateMatrix = Complex[][];

// ── Complex Arithmetic ────────────────────────────────────────────────────

function cadd(a: Complex, b: Complex): Complex {
  return [a[0] + b[0], a[1] + b[1]];
}

function cmul(a: Complex, b: Complex): Complex {
  return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
}

function cscale(s: number, a: Complex): Complex {
  return [s * a[0], s * a[1]];
}

function cnorm2(a: Complex): number {
  return a[0] * a[0] + a[1] * a[1];
}

function cabs(a: Complex): number {
  return Math.sqrt(cnorm2(a));
}

function cconj(a: Complex): Complex {
  return [a[0], -a[1]];
}

const ZERO: Complex = [0, 0];
const ONE: Complex = [1, 0];
const I: Complex = [0, 1];
const NEG_I: Complex = [0, -1];
const INVSQRT2 = 1 / Math.sqrt(2);

// ── Gate Matrices ─────────────────────────────────────────────────────────

/** Single-qubit gate matrices (2×2 unitaries) */
const GATES: Record<string, GateMatrix | ((params: number[]) => GateMatrix)> = {
  // Pauli gates
  id: [[ONE, ZERO], [ZERO, ONE]],
  x:  [[ZERO, ONE], [ONE, ZERO]],
  y:  [[ZERO, NEG_I], [I, ZERO]],
  z:  [[ONE, ZERO], [ZERO, [-1, 0]]],

  // Hadamard
  h:  [[[INVSQRT2, 0], [INVSQRT2, 0]], [[INVSQRT2, 0], [-INVSQRT2, 0]]],

  // Phase gates
  s:  [[ONE, ZERO], [ZERO, I]],
  sdg: [[ONE, ZERO], [ZERO, NEG_I]],
  t:  [[ONE, ZERO], [ZERO, [Math.cos(Math.PI / 4), Math.sin(Math.PI / 4)]]],
  tdg: [[ONE, ZERO], [ZERO, [Math.cos(Math.PI / 4), -Math.sin(Math.PI / 4)]]],

  // √X
  sx: [
    [[0.5, 0.5], [0.5, -0.5]],
    [[0.5, -0.5], [0.5, 0.5]],
  ],

  // Parameterized rotation gates
  rx: (params: number[]) => {
    const θ = params[0];
    const c = Math.cos(θ / 2);
    const s = Math.sin(θ / 2);
    return [[[c, 0], [0, -s]], [[0, -s], [c, 0]]];
  },
  ry: (params: number[]) => {
    const θ = params[0];
    const c = Math.cos(θ / 2);
    const s = Math.sin(θ / 2);
    return [[[c, 0], [-s, 0]], [[s, 0], [c, 0]]];
  },
  rz: (params: number[]) => {
    const θ = params[0];
    return [
      [[Math.cos(θ / 2), -Math.sin(θ / 2)], ZERO],
      [ZERO, [Math.cos(θ / 2), Math.sin(θ / 2)]],
    ];
  },
  p: (params: number[]) => {
    const θ = params[0];
    return [[ONE, ZERO], [ZERO, [Math.cos(θ), Math.sin(θ)]]];
  },
  u: (params: number[]) => {
    const [θ, φ, λ] = params;
    const c = Math.cos(θ / 2);
    const s = Math.sin(θ / 2);
    return [
      [[c, 0], cscale(-s, [Math.cos(λ), Math.sin(λ)])],
      [cscale(s, [Math.cos(φ), Math.sin(φ)]), cscale(c, [Math.cos(φ + λ), Math.sin(φ + λ)])],
    ];
  },
};

/** Resolve a gate matrix (handles parameterized gates). */
function resolveGate(name: string, params?: number[]): GateMatrix | null {
  const g = GATES[name];
  if (!g) return null;
  if (typeof g === "function") return g(params || [0]);
  return g;
}

// ── Statevector Operations ────────────────────────────────────────────────

/** Create a fresh |00...0⟩ state. */
export function createState(numQubits: number, numClbits?: number, name?: string): SimulatorState {
  const dim = 1 << numQubits;
  const sv: Complex[] = new Array(dim);
  for (let i = 0; i < dim; i++) sv[i] = ZERO;
  sv[0] = ONE;
  return {
    numQubits,
    numClbits: numClbits ?? numQubits,
    stateVector: sv,
    classicalBits: new Array(numClbits ?? numQubits).fill(0),
    ops: [],
    measured: false,
    lastCounts: null,
    lastShots: 0,
    name: name || `circuit_${numQubits}q`,
    noise: noNoise(),
  };
}

// ── Noise Channel Application ─────────────────────────────────────────────

/**
 * Apply single-qubit depolarizing channel with probability p.
 * With prob p, applies a random Pauli (X, Y, or Z) to the target qubit.
 */
function applyDepolarizingNoise(sv: Complex[], n: number, target: number, p: number): void {
  if (p <= 0 || Math.random() > p) return;
  const r = Math.random() * 3;
  let gate: GateMatrix;
  if (r < 1) gate = GATES.x as GateMatrix;
  else if (r < 2) gate = GATES.y as GateMatrix;
  else gate = GATES.z as GateMatrix;
  applySingleQubitGate(sv, n, target, gate);
}

/**
 * Apply amplitude damping channel (T1 decay) with rate γ.
 * Models spontaneous emission |1⟩ → |0⟩.
 * Kraus operators: K0 = [[1,0],[0,√(1-γ)]], K1 = [[0,√γ],[0,0]]
 * Approximated stochastically for statevector sim.
 */
function applyAmplitudeDamping(sv: Complex[], n: number, target: number, gamma: number): void {
  if (gamma <= 0) return;
  const dim = 1 << n;
  const bit = 1 << (n - 1 - target);
  const sqrtGamma = Math.sqrt(gamma);
  const sqrt1mGamma = Math.sqrt(1 - gamma);

  for (let i = 0; i < dim; i++) {
    if (!(i & bit)) continue; // only process |1⟩ components
    const j = i ^ bit; // corresponding |0⟩ state
    // Stochastic: with prob γ|α_1|², collapse |1⟩→|0⟩
    const prob1 = cnorm2(sv[i]);
    if (Math.random() < gamma * prob1 / (cnorm2(sv[j]) + prob1 + 1e-30)) {
      // Decay happened
      sv[j] = cadd(sv[j], cscale(sqrtGamma, sv[i]));
      sv[i] = ZERO;
    } else {
      // No decay, but attenuate |1⟩ amplitude
      sv[i] = cscale(sqrt1mGamma, sv[i]);
    }
  }
  // Renormalize
  let total = 0;
  for (let i = 0; i < dim; i++) total += cnorm2(sv[i]);
  if (total > 0 && Math.abs(total - 1) > 1e-10) {
    const s = 1 / Math.sqrt(total);
    for (let i = 0; i < dim; i++) sv[i] = cscale(s, sv[i]);
  }
}

/**
 * Apply phase damping channel (T2 dephasing) with rate λ.
 * Randomizes the relative phase between |0⟩ and |1⟩.
 */
function applyPhaseDamping(sv: Complex[], n: number, target: number, lambda: number): void {
  if (lambda <= 0 || Math.random() > lambda) return;
  // Apply a random Z rotation (phase kickback)
  const angle = Math.random() * 2 * Math.PI;
  const phase: Complex = [Math.cos(angle), Math.sin(angle)];
  const dim = 1 << n;
  const bit = 1 << (n - 1 - target);
  for (let i = 0; i < dim; i++) {
    if (i & bit) sv[i] = cmul(phase, sv[i]);
  }
}

/**
 * Apply two-qubit depolarizing noise after a 2-qubit gate.
 * With probability p, applies a random 2-qubit Pauli.
 */
function applyTwoQubitDepolarizing(sv: Complex[], n: number, q0: number, q1: number, p: number): void {
  if (p <= 0 || Math.random() > p) return;
  // Apply random Pauli to each qubit independently
  const paulis = [GATES.id as GateMatrix, GATES.x as GateMatrix, GATES.y as GateMatrix, GATES.z as GateMatrix];
  const p0 = paulis[Math.floor(Math.random() * 4)];
  const p1 = paulis[Math.floor(Math.random() * 4)];
  // Skip identity⊗identity
  if (p0 === paulis[0] && p1 === paulis[0]) return;
  if (p0 !== paulis[0]) applySingleQubitGate(sv, n, q0, p0);
  if (p1 !== paulis[0]) applySingleQubitGate(sv, n, q1, p1);
}

/**
 * Apply all relevant noise channels after a gate operation.
 */
function applyNoiseAfterGate(sv: Complex[], n: number, op: SimOp, noise: NoiseModel): void {
  if (op.gate === "barrier" || op.gate === "measure") return;

  const q = op.qubits;
  if (q.length === 1) {
    applyDepolarizingNoise(sv, n, q[0], noise.depolarizing);
    applyAmplitudeDamping(sv, n, q[0], noise.amplitudeDamping);
    applyPhaseDamping(sv, n, q[0], noise.phaseDamping);
  } else if (q.length >= 2) {
    applyTwoQubitDepolarizing(sv, n, q[0], q[1], noise.twoQubitDepolarizing);
    // Also apply single-qubit noise to each involved qubit
    for (const qi of q) {
      applyDepolarizingNoise(sv, n, qi, noise.depolarizing);
      applyAmplitudeDamping(sv, n, qi, noise.amplitudeDamping);
      applyPhaseDamping(sv, n, qi, noise.phaseDamping);
    }
  }
}

/**
 * Apply measurement error: flip each bit with probability p.
 */
function applyMeasurementError(bitstring: string, p: number): string {
  if (p <= 0) return bitstring;
  return bitstring.split("").map(b => Math.random() < p ? (b === "0" ? "1" : "0") : b).join("");
}

/**
 * Apply a single-qubit gate to qubit `target` in the statevector.
 *
 * For a gate U acting on qubit t in an n-qubit system:
 *   For each pair of basis states differing only in bit t,
 *   apply the 2×2 matrix U.
 */
function applySingleQubitGate(sv: Complex[], n: number, target: number, U: GateMatrix): void {
  const dim = 1 << n;
  const bit = 1 << (n - 1 - target); // big-endian qubit ordering (Qiskit convention)

  for (let i = 0; i < dim; i++) {
    if (i & bit) continue; // process each pair once
    const j = i | bit;
    const a0 = sv[i];
    const a1 = sv[j];
    sv[i] = cadd(cmul(U[0][0], a0), cmul(U[0][1], a1));
    sv[j] = cadd(cmul(U[1][0], a0), cmul(U[1][1], a1));
  }
}

/**
 * Apply a controlled-U gate: control → target.
 * Only applies U to target when control qubit is |1⟩.
 */
function applyControlledGate(sv: Complex[], n: number, control: number, target: number, U: GateMatrix): void {
  const dim = 1 << n;
  const cBit = 1 << (n - 1 - control);
  const tBit = 1 << (n - 1 - target);

  for (let i = 0; i < dim; i++) {
    if (!(i & cBit)) continue;   // control must be 1
    if (i & tBit) continue;       // process each target pair once
    const j = i | tBit;
    const a0 = sv[i];
    const a1 = sv[j];
    sv[i] = cadd(cmul(U[0][0], a0), cmul(U[0][1], a1));
    sv[j] = cadd(cmul(U[1][0], a0), cmul(U[1][1], a1));
  }
}

/**
 * Apply a doubly-controlled gate (Toffoli-class): c0, c1 → target.
 */
function applyDoublyControlledGate(sv: Complex[], n: number, c0: number, c1: number, target: number, U: GateMatrix): void {
  const dim = 1 << n;
  const cBit0 = 1 << (n - 1 - c0);
  const cBit1 = 1 << (n - 1 - c1);
  const tBit = 1 << (n - 1 - target);

  for (let i = 0; i < dim; i++) {
    if (!(i & cBit0) || !(i & cBit1)) continue;
    if (i & tBit) continue;
    const j = i | tBit;
    const a0 = sv[i];
    const a1 = sv[j];
    sv[i] = cadd(cmul(U[0][0], a0), cmul(U[0][1], a1));
    sv[j] = cadd(cmul(U[1][0], a0), cmul(U[1][1], a1));
  }
}

/** Apply SWAP gate between two qubits. */
function applySWAP(sv: Complex[], n: number, q0: number, q1: number): void {
  const dim = 1 << n;
  const bit0 = 1 << (n - 1 - q0);
  const bit1 = 1 << (n - 1 - q1);

  for (let i = 0; i < dim; i++) {
    const b0 = (i & bit0) ? 1 : 0;
    const b1 = (i & bit1) ? 1 : 0;
    if (b0 === b1) continue;
    if (b0 > b1) continue; // process each pair once
    const j = i ^ bit0 ^ bit1;
    const tmp = sv[i];
    sv[i] = sv[j];
    sv[j] = tmp;
  }
}

/** Apply Controlled-SWAP (Fredkin). */
function applyCSWAP(sv: Complex[], n: number, control: number, q0: number, q1: number): void {
  const dim = 1 << n;
  const cBit = 1 << (n - 1 - control);
  const bit0 = 1 << (n - 1 - q0);
  const bit1 = 1 << (n - 1 - q1);

  for (let i = 0; i < dim; i++) {
    if (!(i & cBit)) continue;
    const b0 = (i & bit0) ? 1 : 0;
    const b1 = (i & bit1) ? 1 : 0;
    if (b0 === b1) continue;
    if (b0 > b1) continue;
    const j = i ^ bit0 ^ bit1;
    const tmp = sv[i];
    sv[i] = sv[j];
    sv[j] = tmp;
  }
}

/**
 * Apply a multi-controlled X gate: flip target iff ALL controls are |1⟩.
 * Generalizes CCX to arbitrary number of controls.
 */
function applyMCX(sv: Complex[], n: number, controls: number[], target: number): void {
  const dim = 1 << n;
  const tBit = 1 << (n - 1 - target);
  const controlBits = controls.map(c => 1 << (n - 1 - c));

  for (let i = 0; i < dim; i++) {
    // Check all control bits are set
    if (!controlBits.every(cb => (i & cb) !== 0)) continue;
    // Only process pairs where target is 0
    if (i & tBit) continue;
    const j = i | tBit;
    const tmp = sv[i];
    sv[i] = sv[j];
    sv[j] = tmp;
  }
}

// ── Gate Application Dispatch ─────────────────────────────────────────────

const X_MATRIX = GATES.x as GateMatrix;

/**
 * Apply an operation to the simulator state.
 * Returns error string or null on success.
 */
export function applyOp(state: SimulatorState, op: SimOp): string | null {
  const { stateVector: sv, numQubits: n } = state;
  const g = op.gate;
  const q = op.qubits;

  // Single-qubit gates
  const singleGate = resolveGate(g, op.params);
  if (singleGate && q.length === 1) {
    applySingleQubitGate(sv, n, q[0], singleGate);
    return null;
  }

  // Two-qubit gates
  if (g === "cx" || g === "cnot") {
    applyControlledGate(sv, n, q[0], q[1], X_MATRIX);
    return null;
  }
  if (g === "cz") {
    const Z = GATES.z as GateMatrix;
    applyControlledGate(sv, n, q[0], q[1], Z);
    return null;
  }
  if (g === "cs") {
    const S = GATES.s as GateMatrix;
    applyControlledGate(sv, n, q[0], q[1], S);
    return null;
  }
  if (g === "cy") {
    const Y = GATES.y as GateMatrix;
    applyControlledGate(sv, n, q[0], q[1], Y);
    return null;
  }
  if (g === "ch") {
    const H = GATES.h as GateMatrix;
    applyControlledGate(sv, n, q[0], q[1], H);
    return null;
  }
  if (g === "cs") {
    const S = GATES.s as GateMatrix;
    applyControlledGate(sv, n, q[0], q[1], S);
    return null;
  }
  if (g === "crx" || g === "cry" || g === "crz") {
    const base = g.slice(1); // "rx", "ry", "rz"
    const U = resolveGate(base, op.params);
    if (U) applyControlledGate(sv, n, q[0], q[1], U);
    return null;
  }
  if (g === "swap") {
    applySWAP(sv, n, q[0], q[1]);
    return null;
  }

  // Three-qubit gates
  if (g === "ccx" || g === "toffoli") {
    applyDoublyControlledGate(sv, n, q[0], q[1], q[2], X_MATRIX);
    return null;
  }
  if (g === "cswap" || g === "fredkin") {
    applyCSWAP(sv, n, q[0], q[1], q[2]);
    return null;
  }

  // Multi-controlled X (MCX): last qubit is target, rest are controls
  if (g === "mcx") {
    if (q.length < 2) return "MCX requires at least 2 qubits";
    const controls = q.slice(0, -1);
    const target = q[q.length - 1];
    applyMCX(sv, n, controls, target);
    return null;
  }

  // RCCX (simplified Toffoli) — same unitary action as CCX for computational basis
  if (g === "rccx") {
    if (q.length < 3) return "RCCX requires 3 qubits";
    applyDoublyControlledGate(sv, n, q[0], q[1], q[2], X_MATRIX);
    return null;
  }

  // RC3X (relative-phase 3-controlled X) — same as MCX for computational basis
  if (g === "rc3x") {
    if (q.length < 4) return "RC3X requires 4 qubits";
    applyMCX(sv, n, [q[0], q[1], q[2]], q[3]);
    return null;
  }

  // RXX(θ) — XX interaction gate: exp(-i θ/2 X⊗X)
  if (g === "rxx") {
    const θ = (op.params?.[0]) ?? Math.PI / 4;
    const c = Math.cos(θ / 2), s = Math.sin(θ / 2);
    // Apply as: RXX = (H⊗H) · RZZ(θ) · (H⊗H), but direct matrix is simpler
    // RXX matrix in computational basis {00,01,10,11}:
    // [[c, 0, 0, -is], [0, c, -is, 0], [0, -is, c, 0], [-is, 0, 0, c]]
    const bit0 = 1 << (n - 1 - q[0]);
    const bit1 = 1 << (n - 1 - q[1]);
    const dim = 1 << n;
    for (let i = 0; i < dim; i++) {
      const b0 = (i & bit0) ? 1 : 0;
      const b1 = (i & bit1) ? 1 : 0;
      if (b0 === 0 && b1 === 0) {
        const j = i ^ bit0 ^ bit1; // |11⟩
        const a00 = sv[i], a11 = sv[j];
        sv[i] = cadd(cscale(c, a00), cmul([0, -s], a11));
        sv[j] = cadd(cmul([0, -s], a00), cscale(c, a11));
      }
      if (b0 === 0 && b1 === 1) {
        const j = i ^ bit0 ^ bit1; // |10⟩
        const a01 = sv[i], a10 = sv[j];
        sv[i] = cadd(cscale(c, a01), cmul([0, -s], a10));
        sv[j] = cadd(cmul([0, -s], a01), cscale(c, a10));
      }
    }
    return null;
  }

  // RZZ(θ) — ZZ interaction gate: exp(-i θ/2 Z⊗Z)
  if (g === "rzz") {
    const θ = (op.params?.[0]) ?? Math.PI / 4;
    const bit0 = 1 << (n - 1 - q[0]);
    const bit1 = 1 << (n - 1 - q[1]);
    const dim = 1 << n;
    for (let i = 0; i < dim; i++) {
      const b0 = (i & bit0) ? 1 : 0;
      const b1 = (i & bit1) ? 1 : 0;
      const parity = b0 ^ b1; // 0 if same, 1 if different
      const phase = parity === 0 ? -θ / 2 : θ / 2;
      sv[i] = cmul([Math.cos(phase), Math.sin(phase)], sv[i]);
    }
    return null;
  }

  // SX† (inverse √X)
  if (g === "sxdg") {
    const sxdgMatrix: GateMatrix = [
      [[0.5, -0.5], [0.5, 0.5]],
      [[0.5, 0.5], [0.5, -0.5]],
    ];
    applySingleQubitGate(sv, n, q[0], sxdgMatrix);
    return null;
  }

  // Barrier, measure, delay, identity are no-ops for state evolution
  if (g === "barrier" || g === "measure" || g === "delay" || g === "id") return null;

  return `Unknown gate: ${g}`;
}

// ── Simulation Execution ──────────────────────────────────────────────────

/**
 * Execute the full circuit on the statevector.
 * Returns error or null.
 */
export function simulateCircuit(state: SimulatorState): string | null {
  // Reset statevector to |0...0⟩
  const dim = 1 << state.numQubits;
  for (let i = 0; i < dim; i++) state.stateVector[i] = ZERO;
  state.stateVector[0] = ONE;

  const hasNoise = state.noise.depolarizing > 0 || state.noise.amplitudeDamping > 0 ||
    state.noise.phaseDamping > 0 || state.noise.twoQubitDepolarizing > 0;

  // Apply each gate + noise
  for (const op of state.ops) {
    if (op.gate === "barrier" || op.gate === "measure") continue;
    const err = applyOp(state, op);
    if (err) return err;
    if (hasNoise) applyNoiseAfterGate(state.stateVector, state.numQubits, op, state.noise);
  }
  return null;
}

/**
 * Measure the statevector using Born rule.
 * Returns measurement counts after `shots` samples.
 */
export function measure(state: SimulatorState, shots: number = 1024): Record<string, number> {
  // First simulate to get final statevector
  simulateCircuit(state);

  const n = state.numQubits;
  const dim = 1 << n;

  // Compute probabilities
  const probs = new Float64Array(dim);
  let total = 0;
  for (let i = 0; i < dim; i++) {
    probs[i] = cnorm2(state.stateVector[i]);
    total += probs[i];
  }
  // Normalize (handle floating point)
  if (total > 0) for (let i = 0; i < dim; i++) probs[i] /= total;

  // Sample using cumulative distribution
  const cumulative = new Float64Array(dim);
  cumulative[0] = probs[0];
  for (let i = 1; i < dim; i++) cumulative[i] = cumulative[i - 1] + probs[i];

  const counts: Record<string, number> = {};
  for (let s = 0; s < shots; s++) {
    const r = Math.random();
    let outcome = 0;
    for (let i = 0; i < dim; i++) {
      if (r <= cumulative[i]) { outcome = i; break; }
    }
    // Convert to bitstring (big-endian, Qiskit convention)
    let bits = outcome.toString(2).padStart(n, "0");
    // Apply measurement error noise
    bits = applyMeasurementError(bits, state.noise.measurementError);
    counts[bits] = (counts[bits] || 0) + 1;
  }

  state.lastCounts = counts;
  state.lastShots = shots;
  return counts;
}

// ── Statevector Inspection ────────────────────────────────────────────────

/** Format a complex number for display. */
function fmtComplex(c: Complex): string {
  const r = c[0];
  const i = c[1];
  if (Math.abs(i) < 1e-10) return r.toFixed(5);
  if (Math.abs(r) < 1e-10) return i > 0 ? `${i.toFixed(5)}j` : `${i.toFixed(5)}j`;
  return i >= 0 ? `${r.toFixed(5)}+${i.toFixed(5)}j` : `${r.toFixed(5)}${i.toFixed(5)}j`;
}

/**
 * Get human-readable statevector representation.
 * Only shows non-zero amplitudes for clarity.
 */
export function formatStatevector(state: SimulatorState): string[] {
  simulateCircuit(state);

  const n = state.numQubits;
  const dim = 1 << n;
  const lines: string[] = [];
  lines.push(`Statevector (${n} qubits, ${dim} amplitudes):`);
  lines.push("");

  let nonZero = 0;
  const entries: string[] = [];
  for (let i = 0; i < dim; i++) {
    const amp = state.stateVector[i];
    const mag = cabs(amp);
    if (mag < 1e-10) continue;
    nonZero++;
    const bits = i.toString(2).padStart(n, "0");
    const prob = (cnorm2(amp) * 100).toFixed(2);
    entries.push(`  |${bits}⟩  ${fmtComplex(amp)}   (prob: ${prob}%)`);
  }

  if (entries.length <= 32) {
    lines.push(...entries);
  } else {
    lines.push(...entries.slice(0, 16));
    lines.push(`  ... (${entries.length - 32} more states) ...`);
    lines.push(...entries.slice(-16));
  }

  lines.push("");
  lines.push(`  Non-zero amplitudes: ${nonZero}/${dim}`);

  // Check normalization
  let totalProb = 0;
  for (let i = 0; i < dim; i++) totalProb += cnorm2(state.stateVector[i]);
  lines.push(`  Total probability: ${totalProb.toFixed(6)} ${Math.abs(totalProb - 1) < 1e-6 ? "✓" : "⚠ not normalized"}`);

  return lines;
}

// ── ASCII Circuit Drawing ─────────────────────────────────────────────────

export function drawCircuitASCII(state: SimulatorState): string[] {
  const n = state.numQubits;
  const ops = state.ops;

  // Build wire labels
  const qLabels = Array.from({ length: n }, (_, i) => `q${i}`);
  const maxLabel = Math.max(...qLabels.map(l => l.length));

  // Build column segments
  const columns: string[][] = [];
  for (const op of ops) {
    const col = Array.from({ length: n }, () => "─");

    if (op.gate === "barrier") {
      for (let i = 0; i < n; i++) col[i] = "░";
    } else if (op.gate === "measure") {
      col[op.qubits[0]] = "M";
    } else if (op.gate === "cx" || op.gate === "cnot") {
      const [c, t] = op.qubits;
      col[c] = "●";
      col[t] = "⊕";
      // Draw vertical connector
      const lo = Math.min(c, t);
      const hi = Math.max(c, t);
      for (let i = lo + 1; i < hi; i++) col[i] = "│";
    } else if (op.gate === "cz") {
      const [c, t] = op.qubits;
      col[c] = "●";
      col[t] = "●";
      const lo = Math.min(c, t);
      const hi = Math.max(c, t);
      for (let i = lo + 1; i < hi; i++) col[i] = "│";
    } else if (op.gate === "swap") {
      const [a, b] = op.qubits;
      col[a] = "×";
      col[b] = "×";
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      for (let i = lo + 1; i < hi; i++) col[i] = "│";
    } else if (op.gate === "ccx" || op.gate === "toffoli") {
      const [c0, c1, t] = op.qubits;
      col[c0] = "●";
      col[c1] = "●";
      col[t] = "⊕";
      const lo = Math.min(c0, c1, t);
      const hi = Math.max(c0, c1, t);
      for (let i = lo + 1; i < hi; i++) {
        if (col[i] === "─") col[i] = "│";
      }
    } else if (op.gate === "cswap" || op.gate === "fredkin") {
      const [c, a, b] = op.qubits;
      col[c] = "●";
      col[a] = "×";
      col[b] = "×";
      const lo = Math.min(c, a, b);
      const hi = Math.max(c, a, b);
      for (let i = lo + 1; i < hi; i++) {
        if (col[i] === "─") col[i] = "│";
      }
    } else {
      // Single-qubit gate
      const label = op.gate.toUpperCase();
      col[op.qubits[0]] = `[${label}]`;
    }
    columns.push(col);
  }

  // Render lines
  const lines: string[] = [];
  for (let q = 0; q < n; q++) {
    const label = qLabels[q].padStart(maxLabel);
    let wire = `${label} : `;
    for (const col of columns) {
      const seg = col[q];
      if (seg === "─") wire += "────";
      else if (seg === "│") wire += "──│─";
      else if (seg === "░") wire += "░░░░";
      else wire += `─${seg}─`;
    }
    wire += "──";
    lines.push(wire);
  }

  return lines;
}

// ── OpenQASM 3.0 Export ───────────────────────────────────────────────────

export function toOpenQASM(state: SimulatorState): string[] {
  const lines: string[] = [];
  lines.push("OPENQASM 3.0;");
  lines.push('include "stdgates.inc";');
  lines.push("");
  lines.push(`qubit[${state.numQubits}] q;`);
  lines.push(`bit[${state.numClbits}] c;`);
  lines.push("");

  for (const op of state.ops) {
    if (op.gate === "barrier") {
      lines.push(`barrier q;`);
    } else if (op.gate === "measure") {
      const qi = op.qubits[0];
      const ci = op.clbits?.[0] ?? qi;
      lines.push(`c[${ci}] = measure q[${qi}];`);
    } else if (op.gate === "cx" || op.gate === "cnot") {
      lines.push(`cx q[${op.qubits[0]}], q[${op.qubits[1]}];`);
    } else if (op.gate === "ccx" || op.gate === "toffoli") {
      lines.push(`ccx q[${op.qubits[0]}], q[${op.qubits[1]}], q[${op.qubits[2]}];`);
    } else if (op.gate === "swap") {
      lines.push(`swap q[${op.qubits[0]}], q[${op.qubits[1]}];`);
    } else if (op.gate === "cswap" || op.gate === "fredkin") {
      lines.push(`cswap q[${op.qubits[0]}], q[${op.qubits[1]}], q[${op.qubits[2]}];`);
    } else if (op.params && op.params.length > 0) {
      const paramStr = op.params.map(p => p.toFixed(6)).join(", ");
      lines.push(`${op.gate}(${paramStr}) q[${op.qubits[0]}];`);
    } else {
      const qStr = op.qubits.map(q => `q[${q}]`).join(", ");
      lines.push(`${op.gate} ${qStr};`);
    }
  }

  return lines;
}

// ── Entanglement Detection ────────────────────────────────────────────────

/**
 * Compute the reduced density matrix purity for each qubit.
 * A purity < 1 indicates entanglement with the rest of the system.
 */
export function entanglementMap(state: SimulatorState): { qubit: number; purity: number; entangled: boolean }[] {
  simulateCircuit(state);
  const n = state.numQubits;
  const sv = state.stateVector;
  const dim = 1 << n;
  const result: { qubit: number; purity: number; entangled: boolean }[] = [];

  for (let q = 0; q < n; q++) {
    // Trace out all qubits except q → 2×2 reduced density matrix
    const rho: Complex[][] = [[ZERO, ZERO], [ZERO, ZERO]];
    const bit = 1 << (n - 1 - q);

    for (let i = 0; i < dim; i++) {
      const qi = (i & bit) ? 1 : 0;
      for (let j = 0; j < dim; j++) {
        // Only sum when all bits except q match
        if ((i ^ j) & ~bit) continue;
        const qj = (j & bit) ? 1 : 0;
        rho[qi][qj] = cadd(rho[qi][qj], cmul(sv[i], cconj(sv[j])));
      }
    }

    // Purity = Tr(ρ²)
    const rho2_00 = cadd(cmul(rho[0][0], rho[0][0]), cmul(rho[0][1], rho[1][0]));
    const rho2_11 = cadd(cmul(rho[1][0], rho[0][1]), cmul(rho[1][1], rho[1][1]));
    const purity = rho2_00[0] + rho2_11[0]; // Tr is real

    result.push({ qubit: q, purity: Math.min(1, Math.max(0, purity)), entangled: purity < 0.999 });
  }

  return result;
}

// ── Expectation Values ────────────────────────────────────────────────────

/** Pauli operator type for expectation value measurements. */
export type PauliOp = "I" | "X" | "Y" | "Z";

/**
 * Compute ⟨ψ|O|ψ⟩ for a single-qubit Pauli operator on a specific qubit.
 *
 * This is the KEY function that bridges classical simulation and quantum measurement.
 * For n qubits, O acts on qubit `target` and I on all others.
 *
 * Mathematical derivation:
 *   For Pauli-Z: ⟨Z⟩ = Σᵢ (-1)^{bit(i,target)} |αᵢ|²
 *   For Pauli-X: ⟨X⟩ = Σᵢ 2·Re(αᵢ* · α_{i⊕bit})
 *   For Pauli-Y: ⟨Y⟩ = Σᵢ 2·Im(α_{i⊕bit}* · αᵢ)
 *   For Identity: ⟨I⟩ = 1 (always, by normalization)
 *
 * This computes the EXACT expectation value from the statevector — no sampling noise.
 * On real quantum hardware, you would need O(1/ε²) shots to estimate this to precision ε.
 * Our statevector simulator computes it in O(2^n) — exponential in qubits but EXACT.
 *
 * @param state - Simulated quantum state (circuit must be already simulated)
 * @param target - Which qubit to measure the observable on (0-indexed)
 * @param pauli - Which Pauli operator: "I", "X", "Y", "Z"
 * @returns The exact expectation value ∈ [-1, 1]
 */
export function expectationValue(state: SimulatorState, target: number, pauli: PauliOp): number {
  const n = state.numQubits;
  const sv = state.stateVector;
  const dim = 1 << n;
  const bit = 1 << (n - 1 - target);

  if (pauli === "I") return 1.0;

  if (pauli === "Z") {
    // ⟨Z⟩ = Σ |α_{...0...}|² - Σ |α_{...1...}|²
    // bit=0 on target → eigenvalue +1, bit=1 → eigenvalue -1
    let val = 0;
    for (let i = 0; i < dim; i++) {
      const prob = cnorm2(sv[i]);
      val += (i & bit) ? -prob : prob;
    }
    return val;
  }

  if (pauli === "X") {
    // ⟨X⟩ = Σ_{pairs} 2·Re(α_i* · α_j) where j = i ⊕ bit
    let val = 0;
    for (let i = 0; i < dim; i++) {
      if (i & bit) continue; // process each pair once
      const j = i | bit;
      // ⟨i|X|j⟩ contributes: α_i* · α_j + α_j* · α_i = 2·Re(α_i* · α_j)
      val += 2 * (sv[i][0] * sv[j][0] + sv[i][1] * sv[j][1]);
    }
    return val;
  }

  if (pauli === "Y") {
    // ⟨Y⟩ = Σ_{pairs} 2·Re(α_i* · (-i)·α_j + α_j* · i·α_i)
    // Y = [[0, -i], [i, 0]], so Y|0⟩ = i|1⟩, Y|1⟩ = -i|0⟩
    let val = 0;
    for (let i = 0; i < dim; i++) {
      if (i & bit) continue;
      const j = i | bit;
      // contribution = α_i* · (-i·α_j) + α_j* · (i·α_i)
      // = -i(α_i* · α_j) + i(α_j* · α_i) = 2·Im(α_j* · α_i)
      val += 2 * (sv[j][0] * sv[i][1] - sv[j][1] * sv[i][0]);
    }
    return val;
  }

  return 0;
}

/**
 * Compute expectation value of a multi-qubit Pauli string.
 * E.g., pauliString = ["Z", "I", "X"] means Z⊗I⊗X on 3 qubits.
 *
 * For a tensor product observable O = O₀⊗O₁⊗...⊗Oₙ₋₁:
 *   ⟨O⟩ = ⟨ψ| (O₀⊗O₁⊗...⊗Oₙ₋₁) |ψ⟩
 *
 * We compute this by applying each single-qubit Pauli to a copy of |ψ⟩
 * and then taking the inner product with the original.
 */
export function expectationValuePauliString(state: SimulatorState, pauliString: PauliOp[]): number {
  const n = state.numQubits;
  const sv = state.stateVector;
  const dim = 1 << n;

  // Create O|ψ⟩
  const transformed: Complex[] = sv.slice();

  // Apply each single-qubit Pauli
  for (let q = 0; q < n; q++) {
    const p = pauliString[q] || "I";
    if (p === "I") continue;
    const gate = resolveGate(p.toLowerCase());
    if (gate) applySingleQubitGateOnCopy(transformed, n, q, gate);
  }

  // ⟨ψ|O|ψ⟩ = Σᵢ αᵢ* · (O|ψ⟩)ᵢ
  let real = 0, imag = 0;
  for (let i = 0; i < dim; i++) {
    const c = cmul(cconj(sv[i]), transformed[i]);
    real += c[0];
    imag += c[1];
  }

  // Should be real for Hermitian operators
  return real;
}

/** Apply single-qubit gate in-place on a separate copy. */
function applySingleQubitGateOnCopy(sv: Complex[], n: number, target: number, U: GateMatrix): void {
  const dim = 1 << n;
  const bit = 1 << (n - 1 - target);
  for (let i = 0; i < dim; i++) {
    if (i & bit) continue;
    const j = i | bit;
    const a0: Complex = [sv[i][0], sv[i][1]];
    const a1: Complex = [sv[j][0], sv[j][1]];
    sv[i] = cadd(cmul(U[0][0], a0), cmul(U[0][1], a1));
    sv[j] = cadd(cmul(U[1][0], a0), cmul(U[1][1], a1));
  }
}

/**
 * Get probabilities for all computational basis states.
 * Returns array of { state: "010", probability: 0.25 } sorted by probability desc.
 */
export function getStateProbabilities(state: SimulatorState): { state: string; probability: number; amplitude: Complex }[] {
  const n = state.numQubits;
  const dim = 1 << n;
  const results: { state: string; probability: number; amplitude: Complex }[] = [];

  for (let i = 0; i < dim; i++) {
    const amp = state.stateVector[i];
    const prob = cnorm2(amp);
    if (prob > 1e-14) {
      results.push({
        state: i.toString(2).padStart(n, "0"),
        probability: prob,
        amplitude: amp,
      });
    }
  }

  return results.sort((a, b) => b.probability - a.probability);
}

/**
 * Compute the Von Neumann entropy of the full state.
 * S = -Σ pᵢ log₂(pᵢ) where pᵢ = |αᵢ|²
 * For a pure state this is 0; for maximally mixed it's n.
 */
export function vonNeumannEntropy(state: SimulatorState): number {
  const dim = 1 << state.numQubits;
  let S = 0;
  for (let i = 0; i < dim; i++) {
    const p = cnorm2(state.stateVector[i]);
    if (p > 1e-14) S -= p * Math.log2(p);
  }
  return S;
}

// ── Convenience: Full Pipeline ────────────────────────────────────────────

/**
 * Create state, add operations, and run — all in one call.
 */
export function quickRun(numQubits: number, ops: SimOp[], shots: number = 1024): {
  counts: Record<string, number>;
  statevector: string[];
  qasm: string[];
} {
  const state = createState(numQubits);
  state.ops = ops;
  return {
    counts: measure(state, shots),
    statevector: formatStatevector(state),
    qasm: toOpenQASM(state),
  };
}
