
-- Create storage bucket for content-addressed app assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('app-assets', 'app-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read app assets (public CDN equivalent)
CREATE POLICY "Public read access for app assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'app-assets');

-- Allow authenticated users to upload app assets
CREATE POLICY "Authenticated users can upload app assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'app-assets' AND auth.role() = 'authenticated');

-- Allow authenticated users to update their app assets
CREATE POLICY "Authenticated users can update app assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'app-assets' AND auth.role() = 'authenticated');

-- Create a table to track ingested app assets with canonical mapping
CREATE TABLE public.app_asset_registry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  canonical_id TEXT NOT NULL,
  app_name TEXT NOT NULL,
  version TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text/html',
  size_bytes BIGINT NOT NULL DEFAULT 0,
  source_url TEXT,
  snapshot_id TEXT,
  ingested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ingested_by TEXT,
  UNIQUE (canonical_id)
);

-- Enable RLS
ALTER TABLE public.app_asset_registry ENABLE ROW LEVEL SECURITY;

-- Anyone can read the registry (apps are public)
CREATE POLICY "Public read access for app asset registry"
ON public.app_asset_registry FOR SELECT
USING (true);

-- Authenticated users can register assets
CREATE POLICY "Authenticated users can register app assets"
ON public.app_asset_registry FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can update their registrations
CREATE POLICY "Authenticated users can update app asset registry"
ON public.app_asset_registry FOR UPDATE
USING (auth.role() = 'authenticated');

-- Index for fast canonical lookups
CREATE INDEX idx_app_asset_registry_canonical ON public.app_asset_registry (canonical_id);
CREATE INDEX idx_app_asset_registry_app ON public.app_asset_registry (app_name, version);
