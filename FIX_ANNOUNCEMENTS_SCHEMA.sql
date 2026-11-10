-- ============================================================
-- FIX: ANNOUNCEMENTS SCHEMA & MISSING COLUMNS
-- ============================================================

-- 1. Fix Announcements table
DO $$ 
BEGIN 
    -- Add attachments column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='announcements' AND column_name='attachments') THEN
        ALTER TABLE announcements ADD COLUMN attachments TEXT[] DEFAULT '{}';
    END IF;

    -- Ensure department column exists (from previous sync attempt)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='announcements' AND column_name='department') THEN
        ALTER TABLE announcements ADD COLUMN department TEXT;
    END IF;

    -- Ensure priority column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='announcements' AND column_name='priority') THEN
        ALTER TABLE announcements ADD COLUMN priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium';
    END IF;
END $$;

-- 2. Fix Meetings table (Ensure duration and location)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='meetings' AND column_name='duration') THEN
        ALTER TABLE meetings ADD COLUMN duration INTEGER DEFAULT 60;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='meetings' AND column_name='location') THEN
        ALTER TABLE meetings ADD COLUMN location TEXT DEFAULT 'Online';
    END IF;
END $$;

-- 3. Fix Tasks table (Ensure due_date vs deadline consistency)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='due_date') THEN
        ALTER TABLE tasks ADD COLUMN due_date DATE;
    END IF;
    -- If deadline is missing but required by some logic
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='deadline') THEN
        ALTER TABLE tasks ADD COLUMN deadline DATE;
    END IF;
END $$;
