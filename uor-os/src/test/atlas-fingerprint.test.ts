/**
 * Atlas Fingerprint Test Suite
 * ════════════════════════════
 *
 * Verifies the Universal Model Fingerprint produces valid,
 * structurally consistent labels for all 16 model architectures.
 */

import { describe, it, expect } from "vitest";
import {
  fingerprint,
  fingerprintAll,
  generateFingerprintReport,
} from "@/modules/atlas/fingerprint";
import { MODEL_CATALOG } from "@/modules/atlas/convergence";

describe("Individual Fingerprints", () => {
  it("generates fingerprints for all 16 models", () => {
    const fps = fingerprintAll();
    expect(fps.length).toBe(16);
  });

  it("every fingerprint has valid operation profile (sums to ~1)", () => {
    for (const m of MODEL_CATALOG) {
      const fp = fingerprint(m);
      const sum = fp.operationProfile.product + fp.operationProfile.quotient +
                  fp.operationProfile.filtration + fp.operationProfile.augmentation +
                  fp.operationProfile.embedding;
      expect(Math.abs(sum - 1)).toBeLessThan(1e-10);
    }
  });

  it("every model is E₇ (augmentation) dominant", () => {
    for (const m of MODEL_CATALOG) {
      const fp = fingerprint(m);
      expect(fp.dominantOperation).toBe("augmentation");
      expect(fp.dominantGroup).toBe("E₇");
    }
  });

  it("every fingerprint has clean factorization (bit 7 set)", () => {
    for (const m of MODEL_CATALOG) {
      const fp = fingerprint(m);
      expect(fp.signature.bits & 128).toBe(128);
    }
  });

  it("regularity score is between 0 and 1", () => {
    for (const m of MODEL_CATALOG) {
      const fp = fingerprint(m);
      expect(fp.regularityScore).toBeGreaterThan(0);
      expect(fp.regularityScore).toBeLessThanOrEqual(1);
    }
  });

  it("atlas resonance is between 0 and 1", () => {
    for (const m of MODEL_CATALOG) {
      const fp = fingerprint(m);
      expect(fp.atlasResonance).toBeGreaterThanOrEqual(0);
      expect(fp.atlasResonance).toBeLessThanOrEqual(1);
    }
  });

  it("sign class is 0-7", () => {
    for (const m of MODEL_CATALOG) {
      const fp = fingerprint(m);
      expect(fp.signClass).toBeGreaterThanOrEqual(0);
      expect(fp.signClass).toBeLessThanOrEqual(7);
    }
  });

  it("R₈ rings > 0 for all models", () => {
    for (const m of MODEL_CATALOG) {
      const fp = fingerprint(m);
      expect(fp.r8Rings).toBeGreaterThan(0);
    }
  });

  it("larger models have more R₈ rings", () => {
    const gpt2 = fingerprint(MODEL_CATALOG.find(m => m.name === "GPT-2")!);
    const gpt3 = fingerprint(MODEL_CATALOG.find(m => m.name === "GPT-3")!);
    expect(gpt3.r8Rings).toBeGreaterThan(gpt2.r8Rings);
  });

  it("head-to-edge ratio ≤ 1", () => {
    for (const m of MODEL_CATALOG) {
      const fp = fingerprint(m);
      expect(fp.headEdgeRatio).toBeLessThanOrEqual(1);
    }
  });
});

describe("Cross-Model Invariants", () => {
  it("augmentation always dominates (universal theorem)", () => {
    const fps = fingerprintAll();
    const allAug = fps.every(f => f.dominantOperation === "augmentation");
    expect(allAug).toBe(true);
  });

  it("all models have fidelity ≥ lossy", () => {
    const fps = fingerprintAll();
    const valid = fps.every(f => f.fidelityClass !== "compressed");
    expect(valid).toBe(true);
  });

  it("mean atlas resonance ≥ 60%", () => {
    const fps = fingerprintAll();
    const mean = fps.reduce((s, f) => s + f.atlasResonance, 0) / fps.length;
    expect(mean).toBeGreaterThanOrEqual(0.6);
  });
});

describe("Fingerprint Report", () => {
  it("all 6 invariants satisfied", () => {
    const report = generateFingerprintReport();
    expect(report.invariantsSatisfied).toBe(report.invariantsTotal);
    expect(report.invariantsTotal).toBe(6);
  });

  it("has family profiles for 6+ families", () => {
    const report = generateFingerprintReport();
    expect(report.familyProfiles.length).toBeGreaterThanOrEqual(6);
  });

  it("every family profile has valid metrics", () => {
    const report = generateFingerprintReport();
    for (const fp of report.familyProfiles) {
      expect(fp.modelCount).toBeGreaterThan(0);
      expect(fp.avgRegularity).toBeGreaterThan(0);
      expect(fp.avgResonance).toBeGreaterThan(0);
      expect(fp.paramRange[1]).toBeGreaterThanOrEqual(fp.paramRange[0]);
    }
  });
});
