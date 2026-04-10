CREATE TABLE public.project_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name text NOT NULL,
  repo_url text NOT NULL,
  contact_email text NOT NULL,
  description text NOT NULL,
  problem_statement text NOT NULL,
  status text NOT NULL DEFAULT 'submitted',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_submissions_public_read" ON public.project_submissions FOR SELECT USING (true);
CREATE POLICY "project_submissions_anon_insert" ON public.project_submissions FOR INSERT WITH CHECK (true);