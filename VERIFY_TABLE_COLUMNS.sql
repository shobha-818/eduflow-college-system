-- ============================================
-- SQL to Verify Table Columns for Timetable, Tasks, and Leaves
-- ============================================

-- Step 1: Verify time_slots table columns
-- This table stores timetable time slots
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'time_slots'
ORDER BY ordinal_position;

-- Expected columns for time_slots:
-- id (UUID, primary key)
-- day_of_week (INTEGER)
-- start_time (TIME)
-- end_time (TIME)
-- subject (TEXT)
-- faculty (TEXT)
-- room (TEXT)
-- department (TEXT)
-- semester (INTEGER)
-- created_at (TIMESTAMP)
-- updated_at (TIMESTAMP)

-- Step 2: Verify tasks table columns
-- This table stores task assignments
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'tasks'
ORDER BY ordinal_position;

-- Expected columns for tasks:
-- id (UUID, primary key)
-- title (TEXT)
-- description (TEXT)
-- assigned_to (UUID, references profiles.id)
-- assigned_by (UUID, references profiles.id)
-- due_date (DATE)
-- priority (TEXT)
-- status (TEXT)
-- created_at (TIMESTAMP)
-- updated_at (TIMESTAMP)

-- Step 3: Verify leaves table columns
-- This table stores leave applications
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'leaves'
ORDER BY ordinal_position;

-- Expected columns for leaves:
-- id (UUID, primary key)
-- applicant_id (UUID, references profiles.id)
-- applicant_name (TEXT)
-- type (TEXT)
-- start_date (DATE)
-- end_date (DATE)
-- reason (TEXT)
-- department (TEXT)
-- status (TEXT)
-- reviewed_by (UUID, references profiles.id)
-- reviewed_at (TIMESTAMP)
-- review_reason (TEXT)
-- created_at (TIMESTAMP)
-- updated_at (TIMESTAMP)

-- Step 4: Check if tables exist
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_name IN ('time_slots', 'tasks', 'leaves')
  AND table_schema = 'public';

-- Step 5: Sample data check
-- Check if there's any data in these tables
SELECT 'time_slots' as table_name, COUNT(*) as record_count FROM time_slots
UNION ALL
SELECT 'tasks' as table_name, COUNT(*) as record_count FROM tasks
UNION ALL
SELECT 'leaves' as table_name, COUNT(*) as record_count FROM leaves;

-- Step 6: Check foreign key constraints
SELECT 
  tc.table_name,
  tc.constraint_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('time_slots', 'tasks', 'leaves');

-- Step 7: If any columns are missing, add them
-- Uncomment the appropriate ALTER TABLE statements if needed

/*
-- For time_slots table
ALTER TABLE time_slots ADD COLUMN IF NOT EXISTS day_of_week INTEGER;
ALTER TABLE time_slots ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE time_slots ADD COLUMN IF NOT EXISTS end_time TIME;
ALTER TABLE time_slots ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE time_slots ADD COLUMN IF NOT EXISTS faculty TEXT;
ALTER TABLE time_slots ADD COLUMN IF NOT EXISTS room TEXT;
ALTER TABLE time_slots ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE time_slots ADD COLUMN IF NOT EXISTS semester INTEGER;

-- For tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES profiles(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- For leaves table
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS applicant_id UUID REFERENCES profiles(id);
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS applicant_name TEXT;
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES profiles(id);
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS review_reason TEXT;
*/

-- ============================================
-- Expected Results After Verification:
-- ============================================
-- 1. All three tables should exist
-- 2. All expected columns should be present
-- 3. Foreign key constraints should be properly set
-- 4. Data should be able to be inserted and retrieved

-- ============================================
-- Common Issues to Check:
-- ============================================
-- 1. Missing columns - Run ALTER TABLE statements above
-- 2. Wrong data types - Check against expected types
-- 3. Missing foreign keys - Add REFERENCES clauses
-- 4. Case sensitivity - PostgreSQL is case-sensitive for identifiers
