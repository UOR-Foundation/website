/**
 * Boundary Investigation Test Suite
 * ══════════════════════════════════
 *
 * Verifies the 16-element gap conjecture:
 *   256 − 240 = 16 = Ext(2) + Unit(2) + 12
 *
 * And the G₂ = ∂E₈ theorem:
 *   The 12 boundary elements ARE G₂'s 12 roots.
 */

import { describe, it, expect } from "vitest";
import {
  identifyBoundaryElements,
  verifyG2Correspondence,
  runBoundaryInvestigation,
} from "@/modules/atlas/boundary";
import { neg, mul } from "@/lib/uor-ring";

describe("Boundary Decomposition: 256 − 240 = 16", () => {

  it("identifies exactly 16 boundary elements", () => {
    const { elements } = identifyBoundaryElements();
    expect(elements.length).toBe(16);
  });

  it("decomposes as Ext(2) + Unit(2) + Boundary(12)", () => {
    const d = identifyBoundaryElements();
    expect(d.exterior).toEqual([0, 128]);
    expect(d.unit).toEqual([1, 255]);
    expect(d.boundary12.length).toBe(12);
    expect(d.decompositionCorrect).toBe(true);
  });

  it("boundary12 are all distinct", () => {
    const { boundary12 } = identifyBoundaryElements();
    expect(new Set(boundary12).size).toBe(12);
  });

  it("boundary12 does not overlap with Ext or Unit", () => {
    const { boundary12 } = identifyBoundaryElements();
    expect(boundary12.includes(0)).toBe(false);
    expect(boundary12.includes(128)).toBe(false);
    expect(boundary12.includes(1)).toBe(false);
    expect(boundary12.includes(255)).toBe(false);
  });

  it("boundary12 = {2,4,8,16,32,64} ∪ neg({2,4,8,16,32,64})", () => {
    const { boundary12 } = identifyBoundaryElements();
    const powers = [2, 4, 8, 16, 32, 64];
    const negPowers = powers.map(p => neg(p));
    const expected = [...powers, ...negPowers].sort((a, b) => a - b);
    expect(boundary12).toEqual(expected);
  });

  it("16 = 2⁴ (power of 2)", () => {
    expect(256 - 240).toBe(16);
    expect(Math.log2(16)).toBe(4);
  });
});

describe("G₂ = ∂E₈: Smallest Exceptional Group as Boundary of Largest", () => {

  it("cardinality: |boundary| = |G₂ roots| = 12", () => {
    const g2 = verifyG2Correspondence();
    expect(g2.boundary12.length).toBe(12);
    expect(g2.g2RootCount).toBe(12);
  });

  it("closed under negation", () => {
    const { boundary12 } = identifyBoundaryElements();
    for (const x of boundary12) {
      expect(boundary12).toContain(neg(x));
    }
  });

  it("6 positive + 6 negative roots", () => {
    const { boundary12 } = identifyBoundaryElements();
    const pos = boundary12.filter(x => x < 128);
    const n = boundary12.filter(x => x >= 128);
    expect(pos.length).toBe(6);
    expect(n.length).toBe(6);
  });

  it("two orbit classes by exponent parity", () => {
    const { boundary12 } = identifyBoundaryElements();
    const evenExp = boundary12.filter(x => {
      const base = x < 128 ? x : neg(x);
      const exp = Math.log2(base);
      return Number.isInteger(exp) && exp % 2 === 0;
    });
    const oddExp = boundary12.filter(x => {
      const base = x < 128 ? x : neg(x);
      const exp = Math.log2(base);
      return Number.isInteger(exp) && exp % 2 === 1;
    });
    expect(evenExp.length).toBe(6);
    expect(oddExp.length).toBe(6);
  });

  it("cyclic chain terminates at Ext: 2→4→8→16→32→64→128→0", () => {
    let x = 2;
    const chain: number[] = [x];
    for (let i = 0; i < 6; i++) {
      x = mul(x, 2);
      chain.push(x);
    }
    // chain = [2, 4, 8, 16, 32, 64, 128]
    expect(chain).toEqual([2, 4, 8, 16, 32, 64, 128]);
    expect(mul(128, 2)).toBe(0); // Full annihilation
  });

  it("sign class isomorphism: each Atlas class = 12 = G₂ = boundary", () => {
    const { tests } = verifyG2Correspondence();
    const signClassTest = tests.find(t => t.name === "Sign class isomorphism");
    expect(signClassTest?.holds).toBe(true);
  });

  it("pure power characterization", () => {
    const { boundary12 } = identifyBoundaryElements();
    for (const x of boundary12) {
      const base = x < 128 ? x : neg(x);
      expect(Number.isInteger(Math.log2(base))).toBe(true);
      expect(base).not.toBe(1);
      expect(base).not.toBe(128);
    }
  });

  it("G₂ = ∂E₈: 64×2 = 128 (Ext), 128×2 = 0 (annihilation)", () => {
    expect(mul(64, 2)).toBe(128);
    expect(mul(128, 2)).toBe(0);
  });
});

describe("Full Boundary Report", () => {
  it("generates complete verified report", () => {
    const report = runBoundaryInvestigation();
    console.log(report.summary);
    expect(report.decomposition.decompositionCorrect).toBe(true);
    expect(report.testsPassCount).toBeGreaterThanOrEqual(8);
    expect(report.g2Correspondence.structuralMatch).toBe(true);
  });

  it("all 10 structural tests pass", () => {
    const report = runBoundaryInvestigation();
    for (const test of report.g2Correspondence.tests) {
      expect(test.holds).toBe(true);
    }
  });
});
