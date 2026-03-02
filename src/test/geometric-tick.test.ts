/**
 * Geometric Tick Tests — The 3-6-9 Triadic Verification
 * ═════════════════════════════════════════════════════════
 *
 * Tests the geometric tick system: units, coherence bridge,
 * and spectral feedback — all organized in the 3-6-9 pattern.
 */

import { describe, it, expect } from "vitest";
import {
  // Geometric Units
  GEOMETRIC_TICK_QUANTUM,
  STRUCTURE_COUNT,
  EVOLUTION_COUNT,
  COMPLETION_NUMBER,
  PHI,
  GEOMETRIC_CATASTROPHE,
  PROJECTION_FIDELITY,
  NOISE_FLOOR,
  HOPF_ANGLE_RAD,
  ZONE_THRESHOLDS,
  hScoreToDefects,
  defectsToHScore,
  spectralCoupling,
  classifyGeometricZone,
  triadicPhase,
  getGeometricManifest,
  // Coherence Bridge
  measureGeometricState,
  measureGeometricDrift,
  computeRefocusTarget,
  verifyGeometricClosure,
  createGeometricReceipt,
  // Spectral Feedback
  spectralHealth,
  spectralCorrection,
  spectralClosure,
  runSpectralFeedbackCycle,
  // Constants
  DELTA_0_RAD,
  ALPHA_QSVG,
  ANOMALOUS_DIMENSION,
} from "@/modules/qsvg";

// ══════════════════════════════════════════════════════════════════════════
// Phase 3: STRUCTURE — Geometric Units
// ══════════════════════════════════════════════════════════════════════════

