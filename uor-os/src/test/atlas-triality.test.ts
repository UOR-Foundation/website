/**
 * Triality Coordinate System Test Suite
 * ══════════════════════════════════════
 *
 * Verifies the Sigmatics (h₂, d, ℓ) decomposition of the 96 Atlas vertices,
 * the Z/3Z D-transform, 32 triality orbits, and D₄ correspondence.
 */
import { describe, it, expect } from "vitest";
import {
  encodeTriality,
  decodeTriality,
  dTransform,
  dTransformFull,
  computeTrialityDecomposition,
  getOrbit,
  orbitSignClassDistribution,
  orbitMirrorCorrespondence,
  d4TrialityCorrespondence,
  runTrialityVerification,
  QUADRANT_COUNT,
  MODALITY_COUNT,
  SLOT_COUNT,
  ORBIT_COUNT,
  type TrialityCoordinate,
} from "@/modules/atlas/triality";
import { ATLAS_VERTEX_COUNT } from "@/modules/atlas/atlas";

describe("Phase 1: Triality Coordinate System", () => {
  describe("Encoding & Decoding", () => {
    it("encodes (0,0,0) → 0", () => {
      expect(encodeTriality({ quadrant: 0, modality: 0, slot: 0 })).toBe(0);
    });

    it("encodes (3,2,7) → 95", () => {
      expect(encodeTriality({ quadrant: 3, modality: 2, slot: 7 })).toBe(95);
    });

    it("round-trips all 96 indices", () => {
      for (let i = 0; i < ATLAS_VERTEX_COUNT; i++) {
        expect(encodeTriality(decodeTriality(i))).toBe(i);
      }
    });

    it("inverse round-trips all coordinates", () => {
      for (let h = 0; h < QUADRANT_COUNT; h++) {
        for (let d = 0; d < MODALITY_COUNT; d++) {
          for (let l = 0; l < SLOT_COUNT; l++) {
            const coord: TrialityCoordinate = {
              quadrant: h as 0|1|2|3,
              modality: d as 0|1|2,
              slot: l as 0|1|2|3|4|5|6|7,
            };
            const rt = decodeTriality(encodeTriality(coord));
            expect(rt).toEqual(coord);
          }
        }
      }
    });

    it("produces exactly 96 unique indices", () => {
      const indices = new Set<number>();
      for (let h = 0; h < QUADRANT_COUNT; h++) {
        for (let d = 0; d < MODALITY_COUNT; d++) {
          for (let l = 0; l < SLOT_COUNT; l++) {
            indices.add(encodeTriality({
              quadrant: h as 0|1|2|3,
              modality: d as 0|1|2,
              slot: l as 0|1|2|3|4|5|6|7,
            }));
          }
        }
      }
      expect(indices.size).toBe(96);
    });

    it("throws on out-of-range index", () => {
      expect(() => decodeTriality(-1)).toThrow();
      expect(() => decodeTriality(96)).toThrow();
    });
  });

  describe("D-Transform (Z/3Z Modality Rotation)", () => {
    it("D¹ shifts modality by 1", () => {
      const coord = decodeTriality(0); // (0,0,0)
      const result = decodeTriality(dTransform(0, 1));
      expect(result.modality).toBe(1);
      expect(result.quadrant).toBe(coord.quadrant);
      expect(result.slot).toBe(coord.slot);
    });

    it("D² shifts modality by 2", () => {
      const result = decodeTriality(dTransform(0, 2));
      expect(result.modality).toBe(2);
    });

    it("D³ = identity for all vertices", () => {
      for (let i = 0; i < ATLAS_VERTEX_COUNT; i++) {
        const d3 = dTransform(dTransform(dTransform(i, 1), 1), 1);
        expect(d3).toBe(i);
      }
    });

    it("D² = D⁻¹ for all vertices", () => {
      for (let i = 0; i < ATLAS_VERTEX_COUNT; i++) {
        expect(dTransform(dTransform(i, 1), 1)).toBe(dTransform(i, 2));
      }
    });

    it("preserves quadrant and slot", () => {
      for (let i = 0; i < ATLAS_VERTEX_COUNT; i++) {
        const c0 = decodeTriality(i);
        const c1 = decodeTriality(dTransform(i, 1));
        expect(c1.quadrant).toBe(c0.quadrant);
        expect(c1.slot).toBe(c0.slot);
      }
    });

    it("dTransformFull returns correct metadata", () => {
      const result = dTransformFull(5, 1);
      expect(result.input).toBe(5);
      expect(result.shift).toBe(1);
      expect(result.inputCoord.modality).not.toBe(result.outputCoord.modality);
      expect(result.output).toBe(encodeTriality(result.outputCoord));
    });
  });

  describe("Triality Orbits", () => {
    it("produces exactly 32 orbits", () => {
      const decomp = computeTrialityDecomposition();
      expect(decomp.orbits.length).toBe(ORBIT_COUNT);
    });

    it("every orbit has 3 vertices", () => {
      const decomp = computeTrialityDecomposition();
      for (const orbit of decomp.orbits) {
        expect(orbit.vertices.length).toBe(3);
      }
    });

    it("orbits partition {0..95}", () => {
      const decomp = computeTrialityDecomposition();
      const allVerts = new Set<number>();
      for (const orbit of decomp.orbits) {
        for (const v of orbit.vertices) allVerts.add(v);
      }
      expect(allVerts.size).toBe(96);
    });

    it("orbit vertices are D-transform related", () => {
      const decomp = computeTrialityDecomposition();
      for (const orbit of decomp.orbits) {
        expect(dTransform(orbit.vertices[0], 1)).toBe(orbit.vertices[1]);
        expect(dTransform(orbit.vertices[1], 1)).toBe(orbit.vertices[2]);
        expect(dTransform(orbit.vertices[2], 1)).toBe(orbit.vertices[0]);
      }
    });

    it("getOrbit returns correct orbit for any vertex", () => {
      for (let i = 0; i < ATLAS_VERTEX_COUNT; i++) {
        const orbit = getOrbit(i);
        expect(orbit.vertices).toContain(i);
        expect(orbit.vertices.length).toBe(3);
      }
    });
  });

  describe("Modality Distribution", () => {
    it("each modality has 32 vertices", () => {
      const counts = [0, 0, 0];
      for (let i = 0; i < ATLAS_VERTEX_COUNT; i++) {
        counts[decodeTriality(i).modality]++;
      }
      expect(counts).toEqual([32, 32, 32]);
    });

    it("each quadrant has 24 vertices", () => {
      const counts = [0, 0, 0, 0];
      for (let i = 0; i < ATLAS_VERTEX_COUNT; i++) {
        counts[decodeTriality(i).quadrant]++;
      }
      expect(counts).toEqual([24, 24, 24, 24]);
    });
  });

  describe("Mirror & Sign Class Interaction", () => {
    it("mirror τ maps orbits to orbits", () => {
      const corr = orbitMirrorCorrespondence();
      expect(corr.length).toBe(ORBIT_COUNT);
      // Each orbit's mirror should also be a valid orbit
      const orbitIndices = new Set(corr.map(c => c.orbitIndex));
      for (const c of corr) {
        expect(orbitIndices.has(c.mirrorOrbitIndex)).toBe(true);
      }
    });

    it("orbit-sign-class distribution covers all 8 classes", () => {
      const dist = orbitSignClassDistribution();
      const allClasses = new Set<number>();
      for (const [, classes] of dist) {
        for (const c of classes) allClasses.add(c);
      }
      expect(allClasses.size).toBe(8);
    });
  });

  describe("D₄ Triality Correspondence", () => {
    it("maps 3 modalities to 3 D₄ representations", () => {
      const corr = d4TrialityCorrespondence();
      expect(corr.length).toBe(3);
      expect(corr[0].d4Representation).toContain("8_v");
      expect(corr[1].d4Representation).toContain("8_s");
      expect(corr[2].d4Representation).toContain("8_c");
    });

    it("each representation has 32 vertices", () => {
      const corr = d4TrialityCorrespondence();
      for (const c of corr) {
        expect(c.vertexCount).toBe(32);
      }
    });
  });

  describe("Full Verification Report", () => {
    it("all 12 tests pass", () => {
      const report = runTrialityVerification();
      for (const test of report.tests) {
        expect(test.holds, `"${test.name}" failed: expected ${test.expected}, got ${test.actual}`).toBe(true);
      }
      expect(report.allPassed).toBe(true);
    });

    it("report has 12 tests", () => {
      const report = runTrialityVerification();
      expect(report.tests.length).toBe(12);
    });

    it("bijection is verified", () => {
      const report = runTrialityVerification();
      expect(report.bijectionHolds).toBe(true);
    });

    it("orbit count is 32", () => {
      const report = runTrialityVerification();
      expect(report.orbitCount).toBe(32);
    });
  });
});
