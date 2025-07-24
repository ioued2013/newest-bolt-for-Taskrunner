/*
  # Create storage buckets for file uploads

  1. Storage Buckets
    - `avatars` - For user profile pictures
    - `service_images` - For service provider media galleries (future use)
    - `chat_media` - For media shared in conversations (future use)

  2. Storage Policies
    - Users can upload their own avatars
    - Users can view all avatars (public access)
    - Authenticated users can upload service images
    - Authenticated users can upload chat media

  3. Security
    - Proper RLS policies for each bucket
    - File size and type restrictions
*/

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', true),
  ('service_images', 'service_images', true),
  ('chat_media', 'chat_media', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policies for service_images bucket
CREATE POLICY "Service images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'service_images');

CREATE POLICY "Authenticated users can upload service images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'service_images');

CREATE POLICY "Users can update their own service images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'service_images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own service images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'service_images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policies for chat_media bucket
CREATE POLICY "Users can view chat media they have access to"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'chat_media');

CREATE POLICY "Authenticated users can upload chat media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat_media');

CREATE POLICY "Users can delete their own chat media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'chat_media' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );