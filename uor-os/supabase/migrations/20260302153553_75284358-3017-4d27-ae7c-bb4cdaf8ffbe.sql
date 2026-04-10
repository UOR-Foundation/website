
-- Add phone_hash for anonymous connection identification and context_encrypted flag
ALTER TABLE public.whatsapp_connections
  ADD COLUMN IF NOT EXISTS phone_hash TEXT,
  ADD COLUMN IF NOT EXISTS context_encrypted BOOLEAN NOT NULL DEFAULT false;

-- Index for fast anonymous lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_phone_hash
  ON public.whatsapp_connections (phone_hash)
  WHERE phone_hash IS NOT NULL;

-- Allow user_id to be nullable (anonymous connections)
ALTER TABLE public.whatsapp_connections
  ALTER COLUMN user_id DROP NOT NULL;

-- Update RLS: allow anonymous inserts via edge function (service role handles this)
-- But allow authenticated users to read their own connections
DROP POLICY IF EXISTS "Users can view their own whatsapp_connections" ON public.whatsapp_connections;
CREATE POLICY "Users can view their own whatsapp_connections"
  ON public.whatsapp_connections
  FOR SELECT
  USING (auth.uid() = user_id);
