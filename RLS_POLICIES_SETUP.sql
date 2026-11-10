-- ============================================================
-- EDUFLOW RLS POLICIES (SYNCHRONIZED WITH NEW SCHEMA)
-- ============================================================

-- ENABLE RLS ON ALL TABLES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES
DROP POLICY IF EXISTS "Anyone can read profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Anyone can read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. STUDENTS
DROP POLICY IF EXISTS "Anyone can read students" ON students;
DROP POLICY IF EXISTS "Faculty/Admin can manage students" ON students;

CREATE POLICY "Anyone can read students" ON students FOR SELECT USING (true);
CREATE POLICY "Faculty/Admin can manage students" ON students FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('principal', 'hod', 'faculty'))
);

-- 3. ATTENDANCE
DROP POLICY IF EXISTS "Users can read attendance" ON attendance;
DROP POLICY IF EXISTS "Faculty can mark attendance" ON attendance;

CREATE POLICY "Users can read attendance" ON attendance FOR SELECT USING (true);
CREATE POLICY "Faculty can mark attendance" ON attendance FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('principal', 'hod', 'faculty'))
);

-- 4. ANNOUNCEMENTS
DROP POLICY IF EXISTS "Anyone can read announcements" ON announcements;
DROP POLICY IF EXISTS "Faculty/Admin can manage announcements" ON announcements;

CREATE POLICY "Anyone can read announcements" ON announcements FOR SELECT USING (true);
CREATE POLICY "Faculty/Admin can manage announcements" ON announcements FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('principal', 'hod', 'faculty'))
);

-- 5. TASKS
DROP POLICY IF EXISTS "Anyone can read tasks" ON tasks;
DROP POLICY IF EXISTS "Anyone can update tasks" ON tasks;
DROP POLICY IF EXISTS "Faculty/Admin can manage tasks" ON tasks;

CREATE POLICY "Anyone can read tasks" ON tasks FOR SELECT USING (true);
CREATE POLICY "Anyone can update tasks" ON tasks FOR UPDATE USING (true);
CREATE POLICY "Faculty/Admin can manage tasks" ON tasks FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('principal', 'hod', 'faculty'))
);

-- 6. EVENTS
DROP POLICY IF EXISTS "Anyone can read events" ON events;
DROP POLICY IF EXISTS "Anyone can update events" ON events;
DROP POLICY IF EXISTS "Faculty/Admin can manage events" ON events;

CREATE POLICY "Anyone can read events" ON events FOR SELECT USING (true);
CREATE POLICY "Anyone can update events" ON events FOR UPDATE USING (true);
CREATE POLICY "Faculty/Admin can manage events" ON events FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('principal', 'hod', 'faculty'))
);

-- 7. TIME_SLOTS
DROP POLICY IF EXISTS "Anyone can read time_slots" ON time_slots;
DROP POLICY IF EXISTS "Faculty/Admin can manage time_slots" ON time_slots;

CREATE POLICY "Anyone can read time_slots" ON time_slots FOR SELECT USING (true);
CREATE POLICY "Faculty/Admin can manage time_slots" ON time_slots FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('principal', 'hod', 'faculty'))
);

-- 8. APPROVALS
DROP POLICY IF EXISTS "Anyone can read approvals" ON approvals;
DROP POLICY IF EXISTS "Anyone can update approvals" ON approvals;
DROP POLICY IF EXISTS "Anyone can create approvals" ON approvals;

CREATE POLICY "Anyone can read approvals" ON approvals FOR SELECT USING (true);
CREATE POLICY "Anyone can update approvals" ON approvals FOR UPDATE USING (true);
CREATE POLICY "Anyone can create approvals" ON approvals FOR INSERT WITH CHECK (true);

-- 9. LEAVES
DROP POLICY IF EXISTS "Anyone can read leaves" ON leaves;
DROP POLICY IF EXISTS "Anyone can update leaves" ON leaves;
DROP POLICY IF EXISTS "Anyone can create leaves" ON leaves;

CREATE POLICY "Anyone can read leaves" ON leaves FOR SELECT USING (true);
CREATE POLICY "Anyone can update leaves" ON leaves FOR UPDATE USING (true);
CREATE POLICY "Anyone can create leaves" ON leaves FOR INSERT WITH CHECK (true);

-- 10. CHAT_MESSAGES
DROP POLICY IF EXISTS "Anyone can read chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "Anyone can send chat_messages" ON chat_messages;

CREATE POLICY "Anyone can read chat_messages" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "Anyone can send chat_messages" ON chat_messages FOR INSERT WITH CHECK (true);

-- 11. NOTIFICATIONS
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

CREATE POLICY "Users can read own notifications" ON notifications FOR SELECT USING (true);
CREATE POLICY "System can create notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (true);

-- ENABLE REALTIME
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
