-- ============================================================
-- EDUFLOW QUICK FIX — Run this in Supabase SQL Editor NOW
-- Fixes all "column not found in schema cache" errors
-- ============================================================

-- 1. NOTIFICATIONS — add missing columns
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 2. ANNOUNCEMENTS — add missing columns
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS attachments TEXT[] DEFAULT '{}';
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS department TEXT;

-- 3. EVENTS — add missing columns
ALTER TABLE events ADD COLUMN IF NOT EXISTS created_by_name TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS attendees UUID[] DEFAULT '{}';
ALTER TABLE events ADD COLUMN IF NOT EXISTS max_capacity INTEGER DEFAULT 100;
ALTER TABLE events ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'upcoming';
ALTER TABLE events ADD COLUMN IF NOT EXISTS time TEXT;

-- 4. TASKS — add missing columns
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_by UUID;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deadline DATE;

-- 5. PROFILES — add missing columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department_id UUID;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS online BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 6. MEETINGS — add missing columns
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 60;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'Online';
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS attendees UUID[] DEFAULT '{}';
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS meeting_date TIMESTAMPTZ;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS created_by_name TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS department TEXT;

-- 7. Force PostgREST to reload schema (CRITICAL — fixes schema cache errors)
NOTIFY pgrst, 'reload schema';
