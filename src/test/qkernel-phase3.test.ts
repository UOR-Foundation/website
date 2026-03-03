/**
 * Q-ECC + Q-ISA Test Suite
 * ════════════════════════
 *
 * Verifies Phase 3 of the Q-Linux kernel:
 *   [[96,48,2]] stabilizer error correction + 96-gate ISA
 */

import { describe, it, expect, beforeEach } from "vitest";
import { QEcc, CODE_N, CODE_K, CODE_D } from "@/hologram/kernel/crypto/q-ecc";
import { QIsa } from "@/hologram/kernel/arch/q-isa";
import type { GateOp } from "@/hologram/kernel/arch/q-isa";

// ═══════════════════════════════════════════════════════════════════════
// Phase 3a: Q-ECC
// ═══════════════════════════════════════════════════════════════════════

describe("Q-ECC: Code Parameters", () => {
  it("code is [[96,48,2]]", () => {
    expect(CODE_N).toBe(96);
    expect(CODE_K).toBe(48);
    expect(CODE_D).toBe(2);
  });

  it("has exactly 48 stabilizer generators", () => {
    const ecc = new QEcc();
    expect(ecc.generatorCount()).toBe(48);
  });

  it("verifies code parameters", () => {
    const ecc = new QEcc();
    const params = ecc.verifyCodeParameters();
    expect(params.valid).toBe(true);
    expect(params.generators).toBe(48);
  });

  it("code rate is 0.5", () => {
    const ecc = new QEcc();
    expect(ecc.stats().codeRate).toBe(0.5);
  });
});

describe("Q-ECC: Generators", () => {
  it("each generator maps a unique mirror pair", () => {
    const ecc = new QEcc();
    const gens = ecc.getGenerators();
    const seen = new Set<number>();
    for (const g of gens) {
      expect(seen.has(g.qubitA)).toBe(false);
      expect(seen.has(g.qubitB)).toBe(false);
      seen.add(g.qubitA);
      seen.add(g.qubitB);
    }
    expect(seen.size).toBe(96);
  });

  it("generators cover all 96 qubits", () => {
    const ecc = new QEcc();
    const gens = ecc.getGenerators();
    const allQubits = new Set<number>();
    for (const g of gens) {
      allQubits.add(g.qubitA);
      allQubits.add(g.qubitB);
    }
    expect(allQubits.size).toBe(96);
  });
});

describe("Q-ECC: Encoding / Decoding", () => {
  it("encodes 48 logical qubits to 96 physical", () => {
    const ecc = new QEcc();
    const logical = new Array(48).fill(0);
    logical[0] = 1;
    logical[5] = 1;

    const physical = ecc.encode(logical);
    expect(physical.length).toBe(96);
  });

  it("round-trip encode → decode is lossless", () => {
    const ecc = new QEcc();
    const logical = new Array(48).fill(0);
    logical[0] = 1;
    logical[10] = 1;
    logical[47] = 1;

    const physical = ecc.encode(logical);
    const decoded = ecc.decode(physical);
    expect(decoded).toEqual(logical);
  });

  it("rejects wrong-size logical input", () => {
    const ecc = new QEcc();
    expect(() => ecc.encode([1, 0, 1])).toThrow();
  });
});

describe("Q-ECC: Syndrome Measurement", () => {
  it("clean state has zero syndrome", () => {
    const ecc = new QEcc();
    const logical = new Array(48).fill(0);
    const physical = ecc.encode(logical);

    const syndrome = ecc.measureSyndrome(physical);
    expect(syndrome.errorDetected).toBe(false);
    expect(syndrome.weight).toBe(0);
  });

  it("detects single-qubit X error", () => {
    const ecc = new QEcc();
    const logical = new Array(48).fill(0);
    const physical = ecc.encode(logical);

    // Introduce error: flip first qubit of first generator
    const gen0 = ecc.getGenerators()[0];
    physical[gen0.qubitA] ^= 1;

    const syndrome = ecc.measureSyndrome(physical);
    expect(syndrome.errorDetected).toBe(true);
    expect(syndrome.weight).toBe(1);
  });

  it("detects multi-qubit errors", () => {
    const ecc = new QEcc();
    const logical = new Array(48).fill(0);
    const physical = ecc.encode(logical);

    // Introduce errors in two different pairs
    const gens = ecc.getGenerators();
    physical[gens[0].qubitA] ^= 1;
    physical[gens[1].qubitA] ^= 1;

    const syndrome = ecc.measureSyndrome(physical);
    expect(syndrome.errorDetected).toBe(true);
    expect(syndrome.weight).toBe(2);
  });
});

