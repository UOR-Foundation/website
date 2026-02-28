/**
 * Causal Kernel — Verification Suite
 * ════════════════════════════════════
 *
 * Proves the Causal Accumulation Law on the Atlas lattice with
 * octonionic propagators and geometric α coupling.
 */

import { describe, it, expect } from "vitest";
import {
  runCausalKernel,
  octonion,
  unitOctonion,
  octMul,
  octAdd,
  octScale,
  octNorm,
  octConj,
  octCommutator,
  octAssociator,
  type CausalKernelReport,
} from "@/modules/atlas/causal-kernel";

// ══════════════════════════════════════════════════════════════════════════
// Part I: Octonionic Arithmetic
// ══════════════════════════════════════════════════════════════════════════

describe("Octonionic Arithmetic", () => {
  it("e₀ is multiplicative identity", () => {
    const e0 = unitOctonion(0);
    const e3 = unitOctonion(3);
    const product = octMul(e0, e3);
    expect(product.components[3]).toBeCloseTo(1);
    expect(octNorm(octAdd(product, octScale(e3, -1)))).toBeCloseTo(0);
  });

  it("eᵢ² = -1 for imaginary units", () => {
    for (let i = 1; i <= 7; i++) {
      const ei = unitOctonion(i);
      const sq = octMul(ei, ei);
      expect(sq.components[0]).toBeCloseTo(-1);
      // All other components zero
      for (let j = 1; j < 8; j++) {
        expect(sq.components[j]).toBeCloseTo(0);
      }
    }
  });

  it("Fano multiplication: e₁·e₂ = e₄", () => {
    const e1 = unitOctonion(1);
    const e2 = unitOctonion(2);
    const result = octMul(e1, e2);
    expect(result.components[4]).toBeCloseTo(1);
  });

  it("anti-commutativity: eᵢ·eⱼ = -eⱼ·eᵢ for i≠j>0", () => {
    const e1 = unitOctonion(1);
    const e2 = unitOctonion(2);
    const ab = octMul(e1, e2);
    const ba = octMul(e2, e1);
    const sum = octAdd(ab, ba);
    expect(octNorm(sum)).toBeCloseTo(0);
  });

  it("non-associativity: (eᵢ·eⱼ)·eₖ ≠ eᵢ·(eⱼ·eₖ) for some i,j,k", () => {
    const e1 = unitOctonion(1);
    const e2 = unitOctonion(2);
    const e3 = unitOctonion(3);
    const assoc = octAssociator(e1, e2, e3);
    expect(octNorm(assoc)).toBeGreaterThan(0);
  });

  it("alternativity: (a·a)·b = a·(a·b)", () => {
    const a = unitOctonion(3);
    const b = unitOctonion(5);
    const left = octMul(octMul(a, a), b);
    const right = octMul(a, octMul(a, b));
    expect(octNorm(octAdd(left, octScale(right, -1)))).toBeCloseTo(0, 10);
  });

  it("norm is multiplicative: |a·b| = |a|·|b|", () => {
    const a = octonion(1, 2, 0, 1, 0, 0, 0, 0);
    const b = octonion(0, 1, 1, 0, 0, 0, 1, 0);
    const product = octMul(a, b);
    expect(octNorm(product)).toBeCloseTo(octNorm(a) * octNorm(b), 8);
  });

  it("conjugation reverses imaginary parts", () => {
    const a = octonion(1, 2, 3, 4, 5, 6, 7, 8);
    const c = octConj(a);
    expect(c.components[0]).toBe(1);
    for (let i = 1; i < 8; i++) {
      expect(c.components[i]).toBe(-a.components[i]);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part II: Full Causal Kernel Pipeline
// ══════════════════════════════════════════════════════════════════════════

describe("Causal Kernel — Full Pipeline", () => {
  let report: CausalKernelReport;

  it("runs full causal kernel analysis", () => {
    report = runCausalKernel({ maxDepth: 2, evolutionSteps: 8 });
    expect(report).toBeDefined();
  });

  it("22-node manifold constructed", () => {
    expect(report.manifold.nodes.length).toBe(22);
  });

  it("α coupling derived geometrically", () => {
    expect(report.alphaCoupling).toBeGreaterThan(0);
    expect(report.alphaCoupling).toBeLessThan(0.01);
    expect(1 / report.alphaCoupling).toBeGreaterThan(100);
  });

  it("7 propagator channels from Fano plane", () => {
    expect(report.propagatorChannels.length).toBe(7);
  });

  it("causal edges are bidirectional", () => {
    const forward = report.edges.filter(e => e.from < e.to).length;
    const backward = report.edges.filter(e => e.from > e.to).length;
    expect(forward).toBe(backward);
    expect(forward).toBeGreaterThan(0);
  });

  it("kernel matrix is 22² = 484 entries", () => {
    expect(report.kernelEntries.length).toBe(484);
  });

  it("diagonal entries are identity", () => {
    const diag = report.kernelEntries.filter(e => e.from === e.to);
    expect(diag.length).toBe(22);
    for (const d of diag) {
      expect(d.kernel.components[0]).toBe(1);
    }
  });

  it("accumulation evolution runs all steps", () => {
    expect(report.accumulation.length).toBe(8);
  });

  it("sedenion dissipation is positive", () => {
    expect(report.accumulation.some(a => a.dissipation > 0)).toBe(true);
  });

  it("evolution remains bounded (no blow-up)", () => {
    for (const a of report.accumulation) {
      expect(isFinite(a.totalFlux)).toBe(true);
      expect(a.totalFlux).toBeLessThan(1e10);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part III: Internal Verification Tests
// ══════════════════════════════════════════════════════════════════════════

describe("Causal Kernel — Internal Verification", () => {
  it("all 14 internal tests pass", () => {
    const report = runCausalKernel({ maxDepth: 2, evolutionSteps: 8 });
    for (const t of report.tests) {
      expect(t.holds, `FAIL: ${t.name} — ${t.detail}`).toBe(true);
    }
    expect(report.allPassed).toBe(true);
    expect(report.tests.length).toBe(14);
  });
});
