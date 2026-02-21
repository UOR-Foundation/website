
-- Drop problematic ALL-command policies and recreate with specific commands
DROP POLICY IF EXISTS "uor_derivations_anon_insert" ON public.uor_derivations;
DROP POLICY IF EXISTS "uor_datums_anon_insert" ON public.uor_datums;
DROP POLICY IF EXISTS "uor_receipts_anon_insert" ON public.uor_receipts;
DROP POLICY IF EXISTS "uor_certificates_anon_insert" ON public.uor_certificates;
DROP POLICY IF EXISTS "uor_triples_anon_insert" ON public.uor_triples;

-- Recreate as INSERT-specific policies
CREATE POLICY "uor_derivations_anon_insert" ON public.uor_derivations FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "uor_datums_anon_insert" ON public.uor_datums FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "uor_receipts_anon_insert" ON public.uor_receipts FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "uor_certificates_anon_insert" ON public.uor_certificates FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "uor_triples_anon_insert" ON public.uor_triples FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Add UPDATE policies for upserts (ON CONFLICT DO UPDATE)
CREATE POLICY "uor_derivations_anon_update" ON public.uor_derivations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "uor_datums_anon_update" ON public.uor_datums FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "uor_receipts_anon_update" ON public.uor_receipts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "uor_certificates_anon_update" ON public.uor_certificates FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "uor_triples_anon_update" ON public.uor_triples FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
