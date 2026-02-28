/**
 * Q-Simulator Test Suite
 * ══════════════════════
 *
 * Verifies the statevector quantum simulator produces correct results
 * for standard quantum circuits.
 */
import { describe, it, expect } from "vitest";
import {
  createState,
  applyOp,
  simulateCircuit,
  measure,
  formatStatevector,
  toOpenQASM,
  entanglementMap,
  quickRun,
} from "@/modules/qkernel/q-simulator";

describe("Q-Simulator: Statevector Engine", () => {
  it("initializes to |0...0⟩", () => {
    const s = createState(2);
    expect(s.stateVector[0]).toEqual([1, 0]);
    expect(s.stateVector[1]).toEqual([0, 0]);
    expect(s.stateVector[2]).toEqual([0, 0]);
    expect(s.stateVector[3]).toEqual([0, 0]);
  });

  it("X gate flips |0⟩ to |1⟩", () => {
    const s = createState(1);
    s.ops.push({ gate: "x", qubits: [0] });
    simulateCircuit(s);
    // |1⟩ = state[1]
    expect(Math.abs(s.stateVector[0][0])).toBeLessThan(1e-10);
    expect(Math.abs(s.stateVector[1][0] - 1)).toBeLessThan(1e-10);
  });

  it("H gate creates equal superposition", () => {
    const s = createState(1);
    s.ops.push({ gate: "h", qubits: [0] });
    simulateCircuit(s);
    const amp = 1 / Math.sqrt(2);
    expect(Math.abs(s.stateVector[0][0] - amp)).toBeLessThan(1e-10);
    expect(Math.abs(s.stateVector[1][0] - amp)).toBeLessThan(1e-10);
  });

  it("HH = I (Hadamard is self-inverse)", () => {
    const s = createState(1);
    s.ops.push({ gate: "h", qubits: [0] });
    s.ops.push({ gate: "h", qubits: [0] });
    simulateCircuit(s);
    expect(Math.abs(s.stateVector[0][0] - 1)).toBeLessThan(1e-10);
    expect(Math.abs(s.stateVector[1][0])).toBeLessThan(1e-10);
  });

  it("XX = I (Pauli-X is self-inverse)", () => {
    const s = createState(1);
    s.ops.push({ gate: "x", qubits: [0] });
    s.ops.push({ gate: "x", qubits: [0] });
    simulateCircuit(s);
    expect(Math.abs(s.stateVector[0][0] - 1)).toBeLessThan(1e-10);
  });

  it("Bell state: H then CNOT produces entanglement", () => {
    const s = createState(2);
    s.ops.push({ gate: "h", qubits: [0] });
    s.ops.push({ gate: "cx", qubits: [0, 1] });
    simulateCircuit(s);
    const amp = 1 / Math.sqrt(2);
    // |00⟩ and |11⟩ should have equal amplitude
    expect(Math.abs(s.stateVector[0][0] - amp)).toBeLessThan(1e-10); // |00⟩
    expect(Math.abs(s.stateVector[3][0] - amp)).toBeLessThan(1e-10); // |11⟩
    // |01⟩ and |10⟩ should be zero
    expect(Math.abs(s.stateVector[1][0])).toBeLessThan(1e-10); // |01⟩
    expect(Math.abs(s.stateVector[2][0])).toBeLessThan(1e-10); // |10⟩
  });

  it("Bell state measurement produces ~50/50 counts", () => {
    const s = createState(2);
    s.ops.push({ gate: "h", qubits: [0] });
    s.ops.push({ gate: "cx", qubits: [0, 1] });
    const counts = measure(s, 10000);
    // Should only have "00" and "11" outcomes
    expect(Object.keys(counts).sort()).toEqual(["00", "11"]);
    // Each should be roughly 50%
    expect(counts["00"]).toBeGreaterThan(4000);
    expect(counts["11"]).toBeGreaterThan(4000);
  });

  it("GHZ state on 3 qubits", () => {
    const s = createState(3);
    s.ops.push({ gate: "h", qubits: [0] });
    s.ops.push({ gate: "cx", qubits: [0, 1] });
    s.ops.push({ gate: "cx", qubits: [0, 2] });
    simulateCircuit(s);
    const amp = 1 / Math.sqrt(2);
    expect(Math.abs(s.stateVector[0][0] - amp)).toBeLessThan(1e-10); // |000⟩
    expect(Math.abs(s.stateVector[7][0] - amp)).toBeLessThan(1e-10); // |111⟩
  });

  it("SWAP gate exchanges qubit states", () => {
    const s = createState(2);
    s.ops.push({ gate: "x", qubits: [0] }); // |10⟩
    s.ops.push({ gate: "swap", qubits: [0, 1] }); // → |01⟩
    simulateCircuit(s);
    expect(Math.abs(s.stateVector[1][0] - 1)).toBeLessThan(1e-10); // |01⟩
  });

  it("Toffoli gate: CCX with both controls set", () => {
    const s = createState(3);
    s.ops.push({ gate: "x", qubits: [0] });
    s.ops.push({ gate: "x", qubits: [1] });
    s.ops.push({ gate: "ccx", qubits: [0, 1, 2] }); // |110⟩ → |111⟩
    simulateCircuit(s);
    expect(Math.abs(s.stateVector[7][0] - 1)).toBeLessThan(1e-10); // |111⟩
  });

  it("Toffoli gate: CCX with one control unset does nothing", () => {
    const s = createState(3);
    s.ops.push({ gate: "x", qubits: [0] }); // |100⟩
    s.ops.push({ gate: "ccx", qubits: [0, 1, 2] }); // should remain |100⟩
    simulateCircuit(s);
    expect(Math.abs(s.stateVector[4][0] - 1)).toBeLessThan(1e-10); // |100⟩
  });

  it("Z gate applies phase flip", () => {
    const s = createState(1);
    s.ops.push({ gate: "x", qubits: [0] }); // |1⟩
    s.ops.push({ gate: "z", qubits: [0] }); // -|1⟩
    simulateCircuit(s);
    expect(Math.abs(s.stateVector[1][0] + 1)).toBeLessThan(1e-10); // amplitude = -1
  });

  it("S gate: S² = Z", () => {
    const s = createState(1);
    s.ops.push({ gate: "x", qubits: [0] }); // |1⟩
    s.ops.push({ gate: "s", qubits: [0] });
    s.ops.push({ gate: "s", qubits: [0] }); // S² = Z
    simulateCircuit(s);
    // Z|1⟩ = -|1⟩
    expect(Math.abs(s.stateVector[1][0] + 1)).toBeLessThan(1e-10);
  });

  it("entanglement map detects Bell pair entanglement", () => {
    const s = createState(2);
    s.ops.push({ gate: "h", qubits: [0] });
    s.ops.push({ gate: "cx", qubits: [0, 1] });
    const emap = entanglementMap(s);
    expect(emap[0].entangled).toBe(true);
    expect(emap[1].entangled).toBe(true);
    expect(emap[0].purity).toBeCloseTo(0.5, 1);
  });

  it("separable qubits have purity 1", () => {
    const s = createState(2);
    s.ops.push({ gate: "x", qubits: [0] }); // |10⟩ — no entanglement
    const emap = entanglementMap(s);
    expect(emap[0].entangled).toBe(false);
    expect(emap[1].entangled).toBe(false);
    expect(emap[0].purity).toBeCloseTo(1, 3);
  });

  it("OpenQASM export produces valid header", () => {
    const s = createState(2);
    s.ops.push({ gate: "h", qubits: [0] });
    s.ops.push({ gate: "cx", qubits: [0, 1] });
    const qasm = toOpenQASM(s);
    expect(qasm[0]).toBe("OPENQASM 3.0;");
    expect(qasm.some(l => l.includes("qubit[2]"))).toBe(true);
    expect(qasm.some(l => l.includes("cx"))).toBe(true);
  });

  it("quickRun produces counts, statevector, and qasm", () => {
    const result = quickRun(2, [
      { gate: "h", qubits: [0] },
      { gate: "cx", qubits: [0, 1] },
    ], 1000);
    expect(Object.keys(result.counts).length).toBeGreaterThan(0);
    expect(result.statevector.length).toBeGreaterThan(0);
    expect(result.qasm[0]).toBe("OPENQASM 3.0;");
  });

  it("4-qubit circuit runs correctly", () => {
    const s = createState(4);
    for (let i = 0; i < 4; i++) s.ops.push({ gate: "h", qubits: [i] });
    simulateCircuit(s);
    // All 16 states should have equal probability 1/16
    const expected = 1 / 16;
    for (let i = 0; i < 16; i++) {
      const prob = s.stateVector[i][0] * s.stateVector[i][0] + s.stateVector[i][1] * s.stateVector[i][1];
      expect(Math.abs(prob - expected)).toBeLessThan(1e-10);
    }
  });
});
