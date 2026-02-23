
-- Drop the overly permissive public update policy on uor_observers
DROP POLICY IF EXISTS "Public update observers" ON public.uor_observers;

-- Drop the overly permissive public insert policy on uor_observers
DROP POLICY IF EXISTS "Public insert observers" ON public.uor_observers;

-- Create restricted update policy: only authenticated users can update
CREATE POLICY "Authenticated update observers"
ON public.uor_observers FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Create restricted insert policy: only authenticated users can insert
CREATE POLICY "Authenticated insert observers"
ON public.uor_observers FOR INSERT
TO authenticated
WITH CHECK (true);
