ALTER TABLE public.uor_oracle_entries ADD COLUMN IF NOT EXISTS storage_source TEXT DEFAULT NULL;
ALTER TABLE public.uor_oracle_entries ADD COLUMN IF NOT EXISTS storage_destination TEXT DEFAULT NULL;