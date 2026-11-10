-- ============================================================
-- CHAT MEDIA STORAGE BUCKET SETUP
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create the public bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media',
  'chat-media',
  true,
  52428800, -- 50MB limit
  ARRAY['image/*','video/*','audio/*','application/pdf','application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain','application/zip']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow authenticated users to upload
DROP POLICY IF EXISTS "Users can upload chat media" ON storage.objects;
CREATE POLICY "Users can upload chat media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-media' AND auth.role() = 'authenticated');

-- 3. Allow anyone to read (public bucket)
DROP POLICY IF EXISTS "Anyone can read chat media" ON storage.objects;
CREATE POLICY "Anyone can read chat media" ON storage.objects
  FOR SELECT USING (bucket_id = 'chat-media');

-- 4. Allow users to delete their own uploads
DROP POLICY IF EXISTS "Users can delete own chat media" ON storage.objects;
CREATE POLICY "Users can delete own chat media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'chat-media' AND owner = auth.uid());
