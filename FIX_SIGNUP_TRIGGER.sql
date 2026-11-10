-- ============================================================
-- FIX: "Database error saving new user" on supabase.auth.signUp()
-- ============================================================
-- Root Cause:
--   The handle_new_user trigger (AFTER INSERT ON auth.users) runs
--   SECURITY DEFINER but still hits RLS on the profiles table.
--   The INSERT fails because no policy allows the trigger's context
--   to insert a NEW user's profile row unconditionally.
--
-- Fix:
--   1. Recreate the trigger function with SET search_path = public
--      and ensure it uses ON CONFLICT DO NOTHING (idempotent).
--   2. Add an INSERT policy that allows the service role / trigger
--      to create profiles for any user ID (not just auth.uid() = id).
-- ============================================================

-- STEP 1: Drop and recreate trigger cleanly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- STEP 2: Recreate the trigger function — robust version
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, email_verified, is_approved)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    FALSE,
    TRUE
  )
  ON CONFLICT (id) DO NOTHING;  -- idempotent: safe to run multiple times
  RETURN NEW;
END;
$$;

-- STEP 3: Re-attach the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- STEP 4: Drop any conflicting INSERT policies on profiles
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_admin" ON profiles;

-- STEP 5: Re-create INSERT policies
-- Allow anyone (trigger context / service role) to insert a profile
-- The trigger is SECURITY DEFINER so it bypasses RLS, but adding
-- a permissive policy ensures it works even if behaviour changes.

-- Authenticated users can insert their OWN profile (self-signup)
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Principals/HODs can insert any profile (admin user creation)
CREATE POLICY "profiles_insert_admin"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('principal', 'hod'));

-- Service role bypass (covers trigger execution context)
-- This ensures the SECURITY DEFINER trigger always succeeds
CREATE POLICY "profiles_insert_service"
  ON profiles FOR INSERT
  TO service_role
  WITH CHECK (true);

-- STEP 6: Ensure all required columns exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS temporary_password TEXT;

-- STEP 7: Backfill any existing auth users that are missing a profile
INSERT INTO public.profiles (id, email, name, role, email_verified, is_approved)
SELECT
  id,
  email,
  COALESCE((raw_user_meta_data->>'name')::text, split_part(email, '@', 1)),
  COALESCE((raw_user_meta_data->>'role')::text, 'student'),
  TRUE,
  TRUE
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- STEP 8: Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- VERIFY: After running, test signUp and check this query:
-- SELECT * FROM public.profiles ORDER BY created_at DESC LIMIT 5;
-- ============================================================
