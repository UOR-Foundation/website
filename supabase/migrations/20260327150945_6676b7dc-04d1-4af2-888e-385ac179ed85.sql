-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Memories are publicly readable" ON public.agent_memories;

-- Create a scoped policy: users can only read their own agent memories
CREATE POLICY "Users can read own agent memories"
  ON public.agent_memories
  FOR SELECT
  TO authenticated
  USING (agent_id = auth.uid()::text);