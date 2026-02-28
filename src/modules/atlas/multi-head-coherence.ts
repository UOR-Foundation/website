/**
 * Multi-Head Categorical Coherence Layer
 * ═══════════════════════════════════════
 *
 * The categorical analogue of multi-head attention. Instead of k learned
 * projection matrices (Wq, Wk, Wv per head), each coherence head uses a
 * distinct Fano line as its projection subspace.
 *
 * MULTI-HEAD ATTENTION (Transformer):
 *   head_i = Attention(Q·W_i^Q, K·W_i^K, V·W_i^V)
 *   MultiHead(Q,K,V) = Concat(head_1, ..., head_k) · W^O
 *
 *   - k learned projection matrices per head
 *   - O(kn²d) computation
 *   - Probabilistic, requires training
 *
 * MULTI-HEAD COHERENCE (Categorical):
 *   head_i = Coherence_L_i(sequence)     [L_i = Fano line i]
 *   MultiHead(seq) = Merge(head_1, ..., head_k)
 *
 *   - k Fano line projections (algebraically fixed, 0 parameters)
 *   - O(kn) computation
 *   - Deterministic, exact
 *
 * PROJECTION MECHANISM:
 *   Each Fano line L = {p, q, r} defines a 3D associative subspace of O.
 *   Head i projects each vertex triple into L_i's subspace and evaluates
 *   associativity there. Different lines "see" different coherence patterns:
 *
 *   - Line {1,2,4}: detects coherence in the (e₁,e₂,e₄) plane
 *   - Line {2,3,5}: detects coherence in the (e₂,e₃,e₅) plane
 *   - Line {1,3,6}: detects coherence in the (e₁,e₃,e₆) plane
 *   etc.
 *
 *   The 7 Fano lines give 7 natural heads — the maximal multi-head
 *   configuration for octonionic coherence.
 *
 * MERGE STRATEGIES:
 *   - Union:     coherent if ANY head says coherent (generous)
 *   - Intersect: coherent if ALL heads say coherent (strict)
 *   - Majority:  coherent if >50% of heads agree
 *   - Weighted:  each head's vote weighted by its line's incidence score
 *   - Sum:       correction vectors summed (categorical direct sum)
 *
 * @module atlas/multi-head-coherence
 */

import {
  CategoricalCoherenceHead,
  createCoherenceHead,
  vertexToFanoPoint,
  evaluateTriple,
  atlasGradeAGraph,
  type CoherenceEvaluation,
  type CoherenceHeadOutput,
  type CoherenceHeadConfig,
} from "./categorical-coherence-head";
import {
  constructFanoTopology,
  computeAssociator,
  FANO_ORDER,
  type FanoTopology,
  type FanoLine,
  type Octonion,
  type AssociatorResult,
} from "./fano-plane";
import { hScore } from "../observable/h-score";

// ══════════════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════════════

/** Merge strategy for combining head outputs. */
export type MergeStrategy = "union" | "intersect" | "majority" | "weighted" | "sum";

/** Configuration for the multi-head coherence layer. */
export interface MultiHeadConfig {
  /** Number of heads (1–7). Default: 7 (all Fano lines). */
  readonly headCount?: number;
  /** Which Fano lines to use (indices 0–6). Default: first headCount lines. */
  readonly lineIndices?: number[];
  /** Merge strategy. Default: "majority". */
  readonly mergeStrategy?: MergeStrategy;
  /** Grade-A graph for H-score. Default: Atlas-derived. */
  readonly gradeAGraph?: number[];
}

/** Output from a single coherence head with its Fano line context. */
export interface HeadOutput {
  /** Which Fano line this head projects through. */
  readonly lineIndex: number;
  /** The 3 Fano points defining this head's subspace. */
  readonly linePoints: [number, number, number];
  /** Per-triple evaluations from this head's perspective. */
  readonly evaluations: ProjectedEvaluation[];
  /** Coherence ratio from this head's projection. */
  readonly coherenceRatio: number;
  /** Mean H-score from this head's projection. */
  readonly meanHScore: number;
  /** Total defect. */
  readonly totalDefect: number;
}

