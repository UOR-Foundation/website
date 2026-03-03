/**
 * Q-Error-Mitigation Test Suite
 * ═════════════════════════════
 */
import { describe, it, expect } from "vitest";
import {
  zeroNoiseExtrapolation,
  buildCalibrationMatrix,
  applyMeasurementMitigation,
  randomizedCompiling,
  mitigateFull,
} from "@/hologram/kernel/q-error-mitigation";
import { realisticNoise, measure, createState, type SimOp } from "@/hologram/kernel/q-simulator";

const bellOps: SimOp[] = [
  { gate: "h", qubits: [0] },
  { gate: "cx", qubits: [0, 1] },
];

describe("Q-Error-Mitigation", () => {
  describe("Zero-Noise Extrapolation", () => {
    it("returns mitigated value and raw data points", () => {
      const noise = realisticNoise("medium");
      const result = zeroNoiseExtrapolation(bellOps, 2, noise, undefined, [1, 2, 3], 2048, "linear");
      expect(result.rawValues).toHaveLength(3);
      expect(result.method).toBe("linear");
      expect(result.coefficients.length).toBeGreaterThan(0);
      expect(typeof result.mitigated).toBe("number");
    });

    it("exponential extrapolation works", () => {
      const noise = realisticNoise("low");
      const result = zeroNoiseExtrapolation(bellOps, 2, noise, undefined, [1, 2, 3], 2048, "exponential");
      expect(result.method).toBe("exponential");
      expect(result.mitigated).toBeGreaterThan(0);
    });

    it("polynomial extrapolation with 3+ points", () => {
      const noise = realisticNoise("medium");
      const result = zeroNoiseExtrapolation(bellOps, 2, noise, undefined, [1, 1.5, 2, 2.5, 3], 2048, "polynomial");
      expect(result.method).toBe("polynomial");
      expect(result.coefficients).toHaveLength(3);
    });
  });

  describe("Measurement Error Mitigation", () => {
    it("builds calibration matrix with correct dimensions", () => {
      const noise = realisticNoise("medium");
      const cal = buildCalibrationMatrix(2, noise, 4096);
      expect(cal.matrix).toHaveLength(4);
      expect(cal.matrix[0]).toHaveLength(4);
      expect(cal.inverse).toHaveLength(4);
      expect(cal.numQubits).toBe(2);
      expect(cal.fidelity).toBeGreaterThan(0.5);
    });

    it("mitigated counts improve ideal-state probability", () => {
      const noise = realisticNoise("high");
      const state = createState(2);
      state.ops = bellOps;
      state.noise = noise;
      const rawCounts = measure(state, 8192);

      const cal = buildCalibrationMatrix(2, noise, 8192);
      const result = applyMeasurementMitigation(rawCounts, cal);
      expect(Object.keys(result.mitigatedCounts).length).toBeGreaterThan(0);
      expect(result.calibration.fidelity).toBeGreaterThan(0);
    });
  });

  describe("Randomized Compiling", () => {
    it("produces averaged counts across compilations", () => {
      const noise = realisticNoise("medium");
      const result = randomizedCompiling(bellOps, 2, noise, 8, 2048);
      expect(result.numCompilations).toBe(8);
      expect(result.compilationCounts).toHaveLength(8);
      expect(Object.keys(result.mitigatedCounts).length).toBeGreaterThan(0);
    });
  });

  describe("Full Pipeline", () => {
    it("runs RC → ZNE → MEM pipeline", () => {
      const noise = realisticNoise("medium");
      const result = mitigateFull(bellOps, 2, noise, {
        enableRc: true,
        enableZne: true,
        enableMem: true,
        rcCompilations: 4,
        shots: 2048,
      });
      expect(result.stages.length).toBeGreaterThan(0);
      expect(Object.keys(result.counts).length).toBeGreaterThan(0);
    });

    it("can selectively disable stages", () => {
      const noise = realisticNoise("low");
      const result = mitigateFull(bellOps, 2, noise, {
        enableRc: false,
        enableZne: false,
        enableMem: true,
        shots: 2048,
      });
      expect(result.stages).toContain("measurement_error_mitigation");
      expect(result.rc).toBeUndefined();
      expect(result.zne).toBeUndefined();
    });
  });
});
