-- 1. lead_submissions: explicitly deny SELECT for non-service-role
DROP POLICY IF EXISTS "Service role can read submissions" ON public.lead_submissions;
CREATE POLICY "Only service role can read submissions"
  ON public.lead_submissions FOR SELECT
  USING ((auth.jwt() ->> 'role') = 'service_role');

-- 2. agent_memories: owner-scoped INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Authenticated users can store memories" ON public.agent_memories;
DROP POLICY IF EXISTS "Authenticated users can update memories" ON public.agent_memories;
DROP POLICY IF EXISTS "Authenticated users can delete memories" ON public.agent_memories;
DROP POLICY IF EXISTS "Users can store own agent memories" ON public.agent_memories;
DROP POLICY IF EXISTS "Users can update own agent memories" ON public.agent_memories;
DROP POLICY IF EXISTS "Users can delete own agent memories" ON public.agent_memories;

CREATE POLICY "Users can store own agent memories"
  ON public.agent_memories FOR INSERT
  TO authenticated
  WITH CHECK (agent_id = (auth.uid())::text);

CREATE POLICY "Users can update own agent memories"
  ON public.agent_memories FOR UPDATE
  TO authenticated
  USING (agent_id = (auth.uid())::text)
  WITH CHECK (agent_id = (auth.uid())::text);

CREATE POLICY "Users can delete own agent memories"
  ON public.agent_memories FOR DELETE
  TO authenticated
  USING (agent_id = (auth.uid())::text);

-- 3. encrypted-files storage: restrict reads to session participants
DROP POLICY IF EXISTS "Session participants can read shared encrypted files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read own encrypted files" ON storage.objects;

CREATE POLICY "Owners can read their encrypted files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'encrypted-files'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

CREATE POLICY "Session participants can read shared encrypted files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'encrypted-files'
    AND EXISTS (
      SELECT 1
      FROM public.folder_entries fe
      JOIN public.shared_folders sf ON sf.id = fe.folder_id
      JOIN public.conduit_sessions cs ON cs.id = sf.session_id
      WHERE fe.file_cid = storage.objects.name
        AND auth.uid() = ANY(cs.participants)
    )
  );

-- 4. app-assets storage: user folder isolation
DROP POLICY IF EXISTS "Authenticated users can upload app assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update app assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete app assets" ON storage.objects;

CREATE POLICY "Users can upload to own app-assets folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'app-assets'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

CREATE POLICY "Users can update files in own app-assets folder"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'app-assets'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'app-assets'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

CREATE POLICY "Users can delete files in own app-assets folder"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'app-assets'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- Add file size + mime restrictions on app-assets (5 MB, images only)
UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/png','image/jpeg','image/webp','image/gif','image/svg+xml']
WHERE id = 'app-assets';