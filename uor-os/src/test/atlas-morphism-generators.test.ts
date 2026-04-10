/**
 * Morphism Generators Test Suite
 * ═══════════════════════════════
 * Verifies the 7 categorical generators and their Fano plane correspondence.
 */
import { describe, it, expect } from "vitest";
import {
  getGenerators,
  getGenerator,
  getGeneratorTriples,
  fanoPointToGenerator,
  generatorToFanoPoint,
  runGeneratorAnalysis,
  type GeneratorKind,
} from "@/modules/atlas/morphism-generators";

describe("Phase 3: Extended 7 Morphism Generators", () => {
  it("exactly 7 generators", () => {
    expect(getGenerators().length).toBe(7);
  });

  it("all 7 Fano points covered", () => {
    const points = new Set(getGenerators().map(g => g.fanoPoint));
    expect(points.size).toBe(7);
  });

  it("original 5 operations preserved", () => {
    const orig5: GeneratorKind[] = ["product", "quotient", "filtration", "augmentation", "embedding"];
    for (const k of orig5) {
      expect(() => getGenerator(k)).not.toThrow();
    }
  });

  it("new generators: suspension and projection", () => {
    expect(getGenerator("suspension").signature).toContain("ΣA");
    expect(getGenerator("projection").signature).toContain("A × B → A");
  });

  it("7 generator triples (Fano lines)", () => {
    expect(getGeneratorTriples().length).toBe(7);
  });

  it("each generator in exactly 3 triples", () => {
    const counts = new Map<string, number>();
    for (const g of getGenerators()) counts.set(g.kind, 0);
    for (const t of getGeneratorTriples()) {
      for (const gk of t.generators) {
        counts.set(gk, (counts.get(gk) || 0) + 1);
      }
    }
    for (const [, c] of counts) expect(c).toBe(3);
  });

  it("fanoPointToGenerator round-trips", () => {
    for (let i = 0; i < 7; i++) {
      const kind = fanoPointToGenerator(i);
      expect(generatorToFanoPoint(kind)).toBe(i);
    }
  });

  it("dimensions follow G₂ < F₄ < E₆ < E₇ < E₈", () => {
    const dims = ["product", "quotient", "filtration", "augmentation", "embedding"]
      .map(k => getGenerator(k as GeneratorKind).dimension);
    for (let i = 1; i < dims.length; i++) {
      expect(dims[i]).toBeGreaterThan(dims[i - 1]);
    }
  });

  describe("Full generator analysis", () => {
    it("all 10 tests pass", () => {
      const report = runGeneratorAnalysis();
      for (const test of report.tests) {
        expect(test.holds, `"${test.name}": expected ${test.expected}, got ${test.actual}`).toBe(true);
      }
      expect(report.allPassed).toBe(true);
    });
  });
});
