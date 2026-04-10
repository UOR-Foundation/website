
CREATE TABLE public.address_forks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_cid text NOT NULL,
  child_cid text NOT NULL,
  user_id uuid NOT NULL,
  fork_note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (parent_cid, child_cid)
);

ALTER TABLE public.address_forks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read forks"
  ON public.address_forks FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create forks"
  ON public.address_forks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_address_forks_parent ON public.address_forks (parent_cid);
CREATE INDEX idx_address_forks_child ON public.address_forks (child_cid);

ALTER PUBLICATION supabase_realtime ADD TABLE public.address_forks;
