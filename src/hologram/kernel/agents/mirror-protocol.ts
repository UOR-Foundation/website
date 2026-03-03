/**
 * Mirror Coherence Protocol — Phase 6 (Mirror Neurons)
 * ═════════════════════════════════════════════════════
 *
 * Enables agent-to-agent coherence modeling. Each agent projects its
 * CoherenceVector to neighbors; receiving agents model the sender's
 * state and measure prediction error. Low prediction error → high
 * empathy → collaborative habit sharing.
 *
 * Architecture (modeled on mirror neuron systems):
 *
 *   AgentA.CoherenceVector → MirrorBond → AgentB.predictedVector
 *     ↓
 *   PredictionError = ||actual - predicted|| → EmpathyScore
 *     ↓
 *   High empathy → SharedHabitPool (collaborative acceleration)
 *
 * @module hologram/kernel/mirror-protocol
 */

import type { CoherenceVector, CoherenceContext } from "../compute/q-coherence-head";
import { classifyZone, type CoherenceZone } from "../compute/q-sched";
import type { Habit, HabitResult } from "./procedural-memory";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

/** A coherence observation from a neighboring agent */
export interface MirrorObservation {
  readonly sourceAgentId: string;
  readonly targetAgentId: string;
  readonly observedVector: CoherenceVector;
  readonly predictedVector: CoherenceVector;
  readonly predictionError: number;
  readonly timestamp: number;
}

/** A bond between two agents measuring their mutual coherence modeling */
export interface MirrorBond {
  readonly agentA: string;
  readonly agentB: string;
  /** Empathy = 1 / (1 + avgPredictionError). Range (0, 1] */
  empathyScore: number;
  /** Running average of prediction error */
  avgPredictionError: number;
  /** Total observations in this bond */
  observationCount: number;
  /** Shared habits (habit IDs transferred through this bond) */
  sharedHabitIds: string[];
  /** When the bond was formed */
  readonly createdAt: number;
  /** Last observation timestamp */
  lastObservedAt: number;
}

/** A habit shared through a mirror bond */
export interface SharedHabit {
  readonly habitId: string;
  readonly sourceAgent: string;
  readonly targetAgent: string;
  readonly bondEmpathy: number;
  readonly sharedAt: number;
  readonly habit: Habit;
}

/** Projection state visible in the kernel frame */
export interface MirrorProjection {
  /** Total mirror bonds */
  readonly bondCount: number;
  /** Active bonds (observed within last 30s) */
  readonly activeBonds: number;
  /** Mean empathy across all bonds */
  readonly meanEmpathy: number;
  /** Total shared habits across all bonds */
  readonly totalSharedHabits: number;
  /** Top bonds for visualization */
  readonly topBonds: readonly MirrorBondEntry[];
  /** Whether collaborative learning is active */
  readonly collaborativeMode: boolean;
  /** Network coherence: mean of all agent H-scores weighted by empathy */
  readonly networkCoherence: number;
}

/** Entry for the mirror web visualization */
export interface MirrorBondEntry {
  readonly agentA: string;
  readonly agentB: string;
  readonly empathy: number;
  readonly observations: number;
  readonly sharedHabits: number;
  readonly active: boolean;
  /** Bond strength for visualization (line width) */
  readonly strength: number;
}

// ═══════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════

/** Minimum empathy threshold for habit sharing */
const SHARING_THRESHOLD = 0.6;

/** EMA smoothing factor for prediction error */
const ERROR_EMA_ALPHA = 0.2;

/** Maximum bonds to track */
const MAX_BONDS = 64;

/** Bond staleness threshold (ms) */
const STALE_THRESHOLD_MS = 30_000;

/** Top bonds shown in visualization */
const VIS_TOP_N = 8;

/** Default vector dimension when none available */
const DEFAULT_DIM = 8;

// ═══════════════════════════════════════════════════════════════════════
// Mirror Agent — per-agent coherence predictor
// ═══════════════════════════════════════════════════════════════════════

/**
 * MirrorAgent maintains a predictive model of another agent's coherence.
 * Uses a simple exponentially-weighted linear model:
 *   predicted[t+1] = ema(observed[t]) + gradient * dt
 */
class MirrorAgent {
  readonly targetId: string;
  private emaVector: number[] = [];
  private gradientVector: number[] = [];
  private lastObserved: CoherenceVector | null = null;
  private observationCount = 0;

