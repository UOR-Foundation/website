
CREATE TABLE public.user_attention_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  lens_preferences JSONB DEFAULT '{}',
  domain_history JSONB DEFAULT '[]',
  session_count INTEGER DEFAULT 0,
  total_dwell_seconds NUMERIC DEFAULT 0,
  avg_novelty_score NUMERIC DEFAULT 50,
  context_journal JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_attention_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own attention profile"
ON public.user_attention_profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own attention profile"
ON public.user_attention_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attention profile"
ON public.user_attention_profiles
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own attention profile"
ON public.user_attention_profiles
FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_attention_profiles_updated_at
BEFORE UPDATE ON public.user_attention_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
