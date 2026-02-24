/**
 * Continuity Engine — Client-side orchestration
 * ═══════════════════════════════════════════════
 *
 * Provides the hash-chain verification, memory management,
 * and continuity health computation that powers the dashboard.
 *
 * Uses the Hologram projection pattern: every operation
 * produces a content-addressed result that links back to UOR.
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  SessionCheckpoint,
  AgentMemory,
  AgentRelationship,
  ContinuityHealth,
  CompressionWitness,
} from "./types";

// ── Session Chain Operations ──────────────────────────────────────

export async function fetchSessionChain(agentId: string): Promise<SessionCheckpoint[]> {
  const { data, error } = await supabase
    .from("agent_session_chains")
    .select("*")
    .eq("agent_id", agentId)
    .order("sequence_num", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as SessionCheckpoint[];
}

export async function fetchLatestCheckpoint(agentId: string): Promise<SessionCheckpoint | null> {
  const { data, error } = await supabase
    .from("agent_session_chains")
    .select("*")
    .eq("agent_id", agentId)
    .order("sequence_num", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as SessionCheckpoint | null;
}

// ── Memory Operations ─────────────────────────────────────────────

export async function fetchMemories(
  agentId: string,
  options?: { type?: string; tier?: string; limit?: number }
): Promise<AgentMemory[]> {
  let query = supabase
    .from("agent_memories")
    .select("*")
    .eq("agent_id", agentId)
    .order("importance", { ascending: false })
    .limit(options?.limit ?? 100);

  if (options?.type) query = query.eq("memory_type", options.type);
  if (options?.tier) query = query.eq("storage_tier", options.tier);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as AgentMemory[];
}

// ── Relationship Operations ───────────────────────────────────────

export async function fetchRelationships(agentId: string): Promise<AgentRelationship[]> {
  const { data, error } = await supabase
    .from("agent_relationships")
    .select("*")
    .eq("agent_id", agentId)
    .order("trust_score", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as AgentRelationship[];
}

// ── Compression Witnesses ─────────────────────────────────────────

export async function fetchWitnesses(agentId: string): Promise<CompressionWitness[]> {
  const { data, error } = await supabase
    .from("agent_compression_witnesses")
    .select("*")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as CompressionWitness[];
}

// ── Chain Integrity Verification ──────────────────────────────────

export function verifyChainIntegrity(chain: SessionCheckpoint[]): {
  valid: boolean;
  brokenAt: number | null;
} {
  if (chain.length === 0) return { valid: true, brokenAt: null };

  // Genesis must have no parent
  if (chain[0].parent_cid !== null) {
    return { valid: false, brokenAt: 0 };
  }

  // Each subsequent session must reference the previous
  for (let i = 1; i < chain.length; i++) {
    if (chain[i].parent_cid !== chain[i - 1].session_cid) {
      return { valid: false, brokenAt: i };
    }
  }

  return { valid: true, brokenAt: null };
}

// ── Continuity Health Computation ─────────────────────────────────

export function computeContinuityHealth(
  chain: SessionCheckpoint[],
  memories: AgentMemory[],
  relationships: AgentRelationship[]
): ContinuityHealth {
  const latest = chain.length > 0 ? chain[chain.length - 1] : null;

  const hotMemories = memories.filter((m) => m.storage_tier === "hot").length;
  const coldMemories = memories.filter((m) => m.storage_tier === "cold").length;
  const compressedCount = memories.filter((m) => m.compressed).length;
  const compressionRatio = memories.length > 0 ? compressedCount / memories.length : 0;

  const avgTrust =
    relationships.length > 0
      ? relationships.reduce((sum, r) => sum + r.trust_score, 0) / relationships.length
      : 0;

  // Composite continuity index (0–1)
  // Weights: chain length (30%), zone health (25%), memory ratio (20%),
  //          relationship density (15%), compression efficiency (10%)
  const chainScore = Math.min(1, chain.length / 20); // saturates at 20 sessions
  const zoneScore = latest?.zone === "COHERENCE" ? 1 : latest?.zone === "DRIFT" ? 0.5 : 0;
  const memoryScore = memories.length > 0 ? hotMemories / memories.length : 0;
  const relScore = Math.min(1, relationships.length / 10);
  const compScore = 1 - compressionRatio; // lower compression = more retained

  const continuityIndex =
    chainScore * 0.3 + zoneScore * 0.25 + memoryScore * 0.2 + relScore * 0.15 + compScore * 0.1;

  return {
    chainLength: chain.length,
    latestZone: (latest?.zone as ContinuityHealth["latestZone"]) ?? "COHERENCE",
    latestPhi: latest?.observer_phi ?? 1.0,
    latestHScore: latest?.h_score ?? 0,
    totalMemories: memories.length,
    hotMemories,
    coldMemories,
    compressionRatio,
    relationshipCount: relationships.length,
    averageTrust: avgTrust,
    continuityIndex,
  };
}
