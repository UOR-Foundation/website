
-- Drop the overly permissive all-operations policy and replace with service role check
DROP POLICY IF EXISTS "Service role can manage discord events" ON public.discord_events;

-- Service role bypass RLS entirely, so we just need to restrict anon/authenticated from writing
-- The edge function uses the service role key, so it bypasses RLS automatically
-- We only need the public SELECT policy for the frontend
