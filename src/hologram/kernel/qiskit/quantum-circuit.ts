/**
 * QuantumCircuit — Qiskit 2.2-compatible circuit construction API
 * ═══════════════════════════════════════════════════════════════
 *
 * A faithful TypeScript projection of Qiskit's QuantumCircuit class.
 * All computation delegated to the Q-Simulator statevector engine.
 *
 * Usage mirrors Qiskit Python exactly:
 *   const qc = new QuantumCircuit(2);
 *   qc.h(0);
 *   qc.cx(0, 1);
 *   qc.measure_all();
 *
 * @see https://docs.quantum.ibm.com/api/qiskit/qiskit.circuit.QuantumCircuit
 */

import {
  createState,
  simulateCircuit,
  measure as simMeasure,
  formatStatevector,
  toOpenQASM,
  entanglementMap,
  type SimulatorState,
  type SimOp,
} from "@/hologram/kernel/q-simulator";

// ── Types ──────────────────────────────────────────────────────────────────

export interface CircuitInstruction {
  gate: string;
  qubits: number[];
  params?: number[];
  label?: string;
}

export interface CircuitMetadata {
  name: string;
  num_qubits: number;
  num_clbits: number;
  global_phase: number;
  created_at: string;
}

export type DrawStyle = "text" | "mpl" | "latex";

// ── QuantumCircuit Class ───────────────────────────────────────────────────

export class QuantumCircuit {
  /** Human-readable name */
  readonly name: string;
  /** Number of quantum bits */
  readonly num_qubits: number;
  /** Number of classical bits */
  readonly num_clbits: number;
  /** Global phase (radians) */
  global_phase = 0;
  /** Ordered instruction list */
  private _data: CircuitInstruction[] = [];
  /** Whether measure_all() has been called */
  private _measured = false;
  /** Internal simulator state (lazy) */
  private _simState: SimulatorState | null = null;
  /** Cached counts from last run */
  private _lastCounts: Record<string, number> | null = null;

  constructor(num_qubits: number, num_clbits?: number, name?: string) {
    this.num_qubits = num_qubits;
    this.num_clbits = num_clbits ?? num_qubits;
    this.name = name ?? `circuit-${num_qubits}`;
  }

  // ── Property Accessors ─────────────────────────────────────────────────

  /** All circuit instructions in order */
  get data(): ReadonlyArray<CircuitInstruction> { return this._data; }

  /** Number of operations (excluding barriers) */
  get size(): number { return this._data.filter(d => d.gate !== "barrier").length; }

  /** Circuit depth (longest path through the DAG) */
  get depth(): number {
    const slotDepth = new Array(this.num_qubits).fill(0);
    for (const inst of this._data) {
      if (inst.gate === "barrier") continue;
      const maxD = Math.max(...inst.qubits.map(q => slotDepth[q]));
      for (const q of inst.qubits) slotDepth[q] = maxD + 1;
    }
    return Math.max(...slotDepth, 0);
  }

  /** Width = num_qubits + num_clbits */
  get width(): number { return this.num_qubits + this.num_clbits; }

