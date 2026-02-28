/**
 * Prescience Engine — Coherence-Based Predictive Preloading
 * ══════════════════════════════════════════════════════════
 *
 * A resonance-based prediction system that learns user navigation
 * patterns through coherence observation rather than transformer
 * attention. The system monitors state transitions (panel opens,
 * desktop switches, widget interactions) and builds a transition
 * resonance matrix — a living map of how the user flows through
 * the system.
 *
 * Core principle: Coherence, not prediction.
 * ─────────────────────────────────────────
 * Instead of predicting what the user will do next (transformer
 * attention), we observe which transitions produce coherent flow
 * (low latency between intent and action, sustained engagement,
 * high H-scores during the session). Transitions that resonate
 * with the user's flow get amplified; those that don't, decay.
 *
 * The engine emits preload hints — panels or features that should
 * be pre-mounted to eliminate any perceptible delay, creating an
 * experience where the system feels like an extension of thought.
 *
 * Three layers:
 *   1. Transition Resonance — raw transition counts with coherence weighting
 *   2. Temporal Phase — time-of-session patterns (early/mid/deep flow)
 *   3. Flow Feedback — H-score at transition time amplifies/dampens weights
 *
 * Persistence: localStorage (hot) for instant boot, database (cold) for
 * cross-session learning.
 *
 * @module hologram-os/prescience-engine
 */

import type { PanelId, DesktopMode } from "./projection-engine";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

/** A state the user can be in — panel + desktop combo */
export type FlowState = `${PanelId}:${DesktopMode}`;

/** A single transition record with coherence weight */
interface TransitionEdge {
  /** Raw count of times this transition occurred */
  count: number;
  /** Coherence-weighted score — amplified when H-score is high at transition time */
  resonance: number;
  /** Last time this transition fired (epoch ms) */
  lastAt: number;
}

/** The full resonance matrix — maps source state → target state → edge */
type ResonanceMatrix = Record<string, Record<string, TransitionEdge>>;

/** Session phase — derived from time since boot */
type SessionPhase = "arrival" | "exploration" | "flow" | "deep";

/** Temporal pattern — transition weights bucketed by session phase */
type TemporalWeights = Record<SessionPhase, Record<string, Record<string, number>>>;

/** Preload hint emitted by the engine */
export interface PreloadHint {
  /** Panel to preload */
  panel: PanelId;
  /** Confidence (0–1) — normalized resonance score */
  confidence: number;
  /** Why this was predicted */
  reason: "resonance" | "temporal" | "sequence";
}

/** Persisted state */
interface PrescienceState {
  matrix: ResonanceMatrix;
  temporal: TemporalWeights;
  /** Recent transition sequence (last 8 for pattern detection) */
  recentSequence: string[];
  /** Total transitions observed */
  totalTransitions: number;
  /** Version for migration */
  version: number;
}

// ═══════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════

const STORAGE_KEY = "hologram:prescience";
const VERSION = 1;

/** Minimum confidence to emit a preload hint */
const PRELOAD_THRESHOLD = 0.15;

/** Maximum number of preload hints to emit at once */
const MAX_HINTS = 3;

/** Decay factor applied to resonance each session (prevents stale patterns) */
const SESSION_DECAY = 0.92;

/** How much H-score amplifies a transition (1.0 = no amplification) */
const COHERENCE_AMPLIFIER = 1.5;

/** Sequence length to track for pattern detection */
const SEQUENCE_LENGTH = 8;

/** Session phase boundaries (seconds since boot) */
const PHASE_BOUNDARIES: Record<SessionPhase, [number, number]> = {
  arrival:     [0, 30],
  exploration: [30, 180],
  flow:        [180, 600],
  deep:        [600, Infinity],
};

// ═══════════════════════════════════════════════════════════════════════
// Engine
// ═══════════════════════════════════════════════════════════════════════

