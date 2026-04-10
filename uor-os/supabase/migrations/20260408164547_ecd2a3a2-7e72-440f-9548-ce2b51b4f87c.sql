
CREATE TABLE public.sovereign_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  cid text NOT NULL,
  filename text,
  mime_type text,
  size_bytes integer DEFAULT 0,
  source_type text NOT NULL DEFAULT 'local',
  source_uri text,
  chunk_count integer NOT NULL DEFAULT 0,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, cid)
);

ALTER TABLE public.sovereign_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own documents"
  ON public.sovereign_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON public.sovereign_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON public.sovereign_documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON public.sovereign_documents FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_sovereign_documents_updated_at
  BEFORE UPDATE ON public.sovereign_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
