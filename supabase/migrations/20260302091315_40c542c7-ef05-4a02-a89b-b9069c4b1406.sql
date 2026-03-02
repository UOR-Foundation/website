
-- Lock down UOR table reads to authenticated users only

-- uor_datums
DROP POLICY IF EXISTS "uor_datums_public_read" ON public.uor_datums;
CREATE POLICY "uor_datums_authenticated_read" ON public.uor_datums FOR SELECT USING (auth.role() = 'authenticated');

-- uor_derivations
DROP POLICY IF EXISTS "uor_derivations_public_read" ON public.uor_derivations;
CREATE POLICY "uor_derivations_authenticated_read" ON public.uor_derivations FOR SELECT USING (auth.role() = 'authenticated');

-- uor_certificates
DROP POLICY IF EXISTS "uor_certificates_public_read" ON public.uor_certificates;
CREATE POLICY "uor_certificates_authenticated_read" ON public.uor_certificates FOR SELECT USING (auth.role() = 'authenticated');

-- uor_receipts
DROP POLICY IF EXISTS "uor_receipts_public_read" ON public.uor_receipts;
CREATE POLICY "uor_receipts_authenticated_read" ON public.uor_receipts FOR SELECT USING (auth.role() = 'authenticated');

-- uor_triples
DROP POLICY IF EXISTS "uor_triples_public_read" ON public.uor_triples;
CREATE POLICY "uor_triples_authenticated_read" ON public.uor_triples FOR SELECT USING (auth.role() = 'authenticated');

-- uor_traces
DROP POLICY IF EXISTS "uor_traces_public_read" ON public.uor_traces;
CREATE POLICY "uor_traces_authenticated_read" ON public.uor_traces FOR SELECT USING (auth.role() = 'authenticated');

-- uor_observers
DROP POLICY IF EXISTS "Public read observers" ON public.uor_observers;
CREATE POLICY "uor_observers_authenticated_read" ON public.uor_observers FOR SELECT USING (auth.role() = 'authenticated');

-- uor_observables
DROP POLICY IF EXISTS "uor_observables_public_read" ON public.uor_observables;
CREATE POLICY "uor_observables_authenticated_read" ON public.uor_observables FOR SELECT USING (auth.role() = 'authenticated');

-- uor_oracle_entries
DROP POLICY IF EXISTS "uor_oracle_public_read" ON public.uor_oracle_entries;
CREATE POLICY "uor_oracle_entries_authenticated_read" ON public.uor_oracle_entries FOR SELECT USING (auth.role() = 'authenticated');

-- uor_inference_proofs
DROP POLICY IF EXISTS "uor_inference_proofs_public_read" ON public.uor_inference_proofs;
CREATE POLICY "uor_inference_proofs_authenticated_read" ON public.uor_inference_proofs FOR SELECT USING (auth.role() = 'authenticated');

-- uor_state_frames
DROP POLICY IF EXISTS "uor_state_frames_public_read" ON public.uor_state_frames;
CREATE POLICY "uor_state_frames_authenticated_read" ON public.uor_state_frames FOR SELECT USING (auth.role() = 'authenticated');
