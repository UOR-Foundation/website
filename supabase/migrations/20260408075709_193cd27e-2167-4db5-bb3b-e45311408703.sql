
-- Storage bucket for address cover images
INSERT INTO storage.buckets (id, name, public)
VALUES ('address-covers', 'address-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can view address covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'address-covers');

CREATE POLICY "Authenticated users can upload covers"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'address-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own covers"
ON storage.objects FOR UPDATE
USING (bucket_id = 'address-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own covers"
ON storage.objects FOR DELETE
USING (bucket_id = 'address-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Table to track which cover a user set for which address
CREATE TABLE public.address_cover_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  address_cid TEXT NOT NULL,
  user_id UUID NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (address_cid)
);

ALTER TABLE public.address_cover_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view cover images"
ON public.address_cover_images FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can set covers"
ON public.address_cover_images FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own covers"
ON public.address_cover_images FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own covers"
ON public.address_cover_images FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_address_cover_images_updated_at
BEFORE UPDATE ON public.address_cover_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
