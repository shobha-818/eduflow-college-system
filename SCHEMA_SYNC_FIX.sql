-- ============================================================
-- EDUFLOW SCHEMA SYNC (MISSING COLUMNS & TABLES)
-- ============================================================

-- 1. ANNOUNCEMENTS: Add department column if missing
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='announcements' AND column_name='department') THEN
        ALTER TABLE announcements ADD COLUMN department TEXT;
    END IF;
END $$;

-- 2. CREATE MISSING TABLES FOR MULTI-DEPARTMENT SYSTEM
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  hod_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  department_id UUID REFERENCES departments(id),
  semester INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add class_id to students for better mapping
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='class_id') THEN
        ALTER TABLE students ADD COLUMN class_id UUID REFERENCES classes(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='department_id') THEN
        ALTER TABLE students ADD COLUMN department_id UUID REFERENCES departments(id);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  department_id UUID REFERENCES departments(id),
  faculty_id UUID REFERENCES profiles(id),
  semester INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  attendees UUID[] DEFAULT '{}',
  meeting_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration INTEGER DEFAULT 60,
  location TEXT DEFAULT 'Online',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. ENSURE RLS FOR NEW TABLES
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read departments" ON departments;
CREATE POLICY "Anyone can read departments" ON departments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can read classes" ON classes;
CREATE POLICY "Anyone can read classes" ON classes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can read subjects" ON subjects;
CREATE POLICY "Anyone can read subjects" ON subjects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can read meetings" ON meetings;
CREATE POLICY "Anyone can read meetings" ON meetings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create meetings" ON meetings;
CREATE POLICY "Users can create meetings" ON meetings FOR INSERT WITH CHECK (true);

-- 4. REALTIME is already enabled FOR ALL TABLES based on your error message,
-- so new tables are included automatically.
