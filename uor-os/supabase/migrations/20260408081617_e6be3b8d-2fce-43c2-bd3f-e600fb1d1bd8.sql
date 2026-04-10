
-- Allow guest (anonymous) comments by making user_id nullable
ALTER TABLE public.address_comments ALTER COLUMN user_id DROP NOT NULL;

-- Add guest_name for anonymous commenters
ALTER TABLE public.address_comments ADD COLUMN guest_name text;
