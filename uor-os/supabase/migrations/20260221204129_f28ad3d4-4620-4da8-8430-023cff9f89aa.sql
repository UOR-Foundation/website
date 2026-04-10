
-- Gap 1: uor_traces table for trace: namespace
CREATE TABLE public.uor_traces (
  trace_id TEXT NOT NULL PRIMARY KEY,
  derivation_id TEXT,
  operation TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  certified_by TEXT,
  quantum INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.uor_traces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uor_traces_public_read" ON public.uor_traces FOR SELECT USING (true);
CREATE POLICY "uor_traces_anon_insert" ON public.uor_traces FOR INSERT WITH CHECK (true);

-- Gap 2: uor_observables table for observable: namespace
CREATE TABLE public.uor_observables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  observable_iri TEXT NOT NULL,
  value NUMERIC NOT NULL,
  source TEXT NOT NULL,
  stratum INTEGER NOT NULL DEFAULT 0,
  quantum INTEGER NOT NULL DEFAULT 0,
  context_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.uor_observables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uor_observables_public_read" ON public.uor_observables FOR SELECT USING (true);
CREATE POLICY "uor_observables_anon_insert" ON public.uor_observables FOR INSERT WITH CHECK (true);

-- Gap 7: R1 enforcement trigger on uor_triples
CREATE OR REPLACE FUNCTION public.enforce_r1_default_grade()
RETURNS TRIGGER AS $$
BEGIN
  -- If graph_iri is default and no derivation exists for this subject, tag as Grade D
  IF NEW.graph_iri = 'urn:uor:default' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.uor_derivations
      WHERE result_iri = NEW.subject
      LIMIT 1
    ) THEN
      NEW.graph_iri := 'urn:uor:grade:D';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_r1_enforce_grade
  BEFORE INSERT ON public.uor_triples
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_r1_default_grade();