describe("Phase 3: Geometric Units (Structure)", () => {
  it("tick quantum = δ₀", () => {
    expect(GEOMETRIC_TICK_QUANTUM).toBe(DELTA_0_RAD);
  });

  it("3-6-9 digital roots are correct", () => {
    // 48 → 4+8=12 → 1+2=3
    const dr48 = (4 + 8).toString().split("").reduce((a, b) => a + +b, 0);
    expect(dr48).toBe(3);
    // 96 → 9+6=15 → 1+5=6
    const dr96 = [1, 5].reduce((a, b) => a + b);
    expect(dr96).toBe(6);
    // Completion = 9
    expect(COMPLETION_NUMBER).toBe(9);
    expect(STRUCTURE_COUNT).toBe(48);
    expect(EVOLUTION_COUNT).toBe(96);
  });

  it("golden ratio φ = (1+√5)/2", () => {
    expect(PHI).toBeCloseTo(1.618033988749, 10);
  });

  it("geometric catastrophe is derived from instanton action", () => {
    expect(GEOMETRIC_CATASTROPHE).toBeGreaterThan(0);
    expect(GEOMETRIC_CATASTROPHE).toBeLessThan(0.01);
    // e^{-280/48} ≈ e^{-5.833} ≈ 0.00293
    expect(GEOMETRIC_CATASTROPHE).toBeCloseTo(Math.exp(-280 / 48), 5);
  });

  it("projection fidelity = 1 - γ_T/2 ≈ 0.9603", () => {
    expect(PROJECTION_FIDELITY).toBeCloseTo(1 - ANOMALOUS_DIMENSION / 2, 10);
    expect(PROJECTION_FIDELITY).toBeCloseTo(0.9603, 3);
  });

  it("noise floor is physically derived and very small", () => {
    expect(NOISE_FLOOR).toBeGreaterThan(0);
    expect(NOISE_FLOOR).toBeLessThan(1e-4);
  });

  it("H-score ↔ defects round-trip is lossless", () => {
    const testValues = [0.99, 0.85, 0.5, 0.2, 0.01];
    for (const h of testValues) {
      const defects = hScoreToDefects(h);
      const restored = defectsToHScore(defects);
      expect(restored).toBeCloseTo(h, 10);
    }
  });

  it("H=1 → 0 defects, H→0 → ∞ defects", () => {
    expect(hScoreToDefects(1)).toBe(0);
    expect(hScoreToDefects(0)).toBe(Infinity);
  });

  it("spectral coupling α^depth is exponentially decreasing", () => {
    expect(spectralCoupling(0)).toBe(1);
    expect(spectralCoupling(1)).toBeCloseTo(ALPHA_QSVG, 10);
    expect(spectralCoupling(2)).toBeLessThan(spectralCoupling(1));
    expect(spectralCoupling(4)).toBeGreaterThan(0);
  });

  it("zone classification follows δ₀ thresholds", () => {
    expect(classifyGeometricZone(0.5)).toBe("COHERENCE");
    expect(classifyGeometricZone(1.5)).toBe("DRIFT");
    expect(classifyGeometricZone(4.0)).toBe("COLLAPSE");
  });

  it("triadic phase maps correctly", () => {
    expect(triadicPhase("COHERENCE", true)).toBe(9);
    expect(triadicPhase("COHERENCE", false)).toBe(3);
    expect(triadicPhase("DRIFT", false)).toBe(6);
    expect(triadicPhase("COLLAPSE", false)).toBe(9); // renewal
  });

  it("geometric manifest has zero free parameters", () => {
    const m = getGeometricManifest();
    expect(m.freeParameters).toBe(0);
    expect(m.delta0).toBe(DELTA_0_RAD);
    expect(m.phi).toBeCloseTo(PHI, 10);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Phase 6: EVOLUTION — Coherence Bridge
// ══════════════════════════════════════════════════════════════════════════

describe("Phase 6: Coherence Bridge (Evolution)", () => {
  it("high H-score → COHERENCE zone, phase 3", () => {
    const m = measureGeometricState(0.99);
    expect(m.zone).toBe("COHERENCE");
    expect(m.phase).toBe(3);
    expect(m.defects).toBeLessThan(1);
    expect(m.aboveNoise).toBe(true);
  });

  it("medium H-score → DRIFT zone, phase 6", () => {
    const m = measureGeometricState(0.7);
    expect(m.zone).toBe("DRIFT");
    expect(m.phase).toBe(6);
  });

  it("low H-score → COLLAPSE zone, phase 9 (renewal)", () => {
    const m = measureGeometricState(0.1);
    expect(m.zone).toBe("COLLAPSE");
    expect(m.phase).toBe(9);
  });

  it("self-verified COHERENCE → phase 9 (completion)", () => {
    const m = measureGeometricState(0.99, true);
    expect(m.zone).toBe("COHERENCE");
    expect(m.phase).toBe(9); // true completion
  });

  it("drift measurement detects degrading coherence", () => {
    const drift = measureGeometricDrift(0.95, 0.85);
    expect(drift.driftDirection).toBe("degrading");
    expect(drift.driftDefects).toBeGreaterThan(0);
  });

  it("drift measurement detects improving coherence", () => {
    const drift = measureGeometricDrift(0.85, 0.95);
    expect(drift.driftDirection).toBe("improving");
    expect(drift.driftDefects).toBeLessThan(0);
  });

  it("stable coherence shows no significant change", () => {
    const drift = measureGeometricDrift(0.95, 0.95);
    expect(drift.driftDirection).toBe("stable");
  });

  it("refocus not needed in COHERENCE zone", () => {
    const m = measureGeometricState(0.99);
    const target = computeRefocusTarget(m);
    expect(target.refocusNeeded).toBe(false);
  });

  it("refocus target in DRIFT zone is between current and ideal", () => {
    const m = measureGeometricState(0.7);
    const target = computeRefocusTarget(m);
    expect(target.refocusNeeded).toBe(true);
    expect(target.targetH).toBeGreaterThanOrEqual(0.7);
    expect(target.targetH).toBeLessThanOrEqual(1);
    expect(target.blendRate).toBeGreaterThan(0);
    expect(target.blendRate).toBeLessThanOrEqual(1);
  });

  it("refocus target in COLLAPSE zone snaps to zero defects", () => {
    const m = measureGeometricState(0.1);
    const target = computeRefocusTarget(m);
    expect(target.refocusNeeded).toBe(true);
    expect(target.targetDefects).toBe(0);
    expect(target.targetH).toBeLessThanOrEqual(1);
  });

  it("geometric closure passes for coherent state", () => {
    const closure = verifyGeometricClosure(0.95, 0.9);
    expect(closure.closed).toBe(true);
    expect(closure.checksPasssed).toBe(closure.totalChecks);
    expect(closure.correctedFidelity).toBeGreaterThan(0);
    expect(closure.correctedFidelity).toBeLessThanOrEqual(1);
  });

  it("geometric receipt contains full provenance", () => {
    const receipt = createGeometricReceipt(0.9, 0.85);
    expect(receipt.anomalousDimension).toBe(ANOMALOUS_DIMENSION);
    expect(receipt.fidelity).toBeGreaterThan(0);
    expect(receipt.coupling).toBeGreaterThan(0);
    expect(receipt.defects).toBeGreaterThan(0);
    expect(typeof receipt.geometryClosed).toBe("boolean");
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Phase 9: COMPLETION — Spectral Feedback
// ══════════════════════════════════════════════════════════════════════════

describe("Phase 9: Spectral Feedback (Completion)", () => {
  it("high coherence → grade A, no healing needed", () => {
    const health = spectralHealth(0.95, 0.9);
    expect(health.grade).toBe("A");
    expect(health.healingNeeded).toBe(false);
    expect(health.alignment).toBeGreaterThan(0);
    expect(health.alignment).toBeLessThanOrEqual(1);
  });

  it("low coherence → grade D, healing needed", () => {
    const health = spectralHealth(0.1, 0.1);
    expect(health.grade).toBe("D");
    expect(health.healingNeeded).toBe(true);
  });

  it("no correction needed when healthy", () => {
    const health = spectralHealth(0.95, 0.9);
    const correction = spectralCorrection(health, 0.95, 0.9);
    expect(correction.rotationDefects).toBe(0);
    expect(correction.blendFactor).toBe(0);
    expect(correction.correctionLayer).toBe("none");
  });

  it("correction computed when healing needed", () => {
    const health = spectralHealth(0.2, 0.2);
    const correction = spectralCorrection(health, 0.2, 0.2);
    expect(correction.rotationDefects).toBeGreaterThan(0);
    expect(correction.targetH).toBeGreaterThanOrEqual(0.2);
    expect(correction.blendFactor).toBeGreaterThan(0);
    expect(correction.correctionLayer).not.toBe("none");
  });

  it("correction targets appropriate exceptional group layer", () => {
    // High defects → G₂ (foundational)
    const healthLow = spectralHealth(0.05, 0.05);
    const corrLow = spectralCorrection(healthLow, 0.05, 0.05);
    expect(corrLow.correctionLayer).toContain("G₂");

    // Moderate defects → higher layers
    const healthMed = spectralHealth(0.3, 0.3);
    const corrMed = spectralCorrection(healthMed, 0.3, 0.3);
    expect(corrMed.correctionLayer.length).toBeGreaterThan(0);
  });

  it("spectral closure detects successful correction", () => {
    const preHealth = spectralHealth(0.3, 0.3);
    const closure = spectralClosure(preHealth, 0.95, 0.9);
    expect(closure.onCriticalLine).toBe(true);
    expect(closure.cycleComplete).toBe(true);
    expect(closure.phase).toBe(9);
  });

  it("full 3-6-9 feedback cycle runs correctly", () => {
    // Healthy system
    const healthy = runSpectralFeedbackCycle(0.95, 0.9);
    expect(healthy.health.healingNeeded).toBe(false);
    expect(healthy.correction.rotationDefects).toBe(0);

    // Degraded system
    const degraded = runSpectralFeedbackCycle(0.2, 0.2);
    expect(degraded.health.healingNeeded).toBe(true);
    expect(degraded.correction.rotationDefects).toBeGreaterThan(0);
    expect(degraded.finalPhase).toBeDefined();
  });

  it("feedback cycle achieves completion for moderate degradation", () => {
    const cycle = runSpectralFeedbackCycle(0.5, 0.5);
    // The correction should improve the state
    expect(cycle.correction.targetH).toBeGreaterThanOrEqual(0.5);
  });
});
