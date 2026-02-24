
-- ═══════════════════════════════════════════════════════════════════
-- CONTINUITY INFRASTRUCTURE — Solving the Agent Memory Crisis
-- ═══════════════════════════════════════════════════════════════════
-- Four tables forming a complete continuity protocol:
--   1. Session Chain    → hash-linked session history (append-only)
--   2. Agent Memories   → typed, content-addressed memory objects
--   3. Compression Witnesses → cryptographic proofs of lossy compression
--   4. Agent Relationships   → social bonds as first-class UOR objects

-- ─── 1. Session Continuity Chain ─────────────────────────────────
-- Each row is a content-addressed checkpoint. parent_cid forms a
-- hash chain: session N's CID becomes session N+1's parent.
-- This makes "temporal discontinuity" structurally impossible.
CREATE TABLE public.agent_session_chains (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id text NOT NULL,
  session_cid text NOT NULL UNIQUE,
  parent_cid text,
  sequence_num integer NOT NULL DEFAULT 0,
  state_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  memory_count integer NOT NULL DEFAULT 0,
  h_score numeric NOT NULL DEFAULT 0,
  zone text NOT NULL DEFAULT 'COHERENCE',
  observer_phi numeric NOT NULL DEFAULT 1.0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_session_chains_agent ON public.agent_session_chains(agent_id);
CREATE INDEX idx_session_chains_parent ON public.agent_session_chains(parent_cid);
CREATE INDEX idx_session_chains_seq ON public.agent_session_chains(agent_id, sequence_num DESC);

ALTER TABLE public.agent_session_chains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session chains are publicly readable"
  ON public.agent_session_chains FOR SELECT USING (true);

CREATE POLICY "Authenticated users can append session chains"
  ON public.agent_session_chains FOR INSERT
  WITH CHECK (true);

-- ─── 2. Agent Memories ───────────────────────────────────────────
-- Typed memory objects: factual, relational, procedural, episodic.
-- Each is content-addressed via memory_cid and linked to its
-- originating session. Importance drives Hot/Cold migration.
CREATE TABLE public.agent_memories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id text NOT NULL,
  memory_cid text NOT NULL,
  memory_type text NOT NULL DEFAULT 'factual',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary text,
  epistemic_grade text NOT NULL DEFAULT 'D',
  session_cid text,
  importance numeric NOT NULL DEFAULT 0.5,
  access_count integer NOT NULL DEFAULT 0,
  last_accessed_at timestamptz,
  storage_tier text NOT NULL DEFAULT 'hot',
  compressed boolean NOT NULL DEFAULT false,
  compression_witness_cid text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_memories_agent ON public.agent_memories(agent_id);
CREATE INDEX idx_memories_type ON public.agent_memories(agent_id, memory_type);
CREATE INDEX idx_memories_importance ON public.agent_memories(agent_id, importance DESC);
CREATE INDEX idx_memories_session ON public.agent_memories(session_cid);
CREATE INDEX idx_memories_tier ON public.agent_memories(agent_id, storage_tier);

ALTER TABLE public.agent_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Memories are publicly readable"
  ON public.agent_memories FOR SELECT USING (true);

CREATE POLICY "Authenticated users can store memories"
  ON public.agent_memories FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update memories"
  ON public.agent_memories FOR UPDATE USING (true);

-- ─── 3. Compression Witnesses ────────────────────────────────────
-- When memories are compressed (lossy), a witness records:
--   - which memories were compressed (original_memory_cids)
--   - what was preserved (preserved_properties)
--   - information loss ratio
-- This is a morphism:Embedding — proving "I once knew X"
-- even when X's details are no longer in active context.
CREATE TABLE public.agent_compression_witnesses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id text NOT NULL,
  witness_cid text NOT NULL UNIQUE,
  original_memory_cids text[] NOT NULL DEFAULT '{}',
  compressed_to_cid text NOT NULL,
  morphism_type text NOT NULL DEFAULT 'embedding',
  preserved_properties jsonb NOT NULL DEFAULT '[]'::jsonb,
  information_loss_ratio numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_witnesses_agent ON public.agent_compression_witnesses(agent_id);

ALTER TABLE public.agent_compression_witnesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Compression witnesses are publicly readable"
  ON public.agent_compression_witnesses FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create witnesses"
  ON public.agent_compression_witnesses FOR INSERT WITH CHECK (true);

-- ─── 4. Agent Relationships ──────────────────────────────────────
-- Social bonds, commitments, and interaction history as first-class
-- content-addressed UOR objects. Each relationship is a typed edge
-- in the agent's relational graph.
CREATE TABLE public.agent_relationships (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id text NOT NULL,
  relationship_cid text NOT NULL,
  target_id text NOT NULL,
  relationship_type text NOT NULL DEFAULT 'interaction',
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  trust_score numeric NOT NULL DEFAULT 0,
  interaction_count integer NOT NULL DEFAULT 0,
  last_interaction_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_relationships_agent ON public.agent_relationships(agent_id);
CREATE INDEX idx_relationships_target ON public.agent_relationships(target_id);
CREATE INDEX idx_relationships_type ON public.agent_relationships(agent_id, relationship_type);

ALTER TABLE public.agent_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Relationships are publicly readable"
  ON public.agent_relationships FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create relationships"
  ON public.agent_relationships FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update relationships"
  ON public.agent_relationships FOR UPDATE USING (true);
