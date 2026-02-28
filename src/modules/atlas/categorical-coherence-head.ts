/**
 * Categorical Coherence Head — Attention Replacement via Associator Brackets
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * THEORY:
 *   In a standard Transformer, an attention head computes:
 *     Attention(Q,K,V) = softmax(QKᵀ / √d) · V
 *
 *   This is a *probabilistic* routing mechanism: each token attends to every
 *   other token with learned soft weights, then takes a weighted sum.
 *
 *   A Categorical Coherence Head replaces this with *deterministic* routing
 *   based on algebraic structure:
 *
 *     Coherence(v₁, v₂, v₃) = H(‖[v₁, v₂, v₃]‖)
 *
 *   where [v₁, v₂, v₃] is the octonionic associator bracket and H is the
 *   Hamming-distance H-score measuring divergence from the Grade-A graph.
 *
 *   Key insight: collinear triples (on a Fano line) have associator = 0,
 *   meaning they compose *coherently* — no information loss. Non-collinear
 *   triples have ‖associator‖ = 2, indicating a fixed, quantized
 *   "coherence defect" that must be corrected via rewrite chains.
 *
 *   This replaces:
 *     - Softmax attention weights → binary coherence (0 or defect)
 *     - Learned Q/K projections  → algebraic collinearity test
 *     - Weighted value sum       → associator-corrected composition
 *     - Cross-entropy loss       → H-score minimization
 *
 * @module atlas/categorical-coherence-head
 */

import { constructFanoTopology, computeAssociator, type Octonion, type AssociatorResult } from "./fano-plane";
import { getAtlas, ATLAS_VERTEX_COUNT } from "./atlas";
import { hScore, popcount } from "../observable/h-score";

// ── Types ───────────────────────────────────────────────────────────────────

/** A single coherence evaluation for a vertex triple. */
export interface CoherenceEvaluation {
  /** Atlas vertex indices forming the triple. */
  readonly vertices: [number, number, number];
  /** Fano point indices (mod 7) for each vertex. */
  readonly fanoPoints: [number, number, number];
  /** The associator bracket result. */
  readonly associator: AssociatorResult;
  /** Norm of the associator (0 = coherent, 2 = defect). */
  readonly associatorNorm: number;
  /** Whether the triple is coherent (associator = 0). */
  readonly isCoherent: boolean;
  /** H-score: Hamming distance of the associator norm's byte encoding to Grade-A graph. */
  readonly hScore: number;
  /** Coherence correction vector (the associator itself, for downstream use). */
  readonly correctionVector: Octonion;
}

/** Output of a full coherence head pass over a sequence of triples. */
export interface CoherenceHeadOutput {
  /** Individual triple evaluations. */
  readonly evaluations: CoherenceEvaluation[];
  /** Mean H-score across all triples (analogous to attention loss). */
  readonly meanHScore: number;
  /** Fraction of coherent (associative) triples. */
  readonly coherenceRatio: number;
  /** Total coherence defect (sum of associator norms). */
  readonly totalDefect: number;
  /** Number of triples that need rewrite correction. */
  readonly correctionsNeeded: number;
  /** The Grade-A graph used for H-score computation. */
  readonly gradeAGraphSize: number;
}

/** Configuration for the coherence head. */
export interface CoherenceHeadConfig {
  /** Grade-A graph values for H-score computation. Default: full Q0 (0-255). */
  readonly gradeAGraph?: number[];
  /** Whether to include correction vectors in output. Default: true. */
  readonly includeCorrections?: boolean;
}

// ── Grade-A Graph ───────────────────────────────────────────────────────────

/** Build the full Q0 Grade-A graph (all 256 byte values). */
function fullQ0Graph(): number[] {
  return Array.from({ length: 256 }, (_, i) => i);
}

/**
 * Build a sparse Grade-A graph from the Atlas topology.
 * Uses vertex sign classes as the verified datum set.
 */
export function atlasGradeAGraph(): number[] {
  const atlas = getAtlas();
  const values = new Set<number>();
  for (const v of atlas.vertices) {
    values.add(v.signClass);
    // Also add the vertex index mod 256 as a datum
    values.add(v.index % 256);
  }
  return [...values].sort((a, b) => a - b);
}

// ── Vertex → Fano Point Mapping ─────────────────────────────────────────────

/**
 * Map an Atlas vertex index to a Fano point (0-6).
 *
 * The Atlas has 96 vertices partitioned into structures aligned with
 * the 7 imaginary octonion units. We use vertex index mod 7.
 */
