-- Update leaves table to support multi-stage approval workflow
ALTER TABLE leaves DROP CONSTRAINT IF EXISTS leaves_status_check;
ALTER TABLE leaves ADD CONSTRAINT leaves_status_check CHECK (status IN ('pending', 'hod_approved', 'approved', 'rejected'));

-- Ensure department column exists for HOD filtering
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS department TEXT;

-- Update profiles table if needed (ensure role and department are correct)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('principal', 'hod', 'faculty', 'student', 'admin'));

-- Grant access to all authenticated users for now
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own leaves" ON leaves;
DROP POLICY IF EXISTS "HOD can view department leaves" ON leaves;
DROP POLICY IF EXISTS "Principal can view all leaves" ON leaves;
DROP POLICY IF EXISTS "Staff can update leave status" ON leaves;

-- Policy: Everyone can see their own leaves
CREATE POLICY "Users can view own leaves" ON leaves
  FOR SELECT USING (auth.uid() = applicant_id);

-- Policy: HOD can view department leaves
CREATE POLICY "HOD can view department leaves" ON leaves
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'hod' AND profiles.department = leaves.department
    )
  );

-- Policy: Principal can view all leaves
CREATE POLICY "Principal can view all leaves" ON leaves
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'principal'
    )
  );

-- Policy: Staff can update leave status
CREATE POLICY "Staff can update leave status" ON leaves
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('principal', 'hod')
    )
  );
