-- Rollback Migration: Restore restrictive team_coaches RLS policy
-- Date: 2026-01-08
-- Purpose: Rollback the policy change if needed, restoring the original restrictive policy

-- Drop the permissive policy
DROP POLICY IF EXISTS "All authenticated users can view coach assignments" ON public.team_coaches;

-- Restore the restrictive policy that only allows users to see their own assignments
CREATE POLICY "Users can view their coach assignments"
  ON public.team_coaches FOR SELECT
  USING (user_id = auth.uid());
