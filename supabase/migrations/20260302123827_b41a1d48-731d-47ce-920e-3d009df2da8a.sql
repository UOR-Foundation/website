
-- Mirror Protocol: Inter-agent coherence bonds
CREATE TABLE public.mirror_bonds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL,
  target_agent_id text NOT NULL,
  
  -- Coherence modeling
  predicted_h_score numeric NOT NULL DEFAULT 0,
  actual_h_score numeric NOT NULL DEFAULT 0,
  prediction_error numeric NOT NULL DEFAULT 1.0,
  empathy_score numeric NOT NULL DEFAULT 0,
  
  -- Habit sharing
  shared_habit_ids text[] NOT NULL DEFAULT '{}',
  shared_habit_count integer NOT NULL DEFAULT 0,
  
  -- Bond metadata
  bond_strength numeric NOT NULL DEFAULT 0,
  interaction_count integer NOT NULL DEFAULT 0,
  last_sync_at timestamp with time zone,
  status text NOT NULL DEFAULT 'observing',
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  UNIQUE(agent_id, target_agent_id)
);

ALTER TABLE public.mirror_bonds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read mirror bonds"
ON public.mirror_bonds FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create mirror bonds"
ON public.mirror_bonds FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update mirror bonds"
ON public.mirror_bonds FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE INDEX idx_mirror_bonds_agent ON public.mirror_bonds (agent_id, status);
CREATE INDEX idx_mirror_bonds_empathy ON public.mirror_bonds (empathy_score DESC);

CREATE TRIGGER update_mirror_bonds_updated_at
BEFORE UPDATE ON public.mirror_bonds
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
