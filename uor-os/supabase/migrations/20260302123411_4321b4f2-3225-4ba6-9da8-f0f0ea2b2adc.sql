
-- Procedural Memory: Habit Kernels table
-- Stores learned reasoning patterns promoted from reward traces

CREATE TABLE public.habit_kernels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL,
  habit_id text NOT NULL UNIQUE,
  name text NOT NULL DEFAULT 'Unnamed Habit',
  description text,
  
  -- Pattern signature (hash of the recurring action sequence)
  pattern_hash text NOT NULL,
  pattern_actions text[] NOT NULL DEFAULT '{}',
  
  -- Compiled circuit template (JSON DAG)
  circuit_template jsonb NOT NULL DEFAULT '{}',
  
  -- Performance metrics
  fire_count integer NOT NULL DEFAULT 0,
  success_count integer NOT NULL DEFAULT 0,
  success_rate numeric NOT NULL DEFAULT 0,
  avg_reward numeric NOT NULL DEFAULT 0,
  total_time_saved_ms integer NOT NULL DEFAULT 0,
  acceleration_factor numeric NOT NULL DEFAULT 1.0,
  
  -- Promotion criteria
  min_reward_threshold numeric NOT NULL DEFAULT 0.3,
  consecutive_successes integer NOT NULL DEFAULT 0,
  promoted_at timestamp with time zone,
  
  -- Status: candidate -> active -> retired
  status text NOT NULL DEFAULT 'candidate',
  
  -- Lineage
  source_session_cids text[] NOT NULL DEFAULT '{}',
  epistemic_grade text NOT NULL DEFAULT 'D',
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.habit_kernels ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can manage habits (agent-scoped)
CREATE POLICY "Authenticated users can read habits"
ON public.habit_kernels FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create habits"
ON public.habit_kernels FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update habits"
ON public.habit_kernels FOR UPDATE
USING (auth.role() = 'authenticated');

-- Index for pattern lookups
CREATE INDEX idx_habit_kernels_pattern ON public.habit_kernels (pattern_hash);
CREATE INDEX idx_habit_kernels_agent ON public.habit_kernels (agent_id, status);

-- Trigger for updated_at
CREATE TRIGGER update_habit_kernels_updated_at
BEFORE UPDATE ON public.habit_kernels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
