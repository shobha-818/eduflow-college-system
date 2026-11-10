-- ============================================================
-- ASSIGN FACULTY & STUDENT ENROLLMENT TABLES
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Faculty-Class-Subject assignments
CREATE TABLE IF NOT EXISTS faculty_class_subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  faculty_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(faculty_id, class_id, subject_id)
);

-- 2. Student-Class enrollments
CREATE TABLE IF NOT EXISTS student_class_enrollments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  enrollment_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, class_id)
);

-- 3. Enable RLS
ALTER TABLE faculty_class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_class_enrollments ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies — authenticated users can read, admins can write
DROP POLICY IF EXISTS "Anyone can read faculty_class_subjects" ON faculty_class_subjects;
CREATE POLICY "Anyone can read faculty_class_subjects" ON faculty_class_subjects
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage faculty_class_subjects" ON faculty_class_subjects;
CREATE POLICY "Admins can manage faculty_class_subjects" ON faculty_class_subjects
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('principal', 'hod')
    )
  );

DROP POLICY IF EXISTS "Anyone can read student_class_enrollments" ON student_class_enrollments;
CREATE POLICY "Anyone can read student_class_enrollments" ON student_class_enrollments
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage student_class_enrollments" ON student_class_enrollments;
CREATE POLICY "Admins can manage student_class_enrollments" ON student_class_enrollments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('principal', 'hod')
    )
  );

-- 5. Refresh schema cache
NOTIFY pgrst, 'reload schema';
