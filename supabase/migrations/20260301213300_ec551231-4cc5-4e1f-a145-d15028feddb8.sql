
-- Table for persisting user's DJ deck presets (cloud sync)
CREATE TABLE public.lumen_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  preset_id TEXT NOT NULL,
  name TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT 'Custom Preset',
  icon TEXT NOT NULL DEFAULT '✧',
  phase TEXT NOT NULL DEFAULT 'work',
  tags TEXT[] NOT NULL DEFAULT '{}',
  dimension_values JSONB NOT NULL DEFAULT '{}',
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, preset_id)
);

-- Enable RLS
ALTER TABLE public.lumen_presets ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own presets
CREATE POLICY "Users can read own presets" ON public.lumen_presets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own presets" ON public.lumen_presets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own presets" ON public.lumen_presets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own presets" ON public.lumen_presets
  FOR DELETE USING (auth.uid() = user_id);

-- Auto-update timestamp
CREATE TRIGGER update_lumen_presets_updated_at
  BEFORE UPDATE ON public.lumen_presets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
