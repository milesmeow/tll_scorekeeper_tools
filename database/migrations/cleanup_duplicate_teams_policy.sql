-- =====================================================
-- MIGRATION: Cleanup duplicate teams SELECT policy
-- Date: 2026-01-12
-- Purpose: Remove redundant "Coaches can view assigned teams" policy
-- =====================================================
-- Background: The migration "update_teams_view_policy.sql" was supposed
-- to replace the restrictive coach policy with the broader authenticated
-- user policy, but both policies still exist in production.
--
-- This causes:
-- 1. auth_rls_initplan warning (old policy not optimized)
-- 2. multiple_permissive_policies warning (duplicate SELECT policies)
-- =====================================================

BEGIN;

-- Drop the old restrictive policy (redundant)
-- The "All authenticated users can view teams" policy already allows coaches to view
DROP POLICY IF EXISTS "Coaches can view assigned teams" ON public.teams;

-- Verify only 2 policies remain on teams table:
-- 1. "Admins can manage teams" - FOR ALL operations
-- 2. "All authenticated users can view teams" - FOR SELECT operations

COMMIT;

-- =====================================================
-- Expected Results After Migration:
-- =====================================================
-- ✅ Resolves: "Coaches can view assigned teams" auth_rls_initplan warning
-- ✅ Resolves: teams table multiple_permissive_policies warning
-- ✅ No functional change (coaches could already see all teams)
-- =====================================================
