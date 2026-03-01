
-- Phase 1: Add sovereign identity ceremony fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS handle text UNIQUE,
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS ceremony_cid text,
  ADD COLUMN IF NOT EXISTS trust_node_cid text,
  ADD COLUMN IF NOT EXISTS disclosure_policy_cid text,
  ADD COLUMN IF NOT EXISTS three_word_name text,
  ADD COLUMN IF NOT EXISTS pqc_algorithm text DEFAULT 'ML-DSA-65',
  ADD COLUMN IF NOT EXISTS collapse_intact boolean DEFAULT true;

-- Index for handle lookups
CREATE INDEX IF NOT EXISTS idx_profiles_handle ON public.profiles(handle) WHERE handle IS NOT NULL;
