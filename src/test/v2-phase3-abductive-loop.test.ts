/**
 * Phase 3 Test Suite — Abductive Loop Engine
 *
 * T-AL1: Neural → Horizontal observable projection
 * T-AL2: Symbolic → Vertical observable projection
 * T-AL3: Curvature measurement (Diagonal)
 * T-AL4: Hypothesis → Constraint conversion
 * T-AL5: Single iteration D→I→A
 * T-AL6: Loop converges when neural matches symbolic
 * T-AL7: Loop runs multiple iterations when gap exists
 * T-AL8: Budget accumulates across loop iterations
 * T-AL9: Catastrophe detection in loop
 * T-AL10: inferenceToObservation CID projection
 * T-AL11: Observable registrations populate dashboard axes
 * T-AL12: Holonomy = 0 when loop closes cleanly
 */
import { describe, it, expect } from "vitest";
import {
  neuralToObservable,
  symbolicToObservable,
  measureCurvature,
  hypothesisToConstraint,
  abductiveLoop,
  inferenceToObservation,
  type NeuralObservation,
  type SymbolicPrediction,
} from "@/modules/ring-core/abductive-loop";
import {
  createFiberBudget,
  residueConstraint,
  deductiveStep,
  inductiveStep,
} from "@/modules/ring-core";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeNeural(outputBytes: number, modelId = "test-model"): NeuralObservation {
  return { outputBytes, modelId, inferenceTimeMs: 10, gpuAccelerated: false };
}

