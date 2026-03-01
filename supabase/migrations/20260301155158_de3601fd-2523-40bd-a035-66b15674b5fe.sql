
-- Add emotional VAD (Valence-Arousal-Dominance) columns to agent_memories
-- These derive from the Holographic Surface coherence state at memory write time
ALTER TABLE public.agent_memories
  ADD COLUMN IF NOT EXISTS valence numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS arousal numeric NOT NULL DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS dominance numeric NOT NULL DEFAULT 0.5;

-- Add index for emotion-weighted retrieval (composite VAD similarity queries)
CREATE INDEX IF NOT EXISTS idx_agent_memories_vad 
  ON public.agent_memories (valence, arousal, dominance);

-- Add index for emotion-filtered temporal queries
CREATE INDEX IF NOT EXISTS idx_agent_memories_emotion_time 
  ON public.agent_memories (agent_id, created_at DESC, valence, arousal);

COMMENT ON COLUMN public.agent_memories.valence IS 'Emotional valence at write time: -1 (negative) to +1 (positive). Derived from ∂H/∂t coherence gradient.';
COMMENT ON COLUMN public.agent_memories.arousal IS 'Emotional arousal at write time: 0 (calm) to 1 (excited). Derived from observer φ (attention intensity).';
COMMENT ON COLUMN public.agent_memories.dominance IS 'Emotional dominance at write time: 0 (submissive/divergent) to 1 (dominant/convergent). Derived from kernel zone.';
