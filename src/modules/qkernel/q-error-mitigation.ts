/**
 * Q-Error-Mitigation — Post-processing techniques for noisy quantum results
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Three industry-standard error mitigation strategies:
 *
 *   1. Zero-Noise Extrapolation (ZNE)
 *      Run the circuit at multiple noise scale factors, then extrapolate
 *      to the zero-noise limit via polynomial/exponential fitting.
 *
 *   2. Measurement Error Mitigation (MEM)
 *      Characterize readout errors via calibration circuits, build the
 *      response matrix M, then apply M⁻¹ to raw counts.
 *
 *   3. Randomized Compiling (RC)
 *      Twirl Clifford gates with random Paulis to convert coherent errors
 *      into stochastic (depolarizing) channels that are easier to mitigate.
 *
 * All techniques are composable: RC → ZNE → MEM is the gold-standard pipeline.
 *
 * @module qkernel/q-error-mitigation
 */

import {
  createState,
  simulateCircuit,
  measure,
  noNoise,
  type SimulatorState,
  type SimOp,
  type NoiseModel,
} from "./q-simulator";

// ══════════════════════════════════════════════════════════════════════════
// 1. Zero-Noise Extrapolation (ZNE)
// ══════════════════════════════════════════════════════════════════════════

export type ExtrapolationMethod = "linear" | "polynomial" | "exponential";

export interface ZneResult {
  /** Mitigated expectation value extrapolated to zero noise. */
  mitigated: number;
  /** Raw expectation values at each noise scale factor. */
  rawValues: { scale: number; value: number }[];
  /** Extrapolation method used. */
  method: ExtrapolationMethod;
  /** Fitting coefficients. */
  coefficients: number[];
}

/**
 * Run a circuit at multiple noise scale factors and extrapolate to zero noise.
 *
 * @param ops        Gate operations for the circuit
 * @param numQubits  Number of qubits
 * @param baseNoise  Baseline noise model
 * @param observable Bitstring → expectation value function (default: P(all-zeros))
 * @param scales     Noise scale factors (default: [1, 2, 3])
 * @param shots      Measurement shots per run
 * @param method     Extrapolation method
 */
export function zeroNoiseExtrapolation(
  ops: SimOp[],
  numQubits: number,
  baseNoise: NoiseModel,
  observable?: (counts: Record<string, number>, shots: number) => number,
  scales: number[] = [1, 2, 3],
  shots: number = 8192,
  method: ExtrapolationMethod = "linear",
): ZneResult {
  const obs = observable ?? defaultObservable;

  // Collect expectation values at each noise scale
  const rawValues: { scale: number; value: number }[] = [];

  for (const scale of scales) {
    // Scale the noise model
    const scaledNoise: NoiseModel = {
      depolarizing: Math.min(1, baseNoise.depolarizing * scale),
      amplitudeDamping: Math.min(1, baseNoise.amplitudeDamping * scale),
      phaseDamping: Math.min(1, baseNoise.phaseDamping * scale),
      measurementError: Math.min(0.5, baseNoise.measurementError * scale),
      twoQubitDepolarizing: Math.min(1, baseNoise.twoQubitDepolarizing * scale),
      t1: baseNoise.t1 > 0 ? baseNoise.t1 / scale : 0,
      t2: baseNoise.t2 > 0 ? baseNoise.t2 / scale : 0,
    };

    // Fold the circuit to amplify noise: insert gate-inverse-gate pairs
    const foldedOps = foldCircuit(ops, scale);

    const state = createState(numQubits);
    state.ops = foldedOps;
    state.noise = scaledNoise;
    const counts = measure(state, shots);
    rawValues.push({ scale, value: obs(counts, shots) });
  }

  // Extrapolate to scale = 0
  const { mitigated, coefficients } = extrapolate(rawValues, method);

  return { mitigated, rawValues, method, coefficients };
}

