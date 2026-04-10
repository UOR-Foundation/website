-- Explicitly block all writes from public/anon on discord_events
-- This documents intent rather than relying on implicit RLS default behavior
CREATE POLICY "No public writes to discord_events"
ON public.discord_events
FOR ALL
TO anon
USING (false)
WITH CHECK (false);