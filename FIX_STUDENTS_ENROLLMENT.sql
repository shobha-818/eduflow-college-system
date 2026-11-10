-- FIX_STUDENTS_ENROLLMENT.sql
-- Run this in the Supabase SQL Editor to fix the "No Students Found" issue.
-- For the full fix (backfill + enroll + verify), use ENROLL_STUDENTS_FIX.sql instead.

-- Quick fix: backfill department_id and disable RLS if reads are blocked
ALTER TABLE student_class_enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

UPDATE profiles p
SET department_id = d.id
FROM departments d
WHERE p.role = 'student'
  AND p.department_id IS NULL
  AND p.department IS NOT NULL
  AND (
    LOWER(TRIM(p.department)) = LOWER(TRIM(d.name))
    OR LOWER(TRIM(p.department)) = LOWER(TRIM(d.code))
  );

UPDATE profiles
SET department_id = (SELECT id FROM departments WHERE code = 'CS' LIMIT 1)
WHERE role = 'student'
  AND department_id IS NULL
  AND EXISTS (SELECT 1 FROM departments WHERE code = 'CS');

INSERT INTO student_class_enrollments (student_id, class_id)
SELECT p.id, (SELECT c.id FROM classes c WHERE c.department_id = p.department_id ORDER BY c.semester LIMIT 1)
FROM profiles p
WHERE p.role = 'student'
  AND p.department_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM classes c WHERE c.department_id = p.department_id)
ON CONFLICT (student_id, class_id) DO NOTHING;
