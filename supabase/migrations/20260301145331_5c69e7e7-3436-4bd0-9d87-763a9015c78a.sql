
-- Trust connections table for mutual trust ceremony
CREATE TABLE public.trust_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL,
  responder_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requester_attestation TEXT,
  responder_attestation TEXT,
  ceremony_cid TEXT,
  trust_level INTEGER NOT NULL DEFAULT 0,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_connection UNIQUE (requester_id, responder_id),
  CONSTRAINT no_self_connect CHECK (requester_id != responder_id)
);

-- Enable RLS
ALTER TABLE public.trust_connections ENABLE ROW LEVEL SECURITY;

-- Users can see connections they are part of
CREATE POLICY "Users can read own connections"
  ON public.trust_connections FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = responder_id);

-- Users can create connection requests
CREATE POLICY "Users can create connection requests"
  ON public.trust_connections FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

-- Users can update connections they are part of (accept/reject)
CREATE POLICY "Users can update own connections"
  ON public.trust_connections FOR UPDATE
  USING (auth.uid() = requester_id OR auth.uid() = responder_id);

-- Users can delete connections they created or received
CREATE POLICY "Users can delete own connections"
  ON public.trust_connections FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = responder_id);

-- Trigger for updated_at
CREATE TRIGGER update_trust_connections_updated_at
  BEFORE UPDATE ON public.trust_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to search profiles by handle (limited disclosure)
CREATE OR REPLACE FUNCTION public.search_profiles_by_handle(search_handle TEXT)
RETURNS TABLE(user_id UUID, display_name TEXT, handle TEXT, uor_glyph TEXT, avatar_url TEXT)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.user_id, p.display_name, p.handle, p.uor_glyph, p.avatar_url
  FROM public.profiles p
  WHERE p.handle ILIKE '%' || search_handle || '%'
  LIMIT 10;
$$;
