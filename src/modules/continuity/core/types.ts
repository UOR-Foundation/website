/**
 * Continuity Infrastructure — Type Definitions
 * ══════════════════════════════════════════════
 *
 * Canonical types for the agent memory continuity protocol.
 * Every type is a formal UOR projection.
 */

// ── Session Chain ──────────────────────────────────────────────────
export interface SessionCheckpoint {
  id: string;
  agent_id: string;
  session_cid: string;
  parent_cid: string | null;
  sequence_num: number;
  state_snapshot: Record<string, unknown>;
  memory_count: number;
  h_score: number;
  zone: "COHERENCE" | "DRIFT" | "COLLAPSE";
  observer_phi: number;
  created_at: string;
}

export interface SessionChainResponse {
  "@type": string;
  agent_id: string;
  chain_length: number;
  sessions: SessionCheckpoint[];
  integrity: "verified" | "broken" | "genesis";
}

// ── Memory ─────────────────────────────────────────────────────────
export type MemoryType = "factual" | "relational" | "procedural" | "episodic";
export type StorageTier = "hot" | "cold";
export type EpistemicGrade = "A" | "B" | "C" | "D";

export interface AgentMemory {
  id: string;
  agent_id: string;
  memory_cid: string;
  memory_type: MemoryType;
  content: Record<string, unknown>;
  summary: string | null;
  epistemic_grade: EpistemicGrade;
  session_cid: string | null;
  importance: number;
  access_count: number;
  last_accessed_at: string | null;
  storage_tier: StorageTier;
  compressed: boolean;
  compression_witness_cid: string | null;
  created_at: string;
}

// ── Compression Witness ────────────────────────────────────────────
export interface CompressionWitness {
  id: string;
  agent_id: string;
  witness_cid: string;
  original_memory_cids: string[];
  compressed_to_cid: string;
  morphism_type: "embedding";
  preserved_properties: string[];
  information_loss_ratio: number;
  created_at: string;
}

// ── Relationships ──────────────────────────────────────────────────
export type RelationshipType = "interaction" | "commitment" | "attestation" | "trust";

export interface AgentRelationship {
  id: string;
  agent_id: string;
  relationship_cid: string;
  target_id: string;
  relationship_type: RelationshipType;
  context: Record<string, unknown>;
  trust_score: number;
  interaction_count: number;
  last_interaction_at: string | null;
  created_at: string;
}

// ── Memory Graph (API response) ────────────────────────────────────
export interface MemoryGraphResponse {
  "@type": string;
  agent_id: string;
  total_memories: number;
  hot_memories: number;
  cold_memories: number;
  memories: AgentMemory[];
  relationships: AgentRelationship[];
  capacity_utilization: number;
}

// ── Continuity Health ──────────────────────────────────────────────
export interface ContinuityHealth {
  chainLength: number;
  latestZone: "COHERENCE" | "DRIFT" | "COLLAPSE";
  latestPhi: number;
  latestHScore: number;
  totalMemories: number;
  hotMemories: number;
  coldMemories: number;
  compressionRatio: number;
  relationshipCount: number;
  averageTrust: number;
  /** 0–1 composite score: higher = more continuous */
  continuityIndex: number;
}
