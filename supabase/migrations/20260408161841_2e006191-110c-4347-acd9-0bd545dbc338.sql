
-- ── Table 1: conduit_sessions ──────────────────────────────────────
CREATE TABLE public.conduit_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_hash text NOT NULL UNIQUE,
  creator_id uuid NOT NULL,
  session_type text NOT NULL DEFAULT 'direct',
  participants uuid[] NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  revoked_at timestamp with time zone,
  metadata_cid text
);

CREATE INDEX idx_conduit_sessions_participants ON public.conduit_sessions USING GIN(participants);
CREATE INDEX idx_conduit_sessions_hash ON public.conduit_sessions (session_hash);

-- Helper function (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_session_participant(_user_id uuid, _session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conduit_sessions
    WHERE id = _session_id
      AND _user_id = ANY(participants)
  )
$$;

ALTER TABLE public.conduit_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read their sessions"
ON public.conduit_sessions FOR SELECT
TO authenticated
USING (auth.uid() = ANY(participants));

CREATE POLICY "Authenticated users can create sessions"
ON public.conduit_sessions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = creator_id AND auth.uid() = ANY(participants));

CREATE POLICY "Creator can revoke sessions"
ON public.conduit_sessions FOR UPDATE
TO authenticated
USING (auth.uid() = creator_id);

-- ── Table 2: encrypted_messages ────────────────────────────────────
CREATE TABLE public.encrypted_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.conduit_sessions(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  parent_hashes text[] NOT NULL DEFAULT '{}',
  message_hash text NOT NULL UNIQUE,
  ciphertext text NOT NULL,
  envelope_cid text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_encrypted_messages_session ON public.encrypted_messages (session_id, created_at);
CREATE INDEX idx_encrypted_messages_hash ON public.encrypted_messages (message_hash);

ALTER TABLE public.encrypted_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session participants can read messages"
ON public.encrypted_messages FOR SELECT
TO authenticated
USING (public.is_session_participant(auth.uid(), session_id));

CREATE POLICY "Session participants can send messages"
ON public.encrypted_messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND public.is_session_participant(auth.uid(), session_id)
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.encrypted_messages;

-- ── Table 3: group_rekeys ──────────────────────────────────────────
CREATE TABLE public.group_rekeys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.conduit_sessions(id) ON DELETE CASCADE,
  new_session_id uuid NOT NULL REFERENCES public.conduit_sessions(id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT 'manual',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.group_rekeys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session participants can read rekey events"
ON public.group_rekeys FOR SELECT
TO authenticated
USING (public.is_session_participant(auth.uid(), session_id));

CREATE POLICY "Session participants can create rekey events"
ON public.group_rekeys FOR INSERT
TO authenticated
WITH CHECK (public.is_session_participant(auth.uid(), session_id));