export class PrescienceEngine {
  private state: PrescienceState;
  private bootTime: number = Date.now();
  private currentState: string = "none:image";
  private listeners: Set<(hints: PreloadHint[]) => void> = new Set();
  private lastHints: PreloadHint[] = [];

  constructor() {
    this.state = this.load();
    // Apply session decay to prevent stale patterns from dominating
    this.applySessionDecay();
  }

  // ── Public API ──────────────────────────────────────────────────────

  /**
   * Record a state transition. Called by the kernel on every panel
   * open/close and desktop switch.
   *
   * @param newState - The state being transitioned TO
   * @param hScore  - Current system coherence (0–1) at transition time
   */
  recordTransition(newState: string, hScore: number = 0.5): void {
    const from = this.currentState;
    const to = newState;

    if (from === to) return; // No self-loops

    // 1. Update resonance matrix
    if (!this.state.matrix[from]) this.state.matrix[from] = {};
    const edge = this.state.matrix[from][to] || { count: 0, resonance: 0, lastAt: 0 };

    edge.count += 1;
    // Coherence amplification: high H-score = this transition resonates with the user
    const amplification = 1 + (hScore - 0.5) * COHERENCE_AMPLIFIER;
    edge.resonance += Math.max(0.1, amplification);
    edge.lastAt = Date.now();
    this.state.matrix[from][to] = edge;

    // 2. Update temporal weights
    const phase = this.getSessionPhase();
    if (!this.state.temporal[phase]) this.state.temporal[phase] = {};
    if (!this.state.temporal[phase][from]) this.state.temporal[phase][from] = {};
    this.state.temporal[phase][from][to] = (this.state.temporal[phase][from]?.[to] || 0) + 1;

    // 3. Update sequence
    this.state.recentSequence.push(to);
    if (this.state.recentSequence.length > SEQUENCE_LENGTH) {
      this.state.recentSequence.shift();
    }

    this.state.totalTransitions += 1;
    this.currentState = to;

    // Persist and emit new hints
    this.save();
    this.emitHints();
  }

  /**
   * Get preload hints for the current state.
   * Returns panels ranked by predicted probability of being opened next.
   */
  getHints(): PreloadHint[] {
    return this.lastHints;
  }

  /**
   * Subscribe to hint updates. Called whenever the engine recalculates
   * predictions after a transition.
   */
  onHints(cb: (hints: PreloadHint[]) => void): () => void {
    this.listeners.add(cb);
    // Immediately emit current hints
    if (this.lastHints.length > 0) cb(this.lastHints);
    return () => { this.listeners.delete(cb); };
  }

  /** Set boot time for session phase calculation */
  setBootTime(t: number): void {
    this.bootTime = t;
  }

  /** Set current state without recording a transition (e.g., on boot) */
  setCurrentState(state: string): void {
    this.currentState = state;
    this.emitHints();
  }

  /** Get engine stats for dev tools */
  getStats() {
    const edges = Object.values(this.state.matrix).reduce(
      (sum, targets) => sum + Object.keys(targets).length, 0
    );
    return {
      totalTransitions: this.state.totalTransitions,
      uniqueEdges: edges,
      currentState: this.currentState,
      sessionPhase: this.getSessionPhase(),
      activeHints: this.lastHints.length,
    };
  }

  // ── Internal ────────────────────────────────────────────────────────

  private emitHints(): void {
    const hints = this.computeHints();
    this.lastHints = hints;
    for (const cb of this.listeners) cb(hints);
  }

