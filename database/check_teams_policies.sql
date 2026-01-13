-- =====================================================
-- Check current policies on teams table
-- Run this in Supabase SQL Editor to see what's in production
-- =====================================================

-- Show all policies on teams table with their definitions
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd AS command,
    qual AS using_clause,
    with_check AS with_check_clause
FROM pg_policies
WHERE tablename = 'teams'
  AND schemaname = 'public'
ORDER BY policyname;

-- This will show you:
-- 1. "Admins can manage teams"
-- 2. "All authenticated users can view teams"
-- 3. "Coaches can view assigned teams" (this one is NOT in schema.sql)

-- =====================================================
-- DECISION NEEDED:
-- =====================================================
-- Looking at the output, you need to decide:
--
-- Option 1: KEEP the "Coaches can view assigned teams" policy
--   - If it serves a different purpose than "All authenticated users can view teams"
--   - Update it with subquery optimization (see below)
--   - Add it to schema.sql
--
-- Option 2: REMOVE the "Coaches can view assigned teams" policy
--   - If it's redundant with "All authenticated users can view teams"
--   - Drop it (see below)
--
-- =====================================================

-- =====================================================
-- OPTION 1: Update "Coaches can view assigned teams" with subquery
-- =====================================================
-- First, see what the policy currently looks like (from query above)
-- Then update it with (select auth.uid()) pattern:

-- Example (adjust based on actual policy):
/*
DROP POLICY IF EXISTS "Coaches can view assigned teams" ON public.teams;
CREATE POLICY "Coaches can view assigned teams"
  ON public.teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_coaches tc
      WHERE tc.team_id = teams.id
        AND tc.user_id = (select auth.uid())
    )
  );
*/

-- =====================================================
-- OPTION 2: Remove "Coaches can view assigned teams" policy
-- =====================================================
-- If "All authenticated users can view teams" makes this redundant:
/*
DROP POLICY IF EXISTS "Coaches can view assigned teams" ON public.teams;
*/

-- NOTE: After making changes, this will also resolve the
-- "multiple_permissive_policies" warning for teams table!