/** Default observable: probability of measuring all-zeros state. */
function defaultObservable(counts: Record<string, number>, shots: number): number {
  const allZeros = Object.keys(counts).find(k => /^0+$/.test(k));
  return allZeros ? (counts[allZeros] / shots) : 0;
}

/** Fold the circuit by inserting gate-inverse pairs to amplify noise. */
function foldCircuit(ops: SimOp[], scale: number): SimOp[] {
  if (scale <= 1) return [...ops];

  // Integer folding: repeat the circuit floor(scale) times
  const intScale = Math.floor(scale);
  const result: SimOp[] = [...ops];

  for (let f = 1; f < intScale; f++) {
    // Append inverse circuit then forward circuit
    result.push(...invertCircuit(ops));
    result.push(...ops);
  }

  // Fractional folding: partial fold of remaining gates
  const frac = scale - intScale;
  if (frac > 0.01) {
    const numGates = Math.round(frac * ops.length);
    const partialOps = ops.slice(0, numGates);
    result.push(...invertCircuit(partialOps));
    result.push(...partialOps);
  }

  return result;
}

/** Invert a circuit by reversing gate order and applying adjoint. */
function invertCircuit(ops: SimOp[]): SimOp[] {
  return [...ops].reverse().map(op => ({
    ...op,
    gate: adjointGate(op.gate),
    params: op.params ? op.params.map(p => -p) : undefined,
  }));
}

/** Get the adjoint of a gate. */
function adjointGate(gate: string): string {
  const adjoints: Record<string, string> = {
    s: "sdg", sdg: "s", t: "tdg", tdg: "t",
    rx: "rx", ry: "ry", rz: "rz", // params get negated
  };
  return adjoints[gate] ?? gate; // Self-adjoint gates: H, X, Y, Z, CX, SWAP, etc.
}

/** Extrapolate to zero noise using the chosen method. */
function extrapolate(
  data: { scale: number; value: number }[],
  method: ExtrapolationMethod,
): { mitigated: number; coefficients: number[] } {
  const x = data.map(d => d.scale);
  const y = data.map(d => d.value);

  if (method === "exponential" && y.every(v => v > 0)) {
    // Fit y = a * exp(b * x), extrapolate to x=0 → a
    const lnY = y.map(v => Math.log(v));
    const { a, b } = linearFit(x, lnY);
    return { mitigated: Math.exp(a), coefficients: [Math.exp(a), b] };
  }

  if (method === "polynomial" && data.length >= 3) {
    // Quadratic fit: y = c0 + c1*x + c2*x²
    const { c0, c1, c2 } = quadraticFit(x, y);
    return { mitigated: c0, coefficients: [c0, c1, c2] };
  }

  // Linear fit: y = a + b*x, extrapolate to x=0 → a
  const { a, b } = linearFit(x, y);
  return { mitigated: a, coefficients: [a, b] };
}

function linearFit(x: number[], y: number[]): { a: number; b: number } {
  const n = x.length;
  const sx = x.reduce((s, v) => s + v, 0);
  const sy = y.reduce((s, v) => s + v, 0);
  const sxy = x.reduce((s, v, i) => s + v * y[i], 0);
  const sxx = x.reduce((s, v) => s + v * v, 0);
  const denom = n * sxx - sx * sx;
  if (Math.abs(denom) < 1e-15) return { a: sy / n, b: 0 };
  const b = (n * sxy - sx * sy) / denom;
  const a = (sy - b * sx) / n;
  return { a, b };
}

