/**
 * Phase 6 Test Suite — Hologram OS Integration (v2 Simplified)
 *
 * Verifies that v2 types project cleanly into the Hologram OS runtime
 * and that the algebraic substrate drives the holographic state.
 *
 * Key simplification: eliminated Process/Directory/FileSystem/Tracker
 * wrappers — the engine already handles those. This test focuses on
 * the v2-specific projections: Observable → Panel, Certificate → Attestation,
 * FiberBudget as direct resolution state.
 */
import { describe, it, expect } from "vitest";
import {
  createPanel,
  groupByAxis,
  createAttestation,
  createHologramState,
} from "@/modules/hologram-os/runtime";
import {
  createFiberBudget, pinFiber, resolution,
  resolve,
  residueConstraint, depthConstraint,
  involutionCertificate,
  Q0 as makeQ0,
  stratum, hammingMetric, curvature,
} from "@/modules/ring-core";

const Q0 = makeQ0();

describe("Phase 6: Hologram OS Integration", () => {

  // ── Panel projection from Observables ──────────────────────────────────

  describe("Observable → Panel projection", () => {
    it("creates panels from v2 observables with correct axes", () => {
      const s = stratum(42);
      const h = hammingMetric(42, 0);
      const c = curvature(42, 3.14);

      const panels = [
        createPanel("StratumObservable", s.axis(), s.value()),
        createPanel("HammingMetric", h.axis(), h.value()),
        createPanel("CurvatureObservable", c.axis(), c.value()),
      ];

      expect(panels[0].axis).toBe("Vertical");
      expect(panels[1].axis).toBe("Horizontal");
      expect(panels[2].axis).toBe("Diagonal");
    });

    it("groupByAxis partitions panels correctly", () => {
      const panels = [
        createPanel("StratumObservable", "Vertical", 10),
        createPanel("RingMetric", "Vertical", 20),
        createPanel("HammingMetric", "Horizontal", 30),
        createPanel("CurvatureObservable", "Diagonal", 40),
        createPanel("CatastropheThreshold", "Diagonal", 50),
      ];

      const grouped = groupByAxis(panels);
      expect(grouped.Vertical).toHaveLength(2);
      expect(grouped.Horizontal).toHaveLength(1);
      expect(grouped.Diagonal).toHaveLength(2);
    });

    it("panel IDs are unique per type and quantum", () => {
      const p1 = createPanel("StratumObservable", "Vertical", 10, 0);
      const p2 = createPanel("StratumObservable", "Vertical", 10, 1);
      expect(p1.id).not.toBe(p2.id);
    });
  });

  // ── Attestation from Certificate ──────────────────────────────────────

  describe("Certificate → Attestation projection", () => {
    it("involution certificate produces valid attestation", () => {
      const cert = involutionCertificate(Q0, "neg", (b) => Q0.neg(b));
      const att = createAttestation(
        cert.certificateId(),
        cert.certifiesIri(),
        cert.valid(),
        "involution",
      );

      expect(att.valid).toBe(true);
      expect(att.kind).toBe("involution");
      expect(att.certId).toContain("involution:neg");
    });

    it("creates transform attestation", () => {
      const att = createAttestation("cert:transform:1", "urn:uor:datum:42", true, "transform");
      expect(att.kind).toBe("transform");
      expect(att.valid).toBe(true);
      expect(att.issuedAt).toBeTruthy();
    });
  });

  // ── FiberBudget drives resolution directly ─────────────────────────────

  describe("FiberBudget → resolution", () => {
    it("budget resolution ratio works directly", () => {
      let budget = createFiberBudget(0);
      expect(resolution(budget)).toBe(0);

      budget = pinFiber(budget, 0, "test");
      budget = pinFiber(budget, 1, "test");
      expect(resolution(budget)).toBe(2 / 8);
      expect(budget.isClosed).toBe(false);
    });

    it("fully pinned budget is closed", () => {
      let b = createFiberBudget(0);
      for (let i = 0; i < 8; i++) b = pinFiber(b, i, `c${i}`);
      expect(b.isClosed).toBe(true);
      expect(resolution(b)).toBe(1);
    });
  });

  // ── Resolver → FiberBudget convergence ─────────────────────────────────

  describe("Resolver convergence", () => {
    it("resolver drives budget to closure", () => {
      const steps = [
        { ...residueConstraint(2, 0), pinsPerStep: 4 },
        { ...depthConstraint(1, 3), pinsPerStep: 4 },
      ];

      const snapshots = resolve(0, steps);
      const last = snapshots[snapshots.length - 1];

      expect(last.state).toBe("Resolved");
      expect(last.budget.isClosed).toBe(true);
    });

    it("resolver snapshots show progression", () => {
      const steps = [
        { ...residueConstraint(2, 0), pinsPerStep: 4 },
        { ...depthConstraint(1, 3), pinsPerStep: 4 },
      ];
      const snapshots = resolve(0, steps);

      expect(resolution(snapshots[0].budget)).toBe(0);
      expect(resolution(snapshots[snapshots.length - 1].budget)).toBe(1);
    });
  });

  // ── HologramState unification ──────────────────────────────────────────

  describe("HologramState", () => {
    it("assembles from v2 primitives", () => {
      const budget = createFiberBudget(0);
      const panels = [
        createPanel("StratumObservable", "Vertical", 42),
        createPanel("HammingMetric", "Horizontal", 7),
        createPanel("CurvatureObservable", "Diagonal", 3.14),
      ];
      const attestations = [
        createAttestation("cert:inv:neg", "op:neg", true, "involution"),
        createAttestation("cert:inv:bnot", "op:bnot", true, "involution"),
      ];

      const state = createHologramState({
        engineId: "test:engine",
        processCount: 3,
        panels,
        budget,
        attestations,
      });

      expect(state.engineId).toBe("test:engine");
      expect(state.processCount).toBe(3);
      expect(state.dashboard.Vertical).toHaveLength(1);
      expect(state.dashboard.Horizontal).toHaveLength(1);
      expect(state.dashboard.Diagonal).toHaveLength(1);
      expect(state.resolutionRatio).toBe(0);
      expect(state.attestations).toHaveLength(2);
    });

    it("resolution ratio reflects fiber budget state", () => {
      let budget = createFiberBudget(0);
      for (let i = 0; i < 8; i++) {
        budget = pinFiber(budget, i, `pin:${i}`);
      }

      const state = createHologramState({
        panels: [],
        budget,
        attestations: [],
      });

      expect(state.resolutionRatio).toBe(1);
      expect(state.budget.isClosed).toBe(true);
    });
  });

  // ── Cross-module coherence gate ────────────────────────────────────────

  describe("Cross-module coherence", () => {
    it("neg(bnot(x)) = succ(x) verified through certificate → attestation", () => {
      const negCert = involutionCertificate(Q0, "neg", (b) => Q0.neg(b));
      const bnotCert = involutionCertificate(Q0, "bnot", (b) => Q0.bnot(b));

      const negAtt = createAttestation(negCert.certificateId(), negCert.certifiesIri(), negCert.valid(), "involution");
      const bnotAtt = createAttestation(bnotCert.certificateId(), bnotCert.certifiesIri(), bnotCert.valid(), "involution");

      expect(negAtt.valid).toBe(true);
      expect(bnotAtt.valid).toBe(true);

      // Critical identity check
      for (let x = 0; x < 256; x++) {
        const b = Q0.toBytes(x);
        expect(Q0.neg(Q0.bnot(b))).toEqual(Q0.succ(b));
      }
    });
  });
});
