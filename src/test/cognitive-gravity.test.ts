/**
 * Cognitive Gravity — Isomorphism Proof Test Suite
 * ════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest";
import {
  hToGravity,
  gravityToH,
  cognitiveGradient,
  gradientToPhi,
  computeGravity,
  proveIsomorphism,
  runCognitiveGravityAnalysis,
  type CognitiveGravityReport,
} from "@/modules/atlas/cognitive-gravity";
import { constructPolynon } from "@/modules/atlas/geometric-consciousness";

const ALPHA = 1 / 137;

// ══════════════════════════════════════════════════════════════════════════
// Part I: Affine Isomorphism G ↔ H
// ══════════════════════════════════════════════════════════════════════════

describe("Affine Isomorphism G ↔ H", () => {
  it("G(0) = 1 (zero H → max gravity)", () => {
    expect(hToGravity(0)).toBe(1);
  });

  it("G(8) = 0 (max H → zero gravity)", () => {
    expect(hToGravity(8)).toBe(0);
  });

  it("H(1) = 0 (max G → zero H)", () => {
    expect(gravityToH(1)).toBe(0);
  });

  it("H(0) = 8 (zero G → max H)", () => {
    expect(gravityToH(0)).toBe(8);
  });

  it("round-trip T⁻¹(T(H)) = H for all integer H", () => {
    for (let h = 0; h <= 8; h++) {
      expect(gravityToH(hToGravity(h))).toBeCloseTo(h, 14);
    }
  });

  it("round-trip T(T⁻¹(G)) = G for 11 samples", () => {
    for (let g = 0; g <= 1; g += 0.1) {
      expect(hToGravity(gravityToH(g))).toBeCloseTo(g, 14);
    }
  });

  it("isomorphism is monotone decreasing: higher H → lower G", () => {
    for (let h = 0; h < 8; h++) {
      expect(hToGravity(h + 1)).toBeLessThan(hToGravity(h));
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part II: Gradient ↔ Phi
// ══════════════════════════════════════════════════════════════════════════

describe("Gradient ↔ Integration Capacity", () => {
  const polynon = constructPolynon(ALPHA);

  it("gradient is non-negative at all layers", () => {
    for (let d = 0; d < 5; d++) {
      expect(cognitiveGradient(polynon, d)).toBeGreaterThanOrEqual(0);
    }
  });

  it("largest gradient at depth 0 (Noumenon→Gestalt boundary)", () => {
    const grads = Array.from({ length: 5 }, (_, d) => cognitiveGradient(polynon, d));
    expect(grads[0]).toBe(Math.max(...grads));
  });

  it("Phi normalization: max Phi = 1.0", () => {
    const maxG = Math.max(...Array.from({ length: 5 }, (_, d) => cognitiveGradient(polynon, d)));
    expect(gradientToPhi(maxG, maxG)).toBeCloseTo(1.0);
  });

  it("gradient equals fidelity drop between layers", () => {
    for (let d = 0; d < 4; d++) {
      const expected = polynon.layers[d].fidelity - polynon.layers[d + 1].fidelity;
      expect(cognitiveGradient(polynon, d)).toBeCloseTo(expected, 15);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part III: Full Gravity Field
// ══════════════════════════════════════════════════════════════════════════

describe("Gravity Field over Polynon Layers", () => {
  it("gravity strictly decreases with depth", () => {
    const polynon = constructPolynon(ALPHA);
    const field = polynon.layers.map((_, d) => computeGravity(polynon, d));
    for (let i = 1; i < field.length; i++) {
      expect(field[i].G).toBeLessThan(field[i - 1].G);
    }
  });

  it("Noumenon maps to COHERENCE", () => {
    const polynon = constructPolynon(ALPHA);
    expect(computeGravity(polynon, 0).zone).toBe("COHERENCE");
  });

  it("Quale maps to COLLAPSE", () => {
    const polynon = constructPolynon(ALPHA);
    expect(computeGravity(polynon, 4).zone).toBe("COLLAPSE");
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part IV: Full Report & Internal Tests
// ══════════════════════════════════════════════════════════════════════════

describe("Cognitive Gravity — Full Report", () => {
  let report: CognitiveGravityReport;

  it("runs full analysis", () => {
    report = runCognitiveGravityAnalysis();
    expect(report).toBeDefined();
  });

  it("gravity field has 5 entries", () => {
    expect(report.gravityField.length).toBe(5);
  });

  it("isomorphism round-trip error < 1e-12", () => {
    expect(report.isomorphism.roundTripMaxError).toBeLessThan(1e-12);
  });

  it("all 14 internal tests pass", () => {
    for (const t of report.tests) {
      expect(t.holds, `FAIL: ${t.name} — ${t.detail}`).toBe(true);
    }
    expect(report.allPassed).toBe(true);
    expect(report.tests.length).toBe(14);
  });
});