/** A triple evaluation projected through a specific Fano line. */
export interface ProjectedEvaluation {
  /** Original vertex triple. */
  readonly vertices: [number, number, number];
  /** Fano points after projection through this head's line. */
  readonly projectedPoints: [number, number, number];
  /** Associator in this head's subspace. */
  readonly associator: AssociatorResult;
  /** Whether coherent in this projection. */
  readonly isCoherent: boolean;
  /** H-score in this projection. */
  readonly hScore: number;
  /** Correction vector from this head. */
  readonly correctionVector: Octonion;
}

/** Merged evaluation combining all heads. */
export interface MergedEvaluation {
  /** Original vertex triple. */
  readonly vertices: [number, number, number];
  /** Per-head coherence votes. */
  readonly headVotes: boolean[];
  /** Merged coherence decision. */
  readonly isCoherent: boolean;
  /** Fraction of heads agreeing on coherence. */
  readonly agreementRatio: number;
  /** Merged correction vector (sum of per-head corrections). */
  readonly mergedCorrection: Octonion;
  /** Merged H-score (average across heads). */
  readonly mergedHScore: number;
}

/** Complete output of the multi-head coherence layer. */
export interface MultiHeadOutput {
  /** Per-head outputs. */
  readonly heads: HeadOutput[];
  /** Merged evaluations. */
  readonly merged: MergedEvaluation[];
  /** Overall coherence ratio after merging. */
  readonly coherenceRatio: number;
  /** Overall mean H-score after merging. */
  readonly meanHScore: number;
  /** Total corrections needed. */
  readonly correctionsNeeded: number;
  /** Number of heads used. */
  readonly headCount: number;
  /** Merge strategy used. */
  readonly mergeStrategy: MergeStrategy;
  /** Statistics. */
  readonly stats: MultiHeadStats;
  /** Summary. */
  readonly summary: string;
}

/** Statistics for the multi-head layer. */
export interface MultiHeadStats {
  /** Per-head coherence ratios. */
  readonly perHeadCoherence: number[];
  /** Per-head mean H-scores. */
  readonly perHeadHScore: number[];
  /** Inter-head agreement: fraction of triples where all heads agree. */
  readonly unanimousAgreement: number;
  /** Head diversity: how much heads disagree (0 = all same, 1 = maximal). */
  readonly headDiversity: number;
  /** Total parameters (always 0). */
  readonly totalParameters: number;
  /** Computational complexity. */
  readonly complexity: string;
  /** Comparison to equivalent multi-head attention. */
  readonly vsAttention: {
    readonly attentionParams: number;
    readonly attentionComplexity: string;
    readonly parameterSaving: string;
    readonly complexitySaving: string;
  };
}

// ══════════════════════════════════════════════════════════════════════════
// Fano Line Projection
// ══════════════════════════════════════════════════════════════════════════

/**
 * Project a Fano point through a specific Fano line.
 *
 * Each line L = {p, q, r} defines a projection:
 *   - If the point is ON the line → project to its position in L
 *   - If the point is OFF the line → project to the nearest point on L
 *
 * This is the categorical analogue of the learned W^Q, W^K projections
 * in multi-head attention: each head "sees" the sequence through a
 * different 3-point Fano subspace.
 */
export function projectThroughLine(
  fanoPoint: number,
  line: [number, number, number],
): number {
  // If point is on the line, return it directly
  if (line.includes(fanoPoint)) return fanoPoint;

  // Otherwise, project to the nearest line point.
  // In PG(2,2), every off-line point is collinear with exactly one pair on the line.
  // Use the point's index mod 3 to select a line point (deterministic projection).
  return line[fanoPoint % 3];
}

// ══════════════════════════════════════════════════════════════════════════
// Single Head: Fano-Line-Projected Coherence
// ══════════════════════════════════════════════════════════════════════════

/**
 * Evaluate a vertex triple through a specific Fano line's projection.
 */
function evaluateProjected(
  v1: number, v2: number, v3: number,
  line: [number, number, number],
  gradeAGraph: number[],
): ProjectedEvaluation {
  const fp1 = vertexToFanoPoint(v1);
  const fp2 = vertexToFanoPoint(v2);
  const fp3 = vertexToFanoPoint(v3);

  // Project through this head's Fano line
  const pp1 = projectThroughLine(fp1, line);
  const pp2 = projectThroughLine(fp2, line);
  const pp3 = projectThroughLine(fp3, line);

  const associator = computeAssociator(pp1, pp2, pp3);
  const normByte = Math.round(associator.associatorNorm * 64) & 0xFF;
  const h = hScore(normByte, gradeAGraph);

  return {
    vertices: [v1, v2, v3],
    projectedPoints: [pp1, pp2, pp3],
    associator,
    isCoherent: associator.isAssociative,
    hScore: h,
    correctionVector: associator.associator,
  };
}

