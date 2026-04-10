/**
 * Non-Associativity Detection Test Suite
 * ═══════════════════════════════════════
 * Verifies (gₐ⊗gᵦ)⊗gᵧ ≠ gₐ⊗(gᵦ⊗gᵧ) for non-collinear triples.
 */
import { describe, it, expect } from "vitest";
import {
  computeAssociator,
  analyzeNonAssociativity,
} from "@/modules/atlas/fano-plane";

describe("Non-Associativity Detection", () => {
  const analysis = analyzeNonAssociativity();

  it("35 distinct unordered triples (C(7,3))", () => {
    expect(analysis.distinctTriples.length).toBe(35);
  });

  it("collinear triples are always associative", () => {
    expect(analysis.collinearAlwaysAssociative).toBe(true);
    const collinear = analysis.distinctTriples.filter(t => t.collinear);
    expect(collinear.length).toBe(7);
    for (const t of collinear) {
      expect(t.isAssociative).toBe(true);
      expect(t.associatorNorm).toBe(0);
    }
  });

  it("non-collinear triples are always non-associative", () => {
    expect(analysis.nonCollinearAssociativeExists).toBe(false);
    const nonCollinear = analysis.distinctTriples.filter(t => !t.collinear);
    expect(nonCollinear.length).toBe(28);
    for (const t of nonCollinear) {
      expect(t.isAssociative).toBe(false);
      expect(t.associatorNorm).toBeGreaterThan(0);
    }
  });

  it("exactly 28 non-associative triples", () => {
    expect(analysis.nonAssociativeCount).toBe(28);
  });

  it("exactly 7 associative triples (= Fano lines)", () => {
    expect(analysis.associativeCount).toBe(7);
  });

  it("associator bracket has norm 2 for all non-associative triples", () => {
    for (const t of analysis.nonAssociativeTriples) {
      expect(t.associatorNorm).toBeCloseTo(2, 5);
    }
  });

  it("specific non-collinear triple is non-associative", () => {
    const t = analysis.nonAssociativeTriples[0];
    expect(t).toBeDefined();
    const r = computeAssociator(t.triple[0], t.triple[1], t.triple[2]);
    expect(r.isAssociative).toBe(false);
    expect(r.associatorNorm).toBeCloseTo(2, 5);
  });

  it("specific collinear triple is associative", () => {
    const t = analysis.associativeTriples[0];
    expect(t).toBeDefined();
    const r = computeAssociator(t.triple[0], t.triple[1], t.triple[2]);
    expect(r.isAssociative).toBe(true);
  });

  it("associator is anti-symmetric: [a,b,c] ≈ -[b,a,c]", () => {
    for (const t of analysis.nonAssociativeTriples.slice(0, 8)) {
      const [a, b, c] = t.triple;
      const abc = computeAssociator(a, b, c);
      const bac = computeAssociator(b, a, c);
      for (let i = 0; i < 8; i++) {
        expect(abc.associator[i]).toBeCloseTo(-bac.associator[i], 10);
      }
    }
  });

  it("210 ordered non-degenerate triples computed", () => {
    expect(analysis.allTriples.length).toBe(210);
  });

  it("prints summary", () => {
    console.log("\n" + analysis.summary);
  });
});
