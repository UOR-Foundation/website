
-- Table for persisting Atlas verification reports as certified proofs
CREATE TABLE public.atlas_verification_proofs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proof_id text NOT NULL UNIQUE,
  phase text NOT NULL,
  test_suite text NOT NULL,
  tests_passed integer NOT NULL DEFAULT 0,
  tests_total integer NOT NULL DEFAULT 0,
  all_passed boolean NOT NULL DEFAULT false,
  summary text NOT NULL,
  test_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  derivation_hash text NOT NULL,
  canonical_timestamp text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.atlas_verification_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Atlas proofs are publicly readable"
  ON public.atlas_verification_proofs FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert proofs"
  ON public.atlas_verification_proofs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated'::text);
