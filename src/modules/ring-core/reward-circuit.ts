/**
 * Reward Circuit — The Basal Ganglia of Hologram
 * ═══════════════════════════════════════════════
 *
 * Every agent action produces a measurable reward signal derived from
 * three coherence dimensions:
 *
 *   reward = ΔH × limbicValence × epistemicBonus
 *
 * Where:
 *   ΔH            = coherence improvement (did the system become more coherent?)
 *   limbicValence  = emotional resonance (does it feel right?)
 *   epistemicBonus = knowledge quality (did the epistemic grade improve?)
 *
 * This is not a hand-crafted reward function — it's derived from the
 * same algebraic structure (R₈ = ℤ/256ℤ) that anchors the entire system.
 * The reward IS coherence improvement, measured across three orthogonal
 * dimensions that together span the full "felt quality" of a reasoning step.
 *
 * The circuit maintains a running EMA of reward, enabling the system to
 * detect reward trends (learning vs plateauing vs degrading) and feed
 * this signal back into the Prescience Engine and Strategy Scheduler.
 *
 * Pure functions. Zero side effects. Projection-ready.
 *
 * @module ring-core/reward-circuit
 */

// ── Types ──────────────────────────────────────────────────────────────

/** A snapshot of the coherence field at a moment in time. */
export interface CoherenceSnapshot {
  /** System H-score (0–1) */
  readonly h: number;
  /** Coherence gradient ∂H/∂t */
  readonly dh: number;
  /** Observer phi (attention intensity) */
  readonly phi: number;
  /** Coherence zone */
  readonly zone: string;
  /** Epistemic grade of the current output */
  readonly epistemicGrade: EpistemicGrade;
}

/** The reward signal produced by comparing two coherence snapshots. */
export interface RewardSignal {
  /** Raw coherence delta: h_after - h_before */
  readonly deltaH: number;
  /** Limbic valence at action time: tanh(∂H/∂t × 5) */
  readonly valence: number;
  /** Limbic arousal: phi */
  readonly arousal: number;
  /** Limbic dominance: zone mapping */
  readonly dominance: number;
  /** Epistemic grade transition: +1 improved, 0 same, -1 degraded */
  readonly gradeDelta: number;
  /** Epistemic bonus multiplier: 1.0 + 0.2 × gradeDelta */
  readonly epistemicBonus: number;
  /** The composite reward: ΔH × (1 + |valence|) × epistemicBonus */
  readonly reward: number;
  /** Running cumulative reward (if tracked) */
  readonly cumulative: number;
  /** Trend direction: 'rising' | 'stable' | 'falling' */
  readonly trend: RewardTrend;
}

export type EpistemicGrade = "A" | "B" | "C" | "D";
export type RewardTrend = "rising" | "stable" | "falling";

/** Persistent trace for database storage. */
export interface RewardTrace {
  readonly agentId: string;
  readonly sessionCid: string;
  readonly hBefore: number;
  readonly hAfter: number;
  readonly deltaH: number;
  readonly valence: number;
  readonly arousal: number;
  readonly dominance: number;
  readonly epistemicGrade: EpistemicGrade;
  readonly gradeDelta: number;
  readonly reward: number;
  readonly actionType: string;
  readonly actionLabel?: string;
  readonly cumulativeReward: number;
  readonly traceIndex: number;
}

// ── Constants ──────────────────────────────────────────────────────────

/** Grade ordering for computing grade deltas */
const GRADE_ORD: Record<EpistemicGrade, number> = { A: 3, B: 2, C: 1, D: 0 };

/** Zone → dominance mapping (shared with Limbic Lens) */
const ZONE_DOMINANCE: Record<string, number> = {
  COHERENCE: 0.85, CONVERGENT: 0.9, EXPLORING: 0.5,
  STABLE: 0.6, DIVERGENT: 0.15, CRITICAL: 0.05,
};

/** EMA smoothing for reward trend detection */
const REWARD_EMA_ALPHA = 0.2;

/** Trend thresholds */
const TREND_RISING = 0.01;
const TREND_FALLING = -0.01;

// ── Pure Functions ─────────────────────────────────────────────────────

/**
 * Compute the grade delta between two epistemic grades.
 * +1 = improvement, -1 = degradation, 0 = same.
 */
export function gradeDelta(before: EpistemicGrade, after: EpistemicGrade): number {
  const diff = GRADE_ORD[after] - GRADE_ORD[before];
  return diff > 0 ? 1 : diff < 0 ? -1 : 0;
}

/**
 * Compute the composite reward signal from before/after coherence snapshots.
 *
 * The reward formula:
 *   reward = ΔH × (1 + |valence|) × epistemicBonus
 *
 * Where:
 *   ΔH             = h_after - h_before
 *   valence         = tanh(∂H/∂t_after × 5)  — emotional polarity
 *   epistemicBonus  = 1.0 + 0.2 × gradeDelta  — grade improvement multiplier
 *
 * This ensures:
 *   - Positive ΔH with positive valence → strong positive reward
 *   - Negative ΔH with negative valence → strong negative reward
 *   - Grade improvement amplifies reward by 20%
 *   - Grade degradation dampens reward by 20%
 */
