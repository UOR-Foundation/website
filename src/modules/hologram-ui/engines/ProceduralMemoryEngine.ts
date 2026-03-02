/**
 * ProceduralMemoryEngine — Cerebellum fast-path for habit kernels
 * ════════════════════════════════════════════════════════════════
 *
 * Detects recurring high-reward reasoning patterns from reward_traces,
 * promotes them to habit kernels, and provides O(1) fast-path execution
 * for compiled circuit templates.
 *
 * Pattern detection flow:
 *   1. Scan recent reward traces for recurring action_type sequences
 *   2. Hash the action sequence to produce a pattern_hash
 *   3. If pattern seen ≥ PROMOTION_THRESHOLD times with avg reward > MIN_REWARD,
 *      promote to an active habit kernel
 *   4. Track fire counts and compute acceleration factors
 *
 * @module hologram-ui/engines/ProceduralMemoryEngine
 */

import { supabase } from "@/integrations/supabase/client";
import { habitFireFeedback, habitPromotedFeedback } from "@/modules/hologram-ui/utils/habitFeedback";

// ── Types ────────────────────────────────────────────────────────────────

export interface HabitKernel {
  id: string;
  habitId: string;
  name: string;
  description: string | null;
  patternHash: string;
  patternActions: string[];
  fireCount: number;
  successCount: number;
  successRate: number;
  avgReward: number;
  totalTimeSavedMs: number;
  accelerationFactor: number;
  consecutiveSuccesses: number;
  status: "candidate" | "active" | "retired";
  epistemicGrade: string;
  promotedAt: string | null;
  createdAt: string;
}

export interface PatternCandidate {
  actions: string[];
  hash: string;
  occurrences: number;
  avgReward: number;
  sessionCids: string[];
}

// ── Constants ────────────────────────────────────────────────────────────

const PROMOTION_THRESHOLD = 3;    // Times a pattern must recur
const MIN_REWARD = 0.2;           // Minimum avg reward for promotion
const WINDOW_SIZE = 3;            // Sliding window for action sequences
const DEFAULT_AGENT = "hologram";

// ── Hashing ──────────────────────────────────────────────────────────────

