CREATE TABLE public.book_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT,
  cover_url TEXT,
  source_url TEXT UNIQUE,
  domain TEXT,
  tags TEXT[] DEFAULT '{}',
  summary_markdown TEXT,
  uor_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.book_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read book summaries"
  ON public.book_summaries
  FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert book summaries"
  ON public.book_summaries
  FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_book_summaries_domain ON public.book_summaries (domain);
CREATE INDEX idx_book_summaries_source_url ON public.book_summaries (source_url);