function quadraticFit(x: number[], y: number[]): { c0: number; c1: number; c2: number } {
  // Solve via normal equations for degree-2 polynomial
  const n = x.length;
  const X = x.map(xi => [1, xi, xi * xi]);
  // XᵀX
  const XtX = Array.from({ length: 3 }, (_, i) =>
    Array.from({ length: 3 }, (_, j) =>
      X.reduce((s, row) => s + row[i] * row[j], 0)
    )
  );
  // Xᵀy
  const Xty = Array.from({ length: 3 }, (_, i) =>
    X.reduce((s, row, k) => s + row[i] * y[k], 0)
  );
  // Solve 3×3 system via Cramer's rule
  const det3 = (m: number[][]) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

  const D = det3(XtX);
  if (Math.abs(D) < 1e-15) {
    const { a, b } = linearFit(x, y);
    return { c0: a, c1: b, c2: 0 };
  }

  const replace = (col: number) => XtX.map((row, i) => row.map((v, j) => j === col ? Xty[i] : v));
  return { c0: det3(replace(0)) / D, c1: det3(replace(1)) / D, c2: det3(replace(2)) / D };
}

// ══════════════════════════════════════════════════════════════════════════
// 2. Measurement Error Mitigation (MEM)
// ══════════════════════════════════════════════════════════════════════════

export interface CalibrationMatrix {
  /** n×n response matrix M[i][j] = P(measure i | prepared j). */
  matrix: number[][];
  /** Inverse matrix M⁻¹ for correction. */
  inverse: number[][];
  /** Number of qubits. */
  numQubits: number;
  /** Calibration fidelity (average diagonal element). */
  fidelity: number;
}

export interface MemResult {
  /** Raw (noisy) counts. */
  rawCounts: Record<string, number>;
  /** Mitigated counts after applying M⁻¹. */
  mitigatedCounts: Record<string, number>;
  /** Calibration matrix used. */
  calibration: CalibrationMatrix;
}

/**
 * Build the measurement calibration matrix by preparing each
 * computational basis state and measuring readout probabilities.
 *
 * For n qubits, prepares 2^n calibration circuits (one per basis state).
 */
export function buildCalibrationMatrix(
  numQubits: number,
  noise: NoiseModel,
  shots: number = 8192,
): CalibrationMatrix {
  const dim = 1 << numQubits;
  const matrix: number[][] = Array.from({ length: dim }, () => new Array(dim).fill(0));

  for (let prepared = 0; prepared < dim; prepared++) {
    // Build circuit to prepare |prepared⟩
    const ops: SimOp[] = [];
    for (let q = 0; q < numQubits; q++) {
      if ((prepared >> (numQubits - 1 - q)) & 1) {
        ops.push({ gate: "x", qubits: [q] });
      }
    }

    const state = createState(numQubits);
    state.ops = ops;
    state.noise = { ...noNoise(), measurementError: noise.measurementError };
    const counts = measure(state, shots);

    for (const [bitstring, count] of Object.entries(counts)) {
      const measured = parseInt(bitstring, 2);
      matrix[measured][prepared] = count / shots;
    }
  }

  const inverse = invertMatrix(matrix);
  const fidelity = matrix.reduce((s, row, i) => s + row[i], 0) / dim;

  return { matrix, inverse, numQubits, fidelity };
}

/**
 * Apply measurement error mitigation to raw counts using calibration matrix.
 */
export function applyMeasurementMitigation(
  rawCounts: Record<string, number>,
  calibration: CalibrationMatrix,
): MemResult {
  const { numQubits, inverse } = calibration;
  const dim = 1 << numQubits;
  const totalShots = Object.values(rawCounts).reduce((s, c) => s + c, 0);

  // Convert counts to probability vector
  const rawProbs = new Array(dim).fill(0);
  for (const [bits, count] of Object.entries(rawCounts)) {
    rawProbs[parseInt(bits, 2)] = count / totalShots;
  }

  // Apply M⁻¹
  const correctedProbs = new Array(dim).fill(0);
  for (let i = 0; i < dim; i++) {
    for (let j = 0; j < dim; j++) {
      correctedProbs[i] += inverse[i][j] * rawProbs[j];
    }
  }

  // Clip negative probabilities and renormalize (standard technique)
  for (let i = 0; i < dim; i++) correctedProbs[i] = Math.max(0, correctedProbs[i]);
  const total = correctedProbs.reduce((s: number, p: number) => s + p, 0);
  if (total > 0) for (let i = 0; i < dim; i++) correctedProbs[i] /= total;

  // Convert back to counts
  const mitigatedCounts: Record<string, number> = {};
  for (let i = 0; i < dim; i++) {
    const c = Math.round(correctedProbs[i] * totalShots);
    if (c > 0) {
      mitigatedCounts[i.toString(2).padStart(numQubits, "0")] = c;
    }
  }

  return { rawCounts, mitigatedCounts, calibration };
}

