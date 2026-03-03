/**
 * Qiskit SDK Projection — Test Suite
 * ═══════════════════════════════════
 *
 * Verifies the Qiskit 2.2 projection produces correct results
 * matching IBM's Qiskit SDK behavior.
 */
import { describe, it, expect } from "vitest";
import {
  QuantumCircuit,
  AerSimulator,
  Statevector,
  transpile,
  ibm_eagle_target,
} from "@/hologram/kernel/arch/qiskit";

describe("Qiskit Projection: QuantumCircuit", () => {
  it("constructs with correct metadata", () => {
    const qc = new QuantumCircuit(3, 3, "test");
    expect(qc.num_qubits).toBe(3);
    expect(qc.num_clbits).toBe(3);
    expect(qc.name).toBe("test");
    expect(qc.size).toBe(0);
    expect(qc.depth).toBe(0);
  });

  it("chains gate methods fluently", () => {
    const qc = new QuantumCircuit(2);
    qc.h(0).cx(0, 1).measure_all();
    expect(qc.size).toBe(4); // h + cx + 2 measures
    expect(qc.depth).toBe(3); // h→cx→measure on q0
  });

  it("validates qubit indices", () => {
    const qc = new QuantumCircuit(2);
    expect(() => qc.h(5)).toThrow("CircuitError");
  });

  it("count_ops returns correct breakdown", () => {
    const qc = new QuantumCircuit(3);
    qc.h(0).h(1).cx(0, 1).cx(1, 2);
    expect(qc.count_ops()).toEqual({ h: 2, cx: 2 });
  });

  it("draw produces valid ASCII", () => {
    const qc = new QuantumCircuit(2);
    qc.h(0).cx(0, 1);
    const text = qc.draw();
    expect(text).toContain("q_0:");
    expect(text).toContain("q_1:");
  });

  it("qasm exports OpenQASM 3.0", () => {
    const qc = new QuantumCircuit(2);
    qc.h(0).cx(0, 1);
    const qasm = qc.qasm();
    expect(qasm).toContain("OPENQASM 3.0");
    expect(qasm).toContain("qubit[2]");
  });

  it("inverse reverses circuit", () => {
    const qc = new QuantumCircuit(1);
    qc.h(0).t(0);
    const inv = qc.inverse();
    expect(inv.data.length).toBe(2);
    expect(inv.data[0].gate).toBe("tdg"); // T→T†
    expect(inv.data[1].gate).toBe("h");   // H→H
  });

  it("copy creates independent circuit", () => {
    const qc = new QuantumCircuit(2);
    qc.h(0);
    const copy = qc.copy("clone");
    copy.x(1);
    expect(qc.size).toBe(1);
    expect(copy.size).toBe(2);
    expect(copy.name).toBe("clone");
  });

  it("compose appends another circuit", () => {
    const a = new QuantumCircuit(2);
    a.h(0);
    const b = new QuantumCircuit(2);
    b.cx(0, 1);
    a.compose(b);
    expect(a.size).toBe(2);
    expect(a.data[1].gate).toBe("cx");
  });

  it("num_nonlocal_gates counts 2Q+ gates", () => {
    const qc = new QuantumCircuit(3);
    qc.h(0).h(1).cx(0, 1).ccx(0, 1, 2);
    expect(qc.num_nonlocal_gates()).toBe(2);
  });
});

describe("Qiskit Projection: AerSimulator", () => {
  it("Bell state produces ~50/50 counts", () => {
    const qc = new QuantumCircuit(2);
    qc.h(0).cx(0, 1);
    const sim = new AerSimulator();
    const result = sim.run(qc, { shots: 10000 });
    const counts = result.get_counts();
    expect(Object.keys(counts).sort()).toEqual(["00", "11"]);
    expect(counts["00"]).toBeGreaterThan(4000);
    expect(counts["11"]).toBeGreaterThan(4000);
    expect(result.success).toBe(true);
    expect(result.metadata.method).toBe("statevector");
  });

  it("quasi_dists sums to 1", () => {
    const qc = new QuantumCircuit(2);
    qc.h(0).cx(0, 1);
    const sim = new AerSimulator();
    const result = sim.run(qc, { shots: 1000 });
    const quasi = result.quasi_dists();
    const total = Object.values(quasi).reduce((s, v) => s + v, 0);
    expect(Math.abs(total - 1)).toBeLessThan(1e-10);
  });
});

describe("Qiskit Projection: Statevector", () => {
  it("Bell state has correct amplitudes", () => {
    const qc = new QuantumCircuit(2);
    qc.h(0).cx(0, 1);
    const sv = new Statevector(qc);
    const probs = sv.probabilities_dict();
    expect(Math.abs(probs["00"] - 0.5)).toBeLessThan(1e-10);
    expect(Math.abs(probs["11"] - 0.5)).toBeLessThan(1e-10);
    expect(probs["01"]).toBeUndefined(); // filtered
    expect(probs["10"]).toBeUndefined();
  });

  it("GHZ state on 3 qubits", () => {
    const qc = new QuantumCircuit(3);
    qc.h(0).cx(0, 1).cx(0, 2);
    const sv = new Statevector(qc);
    const probs = sv.probabilities_dict();
    expect(Math.abs(probs["000"] - 0.5)).toBeLessThan(1e-10);
    expect(Math.abs(probs["111"] - 0.5)).toBeLessThan(1e-10);
  });

  it("draw returns formatted string", () => {
    const qc = new QuantumCircuit(1);
    qc.h(0);
    const sv = new Statevector(qc);
    const text = sv.draw();
    expect(text).toContain("|0⟩");
    expect(text).toContain("|1⟩");
  });
});

describe("Qiskit Projection: Transpiler", () => {
  it("decomposes H to RZ+SX basis", () => {
    const qc = new QuantumCircuit(1);
    qc.h(0);
    const result = transpile(qc, { basis_gates: ["rz", "sx", "x", "cx"] });
    const ops = result.circuit.count_ops();
    expect(ops["h"]).toBeUndefined(); // H should be decomposed
    expect(ops["rz"]).toBeGreaterThan(0);
    expect(ops["sx"]).toBeGreaterThan(0);
    expect(result.stats.basis_gates).toContain("rz");
  });

  it("keeps basis gates unchanged", () => {
    const qc = new QuantumCircuit(2);
    qc.rz(Math.PI / 4, 0).sx(0).cx(0, 1);
    const result = transpile(qc, { basis_gates: ["rz", "sx", "cx"] });
    expect(result.circuit.size).toBe(3); // no expansion
  });

  it("Level 1: cancels adjacent inverses", () => {
    const qc = new QuantumCircuit(1);
    qc.x(0).x(0); // XX = I — stays in basis, cancels cleanly
    const result = transpile(qc, { optimization_level: 1, basis_gates: ["rz", "sx", "x", "cx"] });
    expect(result.stats.transpiled_size).toBe(0);
  });

  it("works with Target", () => {
    const qc = new QuantumCircuit(2);
    qc.h(0).cx(0, 1);
    const target = ibm_eagle_target(2);
    const result = transpile(qc, { target });
    expect(result.circuit.count_ops()["h"]).toBeUndefined();
  });

  it("transpile stats are correct", () => {
    const qc = new QuantumCircuit(2);
    qc.h(0).t(0).cx(0, 1);
    const result = transpile(qc);
    expect(result.stats.original_size).toBe(3);
    expect(result.stats.transpiled_size).toBeGreaterThan(0);
    expect(result.stats.optimization_level).toBe(1);
  });
});
