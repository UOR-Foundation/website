
CREATE TABLE IF NOT EXISTS public.discord_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT 'Virtual',
  type TEXT NOT NULL DEFAULT 'Community Call',
  discord_link TEXT,
  calendar_date TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.discord_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Discord events are publicly readable"
  ON public.discord_events
  FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage discord events"
  ON public.discord_events
  FOR ALL
  USING (true)
  WITH CHECK (true);
