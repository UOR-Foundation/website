
-- ══════════════════════════════════════════════════════════════════════
-- Phase 1: Coherence Reward Circuit — Persistent Reward Traces
-- ══════════════════════════════════════════════════════════════════════
-- The Basal Ganglia of the hologram: every action produces a reward
-- signal derived from coherence improvement, limbic valence, and
-- epistemic grade advancement. These traces enable the system to
-- learn which reasoning pathways produce sustained coherence.

CREATE TABLE public.reward_traces (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id text NOT NULL,
  session_cid text NOT NULL,
  
  -- The coherence snapshot before and after the action
  h_before numeric NOT NULL DEFAULT 0,
  h_after numeric NOT NULL DEFAULT 0,
  delta_h numeric NOT NULL DEFAULT 0,
  
  -- Limbic valence at action time (from Limbic Lens VAD)
  valence numeric NOT NULL DEFAULT 0,
  arousal numeric NOT NULL DEFAULT 0.5,
  dominance numeric NOT NULL DEFAULT 0.5,
  
  -- Epistemic quality of the action's output
  epistemic_grade text NOT NULL DEFAULT 'D',
  grade_delta integer NOT NULL DEFAULT 0,  -- +1 if grade improved, -1 if degraded, 0 if same
  
  -- The composite reward signal: ΔH × valence × epistemic_bonus
  reward numeric NOT NULL DEFAULT 0,
  
  -- What produced this reward
  action_type text NOT NULL DEFAULT 'reasoning',
  action_label text,
  
  -- Running statistics for this agent (denormalized for O(1) lookup)
  cumulative_reward numeric NOT NULL DEFAULT 0,
  trace_index integer NOT NULL DEFAULT 0,
  
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Composite index for agent reward history queries
CREATE INDEX idx_reward_traces_agent_session ON public.reward_traces (agent_id, session_cid, created_at DESC);

-- Index for leaderboard / analytics: top rewarded action types
CREATE INDEX idx_reward_traces_reward ON public.reward_traces (reward DESC);

-- Enable Row Level Security
ALTER TABLE public.reward_traces ENABLE ROW LEVEL SECURITY;

-- Reward traces are publicly readable (transparency principle)
CREATE POLICY "Reward traces are publicly readable"
  ON public.reward_traces
  FOR SELECT
  USING (true);

-- Only authenticated users can create reward traces
CREATE POLICY "Authenticated users can create reward traces"
  ON public.reward_traces
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
