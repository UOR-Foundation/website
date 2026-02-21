
-- State frames table for persisting state computations
CREATE TABLE public.uor_state_frames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  value integer NOT NULL,
  quantum integer NOT NULL DEFAULT 0,
  component text NOT NULL,
  is_stable_entry boolean NOT NULL DEFAULT false,
  is_phase_boundary boolean NOT NULL DEFAULT false,
  transition_count integer NOT NULL DEFAULT 0,
  critical_identity_holds boolean NOT NULL DEFAULT true,
  frame_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.uor_state_frames ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "uor_state_frames_public_read" ON public.uor_state_frames FOR SELECT USING (true);
-- Public insert
CREATE POLICY "uor_state_frames_anon_insert" ON public.uor_state_frames FOR INSERT TO anon, authenticated WITH CHECK (true);
-- Public update for upserts
CREATE POLICY "uor_state_frames_anon_update" ON public.uor_state_frames FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Index for lookups
CREATE INDEX idx_state_frames_value_quantum ON public.uor_state_frames (value, quantum);
