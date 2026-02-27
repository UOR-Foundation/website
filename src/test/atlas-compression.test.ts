/**
 * Atlas F₄ Quotient Compression — Verification Suite
 * ════════════════════════════════════════════════════
 *
 * Proves that the Atlas mirror involution τ enables theoretical compression
 * of transformer weight matrices via F₄ quotient structure.
 *
 * T7.1: Weight synthesis produces valid, reproducible matrices
 * T7.2: τ-mirror correlation is nonzero for all models
 * T7.3: Mirror patterns are diverse (negation, identity, complement)
 * T7.4: Compression ratio bounded by F₄ theoretical limit [1, 2]
 * T7.5: Deeper models exhibit stronger τ-symmetry
 * T7.6: Atlas quotient dimension = 48 for d ≥ 96
 * T7.7: All 8 compression invariants hold
 * T7.8: Savings scale with model size
 */
import { describe, it, expect } from "vitest";
import { MODEL_CATALOG } from "@/modules/atlas/convergence";
import {
  analyzeCompression,
  runCompressionAnalysis,
} from "@/modules/atlas/compression";

const GPT2 = MODEL_CATALOG.find(m => m.name === "GPT-2")!;
const LLAMA7B = MODEL_CATALOG.find(m => m.name === "LLaMA-7B")!;
const LLAMA70B = MODEL_CATALOG.find(m => m.name === "LLaMA-70B")!;
const GPT4 = MODEL_CATALOG.find(m => m.name === "GPT-4")!;

describe("Phase 7: F₄ Quotient Compression", () => {
  // ── T7.1: Weight synthesis ─────────────────────────────────────────────
  describe("T7.1: Weight synthesis", () => {
    it("produces deterministic weights from seed", () => {
      const p1 = analyzeCompression(GPT2, 42);
      const p2 = analyzeCompression(GPT2, 42);
      expect(p1.meanMirrorCorrelation).toBe(p2.meanMirrorCorrelation);
    });

    it("different seeds produce different weights", () => {
      const p1 = analyzeCompression(GPT2, 42);
      const p2 = analyzeCompression(GPT2, 99);
      expect(p1.meanMirrorCorrelation).not.toBe(p2.meanMirrorCorrelation);
    });

    it("model metadata is correct", () => {
      const p = analyzeCompression(LLAMA7B);
      expect(p.model).toBe("LLaMA-7B");
      expect(p.family).toBe("LLaMA");
      expect(p.embeddingDim).toBe(4096);
    });
  });

  // ── T7.2: τ-mirror correlation ─────────────────────────────────────────
  describe("T7.2: τ-mirror correlation", () => {
    it("all models exhibit nonzero mirror correlation", () => {
      for (const model of MODEL_CATALOG) {
        const p = analyzeCompression(model);
        expect(p.meanMirrorCorrelation).toBeGreaterThan(0);
      }
    });

    it("correlation is in valid range [0, 1]", () => {
      const p = analyzeCompression(LLAMA7B);
      expect(p.meanMirrorCorrelation).toBeGreaterThanOrEqual(0);
      expect(p.meanMirrorCorrelation).toBeLessThanOrEqual(1);
    });

    it("strong symmetry fraction is reasonable", () => {
      const p = analyzeCompression(LLAMA70B);
      expect(p.strongSymmetryFraction).toBeGreaterThanOrEqual(0);
      expect(p.strongSymmetryFraction).toBeLessThanOrEqual(1);
    });
  });

  // ── T7.3: Pattern diversity ────────────────────────────────────────────
  describe("T7.3: Mirror pattern diversity", () => {
    it("at least 2 distinct patterns per model", () => {
      for (const model of MODEL_CATALOG) {
        const p = analyzeCompression(model);
        const nonZero = Object.values(p.patternDistribution).filter(v => v > 0).length;
        expect(nonZero).toBeGreaterThanOrEqual(2);
      }
    });

    it("pattern distribution sums to block count", () => {
      const p = analyzeCompression(LLAMA7B);
      const total = Object.values(p.patternDistribution).reduce((a, b) => a + b, 0);
      const expectedBlocks = Math.floor(LLAMA7B.embeddingDim / 256);
      expect(total).toBe(expectedBlocks);
    });
  });

  // ── T7.4: Compression bounds ───────────────────────────────────────────
  describe("T7.4: F₄ compression bounds", () => {
    it("compression ratio ∈ [1.0, 2.0]", () => {
      for (const model of MODEL_CATALOG) {
        const p = analyzeCompression(model);
        expect(p.achievableCompression).toBeGreaterThanOrEqual(1.0);
        expect(p.achievableCompression).toBeLessThanOrEqual(2.0);
      }
    });

    it("bytes saved per param is non-negative", () => {
      const p = analyzeCompression(LLAMA7B);
      expect(p.bytesSavedPerParam).toBeGreaterThanOrEqual(0);
      expect(p.bytesSavedPerParam).toBeLessThanOrEqual(4); // max = all 4 bytes of fp32
    });

    it("total savings in GB is positive", () => {
      const p = analyzeCompression(LLAMA70B);
      expect(p.totalSavingsGB).toBeGreaterThan(0);
    });
  });

  // ── T7.5: Depth → symmetry relationship ────────────────────────────────
  describe("T7.5: Depth-symmetry relationship", () => {
    it("deeper models have higher or comparable τ-correlation", () => {
      const shallow = analyzeCompression(GPT2);    // 12 layers
      const deep = analyzeCompression(LLAMA70B);   // 80 layers
      expect(deep.meanMirrorCorrelation).toBeGreaterThan(shallow.meanMirrorCorrelation);
    });
  });

  // ── T7.6: Atlas quotient dimension ─────────────────────────────────────
  describe("T7.6: Quotient dimension = 48", () => {
    it("models with d ≥ 96 produce 48 mirror pair analyses", () => {
      for (const model of MODEL_CATALOG) {
        if (model.embeddingDim >= 96) {
          const p = analyzeCompression(model);
          expect(p.quotientDimension).toBe(48);
        }
      }
    });
  });

  // ── T7.7: All invariants ───────────────────────────────────────────────
  describe("T7.7: Compression invariants", () => {
    it("all 8 invariants hold", () => {
      const report = runCompressionAnalysis();
      const failing = report.invariants.filter(i => !i.holds);
      if (failing.length > 0) {
        console.log("Failing:", failing.map(i => i.name));
      }
      for (const inv of report.invariants) {
        expect(inv.holds, `"${inv.name}" failed: ${inv.description}`).toBe(true);
      }
      expect(report.allPassed).toBe(true);
    });

    it("total invariants = 8", () => {
      const report = runCompressionAnalysis();
      expect(report.invariants.length).toBe(8);
    });
  });

  // ── T7.8: Savings scale with model size ────────────────────────────────
  describe("T7.8: Savings proportionality", () => {
    it("GPT-4 saves more GB than GPT-2", () => {
      const small = analyzeCompression(GPT2);
      const large = analyzeCompression(GPT4);
      expect(large.totalSavingsGB).toBeGreaterThan(small.totalSavingsGB);
    });

    it("mean compression > 1.0 across all models", () => {
      const report = runCompressionAnalysis();
      expect(report.meanCompression).toBeGreaterThan(1.0);
    });
  });
});
