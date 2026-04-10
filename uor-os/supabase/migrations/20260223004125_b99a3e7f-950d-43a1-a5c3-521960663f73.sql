
-- UOR Oracle: Single source of truth for every encoding into UOR space
CREATE TABLE public.uor_oracle_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id TEXT NOT NULL UNIQUE,
  operation TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_label TEXT,
  derivation_id TEXT,
  uor_cid TEXT,
  pinata_cid TEXT,
  storacha_cid TEXT,
  gateway_url TEXT,
  sha256_hash TEXT,
  byte_length INTEGER,
  epistemic_grade TEXT DEFAULT 'D',
  source_endpoint TEXT NOT NULL,
  quantum_level INTEGER DEFAULT 0,
  encoding_format TEXT DEFAULT 'URDNA2015',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_oracle_created_at ON public.uor_oracle_entries (created_at DESC);
CREATE INDEX idx_oracle_object_type ON public.uor_oracle_entries (object_type);
CREATE INDEX idx_oracle_derivation_id ON public.uor_oracle_entries (derivation_id);
CREATE INDEX idx_oracle_operation ON public.uor_oracle_entries (operation);

-- RLS: public read, anon insert (edge functions write)
ALTER TABLE public.uor_oracle_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uor_oracle_public_read" ON public.uor_oracle_entries
  FOR SELECT USING (true);

CREATE POLICY "uor_oracle_anon_insert" ON public.uor_oracle_entries
  FOR INSERT WITH CHECK (true);
