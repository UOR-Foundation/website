
-- Table to track trust level changes over time
CREATE TABLE public.trust_level_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES public.trust_connections(id) ON DELETE CASCADE,
  previous_level INTEGER NOT NULL DEFAULT 0,
  new_level INTEGER NOT NULL DEFAULT 0,
  changed_by UUID NOT NULL,
  ceremony_cid TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.trust_level_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own trust history"
  ON public.trust_level_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trust_connections tc
      WHERE tc.id = trust_level_history.connection_id
      AND (tc.requester_id = auth.uid() OR tc.responder_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert trust history for own connections"
  ON public.trust_level_history FOR INSERT
  WITH CHECK (auth.uid() = changed_by);

-- Trigger to auto-record trust level changes
CREATE OR REPLACE FUNCTION public.record_trust_level_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.trust_level IS DISTINCT FROM NEW.trust_level THEN
    INSERT INTO public.trust_level_history (connection_id, previous_level, new_level, changed_by, ceremony_cid)
    VALUES (NEW.id, OLD.trust_level, NEW.trust_level, auth.uid(), NEW.ceremony_cid);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_trust_level_change
  AFTER UPDATE ON public.trust_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.record_trust_level_change();

-- Also record initial trust level on insert
CREATE OR REPLACE FUNCTION public.record_initial_trust_level()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.trust_level_history (connection_id, previous_level, new_level, changed_by, ceremony_cid)
  VALUES (NEW.id, 0, NEW.trust_level, NEW.requester_id, NEW.ceremony_cid);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_trust_connection_created
  AFTER INSERT ON public.trust_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.record_initial_trust_level();
