/**
 * Topological Qubit Test Suite
 * ════════════════════════════
 *
 * Verifies the geometric α derivation, topological qubit instantiation,
 * and the unified theorem connecting fine structure constant to fault tolerance.
 */
import { describe, it, expect } from "vitest";
import {
  constructManifold22,
  deriveAlpha,
  computeTriclinicSlant,
  instantiateQubits,
  computeBraids,
  runTopologicalQubitAnalysis,
} from "@/modules/atlas/topological-qubit";

describe("Phase 11: Topological Qubit in Atlas Substrate", () => {
  describe("22-Node Submanifold", () => {
    it("has exactly 22 nodes", () => {
      expect(constructManifold22().nodes.length).toBe(22);
    });

    it("decomposes as 8 SC + 12 G₂ + 2 unity", () => {
      const m = constructManifold22();
      expect(m.nodes.filter(n => n.type === "sign-class").length).toBe(8);
      expect(m.nodes.filter(n => n.type === "g2-boundary").length).toBe(12);
      expect(m.nodes.filter(n => n.type === "unity").length).toBe(2);
    });

    it("has inter-node links", () => {
      expect(constructManifold22().totalLinks).toBeGreaterThan(0);
    });
  });

  describe("Fine Structure Constant Derivation", () => {
    it("α⁻¹ = Σd²/(4N₂₂σ²) is within 5% of 137.036", () => {
      const alpha = deriveAlpha();
      expect(alpha.relativeError).toBeLessThan(0.05);
    });

    it("degree variance σ² = 2/9 exactly", () => {
      const alpha = deriveAlpha();
      expect(Math.abs(alpha.components.degreeVariance - 2 / 9)).toBeLessThan(1e-12);
    });

    it("compression:shear ratio = 2:1", () => {
      const alpha = deriveAlpha();
      expect(alpha.components.compressionRatio).toBe(2);
    });
  });

  describe("Triclinic Slant", () => {
    it("slant angle near 0.418°", () => {
      const slant = computeTriclinicSlant();
      expect(Math.abs(slant.angleDegrees - slant.expected) / slant.expected).toBeLessThan(0.05);
    });

    it("α expressed as degrees = 0.4183°", () => {
      const slant = computeTriclinicSlant();
      expect(Math.abs(slant.alphaAsDegrees - 0.4183)).toBeLessThan(0.001);
    });
  });

  describe("Topological Qubit Instantiation", () => {
    it("48 qubits from mirror pairs", () => {
      expect(instantiateQubits().length).toBe(48);
    });

    it("all qubits have protection distance ≥ 2", () => {
      for (const q of instantiateQubits()) {
        expect(q.protectionDistance).toBeGreaterThanOrEqual(2);
      }
    });

    it("all 4 anyon types present", () => {
      const types = new Set(instantiateQubits().map(q => q.anyonType));
      expect(types.size).toBe(4);
    });

    it("qubits span all 5 gate tiers", () => {
      const tiers = new Set(instantiateQubits().map(q => q.gateTier));
      expect(tiers.size).toBe(5);
    });
  });

  describe("Braid Operations", () => {
    it("produces non-trivial geometric phases", () => {
      const braids = computeBraids();
      expect(braids.some(b => b.nonTrivial)).toBe(true);
    });
  });

  describe("Full Report", () => {
    it("all 14 tests pass", () => {
      const report = runTopologicalQubitAnalysis();
      for (const test of report.tests) {
        expect(test.holds, `"${test.name}" failed: expected ${test.expected}, got ${test.actual}`).toBe(true);
      }
      expect(report.allPassed).toBe(true);
    });

    it("report has 14 tests", () => {
      expect(runTopologicalQubitAnalysis().tests.length).toBe(14);
    });
  });
});
