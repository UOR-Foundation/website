/**
 * Phase 5 Test Suite — Certificate Hierarchy & Resolver State Machine
 *
 * T5.1: TransformCertificate verifies a recorded transform
 * T5.2: IsometryCertificate verifies round-trip fidelity
 * T5.3: InvolutionCertificate verifies neg∘neg = id and bnot∘bnot = id
 * T5.4: ResolutionState lifecycle: Unresolved → Partial → Resolved
 * T5.5: RefinementSuggestion: suggests next constraint to apply
 * T5.6: IterativeRefinementResolver: converges in ≤ bitWidth steps
 * T5.7: All certificates produce valid attestations
 */
import { describe, it, expect } from "vitest";
import { Q0, Q1 } from "@/modules/ring-core/ring";
import {
  transformCertificate, isometryCertificate, involutionCertificate,
  resolve, deriveState,
  createFiberBudget, pinFiber,
  residueConstraint, depthConstraint,
} from "@/modules/ring-core";

describe("Phase 5: Certificate Hierarchy & Resolver", () => {
  // ── T5.1: TransformCertificate ──────────────────────────────────────────
  describe("T5.1: TransformCertificate", () => {
    const cert = transformCertificate({
      id: "cert:tx:001",
      iri: "morphism:embed:q0q1",
      sourceIri: "urn:uor:datum:q0:42",
      targetIri: "urn:uor:datum:q1:42",
      fidelityPreserved: true,
    });

    it("has correct certificate ID", () => expect(cert.certificateId()).toBe("cert:tx:001"));
    it("certifies the transform IRI", () => expect(cert.certifiesIri()).toBe("morphism:embed:q0q1"));
    it("reports fidelity preserved", () => expect(cert.fidelityPreserved()).toBe(true));
    it("is valid", () => expect(cert.valid()).toBe(true));
    it("has issuedAt timestamp", () => expect(cert.issuedAt()).toBeTruthy());
  });

  // ── T5.2: IsometryCertificate ───────────────────────────────────────────
  describe("T5.2: IsometryCertificate", () => {
    const cert = isometryCertificate({
      id: "cert:iso:001",
      iri: "morphism:isometry:q0q1",
      sourceQuantum: 0,
      targetQuantum: 1,
      roundTripVerified: true,
    });

    it("reports round-trip verified", () => expect(cert.roundTripVerified()).toBe(true));
    it("valid = roundTripVerified", () => expect(cert.valid()).toBe(true));
    it("source/target quantum correct", () => {
      expect(cert.sourceQuantum()).toBe(0);
      expect(cert.targetQuantum()).toBe(1);
    });

    it("invalid when round-trip fails", () => {
      const bad = isometryCertificate({
        id: "cert:iso:bad", iri: "x", sourceQuantum: 0, targetQuantum: 1,
        roundTripVerified: false,
      });
      expect(bad.valid()).toBe(false);
    });
  });

  // ── T5.3: InvolutionCertificate ─────────────────────────────────────────
  describe("T5.3: InvolutionCertificate", () => {
    const ring = Q0();

    it("neg∘neg = id for all 256 elements", () => {
      const cert = involutionCertificate(ring, "Neg", ring.neg.bind(ring));
      expect(cert.holdsForAll()).toBe(true);
      expect(cert.valid()).toBe(true);
      expect(cert.testedCount()).toBe(256);
      expect(cert.operationName()).toBe("Neg");
    });

    it("bnot∘bnot = id for all 256 elements", () => {
      const cert = involutionCertificate(ring, "Bnot", ring.bnot.bind(ring));
      expect(cert.holdsForAll()).toBe(true);
      expect(cert.valid()).toBe(true);
    });

    it("works at Q1 (sampled)", () => {
      const ring1 = Q1();
      const cert = involutionCertificate(ring1, "Neg", ring1.neg.bind(ring1));
      expect(cert.holdsForAll()).toBe(true);
      expect(cert.testedCount()).toBe(64);
    });
  });

  // ── T5.4: Resolution lifecycle ──────────────────────────────────────────
  describe("T5.4: ResolutionState lifecycle", () => {
    it("Unresolved when no fibers pinned", () => {
      expect(deriveState(createFiberBudget(0))).toBe("Unresolved");
    });

    it("Partial when some fibers pinned", () => {
      const b = pinFiber(createFiberBudget(0), 0, "c");
      expect(deriveState(b)).toBe("Partial");
    });

    it("Resolved when all fibers pinned", () => {
      let b = createFiberBudget(0);
      for (let i = 0; i < 8; i++) b = pinFiber(b, i, `c${i}`);
      expect(deriveState(b)).toBe("Resolved");
    });
  });

  // ── T5.5: Refinement suggestions ───────────────────────────────────────
  describe("T5.5: RefinementSuggestions", () => {
    it("initial state has suggestions", () => {
      const snapshots = resolve(0, []);
      expect(snapshots[0].suggestions.length).toBeGreaterThan(0);
    });

    it("resolved state has no suggestions", () => {
      const steps = [
        { ...residueConstraint(2, 0), pinsPerStep: 8 },
      ];
      const snapshots = resolve(0, steps);
      const last = snapshots[snapshots.length - 1];
      expect(last.state).toBe("Resolved");
      expect(last.suggestions).toHaveLength(0);
    });
  });

  // ── T5.6: Convergence ──────────────────────────────────────────────────
  describe("T5.6: Resolver convergence", () => {
    it("converges in ≤ bitWidth steps at Q0", () => {
      const steps = [
        { ...residueConstraint(2, 0), pinsPerStep: 3 },
        { ...depthConstraint(1, 4), pinsPerStep: 3 },
        { ...residueConstraint(4, 0), pinsPerStep: 2 },
      ];
      const snapshots = resolve(0, steps);
      const last = snapshots[snapshots.length - 1];
      expect(last.state).toBe("Resolved");
      expect(last.iteration).toBeLessThanOrEqual(8);
    });

    it("lifecycle progresses Unresolved → Partial → Resolved", () => {
      const steps = [
        { ...residueConstraint(2, 0), pinsPerStep: 4 },
        { ...depthConstraint(1, 3), pinsPerStep: 4 },
      ];
      const snapshots = resolve(0, steps);
      expect(snapshots[0].state).toBe("Unresolved");
      expect(snapshots[1].state).toBe("Partial");
      expect(snapshots[2].state).toBe("Resolved");
    });
  });

  // ── T5.7: All certificates valid ───────────────────────────────────────
  describe("T5.7: Certificate validity", () => {
    it("all three certificate types produce valid attestations", () => {
      const ring = Q0();
      const tc = transformCertificate({
        id: "c1", iri: "m:1", sourceIri: "s", targetIri: "t", fidelityPreserved: true,
      });
      const ic = isometryCertificate({
        id: "c2", iri: "m:2", sourceQuantum: 0, targetQuantum: 1, roundTripVerified: true,
      });
      const inv = involutionCertificate(ring, "Neg", ring.neg.bind(ring));

      expect(tc.valid()).toBe(true);
      expect(ic.valid()).toBe(true);
      expect(inv.valid()).toBe(true);
    });
  });
});
