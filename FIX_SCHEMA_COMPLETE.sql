-- ============================================================
-- EDUFLOW COMPREHENSIVE SCHEMA FIX
-- Run this ENTIRE script in your Supabase SQL Editor
-- ============================================================

-- ============================
-- 1. PROFILES TABLE
-- ============================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department_id UUID;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS online BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS temporary_password TEXT;

-- ============================
-- 2. ANNOUNCEMENTS TABLE
-- ============================
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS attachments TEXT[] DEFAULT '{}';
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'));

-- ============================
-- 3. TASKS TABLE
-- ============================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_by_name TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to_name TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deadline DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'));

-- Ensure assigned_to has a proper FK (add if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'tasks' AND constraint_name = 'tasks_assigned_to_fkey'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_assigned_to_fkey
      FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================
-- 4. EVENTS TABLE
-- ============================
ALTER TABLE events ADD COLUMN IF NOT EXISTS created_by_name TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS department_id UUID;
ALTER TABLE events ADD COLUMN IF NOT EXISTS attendees UUID[] DEFAULT '{}';
ALTER TABLE events ADD COLUMN IF NOT EXISTS max_capacity INTEGER DEFAULT 100;
ALTER TABLE events ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed'));
ALTER TABLE events ADD COLUMN IF NOT EXISTS time TEXT;

-- ============================
-- 5. MEETINGS TABLE
-- ============================
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS attendees UUID[] DEFAULT '{}';
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 60;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'Online';
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS meeting_date TIMESTAMPTZ;

-- ============================
-- 6. ATTENDANCE TABLE
-- ============================
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS attendance_date DATE;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS topic_covered TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS faculty_id UUID;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS faculty_name TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS semester INTEGER;

-- ============================
-- 7. NOTIFICATIONS TABLE
-- ============================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT,
  link TEXT,
  metadata JSONB,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
-- Normalize column name (some older migrations used camelCase)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ============================
-- 8. APPROVALS TABLE
-- ============================
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS requested_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS requested_by_name TEXT;

-- ============================
-- 9. RLS POLICIES
-- ============================

-- Announcements: Anyone authenticated can read
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read announcements" ON announcements;
CREATE POLICY "Anyone can read announcements" ON announcements FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Staff can insert announcements" ON announcements;
CREATE POLICY "Staff can insert announcements" ON announcements FOR INSERT TO authenticated WITH CHECK (true);

-- Events: Anyone authenticated can read
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read events" ON events;
CREATE POLICY "Anyone can read events" ON events FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Staff can insert events" ON events;
CREATE POLICY "Staff can insert events" ON events FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Staff can update events" ON events;
CREATE POLICY "Staff can update events" ON events FOR UPDATE TO authenticated USING (true);

-- Tasks: Anyone authenticated can read
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read tasks" ON tasks;
CREATE POLICY "Anyone can read tasks" ON tasks FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Staff can insert tasks" ON tasks;
CREATE POLICY "Staff can insert tasks" ON tasks FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Staff can update tasks" ON tasks;
CREATE POLICY "Staff can update tasks" ON tasks FOR UPDATE TO authenticated USING (true);

-- Meetings: Anyone authenticated can read/create
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read meetings" ON meetings;
CREATE POLICY "Anyone can read meetings" ON meetings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Anyone can create meetings" ON meetings;
CREATE POLICY "Anyone can create meetings" ON meetings FOR INSERT TO authenticated WITH CHECK (true);

-- Notifications: Users can see/manage their own
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Service can insert notifications" ON notifications;
CREATE POLICY "Service can insert notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ============================
-- 10. REFRESH SCHEMA CACHE
-- ============================
-- This forces PostgREST to reload the schema, fixing "column not found in schema cache" errors
NOTIFY pgrst, 'reload schema';
