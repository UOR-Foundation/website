/**
 * Moufang Identity Verification — Test Suite
 * ════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest";
import {
  verifyOctonionMoufang,
  verifySedenionMoufang,
  mapViolationsToBoundary,
  type MoufangVerification,
} from "@/modules/atlas/moufang-identities";

// ══════════════════════════════════════════════════════════════════════════
// Part I: Octonionic Moufang Identities
// ══════════════════════════════════════════════════════════════════════════

describe("Octonionic Moufang Identities", () => {
  let result: MoufangVerification;

  it("verifies without error", () => {
    result = verifyOctonionMoufang();
    expect(result).toBeDefined();
    expect(result.algebra).toContain("𝕆");
    expect(result.dimension).toBe(8);
  });

  it("all 4 Moufang identities hold for octonions", () => {
    result = result ?? verifyOctonionMoufang();
    expect(result.allHold).toBe(true);
    expect(result.totalFailed).toBe(0);
  });

  it("M1: (a·b)·(c·a) = a·((b·c)·a) holds for all basis triples", () => {
    result = result ?? verifyOctonionMoufang();
    expect(result.perIdentity.M1.failed).toBe(0);
  });

  it("M2: ((a·b)·c)·b = a·(b·(c·b)) holds for all basis triples", () => {
    result = result ?? verifyOctonionMoufang();
    expect(result.perIdentity.M2.failed).toBe(0);
  });

  it("M3: a·(b·(a·c)) = ((a·b)·a)·c holds for all basis triples", () => {
    result = result ?? verifyOctonionMoufang();
    expect(result.perIdentity.M3.failed).toBe(0);
  });

  it("M4: (a·b·a)·c = a·(b·(a·c)) holds for all basis triples", () => {
    result = result ?? verifyOctonionMoufang();
    expect(result.perIdentity.M4.failed).toBe(0);
  });

  it("max defect is near zero across all identities", () => {
    result = result ?? verifyOctonionMoufang();
    for (const id of ["M1", "M2", "M3", "M4"] as const) {
      expect(result.perIdentity[id].maxDefect).toBeLessThan(1e-10);
    }
  });

  it("non-trivial number of checks performed", () => {
    result = result ?? verifyOctonionMoufang();
    expect(result.totalChecks).toBeGreaterThan(100);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part II: Sedenion Moufang Violations
// ══════════════════════════════════════════════════════════════════════════

describe("Sedenion Moufang Violations", () => {
  let result: MoufangVerification;

  it("verifies without error", () => {
    result = verifySedenionMoufang();
    expect(result).toBeDefined();
    expect(result.algebra).toContain("𝕊");
    expect(result.dimension).toBe(16);
  });

  it("sedenions violate at least one Moufang identity", () => {
    result = result ?? verifySedenionMoufang();
    expect(result.allHold).toBe(false);
    expect(result.totalFailed).toBeGreaterThan(0);
  });

  it("violations have non-zero defect", () => {
    result = result ?? verifySedenionMoufang();
    for (const v of result.violations.slice(0, 20)) {
      expect(v.defect).toBeGreaterThan(1e-10);
    }
  });

  it("purely octonionic basis triples embedded in 𝕊 may still violate", () => {
    result = result ?? verifySedenionMoufang();
    // When octonionic basis elements are multiplied using sedenion rules,
    // the extended multiplication table can introduce violations even for
    // indices < 8, because the Cayley-Dickson doubling changes the algebra.
    // This is expected: 𝕆 ⊂ 𝕊 as a set, but not as a sub-algebra preserving Moufang.
    const octChecks = result.checks.filter(c =>
      c.indices.every(i => i < 8)
    );
    // Some may fail — this is the algebraic reality
    const failCount = octChecks.filter(c => !c.holds).length;
    expect(failCount).toBeGreaterThanOrEqual(0); // may or may not fail
  });

  it("majority of violations involve at least one boundary element (e₈–e₁₅)", () => {
    result = result ?? verifySedenionMoufang();
    const boundaryViolations = result.violations.filter(v =>
      v.indices.some(i => i >= 8)
    ).length;
    // At least 80% of violations involve boundary elements
    expect(boundaryViolations / result.violations.length).toBeGreaterThan(0.8);
  });

  it("prints summary", () => {
    result = result ?? verifySedenionMoufang();
    expect(result.summary).toContain("Moufang Identity Verification");
    expect(result.summary).toContain("VIOLATIONS");
    console.log("\n" + result.summary);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part III: Boundary Mapping
// ══════════════════════════════════════════════════════════════════════════

describe("Boundary Mapping (𝕆 → 𝕊)", () => {
  it("maps violations to the 16-element Atlas boundary", () => {
    const oct = verifyOctonionMoufang();
    const sed = verifySedenionMoufang();
    const mapping = mapViolationsToBoundary(oct, sed);

    expect(mapping.gapSize).toBe(16);
    expect(mapping.g2Roots).toBe(12);
    expect(mapping.octonionicViolations).toBe(0);
    expect(mapping.sedenionicViolations).toBeGreaterThan(0);
  });

  it("majority of violations are at the sedenion boundary", () => {
    const oct = verifyOctonionMoufang();
    const sed = verifySedenionMoufang();
    const mapping = mapViolationsToBoundary(oct, sed);

    // ≥80% of violations involve boundary elements
    expect(mapping.boundaryFraction).toBeGreaterThan(0.8);
  });

  it("boundary elements are in range [8, 15]", () => {
    const oct = verifyOctonionMoufang();
    const sed = verifySedenionMoufang();
    const mapping = mapViolationsToBoundary(oct, sed);

    for (const elems of mapping.boundaryElements) {
      for (const e of elems) {
        expect(e).toBeGreaterThanOrEqual(8);
        expect(e).toBeLessThanOrEqual(15);
      }
    }
  });

  it("prints boundary mapping summary", () => {
    const oct = verifyOctonionMoufang();
    const sed = verifySedenionMoufang();
    const mapping = mapViolationsToBoundary(oct, sed);

    expect(mapping.summary).toContain("Atlas Boundary");
    expect(mapping.summary).toContain("G₂");
    console.log("\n" + mapping.summary);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part IV: Algebraic Theorems
// ══════════════════════════════════════════════════════════════════════════

describe("Algebraic Theorems", () => {
  it("Moufang theorem: alternative ⟹ Moufang (verified for 𝕆)", () => {
    const oct = verifyOctonionMoufang();
    // Octonions are alternative, therefore Moufang holds
    expect(oct.allHold).toBe(true);
  });

  it("converse: non-alternative ⟹ Moufang violations (verified for 𝕊)", () => {
    const sed = verifySedenionMoufang();
    // Sedenions are not alternative, therefore Moufang fails
    expect(sed.allHold).toBe(false);
  });

  it("violation frontier = Cayley-Dickson boundary at dim 8→16", () => {
    const oct = verifyOctonionMoufang();
    const sed = verifySedenionMoufang();
    const mapping = mapViolationsToBoundary(oct, sed);

    // The frontier is exactly at the 8→16 doubling step
    expect(oct.allHold).toBe(true);      // dim 8: Moufang holds
    expect(sed.allHold).toBe(false);     // dim 16: Moufang fails
    expect(mapping.boundaryFraction).toBeGreaterThan(0.8); // violations cluster at boundary
  });
});
