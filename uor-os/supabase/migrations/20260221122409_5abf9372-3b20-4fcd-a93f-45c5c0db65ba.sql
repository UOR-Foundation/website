
-- UOR Knowledge Graph Store tables

-- Core datum storage
CREATE TABLE public.uor_datums (
  iri TEXT PRIMARY KEY,
  quantum INTEGER NOT NULL,
  value BIGINT NOT NULL,
  bytes JSONB NOT NULL,
  stratum JSONB NOT NULL,
  total_stratum INTEGER NOT NULL,
  spectrum JSONB NOT NULL,
  glyph TEXT NOT NULL,
  inverse_iri TEXT NOT NULL,
  not_iri TEXT NOT NULL,
  succ_iri TEXT NOT NULL,
  pred_iri TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Derivation records
CREATE TABLE public.uor_derivations (
  derivation_id TEXT PRIMARY KEY,
  result_iri TEXT NOT NULL REFERENCES public.uor_datums(iri),
  canonical_term TEXT NOT NULL,
  original_term TEXT NOT NULL,
  epistemic_grade TEXT NOT NULL,
  metrics JSONB NOT NULL,
  quantum INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Certificates
CREATE TABLE public.uor_certificates (
  certificate_id TEXT PRIMARY KEY,
  certifies_iri TEXT NOT NULL,
  derivation_id TEXT REFERENCES public.uor_derivations(derivation_id),
  valid BOOLEAN NOT NULL DEFAULT true,
  cert_chain JSONB DEFAULT '[]',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Canonical receipts (self-verification audit trail)
CREATE TABLE public.uor_receipts (
  receipt_id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  output_hash TEXT NOT NULL,
  self_verified BOOLEAN NOT NULL,
  coherence_verified BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Knowledge graph triples (for SPARQL-like queries)
CREATE TABLE public.uor_triples (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  predicate TEXT NOT NULL,
  object TEXT NOT NULL,
  graph_iri TEXT NOT NULL DEFAULT 'urn:uor:default',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_triples_subject ON public.uor_triples(subject);
CREATE INDEX idx_triples_predicate ON public.uor_triples(predicate);
CREATE INDEX idx_triples_object ON public.uor_triples(object);

-- RLS: public read, no public write (same pattern as discord_events)
ALTER TABLE public.uor_datums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uor_derivations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uor_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uor_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uor_triples ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "uor_datums_public_read" ON public.uor_datums FOR SELECT USING (true);
CREATE POLICY "uor_derivations_public_read" ON public.uor_derivations FOR SELECT USING (true);
CREATE POLICY "uor_certificates_public_read" ON public.uor_certificates FOR SELECT USING (true);
CREATE POLICY "uor_receipts_public_read" ON public.uor_receipts FOR SELECT USING (true);
CREATE POLICY "uor_triples_public_read" ON public.uor_triples FOR SELECT USING (true);

-- Allow anon inserts (the KG is a public knowledge base, ingested from client)
CREATE POLICY "uor_datums_anon_insert" ON public.uor_datums FOR INSERT WITH CHECK (true);
CREATE POLICY "uor_derivations_anon_insert" ON public.uor_derivations FOR INSERT WITH CHECK (true);
CREATE POLICY "uor_certificates_anon_insert" ON public.uor_certificates FOR INSERT WITH CHECK (true);
CREATE POLICY "uor_receipts_anon_insert" ON public.uor_receipts FOR INSERT WITH CHECK (true);
CREATE POLICY "uor_triples_anon_insert" ON public.uor_triples FOR INSERT WITH CHECK (true);
