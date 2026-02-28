/**
 * Quantum ISA Test Suite (Triality-Based)
 * ════════════════════════════════════════
 *
 * Verifies the Atlas → Quantum gate mapping using triality coordinates
 * (h₂, d, ℓ) and transform group circuit rewrites.
 */
import { describe, it, expect } from "vitest";
import {
  mapVerticesToGates,
  tierDistribution,
  buildMeshNetwork,
  runQuantumISAVerification,
  computeRewrite,
  classifyRewrites,
  tierPreservingRewrites,
  findRewrite,
} from "@/modules/atlas/quantum-isa";
import { IDENTITY, type TransformElement } from "@/modules/atlas/transform-group";

describe("Phase 10: Quantum ISA Mapping (Triality-Based)", () => {
  describe("Vertex → Gate assignment via triality", () => {
    it("maps all 96 vertices to gates", () => {
      expect(mapVerticesToGates().length).toBe(96);
    });

    it("every mapping has valid gate metadata", () => {
      for (const m of mapVerticesToGates()) {
        expect(m.gate.name.length).toBeGreaterThan(0);
        expect(m.gate.qubits).toBeGreaterThanOrEqual(1);
        expect(m.gate.matrixDim).toBeGreaterThanOrEqual(2);
        expect(m.gate.roots).toBeGreaterThan(0);
      }
    });

    it("all 5 gate tiers are represented", () => {
      const dist = tierDistribution();
      for (let t = 0; t <= 4; t++) {
        expect(dist[t as 0 | 1 | 2 | 3 | 4]).toBeGreaterThan(0);
      }
    });

    it("Pauli gates (tier 0) are all self-adjoint", () => {
      const paulis = mapVerticesToGates().filter(m => m.gate.tier === 0);
      expect(paulis.length).toBeGreaterThan(0);
      for (const p of paulis) {
        expect(p.gate.selfAdjoint).toBe(true);
      }
    });

    it("mirror pairs share the same tier", () => {
      for (const m of mapVerticesToGates()) {
        expect(m.gate.tier).toBe(m.mirrorGate.tier);
      }
    });

    it("every mapping includes triality coordinate", () => {
      for (const m of mapVerticesToGates()) {
        expect(m.triality).toBeDefined();
        expect(m.triality.quadrant).toBeGreaterThanOrEqual(0);
        expect(m.triality.quadrant).toBeLessThan(4);
        expect(m.triality.modality).toBeGreaterThanOrEqual(0);
        expect(m.triality.modality).toBeLessThan(3);
        expect(m.triality.slot).toBeGreaterThanOrEqual(0);
        expect(m.triality.slot).toBeLessThan(8);
      }
    });

    it("sign class determines tier (mirror-symmetric)", () => {
      const scTiers = new Map<number, number>();
      for (const m of mapVerticesToGates()) {
        if (scTiers.has(m.signClass)) {
          expect(m.gate.tier).toBe(scTiers.get(m.signClass));
        } else {
          scTiers.set(m.signClass, m.gate.tier);
        }
      }
    });

    it("stabilizer indices are unique", () => {
      const indices = mapVerticesToGates().map(m => m.stabilizerIndex);
      expect(new Set(indices).size).toBe(96);
    });
  });

  describe("Quantum Mesh Network", () => {
    it("8-node mesh covers all 96 vertices", () => {
      const nodes = buildMeshNetwork(8);
      expect(nodes.length).toBe(8);
      const total = nodes.reduce((s, n) => s + n.vertices.length, 0);
      expect(total).toBe(96);
    });

    it("all nodes have UOR IPv6 addresses", () => {
      for (const n of buildMeshNetwork(8)) {
        expect(n.nodeId).toMatch(/^fd00:0075:6f72::/);
      }
    });

    it("cross-node entanglement links exist", () => {
      const nodes = buildMeshNetwork(8);
      const totalLinks = nodes.reduce((s, n) => s + n.entanglementLinks.length, 0);
      expect(totalLinks).toBeGreaterThan(0);
    });

    it("Bell fidelity > 0.95 for all links", () => {
      for (const n of buildMeshNetwork(8)) {
        for (const l of n.entanglementLinks) {
          expect(l.fidelity).toBeGreaterThan(0.95);
        }
      }
    });

    it("classical communication cost = 2 bits per link", () => {
      for (const n of buildMeshNetwork(8)) {
        for (const l of n.entanglementLinks) {
          expect(l.classicalBits).toBe(2);
        }
      }
    });
  });

  describe("Circuit Rewrites via Transform Group", () => {
    it("identity transform produces identity rewrite", () => {
      const rewrite = computeRewrite(0, IDENTITY);
      expect(rewrite.isIdentity).toBe(true);
      expect(rewrite.involvesAdjoint).toBe(false);
      expect(rewrite.sourceGate.name).toBe(rewrite.targetGate.name);
    });

    it("mirror transform produces adjoint rewrite", () => {
      const mirror: TransformElement = { r: 0, d: 0, t: 0, m: 1 };
      const rewrite = computeRewrite(0, mirror);
      expect(rewrite.involvesAdjoint).toBe(true);
    });

    it("192 rewrite classes are generated", () => {
      const classes = classifyRewrites();
      expect(classes.length).toBe(192);
    });

    it("identity class has 0 distinct rewrites", () => {
      const classes = classifyRewrites();
      const idClass = classes.find(c => c.label === "id");
      expect(idClass).toBeDefined();
      expect(idClass!.distinctRewrites).toBe(0);
      expect(idClass!.preservesTier).toBe(true);
    });

    it("tier-preserving rewrites exist", () => {
      const preserving = tierPreservingRewrites();
      expect(preserving.length).toBeGreaterThan(0);
      for (const r of preserving) {
        expect(r.preservesTier).toBe(true);
        expect(r.distinctRewrites).toBeGreaterThan(0);
      }
    });

    it("findRewrite returns valid rewrite for any vertex pair", () => {
      const rewrite = findRewrite(0, 1);
      expect(rewrite).not.toBeNull();
      expect(rewrite!.targetGate).toBeDefined();
    });

    it("D-shift rewrites preserve quadrant (tier)", () => {
      const dShift: TransformElement = { r: 0, d: 1, t: 0, m: 0 };
      for (let v = 0; v < 96; v++) {
        const rw = computeRewrite(v, dShift);
        expect(rw.sourceTriality.quadrant).toBe(rw.targetTriality.quadrant);
      }
    });

    it("T-shift rewrites preserve quadrant and modality", () => {
      const tShift: TransformElement = { r: 0, d: 0, t: 1, m: 0 };
      for (let v = 0; v < 96; v++) {
        const rw = computeRewrite(v, tShift);
        expect(rw.sourceTriality.quadrant).toBe(rw.targetTriality.quadrant);
        expect(rw.sourceTriality.modality).toBe(rw.targetTriality.modality);
      }
    });
  });

  describe("Full verification report", () => {
    it("all 12 tests pass", () => {
      const report = runQuantumISAVerification();
      for (const test of report.tests) {
        expect(test.holds, `"${test.name}" failed: expected ${test.expected}, got ${test.actual}`).toBe(true);
      }
      expect(report.allPassed).toBe(true);
    });

    it("report has 12 tests", () => {
      const report = runQuantumISAVerification();
      expect(report.tests.length).toBe(12);
    });

    it("report includes rewrite classes", () => {
      const report = runQuantumISAVerification();
      expect(report.rewriteClasses.length).toBe(192);
    });
  });
});
