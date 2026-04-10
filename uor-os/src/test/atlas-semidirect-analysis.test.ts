/**
 * Semidirect Product Analysis Test Suite
 * ═══════════════════════════════════════
 * Discovers the exact conjugation action of τ on Z/4Z × Z/3Z × Z/8Z.
 */
import { describe, it, expect } from "vitest";
import {
  conjugateByTau,
  analyzeFactorAction,
  runSemidirectAnalysis,
} from "@/modules/atlas/semidirect-analysis";
import { IDENTITY, type TransformElement } from "@/modules/atlas/transform-group";

describe("Semidirect Product: τ-Conjugation on Z/4Z × Z/3Z × Z/8Z", () => {
  describe("Mirror Involution", () => {
    it("τ conjugation of identity is identity", () => {
      const result = conjugateByTau(IDENTITY);
      expect(result.isFixed).toBe(true);
      expect(result.staysAbelian).toBe(true);
    });

    it("τ conjugation of R₁ stays abelian and fixes R", () => {
      const result = conjugateByTau({ r: 1, d: 0, t: 0, m: 0 });
      expect(result.conjugated).not.toBeNull();
      expect(result.staysAbelian).toBe(true);
      expect(result.isFixed).toBe(true); // τ fixes R
    });
  });

  describe("Factor Actions (Discovery)", () => {
    it("R factor: τ fixes R₁ (quadrant rotation commutes with mirror)", () => {
      const action = analyzeFactorAction("R", { r: 1, d: 0, t: 0, m: 0 }, 4);
      expect(action.conjugatedElement).not.toBeNull();
      expect(action.pureFactorAction).toBe(true);
      expect(action.fixes).toBe(true);
    });

    it("D factor: τ·D₁·τ leaves the parametric set (non-closure)", () => {
      const action = analyzeFactorAction("D", { r: 0, d: 1, t: 0, m: 0 }, 3);
      // KEY DISCOVERY: conjugation of D₁ by τ produces a permutation
      // that is NOT representable as any (r,d,t,m) element.
      // This proves the 192 parametric elements do NOT form a group.
      expect(action.conjugatedElement).toBeNull();
      expect(action.pureFactorAction).toBe(false);
    });

    it("T factor: τ·T₁·τ also leaves the parametric set", () => {
      const action = analyzeFactorAction("T", { r: 0, d: 0, t: 1, m: 0 }, 8);
      expect(action.conjugatedElement).toBeNull();
      expect(action.pureFactorAction).toBe(false);
    });
  });

  describe("Full Analysis", () => {
    it("conjugation table covers all 96 abelian elements", () => {
      const analysis = runSemidirectAnalysis();
      expect(analysis.conjugationTable.length).toBe(96);
    });

    it("τ² = id verified on all 96 vertices", () => {
      const analysis = runSemidirectAnalysis();
      const t = analysis.tests.find(t => t.name.includes("τ² = id"));
      expect(t?.holds).toBe(true);
    });

    it("group order = 192 (96 abelian × 2)", () => {
      const analysis = runSemidirectAnalysis();
      const t = analysis.tests.find(t => t.name.includes("192"));
      expect(t?.holds).toBe(true);
    });

    it("identity is fixed by conjugation", () => {
      const analysis = runSemidirectAnalysis();
      const t = analysis.tests.find(t => t.name.includes("Identity"));
      expect(t?.holds).toBe(true);
    });

    it("τ does NOT normalize the abelian subgroup", () => {
      // THE KEY FINDING: the Atlas mirror τ produces permutations
      // outside the parametric (r,d,t,m) representation.
      // The 192 elements form a transitive action set, not a group.
      const analysis = runSemidirectAnalysis();
      expect(analysis.normalizesAbelian).toBe(false);
    });

    it("has 8 fixed points under τ-conjugation", () => {
      const analysis = runSemidirectAnalysis();
      expect(analysis.fixedPointCount).toBe(8);
    });

    it("structure description captures the non-closure discovery", () => {
      const analysis = runSemidirectAnalysis();
      expect(analysis.structureDescription).toContain("⋊");
      expect(analysis.structureDescription).toContain("NOT normalize");
    });
  });
});
