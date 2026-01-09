-- Migration: Update team_coaches RLS policy to allow all authenticated users to view coach assignments
-- Date: 2026-01-08
-- Purpose: Allow coaches to see who coaches other teams, enabling display of head coach names in TeamManagement

-- Drop the restrictive policy that only allows users to see their own assignments
DROP POLICY IF EXISTS "Users can view their coach assignments" ON public.team_coaches;

-- Create a new policy that allows all authenticated users to view coach assignments
CREATE POLICY "All authenticated users can view coach assignments"
  ON public.team_coaches FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Rationale: Coach assignments are not sensitive information. All authenticated users
-- (coaches and admins) should be able to see who coaches which teams, similar to how
-- all users can view teams themselves.
