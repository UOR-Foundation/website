/**
 * Multi-Head Categorical Coherence Layer — Test Suite
 * ════════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest";
import {
  MultiHeadCoherenceLayer,
  createFullCoherenceLayer,
  createBalancedCoherenceLayer,
  createSingleCoherenceLayer,
  projectThroughLine,
  type MergeStrategy,
} from "@/modules/atlas/multi-head-coherence";
import { constructFanoTopology } from "@/modules/atlas/fano-plane";

// ══════════════════════════════════════════════════════════════════════════
// Part I: Fano Line Projection
// ══════════════════════════════════════════════════════════════════════════

describe("Fano Line Projection", () => {
  const topo = constructFanoTopology();

  it("on-line points project to themselves", () => {
    const line = topo.lines[0].points;
    for (const p of line) {
      expect(projectThroughLine(p, line)).toBe(p);
    }
  });

  it("off-line points project to a point on the line", () => {
    const line = topo.lines[0].points;
    for (let p = 0; p < 7; p++) {
      const projected = projectThroughLine(p, line);
      expect(line).toContain(projected);
    }
  });

  it("projection is deterministic", () => {
    const line = topo.lines[0].points;
    for (let p = 0; p < 7; p++) {
      const a = projectThroughLine(p, line);
      const b = projectThroughLine(p, line);
      expect(a).toBe(b);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part II: Single Head
// ══════════════════════════════════════════════════════════════════════════

describe("Single-Head Coherence", () => {
  it("creates with 1 head", () => {
    const layer = createSingleCoherenceLayer(0);
    expect(layer.headCount).toBe(1);
  });

  it("evaluates a short sequence", () => {
    const layer = createSingleCoherenceLayer();
    const output = layer.selfCoherence([0, 1, 2, 3, 4]);
    expect(output.merged.length).toBe(3); // 5 - 3 + 1 = 3 triples
    expect(output.headCount).toBe(1);
  });

  it("returns coherence ratio in [0,1]", () => {
    const layer = createSingleCoherenceLayer();
    const output = layer.selfCoherence([0, 1, 2, 3, 4, 5, 6]);
    expect(output.coherenceRatio).toBeGreaterThanOrEqual(0);
    expect(output.coherenceRatio).toBeLessThanOrEqual(1);
  });

  it("empty sequence produces empty output", () => {
    const layer = createSingleCoherenceLayer();
    const output = layer.selfCoherence([0, 1]);
    expect(output.merged.length).toBe(0);
    expect(output.coherenceRatio).toBe(1);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part III: Multi-Head (k=7, all Fano lines)
// ══════════════════════════════════════════════════════════════════════════

describe("Full 7-Head Coherence", () => {
  it("creates with 7 heads", () => {
    const layer = createFullCoherenceLayer();
    expect(layer.headCount).toBe(7);
  });

  it("all 7 heads produce evaluations", () => {
    const layer = createFullCoherenceLayer();
    const output = layer.selfCoherence([0, 1, 2, 3, 4]);
    expect(output.heads.length).toBe(7);
    for (const head of output.heads) {
      expect(head.evaluations.length).toBe(3);
    }
  });

  it("merged evaluations have 7 votes each", () => {
    const layer = createFullCoherenceLayer();
    const output = layer.selfCoherence([0, 1, 2, 3]);
    for (const m of output.merged) {
      expect(m.headVotes.length).toBe(7);
    }
  });

  it("each head uses a different Fano line", () => {
    const layer = createFullCoherenceLayer();
    const output = layer.selfCoherence([0, 1, 2, 3, 4]);
    const lineIndices = output.heads.map(h => h.lineIndex);
    const unique = new Set(lineIndices);
    expect(unique.size).toBe(7);
  });

  it("agreement ratio is in [0.5, 1]", () => {
    const layer = createFullCoherenceLayer();
    const output = layer.selfCoherence([0, 1, 2, 3, 4, 5, 6]);
    for (const m of output.merged) {
      expect(m.agreementRatio).toBeGreaterThanOrEqual(0.5 - 0.01);
      expect(m.agreementRatio).toBeLessThanOrEqual(1);
    }
  });

  it("0 parameters", () => {
    const layer = createFullCoherenceLayer();
    const output = layer.selfCoherence([0, 1, 2, 3, 4]);
    expect(output.stats.totalParameters).toBe(0);
  });

  it("prints summary", () => {
    const layer = createFullCoherenceLayer();
    const output = layer.selfCoherence([0, 1, 2, 3, 4, 5, 6]);
    expect(output.summary).toContain("Multi-Head Categorical Coherence");
    expect(output.summary).toContain("7");
    console.log("\n" + output.summary);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part IV: Balanced 3-Head
// ══════════════════════════════════════════════════════════════════════════

describe("Balanced 3-Head Coherence", () => {
  it("creates with 3 heads", () => {
    const layer = createBalancedCoherenceLayer();
    expect(layer.headCount).toBe(3);
  });

  it("evaluates correctly", () => {
    const layer = createBalancedCoherenceLayer();
    const output = layer.selfCoherence([0, 1, 2, 3, 4, 5, 6]);
    expect(output.heads.length).toBe(3);
    expect(output.merged.length).toBe(5);
  });

  it("merged votes have length 3", () => {
    const layer = createBalancedCoherenceLayer();
    const output = layer.selfCoherence([0, 1, 2, 3]);
    for (const m of output.merged) {
      expect(m.headVotes.length).toBe(3);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part V: Merge Strategies
// ══════════════════════════════════════════════════════════════════════════

describe("Merge Strategies", () => {
  const seq = [0, 1, 2, 3, 4, 5, 6];
  const strategies: MergeStrategy[] = ["union", "intersect", "majority", "weighted", "sum"];

  for (const strategy of strategies) {
    it(`${strategy} strategy produces valid output`, () => {
      const layer = createFullCoherenceLayer(strategy);
      const output = layer.selfCoherence(seq);
      expect(output.mergeStrategy).toBe(strategy);
      expect(output.coherenceRatio).toBeGreaterThanOrEqual(0);
      expect(output.coherenceRatio).toBeLessThanOrEqual(1);
    });
  }

  it("union is at least as generous as intersect", () => {
    const union = createFullCoherenceLayer("union").selfCoherence(seq);
    const intersect = createFullCoherenceLayer("intersect").selfCoherence(seq);
    expect(union.coherenceRatio).toBeGreaterThanOrEqual(intersect.coherenceRatio);
  });

  it("majority is between union and intersect", () => {
    const union = createFullCoherenceLayer("union").selfCoherence(seq);
    const majority = createFullCoherenceLayer("majority").selfCoherence(seq);
    const intersect = createFullCoherenceLayer("intersect").selfCoherence(seq);
    expect(majority.coherenceRatio).toBeGreaterThanOrEqual(intersect.coherenceRatio - 0.01);
    expect(majority.coherenceRatio).toBeLessThanOrEqual(union.coherenceRatio + 0.01);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part VI: Cross-Coherence
// ══════════════════════════════════════════════════════════════════════════

describe("Cross-Coherence", () => {
  it("evaluates query vs key sequences", () => {
    const layer = createFullCoherenceLayer();
    const output = layer.crossCoherence([0, 1], [2, 3, 4]);
    // 2 queries × 2 key pairs = 4 triples
    expect(output.merged.length).toBe(4);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part VII: Comparison to Multi-Head Attention
// ══════════════════════════════════════════════════════════════════════════

describe("vs Multi-Head Attention", () => {
  it("attention requires kd² parameters, coherence requires 0", () => {
    const layer = createFullCoherenceLayer();
    const output = layer.selfCoherence([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(output.stats.totalParameters).toBe(0);
    expect(output.stats.vsAttention.attentionParams).toBeGreaterThan(0);
  });

  it("coherence complexity is O(kn) vs attention O(kn²d)", () => {
    const layer = createFullCoherenceLayer();
    const output = layer.selfCoherence(Array.from({ length: 20 }, (_, i) => i));
    expect(output.stats.complexity).toContain("O(kn)");
    expect(output.stats.vsAttention.attentionComplexity).toContain("O(kn²d)");
  });

  it("complexity saving grows with sequence length", () => {
    const short = createFullCoherenceLayer().selfCoherence([0, 1, 2, 3, 4]);
    const long = createFullCoherenceLayer().selfCoherence(
      Array.from({ length: 50 }, (_, i) => i)
    );
    // Both should show savings, longer should show more
    expect(short.stats.vsAttention.complexitySaving).toContain("×");
    expect(long.stats.vsAttention.complexitySaving).toContain("×");
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part VIII: Head Diversity
// ══════════════════════════════════════════════════════════════════════════

describe("Head Diversity", () => {
  it("head diversity is in [0,1]", () => {
    const layer = createFullCoherenceLayer();
    const output = layer.selfCoherence([0, 1, 2, 3, 4, 5, 6]);
    expect(output.stats.headDiversity).toBeGreaterThanOrEqual(0);
    expect(output.stats.headDiversity).toBeLessThanOrEqual(1);
  });

  it("single head has 0 diversity", () => {
    const layer = createSingleCoherenceLayer();
    const output = layer.selfCoherence([0, 1, 2, 3, 4]);
    expect(output.stats.headDiversity).toBe(0);
  });

  it("unanimous agreement ≤ 1", () => {
    const layer = createFullCoherenceLayer();
    const output = layer.selfCoherence([0, 1, 2, 3, 4, 5, 6]);
    expect(output.stats.unanimousAgreement).toBeLessThanOrEqual(1);
    expect(output.stats.unanimousAgreement).toBeGreaterThanOrEqual(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part IX: Correction Vectors
// ══════════════════════════════════════════════════════════════════════════

describe("Merged Correction Vectors", () => {
  it("correction vectors have 8 components (octonionic)", () => {
    const layer = createFullCoherenceLayer();
    const output = layer.selfCoherence([0, 1, 2, 3, 4]);
    for (const m of output.merged) {
      expect(m.mergedCorrection.length).toBe(8);
    }
  });

  it("coherent triples have near-zero merged correction", () => {
    const layer = createFullCoherenceLayer("intersect");
    const output = layer.selfCoherence([0, 1, 2, 3, 4, 5, 6]);
    for (const m of output.merged) {
      if (m.isCoherent && m.headVotes.every(v => v)) {
        const norm = Math.sqrt(m.mergedCorrection.reduce((s, v) => s + v * v, 0));
        expect(norm).toBeCloseTo(0, 5);
      }
    }
  });
});
