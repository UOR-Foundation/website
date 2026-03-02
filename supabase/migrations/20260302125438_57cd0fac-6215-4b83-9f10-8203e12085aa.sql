
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.scheduling_bookings;

CREATE POLICY "Users can view their own bookings"
ON public.scheduling_bookings
FOR SELECT
TO authenticated
USING (auth.uid() = host_user_id);