/** Invert a square matrix using Gauss-Jordan elimination. */
function invertMatrix(m: number[][]): number[][] {
  const n = m.length;
  // Augmented matrix [M | I]
  const aug = m.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => i === j ? 1 : 0)]);

  for (let col = 0; col < n; col++) {
    // Partial pivoting
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

    const pivot = aug[col][col];
    if (Math.abs(pivot) < 1e-12) continue; // Singular — skip

    // Scale pivot row
    for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot;

    // Eliminate column
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = 0; j < 2 * n; j++) aug[row][j] -= factor * aug[col][j];
    }
  }

  return aug.map(row => row.slice(n));
}

// ══════════════════════════════════════════════════════════════════════════
// 3. Randomized Compiling (RC)
// ══════════════════════════════════════════════════════════════════════════

export interface RcResult {
  /** Averaged mitigated counts across all randomized compilations. */
  mitigatedCounts: Record<string, number>;
  /** Number of random compilations used. */
  numCompilations: number;
  /** Individual compilation counts (for statistical analysis). */
  compilationCounts: Record<string, number>[];
}

/** Pauli gate set for twirling. */
const PAULI_SET: { gate: string; inverse: string }[] = [
  { gate: "id", inverse: "id" },
  { gate: "x", inverse: "x" },
  { gate: "y", inverse: "y" },
  { gate: "z", inverse: "z" },
];

/**
 * Randomized compiling: twirl each Clifford gate with random Paulis
 * to convert coherent errors into stochastic depolarizing noise.
 *
 * @param ops             Original circuit operations
 * @param numQubits       Number of qubits
 * @param noise           Noise model
 * @param numCompilations Number of random compilations to average
 * @param shots           Shots per compilation
 */
export function randomizedCompiling(
  ops: SimOp[],
  numQubits: number,
  noise: NoiseModel,
  numCompilations: number = 16,
  shots: number = 4096,
): RcResult {
  const compilationCounts: Record<string, number>[] = [];

  for (let c = 0; c < numCompilations; c++) {
    // Generate random Pauli frame for each qubit at each gate layer
    const twirlOps = twirlCircuit(ops, numQubits);

    const state = createState(numQubits);
    state.ops = twirlOps;
    state.noise = noise;
    const counts = measure(state, shots);
    compilationCounts.push(counts);
  }

  // Average counts across compilations
  const totalShots = numCompilations * shots;
  const accumulated: Record<string, number> = {};
  for (const counts of compilationCounts) {
    for (const [bits, count] of Object.entries(counts)) {
      accumulated[bits] = (accumulated[bits] || 0) + count;
    }
  }

  // Normalize to total shots
  const mitigatedCounts: Record<string, number> = {};
  for (const [bits, count] of Object.entries(accumulated)) {
    mitigatedCounts[bits] = Math.round(count);
  }

  return { mitigatedCounts, numCompilations, compilationCounts };
}

/**
 * Twirl a circuit with random Pauli gates before and after each Clifford gate.
 * For non-Clifford gates, skip twirling.
 */
