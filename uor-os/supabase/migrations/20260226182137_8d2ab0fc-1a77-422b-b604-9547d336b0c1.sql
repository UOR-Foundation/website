
-- Audio tracks table: persists AudioTrackRecord data
CREATE TABLE public.audio_tracks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_cid text NOT NULL UNIQUE,
  uor_address text,
  ipv6_address text,
  title text NOT NULL DEFAULT '',
  artist text NOT NULL DEFAULT '',
  album text NOT NULL DEFAULT '',
  duration_seconds numeric NOT NULL DEFAULT 0,
  format jsonb NOT NULL DEFAULT '{}'::jsonb,
  genres text[] NOT NULL DEFAULT '{}'::text[],
  derivation_id text,
  source_uri text,
  ingested_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Audio features table: persists extracted AudioFeatureData per track
CREATE TABLE public.audio_features (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_cid text NOT NULL REFERENCES public.audio_tracks(track_cid) ON DELETE CASCADE,
  feature_id text NOT NULL,
  label text NOT NULL DEFAULT '',
  value numeric NOT NULL DEFAULT 0,
  confidence numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT '',
  frame_range jsonb NOT NULL DEFAULT '[0,0]'::jsonb,
  lens_id text NOT NULL DEFAULT '',
  derivation_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Audio segments table: persists segment metadata per track
CREATE TABLE public.audio_segments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_cid text NOT NULL REFERENCES public.audio_tracks(track_cid) ON DELETE CASCADE,
  segment_index integer NOT NULL DEFAULT 0,
  segment_cid text NOT NULL,
  duration numeric NOT NULL DEFAULT 0,
  byte_offset bigint NOT NULL DEFAULT 0,
  byte_length bigint NOT NULL DEFAULT 0,
  bitrate integer NOT NULL DEFAULT 0,
  frame_cids text[] NOT NULL DEFAULT '{}'::text[],
  cached boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_audio_tracks_user ON public.audio_tracks(user_id);
CREATE INDEX idx_audio_features_track ON public.audio_features(track_cid);
CREATE INDEX idx_audio_segments_track ON public.audio_segments(track_cid);

-- RLS
ALTER TABLE public.audio_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_segments ENABLE ROW LEVEL SECURITY;

-- audio_tracks: public read, authenticated write
CREATE POLICY "Audio tracks are publicly readable"
  ON public.audio_tracks FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert audio tracks"
  ON public.audio_tracks FOR INSERT
  WITH CHECK (auth.role() = 'authenticated'::text);
CREATE POLICY "Users can update own audio tracks"
  ON public.audio_tracks FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own audio tracks"
  ON public.audio_tracks FOR DELETE
  USING (auth.uid() = user_id);

-- audio_features: public read, authenticated write
CREATE POLICY "Audio features are publicly readable"
  ON public.audio_features FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert audio features"
  ON public.audio_features FOR INSERT
  WITH CHECK (auth.role() = 'authenticated'::text);

-- audio_segments: public read, authenticated write
CREATE POLICY "Audio segments are publicly readable"
  ON public.audio_segments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert audio segments"
  ON public.audio_segments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated'::text);
