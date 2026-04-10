
-- Force RLS on project_submissions so even table owners are subject to policies
ALTER TABLE public.project_submissions FORCE ROW LEVEL SECURITY;
