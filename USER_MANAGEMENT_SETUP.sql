-- Safe SQL for User Management System
-- This script adds new columns to the profiles table without affecting existing data.

-- 1. Add approval and contact columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS employee_id TEXT;

-- 2. Ensure RLS is enabled and policies allow admin to manage users
-- Uses public.get_my_role() (SECURITY DEFINER) to avoid infinite recursion
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Principals can update any profile" ON profiles;
CREATE POLICY "Principals can update any profile" ON profiles
FOR UPDATE TO authenticated
USING (
  public.get_my_role() = 'principal'
)
WITH CHECK (
  public.get_my_role() = 'principal'
);

DROP POLICY IF EXISTS "Principals can insert profiles" ON profiles;
CREATE POLICY "Principals can insert profiles" ON profiles
FOR INSERT TO authenticated
WITH CHECK (
  public.get_my_role() = 'principal'
);