function twirlCircuit(ops: SimOp[], numQubits: number): SimOp[] {
  const cliffordGates = new Set(["h", "x", "y", "z", "s", "sdg", "cx", "cz", "swap", "ccx"]);
  const result: SimOp[] = [];

  for (const op of ops) {
    if (!cliffordGates.has(op.gate)) {
      result.push(op);
      continue;
    }

    if (op.qubits.length === 1) {
      // Single-qubit twirl: P · G · P†
      const pauli = PAULI_SET[Math.floor(Math.random() * 4)];
      if (pauli.gate !== "id") result.push({ gate: pauli.gate, qubits: [...op.qubits] });
      result.push(op);
      if (pauli.inverse !== "id") result.push({ gate: pauli.inverse, qubits: [...op.qubits] });
    } else if (op.qubits.length === 2) {
      // Two-qubit twirl: (P₁⊗P₂) · G · (P₁†⊗P₂†)
      const p0 = PAULI_SET[Math.floor(Math.random() * 4)];
      const p1 = PAULI_SET[Math.floor(Math.random() * 4)];
      if (p0.gate !== "id") result.push({ gate: p0.gate, qubits: [op.qubits[0]] });
      if (p1.gate !== "id") result.push({ gate: p1.gate, qubits: [op.qubits[1]] });
      result.push(op);
      if (p0.inverse !== "id") result.push({ gate: p0.inverse, qubits: [op.qubits[0]] });
      if (p1.inverse !== "id") result.push({ gate: p1.inverse, qubits: [op.qubits[1]] });
    } else {
      result.push(op);
    }
  }

  return result;
}

// ══════════════════════════════════════════════════════════════════════════
// 4. Full Mitigation Pipeline: RC → ZNE → MEM
// ══════════════════════════════════════════════════════════════════════════

export interface FullMitigationResult {
  /** Final mitigated counts. */
  counts: Record<string, number>;
  /** ZNE result (if applied). */
  zne?: ZneResult;
  /** MEM result (if applied). */
  mem?: MemResult;
  /** RC result (if applied). */
  rc?: RcResult;
  /** Stages applied in order. */
  stages: string[];
}

export interface MitigationConfig {
  enableZne?: boolean;
  enableMem?: boolean;
  enableRc?: boolean;
  zneScales?: number[];
  zneMethod?: ExtrapolationMethod;
  rcCompilations?: number;
  shots?: number;
}

/**
 * Run the full error mitigation pipeline.
 * Composable: RC → ZNE → MEM (gold-standard ordering).
 */
export function mitigateFull(
  ops: SimOp[],
  numQubits: number,
  noise: NoiseModel,
  config: MitigationConfig = {},
): FullMitigationResult {
  const {
    enableZne = true,
    enableMem = true,
    enableRc = true,
    zneScales = [1, 1.5, 2, 2.5, 3],
    zneMethod = "polynomial",
    rcCompilations = 16,
    shots = 8192,
  } = config;

  const stages: string[] = [];
  let rc: RcResult | undefined;
  let zne: ZneResult | undefined;
  let mem: MemResult | undefined;

  // Stage 1: Randomized Compiling
  let workingOps = ops;
  if (enableRc) {
    rc = randomizedCompiling(ops, numQubits, noise, rcCompilations, shots);
    stages.push("randomized_compiling");
  }

  // Stage 2: Zero-Noise Extrapolation
  if (enableZne) {
    zne = zeroNoiseExtrapolation(workingOps, numQubits, noise, undefined, zneScales, shots, zneMethod);
    stages.push("zero_noise_extrapolation");
  }

  // Stage 3: Measurement Error Mitigation
  // Run the circuit to get raw counts
  const state = createState(numQubits);
  state.ops = enableRc && rc ? [] : workingOps; // RC already ran
  state.noise = noise;
  let rawCounts = enableRc && rc ? rc.mitigatedCounts : measure(state, shots);

  if (enableMem && noise.measurementError > 0) {
    const calibration = buildCalibrationMatrix(numQubits, noise, shots);
    mem = applyMeasurementMitigation(rawCounts, calibration);
    stages.push("measurement_error_mitigation");
    rawCounts = mem.mitigatedCounts;
  }

  return { counts: rawCounts, zne, mem, rc, stages };
}
