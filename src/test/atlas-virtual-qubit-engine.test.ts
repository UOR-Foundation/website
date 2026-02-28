/**
 * Virtual Qubit Instantiation Engine Test Suite
 * ══════════════════════════════════════════════
 * Verifies the Phase 5 unification of triality, transform group,
 * Fano collinearity, and Fano lines into a virtual qubit substrate.
 */
import { describe, it, expect } from "vitest";
import {
  instantiateFanoRegister,
  buildSingleQubitGates,
  buildTwoQubitGates,
  buildThreeQubitGates,
  singleQubitCircuit,
  twoQubitCircuit,
  threeQubitCircuit,
  composeCircuits,
  verifySingleQubitAlgebra,
  verifyCollinearityAlgebra,
  verifyFanoLineAlgebra,
  verifyGateInventory,
  verifyRegisterGeometry,
  runVirtualQubitVerification,
  FANO_REGISTER_SIZE,
  SINGLE_QUBIT_GATE_COUNT,
  TWO_QUBIT_GATE_COUNT,
  THREE_QUBIT_GATE_COUNT,
} from "@/modules/atlas/virtual-qubit-engine";
import { IDENTITY, GROUP_ORDER } from "@/modules/atlas/transform-group";

describe("Phase 5: Virtual Qubit Instantiation Engine", () => {
  describe("Fano Register", () => {
    it("instantiates 7 qubits", () => {
      const reg = instantiateFanoRegister();
      expect(reg.qubits.length).toBe(FANO_REGISTER_SIZE);
    });

    it("all qubits have distinct Atlas vertices", () => {
      const reg = instantiateFanoRegister();
      const vertices = new Set(reg.qubits.map(q => q.vertexIndex));
      expect(vertices.size).toBe(7);
    });

    it("each qubit maps to a unique Fano point", () => {
      const reg = instantiateFanoRegister();
      const points = new Set(reg.qubits.map(q => q.fanoPoint));
      expect(points.size).toBe(7);
    });

    it("each qubit has a unique morphism generator", () => {
      const reg = instantiateFanoRegister();
      const gens = new Set(reg.qubits.map(q => q.generator));
      expect(gens.size).toBe(7);
    });

    it("state vector has 128 amplitudes (2^7)", () => {
      const reg = instantiateFanoRegister();
      expect(reg.stateVector.length).toBe(128);
    });

    it("initial state is |0000000⟩", () => {
      const reg = instantiateFanoRegister();
      expect(reg.stateVector[0]).toEqual([1, 0]);
      for (let i = 1; i < 128; i++) {
        expect(reg.stateVector[i]).toEqual([0, 0]);
      }
    });

    it("triality coordinates are valid", () => {
      const reg = instantiateFanoRegister();
      for (const q of reg.qubits) {
        expect(q.triality.quadrant).toBeGreaterThanOrEqual(0);
        expect(q.triality.quadrant).toBeLessThan(4);
        expect(q.triality.modality).toBeGreaterThanOrEqual(0);
        expect(q.triality.modality).toBeLessThan(3);
        expect(q.triality.slot).toBeGreaterThanOrEqual(0);
        expect(q.triality.slot).toBeLessThan(8);
      }
    });
  });

  describe("Single-Qubit Gates (192 transforms)", () => {
    it("produces exactly 192 gates", () => {
      expect(buildSingleQubitGates().length).toBe(SINGLE_QUBIT_GATE_COUNT);
    });

    it("includes the identity gate", () => {
      const gates = buildSingleQubitGates();
      expect(gates.some(g => g.name === "I")).toBe(true);
    });

    it("includes the mirror gate X_τ", () => {
      const gates = buildSingleQubitGates();
      expect(gates.some(g => g.name === "X_τ")).toBe(true);
    });

    it("all gates have valid order ≥ 1", () => {
      for (const g of buildSingleQubitGates()) {
        expect(g.order).toBeGreaterThanOrEqual(1);
      }
    });

    it("gate IDs are unique", () => {
      const ids = buildSingleQubitGates().map(g => g.id);
      expect(new Set(ids).size).toBe(192);
    });

    it("gate composition matches group composition", () => {
      const result = verifySingleQubitAlgebra();
      expect(result.failures.length).toBe(0);
      expect(result.tested).toBe(90); // 20 abelian pairs × 4 vertices + 10 mixed pairs
    });
  });

  describe("Two-Qubit Gates (21 collinear pairs)", () => {
    it("produces exactly 21 gates", () => {
      expect(buildTwoQubitGates().length).toBe(TWO_QUBIT_GATE_COUNT);
    });

    it("all gates reference valid Fano point pairs", () => {
      for (const g of buildTwoQubitGates()) {
        expect(g.collinearPair).toBeDefined();
        const [a, b] = g.collinearPair!;
        expect(a).toBeGreaterThanOrEqual(0);
        expect(a).toBeLessThan(7);
        expect(b).toBeGreaterThan(a);
        expect(b).toBeLessThan(7);
      }
    });

    it("anti-commutativity holds for all collinear pairs", () => {
      const result = verifyCollinearityAlgebra();
      expect(result.anticommutes).toBe(true);
    });

    it("mediator consistency holds", () => {
      const result = verifyCollinearityAlgebra();
      expect(result.mediatorConsistent).toBe(true);
    });

    it("21 = C(7,2) collinear pairs", () => {
      const result = verifyCollinearityAlgebra();
      expect(result.collinearPairs + result.nonCollinearPairs).toBe(21);
    });
  });

  describe("Three-Qubit Gates (7 Fano lines)", () => {
    it("produces exactly 7 gates", () => {
      expect(buildThreeQubitGates().length).toBe(THREE_QUBIT_GATE_COUNT);
    });

    it("each gate references a Fano line", () => {
      for (const g of buildThreeQubitGates()) {
        expect(g.fanoLine).toBeDefined();
        expect(g.fanoLine).toBeGreaterThanOrEqual(0);
        expect(g.fanoLine!).toBeLessThan(7);
      }
    });

    it("cyclic multiplication holds on all lines", () => {
      const result = verifyFanoLineAlgebra();
      expect(result.cyclicHolds).toBe(true);
    });

    it("self-multiplication consistent (eᵢ² = -1)", () => {
      const result = verifyFanoLineAlgebra();
      expect(result.allSelfConsistent).toBe(true);
    });
  });

  describe("Circuit Construction", () => {
    it("single-qubit circuit has depth 1", () => {
      const c = singleQubitCircuit("test", 0, IDENTITY);
      expect(c.depth).toBe(1);
      expect(c.gates.length).toBe(1);
      expect(c.gates[0].targets).toEqual([0]);
    });

    it("two-qubit circuit targets two qubits", () => {
      const c = twoQubitCircuit("test", 0, 1);
      expect(c.gates[0].targets.length).toBe(2);
    });

    it("three-qubit circuit targets Fano line points", () => {
      const c = threeQubitCircuit("test", 0);
      expect(c.gates[0].targets.length).toBe(3);
    });

    it("composed circuits accumulate depth", () => {
      const c1 = singleQubitCircuit("a", 0, IDENTITY);
      const c2 = singleQubitCircuit("b", 1, IDENTITY);
      const c3 = composeCircuits("ab", c1, c2);
      expect(c3.depth).toBe(2);
      expect(c3.gates.length).toBe(2);
    });
  });

  describe("Register Geometry", () => {
    it("7 distinct host vertices", () => {
      const geom = verifyRegisterGeometry();
      expect(geom.distinctVertices).toBe(7);
    });

    it("all 3 modalities covered", () => {
      const geom = verifyRegisterGeometry();
      expect(geom.modalitiesCovered).toBe(3);
    });

    it("7 morphism generators covered", () => {
      const geom = verifyRegisterGeometry();
      expect(geom.generatorsCovered).toBe(7);
    });

    it("triality coordinates consistent", () => {
      const geom = verifyRegisterGeometry();
      expect(geom.allTrialityValid).toBe(true);
    });
  });

  describe("Full Verification Report", () => {
    it("all 15 tests pass", () => {
      const report = runVirtualQubitVerification();
      for (const test of report.tests) {
        expect(test.holds, `"${test.name}": expected ${test.expected}, got ${test.actual}`).toBe(true);
      }
      expect(report.allPassed).toBe(true);
    });

    it("report has 15 tests", () => {
      expect(runVirtualQubitVerification().tests.length).toBe(15);
    });

    it("total gate count = 220", () => {
      const report = runVirtualQubitVerification();
      const total = report.singleQubitGates.length +
        report.twoQubitGates.length +
        report.threeQubitGates.length;
      expect(total).toBe(220);
    });
  });
});
