
CREATE TABLE public.uor_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cid text UNIQUE NOT NULL,
  triword text NOT NULL,
  ipv6 text NOT NULL,
  derivation_id text NOT NULL,
  source jsonb NOT NULL,
  receipt jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_uor_objects_triword ON public.uor_objects(triword);
CREATE INDEX idx_uor_objects_ipv6 ON public.uor_objects(ipv6);
CREATE INDEX idx_uor_objects_derivation ON public.uor_objects(derivation_id);

ALTER TABLE public.uor_objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read UOR objects"
  ON public.uor_objects FOR SELECT USING (true);

CREATE POLICY "Anyone can insert UOR objects"
  ON public.uor_objects FOR INSERT WITH CHECK (true);
