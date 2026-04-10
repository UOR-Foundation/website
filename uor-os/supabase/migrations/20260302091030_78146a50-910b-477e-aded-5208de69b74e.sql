
-- Fix scheduling_bookings: require valid fields on public insert
DROP POLICY IF EXISTS "Anyone can create bookings" ON public.scheduling_bookings;
CREATE POLICY "Anyone can create bookings with valid data"
  ON public.scheduling_bookings
  FOR INSERT
  TO public
  WITH CHECK (
    invitee_email IS NOT NULL AND invitee_email <> '' AND
    invitee_name IS NOT NULL AND invitee_name <> '' AND
    meeting_type_id IS NOT NULL AND
    start_time IS NOT NULL AND
    end_time IS NOT NULL AND
    start_time < end_time AND
    host_user_id IS NOT NULL
  );

-- Fix lead_submissions: require valid email on public insert
DROP POLICY IF EXISTS "Anyone can submit a lead" ON public.lead_submissions;
CREATE POLICY "Anyone can submit a lead with valid email"
  ON public.lead_submissions
  FOR INSERT
  TO public
  WITH CHECK (
    email IS NOT NULL AND email <> '' AND length(email) >= 5
  );
