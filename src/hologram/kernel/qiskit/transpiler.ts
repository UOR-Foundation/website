/**
 * Transpiler — Qiskit 2.2-compatible circuit transpilation
 * ════════════════════════════════════════════════════════
 *
 * Decomposes arbitrary gates into a target basis gate set.
 * Mirrors qiskit.transpile() and qiskit.transpiler.Target.
 *
 * Default basis: { RZ, SX, CX } (IBM Eagle/Heron native)
 *
 * @see https://docs.quantum.ibm.com/api/qiskit/transpiler
 */

import { QuantumCircuit, type CircuitInstruction } from "./quantum-circuit";

// ── Target (Qiskit 2.2 feature) ───────────────────────────────────────────

export interface TargetEntry {
  gate: string;
  num_qubits: number;
  properties?: Record<string, { error_rate?: number; gate_time?: number }>;
  angle_bounds?: [number, number]; // Qiskit 2.2: angle constraints
}

export class Target {
  readonly num_qubits: number;
  private _entries: Map<string, TargetEntry> = new Map();

  constructor(num_qubits: number) {
    this.num_qubits = num_qubits;
  }

  /** Add an instruction to the target */
  add_instruction(entry: TargetEntry): void {
    this._entries.set(entry.gate, entry);
  }

  /** Get supported operation names */
  operation_names(): string[] {
    return Array.from(this._entries.keys());
  }

  /** Check if a gate is in the target basis */
  has(gate: string): boolean {
    return this._entries.has(gate);
  }

  /** Get a target entry */
  get(gate: string): TargetEntry | undefined {
    return this._entries.get(gate);
  }
}

/** Pre-built target: IBM Eagle/Heron (RZ, SX, X, CX) */
export function ibm_eagle_target(num_qubits: number): Target {
  const t = new Target(num_qubits);
  t.add_instruction({ gate: "rz", num_qubits: 1 });
  t.add_instruction({ gate: "sx", num_qubits: 1 });
  t.add_instruction({ gate: "x", num_qubits: 1 });
  t.add_instruction({ gate: "cx", num_qubits: 2 });
  return t;
}

/** Pre-built target: IBM Heron (RZ, SX, CZ) */
export function ibm_heron_target(num_qubits: number): Target {
  const t = new Target(num_qubits);
  t.add_instruction({ gate: "rz", num_qubits: 1 });
  t.add_instruction({ gate: "sx", num_qubits: 1 });
  t.add_instruction({ gate: "x", num_qubits: 1 });
  t.add_instruction({ gate: "cz", num_qubits: 2 });
  return t;
}

// ── Transpilation ─────────────────────────────────────────────────────────

export interface TranspileOptions {
  optimization_level?: 0 | 1 | 2 | 3;
  target?: Target;
  basis_gates?: string[];
  seed_transpiler?: number;
}

export interface TranspileResult {
  circuit: QuantumCircuit;
  /** Transpilation stats */
  stats: {
    original_depth: number;
    transpiled_depth: number;
    original_size: number;
    transpiled_size: number;
    original_ops: Record<string, number>;
    transpiled_ops: Record<string, number>;
    optimization_level: number;
    basis_gates: string[];
  };
}

/**
 * Transpile a circuit to a target basis gate set.
 * Mirrors qiskit.transpile() — decomposes high-level gates.
 */
export function transpile(
  circuit: QuantumCircuit,
  options?: TranspileOptions
): TranspileResult {
  const level = options?.optimization_level ?? 1;
  const basisGates = options?.basis_gates ??
    options?.target?.operation_names() ??
    ["rz", "sx", "x", "cx"];

  const basisSet = new Set(basisGates);
  const originalOps = circuit.count_ops();
  const originalDepth = circuit.depth;
  const originalSize = circuit.size;

  // Decompose instructions not in the basis set
  const result = new QuantumCircuit(circuit.num_qubits, circuit.num_clbits, `${circuit.name}_transpiled`);

  for (const inst of circuit.data) {
    if (inst.gate === "barrier" || inst.gate === "measure") {
      // Pass through
      if (inst.gate === "measure") result.measure(inst.qubits[0], inst.params?.[0] ?? inst.qubits[0]);
      else result.barrier(...inst.qubits);
      continue;
    }

    if (basisSet.has(inst.gate)) {
      // Already in basis — copy directly
      _appendRaw(result, inst);
      continue;
    }

    // Decompose
    const decomposed = _decompose(inst, basisSet);
    for (const d of decomposed) _appendRaw(result, d);
  }

  // Optimization passes
  if (level >= 1) _cancelAdjacentInverses(result);
  if (level >= 2) _mergeRotations(result);

  return {
    circuit: result,
    stats: {
      original_depth: originalDepth,
      transpiled_depth: result.depth,
      original_size: originalSize,
      transpiled_size: result.size,
      original_ops: originalOps,
      transpiled_ops: result.count_ops(),
      optimization_level: level,
      basis_gates: basisGates,
    },
  };
}

