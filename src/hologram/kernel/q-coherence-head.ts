/**
 * Q-CoherenceHead — Quantum-AI Readiness Interface
 * ══════════════════════════════════════════════════
 *
 * Defines the CoherenceHead trait: the interface boundary where
 * transformer attention (softmax(QK^T/√d_k)V) will be replaced
 * by deterministic coherence-wave attention.
 *
 * This is the mathematical bridge from classical UI to quantum-coherent UI.
 * Agents implement this trait to produce CoherenceVectors from context,
 * enabling the kernel to optimize for human coherence rather than
 * predictive confidence.
 *
 * Architecture:
 *   Classical: softmax(QK^T/√d_k) × V → probabilistic attention
 *   Quantum:   observe(context) → CoherenceVector → deterministic coherence
 *
 * @module qkernel/q-coherence-head
 */

import { classifyZone, type CoherenceZone } from "./q-sched";

// ═══════════════════════════════════════════════════════════════════════
// Coherence Vector — the output of a coherence head
// ═══════════════════════════════════════════════════════════════════════

/**
 * CoherenceVector — replaces the attention weight distribution.
 * Instead of a probability distribution over tokens, this is a
 * deterministic coherence field over the observation space.
 */
export interface CoherenceVector {
  /** Per-dimension coherence values (replaces attention weights) */
  readonly values: readonly number[];
  /** Overall coherence magnitude (replaces attention sum) */
  readonly magnitude: number;
  /** Coherence zone classification */
  readonly zone: CoherenceZone;
  /** Phase of the coherence oscillation (0–2π) */
  readonly phase: number;
  /** Gradient: direction of coherence change */
  readonly gradient: number;
}

/**
 * CoherenceHead — the trait that agents implement to replace
 * transformer attention with coherence-wave attention.
 *
 * Each head observes a specific modality of the projection context
 * and produces a CoherenceVector that the kernel uses for scheduling,
 * rendering priority, and future quantum-AI optimization.
 */
export interface CoherenceHead {
  /** Unique identifier for this head */
  readonly headId: string;
  /** Modality this head observes (e.g., "visual", "semantic", "temporal") */
  readonly modality: string;
  /** Dimensionality of the coherence vector */
  readonly dimensions: number;

  /**
   * Observe context and produce a CoherenceVector.
   * This is the core operation — replaces softmax(QK^T/√d_k)V.
   *
   * @param context - Observable state to evaluate
   * @returns CoherenceVector — deterministic coherence measurement
   */
  observe(context: CoherenceContext): CoherenceVector;

  /**
   * Get the head's current H-score contribution.
   * Used by the kernel to weight this head's influence on scheduling.
   */
  hScore(): number;
}

/**
 * CoherenceContext — the observation space for a coherence head.
 * Replaces the (Q, K, V) matrices of transformer attention.
 */
export interface CoherenceContext {
  /** Current system H-score */
  readonly systemH: number;
  /** Coherence gradient (∂H/∂t) */
  readonly gradient: number;
  /** Observation values — the "input" to the head */
  readonly observations: readonly number[];
  /** Timestamp of observation */
  readonly timestamp: number;
  /** Agent ID producing this context */
  readonly agentId: string;
}

// ═══════════════════════════════════════════════════════════════════════
// Default Coherence Head — Hamming-distance based (existing H-score)
// ═══════════════════════════════════════════════════════════════════════

/**
 * HammingCoherenceHead — the default coherence head that maps
 * the existing H-score (Hamming distance) infrastructure to the
 * CoherenceHead trait. This is the backward-compatible bridge.
 */
export class HammingCoherenceHead implements CoherenceHead {
  readonly headId: string;
  readonly modality: string;
  readonly dimensions: number;
  private currentH = 0.5;
  private ema = 0;
  private phase = 0;

  constructor(headId: string, modality: string, dimensions = 8) {
    this.headId = headId;
    this.modality = modality;
    this.dimensions = dimensions;
  }

