-- Rollback: Restore original restrictive teams view policy
-- This rollback restores the policy where coaches can only view their assigned teams

-- Drop the new policy
DROP POLICY IF EXISTS "All authenticated users can view teams" ON public.teams;

-- Restore the original restrictive policy
CREATE POLICY "Coaches can view assigned teams"
  ON public.teams FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      public.is_admin() OR
      EXISTS (
        SELECT 1 FROM public.team_coaches tc
        WHERE tc.team_id = teams.id AND tc.user_id = auth.uid()
      )
    )
  );

-- Note: After rollback, coaches will only see teams they're assigned to
-- Games and reports will show "Unknown" for other teams
