-- =====================================================
-- MIGRATION: Enable RLS on user_profiles
-- Date: 2025-12-25
-- Purpose: Resolve Supabase security warning by enabling
--          RLS while avoiding infinite recursion
-- =====================================================
--
-- Background:
-- The user_profiles table was intentionally left without RLS
-- to prevent infinite recursion: RLS policies on other tables
-- call is_admin() which queries user_profiles, which would
-- trigger RLS policies, creating a loop.
--
-- Solution:
-- Create a private schema function that explicitly bypasses
-- RLS (SET LOCAL row_security = off), then use this function
-- in the helper functions to break the recursion cycle.
-- =====================================================

BEGIN;

-- =====================================================
-- Step 1: Create private schema for internal functions
-- =====================================================

CREATE SCHEMA IF NOT EXISTS private;

-- =====================================================
-- Step 2: Create RLS-bypass function
-- =====================================================
-- This function is SECURITY DEFINER and explicitly bypasses RLS
-- It's safe because:
--   1. It's not directly accessible to application users
--   2. It only returns limited data (role and is_active status)
--   3. It's used only by helper functions for policy checks

CREATE OR REPLACE FUNCTION private.get_user_info(user_id UUID)
RETURNS TABLE (role TEXT, is_active BOOLEAN) AS $$
BEGIN
  -- Temporarily disable RLS for this function's queries
  -- This is safe because the function is SECURITY DEFINER
  SET LOCAL row_security = off;

  RETURN QUERY
  SELECT up.role, up.is_active
  FROM public.user_profiles up
  WHERE up.id = user_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke public access to prevent direct calls from application
REVOKE ALL ON FUNCTION private.get_user_info(UUID) FROM PUBLIC;

-- =====================================================
-- Step 3: Update helper functions to use RLS-bypass
-- =====================================================
-- These functions now call get_user_info instead of
-- directly querying user_profiles, breaking the recursion cycle

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM private.get_user_info(auth.uid()) AS user_info
    WHERE user_info.role IN ('super_admin', 'admin')
    AND user_info.is_active = true
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM private.get_user_info(auth.uid()) AS user_info
    WHERE user_info.role = 'super_admin'
    AND user_info.is_active = true
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- =====================================================
-- Step 4: Enable RLS on user_profiles
-- =====================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Step 5: Create RLS policies for user_profiles
-- =====================================================

-- Policy 1: Users can always read their own profile
-- Essential for login, session management, and profile display
CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  USING (id = auth.uid());

-- Policy 2: Admins and super admins can view all profiles
-- Needed for UserManagement.jsx and CoachManagement.jsx
-- No recursion because is_admin() now uses get_user_info()
CREATE POLICY "Admins can view all profiles"
  ON public.user_profiles
  FOR SELECT
  USING (public.is_admin());

-- Policy 3: All authenticated users can view active coaches/admins
-- Needed for ManageCoachesModal.jsx and team management
-- This allows coaches to see other coaches for coordination
CREATE POLICY "Users can view active coaches and admins"
  ON public.user_profiles
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND role IN ('coach', 'admin', 'super_admin')
    AND is_active = true
  );

-- Policy 4: Only super admins can update user profiles
-- Supports toggling is_active status in UserManagement.jsx
CREATE POLICY "Super admins can update profiles"
  ON public.user_profiles
  FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Policy 5: Users can update their own profile
-- Needed for password change flow (updating must_change_password flag)
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (id = auth.uid());

-- Policy 6: Only super admins can insert new profiles
-- Used by edge functions (service role bypasses RLS anyway)
CREATE POLICY "Super admins can insert profiles"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (public.is_super_admin());

-- Policy 7: Prevent direct deletion of profiles
-- Deletions should happen via cascade from auth.users
CREATE POLICY "Prevent direct deletion"
  ON public.user_profiles
  FOR DELETE
  USING (false);

COMMIT;

-- =====================================================
-- Migration complete!
-- =====================================================
-- Verification steps:
--   1. Test that is_admin() and is_super_admin() work without recursion
--   2. Verify users can read their own profiles
--   3. Verify admins can read all profiles
--   4. Test existing application workflows (login, user management, etc.)
--   5. Confirm Supabase security warning is resolved
