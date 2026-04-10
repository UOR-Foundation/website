/**
 * τ-Fixed Point Analysis Test Suite
 * ══════════════════════════════════
 * Characterizes the 8 elements of Z/96Z that commute with the mirror τ.
 */
import { describe, it, expect } from "vitest";
import {
  findTauFixedPoints,
  runTauFixedPointAnalysis,
} from "@/modules/atlas/tau-fixed-points";

describe("τ-Fixed Point Analysis", () => {
  const analysis = runTauFixedPointAnalysis();

  it("exactly 8 fixed points", () => {
    expect(analysis.subgroupOrder).toBe(8);
  });

  it("identity is a fixed point", () => {
    expect(analysis.fixedPoints.some(
      fp => fp.element.r === 0 && fp.element.d === 0 && fp.element.t === 0
    )).toBe(true);
  });

  it("all 4 pure quadrant rotations (r,0,0) are fixed", () => {
    for (let r = 0; r < 4; r++) {
      expect(analysis.fixedPoints.some(
        fp => fp.element.r === r && fp.element.d === 0 && fp.element.t === 0
      ), `R^${r} should be fixed`).toBe(true);
    }
  });

  it("all 4 mixed elements (r,2,2) are fixed", () => {
    for (let r = 0; r < 4; r++) {
      expect(analysis.fixedPoints.some(
        fp => fp.element.r === r && fp.element.d === 2 && fp.element.t === 2
      ), `(R^${r},D^2,T^2) should be fixed`).toBe(true);
    }
  });

  it("fixed set spans all 8 sign classes (one per class)", () => {
    const classes = new Set(analysis.fixedPoints.map(fp => fp.signClass));
    expect(classes.size).toBe(8);
  });

  it("fixed set is NOT a subgroup (discovery)", () => {
    // (0,2,2) + (0,2,2) = (0,1,4) which is not in the set
    expect(analysis.isClosed).toBe(false);
  });

  it("element orders include 1, 2, 4, 12", () => {
    const orders = new Set(analysis.fixedPoints.map(fp => fp.elementOrder));
    expect(orders.has(1)).toBe(true);   // identity
    expect(orders.has(2)).toBe(true);   // R^2
    expect(orders.has(4)).toBe(true);   // R^1, R^3
    expect(orders.has(12)).toBe(true);  // (r,2,2) elements
  });

  it("all internal tests pass", () => {
    for (const t of analysis.tests) {
      expect(t.holds, `FAIL: ${t.name}: expected ${t.expected}, got ${t.actual}`).toBe(true);
    }
    expect(analysis.allPassed).toBe(true);
  });

  it("prints full analysis", () => {
    console.log("\n" + analysis.description);
    console.log("\nFixed point table:");
    for (const fp of analysis.fixedPoints) {
      const { r, d, t } = fp.element;
      console.log(
        `  (R^${r}, D^${d}, T^${t}) → vertex ${fp.vertexIndex}, ` +
        `order ${fp.elementOrder}, sign ${fp.signClass}, ` +
        `fixes ${fp.fixedVertexCount} vertices`
      );
    }
  });
});
