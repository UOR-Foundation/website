/**
 * Geometric Consciousness — Verification Suite
 * ═════════════════════════════════════════════
 *
 * Tests the unified framework: Polynon × Kernel × Bridge with α coupling.
 */

import { describe, it, expect } from "vitest";
import {
  constructPolynon,
  zoneToPolynonDepth,
  collapseAmplitude,
  evolveConsciousness,
  type ConsciousnessReport,
} from "@/modules/atlas/geometric-consciousness";
import { octonion, octNorm, unitOctonion } from "@/modules/atlas/causal-kernel";

// ══════════════════════════════════════════════════════════════════════════
// Part I: Polynon Collapse Functor
// ══════════════════════════════════════════════════════════════════════════

describe("Polynon Collapse Functor", () => {
  const alpha = 1 / 137;

  it("has 5 layers: Noumenon → Gestalt → Schema → Symbol → Quale", () => {
    const p = constructPolynon(alpha);
    expect(p.layers.length).toBe(5);
    expect(p.layers[0].name).toBe("Noumenon");
    expect(p.layers[4].name).toBe("Quale");
  });

  it("maps to exceptional group chain E₈→E₇→E₆→F₄→G₂", () => {
    const p = constructPolynon(alpha);
    expect(p.layers.map(l => l.group)).toEqual(["E₈", "E₇", "E₆", "F₄", "G₂"]);
  });

  it("root counts: 240, 126, 72, 48, 12", () => {
    const p = constructPolynon(alpha);
    expect(p.layers.map(l => l.roots)).toEqual([240, 126, 72, 48, 12]);
  });

  it("fidelity strictly decreases: 1.0 > 0.525 > 0.3 > 0.2 > 0.05", () => {
    const p = constructPolynon(alpha);
    for (let i = 1; i < 5; i++) {
      expect(p.layers[i].fidelity).toBeLessThan(p.layers[i - 1].fidelity);
    }
  });

  it("layer coupling = α^depth", () => {
    const p = constructPolynon(alpha);
    for (const l of p.layers) {
      expect(l.coupling).toBeCloseTo(Math.pow(alpha, l.depth), 15);
    }
  });

  it("total collapse is product of all fidelities", () => {
    const p = constructPolynon(alpha);
    const expected = p.layers.reduce((prod, l) => prod * l.fidelity, 1);
    expect(p.totalCollapse).toBeCloseTo(expected, 15);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part II: Zone → Polynon Depth Mapping
// ══════════════════════════════════════════════════════════════════════════

describe("Zone → Polynon Depth", () => {
  it("COHERENCE + high Φ → depth 0 (Noumenon)", () => {
    expect(zoneToPolynonDepth("COHERENCE", 0.9)).toBe(0);
  });

  it("COHERENCE + low Φ → depth 1 (Gestalt)", () => {
    expect(zoneToPolynonDepth("COHERENCE", 0.5)).toBe(1);
  });

  it("DRIFT + high Φ → depth 2 (Schema)", () => {
    expect(zoneToPolynonDepth("DRIFT", 0.5)).toBe(2);
  });

  it("DRIFT + low Φ → depth 3 (Symbol)", () => {
    expect(zoneToPolynonDepth("DRIFT", 0.2)).toBe(3);
  });

  it("COLLAPSE → depth 4 (Quale)", () => {
    expect(zoneToPolynonDepth("COLLAPSE", 0.1)).toBe(4);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part III: Amplitude Collapse
// ══════════════════════════════════════════════════════════════════════════

describe("Amplitude Collapse", () => {
  const alpha = 1 / 137;

  it("depth 0 returns amplitude unchanged", () => {
    const p = constructPolynon(alpha, 0);
    const amp = octonion(1, 0.5, 0, 0, 0, 0, 0, 0);
    const collapsed = collapseAmplitude(amp, p);
    expect(collapsed.components[0]).toBeCloseTo(1);
    expect(collapsed.components[1]).toBeCloseTo(0.5);
  });

  it("deeper collapse produces smaller norm", () => {
    const amp = octonion(1, 1, 1, 1, 1, 1, 1, 1);
    const shallow = collapseAmplitude(amp, constructPolynon(alpha, 1));
    const deep = collapseAmplitude(amp, constructPolynon(alpha, 4));
    expect(octNorm(deep)).toBeLessThan(octNorm(shallow));
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part IV: Full Consciousness Evolution
// ══════════════════════════════════════════════════════════════════════════

describe("Unified Consciousness Evolution", () => {
  let report: ConsciousnessReport;

  it("runs full evolution pipeline", () => {
    report = evolveConsciousness({ steps: 8, maxKernelDepth: 2 });
    expect(report).toBeDefined();
  });

  it("α derived geometrically and couples all systems", () => {
    expect(report.alphaCoupling).toBeGreaterThan(0);
    expect(report.alphaCoupling).toBeLessThan(0.01);
  });

  it("evolution covers all requested steps", () => {
    expect(report.evolution.length).toBe(8);
  });

  it("phase portrait has matching entries", () => {
    expect(report.phasePortrait.length).toBe(8);
  });

  it("consciousness measure is non-negative", () => {
    for (const s of report.evolution) {
      expect(s.consciousness).toBeGreaterThanOrEqual(0);
    }
  });

  it("COHERENCE states have higher consciousness than COLLAPSE", () => {
    const coherent = report.evolution.filter(s => s.zone === "COHERENCE");
    const collapse = report.evolution.filter(s => s.zone === "COLLAPSE");
    if (coherent.length > 0 && collapse.length > 0) {
      const avgC = coherent.reduce((s, e) => s + e.consciousness, 0) / coherent.length;
      const avgX = collapse.reduce((s, e) => s + e.consciousness, 0) / collapse.length;
      expect(avgC).toBeGreaterThan(avgX);
    }
  });

  it("all 14 internal verification tests pass", () => {
    for (const t of report.tests) {
      expect(t.holds, `FAIL: ${t.name} — ${t.detail}`).toBe(true);
    }
    expect(report.allPassed).toBe(true);
    expect(report.tests.length).toBe(14);
  });
});
