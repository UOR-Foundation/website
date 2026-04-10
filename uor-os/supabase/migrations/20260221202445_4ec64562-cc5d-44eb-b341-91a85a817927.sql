
-- State module tables for multi-agent evaluation contexts
CREATE TABLE public.uor_contexts (
  context_id TEXT PRIMARY KEY,
  quantum INTEGER NOT NULL,
  capacity INTEGER NOT NULL,
  binding_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.uor_contexts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "uor_contexts_public_read" ON public.uor_contexts FOR SELECT USING (true);
CREATE POLICY "uor_contexts_anon_insert" ON public.uor_contexts FOR INSERT WITH CHECK (true);
CREATE POLICY "uor_contexts_anon_update" ON public.uor_contexts FOR UPDATE USING (true) WITH CHECK (true);

CREATE TABLE public.uor_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_id TEXT NOT NULL REFERENCES public.uor_contexts(context_id),
  address TEXT NOT NULL,
  content TEXT NOT NULL,
  binding_type TEXT NOT NULL DEFAULT 'value',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(context_id, address)
);
ALTER TABLE public.uor_bindings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "uor_bindings_public_read" ON public.uor_bindings FOR SELECT USING (true);
CREATE POLICY "uor_bindings_anon_insert" ON public.uor_bindings FOR INSERT WITH CHECK (true);

CREATE TABLE public.uor_frames (
  frame_id TEXT PRIMARY KEY,
  context_id TEXT NOT NULL REFERENCES public.uor_contexts(context_id),
  bindings JSONB NOT NULL DEFAULT '[]'::jsonb,
  binding_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.uor_frames ENABLE ROW LEVEL SECURITY;
CREATE POLICY "uor_frames_public_read" ON public.uor_frames FOR SELECT USING (true);
CREATE POLICY "uor_frames_anon_insert" ON public.uor_frames FOR INSERT WITH CHECK (true);

CREATE TABLE public.uor_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_frame TEXT NOT NULL REFERENCES public.uor_frames(frame_id),
  to_frame TEXT NOT NULL REFERENCES public.uor_frames(frame_id),
  added INTEGER NOT NULL DEFAULT 0,
  removed INTEGER NOT NULL DEFAULT 0,
  context_id TEXT NOT NULL REFERENCES public.uor_contexts(context_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.uor_transitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "uor_transitions_public_read" ON public.uor_transitions FOR SELECT USING (true);
CREATE POLICY "uor_transitions_anon_insert" ON public.uor_transitions FOR INSERT WITH CHECK (true);