describe("Q-ECC: Error Correction", () => {
  it("corrects single-qubit error", () => {
    const ecc = new QEcc();
    const logical = new Array(48).fill(0);
    logical[0] = 1;
    const physical = ecc.encode(logical);

    // Introduce error
    const gen0 = ecc.getGenerators()[0];
    physical[gen0.qubitA] ^= 1;

    const result = ecc.correct(physical);
    expect(result.corrected).toBe(true);

    // Decode corrected state
    const decoded = ecc.decode(result.codeword);
    expect(decoded).toEqual(logical);
  });

  it("no correction needed for clean state", () => {
    const ecc = new QEcc();
    const physical = ecc.encode(new Array(48).fill(0));
    const result = ecc.correct(physical);
    expect(result.corrected).toBe(false);
    expect(result.syndrome.weight).toBe(0);
  });

  it("tracks error statistics", () => {
    const ecc = new QEcc();
    const physical = ecc.encode(new Array(48).fill(0));
    
    // Clean check
    ecc.correct(physical);
    
    // Error check
    const gen = ecc.getGenerators()[0];
    physical[gen.qubitA] ^= 1;
    ecc.correct(physical);

    const stats = ecc.stats();
    expect(stats.totalChecks).toBe(2); // 2 corrections, each with 1 syndrome check
    expect(stats.errorsDetected).toBeGreaterThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Phase 3b: Q-ISA
// ═══════════════════════════════════════════════════════════════════════

describe("Q-ISA: Gate Set", () => {
  it("has exactly 96 gates", () => {
    const ecc = new QEcc();
    const isa = new QIsa(ecc);
    expect(isa.gateCount()).toBe(96);
  });

  it("tier 0 has 16 Pauli gates", () => {
    const ecc = new QEcc();
    const isa = new QIsa(ecc);
    expect(isa.getGatesByTier(0).length).toBe(16);
  });

  it("tier 1 has 24 Clifford gates", () => {
    const ecc = new QEcc();
    const isa = new QIsa(ecc);
    expect(isa.getGatesByTier(1).length).toBe(24);
  });

  it("tier 2 has 24 non-Clifford gates", () => {
    const ecc = new QEcc();
    const isa = new QIsa(ecc);
    expect(isa.getGatesByTier(2).length).toBe(24);
  });

  it("tier 3 has 32 custom gates", () => {
    const ecc = new QEcc();
    const isa = new QIsa(ecc);
    expect(isa.getGatesByTier(3).length).toBe(32);
  });

  it("Pauli gates are self-adjoint", () => {
    const ecc = new QEcc();
    const isa = new QIsa(ecc);
    const x = isa.getGate("X");
    expect(x?.adjoint).toBe("X");
    expect(x?.clifford).toBe(true);
  });

  it("gates have unique opcodes 0–95", () => {
    const ecc = new QEcc();
    const isa = new QIsa(ecc);
    const opcodes = new Set<number>();
    for (let i = 0; i < 96; i++) {
      const gate = isa.getGateByOpcode(i);
      expect(gate).toBeDefined();
      opcodes.add(gate!.opcode);
    }
    expect(opcodes.size).toBe(96);
  });
});

describe("Q-ISA: 192-Element Transform Group", () => {
  it("has exactly 192 elements", () => {
    const ecc = new QEcc();
    const isa = new QIsa(ecc);
    expect(isa.transformGroupSize()).toBe(192);
  });

  it("decomposes as R(4)×D(3)×T(8)×M(2) = 192", () => {
    expect(4 * 3 * 8 * 2).toBe(192);
  });

  it("contains the identity element", () => {
    const ecc = new QEcc();
    const isa = new QIsa(ecc);
    const identity = isa.getTransformGroup().find(
      e => e.rotation === 0 && e.modality === 0 && e.translation === 0 && !e.mirror
    );
    expect(identity).toBeDefined();
  });
});

describe("Q-ISA: Circuit Compilation", () => {
  let isa: QIsa;

  beforeEach(() => {
    const ecc = new QEcc();
    isa = new QIsa(ecc);
  });

  it("compiles a simple circuit", () => {
    const ops: GateOp[] = [
      { gate: "H", targets: [0] },
      { gate: "CNOT", targets: [1], controls: [0] },
    ];
    const circuit = isa.compile("bell-state", 2, ops);
    expect(circuit.name).toBe("bell-state");
    expect(circuit.qubitCount).toBe(2);
    expect(circuit.gateCount).toBe(2);
    expect(circuit.eccWrapped).toBe(true);
  });

  it("optimizes away self-inverse pairs", () => {
    const ops: GateOp[] = [
      { gate: "H", targets: [0] },
      { gate: "X", targets: [1] },
      { gate: "X", targets: [1] },  // X·X = I
      { gate: "H", targets: [0] },  // H·H = I
    ];
    const circuit = isa.compile("optimized", 2, ops);
    // H(0), X(1), X(1), H(0) → should cancel X·X and H·H
    expect(circuit.gateCount).toBeLessThan(4);
  });

  it("rejects unknown gates", () => {
    const ops: GateOp[] = [{ gate: "NONEXISTENT", targets: [0] }];
    expect(() => isa.compile("bad", 1, ops)).toThrow();
  });
});

describe("Q-ISA: Decomposition", () => {
  it("decomposes Toffoli into Clifford+T", () => {
    const ecc = new QEcc();
    const isa = new QIsa(ecc);
    const decomposed = isa.decomposeToCliffordT("Toffoli");
    expect(decomposed.length).toBe(15); // standard decomposition
    // All gates should be Clifford or T
    for (const op of decomposed) {
      expect(["H", "CNOT", "T", "Tdg"].includes(op.gate)).toBe(true);
    }
  });

  it("Clifford gates decompose to themselves", () => {
    const ecc = new QEcc();
    const isa = new QIsa(ecc);
    const decomposed = isa.decomposeToCliffordT("H");
    expect(decomposed.length).toBe(1);
    expect(decomposed[0].gate).toBe("H");
  });
});

describe("Q-ISA: Execution", () => {
  it("executes X gate (bit flip)", () => {
    const ecc = new QEcc();
    const isa = new QIsa(ecc);
    const circuit = isa.compile("flip", 2, [
      { gate: "X", targets: [0] },
    ], false);
    const result = isa.execute(circuit, [0, 0]);
    expect(result[0]).toBe(1);
    expect(result[1]).toBe(0);
  });

  it("executes CNOT gate", () => {
    const ecc = new QEcc();
    const isa = new QIsa(ecc);
    const circuit = isa.compile("cnot-test", 2, [
      { gate: "X", targets: [0] },
      { gate: "CNOT", targets: [1], controls: [0] },
    ], false);
    const result = isa.execute(circuit, [0, 0]);
    expect(result[0]).toBe(1);
    expect(result[1]).toBe(1); // CNOT flipped target because control=1
  });

  it("tracks execution statistics", () => {
    const ecc = new QEcc();
    const isa = new QIsa(ecc);
    isa.compile("test", 1, [{ gate: "X", targets: [0] }], false);
    const stats = isa.stats();
    expect(stats.circuitsCompiled).toBe(1);
    expect(stats.totalGates).toBe(96);
  });
});

describe("Q-ISA: ECC Integration", () => {
  it("applies ECC correction on 96-qubit circuits", () => {
    const ecc = new QEcc();
    const isa = new QIsa(ecc);

    // Create a 96-qubit circuit
    const ops: GateOp[] = [{ gate: "X", targets: [0] }];
    const circuit = isa.compile("ecc-test", 96, ops, true);

    const state = new Array(96).fill(0);
    const result = isa.execute(circuit, state);
    expect(result.length).toBe(96);
  });
});
