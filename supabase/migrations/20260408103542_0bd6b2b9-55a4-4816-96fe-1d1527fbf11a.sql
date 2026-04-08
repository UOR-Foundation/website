CREATE TABLE public.search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  keyword TEXT NOT NULL,
  cid TEXT,
  searched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  wiki_qid TEXT
);

ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own history" ON public.search_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own history" ON public.search_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_search_history_user ON public.search_history(user_id, searched_at DESC);