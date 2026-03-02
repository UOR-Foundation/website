/**
 * MirrorProtocolEngine — Inter-agent coherence modeling (Mirror Neurons)
 * ═════════════════════════════════════════════════════════════════════════
 *
 * Agents maintain predictive "Mirror" models of neighboring agents'
 * coherence states. Empathy Score = 1 / (1 + prediction_error).
 * When empathy exceeds SHARE_THRESHOLD, agents share procedural habits.
 *
 * Flow:
 *   1. Observe neighboring agent's H-score
 *   2. Compare with predicted H-score → prediction error
 *   3. Update empathy score (inverse of error)
 *   4. If empathy ≥ threshold → share habits across bond
 *   5. Track bond strength over time
 *
 * @module hologram-ui/engines/MirrorProtocolEngine
 */

import { supabase } from "@/integrations/supabase/client";

// ── Types ────────────────────────────────────────────────────────────────

export interface MirrorBond {
  id: string;
  agentId: string;
  targetAgentId: string;
  predictedHScore: number;
  actualHScore: number;
  predictionError: number;
  empathyScore: number;
  sharedHabitIds: string[];
  sharedHabitCount: number;
  bondStrength: number;
  interactionCount: number;
  lastSyncAt: string | null;
  status: "observing" | "mirroring" | "bonded";
  createdAt: string;
}

export interface MirrorWebStats {
  totalBonds: number;
  activeBonds: number;
  avgEmpathy: number;
  totalSharedHabits: number;
  strongestBond: MirrorBond | null;
}

// ── Constants ────────────────────────────────────────────────────────────

const SHARE_THRESHOLD = 0.6;    // Empathy must exceed this to share habits
const BOND_THRESHOLD = 0.8;     // Empathy for "bonded" status
const LEARNING_RATE = 0.15;     // How fast predictions adapt
const DEFAULT_AGENT = "hologram";

// ── Core Engine ──────────────────────────────────────────────────────────

/** Fetch all mirror bonds for an agent */
export async function getMirrorBonds(agentId = DEFAULT_AGENT): Promise<MirrorBond[]> {
  const { data } = await supabase
    .from("mirror_bonds")
    .select("*")
    .eq("agent_id", agentId)
    .order("empathy_score", { ascending: false })
    .limit(20);

  return (data ?? []).map(mapRow);
}

/** Get aggregate stats for the mirror web */
export async function getMirrorWebStats(agentId = DEFAULT_AGENT): Promise<MirrorWebStats> {
  const bonds = await getMirrorBonds(agentId);
  const active = bonds.filter(b => b.status !== "observing");

  return {
    totalBonds: bonds.length,
    activeBonds: active.length,
    avgEmpathy: bonds.length > 0
      ? bonds.reduce((s, b) => s + b.empathyScore, 0) / bonds.length
      : 0,
    totalSharedHabits: bonds.reduce((s, b) => s + b.sharedHabitCount, 0),
    strongestBond: bonds[0] ?? null,
  };
}

/** Observe a target agent and update the mirror model */
export async function observeAgent(
  agentId: string,
  targetAgentId: string,
  observedHScore: number,
): Promise<MirrorBond | null> {
  // Get or create bond
  const { data: existing } = await supabase
    .from("mirror_bonds")
    .select("*")
    .eq("agent_id", agentId)
    .eq("target_agent_id", targetAgentId)
    .maybeSingle();

  if (!existing) {
    // Create new bond
    const { data, error } = await supabase
      .from("mirror_bonds")
      .insert({
        agent_id: agentId,
        target_agent_id: targetAgentId,
        predicted_h_score: observedHScore,
        actual_h_score: observedHScore,
        prediction_error: 0.5,
        empathy_score: 1 / (1 + 0.5),
        bond_strength: 0.1,
        interaction_count: 1,
        last_sync_at: new Date().toISOString(),
        status: "observing",
      })
      .select()
      .single();

    return data ? mapRow(data) : null;
  }

  // Update prediction model
  const predicted = existing.predicted_h_score as number;
  const error = Math.abs(predicted - observedHScore);
  const newPredicted = predicted + LEARNING_RATE * (observedHScore - predicted);
  const empathy = 1 / (1 + error);
  const interactions = (existing.interaction_count as number) + 1;
  const strength = Math.min(1, empathy * Math.log2(interactions + 1) / 5);

  let status = "observing";
  if (empathy >= BOND_THRESHOLD) status = "bonded";
  else if (empathy >= SHARE_THRESHOLD) status = "mirroring";

  const { data, error: updateError } = await supabase
    .from("mirror_bonds")
    .update({
      predicted_h_score: newPredicted,
      actual_h_score: observedHScore,
      prediction_error: error,
      empathy_score: empathy,
      bond_strength: strength,
      interaction_count: interactions,
      last_sync_at: new Date().toISOString(),
      status,
    })
    .eq("id", existing.id)
    .select()
    .single();

  return data ? mapRow(data) : null;
}