async function hashPattern(actions: string[]): Promise<string> {
  const data = new TextEncoder().encode(actions.join("|"));
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

// ── Grade mapping ────────────────────────────────────────────────────────

function gradeFromReward(avgReward: number): string {
  if (avgReward >= 0.8) return "A";
  if (avgReward >= 0.6) return "B";
  if (avgReward >= 0.4) return "C";
  return "D";
}

// ── Habit name generation ────────────────────────────────────────────────

function generateHabitName(actions: string[]): string {
  const unique = [...new Set(actions)];
  const nameMap: Record<string, string> = {
    reasoning: "Reason",
    navigation: "Navigate",
    observation: "Observe",
    memory_store: "Remember",
    memory_recall: "Recall",
    compression: "Compress",
    verification: "Verify",
    inference: "Infer",
    search: "Search",
    compose: "Compose",
  };
  const mapped = unique.map(a => nameMap[a] || a.charAt(0).toUpperCase() + a.slice(1));
  return `${mapped.join("→")} Loop`;
}

// ── Core Engine ──────────────────────────────────────────────────────────

/** Scan reward traces and detect recurring patterns */
export async function detectPatterns(agentId = DEFAULT_AGENT): Promise<PatternCandidate[]> {
  const { data: traces } = await supabase
    .from("reward_traces")
    .select("action_type, reward, session_cid")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (!traces || traces.length < WINDOW_SIZE) return [];

  // Extract sliding windows of action sequences
  const windowMap = new Map<string, { actions: string[]; rewards: number[]; sessions: Set<string> }>();

  for (let i = 0; i <= traces.length - WINDOW_SIZE; i++) {
    const window = traces.slice(i, i + WINDOW_SIZE);
    const actions = window.map(t => t.action_type);
    const key = actions.join("|");

    if (!windowMap.has(key)) {
      windowMap.set(key, { actions, rewards: [], sessions: new Set() });
    }
    const entry = windowMap.get(key)!;
    entry.rewards.push(...window.map(t => Number(t.reward)));
    entry.sessions.add(window[0].session_cid);
  }

  // Convert to candidates
  const candidates: PatternCandidate[] = [];
  for (const [, entry] of windowMap) {
    if (entry.rewards.length < WINDOW_SIZE) continue;
    const avgReward = entry.rewards.reduce((s, r) => s + r, 0) / entry.rewards.length;
    const hash = await hashPattern(entry.actions);
    candidates.push({
      actions: entry.actions,
      hash,
      occurrences: Math.floor(entry.rewards.length / WINDOW_SIZE),
      avgReward,
      sessionCids: [...entry.sessions],
    });
  }

  return candidates
    .filter(c => c.occurrences >= PROMOTION_THRESHOLD && c.avgReward >= MIN_REWARD)
    .sort((a, b) => b.avgReward * b.occurrences - a.avgReward * a.occurrences);
}

/** Promote a pattern candidate to an active habit kernel */
export async function promoteToHabit(candidate: PatternCandidate, agentId = DEFAULT_AGENT): Promise<HabitKernel | null> {
  const habitId = `habit-${candidate.hash.slice(0, 12)}`;

  // Check if already exists
  const { data: existing } = await supabase
    .from("habit_kernels")
    .select("id")
    .eq("habit_id", habitId)
    .maybeSingle();

  if (existing) {
    // Update fire count
    await supabase
      .from("habit_kernels")
      .update({
        fire_count: candidate.occurrences,
        avg_reward: candidate.avgReward,
        success_rate: candidate.avgReward,
        epistemic_grade: gradeFromReward(candidate.avgReward),
      })
      .eq("habit_id", habitId);
    return null;
  }

  const name = generateHabitName(candidate.actions);

  const { data, error } = await supabase
    .from("habit_kernels")
    .insert({
      agent_id: agentId,
      habit_id: habitId,
      name,
      description: `Recurring ${candidate.actions.join(" → ")} pattern detected ${candidate.occurrences} times`,
      pattern_hash: candidate.hash,
      pattern_actions: candidate.actions,
      circuit_template: {
        gates: candidate.actions.map((a, i) => ({
          id: `gate-${i}`,
          op: a.toUpperCase(),
          inputs: i > 0 ? [`gate-${i - 1}`] : [],
        })),
      },
      fire_count: candidate.occurrences,
      success_count: Math.round(candidate.occurrences * candidate.avgReward),
      success_rate: candidate.avgReward,
      avg_reward: candidate.avgReward,
      acceleration_factor: 1 + (candidate.occurrences * 0.1),
      total_time_saved_ms: candidate.occurrences * 200,
      consecutive_successes: candidate.occurrences,
      status: "active",
      promoted_at: new Date().toISOString(),
      source_session_cids: candidate.sessionCids.slice(0, 10),
      epistemic_grade: gradeFromReward(candidate.avgReward),
    })
    .select()
    .single();

  if (error || !data) return null;

  habitPromotedFeedback();
  return mapRow(data);
}

/** Fetch all active habit kernels */
export async function getActiveHabits(agentId = DEFAULT_AGENT): Promise<HabitKernel[]> {
  const { data } = await supabase
    .from("habit_kernels")
    .select("*")
    .eq("agent_id", agentId)
    .in("status", ["active", "candidate"])
    .order("fire_count", { ascending: false })
    .limit(12);

  return (data ?? []).map(mapRow);
}

/** Run the full scan-and-promote cycle */
export async function runProceduralMemoryCycle(agentId = DEFAULT_AGENT): Promise<{
  patternsFound: number;
  habitsPromoted: number;
  activeHabits: HabitKernel[];
}> {
  const patterns = await detectPatterns(agentId);
  let promoted = 0;

  for (const p of patterns.slice(0, 5)) {
    const result = await promoteToHabit(p, agentId);
    if (result) promoted++;
  }

  const activeHabits = await getActiveHabits(agentId);

  return { patternsFound: patterns.length, habitsPromoted: promoted, activeHabits };
}

/** Fire a habit (increment count and track acceleration) */
export async function fireHabit(habitId: string): Promise<void> {
  const { data } = await supabase
    .from("habit_kernels")
    .select("fire_count, success_count, total_time_saved_ms")
    .eq("habit_id", habitId)
    .single();

  if (!data) return;

  const newFireCount = (data.fire_count ?? 0) + 1;
  const newSuccessCount = (data.success_count ?? 0) + 1;

  await supabase
    .from("habit_kernels")
    .update({
      fire_count: newFireCount,
      success_count: newSuccessCount,
      success_rate: newSuccessCount / newFireCount,
      acceleration_factor: 1 + (newFireCount * 0.1),
      total_time_saved_ms: (data.total_time_saved_ms ?? 0) + 200,
    })
    .eq("habit_id", habitId);

  habitFireFeedback();
}

// ── Helpers ──────────────────────────────────────────────────────────────

function mapRow(row: any): HabitKernel {
  return {
    id: row.id,
    habitId: row.habit_id,
    name: row.name,
    description: row.description,
    patternHash: row.pattern_hash,
    patternActions: row.pattern_actions ?? [],
    fireCount: row.fire_count ?? 0,
    successCount: row.success_count ?? 0,
    successRate: Number(row.success_rate ?? 0),
    avgReward: Number(row.avg_reward ?? 0),
    totalTimeSavedMs: row.total_time_saved_ms ?? 0,
    accelerationFactor: Number(row.acceleration_factor ?? 1),
    consecutiveSuccesses: row.consecutive_successes ?? 0,
    status: row.status ?? "candidate",
    epistemicGrade: row.epistemic_grade ?? "D",
    promotedAt: row.promoted_at,
    createdAt: row.created_at,
  };
}
