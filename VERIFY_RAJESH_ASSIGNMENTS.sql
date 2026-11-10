-- ============================================
-- SQL to Verify and Fix Rajesh's Faculty Assignments
-- ============================================

-- Step 1: Verify Rajesh's current assignments
-- This will show what classes and subjects Rajesh is currently assigned to
SELECT 
  p.name as faculty_name,
  p.email as faculty_email,
  c.name as class_name,
  c.department as class_department,
  s.name as subject_name,
  s.code as subject_code
FROM faculty_class_subjects f
JOIN profiles p ON f.faculty_id = p.id
JOIN classes c ON f.class_id = c.id
JOIN subjects s ON f.subject_id = s.id
WHERE p.email = 'rajesh@example.com' OR p.name ILIKE '%rajesh%';

-- Step 2: Check if Rajesh exists in profiles
SELECT id, name, email, role, department 
FROM profiles 
WHERE email = 'rajesh@example.com' OR name ILIKE '%rajesh%';

-- Step 3: Check if CS Semester 3 class exists
SELECT id, name, department, semester 
FROM classes 
WHERE name ILIKE '%CS%' AND name ILIKE '%Semester 3%';

-- Step 4: Check if Machine Learning subject exists
SELECT id, name, code, department 
FROM subjects 
WHERE name ILIKE '%Machine Learning%' OR code ILIKE '%CS501%';

-- Step 5: If Rajesh has no assignments, insert the assignment
-- Uncomment and run this if Step 1 shows no results

/*
INSERT INTO faculty_class_subjects (faculty_id, class_id, subject_id)
SELECT 
  (SELECT id FROM profiles WHERE email = 'rajesh@example.com' LIMIT 1),
  (SELECT id FROM classes WHERE name ILIKE '%CS%' AND name ILIKE '%Semester 3%' LIMIT 1),
  (SELECT id FROM subjects WHERE name ILIKE '%Machine Learning%' OR code ILIKE '%CS501%' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM faculty_class_subjects 
  WHERE faculty_id = (SELECT id FROM profiles WHERE email = 'rajesh@example.com' LIMIT 1)
    AND class_id = (SELECT id FROM classes WHERE name ILIKE '%CS%' AND name ILIKE '%Semester 3%' LIMIT 1)
    AND subject_id = (SELECT id FROM subjects WHERE name ILIKE '%Machine Learning%' OR code ILIKE '%CS501%' LIMIT 1)
);
*/

-- Step 6: Verify the assignment was created
-- Run this after Step 5 to confirm
SELECT 
  p.name as faculty_name,
  p.email as faculty_email,
  c.name as class_name,
  s.name as subject_name
FROM faculty_class_subjects f
JOIN profiles p ON f.faculty_id = p.id
JOIN classes c ON f.class_id = c.id
JOIN subjects s ON f.subject_id = s.id
WHERE p.email = 'rajesh@example.com';

-- Step 7: Check students enrolled in CS Semester 3
-- This shows which students Rajesh should see when he selects CS Semester 3
SELECT 
  p.id as student_id,
  p.name as student_name,
  p.email as student_email,
  p.roll_number,
  p.department,
  c.name as class_name
FROM student_class_enrollments sce
JOIN profiles p ON sce.student_id = p.id
JOIN classes c ON sce.class_id = c.id
WHERE c.name ILIKE '%CS%' AND c.name ILIKE '%Semester 3%'
ORDER BY p.name;

-- Step 8: If you need to remove incorrect assignments
-- Uncomment if Rajesh is assigned to wrong classes
/*
DELETE FROM faculty_class_subjects 
WHERE faculty_id = (SELECT id FROM profiles WHERE email = 'rajesh@example.com' LIMIT 1)
  AND class_id NOT IN (
    SELECT id FROM classes WHERE name ILIKE '%CS%' AND name ILIKE '%Semester 3%'
  );
*/

-- ============================================
-- Expected Results After Fix:
-- ============================================
-- 1. Rajesh should see ONLY "CS Semester 3" in the class dropdown
-- 2. Rajesh should see ONLY "Machine Learning" in the subject dropdown
-- 3. When Rajesh selects "CS Semester 3", he should see ONLY students enrolled in that class
-- 4. Rajesh should NOT see students from ME, EC, or CE departments
