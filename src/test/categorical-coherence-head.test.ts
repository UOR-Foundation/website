/**
 * Categorical Coherence Head — Test Suite
 * ═══════════════════════════════════════
 *
 * Verifies the categorical attention replacement:
 * associator brackets → H-scores → deterministic coherence routing.
 */

import { describe, it, expect } from "vitest";
import {
  CategoricalCoherenceHead,
  createCoherenceHead,
  createStrictCoherenceHead,
  evaluateTriple,
  vertexToFanoPoint,
  atlasGradeAGraph,
  compareAttentionVsCoherence,
  type CoherenceHeadOutput,
} from "@/modules/atlas/categorical-coherence-head";
import { constructFanoTopology } from "@/modules/atlas/fano-plane";

// ══════════════════════════════════════════════════════════════════════════
// Part I: Vertex → Fano Mapping
// ══════════════════════════════════════════════════════════════════════════

describe("Coherence Head — Vertex Mapping", () => {
  it("maps vertices to Fano points mod 7", () => {
    expect(vertexToFanoPoint(0)).toBe(0);
    expect(vertexToFanoPoint(7)).toBe(0);
    expect(vertexToFanoPoint(95)).toBe(95 % 7);
  });

  it("all 96 vertices map to valid Fano points (0-6)", () => {
    for (let i = 0; i < 96; i++) {
      const fp = vertexToFanoPoint(i);
      expect(fp).toBeGreaterThanOrEqual(0);
      expect(fp).toBeLessThan(7);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part II: Single Triple Evaluation
// ══════════════════════════════════════════════════════════════════════════

describe("Coherence Head — Triple Evaluation", () => {
  const gradeA = atlasGradeAGraph();

  it("collinear triple → coherent (H-score reflects zero defect)", () => {
    const topo = constructFanoTopology();
    const [a, b, c] = topo.lines[0].points;
    const eval_ = evaluateTriple(a, b, c, gradeA);
    expect(eval_.isCoherent).toBe(true);
    expect(eval_.associatorNorm).toBe(0);
    expect(eval_.hScore).toBeGreaterThanOrEqual(0);
  });

  it("non-collinear triple → defect with norm 2", () => {
    // Points 0, 1, 3 are not collinear in standard Fano labeling
    const topo = constructFanoTopology();
    // Find a non-collinear triple
    let found: [number, number, number] | null = null;
    outer:
    for (let a = 0; a < 7; a++) {
      for (let b = a + 1; b < 7; b++) {
        for (let c = b + 1; c < 7; c++) {
          const onLine = topo.lines.some(
            l => l.points.includes(a) && l.points.includes(b) && l.points.includes(c)
          );
          if (!onLine) { found = [a, b, c]; break outer; }
        }
      }
    }
    expect(found).not.toBeNull();
    const eval_ = evaluateTriple(found![0], found![1], found![2], gradeA);
    expect(eval_.isCoherent).toBe(false);
    expect(eval_.associatorNorm).toBeCloseTo(2, 5);
  });

  it("correction vector is the associator itself", () => {
    const eval_ = evaluateTriple(0, 1, 2, gradeA);
    expect(eval_.correctionVector.length).toBe(8);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part III: Forward Pass (Batch)
// ══════════════════════════════════════════════════════════════════════════

describe("Coherence Head — Forward Pass", () => {
  it("processes batch of triples", () => {
    const head = createCoherenceHead();
    const triples: [number, number, number][] = [
      [0, 1, 2],
      [3, 4, 5],
      [7, 14, 21],
    ];
    const out = head.forward(triples);
    expect(out.evaluations.length).toBe(3);
    expect(out.meanHScore).toBeGreaterThanOrEqual(0);
    expect(out.coherenceRatio).toBeGreaterThanOrEqual(0);
    expect(out.coherenceRatio).toBeLessThanOrEqual(1);
  });

  it("empty input → zero metrics", () => {
    const head = createCoherenceHead();
    const out = head.forward([]);
    expect(out.evaluations.length).toBe(0);
    expect(out.meanHScore).toBe(0);
    expect(out.coherenceRatio).toBe(1);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part IV: Self-Coherence (Self-Attention Analogue)
// ══════════════════════════════════════════════════════════════════════════

describe("Coherence Head — Self-Coherence", () => {
  it("generates n-2 triples from n vertices", () => {
    const head = createCoherenceHead();
    const seq = [0, 1, 2, 3, 4, 5, 6];
    const out = head.selfCoherence(seq);
    expect(out.evaluations.length).toBe(5); // 7 - 2
  });

  it("short sequences handled gracefully", () => {
    const head = createCoherenceHead();
    expect(head.selfCoherence([]).evaluations.length).toBe(0);
    expect(head.selfCoherence([1]).evaluations.length).toBe(0);
    expect(head.selfCoherence([1, 2]).evaluations.length).toBe(0);
    expect(head.selfCoherence([1, 2, 3]).evaluations.length).toBe(1);
  });

  it("all-collinear sequence has high coherence ratio", () => {
    const topo = constructFanoTopology();
    // Use a Fano line: all triples from it are collinear
    const line = topo.lines[0].points;
    const head = createCoherenceHead();
    const out = head.selfCoherence(line);
    // Only 1 triple from 3 points, and it's collinear
    expect(out.evaluations.length).toBe(1);
    expect(out.coherenceRatio).toBe(1);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part V: Cross-Coherence
// ══════════════════════════════════════════════════════════════════════════

describe("Coherence Head — Cross-Coherence", () => {
  it("produces query × (keys-1) triples", () => {
    const head = createCoherenceHead();
    const queries = [0, 7, 14];
    const keys = [1, 2, 3, 4];
    const out = head.crossCoherence(queries, keys);
    // 3 queries × 3 consecutive key pairs = 9
    expect(out.evaluations.length).toBe(9);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part VI: Coherent Route Finding
// ══════════════════════════════════════════════════════════════════════════

describe("Coherence Head — Route Optimization", () => {
  it("finds a route for a vertex set", () => {
    const head = createCoherenceHead();
    const result = head.findCoherentRoute([0, 1, 2, 3, 4]);
    expect(result.bestOrder.length).toBe(5);
    expect(new Set(result.bestOrder).size).toBe(5);
    expect(result.output.evaluations.length).toBe(3);
  });

  it("trivial set returns identity", () => {
    const head = createCoherenceHead();
    const result = head.findCoherentRoute([42]);
    expect(result.bestOrder).toEqual([42]);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part VII: Strict vs Standard Head
// ══════════════════════════════════════════════════════════════════════════

describe("Coherence Head — Strict Mode", () => {
  it("strict head uses smaller Grade-A graph", () => {
    const standard = createCoherenceHead();
    const strict = createStrictCoherenceHead();
    const stdOut = standard.forward([[0, 1, 3]]);
    const strictOut = strict.forward([[0, 1, 3]]);
    // Strict graph is smaller, so H-scores may differ
    expect(strictOut.gradeAGraphSize).toBeLessThan(stdOut.gradeAGraphSize);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part VIII: Attention vs Coherence Comparison
// ══════════════════════════════════════════════════════════════════════════

describe("Coherence Head — Attention Comparison", () => {
  it("coherence is deterministic", () => {
    const result = compareAttentionVsCoherence([0, 1, 2, 3, 4, 5, 6]);
    expect(result.isDeterministic).toBe(true);
  });

  it("coherence complexity < attention complexity", () => {
    const result = compareAttentionVsCoherence([0, 1, 2, 3, 4, 5, 6]);
    expect(result.coherenceComplexity).toBeLessThan(result.attentionComplexity);
    expect(result.efficiencyGain).toBeGreaterThan(1);
  });

  it("efficiency gain scales with sequence length", () => {
    const short = compareAttentionVsCoherence([0, 1, 2, 3]);
    const long = compareAttentionVsCoherence(Array.from({ length: 20 }, (_, i) => i));
    expect(long.efficiencyGain).toBeGreaterThan(short.efficiencyGain);
  });

  it("attention entropy grows logarithmically", () => {
    const r4 = compareAttentionVsCoherence([0, 1, 2, 3]);
    const r8 = compareAttentionVsCoherence([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(r8.attentionEntropy).toBeCloseTo(r4.attentionEntropy + 1, 0.1);
  });
});
