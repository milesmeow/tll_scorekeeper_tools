-- =====================================================
-- MIGRATION: Optimize RLS policies with subqueries
-- Date: 2026-01-12
-- Purpose: Fix Supabase Performance Advisor warnings about RLS policy performance
-- =====================================================
-- Issue: RLS policies that call auth.uid(), is_admin(), or is_super_admin()
--        directly are re-evaluated for EVERY ROW, causing poor performance at scale.
--
-- Solution: Wrap all auth function calls in subqueries like (select auth.uid())
--           so PostgreSQL evaluates them ONCE per query instead of per row.
--
-- Impact: Significant performance improvement on all queries with RLS enabled.
-- =====================================================

BEGIN;

-- =====================================================
-- 0. CLEANUP: Remove duplicate/obsolete policies
-- =====================================================
-- The "Coaches can view assigned teams" policy is redundant with
-- "All authenticated users can view teams" and causes warnings

DROP POLICY IF EXISTS "Coaches can view assigned teams" ON public.teams;

-- =====================================================
-- 1. USER_PROFILES POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.user_profiles FOR SELECT
  USING ((select public.is_admin()));

DROP POLICY IF EXISTS "Users can view active coaches and admins" ON public.user_profiles;
CREATE POLICY "Users can view active coaches and admins"
  ON public.user_profiles FOR SELECT
  USING (
    (select auth.uid()) IS NOT NULL
    AND role IN ('coach', 'admin', 'super_admin')
    AND is_active = true
  );

DROP POLICY IF EXISTS "Super admins can update profiles" ON public.user_profiles;
CREATE POLICY "Super admins can update profiles"
  ON public.user_profiles FOR UPDATE
  USING ((select public.is_super_admin()))
  WITH CHECK ((select public.is_super_admin()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Super admins can insert profiles" ON public.user_profiles;
CREATE POLICY "Super admins can insert profiles"
  ON public.user_profiles FOR INSERT
  WITH CHECK ((select public.is_super_admin()));

-- Note: "Prevent direct deletion" policy doesn't use auth functions, so no change needed

-- =====================================================
-- 2. SEASONS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage seasons" ON public.seasons;
CREATE POLICY "Admins can manage seasons"
  ON public.seasons FOR ALL
  USING ((select public.is_admin()));

DROP POLICY IF EXISTS "All authenticated users can view seasons" ON public.seasons;
CREATE POLICY "All authenticated users can view seasons"
  ON public.seasons FOR SELECT
  USING ((select auth.uid()) IS NOT NULL);

-- =====================================================
-- 3. TEAMS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage teams" ON public.teams;
CREATE POLICY "Admins can manage teams"
  ON public.teams FOR ALL
  USING ((select public.is_admin()));

DROP POLICY IF EXISTS "All authenticated users can view teams" ON public.teams;
CREATE POLICY "All authenticated users can view teams"
  ON public.teams FOR SELECT
  USING ((select auth.uid()) IS NOT NULL);

-- =====================================================
-- 4. TEAM_COACHES POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage team coaches" ON public.team_coaches;
CREATE POLICY "Admins can manage team coaches"
  ON public.team_coaches FOR ALL
  USING ((select public.is_admin()));

DROP POLICY IF EXISTS "All authenticated users can view coach assignments" ON public.team_coaches;
CREATE POLICY "All authenticated users can view coach assignments"
  ON public.team_coaches FOR SELECT
  USING ((select auth.uid()) IS NOT NULL);

-- =====================================================
-- 5. PLAYERS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage players" ON public.players;
CREATE POLICY "Admins can manage players"
  ON public.players FOR ALL
  USING ((select public.is_admin()));

DROP POLICY IF EXISTS "Coaches can manage team players" ON public.players;
CREATE POLICY "Coaches can manage team players"
  ON public.players FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.team_coaches tc
      WHERE tc.team_id = players.team_id
        AND tc.user_id = (select auth.uid())
        AND tc.can_edit = true
    )
  );

DROP POLICY IF EXISTS "Users can view players" ON public.players;
CREATE POLICY "Users can view players"
  ON public.players FOR SELECT
  USING ((select auth.uid()) IS NOT NULL);

