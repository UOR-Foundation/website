
-- Create votes table
CREATE TABLE public.address_comment_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.address_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  vote smallint NOT NULL CHECK (vote IN (-1, 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);

ALTER TABLE public.address_comment_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read votes"
  ON public.address_comment_votes FOR SELECT USING (true);

CREATE POLICY "Users can insert own votes"
  ON public.address_comment_votes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own votes"
  ON public.address_comment_votes FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own votes"
  ON public.address_comment_votes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Add denormalized score to comments
ALTER TABLE public.address_comments ADD COLUMN score integer NOT NULL DEFAULT 0;
