
-- ============================================================
-- Restrict all UOR table writes to authenticated users only.
-- Edge functions use service_role key and bypass RLS entirely,
-- so this does NOT break any existing backend functionality.
-- ============================================================

-- uor_derivations
DROP POLICY IF EXISTS "uor_derivations_anon_insert" ON public.uor_derivations;
DROP POLICY IF EXISTS "uor_derivations_anon_update" ON public.uor_derivations;
CREATE POLICY "authenticated_insert_uor_derivations" ON public.uor_derivations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_uor_derivations" ON public.uor_derivations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- uor_datums
DROP POLICY IF EXISTS "uor_datums_anon_insert" ON public.uor_datums;
DROP POLICY IF EXISTS "uor_datums_anon_update" ON public.uor_datums;
CREATE POLICY "authenticated_insert_uor_datums" ON public.uor_datums FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_uor_datums" ON public.uor_datums FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- uor_receipts
DROP POLICY IF EXISTS "uor_receipts_anon_insert" ON public.uor_receipts;
DROP POLICY IF EXISTS "uor_receipts_anon_update" ON public.uor_receipts;
CREATE POLICY "authenticated_insert_uor_receipts" ON public.uor_receipts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_uor_receipts" ON public.uor_receipts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- uor_certificates
DROP POLICY IF EXISTS "uor_certificates_anon_insert" ON public.uor_certificates;
DROP POLICY IF EXISTS "uor_certificates_anon_update" ON public.uor_certificates;
CREATE POLICY "authenticated_insert_uor_certificates" ON public.uor_certificates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_uor_certificates" ON public.uor_certificates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- uor_triples
DROP POLICY IF EXISTS "uor_triples_anon_insert" ON public.uor_triples;
DROP POLICY IF EXISTS "uor_triples_anon_update" ON public.uor_triples;
CREATE POLICY "authenticated_insert_uor_triples" ON public.uor_triples FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_uor_triples" ON public.uor_triples FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- uor_state_frames
DROP POLICY IF EXISTS "uor_state_frames_anon_insert" ON public.uor_state_frames;
DROP POLICY IF EXISTS "uor_state_frames_anon_update" ON public.uor_state_frames;
CREATE POLICY "authenticated_insert_uor_state_frames" ON public.uor_state_frames FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_uor_state_frames" ON public.uor_state_frames FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- uor_contexts
DROP POLICY IF EXISTS "uor_contexts_anon_insert" ON public.uor_contexts;
DROP POLICY IF EXISTS "uor_contexts_anon_update" ON public.uor_contexts;
CREATE POLICY "authenticated_insert_uor_contexts" ON public.uor_contexts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_uor_contexts" ON public.uor_contexts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- uor_bindings
DROP POLICY IF EXISTS "uor_bindings_anon_insert" ON public.uor_bindings;
CREATE POLICY "authenticated_insert_uor_bindings" ON public.uor_bindings FOR INSERT TO authenticated WITH CHECK (true);

-- uor_frames
DROP POLICY IF EXISTS "uor_frames_anon_insert" ON public.uor_frames;
CREATE POLICY "authenticated_insert_uor_frames" ON public.uor_frames FOR INSERT TO authenticated WITH CHECK (true);

-- uor_transitions
DROP POLICY IF EXISTS "uor_transitions_anon_insert" ON public.uor_transitions;
CREATE POLICY "authenticated_insert_uor_transitions" ON public.uor_transitions FOR INSERT TO authenticated WITH CHECK (true);

-- uor_traces
DROP POLICY IF EXISTS "uor_traces_anon_insert" ON public.uor_traces;
CREATE POLICY "authenticated_insert_uor_traces" ON public.uor_traces FOR INSERT TO authenticated WITH CHECK (true);

-- uor_observables
DROP POLICY IF EXISTS "uor_observables_anon_insert" ON public.uor_observables;
CREATE POLICY "authenticated_insert_uor_observables" ON public.uor_observables FOR INSERT TO authenticated WITH CHECK (true);

-- uor_observer_outputs
DROP POLICY IF EXISTS "Public insert observer outputs" ON public.uor_observer_outputs;
CREATE POLICY "authenticated_insert_uor_observer_outputs" ON public.uor_observer_outputs FOR INSERT TO authenticated WITH CHECK (true);

-- uor_inference_proofs
DROP POLICY IF EXISTS "uor_inference_proofs_anon_insert" ON public.uor_inference_proofs;
DROP POLICY IF EXISTS "uor_inference_proofs_anon_update" ON public.uor_inference_proofs;
CREATE POLICY "authenticated_insert_uor_inference_proofs" ON public.uor_inference_proofs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_uor_inference_proofs" ON public.uor_inference_proofs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- uor_oracle_entries
DROP POLICY IF EXISTS "uor_oracle_anon_insert" ON public.uor_oracle_entries;
CREATE POLICY "authenticated_insert_uor_oracle_entries" ON public.uor_oracle_entries FOR INSERT TO authenticated WITH CHECK (true);
