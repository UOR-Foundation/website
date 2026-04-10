
-- Data Bank Box: encrypted, content-addressed user context storage
-- Each slot is a named key-value pair, encrypted client-side before storage

CREATE TABLE public.user_data_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  slot_key text NOT NULL,
  cid text NOT NULL,
  encrypted_blob text NOT NULL,
  iv text NOT NULL,
  byte_length integer NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, slot_key)
);

-- Enable RLS
ALTER TABLE public.user_data_bank ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data bank
CREATE POLICY "Users can read own data bank"
  ON public.user_data_bank FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data bank"
  ON public.user_data_bank FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data bank"
  ON public.user_data_bank FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own data bank"
  ON public.user_data_bank FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update timestamp
CREATE TRIGGER update_user_data_bank_updated_at
  BEFORE UPDATE ON public.user_data_bank
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookups
CREATE INDEX idx_user_data_bank_user_slot ON public.user_data_bank (user_id, slot_key);
CREATE INDEX idx_user_data_bank_cid ON public.user_data_bank (cid);