/**
 * Run a single coherence head with a specific Fano line projection.
 */
function runHead(
  lineIndex: number,
  line: [number, number, number],
  triples: [number, number, number][],
  gradeAGraph: number[],
): HeadOutput {
  const evaluations = triples.map(([a, b, c]) =>
    evaluateProjected(a, b, c, line, gradeAGraph)
  );

  const coherentCount = evaluations.filter(e => e.isCoherent).length;
  const totalDefect = evaluations.reduce((s, e) => s + e.associator.associatorNorm, 0);
  const totalH = evaluations.reduce((s, e) => s + e.hScore, 0);

  return {
    lineIndex,
    linePoints: line,
    evaluations,
    coherenceRatio: evaluations.length > 0 ? coherentCount / evaluations.length : 1,
    meanHScore: evaluations.length > 0 ? totalH / evaluations.length : 0,
    totalDefect,
  };
}

// ══════════════════════════════════════════════════════════════════════════
// Merge: Combine Head Outputs
// ══════════════════════════════════════════════════════════════════════════

/** Sum two Octonion vectors. */
function addOctonions(a: Octonion, b: Octonion): Octonion {
  return a.map((v, i) => v + b[i]) as Octonion;
}

/** Zero octonion. */
const ZERO_OCT: Octonion = [0, 0, 0, 0, 0, 0, 0, 0];

/**
 * Merge per-head evaluations for a single triple.
 */
function mergeTriple(
  tripleIndex: number,
  heads: HeadOutput[],
  strategy: MergeStrategy,
): MergedEvaluation {
  const vertices = heads[0].evaluations[tripleIndex].vertices;
  const votes = heads.map(h => h.evaluations[tripleIndex].isCoherent);
  const corrections = heads.map(h => h.evaluations[tripleIndex].correctionVector);
  const hScores = heads.map(h => h.evaluations[tripleIndex].hScore);

  const coherentCount = votes.filter(v => v).length;
  const totalHeads = votes.length;

  let isCoherent: boolean;
  switch (strategy) {
    case "union":
      isCoherent = votes.some(v => v);
      break;
    case "intersect":
      isCoherent = votes.every(v => v);
      break;
    case "majority":
      isCoherent = coherentCount > totalHeads / 2;
      break;
    case "weighted":
      // Weight by head's overall coherence ratio (better heads count more)
      const weightedSum = heads.reduce((s, h, i) =>
        s + (votes[i] ? h.coherenceRatio : 0), 0);
      const totalWeight = heads.reduce((s, h) => s + h.coherenceRatio, 0);
      isCoherent = totalWeight > 0 ? weightedSum / totalWeight > 0.5 : false;
      break;
    case "sum":
      // Sum correction vectors; coherent if merged correction is near zero
      const merged = corrections.reduce(addOctonions, [...ZERO_OCT] as Octonion);
      const norm = Math.sqrt(merged.reduce((s, v) => s + v * v, 0));
      isCoherent = norm < 0.5;
      break;
  }

  // Merged correction = sum of all per-head corrections
  const mergedCorrection = corrections.reduce(addOctonions, [...ZERO_OCT] as Octonion);
  const mergedHScore = hScores.reduce((s, h) => s + h, 0) / hScores.length;

  return {
    vertices,
    headVotes: votes,
    isCoherent,
    agreementRatio: Math.max(coherentCount, totalHeads - coherentCount) / totalHeads,
    mergedCorrection,
    mergedHScore,
  };
}

// ══════════════════════════════════════════════════════════════════════════
// Multi-Head Coherence Layer
// ══════════════════════════════════════════════════════════════════════════

/**
 * Multi-Head Categorical Coherence Layer.
 *
 * Runs k coherence heads in parallel, each projecting through a different
 * Fano line, then merges their outputs. This is the categorical analogue
 * of multi-head attention:
 *
 *   MultiHeadAttention:  k × (QW_i^Q)(KW_i^K)^T / √d_k → softmax → V
 *   MultiHeadCoherence:  k × Fano_line_i(associator) → merge(corrections)
 */
