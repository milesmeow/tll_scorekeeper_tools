-- ============================================================================
-- COMBINED RLS POLICIES EXAMPLE
-- ============================================================================
--
-- WARNING: This file is for REFERENCE ONLY - do NOT apply these policies
-- unless database scale justifies the complexity trade-off.
--
-- Current Decision (2026-01-12): Keep separate policies for maintainability.
-- See database/PERFORMANCE_DECISIONS.md for full rationale.
--
-- When to Consider Using:
--   - Database exceeds 10,000+ games/players/records
--   - Query performance regularly >100ms
--   - 100+ concurrent users
--   - Users report slow page loads
--   - Profiling shows RLS policy evaluation is the bottleneck
--
-- ============================================================================

-- ============================================================================
-- EXAMPLE 1: GAMES TABLE - COMBINING SELECT POLICIES
-- ============================================================================
--
-- CURRENT STATE (3 policies evaluated for every SELECT):
--   1. "Admins can manage games" (FOR ALL - includes SELECT)
--   2. "Coaches can manage team games" (FOR ALL - includes SELECT)
--   3. "Users can view games" (FOR SELECT)
--
-- COMBINED STATE (1 policy for SELECT):
--   All SELECT operations evaluated by single policy with OR logic.
--
-- Trade-off: Harder to understand at a glance which roles have access,
--            but ~2-5ms faster per query at large scale.
-- ============================================================================

-- Step 1: Drop existing policies
-- DROP POLICY "Admins can manage games" ON public.games;
-- DROP POLICY "Coaches can manage team games" ON public.games;
-- DROP POLICY "Users can view games" ON public.games;

-- Step 2: Create combined SELECT policy
-- All authenticated users can view games (admins and coaches get this too)
CREATE POLICY "Games SELECT combined"
  ON public.games FOR SELECT
  USING (
    -- Any authenticated user can view games
    (select auth.uid()) IS NOT NULL
  );

-- Step 3: Create combined INSERT/UPDATE/DELETE policy for write operations
CREATE POLICY "Games write combined"
  ON public.games FOR ALL
  USING (
    -- Admins can do anything
    (select public.is_admin())
    OR
    -- Coaches can manage their team's games
    EXISTS (
      SELECT 1 FROM public.team_coaches tc
      WHERE (tc.team_id = games.home_team_id OR tc.team_id = games.away_team_id)
        AND tc.user_id = (select auth.uid())
        AND tc.can_edit_games = true
    )
  );

-- ============================================================================
-- EXAMPLE 2: PLAYERS TABLE - COMBINING SELECT POLICIES
-- ============================================================================
--
-- CURRENT STATE (3 policies):
--   1. "Admins can manage players" (FOR ALL)
--   2. "Coaches can manage team players" (FOR ALL)
--   3. "Users can view players" (FOR SELECT)
--
-- COMBINED STATE: Same pattern as games
-- ============================================================================

-- Step 1: Drop existing policies
-- DROP POLICY "Admins can manage players" ON public.players;
-- DROP POLICY "Coaches can manage team players" ON public.players;
-- DROP POLICY "Users can view players" ON public.players;

-- Step 2: Create combined SELECT policy
CREATE POLICY "Players SELECT combined"
  ON public.players FOR SELECT
  USING (
    (select auth.uid()) IS NOT NULL
  );

-- Step 3: Create combined write policy
CREATE POLICY "Players write combined"
  ON public.players FOR ALL
  USING (
    -- Admins can do anything
    (select public.is_admin())
    OR
    -- Coaches can manage their team's players
    EXISTS (
      SELECT 1 FROM public.team_coaches tc
      WHERE tc.team_id = players.team_id
        AND tc.user_id = (select auth.uid())
        AND tc.can_edit_roster = true
    )
  );

-- ============================================================================
-- EXAMPLE 3: USER_PROFILES TABLE - COMBINING SELECT POLICIES
-- ============================================================================
--
-- CURRENT STATE (3 SELECT policies):
--   1. "Users can view own profile"
--   2. "Admins can view all profiles"
--   3. "Users can view active coaches and admins"
--
-- COMBINED STATE: Single SELECT policy with OR logic
-- ============================================================================

-- Step 1: Drop existing SELECT policies
-- DROP POLICY "Users can view own profile" ON public.user_profiles;
-- DROP POLICY "Admins can view all profiles" ON public.user_profiles;
-- DROP POLICY "Users can view active coaches and admins" ON public.user_profiles;

-- Step 2: Create combined SELECT policy
CREATE POLICY "user_profiles SELECT combined"
  ON public.user_profiles FOR SELECT
  USING (
    -- Users can view their own profile
    id = (select auth.uid())
    OR
    -- Admins can view all profiles
    (select public.is_admin())
    OR
    -- Anyone authenticated can view active coaches and admins (for display purposes)
    (
      (select auth.uid()) IS NOT NULL
      AND is_active = true
      AND role IN ('admin', 'super_admin', 'coach')
    )
  );

-- ============================================================================
-- IMPLEMENTATION NOTES
-- ============================================================================
--
-- 1. TESTING: Before applying in production, test each combined policy
--    thoroughly to ensure no unintended access changes:
--    - Verify admins retain full access
--    - Verify coaches retain team-scoped access
--    - Verify regular users retain read-only access
--    - Verify unauthenticated users are blocked
--
-- 2. MIGRATION ORDER:
--    a. Create combined policies with temporary names
--    b. Test combined policies work correctly
--    c. Drop old policies
--    d. Rename combined policies to final names
--
-- 3. ROLLBACK PLAN: Keep original policy definitions in a backup file
--    or documented here so they can be quickly restored if issues arise.
--
-- 4. MONITORING: After applying, monitor query performance for 1-2 weeks
--    to validate expected improvements.
--
-- ============================================================================
-- ORIGINAL POLICIES FOR ROLLBACK REFERENCE
-- ============================================================================
--
-- Games (restore if combined policies cause issues):
--
-- CREATE POLICY "Admins can manage games"
--   ON public.games FOR ALL
--   USING ((select public.is_admin()));
--
-- CREATE POLICY "Coaches can manage team games"
--   ON public.games FOR ALL
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.team_coaches tc
--       WHERE (tc.team_id = games.home_team_id OR tc.team_id = games.away_team_id)
--         AND tc.user_id = (select auth.uid())
--         AND tc.can_edit_games = true
--     )
--   );
--
-- CREATE POLICY "Users can view games"
--   ON public.games FOR SELECT
--   USING ((select auth.uid()) IS NOT NULL);
--
-- ============================================================================
