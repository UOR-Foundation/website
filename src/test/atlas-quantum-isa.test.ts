/**
 * Quantum ISA Test Suite
 * ══════════════════════
 *
 * Verifies the Atlas → Quantum gate mapping and mesh network topology.
 */
import { describe, it, expect } from "vitest";
import {
  mapVerticesToGates,
  tierDistribution,
  buildMeshNetwork,
  runQuantumISAVerification,
} from "@/modules/atlas/quantum-isa";

describe("Phase 10: Quantum ISA Mapping", () => {
  describe("Vertex → Gate assignment", () => {
    it("maps all 96 vertices to gates", () => {
      const mappings = mapVerticesToGates();
      expect(mappings.length).toBe(96);
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

    it("sign class determines tier consistently", () => {
      const scMap = new Map<number, number>();
      for (const m of mapVerticesToGates()) {
        if (scMap.has(m.signClass)) {
          expect(m.gate.tier).toBe(scMap.get(m.signClass));
        } else {
          scMap.set(m.signClass, m.gate.tier);
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
  });
});
