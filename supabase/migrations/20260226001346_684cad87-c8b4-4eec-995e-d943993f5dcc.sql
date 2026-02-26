
-- Phase 7: Persistent reasoning proofs & certificates
CREATE TABLE public.reasoning_proofs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proof_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  state TEXT NOT NULL DEFAULT 'Unresolved',
  quantum INTEGER NOT NULL DEFAULT 0,
  premises TEXT[] NOT NULL DEFAULT '{}',
  conclusion TEXT,
  steps JSONB NOT NULL DEFAULT '[]',
  is_complete BOOLEAN NOT NULL DEFAULT false,
  overall_grade TEXT NOT NULL DEFAULT 'D',
  iterations INTEGER NOT NULL DEFAULT 1,
  converged BOOLEAN NOT NULL DEFAULT false,
  final_curvature NUMERIC NOT NULL DEFAULT 0,
  claims JSONB NOT NULL DEFAULT '[]',
  scaffold_summary TEXT,
  certificate JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_reasoning_proofs_user ON public.reasoning_proofs(user_id);
CREATE INDEX idx_reasoning_proofs_conv ON public.reasoning_proofs(conversation_id);
CREATE INDEX idx_reasoning_proofs_grade ON public.reasoning_proofs(overall_grade);

-- RLS
ALTER TABLE public.reasoning_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own proofs"
  ON public.reasoning_proofs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own proofs"
  ON public.reasoning_proofs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own proofs"
  ON public.reasoning_proofs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own proofs"
  ON public.reasoning_proofs FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update timestamp
CREATE TRIGGER update_reasoning_proofs_updated_at
  BEFORE UPDATE ON public.reasoning_proofs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
