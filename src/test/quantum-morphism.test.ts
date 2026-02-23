/**
 * P23 — Multi-Quantum Ring Extension tests.
 *
 * 14 verification tests covering:
 *   - Critical identity at Q0, Q1, Q2
 *   - Ring operations at Q0 and Q1
 *   - Projection, embedding, identity morphisms
 *   - CommutativityWitness verification
 *   - Epistemic grading on all morphism results
 */
import { describe, it, expect } from "vitest";
import {
  negQ, bnotQ, succQ,
  verifyCriticalIdentityQ,
  RINGS,
} from "@/modules/morphism/quantum";
import {
  project,
  embed,
  identity,
  commutativityWitness,
} from "@/modules/morphism/morphism-formal";

describe("P23 — Multi-Quantum Ring Engine", () => {
  // Test 1: Critical identity Q0 — exhaustive 256/256
  it("1. verifyCriticalIdentityQ('Q0') → 256/256, holds=true", () => {
    const r = verifyCriticalIdentityQ("Q0");
    expect(r.passed).toBe(256);
    expect(r.failed).toBe(0);
    expect(r.holds).toBe(true);
  });

  // Test 2: Critical identity Q1 — exhaustive 65536/65536
  it("2. verifyCriticalIdentityQ('Q1', 65536) → 65536/65536, holds=true", () => {
    const r = verifyCriticalIdentityQ("Q1", 65536);
    expect(r.passed).toBe(65536);
    expect(r.failed).toBe(0);
    expect(r.holds).toBe(true);
  }, 30_000); // allow extra time for exhaustive Q1

  // Test 3: Critical identity Q2 — sampled 1000
  it("3. verifyCriticalIdentityQ('Q2', 1000) → 1000/1000, holds=true", () => {
    const r = verifyCriticalIdentityQ("Q2", 1000);
    expect(r.passed).toBe(1000);
    expect(r.failed).toBe(0);
    expect(r.holds).toBe(true);
  });

  // Test 4: negQ(42, Q0) = 214
  it("4. negQ(42n, 'Q0') === 214n", () => {
    expect(negQ(42n, "Q0")).toBe(214n);
  });

  // Test 5: negQ(42, Q1) = 65494
  it("5. negQ(42n, 'Q1') === 65494n", () => {
    expect(negQ(42n, "Q1")).toBe(65494n);
  });

  // Test 6: bnotQ(42, Q0) = 213
  it("6. bnotQ(42n, 'Q0') === 213n", () => {
    expect(bnotQ(42n, "Q0")).toBe(213n);
  });

  // Test 7: bnotQ(42, Q1) = 65493
  it("7. bnotQ(42n, 'Q1') === 65493n", () => {
    expect(bnotQ(42n, "Q1")).toBe(65493n);
  });
});

describe("P23 — Formal Morphisms", () => {
  // Test 8: project(300, Q1, Q0).output === 44
  it("8. project(300n, 'Q1', 'Q0').output === 44n", async () => {
    const r = await project(300n, "Q1", "Q0");
    expect(r.output).toBe(44n);
  });

  // Test 9: embed(42, Q0, Q1).output === 42
  it("9. embed(42n, 'Q0', 'Q1').output === 42n", async () => {
    const r = await embed(42n, "Q0", "Q1");
    expect(r.output).toBe(42n);
  });

  // Test 10: commutativityWitness for neg via projection commutes
  // Projection Q1→Q0 is a ring homomorphism that commutes with neg:
  //   neg_Q0(project(x)) = project(neg_Q1(x))
  it("10. commutativityWitness(42n, 'Q1', 'Q0', 'neg').commutes === true", () => {
    const w = commutativityWitness(42n, "Q1", "Q0", "neg");
    expect(w.commutes).toBe(true);
  });

  // Test 11: project is not injective
  it("11. project().isInjective === false", async () => {
    const r = await project(300n, "Q1", "Q0");
    expect(r.isInjective).toBe(false);
  });

  // Test 12: embed is injective
  it("12. embed().isInjective === true", async () => {
    const r = await embed(42n, "Q0", "Q1");
    expect(r.isInjective).toBe(true);
  });

  // Test 13: epistemic_grade === 'A' on all morphisms
  it("13. all MorphismResult objects include epistemic_grade === 'A'", async () => {
    const [p, e, id] = await Promise.all([
      project(100n, "Q1", "Q0"),
      embed(100n, "Q0", "Q1"),
      identity(100n, "Q0"),
    ]);
    expect(p.epistemic_grade).toBe("A");
    expect(e.epistemic_grade).toBe("A");
    expect(id.epistemic_grade).toBe("A");
  });

  // Test 14: derivation:derivationId matches canonical ID pattern
  it("14. MorphismResult derivation:derivationId matches URN pattern", async () => {
    const r = await project(300n, "Q1", "Q0");
    expect(r["derivation:derivationId"]).toMatch(
      /^urn:uor:derivation:sha256:[0-9a-f]{64}$/
    );
  });
});
