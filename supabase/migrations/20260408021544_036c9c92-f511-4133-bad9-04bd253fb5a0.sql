
-- 1. Address visits (anonymous, public)
CREATE TABLE public.address_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address_cid text NOT NULL,
  visitor_fingerprint text NOT NULL,
  visited_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_address_visits_cid ON public.address_visits (address_cid);
CREATE UNIQUE INDEX idx_address_visits_unique ON public.address_visits (address_cid, visitor_fingerprint);

ALTER TABLE public.address_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read visit counts"
  ON public.address_visits FOR SELECT
  USING (true);

CREATE POLICY "Anyone can record a visit"
  ON public.address_visits FOR INSERT
  WITH CHECK (true);

-- 2. Address reactions (authenticated)
CREATE TABLE public.address_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address_cid text NOT NULL,
  user_id uuid NOT NULL,
  reaction text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT address_reactions_one_per_user UNIQUE (address_cid, user_id)
);

CREATE INDEX idx_address_reactions_cid ON public.address_reactions (address_cid);

ALTER TABLE public.address_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reactions"
  ON public.address_reactions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can add reactions"
  ON public.address_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reaction"
  ON public.address_reactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can remove own reaction"
  ON public.address_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Address comments (authenticated write, public read)
CREATE TABLE public.address_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address_cid text NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  parent_id uuid REFERENCES public.address_comments(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_address_comments_cid ON public.address_comments (address_cid);
CREATE INDEX idx_address_comments_parent ON public.address_comments (parent_id);

ALTER TABLE public.address_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comments"
  ON public.address_comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can add comments"
  ON public.address_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authors can delete own comments"
  ON public.address_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime for comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.address_comments;
