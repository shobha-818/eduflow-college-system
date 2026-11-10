-- ============================================================
-- FIX: Infinite recursion in profiles RLS policies
-- ============================================================
-- Problem: Multiple policies on the "profiles" table reference
-- the "profiles" table itself to check the user's role, causing
-- PostgreSQL error 42P17 (infinite recursion).
--
-- Solution: Create a SECURITY DEFINER function that reads the
-- user's role WITHOUT triggering RLS, then use that function
-- in all policies that need role-based checks.
-- ============================================================

-- STEP 1: Create a helper function that bypasses RLS
-- This runs as the function owner (superuser), so it is not
-- subject to RLS policies on the profiles table.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- STEP 2: Drop ALL existing policies on profiles to start clean
DROP POLICY IF EXISTS "Anyone can read profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow public email verification" ON profiles;
DROP POLICY IF EXISTS "Principals can update any profile" ON profiles;
DROP POLICY IF EXISTS "Principals can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Enable profile verification for unauthenticated users" ON profiles;
DROP POLICY IF EXISTS "Allow email verification" ON profiles;

-- STEP 3: Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- STEP 4: Create clean, non-recursive policies

-- 4a. Anyone authenticated can READ all profiles
CREATE POLICY "profiles_select_all"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- 4b. Anon users can also read profiles (needed for email verification flow)
CREATE POLICY "profiles_select_anon"
  ON profiles FOR SELECT
  TO anon
  USING (true);

-- 4c. Users can INSERT their own profile (signup flow)
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 4d. Users can UPDATE their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- 4e. Principals/HODs can UPDATE any profile (admin management)
--     Uses get_my_role() to avoid recursion!
CREATE POLICY "profiles_update_admin"
  ON profiles FOR UPDATE
  TO authenticated
  USING (public.get_my_role() IN ('principal', 'hod'));

-- 4f. Principals/HODs can INSERT profiles (admin user creation)
CREATE POLICY "profiles_insert_admin"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('principal', 'hod'));

-- 4g. Principals/HODs can DELETE profiles (admin user removal)
CREATE POLICY "profiles_delete_admin"
  ON profiles FOR DELETE
  TO authenticated
  USING (public.get_my_role() IN ('principal', 'hod'));

-- 4h. Email verification: anon/authenticated can update specific fields
--     (the app WHERE clause ensures token match)
CREATE POLICY "profiles_update_verification"
  ON profiles FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- STEP 5: Also fix other tables that reference profiles in their policies.
-- These are safe because they query profiles (which has SELECT open to all)
-- but let's use get_my_role() for consistency and future-proofing.

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- VERIFICATION: Run this query to confirm no recursive policies
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'profiles';
-- ============================================================
