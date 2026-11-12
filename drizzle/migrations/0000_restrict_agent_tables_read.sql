DROP POLICY IF EXISTS "Session chains are publicly readable" ON public.agent_session_chains;
DROP POLICY IF EXISTS "Compression witnesses are publicly readable" ON public.agent_compression_witnesses;
DROP POLICY IF EXISTS "Relationships are publicly readable" ON public.agent_relationships;
REVOKE SELECT ON public.agent_session_chains, public.agent_compression_witnesses, public.agent_relationships FROM anon;
CREATE POLICY "Signed-in users can read session chains" ON public.agent_session_chains FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Signed-in users can read compression witnesses" ON public.agent_compression_witnesses FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Signed-in users can read relationships" ON public.agent_relationships FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);