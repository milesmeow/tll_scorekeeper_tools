-- Migration: Allow all authenticated users to view all teams
-- This fixes the "Unknown" team issue for coaches viewing games

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Coaches can view assigned teams" ON public.teams;

-- Create new policy allowing all authenticated users to view teams
CREATE POLICY "All authenticated users can view teams"
  ON public.teams FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Note: Coaches can now see all team names but still cannot edit teams they're not assigned to
-- The "Admins can manage teams" policy ensures only admins have write access
