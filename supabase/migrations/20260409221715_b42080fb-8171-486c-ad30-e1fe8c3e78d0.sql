
-- Create sovereign_spaces table
CREATE TABLE public.sovereign_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cid TEXT NOT NULL,
  name TEXT NOT NULL,
  owner_id UUID NOT NULL,
  space_type TEXT NOT NULL DEFAULT 'personal',
  graph_iri TEXT NOT NULL UNIQUE,
  encrypted_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create space_members table
CREATE TABLE public.space_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.sovereign_spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'reader',
  invited_by UUID,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(space_id, user_id)
);

-- Create change_log table for change-DAG sync
CREATE TABLE public.space_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_cid TEXT NOT NULL UNIQUE,
  space_id UUID NOT NULL REFERENCES public.sovereign_spaces(id) ON DELETE CASCADE,
  parent_cids TEXT[] NOT NULL DEFAULT '{}',
  payload JSONB NOT NULL,
  author_device_id TEXT NOT NULL,
  author_user_id UUID NOT NULL,
  signature TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create space_heads table for tracking sync heads per device
CREATE TABLE public.space_heads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.sovereign_spaces(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  head_cid TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(space_id, device_id)
);

-- Enable RLS on all tables
ALTER TABLE public.sovereign_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_heads ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is a member of a space
CREATE OR REPLACE FUNCTION public.is_space_member(_user_id UUID, _space_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.space_members
    WHERE user_id = _user_id AND space_id = _space_id
  )
$$;

-- Helper function: check if user has a specific role in a space
CREATE OR REPLACE FUNCTION public.has_space_role(_user_id UUID, _space_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.space_members
    WHERE user_id = _user_id AND space_id = _space_id AND role = _role
  )
$$;

-- sovereign_spaces policies
CREATE POLICY "Owners can manage their spaces"
  ON public.sovereign_spaces FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Members can view spaces they belong to"
  ON public.sovereign_spaces FOR SELECT
  TO authenticated
  USING (public.is_space_member(auth.uid(), id));

CREATE POLICY "Public spaces are viewable by everyone"
  ON public.sovereign_spaces FOR SELECT
  TO authenticated
  USING (space_type = 'public');

-- space_members policies
CREATE POLICY "Members can view other members in their spaces"
  ON public.space_members FOR SELECT
  TO authenticated
  USING (public.is_space_member(auth.uid(), space_id));

CREATE POLICY "Owners can manage members"
  ON public.space_members FOR ALL
  TO authenticated
  USING (public.has_space_role(auth.uid(), space_id, 'owner'))
  WITH CHECK (public.has_space_role(auth.uid(), space_id, 'owner'));

CREATE POLICY "Members can leave spaces"
  ON public.space_members FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can join public spaces"
  ON public.space_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sovereign_spaces
      WHERE id = space_id AND space_type = 'public'
    )
    AND auth.uid() = user_id
  );

-- space_change_log policies
CREATE POLICY "Members can read changes in their spaces"
  ON public.space_change_log FOR SELECT
  TO authenticated
  USING (public.is_space_member(auth.uid(), space_id));

CREATE POLICY "Writers and owners can insert changes"
  ON public.space_change_log FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_user_id
    AND (
      public.has_space_role(auth.uid(), space_id, 'owner')
      OR public.has_space_role(auth.uid(), space_id, 'writer')
    )
  );

-- space_heads policies
CREATE POLICY "Members can read heads in their spaces"
  ON public.space_heads FOR SELECT
  TO authenticated
  USING (public.is_space_member(auth.uid(), space_id));

CREATE POLICY "Users can upsert their own heads"
  ON public.space_heads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own heads"
  ON public.space_heads FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_space_members_user ON public.space_members(user_id);
CREATE INDEX idx_space_members_space ON public.space_members(space_id);
CREATE INDEX idx_change_log_space ON public.space_change_log(space_id);
CREATE INDEX idx_change_log_cid ON public.space_change_log(change_cid);
CREATE INDEX idx_space_heads_space ON public.space_heads(space_id);

-- Timestamp trigger for sovereign_spaces
CREATE TRIGGER update_sovereign_spaces_updated_at
  BEFORE UPDATE ON public.sovereign_spaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for space_heads (sync coordination)
ALTER PUBLICATION supabase_realtime ADD TABLE public.space_heads;