  observe(context: CoherenceContext): CoherenceVector {
    // Update EMA of H-score
    const alpha = 0.2;
    this.currentH = this.currentH * (1 - alpha) + context.systemH * alpha;
    this.ema = this.ema * (1 - alpha) + context.gradient * alpha;
    this.phase = (this.phase + 0.1 * (1 + Math.abs(this.ema))) % (2 * Math.PI);

    // Generate coherence vector — distribute H-score across dimensions
    // Each dimension represents a different "frequency" of coherence
    const values: number[] = [];
    for (let d = 0; d < this.dimensions; d++) {
      const freq = (d + 1) / this.dimensions;
      const coherence = this.currentH * Math.cos(this.phase * freq + d * Math.PI / 4);
      values.push(Math.max(0, Math.min(1, 0.5 + coherence * 0.5)));
    }

    const magnitude = Math.sqrt(values.reduce((s, v) => s + v * v, 0) / values.length);

    return {
      values,
      magnitude,
      zone: classifyZone(this.currentH),
      phase: this.phase,
      gradient: this.ema,
    };
  }

  hScore(): number {
    return this.currentH;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Multi-Head Coherence Attention — replaces Multi-Head Self-Attention
// ═══════════════════════════════════════════════════════════════════════

/**
 * MultiHeadCoherence — manages multiple CoherenceHeads for an agent.
 * This is the Q-Linux equivalent of Multi-Head Self-Attention (MHSA)
 * in transformers, but optimizes for coherence instead of prediction.
 *
 * Complexity: O(n × d) vs transformer's O(n² × d)
 * where n = observation count, d = dimensions per head
 */
export class MultiHeadCoherence {
  private heads: CoherenceHead[] = [];

  addHead(head: CoherenceHead): void {
    this.heads.push(head);
  }

  removeHead(headId: string): void {
    this.heads = this.heads.filter(h => h.headId !== headId);
  }

  /**
   * Run all heads on the same context and produce a merged CoherenceVector.
   * Merging is done by coherence-weighted averaging (not concatenation
   * like in transformers — we want a single coherence signal).
   */
  observe(context: CoherenceContext): CoherenceVector {
    if (this.heads.length === 0) {
      return { values: [], magnitude: 0, zone: "divergent", phase: 0, gradient: 0 };
    }

    const results = this.heads.map(h => ({
      vector: h.observe(context),
      weight: h.hScore(),
    }));

    // Coherence-weighted merge
    const totalWeight = results.reduce((s, r) => s + r.weight, 0) || 1;
    const maxDims = Math.max(...results.map(r => r.vector.values.length));
    const merged: number[] = new Array(maxDims).fill(0);

    for (const { vector, weight } of results) {
      const w = weight / totalWeight;
      for (let d = 0; d < vector.values.length; d++) {
        merged[d] += vector.values[d] * w;
      }
    }

    const magnitude = Math.sqrt(merged.reduce((s, v) => s + v * v, 0) / merged.length);
    const avgPhase = results.reduce((s, r) => s + r.vector.phase * r.weight, 0) / totalWeight;
    const avgGradient = results.reduce((s, r) => s + r.vector.gradient * r.weight, 0) / totalWeight;
    const avgH = results.reduce((s, r) => s + r.weight, 0) / results.length;

    return {
      values: merged,
      magnitude,
      zone: classifyZone(avgH),
      phase: avgPhase,
      gradient: avgGradient,
    };
  }

  /** Get aggregate H-score across all heads */
  hScore(): number {
    if (this.heads.length === 0) return 0;
    return this.heads.reduce((s, h) => s + h.hScore(), 0) / this.heads.length;
  }

  /** Get per-head diagnostics */
  stats(): Array<{ headId: string; modality: string; hScore: number }> {
    return this.heads.map(h => ({
      headId: h.headId,
      modality: h.modality,
      hScore: h.hScore(),
    }));
  }
}
