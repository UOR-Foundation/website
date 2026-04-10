
-- Hologram OS Session Persistence
-- Stores suspended (dehydrated) sessions so processes survive browser reloads.
-- Each row is a content-addressed SuspendedSession envelope.

CREATE TABLE public.hologram_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  -- Content-addressed identity of the suspended state
  session_cid TEXT NOT NULL,
  session_hex TEXT NOT NULL,
  -- The blueprint that spawned this process (needed for resume)
  blueprint JSONB NOT NULL,
  -- The full suspended session envelope (history, tree snapshot, metadata)
  envelope JSONB NOT NULL,
  -- Human-readable label for the process
  label TEXT NOT NULL DEFAULT 'Hologram Process',
  -- Process status at time of save
  status TEXT NOT NULL DEFAULT 'suspended',
  -- Tick count at time of save
  tick_count INTEGER NOT NULL DEFAULT 0,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hologram_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own sessions
CREATE POLICY "Users can read own hologram sessions"
  ON public.hologram_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own hologram sessions"
  ON public.hologram_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own hologram sessions"
  ON public.hologram_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own hologram sessions"
  ON public.hologram_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Allow anonymous/public read for unauthenticated demo use
CREATE POLICY "Public read hologram sessions"
  ON public.hologram_sessions FOR SELECT
  USING (true);

CREATE POLICY "Public insert hologram sessions"
  ON public.hologram_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update hologram sessions"
  ON public.hologram_sessions FOR UPDATE
  USING (true);

CREATE POLICY "Public delete hologram sessions"
  ON public.hologram_sessions FOR DELETE
  USING (true);

-- Index for fast user lookups
CREATE INDEX idx_hologram_sessions_user ON public.hologram_sessions (user_id);
CREATE INDEX idx_hologram_sessions_cid ON public.hologram_sessions (session_cid);

-- Auto-update timestamp trigger
CREATE TRIGGER update_hologram_sessions_updated_at
  BEFORE UPDATE ON public.hologram_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
