/**
 * Atlas Convergence Test — Phase 5 Test Suite
 *
 * Verifies: ALL LLM architectures map to the Atlas R₈ substrate.
 */

import { describe, it, expect } from "vitest";
import {
  MODEL_CATALOG,
  decomposeModel,
  verifyUniversalInvariants,
  runConvergenceTest,
} from "@/modules/atlas/convergence";

describe("Model Decomposition into Atlas R₈", () => {
  it("decomposes all 16 models", () => {
    const decompositions = MODEL_CATALOG.map(decomposeModel);
    expect(decompositions.length).toBe(16);
  });

  it("every model has structurally regular factorization", () => {
    for (const m of MODEL_CATALOG) {
      const d = decomposeModel(m);
      expect(d.structurallyRegular).toBe(true);
    }
  });

  it("R₈ elements per vector = 4 × embedding_dim", () => {
    for (const m of MODEL_CATALOG) {
      const d = decomposeModel(m);
      expect(d.r8ElementsPerVector).toBe(4 * m.embeddingDim);
    }
  });

  it("Atlas sign class is residual mod 8", () => {
    for (const m of MODEL_CATALOG) {
      const d = decomposeModel(m);
      expect(d.atlasSignClass).toBe((4 * m.embeddingDim % 256) % 8);
    }
  });

  it("head_dim / 256 ratio is structurally meaningful", () => {
    for (const m of MODEL_CATALOG) {
      const d = decomposeModel(m);
      expect(d.headDimToEdgeRatio).toBeGreaterThan(0);
      expect(d.headDimToEdgeRatio).toBeLessThanOrEqual(1);
    }
  });
});

describe("Universal Invariants", () => {
  it("all 10 invariants hold", () => {
    const invariants = verifyUniversalInvariants();
    expect(invariants.length).toBe(10);
    for (const inv of invariants) {
      expect(inv.holds).toBe(true);
    }
  });

  it("head dimensions are multiples of 32", () => {
    for (const m of MODEL_CATALOG) {
      expect(m.headDim % 32).toBe(0);
    }
  });

  it("embedding dimensions are multiples of 64", () => {
    for (const m of MODEL_CATALOG) {
      expect(m.embeddingDim % 64).toBe(0);
    }
  });

  it("d = heads × head_dim for all models", () => {
    for (const m of MODEL_CATALOG) {
      expect(m.embeddingDim).toBe(m.heads * m.headDim);
    }
  });

  it("covers 6+ distinct model families", () => {
    const families = new Set(MODEL_CATALOG.map(m => m.family));
    expect(families.size).toBeGreaterThanOrEqual(6);
  });
});

describe("Full Convergence Report", () => {
  it("all invariants pass", () => {
    const report = runConvergenceTest();
    expect(report.allInvariantsHold).toBe(true);
    expect(report.modelCount).toBe(16);
    expect(report.familyCount).toBeGreaterThanOrEqual(6);
  });

  it("summary statistics are valid", () => {
    const report = runConvergenceTest();
    expect(report.summary.headDimRegularity).toBe(true);
    expect(report.summary.embeddingDimRegularity).toBe(true);
    expect(report.summary.distinctHeadDims).toBeGreaterThanOrEqual(2);
  });
});
