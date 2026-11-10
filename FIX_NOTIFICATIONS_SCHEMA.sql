-- ============================================================
-- FIX: NOTIFICATIONS TABLE SCHEMA DISCREPANCY
-- Run this script in your Supabase SQL Editor to fix 
-- "column 'message' not found" errors.
-- ============================================================

-- 1. Ensure the table exists (standard definition)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add missing columns explicitly (in case the table existed without them)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT FALSE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Handle camelCase vs snake_case for created_at (normalization)
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='createdAt') THEN
    -- If createdAt exists, move data to created_at and drop it (or keep both)
    UPDATE notifications SET created_at = "createdAt" WHERE created_at IS NULL;
  END IF;
END $$;

-- 4. Fill in missing titles/messages for any nulls (safety)
UPDATE notifications SET title = 'Notification' WHERE title IS NULL;
UPDATE notifications SET message = '' WHERE message IS NULL;

-- 5. Set NOT NULL constraints where appropriate (after filling defaults)
ALTER TABLE notifications ALTER COLUMN title SET NOT NULL;
ALTER TABLE notifications ALTER COLUMN message SET NOT NULL;

-- 6. CRITICAL: Force PostgREST to reload the schema cache
-- This is what actually fixes the "not found in schema cache" error
NOTIFY pgrst, 'reload schema';

-- 7. Grant permissions (just in case)
GRANT ALL ON TABLE notifications TO authenticated;
GRANT ALL ON TABLE notifications TO service_role;
