/**
 * Atlas Compilation Pipeline — End-to-End Verification
 * ═════════════════════════════════════════════════════
 *
 * Proves that any AI model from the catalog decomposes into Atlas coordinates
 * and emits a valid OpenQASM 3.0 quantum circuit specification.
 */

import { describe, it, expect } from "vitest";
import { MODEL_CATALOG } from "@/modules/atlas/convergence";
import {
  runPipeline,
  compileAllModels,
  type PipelineResult,
} from "@/modules/quantum/atlas-compilation-pipeline";

// ══════════════════════════════════════════════════════════════════════════════
// Part I: Single Model End-to-End
// ══════════════════════════════════════════════════════════════════════════════

describe("Single Model Pipeline — LLaMA-7B", () => {
  let result: PipelineResult;

  it("runs the full pipeline without error", () => {
    result = runPipeline({ modelName: "LLaMA-7B", maxHeads: 2, maxLayers: 2, withECC: false });
    expect(result).toBeDefined();
  });

  it("resolves model from catalog", () => {
    expect(result.model.name).toBe("LLaMA-7B");
    expect(result.model.family).toBe("LLaMA");
  });

  it("produces valid Atlas R₈ decomposition", () => {
    expect(result.atlas.r8ElementsPerVector).toBeGreaterThan(0);
    expect(result.atlas.completeRings).toBeGreaterThanOrEqual(0);
  });

  it("compiles requested heads × layers", () => {
    expect(result.summary.headsCompiled).toBe(4); // 2 heads × 2 layers
    expect(result.summary.layersCompiled).toBe(2);
  });

  it("per-head qubits = 4⌈log₂(d_k)⌉ + 1", () => {
    const dk = result.model.headDim;
    const expected = 4 * Math.ceil(Math.log2(dk)) + 1;
    const actual = result.layers[0].heads[0].circuit.totalQubits;
    expect(actual).toBe(expected);
  });

  it("emits valid OpenQASM 3.0", () => {
    expect(result.qasm.source).toContain("OPENQASM 3.0");
    expect(result.qasm.source).toContain("stdgates.inc");
    expect(result.qasm.source).toContain("qubit[");
    expect(result.qasm.source).toContain("bit[");
    expect(result.qasm.lines).toBeGreaterThan(20);
    expect(result.qasm.gateCount).toBeGreaterThan(0);
  });

  it("quantum compression > 1×", () => {
    expect(result.summary.compressionRatio).toBeGreaterThan(1);
  });

  it("all verification tests pass", () => {
    for (const t of result.tests) {
      expect(t.holds, `FAIL: ${t.name} — ${t.detail}`).toBe(true);
    }
    expect(result.allPassed).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Part II: ECC Wrapping
// ══════════════════════════════════════════════════════════════════════════════

describe("Pipeline with ECC [[96,48,2]]", () => {
  it("adds syndrome qubits when ECC enabled", () => {
    const result = runPipeline({ modelName: "LLaMA-7B", maxHeads: 1, maxLayers: 1, withECC: true });
    expect(result.ecc).not.toBeNull();
    expect(result.ecc!.overheadFactor).toBe(2.0);
    expect(result.ecc!.additionalQubits).toBeGreaterThan(0);
    expect(result.summary.totalPhysicalQubits).toBeGreaterThan(result.summary.totalLogicalQubits);
    expect(result.qasm.source).toContain("syndrome");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Part III: Universal Invariant — d_k determines topology
// ══════════════════════════════════════════════════════════════════════════════

describe("Universal Invariant: d_k → qubit topology", () => {
  it("all d_k=128 models produce identical per-head qubit count", () => {
    const dk128Models = MODEL_CATALOG.filter(m => m.headDim === 128);
    expect(dk128Models.length).toBeGreaterThan(1);

    const qubits = dk128Models.map(m => {
      const r = runPipeline({ modelName: m.name, maxHeads: 1, maxLayers: 1 });
      return r.layers[0].heads[0].circuit.totalQubits;
    });

    // All should be 29 = 4⌈log₂(128)⌉ + 1
    expect(new Set(qubits).size).toBe(1);
    expect(qubits[0]).toBe(29);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Part IV: Full Catalog Compilation
// ══════════════════════════════════════════════════════════════════════════════

describe("Full Catalog Compilation", () => {
  it("compiles all models in catalog without error", () => {
    const catalog = compileAllModels();
    expect(catalog.models.length).toBe(MODEL_CATALOG.length);

    for (const m of catalog.models) {
      expect(m.qubitsPerHead).toBeGreaterThan(0);
      expect(m.fullModelQubits).toBeGreaterThan(0);
      expect(m.compressionRatio).toBeGreaterThan(1);
      expect(m.qasmLines).toBeGreaterThan(0);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Part V: QASM Structural Validity
// ══════════════════════════════════════════════════════════════════════════════

describe("QASM Structural Validity", () => {
  it("contains custom gate definitions (cry, euler_zyz)", () => {
    const r = runPipeline({ modelName: "GPT-2", maxHeads: 1, maxLayers: 1 });
    expect(r.qasm.source).toContain("gate cry");
    expect(r.qasm.source).toContain("gate euler_zyz");
  });

  it("has measurement instructions", () => {
    const r = runPipeline({ modelName: "GPT-2", maxHeads: 1, maxLayers: 1 });
    expect(r.qasm.source).toContain("measure");
  });

  it("qubit count in QASM matches summary", () => {
    const r = runPipeline({ modelName: "LLaMA-70B", maxHeads: 2, maxLayers: 1 });
    const match = r.qasm.source.match(/qubit\[(\d+)\]/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBe(r.summary.totalPhysicalQubits);
  });
});
