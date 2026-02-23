
-- Remove public read access to project_submissions (contains PII: contact_email)
-- The project-submit edge function uses service_role key and bypasses RLS,
-- so this does not affect submission functionality.
DROP POLICY IF EXISTS "project_submissions_public_read" ON public.project_submissions;

-- Also restrict anonymous inserts — the edge function handles inserts via service role
DROP POLICY IF EXISTS "project_submissions_anon_insert" ON public.project_submissions;
