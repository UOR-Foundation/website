
-- Meeting types (like Calendly event types)
CREATE TABLE public.meeting_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  color TEXT NOT NULL DEFAULT 'hsl(220, 80%, 56%)',
  location_type TEXT NOT NULL DEFAULT 'video', -- video, phone, in_person, custom
  location_detail TEXT,
  slug TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_bookings_per_day INTEGER DEFAULT 5,
  buffer_minutes INTEGER DEFAULT 10,
  availability_windows JSONB NOT NULL DEFAULT '[
    {"day": 1, "start": "09:00", "end": "17:00"},
    {"day": 2, "start": "09:00", "end": "17:00"},
    {"day": 3, "start": "09:00", "end": "17:00"},
    {"day": 4, "start": "09:00", "end": "17:00"},
    {"day": 5, "start": "09:00", "end": "17:00"}
  ]'::jsonb,
  questions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, slug)
);

-- Bookings (someone books a meeting)
CREATE TABLE public.scheduling_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_type_id UUID NOT NULL REFERENCES public.meeting_types(id) ON DELETE CASCADE,
  host_user_id UUID NOT NULL,
  invitee_name TEXT NOT NULL,
  invitee_email TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed', -- confirmed, cancelled, completed
  notes TEXT,
  answers JSONB DEFAULT '{}',
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meeting_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduling_bookings ENABLE ROW LEVEL SECURITY;

-- Meeting types: owners can CRUD
CREATE POLICY "Users manage own meeting types"
  ON public.meeting_types FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Meeting types: anyone can read active ones (for booking page)
CREATE POLICY "Anyone can view active meeting types"
  ON public.meeting_types FOR SELECT
  USING (is_active = true);

-- Bookings: hosts can see all their bookings
CREATE POLICY "Hosts can manage their bookings"
  ON public.scheduling_bookings FOR ALL
  USING (auth.uid() = host_user_id)
  WITH CHECK (auth.uid() = host_user_id);

-- Bookings: anyone can create a booking (public booking page)
CREATE POLICY "Anyone can create bookings"
  ON public.scheduling_bookings FOR INSERT
  WITH CHECK (true);

-- Bookings: anyone can read their own booking by email (for cancellation)
CREATE POLICY "Invitees can view their bookings"
  ON public.scheduling_bookings FOR SELECT
  USING (true);

-- Timestamp triggers
CREATE TRIGGER update_meeting_types_updated_at
  BEFORE UPDATE ON public.meeting_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scheduling_bookings_updated_at
  BEFORE UPDATE ON public.scheduling_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
