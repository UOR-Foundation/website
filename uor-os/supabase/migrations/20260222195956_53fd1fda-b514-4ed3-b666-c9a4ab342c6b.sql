
-- Create uor_inference_proofs table for proof-based inference caching
CREATE TABLE public.uor_inference_proofs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proof_id TEXT NOT NULL UNIQUE,
  input_hash TEXT NOT NULL,
  output_hash TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  input_canonical TEXT NOT NULL,
  output_cached TEXT NOT NULL,
  epistemic_grade TEXT NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_hit_at TIMESTAMP WITH TIME ZONE
);

-- Index for fast cache lookup
CREATE INDEX idx_uor_inference_proofs_input_hash ON public.uor_inference_proofs (input_hash);

-- Enable RLS
ALTER TABLE public.uor_inference_proofs ENABLE ROW LEVEL SECURITY;

-- Public read (proofs are verifiable records)
CREATE POLICY "uor_inference_proofs_public_read" ON public.uor_inference_proofs
  FOR SELECT USING (true);

-- Anon insert (edge function uses anon key)
CREATE POLICY "uor_inference_proofs_anon_insert" ON public.uor_inference_proofs
  FOR INSERT WITH CHECK (true);

-- Anon update (for hit_count increment)
CREATE POLICY "uor_inference_proofs_anon_update" ON public.uor_inference_proofs
  FOR UPDATE USING (true) WITH CHECK (true);
