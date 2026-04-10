
-- Add restrictive RLS policies to project_submissions
-- Service role key (used by edge function) bypasses RLS, so these deny public access

-- Allow no public reads (contains contact_email PII)
CREATE POLICY "deny_public_select_project_submissions"
  ON public.project_submissions FOR SELECT
  TO anon, authenticated
  USING (false);

-- Allow no public writes (edge function uses service role)
CREATE POLICY "deny_public_write_project_submissions"
  ON public.project_submissions FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
