
-- Observer Theory: Persistent observer state and output tracking
CREATE TABLE public.uor_observers (
  agent_id TEXT PRIMARY KEY,
  quantum_level INTEGER NOT NULL DEFAULT 0,
  capacity INTEGER NOT NULL DEFAULT 8,
  persistence DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  field_of_observation TEXT[] NOT NULL DEFAULT ARRAY['https://uor.foundation/graph/q0'],
  zone TEXT NOT NULL DEFAULT 'COHERENCE' CHECK (zone IN ('COHERENCE', 'DRIFT', 'COLLAPSE')),
  h_score_mean DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  grade_a_rate DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  founding_derivation_id TEXT NOT NULL,
  zone_transition_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.uor_observer_outputs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES public.uor_observers(agent_id) ON DELETE CASCADE,
  epistemic_grade TEXT NOT NULL DEFAULT 'D' CHECK (epistemic_grade IN ('A', 'B', 'C', 'D')),
  h_score INTEGER NOT NULL DEFAULT 0,
  derivation_id TEXT,
  output_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_observer_outputs_agent ON public.uor_observer_outputs(agent_id, created_at DESC);
CREATE INDEX idx_observer_zone ON public.uor_observers(zone);

-- RLS: public read, authenticated write (agents self-register)
ALTER TABLE public.uor_observers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uor_observer_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read observers" ON public.uor_observers FOR SELECT USING (true);
CREATE POLICY "Public insert observers" ON public.uor_observers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update observers" ON public.uor_observers FOR UPDATE USING (true);

CREATE POLICY "Public read observer outputs" ON public.uor_observer_outputs FOR SELECT USING (true);
CREATE POLICY "Public insert observer outputs" ON public.uor_observer_outputs FOR INSERT WITH CHECK (true);