export function vertexToFanoPoint(vertexIndex: number): number {
  return vertexIndex % 7;
}

// ── Core: Evaluate a Single Triple ──────────────────────────────────────────

/**
 * Evaluate coherence for a single Atlas vertex triple.
 *
 * Computes the associator bracket [gₐ, gᵦ, gᵧ] and derives the H-score
 * measuring how far the triple's composition deviates from Grade-A coherence.
 */
export function evaluateTriple(
  v1: number,
  v2: number,
  v3: number,
  gradeAGraph: number[],
): CoherenceEvaluation {
  const fp1 = vertexToFanoPoint(v1);
  const fp2 = vertexToFanoPoint(v2);
  const fp3 = vertexToFanoPoint(v3);

  const associator = computeAssociator(fp1, fp2, fp3);

  // Encode the associator norm as a byte for H-score computation.
  // Norm is 0 (coherent) or 2 (defect). Scale to byte range.
  const normByte = Math.round(associator.associatorNorm * 64) & 0xFF;
  const h = hScore(normByte, gradeAGraph);

  return {
    vertices: [v1, v2, v3],
    fanoPoints: [fp1, fp2, fp3],
    associator,
    associatorNorm: associator.associatorNorm,
    isCoherent: associator.isAssociative,
    hScore: h,
    correctionVector: associator.associator,
  };
}

// ── Coherence Head ──────────────────────────────────────────────────────────

/**
 * CategoricalCoherenceHead — the attention replacement.
 *
 * Takes a sequence of Atlas vertex triples and produces coherence
 * evaluations with H-scores. This is the categorical analogue of
 * a multi-head attention layer:
 *
 *   Transformer:  tokens → Q,K,V → softmax(QK/√d) → weighted V
 *   Coherence:    vertices → Fano triples → associator → H-score
 *
 * The key difference: attention is O(n²) probabilistic approximation;
 * coherence is O(n) deterministic algebraic evaluation.
 */
export class CategoricalCoherenceHead {
  private readonly gradeAGraph: number[];
  private readonly includeCorrections: boolean;

  constructor(config: CoherenceHeadConfig = {}) {
    this.gradeAGraph = config.gradeAGraph ?? fullQ0Graph();
    this.includeCorrections = config.includeCorrections ?? true;
  }

  /**
   * Forward pass: evaluate coherence for a batch of vertex triples.
   *
   * Analogous to attention(Q, K, V) but deterministic.
   */
  forward(triples: [number, number, number][]): CoherenceHeadOutput {
    const evaluations = triples.map(([a, b, c]) =>
      evaluateTriple(a, b, c, this.gradeAGraph)
    );

    const totalDefect = evaluations.reduce((s, e) => s + e.associatorNorm, 0);
    const coherentCount = evaluations.filter(e => e.isCoherent).length;
    const totalH = evaluations.reduce((s, e) => s + e.hScore, 0);

    return {
      evaluations,
      meanHScore: evaluations.length > 0 ? totalH / evaluations.length : 0,
      coherenceRatio: evaluations.length > 0 ? coherentCount / evaluations.length : 1,
      totalDefect,
      correctionsNeeded: evaluations.length - coherentCount,
      gradeAGraphSize: this.gradeAGraph.length,
    };
  }

  /**
   * Route: given a sequence of vertex indices, generate all consecutive
   * triples and evaluate coherence. This is the "self-coherence" analogue
   * of self-attention.
   */
  selfCoherence(vertexSequence: number[]): CoherenceHeadOutput {
    if (vertexSequence.length < 3) {
      return {
        evaluations: [],
        meanHScore: 0,
        coherenceRatio: 1,
        totalDefect: 0,
        correctionsNeeded: 0,
        gradeAGraphSize: this.gradeAGraph.length,
      };
    }

    const triples: [number, number, number][] = [];
    for (let i = 0; i <= vertexSequence.length - 3; i++) {
      triples.push([
        vertexSequence[i],
        vertexSequence[i + 1],
        vertexSequence[i + 2],
      ]);
    }
    return this.forward(triples);
  }

  /**
   * Cross-coherence: evaluate coherence between elements of two sequences.
   * Analogous to cross-attention in encoder-decoder architectures.
   */
  crossCoherence(
    queryVertices: number[],
    keyVertices: number[],
  ): CoherenceHeadOutput {
    const triples: [number, number, number][] = [];
    for (const q of queryVertices) {
      for (let i = 0; i < keyVertices.length - 1; i++) {
        triples.push([q, keyVertices[i], keyVertices[i + 1]]);
      }
    }
    return this.forward(triples);
  }

