-- ============================================================
-- FIX: SUPABASE REALTIME & WEB SOCKET ISSUES
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Re-create the publication for Realtime
-- This ensures that all tables are included in the broadcast
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;

-- 2. Specifically ensure time_slots is ready
ALTER TABLE time_slots REPLICA IDENTITY FULL;

-- 3. Reload schema cache (Fixes "column not found" errors)
NOTIFY pgrst, 'reload schema';

-- 4. Enable Realtime for all core tables (just in case)
ALTER TABLE announcements REPLICA IDENTITY FULL;
ALTER TABLE tasks REPLICA IDENTITY FULL;
ALTER TABLE events REPLICA IDENTITY FULL;
ALTER TABLE leaves REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER TABLE attendance REPLICA IDENTITY FULL;
ALTER TABLE chat_messages REPLICA IDENTITY FULL;
ALTER TABLE time_slots REPLICA IDENTITY FULL;

-- 5. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Final Verification
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
