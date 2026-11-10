-- ============================================================
-- ENROLL STUDENTS FIX — Run in Supabase SQL Editor
-- Fixes "No students found" on the Enroll Students page
-- ============================================================

-- ============================================================
-- STEP 1: VERIFY CURRENT STATE
-- ============================================================

-- 1a. Count student profiles
SELECT COUNT(*) AS student_profile_count
FROM profiles
WHERE role = 'student';

-- 1b. Students missing department_id
SELECT COUNT(*) AS students_missing_department_id
FROM profiles
WHERE role = 'student' AND department_id IS NULL;

-- 1c. Current enrollment count
SELECT COUNT(*) AS enrollment_count
FROM student_class_enrollments;

-- 1d. Students in academic `students` table (may not have matching profiles)
SELECT COUNT(*) AS students_table_count FROM students;

-- ============================================================
-- STEP 2: BACKFILL department_id ON PROFILES
-- ============================================================

-- 2a. Match profiles.department TEXT to departments.name
UPDATE profiles p
SET department_id = d.id
FROM departments d
WHERE p.role = 'student'
  AND p.department_id IS NULL
  AND p.department IS NOT NULL
  AND (
    LOWER(TRIM(p.department)) = LOWER(TRIM(d.name))
    OR LOWER(TRIM(p.department)) = LOWER(TRIM(d.code))
    OR LOWER(TRIM(p.department)) LIKE '%' || LOWER(TRIM(d.code)) || '%'
    OR LOWER(TRIM(p.department)) LIKE '%' || LOWER(TRIM(SPLIT_PART(d.name, ' ', 1))) || '%'
  );

-- 2b. Match profiles to departments via auth.users metadata
UPDATE profiles p
SET department_id = d.id
FROM auth.users u
JOIN departments d ON (
  LOWER(TRIM(u.raw_user_meta_data->>'department')) = LOWER(TRIM(d.name))
  OR LOWER(TRIM(u.raw_user_meta_data->>'department')) = LOWER(TRIM(d.code))
  OR LOWER(TRIM(u.raw_user_meta_data->>'department')) LIKE '%' || LOWER(TRIM(d.code)) || '%'
)
WHERE p.id = u.id
  AND p.role = 'student'
  AND p.department_id IS NULL
  AND u.raw_user_meta_data->>'department' IS NOT NULL;

-- 2c. Copy department_id from `students` table where emails match profiles
UPDATE profiles p
SET department_id = s.department_id
FROM students s
WHERE p.role = 'student'
  AND p.department_id IS NULL
  AND s.department_id IS NOT NULL
  AND LOWER(TRIM(p.email)) = LOWER(TRIM(s.email));

-- 2d. Assign CS department to any remaining students without department_id
UPDATE profiles
SET department_id = (SELECT id FROM departments WHERE code = 'CS' LIMIT 1)
WHERE role = 'student'
  AND department_id IS NULL
  AND EXISTS (SELECT 1 FROM departments WHERE code = 'CS');

-- 2e. Also sync department TEXT from departments table when department_id is set
UPDATE profiles p
SET department = d.name
FROM departments d
WHERE p.department_id = d.id
  AND p.role = 'student'
  AND (p.department IS NULL OR p.department = '');

-- ============================================================
-- STEP 3: ENSURE CLASSES HAVE department_id
-- ============================================================

UPDATE classes c
SET department_id = d.id
FROM departments d
WHERE c.department_id IS NULL
  AND (
    LOWER(c.name) LIKE '%' || LOWER(d.code) || '%'
    OR LOWER(c.name) LIKE '%' || LOWER(SPLIT_PART(d.name, ' ', 1)) || '%'
  );

-- ============================================================
-- STEP 4: ENROLL ALL STUDENT PROFILES INTO THEIR CLASSES
-- ============================================================

-- 4a. Prefer class_id from `students` table when email matches a profile
INSERT INTO student_class_enrollments (student_id, class_id)
SELECT DISTINCT
  p.id,
  s.class_id
FROM profiles p
JOIN students s ON LOWER(TRIM(p.email)) = LOWER(TRIM(s.email))
WHERE p.role = 'student'
  AND s.class_id IS NOT NULL
ON CONFLICT (student_id, class_id) DO NOTHING;

-- 4b. Enroll remaining students into a class in their department
--     (uses first class per department; adjust semester filter if needed)
INSERT INTO student_class_enrollments (student_id, class_id)
SELECT
  p.id,
  (
    SELECT c.id
    FROM classes c
    WHERE c.department_id = p.department_id
    ORDER BY c.semester, c.name
    LIMIT 1
  )
FROM profiles p
WHERE p.role = 'student'
  AND p.department_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM classes c WHERE c.department_id = p.department_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM student_class_enrollments e WHERE e.student_id = p.id
  )
ON CONFLICT (student_id, class_id) DO NOTHING;

-- ============================================================
-- STEP 5: FIX RLS (if reads/writes are blocked)
-- ============================================================

-- Ensure authenticated users can read profiles and enrollments
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_class_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read profiles" ON profiles;
CREATE POLICY "Anyone can read profiles" ON profiles
  FOR SELECT TO authenticated USING (true);

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

-- If RLS still blocks during development, uncomment these two lines:
-- ALTER TABLE student_class_enrollments DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- STEP 6: VERIFICATION QUERIES
-- ============================================================

-- 6a. Student count per department
SELECT
  COALESCE(d.code, 'NO DEPT') AS department,
  COUNT(p.id) AS student_count
FROM profiles p
LEFT JOIN departments d ON p.department_id = d.id
WHERE p.role = 'student'
GROUP BY d.code
ORDER BY department;

-- 6b. Enrollment count per class
SELECT
  c.name AS class_name,
  d.code AS department_code,
  COUNT(e.student_id) AS enrolled_count
FROM classes c
LEFT JOIN departments d ON c.department_id = d.id
LEFT JOIN student_class_enrollments e ON c.id = e.class_id
GROUP BY c.name, d.code
ORDER BY c.name;

-- 6c. Detailed enrollment list
SELECT
  c.name AS class_name,
  p.name AS student_name,
  p.email AS student_email,
  d.code AS department_code,
  e.enrollment_date
FROM student_class_enrollments e
JOIN profiles p ON e.student_id = p.id
JOIN classes c ON e.class_id = c.id
LEFT JOIN departments d ON c.department_id = d.id
ORDER BY c.name, p.name;

-- 6d. Orphan students (in `students` table but no matching profile — cannot enroll)
SELECT s.name, s.email, s.department, s.department_id
FROM students s
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p
  WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(s.email))
    AND p.role = 'student'
);
