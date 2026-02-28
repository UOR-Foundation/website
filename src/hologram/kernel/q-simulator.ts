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

  // Barrier and measure are no-ops for state evolution
  if (g === "barrier" || g === "measure") return null;

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
