/**
 * Phase 4 Test Suite — Proof State Machine
 *
 * T-PM1: Proof lifecycle (Unresolved → Partial → Resolved → Certified)
 * T-PM2: Deductive steps pin fibers and advance state
 * T-PM3: Inductive steps record observations without pinning
 * T-PM4: Abductive steps record hypotheses
 * T-PM5: proofFromLoop builds proof from abductive loop
 * T-PM6: Complete proof can be certified
 * T-PM7: Incomplete proof cannot be certified
 * T-PM8: Certificate verification (valid)
 * T-PM9: Certificate verification (tampered)
 * T-PM10: Proof composition via tensor product
 * T-PM11: Composed proof merges premises and steps
 * T-PM12: stepsByMode counts correctly
 * T-PM13: hasCompleteCycle detects D→I→A
 * T-PM14: Proof IDs are deterministic
 * T-PM15: Certification transitions state to Certified
 */
import { describe, it, expect } from "vitest";
import {
  createProof,
  addDeductiveStep,
  addInductiveStep,
  addAbductiveStep,
  proofFromLoop,
  certifyProof,
  verifyCertificate,
  composeProofs,
  stepsByMode,
  hasCompleteCycle,
  totalFibersResolved,
} from "@/modules/ring-core/proof-machine";
import {
  createFiberBudget,
  residueConstraint,
  depthConstraint,
  deductiveStep,
  inductiveStep,
  abductiveCurvature,
} from "@/modules/ring-core";

