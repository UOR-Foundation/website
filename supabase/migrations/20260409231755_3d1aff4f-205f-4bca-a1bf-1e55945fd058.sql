
-- 1. Group metadata
CREATE TABLE public.group_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.conduit_sessions(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  avatar_url text,
  created_by uuid NOT NULL,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.group_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session participants can read group metadata"
  ON public.group_metadata FOR SELECT TO authenticated
  USING (public.is_session_participant(auth.uid(), session_id));

CREATE POLICY "Group creator can update metadata"
  ON public.group_metadata FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can create group metadata"
  ON public.group_metadata FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- 2. Group members
CREATE TABLE public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.conduit_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  invited_by uuid,
  muted_until timestamptz,
  UNIQUE(session_id, user_id)
);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session participants can read members"
  ON public.group_members FOR SELECT TO authenticated
  USING (public.is_session_participant(auth.uid(), session_id));

CREATE POLICY "Session participants can add members"
  ON public.group_members FOR INSERT TO authenticated
  WITH CHECK (public.is_session_participant(auth.uid(), session_id));

CREATE POLICY "Admins can remove members"
  ON public.group_members FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.session_id = group_members.session_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'admin'
    )
    OR group_members.user_id = auth.uid()
  );

CREATE POLICY "Users can update own membership"
  ON public.group_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3. Message reactions
CREATE TABLE public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.encrypted_messages(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read reactions"
  ON public.message_reactions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.encrypted_messages em
      WHERE em.id = message_reactions.message_id
        AND public.is_session_participant(auth.uid(), em.session_id)
    )
  );

CREATE POLICY "Participants can add reactions"
  ON public.message_reactions FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.encrypted_messages em
      WHERE em.id = message_reactions.message_id
        AND public.is_session_participant(auth.uid(), em.session_id)
    )
  );

CREATE POLICY "Users can remove own reactions"
  ON public.message_reactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 4. Conversation settings
CREATE TABLE public.conversation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid REFERENCES public.conduit_sessions(id) ON DELETE CASCADE NOT NULL,
  pinned boolean DEFAULT false,
  muted_until timestamptz,
  archived boolean DEFAULT false,
  UNIQUE(user_id, session_id)
);

ALTER TABLE public.conversation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own conversation settings"
  ON public.conversation_settings FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Shared folders
CREATE TABLE public.shared_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.conduit_sessions(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL DEFAULT 'Shared Files',
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.shared_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session participants can read folders"
  ON public.shared_folders FOR SELECT TO authenticated
  USING (public.is_session_participant(auth.uid(), session_id));

CREATE POLICY "Session participants can create folders"
  ON public.shared_folders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND public.is_session_participant(auth.uid(), session_id));

CREATE POLICY "Folder creator can update"
  ON public.shared_folders FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Folder creator can delete"
  ON public.shared_folders FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- 6. Folder entries
CREATE TABLE public.folder_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid REFERENCES public.shared_folders(id) ON DELETE CASCADE NOT NULL,
  filename text NOT NULL,
  file_cid text NOT NULL,
  encrypted_manifest jsonb,
  uploaded_by uuid NOT NULL,
  size_bytes bigint DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.folder_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session participants can read folder entries"
  ON public.folder_entries FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shared_folders sf
      WHERE sf.id = folder_entries.folder_id
        AND public.is_session_participant(auth.uid(), sf.session_id)
    )
  );

CREATE POLICY "Session participants can upload files"
  ON public.folder_entries FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = uploaded_by
    AND EXISTS (
      SELECT 1 FROM public.shared_folders sf
      WHERE sf.id = folder_entries.folder_id
        AND public.is_session_participant(auth.uid(), sf.session_id)
    )
  );

CREATE POLICY "Uploader can delete own entries"
  ON public.folder_entries FOR DELETE TO authenticated
  USING (auth.uid() = uploaded_by);

-- 7. New columns on encrypted_messages
ALTER TABLE public.encrypted_messages
  ADD COLUMN IF NOT EXISTS self_destruct_seconds integer,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS edit_history jsonb;

-- 8. Realtime for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