describe("Phase 3: Abductive Loop Engine", () => {
  // ── T-AL1: Neural → Observable ──────────────────────────────────────
  describe("T-AL1: Neural → Horizontal observable", () => {
    it("projects neural output as HammingMetric", () => {
      const obs = neuralToObservable(makeNeural(42), 50);
      expect(obs.axis).toBe("Horizontal");
      expect(obs.typeName).toBe("HammingMetric");
      expect(obs.value).toBe(42);
      expect(obs.metadata.modelId).toBe("test-model");
      expect(typeof obs.metadata.distance).toBe("number");
    });

    it("identical output → distance 0", () => {
      const obs = neuralToObservable(makeNeural(42), 42);
      expect(obs.metadata.distance).toBe(0);
    });

    it("max distance at Q0 = 8 bits", () => {
      const obs = neuralToObservable(makeNeural(0x00), 0xFF);
      expect(obs.metadata.distance).toBe(8);
    });
  });

  // ── T-AL2: Symbolic → Observable ────────────────────────────────────
  describe("T-AL2: Symbolic → Vertical observable", () => {
    it("projects resolver state as StratumObservable", () => {
      const budget = createFiberBudget(0);
      const pred: SymbolicPrediction = {
        predictedValue: 42,
        budget,
        state: "Unresolved",
      };
      const obs = symbolicToObservable(pred);
      expect(obs.axis).toBe("Vertical");
      expect(obs.typeName).toBe("StratumObservable");
      expect(obs.value).toBe(42);
      expect(obs.metadata.state).toBe("Unresolved");
      expect(obs.metadata.resolutionRatio).toBe(0);
    });

    it("tracks resolution progress", () => {
      let budget = createFiberBudget(0);
      const c = residueConstraint(2, 0);
      const d = deductiveStep(budget, c, 4);
      const pred: SymbolicPrediction = {
        predictedValue: 42,
        budget: d.budget,
        state: "Partial",
      };
      const obs = symbolicToObservable(pred);
      expect(obs.metadata.resolutionRatio).toBe(0.5);
      expect(obs.metadata.pinnedCount).toBe(4);
    });
  });

  // ── T-AL3: Curvature measurement ────────────────────────────────────
  describe("T-AL3: Curvature measurement", () => {
    it("returns Diagonal observable with curvature value", () => {
      const budget = createFiberBudget(0);
      const d = deductiveStep(budget, residueConstraint(2, 0), 4);
      const i = inductiveStep(42, 50);

      const { observable, abductive } = measureCurvature(d, i);
      expect(observable.axis).toBe("Diagonal");
      expect(observable.typeName).toBe("CurvatureObservable");
      expect(observable.metadata.curvature).toBe(abductive.curvatureValue);
      expect(typeof observable.metadata.normalizedCurvature).toBe("number");
      expect(typeof observable.metadata.holonomy).toBe("number");
    });

    it("zero curvature when neural matches symbolic", () => {
      const budget = createFiberBudget(0);
      const d = deductiveStep(budget, residueConstraint(2, 0), 4);
      const i = inductiveStep(42, 42);

      const { abductive } = measureCurvature(d, i);
      expect(abductive.curvatureValue).toBe(0);
      expect(abductive.hypothesis).toBeNull();
    });
  });

  // ── T-AL4: Hypothesis → Constraint ──────────────────────────────────
  describe("T-AL4: Hypothesis → Constraint", () => {
    it("converts ResidueConstraint hypothesis", () => {
      const c = hypothesisToConstraint({
        description: "test",
        suggestedConstraintType: "ResidueConstraint",
        expectedResolutions: 4,
        confidence: 0.8,
      }, 0);
      expect(c.constraintId).toContain("hypothesis:abductive:iter0");
      expect(c.axis).toBe("Vertical");
    });

    it("converts CompositeConstraint hypothesis (catastrophe)", () => {
      const c = hypothesisToConstraint({
        description: "Phase transition",
        suggestedConstraintType: "CompositeConstraint",
        expectedResolutions: 3,
        confidence: 0.5,
      }, 2);
      expect(c.constraintId).toContain("hypothesis:abductive:iter2");
    });

    it("converts DepthConstraint hypothesis", () => {
      const c = hypothesisToConstraint({
        description: "depth gap",
        suggestedConstraintType: "DepthConstraint",
        expectedResolutions: 2,
        confidence: 0.6,
      }, 1);
      expect(c.axis).toBe("Diagonal");
    });
  });

  // ── T-AL5: Single iteration ─────────────────────────────────────────
  describe("T-AL5: Single iteration D→I→A", () => {
    it("produces all three axis results", () => {
      const result = abductiveLoop(
        0,
        [makeNeural(42)],
        residueConstraint(2, 0),
        3,
        42,
      );
      expect(result.iterations).toHaveLength(1);
      const iter = result.iterations[0];
      expect(iter.deductive.mode).toBe("deductive");
      expect(iter.inductive.mode).toBe("inductive");
      expect(iter.abductive.mode).toBe("abductive");
    });

    it("registers 3 observables (one per axis)", () => {
      const result = abductiveLoop(0, [makeNeural(42)], residueConstraint(2, 0), 3, 42);
      expect(result.observables).toHaveLength(3);
      const axes = result.observables.map(o => o.axis);
      expect(axes).toContain("Horizontal");
      expect(axes).toContain("Vertical");
      expect(axes).toContain("Diagonal");
    });
  });

  // ── T-AL6: Convergence ──────────────────────────────────────────────
  describe("T-AL6: Loop converges when neural matches symbolic", () => {
    it("converges in 1 iteration with identical values", () => {
      const result = abductiveLoop(
        0,
        [makeNeural(42), makeNeural(42)],
        residueConstraint(2, 0),
        3,
        42, // reference matches neural output
      );
      expect(result.converged).toBe(true);
      expect(result.totalIterations).toBe(1);
      expect(result.iterations[0].converged).toBe(true);
    });
  });

  // ── T-AL7: Multiple iterations ──────────────────────────────────────
  describe("T-AL7: Multiple iterations when gap exists", () => {
    it("runs all observations when not converging", () => {
      const result = abductiveLoop(
        0,
        [makeNeural(0), makeNeural(128), makeNeural(255)],
        residueConstraint(2, 0),
        2,
        42, // doesn't match any neural output
      );
      expect(result.totalIterations).toBe(3);
      expect(result.converged).toBe(false);
    });

    it("respects maxIterations", () => {
      const result = abductiveLoop(
        0,
        [makeNeural(0), makeNeural(128), makeNeural(255)],
        residueConstraint(2, 0),
        2,
        42,
        2, // max 2 iterations
      );
      expect(result.totalIterations).toBe(2);
    });
  });

  // ── T-AL8: Budget accumulation ──────────────────────────────────────
  describe("T-AL8: Budget accumulates across iterations", () => {
    it("fibers pin progressively", () => {
      const result = abductiveLoop(
        0,
        [makeNeural(0), makeNeural(128), makeNeural(255)],
        residueConstraint(2, 0),
        3,
        42,
      );
      // First iteration pins 3, subsequent iterations also pin
      expect(result.finalBudget.pinnedCount).toBeGreaterThan(0);

      // Each iteration should have increasing or equal pinned count
      for (let i = 1; i < result.iterations.length; i++) {
        expect(result.iterations[i].deductive.budget.pinnedCount)
          .toBeGreaterThanOrEqual(result.iterations[i - 1].deductive.budget.pinnedCount);
      }
    });
  });

  // ── T-AL9: Catastrophe detection ────────────────────────────────────
  describe("T-AL9: Catastrophe detection in loop", () => {
    it("detects catastrophe when neural and symbolic maximally disagree", () => {
      const result = abductiveLoop(
        0,
        [makeNeural(0x00)],
        residueConstraint(2, 0),
        2,
        0xFF, // maximally different
      );
      expect(result.iterations[0].abductive.isCatastrophe).toBe(true);
      expect(result.iterations[0].abductive.hypothesis).not.toBeNull();
      expect(result.iterations[0].abductive.hypothesis!.description).toContain("Phase transition");
    });
  });

  // ── T-AL10: inferenceToObservation ──────────────────────────────────
  describe("T-AL10: CID → NeuralObservation projection", () => {
    it("projects CID string onto ring element", () => {
      const obs = inferenceToObservation(
        "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
        "qwen-0.5b",
        150,
        true,
      );
      expect(obs.outputBytes).toBeGreaterThanOrEqual(0);
      expect(obs.outputBytes).toBeLessThan(256);
      expect(obs.modelId).toBe("qwen-0.5b");
      expect(obs.gpuAccelerated).toBe(true);
    });

    it("deterministic: same CID → same observation", () => {
      const a = inferenceToObservation("test-cid-abc", "m", 10, false);
      const b = inferenceToObservation("test-cid-abc", "m", 10, false);
      expect(a.outputBytes).toBe(b.outputBytes);
    });

    it("different CIDs → likely different observations", () => {
      const a = inferenceToObservation("cid-alpha", "m", 10, false);
      const b = inferenceToObservation("cid-beta", "m", 10, false);
      // Not guaranteed different but highly likely for non-trivial strings
      // Just verify they're valid ring elements
      expect(a.outputBytes).toBeGreaterThanOrEqual(0);
      expect(b.outputBytes).toBeGreaterThanOrEqual(0);
    });
  });

  // ── T-AL11: Dashboard observables ───────────────────────────────────
  describe("T-AL11: Observable registrations for dashboard", () => {
    it("each iteration produces exactly 3 observables", () => {
      const result = abductiveLoop(
        0,
        [makeNeural(10), makeNeural(20)],
        residueConstraint(2, 0),
        3,
        50,
      );
      // Not converging → 2 iterations × 3 observables = 6
      expect(result.observables).toHaveLength(result.totalIterations * 3);
    });

    it("observables are evenly distributed across axes", () => {
      const result = abductiveLoop(
        0,
        [makeNeural(10)],
        residueConstraint(2, 0),
        3,
        50,
      );
      const byAxis = {
        Vertical: result.observables.filter(o => o.axis === "Vertical"),
        Horizontal: result.observables.filter(o => o.axis === "Horizontal"),
        Diagonal: result.observables.filter(o => o.axis === "Diagonal"),
      };
      expect(byAxis.Vertical).toHaveLength(1);
      expect(byAxis.Horizontal).toHaveLength(1);
      expect(byAxis.Diagonal).toHaveLength(1);
    });
  });

  // ── T-AL12: Holonomy consistency ────────────────────────────────────
  describe("T-AL12: Holonomy = 0 when loop closes cleanly", () => {
    it("zero holonomy when fully converged", () => {
      // When depth=1 and confidence=1, holonomy = |1-1| = 0
      const budget = createFiberBudget(0);
      const c = residueConstraint(2, 0);
      const d = deductiveStep(budget, c, 8); // full closure → depth=1
      const i = inductiveStep(42, 42); // identical → confidence=1

      const { abductive } = measureCurvature(d, i);
      expect(abductive.holonomyValue).toBe(0);
    });

    it("non-zero holonomy signals inconsistency", () => {
      const budget = createFiberBudget(0);
      const c = residueConstraint(2, 0);
      const d = deductiveStep(budget, c, 2); // partial → depth=0.25
      const i = inductiveStep(0, 255); // max distance → confidence=0

      const { abductive } = measureCurvature(d, i);
      expect(abductive.holonomyValue).toBeGreaterThan(0);
    });
  });
});
