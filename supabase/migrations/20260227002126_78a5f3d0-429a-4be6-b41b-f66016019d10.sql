
-- Calendar events table for built-in calendar (sync-ready schema)
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  all_day BOOLEAN NOT NULL DEFAULT false,
  location TEXT,
  color TEXT DEFAULT 'hsl(220, 80%, 56%)',
  source_message_id TEXT,
  source_platform TEXT,
  attendees JSONB DEFAULT '[]'::jsonb,
  recurrence TEXT,
  external_calendar_id TEXT,
  external_event_id TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own events" ON public.calendar_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own events" ON public.calendar_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events" ON public.calendar_events
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events" ON public.calendar_events
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Messenger context graph for private AI enrichment
CREATE TABLE public.messenger_context_graph (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  triple_subject TEXT NOT NULL,
  triple_predicate TEXT NOT NULL,
  triple_object TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'message',
  source_id TEXT,
  confidence NUMERIC NOT NULL DEFAULT 0.5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.messenger_context_graph ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own context" ON public.messenger_context_graph
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own context" ON public.messenger_context_graph
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own context" ON public.messenger_context_graph
  FOR DELETE USING (auth.uid() = user_id);

-- Introduction requests table
CREATE TABLE public.messenger_introductions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  introducer_name TEXT NOT NULL,
  person_a TEXT NOT NULL,
  person_a_email TEXT,
  person_b TEXT NOT NULL,
  person_b_email TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  stay_in_group BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.messenger_introductions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own intros" ON public.messenger_introductions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create intros" ON public.messenger_introductions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own intros" ON public.messenger_introductions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own intros" ON public.messenger_introductions
  FOR DELETE USING (auth.uid() = user_id);
