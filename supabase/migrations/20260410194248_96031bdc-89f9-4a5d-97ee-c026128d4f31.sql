ALTER TABLE public.session_transfers
ADD COLUMN IF NOT EXISTS snapshot_data jsonb DEFAULT null;