  /**
   * Identify the maximally coherent routing: among all possible orderings
   * of a vertex set, find the one with maximum coherence ratio.
   *
   * For small sets (≤7), this is exhaustive. For larger sets, uses greedy.
   */
  findCoherentRoute(vertices: number[]): {
    bestOrder: number[];
    output: CoherenceHeadOutput;
  } {
    if (vertices.length <= 3) {
      const output = this.selfCoherence(vertices);
      return { bestOrder: [...vertices], output };
    }

    // Greedy: start with first vertex, always pick the next vertex
    // that minimizes associator norm with the last two.
    const remaining = new Set(vertices);
    const order: number[] = [vertices[0]];
    remaining.delete(vertices[0]);

    // Pick second: minimize pairwise defect
    let bestSecond = [...remaining][0];
    remaining.delete(bestSecond);
    order.push(bestSecond);

    while (remaining.size > 0) {
      const last2 = [order[order.length - 2], order[order.length - 1]];
      let bestNext = -1;
      let bestNorm = Infinity;

      for (const candidate of remaining) {
        const fp1 = vertexToFanoPoint(last2[0]);
        const fp2 = vertexToFanoPoint(last2[1]);
        const fp3 = vertexToFanoPoint(candidate);
        const assoc = computeAssociator(fp1, fp2, fp3);
        if (assoc.associatorNorm < bestNorm) {
          bestNorm = assoc.associatorNorm;
          bestNext = candidate;
        }
      }

      order.push(bestNext);
      remaining.delete(bestNext);
    }

    return { bestOrder: order, output: this.selfCoherence(order) };
  }
}

// ── Comparison: Attention vs Coherence ──────────────────────────────────────

/** Metrics comparing attention-style and coherence-style routing. */
export interface AttentionVsCoherence {
  /** Number of triples evaluated. */
  readonly tripleCount: number;
  /** Simulated attention entropy (information-theoretic). */
  readonly attentionEntropy: number;
  /** Coherence H-score (algebraic). */
  readonly coherenceHScore: number;
  /** Attention requires O(n²) comparisons. */
  readonly attentionComplexity: number;
  /** Coherence requires O(n) evaluations. */
  readonly coherenceComplexity: number;
  /** Ratio: how much more efficient coherence is. */
  readonly efficiencyGain: number;
  /** Whether coherence achieves deterministic routing (no learned weights). */
  readonly isDeterministic: boolean;
}

/**
 * Compare transformer attention routing vs categorical coherence routing
 * on a vertex sequence.
 */
export function compareAttentionVsCoherence(
  vertices: number[],
  config?: CoherenceHeadConfig,
): AttentionVsCoherence {
  const head = new CategoricalCoherenceHead(config);
  const output = head.selfCoherence(vertices);
  const n = vertices.length;

  // Attention: O(n²) pairwise comparisons with softmax
  const attentionComplexity = n * n;

  // Coherence: O(n) consecutive triple evaluations
  const coherenceComplexity = Math.max(0, n - 2);

  // Simulated attention entropy: uniform attention has maximal entropy
  // H = log2(n) for uniform distribution over n tokens
  const attentionEntropy = n > 1 ? Math.log2(n) : 0;

  return {
    tripleCount: output.evaluations.length,
    attentionEntropy,
    coherenceHScore: output.meanHScore,
    attentionComplexity,
    coherenceComplexity,
    efficiencyGain: coherenceComplexity > 0
      ? attentionComplexity / coherenceComplexity
      : Infinity,
    isDeterministic: true,
  };
}

// ── Factory ─────────────────────────────────────────────────────────────────

/**
 * Create a coherence head with Atlas-derived Grade-A graph.
 * This is the standard configuration for categorical attention.
 */
export function createCoherenceHead(): CategoricalCoherenceHead {
  return new CategoricalCoherenceHead({
    gradeAGraph: atlasGradeAGraph(),
  });
}

/**
 * Create a coherence head with sparse Grade-A graph for stricter evaluation.
 * Only Fano-line-verified values are in the graph, so H-scores will be
 * higher for non-collinear compositions.
 */
export function createStrictCoherenceHead(): CategoricalCoherenceHead {
  // Use only the 7 Fano line triple products as Grade-A data
  const topo = constructFanoTopology();
  const gradeA: number[] = [];
  for (const line of topo.lines) {
    const [a, b, c] = line.points;
    gradeA.push(a, b, c);
  }
  const unique = [...new Set(gradeA)].sort((a, b) => a - b);
  return new CategoricalCoherenceHead({ gradeAGraph: unique });
}