// ── Gate Decomposition Rules ──────────────────────────────────────────────

function _decompose(inst: CircuitInstruction, basis: Set<string>): CircuitInstruction[] {
  const { gate, qubits, params } = inst;
  const q = qubits;
  const PI = Math.PI;

  // H = RZ(π) · SX · RZ(π) or RZ(π/2) · SX · RZ(π/2)
  if (gate === "h") {
    if (basis.has("sx") && basis.has("rz")) {
      return [
        { gate: "rz", qubits: [q[0]], params: [PI / 2] },
        { gate: "sx", qubits: [q[0]] },
        { gate: "rz", qubits: [q[0]], params: [PI / 2] },
      ];
    }
    return [{ gate: "h", qubits: [q[0]] }]; // fallback
  }

  // Y = SX · RZ(π) · SX† ... simplified: just Z · X
  if (gate === "y") {
    return [
      ..._decompose({ gate: "z", qubits: [q[0]] }, basis),
      ..._decompose({ gate: "x", qubits: [q[0]] }, basis),
    ];
  }

  // Z = RZ(π)
  if (gate === "z") {
    if (basis.has("rz")) return [{ gate: "rz", qubits: [q[0]], params: [PI] }];
    return [{ gate: "z", qubits: [q[0]] }];
  }

  // S = RZ(π/2)
  if (gate === "s") {
    if (basis.has("rz")) return [{ gate: "rz", qubits: [q[0]], params: [PI / 2] }];
    return [{ gate: "s", qubits: [q[0]] }];
  }

  // SDG = RZ(-π/2)
  if (gate === "sdg") {
    if (basis.has("rz")) return [{ gate: "rz", qubits: [q[0]], params: [-PI / 2] }];
    return [{ gate: "sdg", qubits: [q[0]] }];
  }

  // T = RZ(π/4)
  if (gate === "t") {
    if (basis.has("rz")) return [{ gate: "rz", qubits: [q[0]], params: [PI / 4] }];
    return [{ gate: "t", qubits: [q[0]] }];
  }

  // TDG = RZ(-π/4)
  if (gate === "tdg") {
    if (basis.has("rz")) return [{ gate: "rz", qubits: [q[0]], params: [-PI / 4] }];
    return [{ gate: "tdg", qubits: [q[0]] }];
  }

  // RX(θ) = H · RZ(θ) · H = RZ(π/2) · SX · RZ(θ+π) · SX · RZ(π/2)
  if (gate === "rx") {
    const theta = params?.[0] ?? 0;
    if (basis.has("rz") && basis.has("sx")) {
      return [
        { gate: "rz", qubits: [q[0]], params: [PI / 2] },
        { gate: "sx", qubits: [q[0]] },
        { gate: "rz", qubits: [q[0]], params: [theta + PI] },
        { gate: "sx", qubits: [q[0]] },
        { gate: "rz", qubits: [q[0]], params: [5 * PI / 2] },
      ];
    }
    return [{ gate: "rx", qubits: [q[0]], params: [theta] }];
  }

  // RY(θ) = SX · RZ(θ) · SX†
  if (gate === "ry") {
    const theta = params?.[0] ?? 0;
    if (basis.has("rz") && basis.has("sx")) {
      return [
        { gate: "sx", qubits: [q[0]] },
        { gate: "rz", qubits: [q[0]], params: [theta] },
        { gate: "sx", qubits: [q[0]] },
        { gate: "rz", qubits: [q[0]], params: [PI] },  // SX† ≈ SX·RZ(π)
      ];
    }
    return [{ gate: "ry", qubits: [q[0]], params: [theta] }];
  }

  // P(λ) = RZ(λ) (up to global phase)
  if (gate === "p") {
    if (basis.has("rz")) return [{ gate: "rz", qubits: [q[0]], params: [params?.[0] ?? 0] }];
    return [{ gate: "p", qubits: [q[0]], params }];
  }

  // SX = √X — already in most basis sets
  if (gate === "sx") {
    if (basis.has("rx")) return [{ gate: "rx", qubits: [q[0]], params: [PI / 2] }];
    return [{ gate: "sx", qubits: [q[0]] }];
  }

  // CZ = H·CX·H (on target)
  if (gate === "cz") {
    if (basis.has("cx")) {
      return [
        ..._decompose({ gate: "h", qubits: [q[1]] }, basis),
        { gate: "cx", qubits: [q[0], q[1]] },
        ..._decompose({ gate: "h", qubits: [q[1]] }, basis),
      ];
    }
    return [{ gate: "cz", qubits: [q[0], q[1]] }];
  }

  // SWAP = 3 CX
  if (gate === "swap") {
    const two = basis.has("cx") ? "cx" : "cz";
    if (two === "cx") {
      return [
        { gate: "cx", qubits: [q[0], q[1]] },
        { gate: "cx", qubits: [q[1], q[0]] },
        { gate: "cx", qubits: [q[0], q[1]] },
      ];
    }
    return [{ gate: "swap", qubits: [q[0], q[1]] }];
  }

  // CCX (Toffoli) decomposition into 6 CX + single-qubit
  if (gate === "ccx") {
    if (basis.has("cx")) {
      return [
        ..._decompose({ gate: "h", qubits: [q[2]] }, basis),
        { gate: "cx", qubits: [q[1], q[2]] },
        ..._decompose({ gate: "tdg", qubits: [q[2]] }, basis),
        { gate: "cx", qubits: [q[0], q[2]] },
        ..._decompose({ gate: "t", qubits: [q[2]] }, basis),
        { gate: "cx", qubits: [q[1], q[2]] },
        ..._decompose({ gate: "tdg", qubits: [q[2]] }, basis),
        { gate: "cx", qubits: [q[0], q[2]] },
        ..._decompose({ gate: "t", qubits: [q[1]] }, basis),
        ..._decompose({ gate: "t", qubits: [q[2]] }, basis),
        ..._decompose({ gate: "h", qubits: [q[2]] }, basis),
        { gate: "cx", qubits: [q[0], q[1]] },
        ..._decompose({ gate: "t", qubits: [q[0]] }, basis),
        ..._decompose({ gate: "tdg", qubits: [q[1]] }, basis),
        { gate: "cx", qubits: [q[0], q[1]] },
      ];
    }
    return [{ gate: "ccx", qubits: [q[0], q[1], q[2]] }];
  }

  // U(θ,φ,λ) = RZ(φ) · RX(-π/2) · RZ(θ) · RX(π/2) · RZ(λ)
  if (gate === "u") {
    const [theta, phi, lam] = params ?? [0, 0, 0];
    if (basis.has("rz") && basis.has("sx")) {
      return [
        { gate: "rz", qubits: [q[0]], params: [lam] },
        { gate: "sx", qubits: [q[0]] },
        { gate: "rz", qubits: [q[0]], params: [theta] },
        { gate: "sx", qubits: [q[0]] },
        { gate: "rz", qubits: [q[0]], params: [phi + PI] },
      ];
    }
    return [{ gate: "u", qubits: [q[0]], params: [theta, phi, lam] }];
  }

  // Controlled rotations: CRX, CRY, CRZ decompose into 2 CX + rotations
  if (gate === "crx" || gate === "cry" || gate === "crz") {
    const theta = params?.[0] ?? 0;
    const baseGate = gate.slice(1); // rx, ry, rz
    return [
      ..._decompose({ gate: baseGate, qubits: [q[1]], params: [theta / 2] }, basis),
      { gate: "cx", qubits: [q[0], q[1]] },
      ..._decompose({ gate: baseGate, qubits: [q[1]], params: [-theta / 2] }, basis),
      { gate: "cx", qubits: [q[0], q[1]] },
    ];
  }

  // Fallback: keep as-is
  return [{ gate, qubits: [...qubits], params: params ? [...params] : undefined }];
}

