
-- ═══════════════════════════════════════════════════════════════
-- Fix RLS policies: replace (true) on INSERT/UPDATE with
-- explicit auth.role() = 'authenticated' checks.
-- Also remove duplicate public CRUD policies on hologram_sessions.
-- ═══════════════════════════════════════════════════════════════

-- ── agent_compression_witnesses ──
DROP POLICY IF EXISTS "Authenticated users can create witnesses" ON public.agent_compression_witnesses;
CREATE POLICY "Authenticated users can create witnesses" ON public.agent_compression_witnesses
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ── agent_memories ──
DROP POLICY IF EXISTS "Authenticated users can store memories" ON public.agent_memories;
CREATE POLICY "Authenticated users can store memories" ON public.agent_memories
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update memories" ON public.agent_memories;
CREATE POLICY "Authenticated users can update memories" ON public.agent_memories
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ── agent_relationships ──
DROP POLICY IF EXISTS "Authenticated users can create relationships" ON public.agent_relationships;
CREATE POLICY "Authenticated users can create relationships" ON public.agent_relationships
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update relationships" ON public.agent_relationships;
CREATE POLICY "Authenticated users can update relationships" ON public.agent_relationships
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ── agent_session_chains ──
DROP POLICY IF EXISTS "Authenticated users can append session chains" ON public.agent_session_chains;
CREATE POLICY "Authenticated users can append session chains" ON public.agent_session_chains
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ── uor_bindings ──
DROP POLICY IF EXISTS "authenticated_insert_uor_bindings" ON public.uor_bindings;
CREATE POLICY "authenticated_insert_uor_bindings" ON public.uor_bindings
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ── uor_certificates ──
DROP POLICY IF EXISTS "authenticated_insert_uor_certificates" ON public.uor_certificates;
CREATE POLICY "authenticated_insert_uor_certificates" ON public.uor_certificates
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "authenticated_update_uor_certificates" ON public.uor_certificates;
CREATE POLICY "authenticated_update_uor_certificates" ON public.uor_certificates
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ── uor_contexts ──
DROP POLICY IF EXISTS "authenticated_insert_uor_contexts" ON public.uor_contexts;
CREATE POLICY "authenticated_insert_uor_contexts" ON public.uor_contexts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "authenticated_update_uor_contexts" ON public.uor_contexts;
CREATE POLICY "authenticated_update_uor_contexts" ON public.uor_contexts
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ── uor_datums ──
DROP POLICY IF EXISTS "authenticated_insert_uor_datums" ON public.uor_datums;
CREATE POLICY "authenticated_insert_uor_datums" ON public.uor_datums
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "authenticated_update_uor_datums" ON public.uor_datums;
CREATE POLICY "authenticated_update_uor_datums" ON public.uor_datums
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ── uor_derivations ──
DROP POLICY IF EXISTS "authenticated_insert_uor_derivations" ON public.uor_derivations;
CREATE POLICY "authenticated_insert_uor_derivations" ON public.uor_derivations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "authenticated_update_uor_derivations" ON public.uor_derivations;
CREATE POLICY "authenticated_update_uor_derivations" ON public.uor_derivations
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ── uor_frames ──
DROP POLICY IF EXISTS "authenticated_insert_uor_frames" ON public.uor_frames;
CREATE POLICY "authenticated_insert_uor_frames" ON public.uor_frames
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ── uor_inference_proofs ──
DROP POLICY IF EXISTS "authenticated_insert_uor_inference_proofs" ON public.uor_inference_proofs;
CREATE POLICY "authenticated_insert_uor_inference_proofs" ON public.uor_inference_proofs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "authenticated_update_uor_inference_proofs" ON public.uor_inference_proofs;
CREATE POLICY "authenticated_update_uor_inference_proofs" ON public.uor_inference_proofs
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ── uor_observables ──
DROP POLICY IF EXISTS "authenticated_insert_uor_observables" ON public.uor_observables;
CREATE POLICY "authenticated_insert_uor_observables" ON public.uor_observables
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ── uor_observer_outputs ──
DROP POLICY IF EXISTS "authenticated_insert_uor_observer_outputs" ON public.uor_observer_outputs;
CREATE POLICY "authenticated_insert_uor_observer_outputs" ON public.uor_observer_outputs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ── uor_observers ──
DROP POLICY IF EXISTS "Authenticated insert observers" ON public.uor_observers;
CREATE POLICY "Authenticated insert observers" ON public.uor_observers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated update observers" ON public.uor_observers;
CREATE POLICY "Authenticated update observers" ON public.uor_observers
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ── uor_oracle_entries ──
DROP POLICY IF EXISTS "authenticated_insert_uor_oracle_entries" ON public.uor_oracle_entries;
CREATE POLICY "authenticated_insert_uor_oracle_entries" ON public.uor_oracle_entries
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ── uor_receipts ──
DROP POLICY IF EXISTS "authenticated_insert_uor_receipts" ON public.uor_receipts;
CREATE POLICY "authenticated_insert_uor_receipts" ON public.uor_receipts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "authenticated_update_uor_receipts" ON public.uor_receipts;
CREATE POLICY "authenticated_update_uor_receipts" ON public.uor_receipts
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ── uor_state_frames ──
DROP POLICY IF EXISTS "authenticated_insert_uor_state_frames" ON public.uor_state_frames;
CREATE POLICY "authenticated_insert_uor_state_frames" ON public.uor_state_frames
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "authenticated_update_uor_state_frames" ON public.uor_state_frames;
CREATE POLICY "authenticated_update_uor_state_frames" ON public.uor_state_frames
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ── uor_traces ──
DROP POLICY IF EXISTS "authenticated_insert_uor_traces" ON public.uor_traces;
CREATE POLICY "authenticated_insert_uor_traces" ON public.uor_traces
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ── uor_transitions ──
DROP POLICY IF EXISTS "authenticated_insert_uor_transitions" ON public.uor_transitions;
CREATE POLICY "authenticated_insert_uor_transitions" ON public.uor_transitions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ── uor_triples ──
DROP POLICY IF EXISTS "authenticated_insert_uor_triples" ON public.uor_triples;
CREATE POLICY "authenticated_insert_uor_triples" ON public.uor_triples
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "authenticated_update_uor_triples" ON public.uor_triples;
CREATE POLICY "authenticated_update_uor_triples" ON public.uor_triples
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ── hologram_sessions: remove duplicate public policies, keep user-scoped ones ──
DROP POLICY IF EXISTS "Public delete hologram sessions" ON public.hologram_sessions;
DROP POLICY IF EXISTS "Public insert hologram sessions" ON public.hologram_sessions;
DROP POLICY IF EXISTS "Public read hologram sessions" ON public.hologram_sessions;
DROP POLICY IF EXISTS "Public update hologram sessions" ON public.hologram_sessions;
