/**
 * Unified Projection Tests — Identity + Coherence = One Concept
 *
 * Verifies that the merged hologram carries both identity (protocol string)
 * and coherence (H-score/zone/Φ) in every projection result.
 */
import { describe, it, expect } from "vitest";
import { unifiedProject, assessByteCoherence } from "@/modules/uns/core/hologram/unified";
import { project } from "@/modules/uns/core/hologram";
import type { ProjectionInput } from "@/modules/uns/core/hologram";

// Deterministic test identity (all-zero hash)
const ZERO_INPUT: ProjectionInput = {
  hashBytes: new Uint8Array(32),
  cid: "bafkreiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  hex: "0".repeat(64),
};

// Non-zero test identity
const TEST_INPUT: ProjectionInput = {
  hashBytes: new Uint8Array(32).fill(42),
  cid: "bafkreitestcidvalue",
  hex: "2a".repeat(32),
};

describe("Unified Projection — Identity + Coherence Merge", () => {

  // ── 1. Every projection carries both dimensions ───────────────────────

  it("1. Full hologram returns identity AND coherence for every projection", () => {
    const hologram = unifiedProject(ZERO_INPUT);

    // Has projections
    expect(Object.keys(hologram.projections).length).toBeGreaterThan(20);

    // Each projection has both value and coherence
    for (const [name, proj] of Object.entries(hologram.projections)) {
      expect(proj.value).toBeDefined();
      expect(typeof proj.value).toBe("string");
      expect(proj.value.length).toBeGreaterThan(0);

      expect(proj.coherence).toBeDefined();
      expect(typeof proj.coherence.hScore).toBe("number");
      expect(["COHERENCE", "DRIFT", "COLLAPSE"]).toContain(proj.coherence.zone);
      expect(proj.coherence.phi).toBeGreaterThanOrEqual(0);
      expect(proj.coherence.phi).toBeLessThanOrEqual(1);
      expect(["lossless", "lossy"]).toContain(proj.coherence.fidelity);
    }
  });

  // ── 2. Identity values match the original hologram ────────────────────

  it("2. Identity values are identical to original project() function", () => {
    const unified = unifiedProject(TEST_INPUT);
    const original = project(TEST_INPUT);

    for (const [name, uProj] of Object.entries(unified.projections)) {
      const oProj = original.projections[name];
      expect(uProj.value).toBe(oProj.value);
    }
  });

  // ── 3. Full Q0 graph → COHERENCE for all ──────────────────────────────

  it("3. With full Q0 graph, all projections show COHERENCE zone", () => {
    const hologram = unifiedProject(ZERO_INPUT);

    expect(hologram.sourceCoherence.zone).toBe("COHERENCE");
    expect(hologram.sourceCoherence.hScore).toBe(0);
    expect(hologram.systemCoherence.zone).toBe("COHERENCE");

    for (const proj of Object.values(hologram.projections)) {
      expect(proj.coherence.zone).toBe("COHERENCE");
    }
  });

  // ── 4. Sparse graph → elevated H-scores ───────────────────────────────

  it("4. With sparse graph, odd-byte hashes show elevated H-scores", () => {
    // Graph with only even numbers
    const sparseGraph = Array.from({ length: 128 }, (_, i) => i * 2);

    // Input with odd first bytes
    const oddInput: ProjectionInput = {
      hashBytes: new Uint8Array(32).map((_, i) => i * 2 + 1), // All odd
      cid: "bafkreioddtest",
      hex: "01".repeat(32),
    };

    const hologram = unifiedProject(oddInput, sparseGraph);

    // Should show non-zero H-score (odd bytes are 1 bit away from nearest even)
    expect(hologram.sourceCoherence.hScore).toBeGreaterThan(0);
  });

  // ── 5. Single-target projection works ─────────────────────────────────

  it("5. Single-target projection returns unified result", () => {
    const did = unifiedProject(ZERO_INPUT, undefined, "did");

    expect(did.value).toBe(`did:uor:${ZERO_INPUT.cid}`);
    expect(did.coherence.zone).toBe("COHERENCE");
    expect(did.coherence.fidelity).toBe("lossless");
    expect(did.spec).toContain("did-core");
  });

  // ── 6. Unknown target throws ──────────────────────────────────────────

  it("6. Unknown projection target throws descriptive error", () => {
    expect(() => unifiedProject(ZERO_INPUT, undefined, "nonexistent"))
      .toThrow(/Unknown projection.*nonexistent/);
  });

  // ── 7. System coherence aggregates correctly ──────────────────────────

  it("7. System coherence is the mean across all projections", () => {
    const hologram = unifiedProject(ZERO_INPUT);
    const projValues = Object.values(hologram.projections);
    const expectedMeanH = projValues.reduce((s, p) => s + p.coherence.hScore, 0) / projValues.length;

    expect(hologram.systemCoherence.meanH).toBeCloseTo(expectedMeanH, 10);
    expect(hologram.systemCoherence.losslessCount + hologram.systemCoherence.lossyCount)
      .toBe(projValues.length);
  });

  // ── 8. Lossy projections carry fidelity in coherence ──────────────────

  it("8. Lossy projections are marked in coherence.fidelity", () => {
    const hologram = unifiedProject(ZERO_INPUT);
    const ipv6 = hologram.projections["ipv6"];
    const did = hologram.projections["did"];

    expect(ipv6.coherence.fidelity).toBe("lossy");
    expect(did.coherence.fidelity).toBe("lossless");
  });

  // ── 9. assessByteCoherence convenience function ───────────────────────

  it("9. assessByteCoherence returns correct results", () => {
    const fullGraph = Array.from({ length: 256 }, (_, i) => i);
    const result = assessByteCoherence(42, fullGraph);
    expect(result.hScore).toBe(0);
    expect(result.zone).toBe("COHERENCE");
    expect(result.phi).toBe(1);
    expect(result.popcount).toBe(popcount(42));
  });

  it("9b. assessByteCoherence with sparse graph", () => {
    const sparseGraph = [0]; // Only zero in graph
    const result = assessByteCoherence(255, sparseGraph);
    expect(result.hScore).toBe(8); // popcount(255 XOR 0) = 8
    expect(result.zone).toBe("COLLAPSE");
    expect(result.phi).toBeLessThan(0.2);
  });

  // ── 10. Phi is inversely proportional to H-score ──────────────────────

  it("10. Phi is inversely proportional to H-score", () => {
    const sparseGraph = [0];
    const low = assessByteCoherence(1, sparseGraph);   // H=1
    const high = assessByteCoherence(255, sparseGraph); // H=8
    expect(low.phi).toBeGreaterThan(high.phi);
  });
});

// Import popcount for test 9
import { popcount } from "@/modules/observable/h-score";
