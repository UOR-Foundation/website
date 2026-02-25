/**
 * Phase 4 Test Suite — Constraint Algebra & Type System
 *
 * T4.1: ResidueConstraint(3, 1) selects {1, 4, 7, ...} from R_8
 * T4.2: CarryConstraint("1010") selects correct elements
 * T4.3: DepthConstraint(2, 4) selects elements with 2–4 prime factors
 * T4.4: CompositeConstraint AND: intersection
 * T4.5: CompositeConstraint OR: union
 * T4.6: crossingCost is non-negative
 * T4.7: ConstrainedType + FiberBudget integration
 */
import { describe, it, expect } from "vitest";
import {
  residueConstraint, carryConstraint, depthConstraint,
  compositeConstraint, applyConstraint, filterByConstraint,
  createFiberBudget, freeCount,
} from "@/modules/ring-core";

describe("Phase 4: Constraint Algebra", () => {
  // ── T4.1: ResidueConstraint ─────────────────────────────────────────────
  describe("T4.1: ResidueConstraint", () => {
    const c = residueConstraint(3, 1);

    it("selects values ≡ 1 (mod 3)", () => {
      const selected = filterByConstraint(c, 256);
      expect(selected).toContain(1);
      expect(selected).toContain(4);
      expect(selected).toContain(7);
      expect(selected).toContain(10);
      expect(selected).not.toContain(0);
      expect(selected).not.toContain(2);
      expect(selected).not.toContain(3);
    });

    it("has 85 or 86 elements in R_8", () => {
      const count = filterByConstraint(c, 256).length;
      expect(count).toBe(85); // floor(256/3) = 85
    });

    it("axis = Vertical", () => expect(c.axis).toBe("Vertical"));
  });

  // ── T4.2: CarryConstraint ──────────────────────────────────────────────
  describe("T4.2: CarryConstraint", () => {
    const c = carryConstraint("1010");

    it("selects values matching binary pattern 1010", () => {
      expect(c.satisfies(BigInt(0b1010))).toBe(true);
    });

    it("rejects values not matching pattern", () => {
      expect(c.satisfies(BigInt(0b1111))).toBe(false);
      expect(c.satisfies(BigInt(0b0000))).toBe(false);
    });

    it("axis = Horizontal", () => expect(c.axis).toBe("Horizontal"));
  });

  // ── T4.3: DepthConstraint ──────────────────────────────────────────────
  describe("T4.3: DepthConstraint", () => {
    const c = depthConstraint(2, 4);

    it("selects values with 2–4 prime factors", () => {
      // 4 = 2×2 (depth 2) ✓
      expect(c.satisfies(BigInt(4))).toBe(true);
      // 12 = 2×2×3 (depth 3) ✓
      expect(c.satisfies(BigInt(12))).toBe(true);
      // 16 = 2^4 (depth 4) ✓
      expect(c.satisfies(BigInt(16))).toBe(true);
    });

    it("rejects primes (depth 1) and 0/1 (depth 0)", () => {
      expect(c.satisfies(BigInt(0))).toBe(false);
      expect(c.satisfies(BigInt(1))).toBe(false);
      expect(c.satisfies(BigInt(3))).toBe(false);
      expect(c.satisfies(BigInt(7))).toBe(false);
    });

    it("rejects depth > 4", () => {
      // 32 = 2^5 (depth 5) ✗
      expect(c.satisfies(BigInt(32))).toBe(false);
    });

    it("axis = Diagonal", () => expect(c.axis).toBe("Diagonal"));
  });

  // ── T4.4: CompositeConstraint AND ──────────────────────────────────────
  describe("T4.4: CompositeConstraint AND", () => {
    const even = residueConstraint(2, 0);
    const mod3 = residueConstraint(3, 0);
    const both = compositeConstraint("AND", [even, mod3]);

    it("intersection: selects multiples of 6", () => {
      const selected = filterByConstraint(both, 256);
      expect(selected).toContain(0);
      expect(selected).toContain(6);
      expect(selected).toContain(12);
      expect(selected).not.toContain(2);
      expect(selected).not.toContain(3);
      expect(selected).not.toContain(4);
    });

    it("AND count ≤ min of individual counts", () => {
      const andCount = filterByConstraint(both, 256).length;
      const evenCount = filterByConstraint(even, 256).length;
      const mod3Count = filterByConstraint(mod3, 256).length;
      expect(andCount).toBeLessThanOrEqual(Math.min(evenCount, mod3Count));
    });
  });

  // ── T4.5: CompositeConstraint OR ───────────────────────────────────────
  describe("T4.5: CompositeConstraint OR", () => {
    const mod5 = residueConstraint(5, 0);
    const mod7 = residueConstraint(7, 0);
    const either = compositeConstraint("OR", [mod5, mod7]);

    it("union: selects multiples of 5 or 7", () => {
      const selected = filterByConstraint(either, 256);
      expect(selected).toContain(0);
      expect(selected).toContain(5);
      expect(selected).toContain(7);
      expect(selected).toContain(35); // both
    });

    it("OR count ≥ max of individual counts", () => {
      const orCount = filterByConstraint(either, 256).length;
      const m5Count = filterByConstraint(mod5, 256).length;
      const m7Count = filterByConstraint(mod7, 256).length;
      expect(orCount).toBeGreaterThanOrEqual(Math.max(m5Count, m7Count));
    });
  });

  // ── T4.6: crossingCost non-negative ────────────────────────────────────
  describe("T4.6: crossingCost", () => {
    it("all constraint types have non-negative crossingCost", () => {
      expect(residueConstraint(3, 1).crossingCost).toBeGreaterThanOrEqual(0);
      expect(carryConstraint("101").crossingCost).toBeGreaterThanOrEqual(0);
      expect(depthConstraint(1, 3).crossingCost).toBeGreaterThanOrEqual(0);
      expect(compositeConstraint("AND", [
        residueConstraint(2, 0),
      ]).crossingCost).toBeGreaterThanOrEqual(0);
    });

    it("composite crossingCost = sum of children", () => {
      const c1 = residueConstraint(3, 0); // cost 3
      const c2 = residueConstraint(5, 0); // cost 5
      const comp = compositeConstraint("AND", [c1, c2]);
      expect(comp.crossingCost).toBe(c1.crossingCost + c2.crossingCost);
    });
  });

  // ── T4.7: FiberBudget integration ──────────────────────────────────────
  describe("T4.7: Constraint + FiberBudget", () => {
    it("applying a constraint pins fibers", () => {
      const budget = createFiberBudget(0);
      const c = residueConstraint(2, 0);
      const updated = applyConstraint(budget, c, 3);
      expect(updated.pinnedCount).toBe(3);
      expect(freeCount(updated)).toBe(5);
    });

    it("pinning records constraint ID", () => {
      const budget = createFiberBudget(0);
      const c = residueConstraint(4, 1);
      const updated = applyConstraint(budget, c, 2);
      expect(updated.pinnings).toHaveLength(2);
      expect(updated.pinnings[0].constraintId).toBe(c.constraintId);
    });

    it("sequential constraints accumulate pins", () => {
      let b = createFiberBudget(0); // 8 fibers
      b = applyConstraint(b, residueConstraint(2, 0), 3);
      b = applyConstraint(b, depthConstraint(1, 4), 3);
      expect(b.pinnedCount).toBe(6);
      expect(freeCount(b)).toBe(2);
    });

    it("full constraint closure", () => {
      let b = createFiberBudget(0);
      b = applyConstraint(b, residueConstraint(2, 0), 8);
      expect(b.isClosed).toBe(true);
    });
  });
});