  constructor(targetId: string, dimensions: number) {
    this.targetId = targetId;
    this.emaVector = new Array(dimensions).fill(0.5);
    this.gradientVector = new Array(dimensions).fill(0);
  }

  /** Observe an actual coherence vector and update the predictive model */
  observe(actual: CoherenceVector): { predicted: CoherenceVector; error: number } {
    const predicted = this.predict();
    
    // Compute prediction error (L2 norm)
    const dim = Math.min(actual.values.length, this.emaVector.length);
    let errorSum = 0;
    for (let i = 0; i < dim; i++) {
      const diff = actual.values[i] - (predicted.values[i] ?? 0.5);
      errorSum += diff * diff;
    }
    const error = Math.sqrt(errorSum / Math.max(1, dim));

    // Update EMA model
    const alpha = ERROR_EMA_ALPHA;
    for (let i = 0; i < dim; i++) {
      const prev = this.emaVector[i];
      this.emaVector[i] = prev * (1 - alpha) + actual.values[i] * alpha;
      // Gradient = smoothed rate of change
      if (this.lastObserved) {
        const delta = actual.values[i] - (this.lastObserved.values[i] ?? 0);
        this.gradientVector[i] = this.gradientVector[i] * (1 - alpha) + delta * alpha;
      }
    }

    this.lastObserved = actual;
    this.observationCount++;

    return { predicted, error };
  }

  /** Predict the target agent's next coherence vector */
  predict(): CoherenceVector {
    const values = this.emaVector.map((v, i) => {
      const grad = this.gradientVector[i] ?? 0;
      return Math.max(0, Math.min(1, v + grad));
    });
    const magnitude = Math.sqrt(
      values.reduce((s, v) => s + v * v, 0) / Math.max(1, values.length)
    );
    const avgH = values.reduce((s, v) => s + v, 0) / Math.max(1, values.length);
    return {
      values,
      magnitude,
      zone: classifyZone(avgH),
      phase: 0,
      gradient: this.gradientVector.reduce((s, g) => s + g, 0) / Math.max(1, this.gradientVector.length),
    };
  }

  get count() { return this.observationCount; }
}

// ═══════════════════════════════════════════════════════════════════════
// Mirror Protocol Engine
// ═══════════════════════════════════════════════════════════════════════

export class MirrorProtocolEngine {
  private bonds = new Map<string, MirrorBond>();
  private mirrors = new Map<string, MirrorAgent>(); // key: `selfId→targetId`
  private agentHScores = new Map<string, number>();
  private sharedHabits: SharedHabit[] = [];
  private selfId = "kernel:root";

  /** Set this agent's identity */
  setSelfId(id: string): void {
    this.selfId = id;
  }

  /**
   * Observe a neighbor agent's coherence vector.
   * Updates the predictive model and empathy score.
   */
  observeNeighbor(
    neighborId: string,
    actualVector: CoherenceVector,
    neighborH: number,
  ): MirrorObservation {
    this.agentHScores.set(neighborId, neighborH);

    // Get or create mirror model
    const mirrorKey = `${this.selfId}→${neighborId}`;
    let mirror = this.mirrors.get(mirrorKey);
    if (!mirror) {
      const dim = actualVector.values.length || DEFAULT_DIM;
      mirror = new MirrorAgent(neighborId, dim);
      this.mirrors.set(mirrorKey, mirror);
    }

    // Observe and get prediction error
    const { predicted, error } = mirror.observe(actualVector);

    // Update or create bond
    const bondKey = [this.selfId, neighborId].sort().join("↔");
    let bond = this.bonds.get(bondKey);
    if (!bond) {
      if (this.bonds.size >= MAX_BONDS) {
        // Evict stalest bond
        let stalestKey = "";
        let stalestTime = Infinity;
        for (const [k, b] of this.bonds) {
          if (b.lastObservedAt < stalestTime) {
            stalestTime = b.lastObservedAt;
            stalestKey = k;
          }
        }
        if (stalestKey) {
          this.bonds.delete(stalestKey);
        }
      }
      bond = {
        agentA: this.selfId,
        agentB: neighborId,
        empathyScore: 0.5,
        avgPredictionError: error,
        observationCount: 0,
        sharedHabitIds: [],
        createdAt: Date.now(),
        lastObservedAt: Date.now(),
      };
      this.bonds.set(bondKey, bond);
    }

    // Update bond statistics
    bond.observationCount++;
    bond.avgPredictionError =
      bond.avgPredictionError * (1 - ERROR_EMA_ALPHA) + error * ERROR_EMA_ALPHA;
    bond.empathyScore = 1 / (1 + bond.avgPredictionError);
    bond.lastObservedAt = Date.now();

    return {
      sourceAgentId: neighborId,
      targetAgentId: this.selfId,
      observedVector: actualVector,
      predictedVector: predicted,
      predictionError: error,
      timestamp: Date.now(),
    };
  }

