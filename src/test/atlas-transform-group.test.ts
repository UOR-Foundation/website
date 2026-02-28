/**
 * Transform Group Test Suite
 * ══════════════════════════
 * Verifies Aut(Atlas) = R(4) × D(3) × T(8) × M(2) = 192.
 */
import { describe, it, expect } from "vitest";
import {
  applyTransform,
  compose,
  inverse,
  enumerateGroup,
  isIdentity,
  elementOrder,
  isTransitive,
  orbit,
  stabilizer,
  runTransformGroupVerification,
  IDENTITY,
  GROUP_ORDER,
  type TransformElement,
} from "@/modules/atlas/transform-group";
import { ATLAS_VERTEX_COUNT } from "@/modules/atlas/atlas";

describe("Phase 2: Transform Group (192 elements)", () => {
  it("enumerates exactly 192 elements", () => {
    expect(enumerateGroup().length).toBe(GROUP_ORDER);
  });

  it("identity fixes all vertices", () => {
    for (let v = 0; v < ATLAS_VERTEX_COUNT; v++) {
      expect(applyTransform(v, IDENTITY)).toBe(v);
    }
  });

  it("all 192 elements produce distinct permutations", () => {
    const sigs = new Set<string>();
    for (const g of enumerateGroup()) {
      sigs.add([0, 1, 2, 3].map(v => applyTransform(v, g)).join(","));
    }
    expect(sigs.size).toBe(GROUP_ORDER);
  });

  it("mirror M has order 2", () => {
    const m: TransformElement = { r: 0, d: 0, t: 0, m: 1 };
    for (let v = 0; v < ATLAS_VERTEX_COUNT; v++) {
      expect(applyTransform(applyTransform(v, m), m)).toBe(v);
    }
  });

  it("R generator has order 4", () => {
    expect(elementOrder({ r: 1, d: 0, t: 0, m: 0 })).toBe(4);
  });

  it("D generator has order 3", () => {
    expect(elementOrder({ r: 0, d: 1, t: 0, m: 0 })).toBe(3);
  });

  it("T generator has order 8", () => {
    expect(elementOrder({ r: 0, d: 0, t: 1, m: 0 })).toBe(8);
  });

  it("abelian subgroup has order 96", () => {
    expect(enumerateGroup().filter(e => e.m === 0).length).toBe(96);
  });

  it("acts transitively on 96 vertices", () => {
    expect(isTransitive()).toBe(true);
  });

  it("orbit-stabilizer: |G| = |Orb| × |Stab|", () => {
    const orb = orbit(0);
    const stab = stabilizer(0);
    expect(orb.size * stab.length).toBe(GROUP_ORDER);
  });

  it("abelian subgroup closed under composition", () => {
    const elems = enumerateGroup().filter(e => e.m === 0);
    for (let i = 0; i < 20; i++) {
      const a = elems[(i * 7) % elems.length];
      const b = elems[(i * 13 + 5) % elems.length];
      const c = compose(a, b);
      expect(c.m).toBe(0);
    }
  });

  it("every element is invertible (20 samples)", () => {
    const elems = enumerateGroup();
    for (let i = 0; i < 20; i++) {
      const g = elems[i];
      const inv = inverse(g);
      expect(applyTransform(applyTransform(0, g), inv)).toBe(0);
      expect(applyTransform(applyTransform(1, g), inv)).toBe(1);
    }
  });

  describe("Full verification report", () => {
    it("all 12 tests pass", () => {
      const report = runTransformGroupVerification();
      for (const test of report.tests) {
        expect(test.holds, `"${test.name}": expected ${test.expected}, got ${test.actual}`).toBe(true);
      }
      expect(report.allPassed).toBe(true);
    });

    it("group order = 192", () => {
      expect(runTransformGroupVerification().groupOrder).toBe(192);
    });
  });
});