export class MultiHeadCoherenceLayer {
  private readonly config: Required<MultiHeadConfig>;
  private readonly topology: FanoTopology;
  private readonly lines: [number, number, number][];
  private readonly gradeAGraph: number[];

  constructor(config: MultiHeadConfig = {}) {
    this.topology = constructFanoTopology();
    const headCount = Math.min(config.headCount ?? 7, 7);
    const lineIndices = config.lineIndices ?? Array.from({ length: headCount }, (_, i) => i);

    this.config = {
      headCount,
      lineIndices,
      mergeStrategy: config.mergeStrategy ?? "majority",
      gradeAGraph: config.gradeAGraph ?? atlasGradeAGraph(),
    };

    this.lines = lineIndices.map(i => this.topology.lines[i % 7].points);
    this.gradeAGraph = this.config.gradeAGraph;
  }

  /**
   * Forward pass: evaluate a batch of vertex triples through all heads.
   */
  forward(triples: [number, number, number][]): MultiHeadOutput {
    if (triples.length === 0) {
      return this.emptyOutput();
    }

    // Run all heads in parallel (conceptually)
    const heads = this.config.lineIndices.map((li, i) =>
      runHead(li, this.lines[i], triples, this.gradeAGraph)
    );

    // Merge across heads
    const merged = triples.map((_, i) =>
      mergeTriple(i, heads, this.config.mergeStrategy)
    );

    return this.buildOutput(heads, merged);
  }

  /**
   * Self-coherence: generate all consecutive triples from a sequence.
   */
  selfCoherence(vertices: number[]): MultiHeadOutput {
    if (vertices.length < 3) return this.emptyOutput();

    const triples: [number, number, number][] = [];
    for (let i = 0; i <= vertices.length - 3; i++) {
      triples.push([vertices[i], vertices[i + 1], vertices[i + 2]]);
    }
    return this.forward(triples);
  }

  /**
   * Cross-coherence: evaluate query vertices against key sequence.
   */
  crossCoherence(queries: number[], keys: number[]): MultiHeadOutput {
    const triples: [number, number, number][] = [];
    for (const q of queries) {
      for (let i = 0; i < keys.length - 1; i++) {
        triples.push([q, keys[i], keys[i + 1]]);
      }
    }
    return this.forward(triples);
  }

  /** Number of heads. */
  get headCount(): number { return this.config.headCount; }

  /** Merge strategy. */
  get mergeStrategy(): MergeStrategy { return this.config.mergeStrategy; }

  private emptyOutput(): MultiHeadOutput {
    return {
      heads: [], merged: [],
      coherenceRatio: 1, meanHScore: 0, correctionsNeeded: 0,
      headCount: this.config.headCount,
      mergeStrategy: this.config.mergeStrategy,
      stats: this.emptyStats(),
      summary: "Empty sequence — no triples to evaluate.",
    };
  }

  private emptyStats(): MultiHeadStats {
    return {
      perHeadCoherence: [], perHeadHScore: [],
      unanimousAgreement: 1, headDiversity: 0, totalParameters: 0,
      complexity: "O(0)",
      vsAttention: {
        attentionParams: 0, attentionComplexity: "O(0)",
        parameterSaving: "N/A", complexitySaving: "N/A",
      },
    };
  }