// ── Optimization Passes ──────────────────────────────────────────────────

/** Level 1: Cancel adjacent inverse pairs (XX, HH, etc.) */
function _cancelAdjacentInverses(_circuit: QuantumCircuit): void {
  // Operates on internal _data — simplified version
  const data = ((_circuit as any)._data as CircuitInstruction[]);
  let i = 0;
  while (i < data.length - 1) {
    const a = data[i], b = data[i + 1];
    if (a.gate === b.gate && a.qubits.length === b.qubits.length &&
        a.qubits.every((q, j) => q === b.qubits[j])) {
      const selfInverse = new Set(["x", "h", "cx", "cz", "swap", "ccx"]);
      if (selfInverse.has(a.gate)) {
        data.splice(i, 2);
        if (i > 0) i--; // recheck previous
        continue;
      }
    }
    i++;
  }
}

/** Level 2: Merge adjacent rotations on the same qubit */
function _mergeRotations(_circuit: QuantumCircuit): void {
  const data = ((_circuit as any)._data as CircuitInstruction[]);
  let i = 0;
  while (i < data.length - 1) {
    const a = data[i], b = data[i + 1];
    if (a.gate === b.gate && a.qubits.length === 1 && b.qubits.length === 1 &&
        a.qubits[0] === b.qubits[0] && a.params && b.params) {
      if (["rz", "rx", "ry", "p"].includes(a.gate)) {
        const merged = (a.params[0] ?? 0) + (b.params[0] ?? 0);
        // Remove if angle ≈ 0
        if (Math.abs(merged % (2 * Math.PI)) < 1e-10) {
          data.splice(i, 2);
          if (i > 0) i--;
        } else {
          a.params = [merged % (2 * Math.PI)];
          data.splice(i + 1, 1);
        }
        continue;
      }
    }
    i++;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────

function _appendRaw(circuit: QuantumCircuit, inst: CircuitInstruction): void {
  (circuit as any)._data.push({
    gate: inst.gate,
    qubits: [...inst.qubits],
    params: inst.params ? [...inst.params] : undefined,
  });
}
