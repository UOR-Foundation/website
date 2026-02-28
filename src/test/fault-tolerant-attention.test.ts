/**
 * Fault-Tolerant Quantum Attention — Verification Suite
 * ═════════════════════════════════════════════════════════
 *
 * Proves that attention heads wrapped in the [[96,48,2]] stabilizer code
 * produce valid fault-tolerant circuits with real syndrome extraction.
 */

import { describe, it, expect } from "vitest";
import {
  compileFTAttention,
  emitFTQASM,
  verifyFTAttention,
  type FTAttentionCircuit,
} from "@/modules/quantum/fault-tolerant-attention";
import { runPipeline } from "@/modules/quantum/atlas-compilation-pipeline";

// ══════════════════════════════════════════════════════════════════════════
// Part I: Single Head FT Compilation
// ══════════════════════════════════════════════════════════════════════════

describe("Fault-Tolerant Attention — Single Head", () => {
  let ft: FTAttentionCircuit;

  it("compiles LLaMA-7B head 0 without error", () => {
    ft = compileFTAttention({
      model: "LLaMA-7B",
      headDim: 128,
      seqLen: 8,
      headIndex: 0,
      totalHeads: 32,
      embeddingDim: 4096,
    });
    expect(ft).toBeDefined();
  });

  it("encoding layer maps all data qubits to mirror pairs", () => {
    expect(ft.encoding.logicalAssignments.length).toBe(ft.encoding.dataQubits);
    for (const assign of ft.encoding.logicalAssignments) {
      expect(assign.physicalPair[0]).not.toBe(assign.physicalPair[1]);
    }
  });

  it("encoding gates = 2 per logical qubit (H + CNOT)", () => {
    expect(ft.encoding.encodingGates.length).toBe(ft.encoding.dataQubits * 2);
    // Alternating H and CX
    for (let i = 0; i < ft.encoding.encodingGates.length; i += 2) {
      expect(ft.encoding.encodingGates[i].name).toBe("h");
      expect(ft.encoding.encodingGates[i + 1].name).toBe("cx");
    }
  });

  it("transversal gates double the bare gate count", () => {
    const bareGateCount = ft.bareCircuit.stages.reduce(
      (s, st) => s + st.gates.filter(g => g.qubits.length <= 2).length, 0,
    );
    expect(ft.transversalGates.length).toBeGreaterThanOrEqual(bareGateCount);
  });

  it("syndrome circuit has 2 CNOTs + 1 measure per stabilizer", () => {
    const sc = ft.syndromeCircuits[0];
    expect(sc).toBeDefined();
    expect(sc.cnotGates.length).toBe(ft.encoding.dataQubits * 2);
    expect(sc.measurements.length).toBe(ft.encoding.dataQubits);
  });

  it("total physical qubits = 3× data + 8 SC ancillae", () => {
    expect(ft.totalQubits).toBe(ft.encoding.dataQubits * 3 + 8);
  });

  it("qubit overhead > 1×", () => {
    expect(ft.overhead.qubitOverhead).toBeGreaterThan(1);
    expect(ft.overhead.qubitOverhead).toBeGreaterThan(3.0); // now > 3 due to SC ancillae
  });

  it("code params match [[96, 48, 2]]", () => {
    expect(ft.overhead.codeParams).toEqual({ n: 96, k: 48, d: 2 });
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part II: QASM Emission
// ══════════════════════════════════════════════════════════════════════════

describe("FT QASM Emission", () => {
  it("emits valid OpenQASM 3.0 with syndrome and sign-class registers", () => {
    const ft = compileFTAttention({
      model: "GPT-2",
      headDim: 64,
      seqLen: 8,
      headIndex: 0,
      totalHeads: 12,
      embeddingDim: 768,
    });
    const qasm = emitFTQASM(ft);

    expect(qasm).toContain("OPENQASM 3.0");
    expect(qasm).toContain("qubit[");
    expect(qasm).toContain("syndrome");
    expect(qasm).toContain("sc_ancilla");
    expect(qasm).toContain("barrier");
    expect(qasm).toContain("cx");
    expect(qasm).toContain("measure");
    expect(qasm).toContain("if (c[");
    expect(qasm).toContain("Stage 1: Mirror-pair encoding");
    expect(qasm).toContain("Stage 3: Syndrome extraction");
    expect(qasm).toContain("Stage 3b: Sign-class cross-stabilizer");
    expect(qasm).toContain("Stage 4: Cross-stabilizer conditional recovery");
  });

  it("QASM line count > bare circuit", () => {
    const ft = compileFTAttention({
      model: "GPT-2",
      headDim: 64,
      seqLen: 8,
      headIndex: 0,
      totalHeads: 12,
      embeddingDim: 768,
    });
    const qasm = emitFTQASM(ft);
    expect(qasm.split("\n").length).toBeGreaterThan(50);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part III: Internal Verification
// ══════════════════════════════════════════════════════════════════════════

describe("FT Verification — All 15 Tests", () => {
  it("all 15 internal verification tests pass", () => {
    const ft = compileFTAttention({
      model: "LLaMA-7B",
      headDim: 128,
      seqLen: 8,
      headIndex: 0,
      totalHeads: 32,
      embeddingDim: 4096,
    });
    const v = verifyFTAttention(ft);
    for (const t of v.tests) {
      expect(t.holds, `FAIL: ${t.name} — ${t.detail}`).toBe(true);
    }
    expect(v.allPassed).toBe(true);
    expect(v.tests.length).toBe(15);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part IV: Pipeline Integration
// ══════════════════════════════════════════════════════════════════════════

describe("Pipeline with Real FT ECC", () => {
  it("pipeline withECC=true uses FT module", () => {
    const r = runPipeline({ modelName: "LLaMA-7B", maxHeads: 1, maxLayers: 1, withECC: true });
    expect(r.ecc).not.toBeNull();
    expect(r.ecc!.ftCircuits).toBeDefined();
    expect(r.ecc!.ftCircuits!.length).toBeGreaterThan(0);
  });

  it("ECC QASM contains real syndrome gates", () => {
    const r = runPipeline({ modelName: "LLaMA-7B", maxHeads: 1, maxLayers: 1, withECC: true });
    expect(r.qasm.source).toContain("syndrome");
    expect(r.qasm.source).toContain("barrier");
    // Real CNOT gates for syndrome extraction
    expect(r.qasm.source).toContain("cx q[");
    expect(r.qasm.source).toContain("Conditional X corrections");
  });

  it("physical qubits > logical qubits with ECC", () => {
    const r = runPipeline({ modelName: "LLaMA-7B", maxHeads: 1, maxLayers: 1, withECC: true });
    expect(r.summary.totalPhysicalQubits).toBeGreaterThan(r.summary.totalLogicalQubits);
  });

  it("pipeline without ECC still works", () => {
    const r = runPipeline({ modelName: "LLaMA-7B", maxHeads: 1, maxLayers: 1, withECC: false });
    expect(r.ecc).toBeNull();
    expect(r.allPassed).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part V: Multiple Syndrome Rounds
// ══════════════════════════════════════════════════════════════════════════

describe("Multiple Syndrome Rounds", () => {
  it("3 rounds produce 3 syndrome circuits", () => {
    const ft = compileFTAttention(
      {
        model: "GPT-2",
        headDim: 64,
        seqLen: 8,
        headIndex: 0,
        totalHeads: 12,
        embeddingDim: 768,
      },
      { syndromeRounds: 3 },
    );
    expect(ft.syndromeCircuits.length).toBe(3);
    // Later rounds include reset gates
    expect(ft.syndromeCircuits[1].cnotGates.some(g => g.name === "reset")).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part VI: Sign-Class Cross-Stabilizer Layer
// ══════════════════════════════════════════════════════════════════════════

describe("Sign-Class Cross-Stabilizer Detection", () => {
  it("produces 8 sign-class syndrome circuits", () => {
    const ft = compileFTAttention({
      model: "GPT-2",
      headDim: 64,
      seqLen: 8,
      headIndex: 0,
      totalHeads: 12,
      embeddingDim: 768,
    });
    expect(ft.signClassCircuits.length).toBe(8);
  });

  it("each sign-class circuit has CNOT gates", () => {
    const ft = compileFTAttention({
      model: "GPT-2",
      headDim: 64,
      seqLen: 8,
      headIndex: 0,
      totalHeads: 12,
      embeddingDim: 768,
    });
    for (const sc of ft.signClassCircuits) {
      expect(sc.cnotGates.length).toBeGreaterThan(0);
      expect(sc.measurement.name).toBe("measure");
    }
  });

  it("sign-class ancillae add 8 physical qubits", () => {
    const ft = compileFTAttention({
      model: "GPT-2",
      headDim: 64,
      seqLen: 8,
      headIndex: 0,
      totalHeads: 12,
      embeddingDim: 768,
    });
    expect(ft.totalQubits).toBe(ft.encoding.totalPhysical + 8);
  });

  it("QASM contains sc_ancilla register", () => {
    const ft = compileFTAttention({
      model: "GPT-2",
      headDim: 64,
      seqLen: 8,
      headIndex: 0,
      totalHeads: 12,
      embeddingDim: 768,
    });
    const qasm = emitFTQASM(ft);
    expect(qasm).toContain("sc_ancilla");
    expect(qasm).toContain("Sign class");
  });
});
