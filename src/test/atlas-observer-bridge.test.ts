/**
 * Atlas Observer Bridge — Phase 4 Test Suite
 */

import { describe, it, expect } from "vitest";
import {
  selectMorphism,
  computeTranslation,
  runObserverBridgeVerification,
  type ObserverState,
} from "@/modules/atlas/observer-bridge";

describe("Observer Bridge: Zone → Categorical Operation", () => {
  it("COHERENCE + high Φ → E₈ embedding (lossless)", () => {
    const s: ObserverState = { zone: "COHERENCE", hScore: 0.05, phi: 0.9, persistence: 10 };
    const m = selectMorphism(s);
    expect(m.operation).toBe("embedding");
    expect(m.lossless).toBe(true);
    expect(m.group).toBe("E₈");
  });

  it("COHERENCE + low Φ → E₇ augmentation", () => {
    const s: ObserverState = { zone: "COHERENCE", hScore: 0.1, phi: 0.5, persistence: 5 };
    expect(selectMorphism(s).operation).toBe("augmentation");
  });

  it("DRIFT + low H → E₆ filtration", () => {
    const s: ObserverState = { zone: "DRIFT", hScore: 0.35, phi: 0.4, persistence: 3 };
    expect(selectMorphism(s).operation).toBe("filtration");
  });

  it("DRIFT + high H → F₄ quotient", () => {
    const s: ObserverState = { zone: "DRIFT", hScore: 0.6, phi: 0.3, persistence: 2 };
    expect(selectMorphism(s).operation).toBe("quotient");
  });

  it("COLLAPSE → G₂ product (minimal)", () => {
    const s: ObserverState = { zone: "COLLAPSE", hScore: 0.85, phi: 0.1, persistence: 1 };
    expect(selectMorphism(s).operation).toBe("product");
    expect(selectMorphism(s).roots).toBe(12);
  });

  it("fidelity budget increases with group size", () => {
    const coherent = selectMorphism({ zone: "COHERENCE", hScore: 0.05, phi: 0.9, persistence: 10 });
    const drift = selectMorphism({ zone: "DRIFT", hScore: 0.35, phi: 0.4, persistence: 3 });
    const collapse = selectMorphism({ zone: "COLLAPSE", hScore: 0.85, phi: 0.1, persistence: 1 });
    expect(coherent.fidelityBudget).toBeGreaterThan(drift.fidelityBudget);
    expect(drift.fidelityBudget).toBeGreaterThan(collapse.fidelityBudget);
  });

  it("round-trip exact only for E₈", () => {
    const req1 = {
      sourceModality: "jsonld", targetModality: "turtle", sourceBytes: 1024,
      observer: { zone: "COHERENCE" as const, hScore: 0.05, phi: 0.9, persistence: 10 },
    };
    expect(computeTranslation(req1).roundTripExact).toBe(true);
    const req2 = {
      sourceModality: "jsonld", targetModality: "turtle", sourceBytes: 1024,
      observer: { zone: "COLLAPSE" as const, hScore: 0.85, phi: 0.1, persistence: 1 },
    };
    expect(computeTranslation(req2).roundTripExact).toBe(false);
  });
});

describe("Full Observer Bridge Report", () => {
  it("all 12 verification tests pass", () => {
    const report = runObserverBridgeVerification();
    expect(report.allPassed).toBe(true);
    expect(report.tests.length).toBe(12);
    for (const test of report.tests) {
      expect(test.holds).toBe(true);
    }
  });

  it("all zone transitions are valid", () => {
    const report = runObserverBridgeVerification();
    expect(report.zoneTransitions.length).toBe(3);
    for (const t of report.zoneTransitions) {
      expect(t.valid).toBe(true);
    }
  });
});
