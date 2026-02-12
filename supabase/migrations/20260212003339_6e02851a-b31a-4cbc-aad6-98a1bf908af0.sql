
-- Add inspiration_image_url column to stories
ALTER TABLE public.stories ADD COLUMN inspiration_image_url text;

-- Create storage bucket for inspiration images
INSERT INTO storage.buckets (id, name, public) VALUES ('inspiration-images', 'inspiration-images', true);

-- Storage policies
CREATE POLICY "Anyone can view inspiration images"
ON storage.objects FOR SELECT
USING (bucket_id = 'inspiration-images');

CREATE POLICY "Authenticated users can upload inspiration images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'inspiration-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own inspiration images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'inspiration-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own inspiration images"
ON storage.objects FOR DELETE
USING (bucket_id = 'inspiration-images' AND auth.uid()::text = (storage.foldername(name))[1]);
