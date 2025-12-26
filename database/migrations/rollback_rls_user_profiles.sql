-- =====================================================
-- ROLLBACK: Disable RLS on user_profiles
-- Date: 2025-12-25
-- Purpose: Emergency rollback to previous state
-- =====================================================
--
-- This rollback script restores the previous state where
-- user_profiles had no RLS enabled. Use this if the
-- migration causes issues in production.
--
-- IMPORTANT: Only run this if necessary. The forward
-- migration (enable_rls_user_profiles.sql) is the
-- recommended secure configuration.
-- =====================================================

BEGIN;

-- =====================================================
-- Step 1: Drop all RLS policies on user_profiles
-- =====================================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view active coaches and admins" ON public.user_profiles;
DROP POLICY IF EXISTS "Super admins can update profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Super admins can insert profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Prevent direct deletion" ON public.user_profiles;

-- =====================================================
-- Step 2: Disable RLS on user_profiles
-- =====================================================

ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- Step 3: Restore original helper functions
-- =====================================================
-- Revert to the original implementation that directly
-- queries user_profiles without using get_user_info()

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'admin')
    AND is_active = true
  );
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- =====================================================
-- Step 4: Optionally remove private schema
-- =====================================================
-- Uncomment these lines if you want to completely remove
-- the private schema and get_user_info function:
--
-- DROP FUNCTION IF EXISTS private.get_user_info(UUID);
-- DROP SCHEMA IF EXISTS private CASCADE;
--
-- Note: Only drop the private schema if nothing else uses it.
-- For safety, we're leaving it in place by default.

COMMIT;

-- =====================================================
-- Rollback complete!
-- =====================================================
-- The database is now in the previous state:
--   - user_profiles has no RLS enabled
--   - Helper functions query user_profiles directly
--   - Supabase security warning will reappear
--
-- Next steps:
--   1. Investigate why the migration caused issues
--   2. Fix the forward migration script
--   3. Re-test in development/staging
--   4. Schedule a new deployment
