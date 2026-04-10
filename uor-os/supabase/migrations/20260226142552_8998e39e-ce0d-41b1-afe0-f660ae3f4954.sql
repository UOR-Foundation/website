
-- Bookmarked AI responses for future reference
CREATE TABLE public.saved_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  message_content TEXT NOT NULL,
  epistemic_grade TEXT NOT NULL DEFAULT 'D',
  claims JSONB NOT NULL DEFAULT '[]'::jsonb,
  curvature NUMERIC NOT NULL DEFAULT 0,
  iterations INTEGER NOT NULL DEFAULT 0,
  converged BOOLEAN NOT NULL DEFAULT false,
  user_query TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own saved responses"
  ON public.saved_responses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save own responses"
  ON public.saved_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved responses"
  ON public.saved_responses FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own saved responses"
  ON public.saved_responses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_saved_responses_user ON public.saved_responses(user_id);
CREATE INDEX idx_saved_responses_grade ON public.saved_responses(epistemic_grade);
