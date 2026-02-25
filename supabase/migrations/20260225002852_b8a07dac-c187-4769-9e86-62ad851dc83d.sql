
-- Create helper function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Lens Blueprints table
CREATE TABLE public.lens_blueprints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  uor_cid TEXT NOT NULL UNIQUE,
  uor_address TEXT NOT NULL,
  derivation_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  problem_statement TEXT,
  version TEXT NOT NULL DEFAULT '1.0.0',
  morphism TEXT NOT NULL DEFAULT 'transform',
  tags TEXT[] DEFAULT '{}',
  blueprint JSONB NOT NULL,
  author_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lens_blueprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lens blueprints are publicly readable"
  ON public.lens_blueprints FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create blueprints"
  ON public.lens_blueprints FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own blueprints"
  ON public.lens_blueprints FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete own blueprints"
  ON public.lens_blueprints FOR DELETE
  USING (auth.uid() = author_id);

CREATE INDEX idx_lens_blueprints_cid ON public.lens_blueprints(uor_cid);
CREATE INDEX idx_lens_blueprints_tags ON public.lens_blueprints USING GIN(tags);

CREATE TRIGGER update_lens_blueprints_updated_at
  BEFORE UPDATE ON public.lens_blueprints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