  /** Gate count breakdown */
  count_ops(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const inst of this._data) {
      if (inst.gate === "barrier") continue;
      counts[inst.gate] = (counts[inst.gate] || 0) + 1;
    }
    return counts;
  }

  /** Number of non-local (2Q+) gates */
  num_nonlocal_gates(): number {
    return this._data.filter(d => d.qubits.length >= 2 && d.gate !== "barrier").length;
  }

  // ── Single-Qubit Gates ─────────────────────────────────────────────────

  /** Hadamard gate */
  h(qubit: number): this { return this._append("h", [qubit]); }
  /** Pauli-X (NOT) gate */
  x(qubit: number): this { return this._append("x", [qubit]); }
  /** Pauli-Y gate */
  y(qubit: number): this { return this._append("y", [qubit]); }
  /** Pauli-Z gate */
  z(qubit: number): this { return this._append("z", [qubit]); }
  /** S (√Z) gate */
  s(qubit: number): this { return this._append("s", [qubit]); }
  /** S† (inverse √Z) gate */
  sdg(qubit: number): this { return this._append("sdg", [qubit]); }
  /** T (π/8) gate */
  t(qubit: number): this { return this._append("t", [qubit]); }
  /** T† gate */
  tdg(qubit: number): this { return this._append("tdg", [qubit]); }
  /** √X gate */
  sx(qubit: number): this { return this._append("sx", [qubit]); }
  /** √X† gate */
  sxdg(qubit: number): this { return this._append("sxdg", [qubit]); }
  /** Identity gate */
  id(qubit: number): this { return this._append("id", [qubit]); }

  // ── Parameterized Single-Qubit Gates ───────────────────────────────────

  /** Rotation around X-axis */
  rx(theta: number, qubit: number): this { return this._append("rx", [qubit], [theta]); }
  /** Rotation around Y-axis */
  ry(theta: number, qubit: number): this { return this._append("ry", [qubit], [theta]); }
  /** Rotation around Z-axis */
  rz(phi: number, qubit: number): this { return this._append("rz", [qubit], [phi]); }
  /** Phase gate P(λ) = diag(1, e^iλ) */
  p(lam: number, qubit: number): this { return this._append("p", [qubit], [lam]); }
  /** Generic single-qubit unitary U(θ, φ, λ) */
  u(theta: number, phi: number, lam: number, qubit: number): this {
    return this._append("u", [qubit], [theta, phi, lam]);
  }

  // ── Two-Qubit Gates ────────────────────────────────────────────────────

  /** Controlled-X (CNOT) */
  cx(control: number, target: number): this { return this._append("cx", [control, target]); }
  /** Controlled-Z */
  cz(control: number, target: number): this { return this._append("cz", [control, target]); }
  /** Controlled-Y */
  cy(control: number, target: number): this { return this._append("cy", [control, target]); }
  /** Controlled-H */
  ch(control: number, target: number): this { return this._append("ch", [control, target]); }
  /** Controlled-S */
  cs(control: number, target: number): this { return this._append("cs", [control, target]); }
  /** Controlled-RX */
  crx(theta: number, control: number, target: number): this { return this._append("crx", [control, target], [theta]); }
  /** Controlled-RY */
  cry(theta: number, control: number, target: number): this { return this._append("cry", [control, target], [theta]); }
  /** Controlled-RZ */
  crz(theta: number, control: number, target: number): this { return this._append("crz", [control, target], [theta]); }
  /** SWAP gate */
  swap(qubit1: number, qubit2: number): this { return this._append("swap", [qubit1, qubit2]); }
  /** RXX interaction gate */
  rxx(theta: number, qubit1: number, qubit2: number): this { return this._append("rxx", [qubit1, qubit2], [theta]); }
  /** RZZ interaction gate */
  rzz(theta: number, qubit1: number, qubit2: number): this { return this._append("rzz", [qubit1, qubit2], [theta]); }

  // ── Three-Qubit Gates ──────────────────────────────────────────────────

  /** Toffoli (CCX) gate */
  ccx(c1: number, c2: number, target: number): this { return this._append("ccx", [c1, c2, target]); }
  /** Fredkin (CSWAP) gate */
  cswap(c: number, t1: number, t2: number): this { return this._append("cswap", [c, t1, t2]); }
  /** Multi-controlled X */
  mcx(controls: number[], target: number): this { return this._append("mcx", [...controls, target]); }

  // ── Non-Unitary Operations ─────────────────────────────────────────────

  /** Measure a single qubit into a classical bit */
  measure(qubit: number, clbit: number): this {
    this._measured = true;
    return this._append("measure", [qubit], [clbit]);
  }

  /** Add measurement to all qubits */
  measure_all(): this {
    this._measured = true;
    for (let i = 0; i < this.num_qubits; i++) {
      this._append("measure", [i], [i]);
    }
    return this;
  }

  /** Reset a qubit to |0⟩ */
  reset(qubit: number): this { return this._append("|0>", [qubit]); }

  /** Barrier — scheduling hint */
  barrier(...qubits: number[]): this {
    const qs = qubits.length > 0 ? qubits : Array.from({ length: this.num_qubits }, (_, i) => i);
    return this._append("barrier", qs);
  }

  // ── Circuit Composition ────────────────────────────────────────────────

  /** Compose another circuit onto this one */
  compose(other: QuantumCircuit, qubits?: number[]): this {
    const mapping = qubits ?? Array.from({ length: other.num_qubits }, (_, i) => i);
    for (const inst of other._data) {
      const mappedQubits = inst.qubits.map(q => mapping[q]);
      this._append(inst.gate, mappedQubits, inst.params);
    }
    return this;
  }

  /** Return the inverse (adjoint) circuit */
  inverse(): QuantumCircuit {
    const inv = new QuantumCircuit(this.num_qubits, this.num_clbits, `${this.name}_dg`);
    inv.global_phase = -this.global_phase;
    // Reverse order, conjugate gates
    for (let i = this._data.length - 1; i >= 0; i--) {
      const inst = this._data[i];
      const daggerGate = _dagger(inst.gate, inst.params);
      inv._append(daggerGate.gate, inst.qubits, daggerGate.params);
    }
    return inv;
  }

  /** Deep copy */
  copy(name?: string): QuantumCircuit {
    const c = new QuantumCircuit(this.num_qubits, this.num_clbits, name ?? this.name);
    c.global_phase = this.global_phase;
    c._data = this._data.map(d => ({ ...d, qubits: [...d.qubits], params: d.params ? [...d.params] : undefined }));
    c._measured = this._measured;
    return c;
  }

  // ── Output / Visualization ─────────────────────────────────────────────

  /** Draw circuit as ASCII text (matches Qiskit text output style) */
  draw(style: DrawStyle = "text"): string {
    const n = this.num_qubits;
    const ops = this._data.filter(d => d.gate !== "barrier");
    if (ops.length === 0) {
      return Array.from({ length: n }, (_, i) => `q_${i}: ─`).join("\n");
    }

    // Assign each op to a time slot (greedy)
    const slots: CircuitInstruction[][] = [];
    const qubitSlot = new Array(n).fill(0);
    for (const op of ops) {
      const slot = Math.max(...op.qubits.map(q => qubitSlot[q]));
      if (!slots[slot]) slots[slot] = [];
      slots[slot].push(op);
      for (const q of op.qubits) qubitSlot[q] = slot + 1;
    }

    // Render
    const colWidth = 7;
    const lines: string[] = [];
    for (let q = 0; q < n; q++) {
      let wire = `q_${q}: `;
      for (let s = 0; s < slots.length; s++) {
        const op = slots[s].find(o => o.qubits.includes(q));
        if (op) {
          let sym = op.gate.toUpperCase();
          if (op.gate === "measure") sym = "M";
          if (op.gate === "|0>") sym = "|0⟩";
          if (op.qubits.length > 1) {
            const idx = op.qubits.indexOf(q);
            if (op.gate === "cx" || op.gate === "ccx" || op.gate === "mcx") {
              sym = idx === op.qubits.length - 1 ? "X" : "●";
            } else if (op.gate === "cz") {
              sym = "●";
            } else if (op.gate === "swap") {
              sym = "×";
            } else if (op.gate.startsWith("c") && idx === 0) {
              sym = "●";
            }
          }
          if (op.params && op.params.length > 0 && !["measure", "|0>"].includes(op.gate)) {
            const pStr = op.params.map(p => _fmtAngle(p)).join(",");
            sym += `(${pStr})`;
          }
          const padded = `┤ ${sym} ├`.padEnd(colWidth, "─");
          wire += padded;
        } else {
          wire += "──────".padEnd(colWidth, "─");
        }
      }
      wire += "──";
      lines.push(wire);
    }

    return lines.join("\n");
  }

  /** Export to OpenQASM 3.0 */
  qasm(version: 3 = 3): string {
    const state = this._buildSimState();
    return toOpenQASM(state).join("\n");
  }

  /** Get statevector after simulation */
  statevector(): { amplitudes: [number, number][]; probabilities: number[]; labels: string[] } {
    const state = this._simulate();
    const probs = state.stateVector.map(([r, i]) => r * r + i * i);
    const labels = state.stateVector.map((_, i) => i.toString(2).padStart(this.num_qubits, "0"));
    return { amplitudes: state.stateVector as [number, number][], probabilities: probs, labels };
  }

  /** Get entanglement map */
  entanglement(): ReturnType<typeof entanglementMap> {
    const state = this._simulate();
    return entanglementMap(state);
  }

  // ── Ensure physical (Qiskit 2.2 feature) ───────────────────────────────

  /** Ensure circuit uses physical qubit indices (no-op for us, always physical) */
  ensure_physical(): this { return this; }

  // ── Internal ───────────────────────────────────────────────────────────

  private _append(gate: string, qubits: number[], params?: number[]): this {
    // Validate qubit indices
    for (const q of qubits) {
      if (q < 0 || q >= this.num_qubits) {
        throw new Error(`CircuitError: qubit index ${q} out of range [0, ${this.num_qubits - 1}]`);
      }
    }
    const inst: CircuitInstruction = { gate, qubits: [...qubits] };
    if (params && params.length > 0) inst.params = [...params];
    this._data.push(inst);
    this._simState = null; // invalidate cache
    this._lastCounts = null;
    return this;
  }

  /** Build SimulatorState from instructions */
  _buildSimState(): SimulatorState {
    const state = createState(this.num_qubits);
    for (const inst of this._data) {
      if (inst.gate === "measure" || inst.gate === "barrier") continue;
      const op: SimOp = { gate: inst.gate, qubits: inst.qubits };
      if (inst.params) op.params = inst.params;
      state.ops.push(op);
    }
    if (this._measured) state.measured = true;
    return state;
  }

  /** Simulate and cache */
  private _simulate(): SimulatorState {
    if (!this._simState) {
      this._simState = this._buildSimState();
      simulateCircuit(this._simState);
    }
    return this._simState;
  }

  /** Run measurement and return counts */
  _run(shots: number): Record<string, number> {
    const state = this._simulate();
    this._lastCounts = simMeasure(state, shots);
    return this._lastCounts;
  }

  /** String representation */
  toString(): string { return this.draw(); }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function _dagger(gate: string, params?: number[]): { gate: string; params?: number[] } {
  const selfInverse = new Set(["h", "x", "y", "z", "cx", "cz", "swap", "ccx", "cswap", "id"]);
  if (selfInverse.has(gate)) return { gate, params };

  const dagMap: Record<string, string> = { s: "sdg", sdg: "s", t: "tdg", tdg: "t", sx: "sxdg", sxdg: "sx" };
  if (dagMap[gate]) return { gate: dagMap[gate] };

  // Parameterized: negate angle
  if (params && params.length > 0) {
    return { gate, params: params.map(p => -p) };
  }
  return { gate, params };
}

function _fmtAngle(rad: number): string {
  const pi = Math.PI;
  if (Math.abs(rad) < 1e-10) return "0";
  if (Math.abs(rad - pi) < 1e-10) return "π";
  if (Math.abs(rad + pi) < 1e-10) return "-π";
  if (Math.abs(rad - pi / 2) < 1e-10) return "π/2";
  if (Math.abs(rad + pi / 2) < 1e-10) return "-π/2";
  if (Math.abs(rad - pi / 4) < 1e-10) return "π/4";
  if (Math.abs(rad + pi / 4) < 1e-10) return "-π/4";
  if (Math.abs(rad - pi / 3) < 1e-10) return "π/3";
  if (Math.abs(rad - pi / 6) < 1e-10) return "π/6";
  // Check n*π/m for small m
  for (const m of [2, 3, 4, 6, 8]) {
    const n = Math.round(rad * m / pi);
    if (Math.abs(rad - n * pi / m) < 1e-10) {
      if (n === 1) return `π/${m}`;
      if (n === -1) return `-π/${m}`;
      return `${n}π/${m}`;
    }
  }
  return rad.toFixed(4);
}
