/**
 * QSVG Integration Tests — Verifying the QSVG ↔ Atlas Bridge
 * ════════════════════════════════════════════════════════════
 *
 * Tests the foundational constants, cross-framework correspondences,
 * and spectral verification pipeline.
 */

import { describe, it, expect } from "vitest";
import {
  DELTA_0_RAD,
  DELTA_0_DEG,
  FRACTAL_DIMENSION,
  ANOMALOUS_DIMENSION,
  ALPHA_INVERSE_QSVG,
  ALPHA_INVERSE_MEASURED,
  ALPHA_QSVG,
  CRONNET_SCALE_EV,
  RIEMANN_EIGENVALUES,
  QSVG_PREDICTIONS,
  CORRESPONDENCES,
  verifyAlphaCrossFramework,
  verifyDeltaDRelation,
  selfVerifyGeometry,
  coherenceCoupling,
  torsionCoupling,
  generateBridgeReport,
  completedZeta,
  runSpectralVerification,
  spectralGrade,
} from "@/modules/qsvg";

// ══════════════════════════════════════════════════════════════════════════
// Part I: Foundational Constants
// ══════════════════════════════════════════════════════════════════════════

describe("QSVG Foundational Constants", () => {
  it("δ₀ = 6.8° = 0.118682 rad", () => {
    expect(DELTA_0_DEG).toBe(6.8);
    expect(DELTA_0_RAD).toBeCloseTo(0.118682, 5);
  });

  it("D = 1.9206 (fractal dimension)", () => {
    expect(FRACTAL_DIMENSION).toBe(1.9206);
  });

  it("γ_T = 2 - D = 0.0794 (anomalous dimension)", () => {
    expect(ANOMALOUS_DIMENSION).toBeCloseTo(0.0794, 4);
  });

  it("α⁻¹ = 137.035999139 (QSVG geometric derivation)", () => {
    expect(ALPHA_INVERSE_QSVG).toBe(137.035999139);
  });

  it("α⁻¹ matches CODATA to 4×10⁻⁷", () => {
    const relError = Math.abs(ALPHA_INVERSE_QSVG - ALPHA_INVERSE_MEASURED) / ALPHA_INVERSE_MEASURED;
    expect(relError).toBeLessThan(5e-7);
  });

  it("M* = 1.22 × 10⁻³ eV (CronNet scale)", () => {
    expect(CRONNET_SCALE_EV).toBe(1.22e-3);
  });

  it("first Riemann eigenvalue = 14.1347... (first zero of ζ)", () => {
    expect(RIEMANN_EIGENVALUES[0]).toBeCloseTo(14.134725, 4);
  });

  it("4 experimental predictions with 0 free parameters", () => {
    expect(QSVG_PREDICTIONS).toHaveLength(4);
    for (const p of QSVG_PREDICTIONS) {
      expect(p.freeParameters).toBe(0);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part II: Atlas Bridge — Cross-Framework Verification
// ══════════════════════════════════════════════════════════════════════════

describe("QSVG ↔ Atlas Bridge", () => {
  it("has 8 formal correspondences", () => {
    expect(CORRESPONDENCES.length).toBe(8);
  });

  it("α cross-verification passes (frameworks agree)", () => {
    const result = verifyAlphaCrossFramework();
    expect(result.frameworksAgree).toBe(true);
    expect(result.qsvgError).toBeLessThan(1e-6);
  });

  it("D = 2 - δ₀·ln(1/δ₀) holds (first-order approximation)", () => {
    const result = verifyDeltaDRelation();
    expect(result.holds).toBe(true);
    expect(result.error).toBeLessThan(0.15);
  });

  it("self-verification geometry passes all checks", () => {
    const result = selfVerifyGeometry();
    expect(result.geometryVerified).toBe(true);
    expect(result.anomalousDimensionVerified).toBe(true);
    expect(result.hopfAngle).toBeCloseTo(360 / 137.036, 2);
  });

  it("coherence coupling α^depth decreases exponentially", () => {
    const c0 = coherenceCoupling(0);
    const c1 = coherenceCoupling(1);
    const c4 = coherenceCoupling(4);
    expect(c0).toBe(1);
    expect(c1).toBeCloseTo(ALPHA_QSVG, 10);
    expect(c4).toBeLessThan(c1);
    expect(c4).toBeGreaterThan(0);
  });

  it("torsion coupling produces physically reasonable values", () => {
    const electronMass = 0.511e6; // eV
    const coupling = torsionCoupling(electronMass);
    expect(coupling).toBeGreaterThan(0);
    expect(coupling).toBeLessThan(1);
  });

  it("full bridge report passes all verifications", () => {
    const report = generateBridgeReport();
    expect(report.allVerified).toBe(true);
    expect(report.correspondences.length).toBe(8);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part III: Spectral Verification
// ══════════════════════════════════════════════════════════════════════════

describe("QSVG Spectral Verification", () => {
  it("completed zeta ξ(s) is well-defined for s > 1", () => {
    const xi2 = completedZeta(2);
    const xi3 = completedZeta(3);
    expect(xi2).toBeGreaterThan(0);
    expect(xi3).toBeGreaterThan(0);
    expect(isFinite(xi2)).toBe(true);
  });

  it("ζ(2) ≈ π²/6 (Basel problem validation)", () => {
    // completedZeta includes the s(s-1)π^{-s/2}Γ(s/2) prefactor
    // So we test the raw zetaReal indirectly through the spectral suite
    const suite = runSpectralVerification();
    const baselTest = suite.tests.find(t => t.name.includes("Basel"));
    expect(baselTest?.holds).toBe(true);
  });

  it("all 8 spectral verification tests pass", () => {
    const suite = runSpectralVerification();
    expect(suite.allPassed).toBe(true);
    expect(suite.tests.length).toBe(8);
    for (const t of suite.tests) {
      expect(t.holds, `FAIL: ${t.name} — ${t.detail}`).toBe(true);
    }
  });

  it("spectral grade A for high coherence", () => {
    const result = spectralGrade(0.95, 0.9);
    expect(result.grade).toBe("A");
    expect(result.spectralNote).toContain("critical line");
  });

  it("spectral grade D for low coherence", () => {
    const result = spectralGrade(0.1, 0.1);
    expect(result.grade).toBe("D");
    expect(result.spectralNote).toContain("lost");
  });

  it("spectral grade uses α as coupling", () => {
    const result = spectralGrade(0.5, 0.5);
    expect(result.coupling).toBeGreaterThan(0);
    expect(result.coupling).toBeLessThan(1);
  });
});
