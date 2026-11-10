-- Allow email verification update
DROP POLICY IF EXISTS "Allow email verification" ON profiles;
CREATE POLICY "Allow email verification" ON profiles
  FOR UPDATE USING (true);
