
-- Proof-of-Thought: Append-only geometric receipt ledger
CREATE TABLE public.proof_of_thought (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.ai_messages(id) ON DELETE SET NULL,
  receipt JSONB NOT NULL DEFAULT '{}'::jsonb,
  cid TEXT NOT NULL,
  spectral_grade TEXT NOT NULL DEFAULT 'D',
  drift_delta0 NUMERIC NOT NULL DEFAULT 0,
  triadic_phase INTEGER NOT NULL DEFAULT 3,
  fidelity NUMERIC NOT NULL DEFAULT 0,
  compression_ratio NUMERIC NOT NULL DEFAULT 1,
  eigenvalues_locked INTEGER NOT NULL DEFAULT 0,
  zk_mode BOOLEAN NOT NULL DEFAULT true,
  free_parameters INTEGER NOT NULL DEFAULT 0,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookup by user and conversation
CREATE INDEX idx_pot_user_id ON public.proof_of_thought(user_id);
CREATE INDEX idx_pot_conversation ON public.proof_of_thought(conversation_id);
CREATE INDEX idx_pot_cid ON public.proof_of_thought(cid);

-- Enable RLS
ALTER TABLE public.proof_of_thought ENABLE ROW LEVEL SECURITY;

-- Users can read their own proofs
CREATE POLICY "Users can read own proofs of thought"
ON public.proof_of_thought FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own proofs
CREATE POLICY "Users can insert own proofs of thought"
ON public.proof_of_thought FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- NO UPDATE or DELETE policies — receipts are append-only (immutable)
