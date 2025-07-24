/*
  # Additional Storage Buckets

  1. New Buckets
    - `services` - For service images and media
    - `messages` - For message attachments and media
    - `deliveries` - For delivery proof photos

  2. Security
    - Authenticated users can upload to appropriate buckets
    - Public read access for service images
    - Private access for message attachments
*/

-- Create services bucket for service images
INSERT INTO storage.buckets (id, name, public)
VALUES ('services', 'services', true)
ON CONFLICT (id) DO NOTHING;

-- Create messages bucket for message attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('messages', 'messages', false)
ON CONFLICT (id) DO NOTHING;

-- Create deliveries bucket for delivery proof photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('deliveries', 'deliveries', false)
ON CONFLICT (id) DO NOTHING;

-- Services bucket policies
CREATE POLICY "Authenticated users can upload service images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'services');

CREATE POLICY "Service images are publicly viewable"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'services');

CREATE POLICY "Users can update their own service images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'services' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own service images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'services' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Messages bucket policies
CREATE POLICY "Users can upload message attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'messages');

CREATE POLICY "Users can view message attachments in their conversations"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'messages');

-- Deliveries bucket policies
CREATE POLICY "Drivers can upload delivery photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'deliveries' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'driver'
    )
  );

CREATE POLICY "Delivery photos are viewable by related parties"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'deliveries');