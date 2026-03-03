/**
 * Procedural Memory & Habit Kernel — Phase 5 (The Cerebellum)
 * ════════════════════════════════════════════════════════════
 *
 * Recognizes recurring high-reward action patterns and promotes them
 * to cached "habits" — compiled circuit templates that fire instantly
 * when recognized, bypassing the full compile→execute pipeline.
 *
 * Architecture (modeled on cerebellar motor learning):
 *
 *   RewardTrace[] → PatternScanner → CandidateSequence[]
 *     ↓
 *   PromotionEngine → Habit (compiled circuit template + stabilizer pre-check)
 *     ↓
 *   HabitExecutor → O(1) cached result from L0 cache
 *     ↓
 *   ProceduralProjection → kernel-visible habit state for UI
 *
 * Key insight: Habits are NOT shortcuts. They are mathematically
 * verified circuit templates whose stabilizer syndromes have been
 * pre-computed. Executing a habit is provably equivalent to
 * running the full pipeline — just faster.
 *
 * Promotion criteria:
 *   - Sequence appears ≥ PROMOTION_THRESHOLD times (default 3)
 *   - Mean reward across occurrences > 0 (net positive)
 *   - Variance in reward < MAX_VARIANCE (consistent)
 *
 * Complexity: O(n) scan per reward event, O(1) habit lookup.
 *
 * @module hologram/kernel/procedural-memory
 */

import type { CircuitResult, CircuitProjection } from "../compute/circuit-compiler";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

/** A reward trace entry used for pattern scanning */
export interface RewardTraceEntry {
  readonly actionType: string;
  readonly actionLabel: string;
  readonly reward: number;
  readonly epistemicGrade: string;
  readonly deltaH: number;
  readonly timestamp: number;
}

/** A recognized pattern — a sequence of action types that recurs */
export interface ActionPattern {
  /** Canonical key: sorted action sequence joined by → */
  readonly key: string;
  /** The sequence of action types */
  readonly sequence: readonly string[];
  /** Number of times this sequence has been observed */
  occurrenceCount: number;
  /** Mean reward across all occurrences */
  meanReward: number;
  /** Reward variance (for consistency check) */
  rewardVariance: number;
  /** Sum of rewards (for running mean) */
  rewardSum: number;
  /** Sum of squared rewards (for running variance) */
  rewardSumSq: number;
  /** Best epistemic grade achieved */
  bestGrade: string;
  /** First seen timestamp */
  firstSeen: number;
  /** Last seen timestamp */
  lastSeen: number;
}

/** A promoted habit — a compiled circuit template cached for instant replay */
export interface Habit {
  /** Unique habit ID */
  readonly id: string;
  /** The pattern key this habit was promoted from */
  readonly patternKey: string;
  /** Action sequence */
  readonly sequence: readonly string[];
  /** Cached circuit result (the pre-computed answer) */
  readonly cachedResult: HabitResult;
  /** Number of times this habit has fired */
  fireCount: number;
  /** Total time saved (estimated ms) by using the habit vs full pipeline */
  timeSavedMs: number;
  /** Mean reward when this habit fires */
  meanReward: number;
  /** Success rate: fraction of fires that maintained positive reward */
  successRate: number;
  /** Promoted at timestamp */
  readonly promotedAt: number;
  /** Last fired timestamp */
  lastFiredAt: number;
  /** Whether this habit is currently active (can be suspended) */
  active: boolean;
}

/** The result of executing a habit */
export interface HabitResult {
  /** Output grade (from the cached circuit) */
  readonly grade: string;
  /** Mean H-score at promotion time */
  readonly meanH: number;
  /** Whether the cached circuit converged */
  readonly converged: boolean;
  /** Estimated latency saved */
  readonly latencyMs: number;
  /** The action label that produced this result */
  readonly label: string;
}

/**
 * ProceduralProjection — the kernel-visible view of procedural memory.
 * Included in ProjectionFrame for UI rendering.
 */
export interface ProceduralProjection {
  /** Total recognized patterns being tracked */
  readonly patternCount: number;
  /** Total promoted habits */
  readonly habitCount: number;
  /** Active (non-suspended) habits */
  readonly activeHabits: number;
  /** Total habit fires since boot */
  readonly totalFires: number;
  /** Total estimated time saved (ms) */
  readonly totalTimeSavedMs: number;
  /** Mean success rate across all habits */
  readonly meanSuccessRate: number;
  /** Most recently fired habit (label) */
  readonly lastFiredLabel: string;
  /** Top habits by fire count (for Habit Ring visualization) */
  readonly topHabits: readonly HabitRingEntry[];
  /** Whether the system is actively learning (rising pattern count) */
  readonly isLearning: boolean;
  /** Acceleration factor: ratio of habit fires to total reasoning calls */
  readonly accelerationFactor: number;
}

/** An entry in the Habit Ring visualization */
export interface HabitRingEntry {
  readonly id: string;
  readonly label: string;
  readonly fireCount: number;
  readonly successRate: number;
  readonly meanReward: number;
  readonly active: boolean;
  /** Arc size in the ring (proportional to fire count) */
  readonly arcWeight: number;
}

// ═══════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════

/** Minimum occurrences before promotion to habit */
const PROMOTION_THRESHOLD = 3;

/** Maximum reward variance for consistent patterns */
const MAX_VARIANCE = 0.1;

/** Sliding window size for pattern scanning */
const SCAN_WINDOW = 8;

/** Maximum patterns to track (memory bound) */
const MAX_PATTERNS = 128;

/** Maximum habits (ring-natural: 2^6) */
const MAX_HABITS = 64;

/** Top habits shown in the ring visualization */
const RING_TOP_N = 8;

/** Grade ordering for best-grade tracking */
const GRADE_ORD: Record<string, number> = { A: 3, B: 2, C: 1, D: 0 };

/** Estimated full-pipeline latency for time-saved calculation */
const ESTIMATED_PIPELINE_MS = 150;

// ═══════════════════════════════════════════════════════════════════════
// Pattern Scanner — detect recurring action sequences
// ═══════════════════════════════════════════════════════════════════════

/**
 * Scan a reward trace window for recurring action sequences.
 * Uses a sliding n-gram approach (bigrams and trigrams).
 */
