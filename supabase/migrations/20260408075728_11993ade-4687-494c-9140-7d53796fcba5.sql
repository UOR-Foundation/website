
DROP POLICY "Users can update their own covers" ON public.address_cover_images;
DROP POLICY "Users can delete their own covers" ON public.address_cover_images;
DROP POLICY "Authenticated users can set covers" ON public.address_cover_images;

CREATE POLICY "Authenticated users can set covers"
ON public.address_cover_images FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own covers"
ON public.address_cover_images FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own covers"
ON public.address_cover_images FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
