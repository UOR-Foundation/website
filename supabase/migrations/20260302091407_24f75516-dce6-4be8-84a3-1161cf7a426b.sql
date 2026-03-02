
-- Fix: restrict booking reads to host or invitee only
DROP POLICY IF EXISTS "Invitees can view their bookings" ON public.scheduling_bookings;
CREATE POLICY "Users can view their own bookings"
  ON public.scheduling_bookings
  FOR SELECT
  USING (
    auth.uid() = host_user_id
    OR invitee_email = auth.email()
  );
