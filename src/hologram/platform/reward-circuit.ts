/**
 * Reward Circuit — Internalized from ring-core
 * ═════════════════════════════════════════════
 *
 * The basal ganglia of Hologram. Every agent action produces a
 * measurable reward signal: reward = ΔH × limbicValence × epistemicBonus.
 *
 * Pure functions. Zero side effects. Zero external dependencies.
 *
 * @module hologram/platform/reward-circuit
 */

export interface CoherenceSnapshot {
  readonly h: number;
  readonly dh: number;
  readonly phi: number;
  readonly zone: string;
  readonly epistemicGrade: EpistemicGrade;
}

export interface RewardSignal {
  readonly deltaH: number;
  readonly valence: number;
  readonly arousal: number;
  readonly dominance: number;
  readonly gradeDelta: number;
  readonly epistemicBonus: number;
  readonly reward: number;
  readonly cumulative: number;
  readonly trend: RewardTrend;
}

export type EpistemicGrade = "A" | "B" | "C" | "D";
export type RewardTrend = "rising" | "stable" | "falling";

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

export interface RewardProjection {
  readonly ema: number;
  readonly cumulative: number;
  readonly count: number;
  readonly trend: RewardTrend;
  readonly lastReward: number;
  readonly temperature: number;
}

// ── Constants ──────────────────────────────────────────────────────────

const GRADE_ORD: Record<EpistemicGrade, number> = { A: 3, B: 2, C: 1, D: 0 };
const ZONE_DOMINANCE: Record<string, number> = {
  COHERENCE: 0.85, CONVERGENT: 0.9, EXPLORING: 0.5,
  STABLE: 0.6, DIVERGENT: 0.15, CRITICAL: 0.05,
};
const REWARD_EMA_ALPHA = 0.2;
const TREND_RISING = 0.01;
const TREND_FALLING = -0.01;

// ── Pure Functions ─────────────────────────────────────────────────────

export function gradeDelta(before: EpistemicGrade, after: EpistemicGrade): number {
  const diff = GRADE_ORD[after] - GRADE_ORD[before];
  return diff > 0 ? 1 : diff < 0 ? -1 : 0;
}

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
  const reward = deltaH * (1 + Math.abs(valence)) * epistemicBonus;
  return { deltaH, valence, arousal, dominance, gradeDelta: gd, epistemicBonus, reward };
}

export class RewardAccumulator {
  private cumulative = 0;
  private ema = 0;
  private count = 0;
  private lastReward = 0;

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

  stats(): { cumulative: number; ema: number; count: number; trend: RewardTrend } {
    return {
      cumulative: this.cumulative, ema: this.ema, count: this.count,
      trend: this.ema > TREND_RISING ? "rising" : this.ema < TREND_FALLING ? "falling" : "stable",
    };
  }

  toTrace(
    agentId: string, sessionCid: string, signal: RewardSignal,
    actionType: string, hBefore: number, hAfter: number, actionLabel?: string,
  ): RewardTrace {
    return {
      agentId, sessionCid, hBefore, hAfter,
      deltaH: signal.deltaH, valence: signal.valence, arousal: signal.arousal,
      dominance: signal.dominance, epistemicGrade: "D", gradeDelta: signal.gradeDelta,
      reward: signal.reward, actionType, actionLabel,
      cumulativeReward: this.cumulative, traceIndex: this.count,
    };
  }

  reset(): void {
    this.cumulative = 0; this.ema = 0; this.count = 0; this.lastReward = 0;
  }
}

export function projectReward(acc: RewardAccumulator): RewardProjection {
  const s = acc.stats();
  const temperature = Math.max(0.1, Math.min(2.0, 1.0 - s.ema * 5));
  return {
    ema: s.ema, cumulative: s.cumulative, count: s.count,
    trend: s.trend, lastReward: s.ema, temperature,
  };
}
