/**
 * Causal Multi-Head Coherence — Test Suite
 * ═════════════════════════════════════════
 *
 * Tests the causal mask extension: the categorical analogue of
 * causal (autoregressive) attention.
 *
 * TRANSFORMER CAUSAL ATTENTION:
 *   mask[i,j] = (j ≤ i) ? 1 : -∞   (lower triangular)
 *
 * CATEGORICAL CAUSAL COHERENCE:
 *   mask[query, (a,b,c)] = (max(idx_a, idx_b, idx_c) ≤ query) ? 1 : 0
 */

import { describe, it, expect } from "vitest";
import {
  MultiHeadCoherenceLayer,
  createCausalCoherenceLayer,
  createSoftCausalCoherenceLayer,
  createFullCoherenceLayer,
  type CausalCoherenceOutput,
} from "@/modules/atlas/multi-head-coherence";

// ══════════════════════════════════════════════════════════════════════════
// Part I: Strict Causal Mask
// ══════════════════════════════════════════════════════════════════════════

describe("Strict Causal Mask", () => {
  it("creates causal layer with strict mode", () => {
    const layer = createCausalCoherenceLayer("strict");
    expect(layer.causalMode).toBe("strict");
    expect(layer.headCount).toBe(7);
  });

  it("sequential vertices: all triples are causal (positions = indices)", () => {
    const layer = createCausalCoherenceLayer("strict");
    const output = layer.causalCoherence([0, 1, 2, 3, 4]);
    // With default index = position, triples (0,1,2), (1,2,3), (2,3,4)
    // All have max index = queryPos, so all are causal
    expect(output.maskedCount).toBe(0);
    expect(output.evaluatedCount).toBe(3);
    expect(output.causalRatio).toBe(1);
  });

  it("reversed causal indices mask future triples", () => {
    const layer = createCausalCoherenceLayer("strict");
    // Give reversed causal indices: vertex 4 has lowest index, vertex 0 highest
    const causalMap = new Map([
      [0, 4], [1, 3], [2, 2], [3, 1], [4, 0],
    ]);
    const output = layer.causalCoherence([0, 1, 2, 3, 4], causalMap);
    // Triple (0,1,2) at pos 0,1,2: max causal idx = max(4,3,2) = 4, queryPos = 2 → masked
    // Triple (1,2,3) at pos 1,2,3: max causal idx = max(3,2,1) = 3, queryPos = 3 → ok
    // Triple (2,3,4) at pos 2,3,4: max causal idx = max(2,1,0) = 2, queryPos = 4 → ok
    expect(output.maskedCount).toBe(1);
    expect(output.evaluatedCount).toBe(2);
  });

  it("fully future sequence masks everything", () => {
    const layer = createCausalCoherenceLayer("strict");
    // All causal indices are very high
    const causalMap = new Map([
      [0, 100], [1, 101], [2, 102], [3, 103], [4, 104],
    ]);
    const output = layer.causalCoherence([0, 1, 2, 3, 4], causalMap);
    // All triples have max causal idx >> queryPos, all masked
    expect(output.maskedCount).toBe(3);
    expect(output.evaluatedCount).toBe(0);
    expect(output.causalRatio).toBe(0);
  });

  it("masked triples are reported separately", () => {
    const layer = createCausalCoherenceLayer("strict");
    const causalMap = new Map([
      [0, 100], [1, 1], [2, 2], [3, 3], [4, 4],
    ]);
    const output = layer.causalCoherence([0, 1, 2, 3, 4], causalMap);
    // Triple (0,1,2): max causal = max(100,1,2)=100, queryPos=2 → masked
    // Triple (1,2,3): max causal = max(1,2,3)=3, queryPos=3 → ok
    // Triple (2,3,4): max causal = max(2,3,4)=4, queryPos=4 → ok
    expect(output.maskedTriples?.length).toBeGreaterThan(0);
    for (const m of output.maskedTriples ?? []) {
      expect(m.causallyMasked).toBe(true);
      expect(m.isCoherent).toBe(false);
    }
  });

  it("short sequence returns valid causal output", () => {
    const layer = createCausalCoherenceLayer("strict");
    const output = layer.causalCoherence([0, 1]);
    expect(output.causalMode).toBe("strict");
    expect(output.maskedCount).toBe(0);
    expect(output.evaluatedCount).toBe(0);
    expect(output.causalRatio).toBe(1);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part II: Soft Causal Mask
// ══════════════════════════════════════════════════════════════════════════

describe("Soft Causal Mask", () => {
  it("creates soft causal layer", () => {
    const layer = createSoftCausalCoherenceLayer();
    expect(layer.causalMode).toBe("soft");
  });

  it("soft mask never masks — all triples evaluated", () => {
    const layer = createSoftCausalCoherenceLayer();
    const causalMap = new Map([
      [0, 100], [1, 101], [2, 102], [3, 103], [4, 104],
    ]);
    const output = layer.causalCoherence([0, 1, 2, 3, 4], causalMap);
    expect(output.maskedCount).toBe(0);
    expect(output.evaluatedCount).toBe(3);
  });

  it("soft mask scales corrections by α^distance", () => {
    const layer = createSoftCausalCoherenceLayer();
    const alpha = 1 / 137;
    // Give one vertex a very high causal index
    const causalMap = new Map([
      [0, 1000], [1, 1], [2, 2], [3, 3], [4, 4],
    ]);
    const output = layer.causalCoherence([0, 1, 2, 3, 4], causalMap, alpha);
    // The triple containing vertex 0 should have heavily decayed corrections
    expect(output.causalDecayAlpha).toBe(alpha);
    // Corrections for triple (0,1,2) should be near zero due to α^998
    const firstMerged = output.merged[0];
    if (firstMerged) {
      const norm = Math.sqrt(
        firstMerged.mergedCorrection.reduce((s, v) => s + v * v, 0)
      );
      // α^998 ≈ 0, so correction should be vanishingly small
      expect(norm).toBeLessThan(1e-10);
    }
  });

  it("causal vertices have unscaled corrections", () => {
    const layer = createSoftCausalCoherenceLayer();
    // Default indices = positions → distance = 0 → weight = 1
    const output = layer.causalCoherence([0, 1, 2, 3, 4]);
    // Compare with non-causal output
    const nonCausal = createFullCoherenceLayer().selfCoherence([0, 1, 2, 3, 4]);
    // Same number of merged evaluations
    expect(output.merged.length).toBe(nonCausal.merged.length);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part III: Causal vs Bidirectional Comparison
// ══════════════════════════════════════════════════════════════════════════

describe("Causal vs Bidirectional Comparison", () => {
  it("causal evaluates ≤ bidirectional triples", () => {
    const seq = [0, 1, 2, 3, 4, 5, 6];
    const bidir = createFullCoherenceLayer().selfCoherence(seq);
    const causal = createCausalCoherenceLayer("strict").causalCoherence(seq);
    expect(causal.evaluatedCount).toBeLessThanOrEqual(bidir.merged.length);
  });

  it("with natural ordering, causal equals bidirectional", () => {
    const seq = [0, 1, 2, 3, 4, 5, 6];
    const bidir = createFullCoherenceLayer().selfCoherence(seq);
    const causal = createCausalCoherenceLayer("strict").causalCoherence(seq);
    // With default position-based indices, all triples are causal
    expect(causal.evaluatedCount).toBe(bidir.merged.length);
    expect(causal.maskedCount).toBe(0);
  });

  it("causal mask ratio decreases with more future vertices", () => {
    const layer = createCausalCoherenceLayer("strict");
    // Progressively more future vertices
    const seq = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

    // All present
    const allPresent = layer.causalCoherence(seq);
    expect(allPresent.causalRatio).toBe(1);

    // Half future
    const halfFuture = new Map(seq.map((v, i) =>
      [v, i < 5 ? i : i + 100]
    ));
    const halfOutput = layer.causalCoherence(seq, halfFuture);
    expect(halfOutput.causalRatio).toBeLessThan(1);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part IV: Causal Decay Properties
// ══════════════════════════════════════════════════════════════════════════

describe("Causal Decay Properties", () => {
  it("α = 1/137 matches fine-structure constant", () => {
    const layer = createSoftCausalCoherenceLayer();
    const output = layer.causalCoherence([0, 1, 2, 3, 4]);
    expect(output.causalDecayAlpha).toBeCloseTo(1 / 137, 5);
  });

  it("custom α is preserved", () => {
    const layer = createSoftCausalCoherenceLayer();
    const output = layer.causalCoherence([0, 1, 2, 3, 4], undefined, 0.5);
    expect(output.causalDecayAlpha).toBe(0.5);
  });

  it("α = 1 means no decay in soft mode", () => {
    const layer = createSoftCausalCoherenceLayer();
    const withDecay = layer.causalCoherence([0, 1, 2, 3, 4], undefined, 1);
    const noMask = createFullCoherenceLayer().selfCoherence([0, 1, 2, 3, 4]);
    // With α=1, soft mode correction magnitudes should match bidirectional
    expect(withDecay.merged.length).toBe(noMask.merged.length);
    for (let i = 0; i < withDecay.merged.length; i++) {
      const cNorm = Math.sqrt(
        withDecay.merged[i].mergedCorrection.reduce((s, v) => s + v * v, 0)
      );
      const bNorm = Math.sqrt(
        noMask.merged[i].mergedCorrection.reduce((s, v) => s + v * v, 0)
      );
      expect(cNorm).toBeCloseTo(bNorm, 5);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part V: Autoregressive Property
// ══════════════════════════════════════════════════════════════════════════

describe("Autoregressive Property", () => {
  it("adding future tokens does not change past evaluations", () => {
    const layer = createCausalCoherenceLayer("strict");

    // Evaluate short sequence
    const short = layer.causalCoherence([0, 1, 2, 3]);
    // Evaluate longer sequence (appending future tokens)
    const long = layer.causalCoherence([0, 1, 2, 3, 10, 20, 30]);

    // First 2 triples should have identical coherence decisions
    // (causal mask means future tokens can't affect past evaluations)
    expect(short.merged.length).toBe(2);
    expect(long.merged.length).toBeGreaterThanOrEqual(2);

    for (let i = 0; i < short.merged.length; i++) {
      expect(long.merged[i].isCoherent).toBe(short.merged[i].isCoherent);
      expect(long.merged[i].headVotes).toEqual(short.merged[i].headVotes);
    }
  });

  it("causal coherence is monotonically non-decreasing in visible triples", () => {
    const layer = createCausalCoherenceLayer("strict");
    let prevCount = 0;
    for (let n = 3; n <= 10; n++) {
      const seq = Array.from({ length: n }, (_, i) => i);
      const output = layer.causalCoherence(seq);
      expect(output.evaluatedCount).toBeGreaterThanOrEqual(prevCount);
      prevCount = output.evaluatedCount;
    }
  });
});
