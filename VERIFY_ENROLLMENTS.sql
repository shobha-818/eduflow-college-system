-- VERIFY_ENROLLMENTS.sql
-- Run this in the Supabase SQL Editor to verify the currently enrolled students.

SELECT 
    c.name AS class_name,
    c.semester,
    d.code AS department_code,
    p.name AS student_name,
    p.email AS student_email,
    sce.enrollment_date
FROM 
    student_class_enrollments sce
JOIN 
    profiles p ON sce.student_id = p.id
JOIN 
    classes c ON sce.class_id = c.id
LEFT JOIN
    departments d ON c.department_id = d.id
ORDER BY 
    c.name, p.name;
