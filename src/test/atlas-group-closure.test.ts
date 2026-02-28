/**
 * Group Closure Test Suite
 * ════════════════════════
 * Computes the true |Aut(Atlas)| via stabilizer chain and verifies structure.
 */
import { describe, it, expect } from "vitest";
import { runClosureAnalysis } from "@/modules/atlas/group-closure";

describe("Group Closure: True |Aut(Atlas)|", () => {
  const analysis = runClosureAnalysis();

  it("closure terminates with finite order", () => {
    expect(analysis.order).toBeGreaterThan(0);
  });

  it("order ≥ 192", () => {
    expect(analysis.order).toBeGreaterThanOrEqual(192);
  });

  it("parametric set is NOT closed", () => {
    expect(analysis.parametricClosed).toBe(false);
  });

  it("order divisible by 96", () => {
    expect(analysis.order % 96).toBe(0);
  });

  it("τ·D₁·τ NOT in parametric set", () => {
    const t = analysis.tests.find(t => t.name.includes("τ·D₁·τ"));
    expect(t?.holds).toBe(true);
  });

  it("all internal tests pass", () => {
    for (const t of analysis.tests) {
      expect(t.holds, `FAIL: ${t.name}: expected ${t.expected}, got ${t.actual}`).toBe(true);
    }
    expect(analysis.allPassed).toBe(true);
  });

  it("prints structural summary", () => {
    console.log("\n" + analysis.description);
    expect(analysis.description.length).toBeGreaterThan(0);
  });
});
