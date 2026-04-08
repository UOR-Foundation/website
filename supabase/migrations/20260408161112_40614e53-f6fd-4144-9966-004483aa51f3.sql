
CREATE TABLE public.session_transfers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  target_url text NOT NULL,
  target_lens text NOT NULL DEFAULT 'overview',
  created_at timestamptz NOT NULL DEFAULT now(),
  used boolean NOT NULL DEFAULT false
);

CREATE INDEX idx_session_transfers_token ON public.session_transfers (token);

ALTER TABLE public.session_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own transfers"
  ON public.session_transfers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own transfers"
  ON public.session_transfers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
