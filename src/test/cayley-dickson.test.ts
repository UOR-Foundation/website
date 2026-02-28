/**
 * Cayley-Dickson ↔ Atlas Correspondence — Verification Suite
 * ═══════════════════════════════════════════════════════════
 *
 * Proves the Cayley-Dickson doubling tower (R→C→H→O→S) maps to
 * Atlas structural layers with correct algebraic properties.
 */

import { describe, it, expect } from "vitest";
import {
  constructAlgebra,
  buildTower,
  fanoPlane,
  type CayleyDicksonAlgebra,
} from "@/modules/atlas/cayley-dickson";

// ══════════════════════════════════════════════════════════════════════════
// Part I: Individual Algebra Construction
// ══════════════════════════════════════════════════════════════════════════

describe("Cayley-Dickson Algebras — Construction", () => {
  it("R: dim=1, commutative, associative, division", () => {
    const r = constructAlgebra(0);
    expect(r.dim).toBe(1);
    expect(r.name).toBe("R");
    expect(r.properties.commutative).toBe(true);
    expect(r.properties.associative).toBe(true);
    expect(r.properties.division).toBe(true);
  });

  it("C: dim=2, commutative, associative, division", () => {
    const c = constructAlgebra(1);
    expect(c.dim).toBe(2);
    expect(c.properties.commutative).toBe(true);
    expect(c.properties.associative).toBe(true);
    expect(c.properties.division).toBe(true);
    expect(c.imaginaryUnits).toBe(1);
  });

  it("H: dim=4, NOT commutative, associative, division", () => {
    const h = constructAlgebra(2);
    expect(h.dim).toBe(4);
    expect(h.properties.commutative).toBe(false);
    expect(h.properties.associative).toBe(true);
    expect(h.properties.division).toBe(true);
    expect(h.imaginaryUnits).toBe(3);
  });

  it("O: dim=8, NOT commutative, NOT associative, alternative, division", () => {
    const o = constructAlgebra(3);
    expect(o.dim).toBe(8);
    expect(o.properties.commutative).toBe(false);
    expect(o.properties.associative).toBe(false);
    expect(o.properties.alternative).toBe(true);
    expect(o.properties.division).toBe(true);
    expect(o.imaginaryUnits).toBe(7);
  });

  it("S: dim=16, NOT alternative, NOT division (Hurwitz)", () => {
    const s = constructAlgebra(4);
    expect(s.dim).toBe(16);
    expect(s.properties.alternative).toBe(false);
    expect(s.properties.division).toBe(false);
    expect(s.imaginaryUnits).toBe(15);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part II: Atlas Layer Mappings
// ══════════════════════════════════════════════════════════════════════════

describe("Atlas Layer Correspondence", () => {
  it("R → Unity positions (2 elements)", () => {
    const r = constructAlgebra(0);
    expect(r.atlasLayer.count).toBe(2);
    expect(r.atlasLayer.structure).toContain("Unity");
  });

  it("C → Mirror involution τ (48 pairs)", () => {
    const c = constructAlgebra(1);
    expect(c.atlasLayer.count).toBe(48);
    expect(c.atlasLayer.structure).toContain("Mirror");
  });

  it("H → Klein-4 kernel V₄ (4 elements)", () => {
    const h = constructAlgebra(2);
    expect(h.atlasLayer.count).toBe(4);
    expect(h.atlasLayer.structure).toContain("Klein");
  });

  it("O → 8 sign classes", () => {
    const o = constructAlgebra(3);
    expect(o.atlasLayer.count).toBe(8);
    expect(o.atlasLayer.exceptionalGroup).toContain("G₂");
  });

  it("S → 16 boundary elements", () => {
    const s = constructAlgebra(4);
    expect(s.atlasLayer.count).toBe(16);
    expect(s.atlasLayer.roots).toBe(240);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part III: Full Tower Verification
// ══════════════════════════════════════════════════════════════════════════

describe("Complete Cayley-Dickson Tower", () => {
  it("all 14 internal verification tests pass", () => {
    const tower = buildTower();
    for (const t of tower.tests) {
      expect(t.holds, `FAIL: ${t.name} — ${t.detail}`).toBe(true);
    }
    expect(tower.allPassed).toBe(true);
    expect(tower.tests.length).toBe(14);
  });

  it("4 doubling steps R→C→H→O→S", () => {
    const tower = buildTower();
    expect(tower.doublings.length).toBe(4);
    expect(tower.doublings.map(d => `${d.from}→${d.to}`)).toEqual(["R→C", "C→H", "H→O", "O→S"]);
  });

  it("Clifford connection: 256 = 2⁸ = dim Cl(8,0)", () => {
    const tower = buildTower();
    expect(tower.cliffordConnection.cliffordDim).toBe(256);
    expect(tower.cliffordConnection.bottPeriod).toBe(8);
    expect(tower.cliffordConnection.sedenionDim).toBe(16);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part IV: Fano Plane
// ══════════════════════════════════════════════════════════════════════════

describe("Fano Plane — Octonionic Multiplication", () => {
  it("has 7 points and 7 lines", () => {
    const fp = fanoPlane();
    expect(fp.points.length).toBe(7);
    expect(fp.lines.length).toBe(7);
  });

  it("each line has 3 points", () => {
    const fp = fanoPlane();
    for (const line of fp.lines) {
      expect(line.length).toBe(3);
    }
  });

  it("each point appears in exactly 3 lines", () => {
    const fp = fanoPlane();
    for (let p = 0; p < 7; p++) {
      const count = fp.lines.filter(l => l.includes(p)).length;
      expect(count).toBe(3);
    }
  });
});
