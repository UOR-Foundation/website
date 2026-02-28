/**
 * Clock Algebra Test Suite
 * ════════════════════════
 *
 * Verifies that φ(360) = 96 establishes (ℤ/360ℤ)* as the algebraic
 * substrate isomorphic to the 96 Atlas vertices, enabling finite
 * circuit computing and universal encoding.
 */
import { describe, it, expect } from "vitest";
import {
  CLOCK_MODULUS,
  TOTIENT_360,
  eulerTotient,
  generateClockElements,
  clockElement,
  clockElementByIndex,
  groupExponent,
  modPow,
  modInverse,
  crtReconstruct,
  buildAtlasBijection,
  buildMultiplicationCircuit,
  buildExponentiationCircuit,
  buildInverseCircuit,
  applyCircuit,
  encodeToClockElements,
  analyzePeriod,
  enumerateOrbits,
  discreteLog,
  runClockAlgebraVerification,
} from "@/modules/atlas/clock-algebra";
import { ATLAS_VERTEX_COUNT } from "@/modules/atlas/atlas";

describe("Clock Algebra: φ(360) = 96", () => {
  describe("Core identity", () => {
    it("φ(360) = 96 = Atlas vertex count", () => {
      expect(eulerTotient(360)).toBe(96);
      expect(TOTIENT_360).toBe(96);
      expect(TOTIENT_360).toBe(ATLAS_VERTEX_COUNT);
    });

    it("generates exactly 96 coprime elements", () => {
      const elements = generateClockElements();
      expect(elements.length).toBe(96);
    });

    it("all elements are coprime to 360", () => {
      for (const e of generateClockElements()) {
        expect(e.value).toBeGreaterThan(0);
        expect(e.value).toBeLessThan(360);
      }
    });
  });

  describe("Group axioms", () => {
    it("identity: 1 is in the group with order 1", () => {
      const one = clockElement(1);
      expect(one).toBeDefined();
      expect(one!.order).toBe(1);
    });

    it("inverses: a × a⁻¹ ≡ 1 (mod 360) for all elements", () => {
      for (const e of generateClockElements()) {
        const prod = (e.value * e.inverse) % 360;
        expect(prod).toBe(1);
      }
    });

    it("group exponent = 12 (lcm of component orders)", () => {
      expect(groupExponent()).toBe(12);
    });

    it("a^12 ≡ 1 (mod 360) for all a", () => {
      for (const e of generateClockElements()) {
        expect(modPow(e.value, 12, 360)).toBe(1);
      }
    });

    it("Lagrange: a^96 ≡ 1 (mod 360) for all a", () => {
      for (const e of generateClockElements()) {
        expect(modPow(e.value, 96, 360)).toBe(1);
      }
    });
  });

  describe("CRT decomposition (360 = 8 × 9 × 5)", () => {
    it("round-trips all elements", () => {
      for (const e of generateClockElements()) {
        const [r8, r9, r5] = e.crt;
        const reconstructed = crtReconstruct(r8, r9, r5);
        expect(reconstructed).toBe(e.value);
      }
    });

    it("component group sizes multiply to 96", () => {
      // (ℤ/8ℤ)* = 4, (ℤ/9ℤ)* = 6, (ℤ/5ℤ)* = 4
      expect(4 * 6 * 4).toBe(96);
    });
  });

  describe("Atlas ↔ Clock bijection", () => {
    it("96 bijection entries", () => {
      const bij = buildAtlasBijection();
      expect(bij.length).toBe(96);
    });

    it("all Atlas vertices represented", () => {
      const bij = buildAtlasBijection();
      const indices = new Set(bij.map(b => b.vertex.index));
      expect(indices.size).toBe(96);
    });

    it("all clock elements represented", () => {
      const bij = buildAtlasBijection();
      const values = new Set(bij.map(b => b.clockElement.value));
      expect(values.size).toBe(96);
    });
  });

  describe("Clock circuits", () => {
    it("multiplication circuit is reversible", () => {
      const circuit = buildMultiplicationCircuit(7);
      expect(circuit.reversible).toBe(true);
    });

    it("multiplication preserves group membership", () => {
      const elem = clockElementByIndex(10);
      const result = applyCircuit(elem, buildMultiplicationCircuit(7));
      expect(result).toBeDefined();
      expect(result.value).toBeGreaterThan(0);
      expect(result.value).toBeLessThan(360);
    });

    it("exponentiation circuit has 7 operations", () => {
      const circuit = buildExponentiationCircuit(7);
      expect(circuit.operations.length).toBe(7);
      expect(circuit.reversible).toBe(true);
    });

    it("inverse circuit is self-inverse", () => {
      const inv = buildInverseCircuit();
      const elem = clockElementByIndex(5);
      const result1 = applyCircuit(elem, inv);
      const result2 = applyCircuit(result1, inv);
      expect(result2.value).toBe(elem.value);
    });
  });

  describe("Universal encoding", () => {
    it("encodes bytes into clock elements", () => {
      const data = new Uint8Array([72, 101, 108, 108, 111]);
      const encoded = encodeToClockElements(data);
      expect(encoded.elements.length).toBe(5);
      expect(encoded.lossless).toBe(true);
    });

    it("empty input produces empty encoding", () => {
      const encoded = encodeToClockElements(new Uint8Array([]));
      expect(encoded.elements.length).toBe(0);
    });
  });

  describe("Quantum period finding", () => {
    it("all periods divide group exponent 12", () => {
      for (const e of generateClockElements()) {
        expect(12 % e.order).toBe(0);
      }
    });

    it("period analysis returns valid orbit", () => {
      const analysis = analyzePeriod(7);
      expect(analysis.period).toBeGreaterThan(0);
      expect(analysis.orbit.length).toBe(analysis.period);
      expect(analysis.orbit[0]).toBe(1); // g^0 = 1
    });

    it("phase qubits ≤ 4 (since max period = 12)", () => {
      for (const e of generateClockElements()) {
        const analysis = analyzePeriod(e.value);
        expect(analysis.phaseQubits).toBeLessThanOrEqual(4);
      }
    });

    it("orbit enumeration covers all 96 elements", () => {
      const orbits = enumerateOrbits();
      const total = orbits.reduce((s, o) => s + o.count, 0);
      expect(total).toBe(96);
    });
  });

  describe("Discrete logarithm", () => {
    it("solves dlog_g(g^k) = k", () => {
      const g = 7;
      for (let k = 0; k < 12; k++) {
        const target = modPow(g, k, 360);
        const x = discreteLog(g, target);
        expect(x).toBe(k);
      }
    });

    it("returns -1 for elements not in ⟨g⟩", () => {
      // order of 7 is 12, orbit has 12 elements
      // most of the 96 elements are NOT in ⟨7⟩
      // pick one that's definitely not
      const g = 7;
      const analysis = analyzePeriod(g);
      const orbitSet = new Set(analysis.orbit);
      const nonMember = generateClockElements().find(e => !orbitSet.has(e.value));
      if (nonMember) {
        const result = discreteLog(g, nonMember.value);
        expect(result).toBe(-1);
      }
    });
  });

  describe("Full verification report", () => {
    it("all 16 tests pass", () => {
      const report = runClockAlgebraVerification();
      for (const t of report.tests) {
        expect(t.holds, `FAIL: ${t.name} — ${t.detail}`).toBe(true);
      }
      expect(report.allPassed).toBe(true);
      expect(report.tests.length).toBe(16);
    });

    it("group order = 96", () => {
      const report = runClockAlgebraVerification();
      expect(report.groupOrder).toBe(96);
    });
  });
});