  /**
   * Share a habit through a high-empathy bond.
   * Returns true if the habit was successfully shared.
   */
  shareHabit(
    targetAgentId: string,
    habit: Habit,
  ): SharedHabit | null {
    const bondKey = [this.selfId, targetAgentId].sort().join("↔");
    const bond = this.bonds.get(bondKey);

    if (!bond || bond.empathyScore < SHARING_THRESHOLD) {
      return null; // Bond too weak for habit sharing
    }

    // Don't share duplicates
    if (bond.sharedHabitIds.includes(habit.id)) return null;

    const shared: SharedHabit = {
      habitId: habit.id,
      sourceAgent: this.selfId,
      targetAgent: targetAgentId,
      bondEmpathy: bond.empathyScore,
      sharedAt: Date.now(),
      habit,
    };

    bond.sharedHabitIds.push(habit.id);
    this.sharedHabits.push(shared);

    return shared;
  }

  /**
   * Get all habits shared to this agent through high-empathy bonds.
   */
  getReceivedHabits(): readonly SharedHabit[] {
    return this.sharedHabits.filter(sh => sh.targetAgent === this.selfId);
  }

  /**
   * Get empathy score between two agents.
   */
  getEmpathy(agentA: string, agentB: string): number {
    const bondKey = [agentA, agentB].sort().join("↔");
    return this.bonds.get(bondKey)?.empathyScore ?? 0;
  }

  /**
   * Project mirror protocol state into a kernel-readable structure.
   */
  project(): MirrorProjection {
    const now = Date.now();
    const allBonds = Array.from(this.bonds.values());
    const activeBonds = allBonds.filter(
      b => now - b.lastObservedAt < STALE_THRESHOLD_MS
    );

    const meanEmpathy = allBonds.length > 0
      ? allBonds.reduce((s, b) => s + b.empathyScore, 0) / allBonds.length
      : 0;

    const totalSharedHabits = allBonds.reduce(
      (s, b) => s + b.sharedHabitIds.length, 0
    );

    // Top bonds by empathy
    const sorted = [...allBonds].sort((a, b) => b.empathyScore - a.empathyScore);
    const topN = sorted.slice(0, VIS_TOP_N);
    const maxObs = Math.max(1, ...topN.map(b => b.observationCount));

    const topBonds: MirrorBondEntry[] = topN.map(b => ({
      agentA: b.agentA,
      agentB: b.agentB,
      empathy: b.empathyScore,
      observations: b.observationCount,
      sharedHabits: b.sharedHabitIds.length,
      active: now - b.lastObservedAt < STALE_THRESHOLD_MS,
      strength: b.observationCount / maxObs,
    }));

    // Network coherence: empathy-weighted mean of agent H-scores
    let weightedH = 0;
    let totalWeight = 0;
    for (const bond of activeBonds) {
      const hA = this.agentHScores.get(bond.agentA) ?? 0.5;
      const hB = this.agentHScores.get(bond.agentB) ?? 0.5;
      const w = bond.empathyScore;
      weightedH += (hA + hB) / 2 * w;
      totalWeight += w;
    }
    const networkCoherence = totalWeight > 0 ? weightedH / totalWeight : 0;

    return {
      bondCount: allBonds.length,
      activeBonds: activeBonds.length,
      meanEmpathy,
      totalSharedHabits,
      topBonds,
      collaborativeMode: activeBonds.some(b => b.empathyScore >= SHARING_THRESHOLD),
      networkCoherence,
    };
  }

  /** Get all bonds (for dev tools) */
  getBonds(): readonly MirrorBond[] {
    return Array.from(this.bonds.values());
  }

  /** Reset */
  reset(): void {
    this.bonds.clear();
    this.mirrors.clear();
    this.agentHScores.clear();
    this.sharedHabits = [];
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════════════════

let _instance: MirrorProtocolEngine | null = null;

export function getMirrorProtocol(): MirrorProtocolEngine {
  if (!_instance) {
    _instance = new MirrorProtocolEngine();
  }
  return _instance;
}
