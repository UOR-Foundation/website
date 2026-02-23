/**
 * P31 Self-Verification Tests — Observable Geometry Layer
 *
 * 20 tests covering all 7 observable: namespace metrics.
 * Tests 12–13 verify the commutator theorem exhaustively (all 256 elements).
 * Test 19–20 verify the Shield BLOCK threshold update.
 */

import { describe, it, expect } from "vitest";
import {
  ringMetric,
  hammingMetric,
  cascadeLength,
  CATASTROPHE_THRESHOLD,
  curvature,
  holonomy,
  commutator,
  observablePath,
} from "@/modules/observable/geometry";
import { analyzePayload } from "@/modules/uns/shield/partition";

describe("P31: Observable Geometry Layer — 7 Ring Metrics", () => {
  // ── RingMetric ──────────────────────────────────────────────────────────

  it("T1: ringMetric(42, 42) = 0 (zero self-distance)", () => {
    expect(ringMetric(42, 42).value).toBe(0);
  });

  it("T2: ringMetric(42, 43) = 1 (adjacent elements)", () => {
    expect(ringMetric(42, 43).value).toBe(1);
  });

  it("T3: ringMetric(0, 128) = 128 (max ring distance)", () => {
    expect(ringMetric(0, 128).value).toBe(128);
  });

  it("T4: ringMetric(42, 43) = ringMetric(43, 42) (symmetry)", () => {
    expect(ringMetric(42, 43).value).toBe(ringMetric(43, 42).value);
  });

  // ── CascadeLength ──────────────────────────────────────────────────────

  it("T5: cascadeLength(42, 43) = 1 (one succ step)", () => {
    expect(cascadeLength(42, 43).value).toBe(1);
  });

  it("T6: cascadeLength(42, 42) = 0 (no steps)", () => {
    expect(cascadeLength(42, 42).value).toBe(0);
  });

  it("T7: cascadeLength(0, 255) = 255 (near-full traversal)", () => {
    expect(cascadeLength(0, 255).value).toBe(255);
  });

  // ── CatastropheThreshold ───────────────────────────────────────────────

  it("T8: CATASTROPHE_THRESHOLD = 4/256 = 0.015625 exactly", () => {
    expect(CATASTROPHE_THRESHOLD.value).toBe(4 / 256);
    expect(CATASTROPHE_THRESHOLD.value).toBe(0.015625);
  });

  it("T9: CATASTROPHE_THRESHOLD has epistemic_grade A", () => {
    expect(CATASTROPHE_THRESHOLD.epistemic_grade).toBe("A");
  });

  // ── Curvature ──────────────────────────────────────────────────────────

  it("T10: curvature(0) = 2 (exterior boundary curvature)", () => {
    expect(curvature(0).value).toBe(2);
  });

  it("T11: curvature(128) = 4 (maximal curvature point)", () => {
    expect(curvature(128).value).toBe(4);
  });

  // ── Commutator (theorem verification) ──────────────────────────────────

  it("T12: commutator(42, neg, bnot).commutator === 2 (constant invariant)", () => {
    const result = commutator(42, "neg", "bnot");
    // [neg,bnot](x) = neg(bnot(x)) - bnot(neg(x)) = succ(x) - pred(x) = 2
    expect(result.value.commutator).toBe(2);
    expect(result.value.commutes).toBe(false);
  });

  it("T13: [neg, bnot](x) = 2 for ALL x ∈ Z/256Z (exhaustive theorem)", () => {
    // Theorem: neg(bnot(x)) = succ(x), bnot(neg(x)) = pred(x)
    // Therefore [neg,bnot](x) = succ(x) - pred(x) = 2 for all x
    for (let x = 0; x < 256; x++) {
      const result = commutator(x, "neg", "bnot");
      expect(result.value.commutator).toBe(2);
    }
  });

  // ── Holonomy ───────────────────────────────────────────────────────────

  it("T14: holonomy(42, [neg, neg]).isClosed === true (neg involution)", () => {
    expect(holonomy(42, ["neg", "neg"]).value.isClosed).toBe(true);
  });

  it("T15: holonomy(42, [neg, neg]).holonomyPhase === 0 (flat topology)", () => {
    expect(holonomy(42, ["neg", "neg"]).value.holonomyPhase).toBe(0);
  });

  it("T16: holonomy(42, [bnot, bnot]).holonomyPhase === 0", () => {
    expect(holonomy(42, ["bnot", "bnot"]).value.holonomyPhase).toBe(0);
  });

  // ── ObservablePath ─────────────────────────────────────────────────────

  it("T17: observablePath(42, [neg, bnot, succ]) has 3 steps", () => {
    const path = observablePath(42, ["neg", "bnot", "succ"]);
    expect(path.value).toHaveLength(3);
  });

  it("T18: observablePath step[0].operation === 'neg'", () => {
    const path = observablePath(42, ["neg", "bnot", "succ"]);
    expect(path.value[0].operation).toBe("neg");
  });

  // ── Shield BLOCK threshold update ──────────────────────────────────────

  it("T19: Shield blocks when density <= 0.015625 (CATASTROPHE_THRESHOLD)", () => {
    // Create a payload of all zeros — exterior bytes only → density = 0
    const floodPayload = new Uint8Array(64).fill(0);
    const result = analyzePayload(floodPayload);
    expect(result.density).toBe(0);
    expect(result.action).toBe("BLOCK");
  });

  it("T20: Shield BLOCK threshold uses ring-derived CATASTROPHE_THRESHOLD", () => {
    // A payload with density just above CATASTROPHE_THRESHOLD should NOT block
    // Need density > 0.015625 → at least 2 irreducible bytes out of 128
    const mixedPayload = new Uint8Array(128).fill(0);
    mixedPayload[0] = 3;  // irreducible
    mixedPayload[1] = 5;  // irreducible
    const result = analyzePayload(mixedPayload);
    // density = 2/128 = 0.015625 exactly — this equals the threshold, so BLOCK
    expect(result.density).toBe(0.015625);
    expect(result.action).toBe("BLOCK");

    // Now add one more irreducible to go above threshold
    mixedPayload[2] = 7;  // irreducible
    const result2 = analyzePayload(mixedPayload);
    // density = 3/128 ≈ 0.02344 > 0.015625 → CHALLENGE (not BLOCK)
    expect(result2.action).toBe("CHALLENGE");
  });
});