  private computeHints(): PreloadHint[] {
    const from = this.currentState;
    const candidates: Map<string, { score: number; reason: PreloadHint["reason"] }> = new Map();

    // Layer 1: Resonance matrix — direct transition probabilities
    const edges = this.state.matrix[from];
    if (edges) {
      const totalResonance = Object.values(edges).reduce((s, e) => s + e.resonance, 0);
      if (totalResonance > 0) {
        for (const [target, edge] of Object.entries(edges)) {
          const normalized = edge.resonance / totalResonance;
          candidates.set(target, { score: normalized, reason: "resonance" });
        }
      }
    }

    // Layer 2: Temporal phase weighting — what do users do at this point in session?
    const phase = this.getSessionPhase();
    const phaseEdges = this.state.temporal[phase]?.[from];
    if (phaseEdges) {
      const phaseTotal = Object.values(phaseEdges).reduce((s, v) => s + v, 0);
      if (phaseTotal > 0) {
        for (const [target, count] of Object.entries(phaseEdges)) {
          const phaseScore = count / phaseTotal;
          const existing = candidates.get(target);
          if (existing) {
            // Blend: 70% resonance, 30% temporal
            existing.score = existing.score * 0.7 + phaseScore * 0.3;
          } else {
            candidates.set(target, { score: phaseScore * 0.3, reason: "temporal" });
          }
        }
      }
    }

    // Layer 3: Sequence pattern — look for repeating subsequences
    const seq = this.state.recentSequence;
    if (seq.length >= 2) {
      const lastTwo = seq.slice(-2).join("→");
      // Scan history for this bigram and predict what follows
      for (let i = 0; i < seq.length - 2; i++) {
        const bigram = `${seq[i]}→${seq[i + 1]}`;
        if (bigram === lastTwo && i + 2 < seq.length) {
          const predicted = seq[i + 2];
          const existing = candidates.get(predicted);
          const bonus = 0.2;
          if (existing) {
            existing.score = Math.min(1, existing.score + bonus);
          } else {
            candidates.set(predicted, { score: bonus, reason: "sequence" });
          }
        }
      }
    }

    // Filter and rank
    return Array.from(candidates.entries())
      .filter(([target, { score }]) => {
        // Only emit hints for panels (not the current state)
        if (target === from) return false;
        if (score < PRELOAD_THRESHOLD) return false;
        // Extract panel ID from flow state
        const panel = target.split(":")[0];
        return panel !== "none"; // Don't preload "none" (home)
      })
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, MAX_HINTS)
      .map(([target, { score, reason }]) => ({
        panel: target.split(":")[0] as PanelId,
        confidence: Math.round(score * 100) / 100,
        reason,
      }));
  }

  private getSessionPhase(): SessionPhase {
    const elapsed = (Date.now() - this.bootTime) / 1000;
    for (const [phase, [min, max]] of Object.entries(PHASE_BOUNDARIES) as [SessionPhase, [number, number]][]) {
      if (elapsed >= min && elapsed < max) return phase;
    }
    return "deep";
  }

  private applySessionDecay(): void {
    for (const fromEdges of Object.values(this.state.matrix)) {
      for (const edge of Object.values(fromEdges)) {
        edge.resonance *= SESSION_DECAY;
      }
    }
    // Prune edges with negligible resonance
    for (const [from, targets] of Object.entries(this.state.matrix)) {
      for (const [to, edge] of Object.entries(targets)) {
        if (edge.resonance < 0.01 && edge.count < 2) {
          delete targets[to];
        }
      }
      if (Object.keys(targets).length === 0) delete this.state.matrix[from];
    }
  }

  // ── Persistence ─────────────────────────────────────────────────────

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch { /* quota exceeded — non-critical */ }
  }

  private load(): PrescienceState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PrescienceState;
        if (parsed.version === VERSION) return parsed;
      }
    } catch { /* corrupted — start fresh */ }
    return {
      matrix: {},
      temporal: { arrival: {}, exploration: {}, flow: {}, deep: {} },
      recentSequence: [],
      totalTransitions: 0,
      version: VERSION,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════════════════

let _instance: PrescienceEngine | null = null;

export function getPrescienceEngine(): PrescienceEngine {
  if (!_instance) _instance = new PrescienceEngine();
  return _instance;
}