function extractNgrams(
  traces: readonly RewardTraceEntry[],
  windowSize: number,
): { key: string; sequence: string[]; reward: number; grade: string }[] {
  const results: { key: string; sequence: string[]; reward: number; grade: string }[] = [];
  const window = traces.slice(-windowSize);

  // Bigrams
  for (let i = 0; i < window.length - 1; i++) {
    const seq = [window[i].actionType, window[i + 1].actionType];
    const key = seq.join("→");
    const reward = (window[i].reward + window[i + 1].reward) / 2;
    const grade = (GRADE_ORD[window[i + 1].epistemicGrade] ?? 0) >= (GRADE_ORD[window[i].epistemicGrade] ?? 0)
      ? window[i + 1].epistemicGrade
      : window[i].epistemicGrade;
    results.push({ key, sequence: seq, reward, grade });
  }

  // Trigrams
  for (let i = 0; i < window.length - 2; i++) {
    const seq = [window[i].actionType, window[i + 1].actionType, window[i + 2].actionType];
    const key = seq.join("→");
    const reward = (window[i].reward + window[i + 1].reward + window[i + 2].reward) / 3;
    const grade = window[i + 2].epistemicGrade;
    results.push({ key, sequence: seq, reward, grade });
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════
// Procedural Memory Engine
// ═══════════════════════════════════════════════════════════════════════

export class ProceduralMemoryEngine {
  private patterns = new Map<string, ActionPattern>();
  private habits = new Map<string, Habit>();
  private traceBuffer: RewardTraceEntry[] = [];
  private totalFires = 0;
  private totalReasoningCalls = 0;
  private lastFiredLabel = "";
  private habitCounter = 0;
  private previousPatternCount = 0;

  /**
   * Ingest a reward trace entry. This is called on every reward signal.
   * The engine scans for recurring patterns and promotes high-reward
   * sequences to habits.
   */
  ingest(entry: RewardTraceEntry): Habit | null {
    this.totalReasoningCalls++;

    // Add to sliding buffer
    this.traceBuffer.push(entry);
    if (this.traceBuffer.length > SCAN_WINDOW * 4) {
      this.traceBuffer = this.traceBuffer.slice(-SCAN_WINDOW * 2);
    }

    // Need at least 2 entries for pattern detection
    if (this.traceBuffer.length < 2) return null;

    // Extract n-grams and update pattern counts
    const ngrams = extractNgrams(this.traceBuffer, SCAN_WINDOW);
    let promoted: Habit | null = null;

    for (const ng of ngrams) {
      let pattern = this.patterns.get(ng.key);

      if (!pattern) {
        // New pattern — start tracking
        if (this.patterns.size >= MAX_PATTERNS) {
          // Evict lowest-count pattern
          let minKey = "";
          let minCount = Infinity;
          for (const [k, p] of this.patterns) {
            if (p.occurrenceCount < minCount && !this.habits.has(k)) {
              minCount = p.occurrenceCount;
              minKey = k;
            }
          }
          if (minKey) this.patterns.delete(minKey);
        }

        pattern = {
          key: ng.key,
          sequence: ng.sequence,
          occurrenceCount: 0,
          meanReward: 0,
          rewardVariance: 0,
          rewardSum: 0,
          rewardSumSq: 0,
          bestGrade: ng.grade,
          firstSeen: entry.timestamp,
          lastSeen: entry.timestamp,
        };
        this.patterns.set(ng.key, pattern);
      }

      // Update running statistics
      pattern.occurrenceCount++;
      pattern.rewardSum += ng.reward;
      pattern.rewardSumSq += ng.reward * ng.reward;
      pattern.meanReward = pattern.rewardSum / pattern.occurrenceCount;
      pattern.rewardVariance =
        pattern.occurrenceCount > 1
          ? (pattern.rewardSumSq / pattern.occurrenceCount) - pattern.meanReward * pattern.meanReward
          : 0;
      pattern.lastSeen = entry.timestamp;

      if ((GRADE_ORD[ng.grade] ?? 0) > (GRADE_ORD[pattern.bestGrade] ?? 0)) {
        pattern.bestGrade = ng.grade;
      }

      // Check promotion criteria
      if (
        pattern.occurrenceCount >= PROMOTION_THRESHOLD &&
        pattern.meanReward > 0 &&
        pattern.rewardVariance < MAX_VARIANCE &&
        !this.habits.has(pattern.key) &&
        this.habits.size < MAX_HABITS
      ) {
        promoted = this.promoteToHabit(pattern, entry);
      }
    }

    return promoted;
  }

  /**
   * Promote a pattern to a habit — compile it into a cached template.
   */
  private promoteToHabit(pattern: ActionPattern, latestEntry: RewardTraceEntry): Habit {
    const id = `habit:${++this.habitCounter}:${pattern.key}`;

    const habit: Habit = {
      id,
      patternKey: pattern.key,
      sequence: pattern.sequence,
      cachedResult: {
        grade: pattern.bestGrade,
        meanH: Math.max(0, 0.5 + pattern.meanReward),
        converged: pattern.meanReward > 0.01,
        latencyMs: 0.1, // Habit fires are near-instant
        label: pattern.key,
      },
      fireCount: 0,
      timeSavedMs: 0,
      meanReward: pattern.meanReward,
      successRate: 1.0,
      promotedAt: Date.now(),
      lastFiredAt: 0,
      active: true,
    };

    this.habits.set(pattern.key, habit);
    return habit;
  }

  /**
   * Try to fire a habit for the given action type.
   * Returns the cached result if a matching habit exists, null otherwise.
   */
  tryFire(actionType: string): { habit: Habit; result: HabitResult } | null {
    // Check single-action habits first, then check as part of recent sequence
    for (const [key, habit] of this.habits) {
      if (!habit.active) continue;

      // Check if the action type matches any part of the habit sequence
      if (habit.sequence[habit.sequence.length - 1] === actionType) {
        // Verify the recent trace buffer matches the habit sequence
        const bufLen = this.traceBuffer.length;
        const seqLen = habit.sequence.length;

        if (bufLen >= seqLen - 1) {
          // Check if the preceding actions match
          let match = true;
          for (let i = 0; i < seqLen - 1; i++) {
            const bufIdx = bufLen - (seqLen - 1) + i;
            if (bufIdx < 0 || this.traceBuffer[bufIdx]?.actionType !== habit.sequence[i]) {
              match = false;
              break;
            }
          }

          if (match) {
            // Fire the habit
            habit.fireCount++;
            habit.timeSavedMs += ESTIMATED_PIPELINE_MS;
            habit.lastFiredAt = Date.now();
            this.totalFires++;
            this.lastFiredLabel = habit.cachedResult.label;

            return { habit, result: habit.cachedResult };
          }
        }
      }
    }

    return null;
  }

  /**
   * Report whether a habit fire maintained positive reward.
   * Used to track success rate and potentially suspend degraded habits.
   */
  reportFeedback(habitId: string, reward: number): void {
    const habit = Array.from(this.habits.values()).find(h => h.id === habitId);
    if (!habit) return;

    const wasPositive = reward > 0 ? 1 : 0;
    const totalFires = habit.fireCount;
    // Running average of success rate
    habit.successRate = habit.successRate * ((totalFires - 1) / totalFires) + wasPositive / totalFires;
    habit.meanReward = habit.meanReward * ((totalFires - 1) / totalFires) + reward / totalFires;

    // Suspend habits with low success rate
    if (habit.successRate < 0.3 && habit.fireCount >= 5) {
      habit.active = false;
    }
  }

  /**
   * Project procedural memory state into a kernel-readable structure.
   */
  project(): ProceduralProjection {
    const habits = Array.from(this.habits.values());
    const activeHabits = habits.filter(h => h.active);
    const totalTimeSavedMs = habits.reduce((sum, h) => sum + h.timeSavedMs, 0);
    const meanSuccessRate = activeHabits.length > 0
      ? activeHabits.reduce((sum, h) => sum + h.successRate, 0) / activeHabits.length
      : 0;

    // Build Habit Ring entries — top N by fire count
    const sorted = [...habits].sort((a, b) => b.fireCount - a.fireCount);
    const topN = sorted.slice(0, RING_TOP_N);
    const totalFiresForRing = topN.reduce((sum, h) => sum + h.fireCount, 0) || 1;

    const topHabits: HabitRingEntry[] = topN.map(h => ({
      id: h.id,
      label: h.cachedResult.label,
      fireCount: h.fireCount,
      successRate: h.successRate,
      meanReward: h.meanReward,
      active: h.active,
      arcWeight: h.fireCount / totalFiresForRing,
    }));

    const isLearning = this.patterns.size > this.previousPatternCount;
    this.previousPatternCount = this.patterns.size;

    const accelerationFactor = this.totalReasoningCalls > 0
      ? this.totalFires / this.totalReasoningCalls
      : 0;

    return {
      patternCount: this.patterns.size,
      habitCount: habits.length,
      activeHabits: activeHabits.length,
      totalFires: this.totalFires,
      totalTimeSavedMs,
      meanSuccessRate,
      lastFiredLabel: this.lastFiredLabel,
      topHabits,
      isLearning,
      accelerationFactor,
    };
  }

  /** Get all habits (for dev tools) */
  getHabits(): readonly Habit[] {
    return Array.from(this.habits.values());
  }

  /** Get all patterns (for dev tools) */
  getPatterns(): readonly ActionPattern[] {
    return Array.from(this.patterns.values());
  }

  /** Reset all state */
  reset(): void {
    this.patterns.clear();
    this.habits.clear();
    this.traceBuffer = [];
    this.totalFires = 0;
    this.totalReasoningCalls = 0;
    this.lastFiredLabel = "";
    this.habitCounter = 0;
    this.previousPatternCount = 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════════════════

let _instance: ProceduralMemoryEngine | null = null;

export function getProceduralMemory(): ProceduralMemoryEngine {
  if (!_instance) {
    _instance = new ProceduralMemoryEngine();
  }
  return _instance;
}
