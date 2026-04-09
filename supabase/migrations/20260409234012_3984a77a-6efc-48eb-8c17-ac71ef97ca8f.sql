-- Bridge connections: tracks which external platforms a user has connected
CREATE TABLE public.bridge_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform text NOT NULL,
  matrix_bridge_room_id text,
  external_user_id text,
  status text NOT NULL DEFAULT 'disconnected',
  config jsonb DEFAULT '{}',
  connected_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, platform)
);

-- Contacts: deduplicated contact entities with UOR canonical hash
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  canonical_hash text NOT NULL,
  display_name text NOT NULL,
  merged_identities jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Social identities: maps platform-specific identities to unified contacts
CREATE TABLE public.social_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  platform text NOT NULL,
  platform_user_id text NOT NULL,
  platform_handle text,
  display_name text,
  avatar_url text,
  verified boolean DEFAULT false,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, platform, platform_user_id)
);

-- Add source_platform to encrypted_messages
ALTER TABLE public.encrypted_messages
  ADD COLUMN IF NOT EXISTS source_platform text DEFAULT 'native';

-- Enable RLS
ALTER TABLE public.bridge_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_identities ENABLE ROW LEVEL SECURITY;

-- RLS policies: users own their data
CREATE POLICY "Users manage own bridge connections"
ON public.bridge_connections FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own contacts"
ON public.contacts FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own identities"
ON public.social_identities FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_bridge_connections_user_id ON public.bridge_connections(user_id);
CREATE INDEX idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX idx_contacts_canonical_hash ON public.contacts(canonical_hash);
CREATE INDEX idx_social_identities_user_id ON public.social_identities(user_id);
CREATE INDEX idx_social_identities_contact_id ON public.social_identities(contact_id);
CREATE INDEX idx_social_identities_platform ON public.social_identities(user_id, platform);
CREATE INDEX idx_encrypted_messages_source_platform ON public.encrypted_messages(source_platform);

-- Trigger for contacts updated_at
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();