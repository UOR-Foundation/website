
-- 1. get_peer_profiles: SECURITY DEFINER function to resolve peer profiles
CREATE OR REPLACE FUNCTION public.get_peer_profiles(peer_ids uuid[])
RETURNS TABLE(user_id uuid, display_name text, handle text, avatar_url text, uor_glyph text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT p.user_id, p.display_name, p.handle, p.avatar_url, p.uor_glyph
  FROM public.profiles p WHERE p.user_id = ANY(peer_ids);
$$;

-- 2. Add message_type, file_manifest, reply_to_hash to encrypted_messages
ALTER TABLE public.encrypted_messages
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS file_manifest jsonb,
  ADD COLUMN IF NOT EXISTS reply_to_hash text,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- 3. Allow participants to UPDATE delivered_at and read_at on messages
CREATE POLICY "Session participants can mark messages delivered/read"
ON public.encrypted_messages
FOR UPDATE
TO authenticated
USING (is_session_participant(auth.uid(), session_id))
WITH CHECK (is_session_participant(auth.uid(), session_id));

-- 4. Add expires_after_seconds to conduit_sessions
ALTER TABLE public.conduit_sessions
  ADD COLUMN IF NOT EXISTS expires_after_seconds integer;

-- 5. Create encrypted-files storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('encrypted-files', 'encrypted-files', false)
ON CONFLICT (id) DO NOTHING;

-- 6. Storage policies for encrypted-files
CREATE POLICY "Authenticated users can upload encrypted files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'encrypted-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Authenticated users can read own encrypted files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'encrypted-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Session participants can read shared encrypted files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'encrypted-files');

CREATE POLICY "Users can delete own encrypted files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'encrypted-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 7. Index for faster message queries
CREATE INDEX IF NOT EXISTS idx_encrypted_messages_message_type ON public.encrypted_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_encrypted_messages_reply_to ON public.encrypted_messages(reply_to_hash) WHERE reply_to_hash IS NOT NULL;