-- =====================================================
-- 6. GAMES POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage games" ON public.games;
CREATE POLICY "Admins can manage games"
  ON public.games FOR ALL
  USING ((select public.is_admin()));

DROP POLICY IF EXISTS "Coaches can manage team games" ON public.games;
CREATE POLICY "Coaches can manage team games"
  ON public.games FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.team_coaches tc
      WHERE (tc.team_id = games.home_team_id OR tc.team_id = games.away_team_id)
        AND tc.user_id = (select auth.uid())
        AND tc.can_edit = true
    )
  );

DROP POLICY IF EXISTS "Users can view games" ON public.games;
CREATE POLICY "Users can view games"
  ON public.games FOR SELECT
  USING ((select auth.uid()) IS NOT NULL);

-- =====================================================
-- 7. GAME_PLAYERS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Manage game_players" ON public.game_players;
CREATE POLICY "Manage game_players"
  ON public.game_players FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.games g WHERE g.id = game_players.game_id) AND
    ((select public.is_admin()) OR
     EXISTS (
       SELECT 1 FROM public.team_coaches tc
       JOIN public.games g ON (tc.team_id = g.home_team_id OR tc.team_id = g.away_team_id)
       WHERE g.id = game_players.game_id
         AND tc.user_id = (select auth.uid())
         AND tc.can_edit = true
     ))
  );

DROP POLICY IF EXISTS "View game_players" ON public.game_players;
CREATE POLICY "View game_players"
  ON public.game_players FOR SELECT
  USING ((select auth.uid()) IS NOT NULL);

-- =====================================================
-- 8. PITCHING_LOGS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Manage pitching_logs" ON public.pitching_logs;
CREATE POLICY "Manage pitching_logs"
  ON public.pitching_logs FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.games g WHERE g.id = pitching_logs.game_id) AND
    ((select public.is_admin()) OR
     EXISTS (
       SELECT 1 FROM public.team_coaches tc
       JOIN public.games g ON (tc.team_id = g.home_team_id OR tc.team_id = g.away_team_id)
       WHERE g.id = pitching_logs.game_id
         AND tc.user_id = (select auth.uid())
         AND tc.can_edit = true
     ))
  );

DROP POLICY IF EXISTS "View pitching_logs" ON public.pitching_logs;
CREATE POLICY "View pitching_logs"
  ON public.pitching_logs FOR SELECT
  USING ((select auth.uid()) IS NOT NULL);

-- =====================================================
-- 9. POSITIONS_PLAYED POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Manage positions_played" ON public.positions_played;
CREATE POLICY "Manage positions_played"
  ON public.positions_played FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.games g WHERE g.id = positions_played.game_id) AND
    ((select public.is_admin()) OR
     EXISTS (
       SELECT 1 FROM public.team_coaches tc
       JOIN public.games g ON (tc.team_id = g.home_team_id OR tc.team_id = g.away_team_id)
       WHERE g.id = positions_played.game_id
         AND tc.user_id = (select auth.uid())
         AND tc.can_edit = true
     ))
  );

DROP POLICY IF EXISTS "View positions_played" ON public.positions_played;
CREATE POLICY "View positions_played"
  ON public.positions_played FOR SELECT
  USING ((select auth.uid()) IS NOT NULL);

COMMIT;

-- =====================================================
-- Migration complete!
-- =====================================================
-- Changes made:
-- 1. Removed duplicate "Coaches can view assigned teams" policy (redundant)
-- 2. Updated all 22 RLS policies to use subqueries for auth functions:
--      - auth.uid() → (select auth.uid())
--      - is_admin() → (select public.is_admin())
--      - is_super_admin() → (select public.is_super_admin())
--
-- Warnings resolved:
-- ✅ 23 auth_rls_initplan warnings (22 policies + 1 duplicate cleanup)
-- ✅ 1 multiple_permissive_policies warning (teams table)
--
-- Expected impact: Significant performance improvement on all
-- queries, especially for coaches viewing large result sets.
-- =====================================================