/** Share habits across a bond (when empathy threshold met) */
export async function shareHabitsAcrossBond(
  bondId: string,
  habitIds: string[],
): Promise<void> {
  const { data: bond } = await supabase
    .from("mirror_bonds")
    .select("shared_habit_ids, empathy_score")
    .eq("id", bondId)
    .single();

  if (!bond || (bond.empathy_score as number) < SHARE_THRESHOLD) return;

  const existing = (bond.shared_habit_ids as string[]) ?? [];
  const merged = [...new Set([...existing, ...habitIds])];

  await supabase
    .from("mirror_bonds")
    .update({
      shared_habit_ids: merged,
      shared_habit_count: merged.length,
    })
    .eq("id", bondId);
}

/** Run a full mirror observation cycle across known agents */
export async function runMirrorCycle(agentId = DEFAULT_AGENT): Promise<{
  bondsUpdated: number;
  habitsShared: number;
  stats: MirrorWebStats;
}> {
  // Get all agents from session chains
  const { data: agents } = await supabase
    .from("agent_session_chains")
    .select("agent_id, h_score")
    .neq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(10);

  const uniqueAgents = new Map<string, number>();
  (agents ?? []).forEach(a => {
    if (!uniqueAgents.has(a.agent_id)) {
      uniqueAgents.set(a.agent_id, Number(a.h_score));
    }
  });

  let bondsUpdated = 0;
  let habitsShared = 0;

  for (const [targetId, hScore] of uniqueAgents) {
    const bond = await observeAgent(agentId, targetId, hScore);
    if (bond) {
      bondsUpdated++;

      // If mirroring/bonded, share active habits
      if (bond.empathyScore >= SHARE_THRESHOLD) {
        const { data: habits } = await supabase
          .from("habit_kernels")
          .select("habit_id")
          .eq("agent_id", agentId)
          .eq("status", "active")
          .limit(5);

        if (habits && habits.length > 0) {
          await shareHabitsAcrossBond(bond.id, habits.map(h => h.habit_id));
          habitsShared += habits.length;
        }
      }
    }
  }

  const stats = await getMirrorWebStats(agentId);
  return { bondsUpdated, habitsShared, stats };
}

// ── Helpers ──────────────────────────────────────────────────────────────

function mapRow(row: any): MirrorBond {
  return {
    id: row.id,
    agentId: row.agent_id,
    targetAgentId: row.target_agent_id,
    predictedHScore: Number(row.predicted_h_score ?? 0),
    actualHScore: Number(row.actual_h_score ?? 0),
    predictionError: Number(row.prediction_error ?? 1),
    empathyScore: Number(row.empathy_score ?? 0),
    sharedHabitIds: row.shared_habit_ids ?? [],
    sharedHabitCount: row.shared_habit_count ?? 0,
    bondStrength: Number(row.bond_strength ?? 0),
    interactionCount: row.interaction_count ?? 0,
    lastSyncAt: row.last_sync_at,
    status: row.status ?? "observing",
    createdAt: row.created_at,
  };
}
