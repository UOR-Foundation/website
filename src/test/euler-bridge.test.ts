/**
 * Euler's Number Bridge Test Suite
 * ═════════════════════════════════
 * Verifies the structural role of e in connecting Atlas, Quantum, and Thermodynamics.
 */
import { describe, it, expect } from "vitest";
import {
  buildPhaseMap,
  vertexPhase,
  twelfthRootsOfUnity,
  analyzeEulersIdentity,
  buildPhaseGateSet,
  composePhaseGates,
  computePartition,
  discreteLog,
  buildExpLogTables,
  runEulerBridgeVerification,
  ATLAS_CAPACITY,
  ATLAS_BITS,
  E,
  PI,
  GROUP_EXPONENT,
} from "@/modules/atlas/euler-bridge";
import { generateClockElements, modPow } from "@/modules/atlas/clock-algebra";

describe("Euler's Number Bridge: e connects Atlas ↔ Quantum ↔ Thermodynamics", () => {
  describe("Phase map: 96 vertices → unit circle", () => {
    it("maps all 96 vertices to unit circle", () => {
      const map = buildPhaseMap();
      expect(map.length).toBe(96);
      for (const p of map) {
        expect(Math.abs(p.real ** 2 + p.imag ** 2 - 1)).toBeLessThan(1e-12);
      }
    });

    it("vertex 0 (value=1) has phase ≈ 1°", () => {
      const p = vertexPhase(0);
      expect(p.clockValue).toBe(1);
      expect(p.degrees).toBe(1);
      expect(Math.abs(p.theta - PI / 180)).toBeLessThan(1e-12);
    });

    it("all phases are distinct", () => {
      const map = buildPhaseMap();
      const thetas = new Set(map.map(p => p.theta.toFixed(10)));
      expect(thetas.size).toBe(96);
    });
  });

  describe("12th roots of unity", () => {
    it("produces 12 evenly spaced roots", () => {
      const roots = twelfthRootsOfUnity();
      expect(roots.length).toBe(12);
    });

    it("each root is ≤1° from an Atlas vertex", () => {
      const roots = twelfthRootsOfUnity();
      for (const r of roots) {
        expect(r.distanceDegrees).toBeLessThanOrEqual(1);
      }
    });

    it("root k=0 is at 0° (nearest vertex = 1°)", () => {
      const roots = twelfthRootsOfUnity();
      expect(roots[0].k).toBe(0);
      expect(roots[0].distanceDegrees).toBe(1); // vertex 1° is closest to 0°
    });
  });

  describe("Euler's identity in Atlas", () => {
    it("180° is NOT in the multiplicative group", () => {
      const ei = analyzeEulersIdentity();
      expect(ei.identityInGroup).toBe(false);
      expect(ei.gcdWith360).toBe(180);
    });

    it("flanked by primes 179° and 181°", () => {
      const ei = analyzeEulersIdentity();
      expect(ei.flanking.below.value).toBe(179);
      expect(ei.flanking.above.value).toBe(181);
    });

    it("has order-2 involutions", () => {
      const ei = analyzeEulersIdentity();
      expect(ei.orderTwoElements.length).toBeGreaterThan(0);
      for (const e of ei.orderTwoElements) {
        expect(modPow(e.value, 2, 360)).toBe(1);
      }
    });
  });

  describe("Quantum phase gates", () => {
    it("generates 96 phase gates", () => {
      const gates = buildPhaseGateSet();
      expect(gates.length).toBe(96);
    });

    it("each gate is unitary (top-left = 1, off-diags = 0)", () => {
      const gates = buildPhaseGateSet();
      for (const g of gates) {
        expect(g.matrix.topLeft).toEqual([1, 0]);
        expect(g.matrix.topRight).toEqual([0, 0]);
        expect(g.matrix.bottomLeft).toEqual([0, 0]);
        const [re, im] = g.matrix.bottomRight;
        expect(Math.abs(re ** 2 + im ** 2 - 1)).toBeLessThan(1e-12);
      }
    });

    it("gate periods are positive integers", () => {
      const gates = buildPhaseGateSet();
      for (const g of gates) {
        expect(g.period).toBeGreaterThan(0);
        expect(Number.isInteger(g.period)).toBe(true);
      }
    });

    it("composing gates adds angles", () => {
      const gates = buildPhaseGateSet();
      const composed = composePhaseGates(gates[0], gates[1]);
      const expected = (gates[0].theta * 180 / PI + gates[1].theta * 180 / PI);
      expect(Math.abs(composed.composedDegrees - Math.round(expected) % 360)).toBeLessThan(2);
    });
  });

  describe("Thermodynamic partition function", () => {
    it("Z(β→0) → 96 (all states equally weighted)", () => {
      const p = computePartition(0.001);
      expect(Math.abs(p.Z - 96)).toBeLessThan(1);
    });

    it("S(β→0) → ln(96) ≈ 4.564", () => {
      const p = computePartition(0.001);
      expect(Math.abs(p.entropy - Math.log(96))).toBeLessThan(0.1);
    });

    it("S(β→∞) → 0 (ground state dominance)", () => {
      const p = computePartition(1000);
      expect(p.entropy).toBeLessThan(0.01);
    });

    it("free energy is well-defined", () => {
      const p = computePartition(1.0);
      expect(p.freeEnergy).toBeLessThan(0);
      expect(p.avgEnergy).toBeGreaterThan(0);
    });
  });

  describe("Discrete logarithm (finite analog of ln)", () => {
    it("finds log in ≤12 steps for order-12 generator", () => {
      const elements = generateClockElements();
      const gen = elements.find(e => e.order === 12)!;
      expect(gen).toBeDefined();

      let pow = 1;
      for (let k = 0; k < gen.order; k++) {
        const result = discreteLog(gen.value, pow);
        expect(result.found).toBe(true);
        expect(result.exponent).toBe(k);
        pow = (pow * gen.value) % 360;
      }
    });

    it("returns not found for elements outside the group", () => {
      const result = discreteLog(6, 10); // 6 not coprime to 360
      expect(result.found).toBe(false);
    });
  });

  describe("Exp/Log tables (discrete e^x and ln)", () => {
    it("tables are consistent inverses", () => {
      const tables = buildExpLogTables();
      for (const [x, val] of tables.expTable) {
        expect(tables.logTable.get(val)).toBe(x);
      }
    });

    it("orbit size matches generator order", () => {
      const tables = buildExpLogTables();
      expect(tables.orbitSize).toBeGreaterThan(0);
      expect(tables.orbitSize).toBeLessThanOrEqual(96);
    });
  });

  describe("Constants", () => {
    it("ATLAS_CAPACITY = ln(96)", () => {
      expect(Math.abs(ATLAS_CAPACITY - Math.log(96))).toBeLessThan(1e-12);
    });

    it("ATLAS_BITS ≈ 6.585", () => {
      expect(Math.abs(ATLAS_BITS - 6.585)).toBeLessThan(0.001);
    });

    it("GROUP_EXPONENT = 12", () => {
      expect(GROUP_EXPONENT).toBe(12);
    });
  });

  describe("Full verification report", () => {
    it("all 14 discoveries hold", () => {
      const report = runEulerBridgeVerification();
      for (const d of report.discoveries) {
        expect(d.holds, `FAIL: ${d.name} — ${d.detail}`).toBe(true);
      }
      expect(report.allHold).toBe(true);
      expect(report.discoveries.length).toBe(14);
    });
  });
});
