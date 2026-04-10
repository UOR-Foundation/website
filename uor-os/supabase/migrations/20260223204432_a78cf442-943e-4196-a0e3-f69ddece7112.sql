-- Add session certificate fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS session_cid text,
ADD COLUMN IF NOT EXISTS session_issued_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS session_derivation_id text;