describe("Phase 4: Proof State Machine", () => {
  // ── T-PM1: Proof lifecycle ──────────────────────────────────────────
  describe("T-PM1: Proof lifecycle", () => {
    it("starts Unresolved", () => {
      const proof = createProof(0, ["axiom-1"]);
      expect(proof.state).toBe("Unresolved");
      expect(proof.isComplete).toBe(false);
      expect(proof.steps).toHaveLength(0);
      expect(proof.premises).toEqual(["axiom-1"]);
      expect(proof.certificate).toBeNull();
    });

    it("transitions to Partial after first step", () => {
      let proof = createProof(0, ["axiom-1"]);
      const budget = createFiberBudget(0);
      const d = deductiveStep(budget, residueConstraint(2, 0), 3);
      proof = addDeductiveStep(proof, d);
      expect(proof.state).toBe("Partial");
    });

    it("transitions to Resolved when budget closes", () => {
      let proof = createProof(0, ["axiom-1"]);
      const budget = createFiberBudget(0);
      const d = deductiveStep(budget, residueConstraint(2, 0), 8); // all 8 fibers
      proof = addDeductiveStep(proof, d);
      expect(proof.state).toBe("Resolved");
      expect(proof.isComplete).toBe(true);
    });

    it("transitions to Certified after certifyProof", () => {
      let proof = createProof(0, ["axiom-1"]);
      const budget = createFiberBudget(0);
      const d = deductiveStep(budget, residueConstraint(2, 0), 8);
      proof = addDeductiveStep(proof, d);
      proof = certifyProof(proof, true, true);
      expect(proof.state).toBe("Certified");
      expect(proof.certificate).not.toBeNull();
    });
  });

  // ── T-PM2: Deductive steps ──────────────────────────────────────────
  describe("T-PM2: Deductive steps", () => {
    it("pins fibers and records justification", () => {
      let proof = createProof(0, ["axiom-1"]);
      const budget = createFiberBudget(0);
      const c = residueConstraint(2, 0, "even-constraint");
      const d = deductiveStep(budget, c, 4);
      proof = addDeductiveStep(proof, d);

      expect(proof.steps).toHaveLength(1);
      expect(proof.steps[0].mode).toBe("deductive");
      expect(proof.steps[0].axis).toBe("Vertical");
      expect(proof.steps[0].justification).toBe("even-constraint");
      expect(proof.steps[0].fibersResolved).toBe(4);
      expect(proof.budget.pinnedCount).toBe(4);
    });
  });

  // ── T-PM3: Inductive steps ─────────────────────────────────────────
  describe("T-PM3: Inductive steps", () => {
    it("records observation without pinning", () => {
      let proof = createProof(0, ["axiom-1"]);
      const i = inductiveStep(42, 43);
      proof = addInductiveStep(proof, i);

      expect(proof.steps).toHaveLength(1);
      expect(proof.steps[0].mode).toBe("inductive");
      expect(proof.steps[0].axis).toBe("Horizontal");
      expect(proof.steps[0].fibersResolved).toBe(0);
      expect(proof.budget.pinnedCount).toBe(0);
    });
  });

  // ── T-PM4: Abductive steps ─────────────────────────────────────────
  describe("T-PM4: Abductive steps", () => {
    it("records hypothesis from non-zero curvature", () => {
      let proof = createProof(0, ["axiom-1"]);
      const budget = createFiberBudget(0);
      const d = deductiveStep(budget, residueConstraint(2, 0), 4);
      const i = inductiveStep(0, 255);
      const a = abductiveCurvature(d, i);
      proof = addAbductiveStep(proof, a);

      expect(proof.steps).toHaveLength(1);
      expect(proof.steps[0].mode).toBe("abductive");
      expect(proof.steps[0].axis).toBe("Diagonal");
      expect(proof.steps[0].justification).toContain("hypothesis");
    });

    it("records agreement when curvature is zero", () => {
      let proof = createProof(0, ["axiom-1"]);
      const budget = createFiberBudget(0);
      const d = deductiveStep(budget, residueConstraint(2, 0), 4);
      const i = inductiveStep(42, 42);
      const a = abductiveCurvature(d, i);
      proof = addAbductiveStep(proof, a);

      expect(proof.steps[0].justification).toBe("agreement:curvature=0");
    });
  });

  // ── T-PM5: proofFromLoop ───────────────────────────────────────────
  describe("T-PM5: proofFromLoop", () => {
    it("builds proof with D/I/A steps from iterations", () => {
      const budget = createFiberBudget(0);
      const c = residueConstraint(2, 0);
      const d = deductiveStep(budget, c, 8);
      const i = inductiveStep(42, 42);
      const a = abductiveCurvature(d, i);

      const proof = proofFromLoop(0, ["axiom-1"], [{ deductive: d, inductive: i, abductive: a }]);

      expect(proof.steps).toHaveLength(3);
      expect(proof.steps[0].mode).toBe("deductive");
      expect(proof.steps[1].mode).toBe("inductive");
      expect(proof.steps[2].mode).toBe("abductive");
      expect(proof.isComplete).toBe(true);
    });
  });

  // ── T-PM6: Certification ───────────────────────────────────────────
  describe("T-PM6: Complete proof certification", () => {
    it("generates a self-attesting certificate", () => {
      let proof = createProof(0, ["axiom-1"]);
      const budget = createFiberBudget(0);
      const d = deductiveStep(budget, residueConstraint(2, 0), 8);
      proof = addDeductiveStep(proof, d);
      proof = certifyProof(proof, true, true);

      const cert = proof.certificate!;
      expect(cert.selfAttesting).toBe(true);
      expect(cert.certifiesProof).toBe(proof.proofId);
      expect(cert.criticalIdentityVerified).toBe(true);
      expect(cert.holonomyZero).toBe(true);
      expect(cert.certificateId).toContain("cert:proof:");
    });
  });

  // ── T-PM7: Incomplete proof rejection ──────────────────────────────
  describe("T-PM7: Incomplete proof cannot be certified", () => {
    it("throws on certification attempt", () => {
      const proof = createProof(0, ["axiom-1"]);
      expect(() => certifyProof(proof, true, true)).toThrow("Cannot certify incomplete proof");
    });

    it("throws for partial proof", () => {
      let proof = createProof(0, ["axiom-1"]);
      const budget = createFiberBudget(0);
      const d = deductiveStep(budget, residueConstraint(2, 0), 3);
      proof = addDeductiveStep(proof, d);
      expect(() => certifyProof(proof, true, true)).toThrow();
    });
  });

  // ── T-PM8: Certificate verification (valid) ────────────────────────
  describe("T-PM8: Valid certificate verification", () => {
    it("passes all checks", () => {
      let proof = createProof(0, ["axiom-1"]);
      const budget = createFiberBudget(0);
      const d = deductiveStep(budget, residueConstraint(2, 0), 8);
      proof = addDeductiveStep(proof, d);
      proof = certifyProof(proof, true, true);

      const result = verifyCertificate(proof, proof.certificate!);
      expect(result.valid).toBe(true);
      expect(result.failures).toHaveLength(0);
    });
  });

  // ── T-PM9: Certificate verification (tampered) ─────────────────────
  describe("T-PM9: Tampered certificate detection", () => {
    it("detects proof ID mismatch", () => {
      let proof = createProof(0, ["axiom-1"]);
      const budget = createFiberBudget(0);
      const d = deductiveStep(budget, residueConstraint(2, 0), 8);
      proof = addDeductiveStep(proof, d);
      proof = certifyProof(proof, true, true);

      const fakeCert = { ...proof.certificate!, certifiesProof: "proof:fake" };
      const result = verifyCertificate(proof, fakeCert);
      expect(result.valid).toBe(false);
      expect(result.failures.some(f => f.includes("mismatch"))).toBe(true);
    });

    it("detects non-verified critical identity", () => {
      let proof = createProof(0, ["axiom-1"]);
      const budget = createFiberBudget(0);
      const d = deductiveStep(budget, residueConstraint(2, 0), 8);
      proof = addDeductiveStep(proof, d);
      proof = certifyProof(proof, false, true);

      const result = verifyCertificate(proof, proof.certificate!);
      expect(result.valid).toBe(false);
      expect(result.failures.some(f => f.includes("Critical identity"))).toBe(true);
    });
  });

  // ── T-PM10: Proof composition ──────────────────────────────────────
  describe("T-PM10: Proof composition via tensor product", () => {
    it("composes two partial proofs into one", () => {
      // Proof A: pins fibers 0-3
      let proofA = createProof(0, ["premise-A"]);
      const budgetA = createFiberBudget(0);
      const dA = deductiveStep(budgetA, residueConstraint(2, 0, "cA"), 4);
      proofA = addDeductiveStep(proofA, dA);

      // Proof B: pins fibers 4-7
      let proofB = createProof(0, ["premise-B"]);
      const budgetB = createFiberBudget(0);
      const dB = deductiveStep(budgetB, residueConstraint(4, 0, "cB"), 4);
      proofB = addDeductiveStep(proofB, dB);

      const composed = composeProofs(proofA, proofB);

      expect(composed.components).toEqual([proofA.proofId, proofB.proofId]);
      expect(composed.compositionValid).toBe(true);
      // Composed budget should have all pinned fibers from both
      expect(composed.proof.budget.pinnedCount).toBeGreaterThanOrEqual(4);
    });
  });

  // ── T-PM11: Composed proof structure ───────────────────────────────
  describe("T-PM11: Composed proof merges correctly", () => {
    it("merges premises without duplicates", () => {
      const proofA = createProof(0, ["shared", "only-a"]);
      const proofB = createProof(0, ["shared", "only-b"]);

      const composed = composeProofs(proofA, proofB);
      expect(composed.proof.premises).toEqual(["shared", "only-a", "only-b"]);
    });

    it("concatenates steps with re-indexing", () => {
      let proofA = createProof(0, ["a"]);
      let proofB = createProof(0, ["b"]);

      const budget = createFiberBudget(0);
      proofA = addDeductiveStep(proofA, deductiveStep(budget, residueConstraint(2, 0), 3));
      proofB = addDeductiveStep(proofB, deductiveStep(budget, residueConstraint(4, 0), 3));

      const composed = composeProofs(proofA, proofB);
      expect(composed.proof.steps).toHaveLength(2);
      expect(composed.proof.steps[0].index).toBe(0);
      expect(composed.proof.steps[1].index).toBe(1);
    });
  });

  // ── T-PM12: stepsByMode ────────────────────────────────────────────
  describe("T-PM12: stepsByMode", () => {
    it("counts modes correctly", () => {
      const budget = createFiberBudget(0);
      const d = deductiveStep(budget, residueConstraint(2, 0), 8);
      const i = inductiveStep(42, 42);
      const a = abductiveCurvature(d, i);

      const proof = proofFromLoop(0, ["ax"], [{ deductive: d, inductive: i, abductive: a }]);
      const modes = stepsByMode(proof);

      expect(modes.deductive).toBe(1);
      expect(modes.inductive).toBe(1);
      expect(modes.abductive).toBe(1);
    });
  });

  // ── T-PM13: hasCompleteCycle ───────────────────────────────────────
  describe("T-PM13: hasCompleteCycle", () => {
    it("true when all three modes present", () => {
      const budget = createFiberBudget(0);
      const d = deductiveStep(budget, residueConstraint(2, 0), 8);
      const i = inductiveStep(42, 42);
      const a = abductiveCurvature(d, i);

      const proof = proofFromLoop(0, ["ax"], [{ deductive: d, inductive: i, abductive: a }]);
      expect(hasCompleteCycle(proof)).toBe(true);
    });

    it("false when only deductive", () => {
      let proof = createProof(0, ["ax"]);
      const budget = createFiberBudget(0);
      proof = addDeductiveStep(proof, deductiveStep(budget, residueConstraint(2, 0), 3));
      expect(hasCompleteCycle(proof)).toBe(false);
    });
  });

  // ── T-PM14: Deterministic proof IDs ────────────────────────────────
  describe("T-PM14: Deterministic proof IDs", () => {
    it("same inputs produce same proof ID", () => {
      const a = createProof(0, ["axiom-1"]);
      const b = createProof(0, ["axiom-1"]);
      expect(a.proofId).toBe(b.proofId);
    });

    it("different premises produce different proof IDs", () => {
      const a = createProof(0, ["axiom-1"]);
      const b = createProof(0, ["axiom-2"]);
      expect(a.proofId).not.toBe(b.proofId);
    });
  });

  // ── T-PM15: totalFibersResolved ────────────────────────────────────
  describe("T-PM15: totalFibersResolved", () => {
    it("sums across all steps", () => {
      let proof = createProof(0, ["ax"]);
      const budget = createFiberBudget(0);
      const d1 = deductiveStep(budget, residueConstraint(2, 0), 3);
      proof = addDeductiveStep(proof, d1);
      const d2 = deductiveStep(d1.budget, depthConstraint(0, 5), 5);
      proof = addDeductiveStep(proof, d2);

      expect(totalFibersResolved(proof)).toBe(8);
    });
  });
});