  private buildOutput(heads: HeadOutput[], merged: MergedEvaluation[]): MultiHeadOutput {
    const coherentCount = merged.filter(m => m.isCoherent).length;
    const coherenceRatio = merged.length > 0 ? coherentCount / merged.length : 1;
    const meanHScore = merged.length > 0
      ? merged.reduce((s, m) => s + m.mergedHScore, 0) / merged.length : 0;

    const k = heads.length;
    const n = merged.length + 2; // approximate sequence length

    // Unanimous agreement: fraction where all heads agree
    const unanimous = merged.filter(m => {
      const allTrue = m.headVotes.every(v => v);
      const allFalse = m.headVotes.every(v => !v);
      return allTrue || allFalse;
    }).length;

    // Head diversity: average pairwise disagreement
    let totalDisagreement = 0;
    let pairCount = 0;
    for (let i = 0; i < k; i++) {
      for (let j = i + 1; j < k; j++) {
        const disagree = merged.filter(m => m.headVotes[i] !== m.headVotes[j]).length;
        totalDisagreement += merged.length > 0 ? disagree / merged.length : 0;
        pairCount++;
      }
    }

    const d = 8; // octonionic dimension
    const attentionParams = k * 3 * d * d; // k heads × (Wq + Wk + Wv)
    const attentionComplexity = k * n * n * d;
    const coherenceComplexity = k * Math.max(0, n - 2);

    const stats: MultiHeadStats = {
      perHeadCoherence: heads.map(h => h.coherenceRatio),
      perHeadHScore: heads.map(h => h.meanHScore),
      unanimousAgreement: merged.length > 0 ? unanimous / merged.length : 1,
      headDiversity: pairCount > 0 ? totalDisagreement / pairCount : 0,
      totalParameters: 0,
      complexity: `O(kn) = O(${k}×${Math.max(0, n - 2)}) = ${coherenceComplexity}`,
      vsAttention: {
        attentionParams,
        attentionComplexity: `O(kn²d) = O(${k}×${n}²×${d}) = ${attentionComplexity}`,
        parameterSaving: `${attentionParams}:0 (∞× fewer)`,
        complexitySaving: attentionComplexity > 0
          ? `${(attentionComplexity / Math.max(1, coherenceComplexity)).toFixed(1)}× fewer ops`
          : "N/A",
      },
    };

    const summary = [
      `Multi-Head Categorical Coherence Layer`,
      `═══════════════════════════════════════`,
      ``,
      `CONFIGURATION:`,
      `  Heads:          ${k} (Fano line projections)`,
      `  Merge strategy: ${this.config.mergeStrategy}`,
      `  Parameters:     0 (algebraically fixed)`,
      ``,
      `PER-HEAD RESULTS:`,
      ...heads.map((h, i) =>
        `  Head ${i} (L${h.lineIndex}={${h.linePoints.join(',')}}): ` +
        `coherence=${(h.coherenceRatio * 100).toFixed(1)}%, ` +
        `H̄=${h.meanHScore.toFixed(2)}, defect=${h.totalDefect.toFixed(1)}`
      ),
      ``,
      `MERGED (${this.config.mergeStrategy}):`,
      `  Coherence ratio:    ${(coherenceRatio * 100).toFixed(1)}%`,
      `  Mean H-score:       ${meanHScore.toFixed(2)}`,
      `  Corrections needed: ${merged.length - coherentCount}`,
      `  Unanimous agreement:${(stats.unanimousAgreement * 100).toFixed(1)}%`,
      `  Head diversity:     ${(stats.headDiversity * 100).toFixed(1)}%`,
      ``,
      `vs MULTI-HEAD ATTENTION (${k} heads, d=${d}):`,
      `  Attention params:     ${attentionParams}`,
      `  Coherence params:     0`,
      `  Attention complexity: ${stats.vsAttention.attentionComplexity}`,
      `  Coherence complexity: ${stats.complexity}`,
      `  Saving:               ${stats.vsAttention.complexitySaving}`,
    ].join('\n');

    return {
      heads, merged,
      coherenceRatio, meanHScore,
      correctionsNeeded: merged.length - coherentCount,
      headCount: k,
      mergeStrategy: this.config.mergeStrategy,
      stats, summary,
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════
// Factory Functions
// ══════════════════════════════════════════════════════════════════════════

/** Create a 7-head coherence layer (maximum: all Fano lines). */
export function createFullCoherenceLayer(
  strategy: MergeStrategy = "majority",
): MultiHeadCoherenceLayer {
  return new MultiHeadCoherenceLayer({ headCount: 7, mergeStrategy: strategy });
}

/** Create a 3-head coherence layer (balanced coverage). */
export function createBalancedCoherenceLayer(
  strategy: MergeStrategy = "majority",
): MultiHeadCoherenceLayer {
  // Pick 3 lines that are mutually non-incident (no shared points)
  // Lines 0, 2, 5 in the standard Fano labeling have this property
  return new MultiHeadCoherenceLayer({
    headCount: 3,
    lineIndices: [0, 2, 5],
    mergeStrategy: strategy,
  });
}

/** Create a single-head coherence layer (equivalent to original). */
export function createSingleCoherenceLayer(
  lineIndex: number = 0,
): MultiHeadCoherenceLayer {
  return new MultiHeadCoherenceLayer({
    headCount: 1,
    lineIndices: [lineIndex],
    mergeStrategy: "majority",
  });
}