export function computeReward(
  before: CoherenceSnapshot,
  after: CoherenceSnapshot,
): Omit<RewardSignal, "cumulative" | "trend"> {
  const deltaH = after.h - before.h;
  const valence = Math.tanh(after.dh * 5);
  const arousal = Math.max(0, Math.min(1, after.phi));
  const dominance = ZONE_DOMINANCE[after.zone] ?? 0.5;
  const gd = gradeDelta(before.epistemicGrade, after.epistemicGrade);
  const epistemicBonus = 1.0 + 0.2 * gd;

  // Composite reward: coherence improvement amplified by emotional intensity and epistemic quality
  const reward = deltaH * (1 + Math.abs(valence)) * epistemicBonus;

  return { deltaH, valence, arousal, dominance, gradeDelta: gd, epistemicBonus, reward };
}

// ── Reward Accumulator ─────────────────────────────────────────────────

/**
 * RewardAccumulator — stateful reward tracking for a single agent.
 *
 * Maintains running statistics without allocating new objects per tick.
 * This is the "dopamine pathway" — it tracks whether the agent is
 * learning (rising rewards), plateauing (stable), or degrading (falling).
 */
export class RewardAccumulator {
  private cumulative = 0;
  private ema = 0;
  private count = 0;
  private lastReward = 0;

  /** Record a reward signal and return the full enriched signal. */
  record(raw: Omit<RewardSignal, "cumulative" | "trend">): RewardSignal {
    this.cumulative += raw.reward;
    this.ema = this.ema * (1 - REWARD_EMA_ALPHA) + raw.reward * REWARD_EMA_ALPHA;
    this.lastReward = raw.reward;
    this.count++;

    const trend: RewardTrend =
      this.ema > TREND_RISING ? "rising" :
      this.ema < TREND_FALLING ? "falling" : "stable";

    return { ...raw, cumulative: this.cumulative, trend };
  }

  /** Get current accumulator state. */
  stats(): { cumulative: number; ema: number; count: number; trend: RewardTrend } {
    return {
      cumulative: this.cumulative,
      ema: this.ema,
      count: this.count,
      trend: this.ema > TREND_RISING ? "rising" :
             this.ema < TREND_FALLING ? "falling" : "stable",
    };
  }

  /** Build a persistent trace record for database storage. */
  toTrace(
    agentId: string,
    sessionCid: string,
    signal: RewardSignal,
    actionType: string,
    hBefore: number,
    hAfter: number,
    actionLabel?: string,
  ): RewardTrace {
    return {
      agentId,
      sessionCid,
      hBefore,
      hAfter,
      deltaH: signal.deltaH,
      valence: signal.valence,
      arousal: signal.arousal,
      dominance: signal.dominance,
      epistemicGrade: "D", // Will be overridden by caller
      gradeDelta: signal.gradeDelta,
      reward: signal.reward,
      actionType,
      actionLabel,
      cumulativeReward: this.cumulative,
      traceIndex: this.count,
    };
  }

  /** Reset accumulator (e.g., new session). */
  reset(): void {
    this.cumulative = 0;
    this.ema = 0;
    this.count = 0;
    this.lastReward = 0;
  }
}

// ── Reward Projection ──────────────────────────────────────────────────

/**
 * RewardProjection — the kernel-visible view of the reward circuit.
 * This is what gets included in the ProjectionFrame, allowing the
 * surface adapter to render reward state without knowing internals.
 */
export interface RewardProjection {
  /** Current reward EMA (smoothed trend signal) */
  readonly ema: number;
  /** Cumulative reward this session */
  readonly cumulative: number;
  /** Total reward events recorded */
  readonly count: number;
  /** Current trend direction */
  readonly trend: RewardTrend;
  /** Last reward value */
  readonly lastReward: number;
  /** Temperature: how the reward trend should modulate exploration */
  readonly temperature: number;
}

/**
 * Project the reward accumulator into a kernel-readable structure.
 * The temperature field maps the reward trend to an explore/exploit
 * signal that the Prescience Engine can consume:
 *   rising rewards  → lower temperature → exploit (sharpen predictions)
 *   falling rewards → higher temperature → explore (widen predictions)
 */
export function projectReward(acc: RewardAccumulator): RewardProjection {
  const s = acc.stats();
  // Temperature: inverse of reward trend, clamped to [0.1, 2.0]
  // Rising rewards → temp < 1 (exploit); falling → temp > 1 (explore)
  const temperature = Math.max(0.1, Math.min(2.0, 1.0 - s.ema * 5));

  return {
    ema: s.ema,
    cumulative: s.cumulative,
    count: s.count,
    trend: s.trend,
    lastReward: s.ema, // Use EMA as smoothed "last reward"
    temperature,
  };
}
