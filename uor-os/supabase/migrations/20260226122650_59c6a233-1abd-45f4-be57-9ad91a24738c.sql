-- Add privacy rules column to profiles table
ALTER TABLE public.profiles
ADD COLUMN privacy_rules jsonb DEFAULT NULL;

-- Existing RLS policies on profiles already restrict read/update to own user