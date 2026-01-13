-- =====================================================
-- ANALYSIS: Multiple Permissive Policies
-- Run this to understand the current policy structure
-- =====================================================

-- Show all tables with multiple SELECT policies
SELECT
    schemaname,
    tablename,
    COUNT(*) as policy_count,
    STRING_AGG(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies
WHERE schemaname = 'public'
  AND cmd = 'SELECT'
GROUP BY schemaname, tablename
HAVING COUNT(*) > 1
ORDER BY policy_count DESC, tablename;

-- =====================================================
-- Current State Analysis
-- =====================================================
-- Expected results:
--
-- user_profiles: 3 SELECT policies
--   1. "Users can view own profile" (own records)
--   2. "Admins can view all profiles" (admin access)
--   3. "Users can view active coaches and admins" (directory)
--
-- games: 3 SELECT policies
--   1. "Admins can manage games" (FOR ALL, includes SELECT)
--   2. "Coaches can manage team games" (FOR ALL, includes SELECT)
--   3. "Users can view games" (FOR SELECT)
--
-- Similar pattern for: players, seasons, teams, team_coaches,
-- game_players, pitching_logs, positions_played
-- =====================================================

-- =====================================================
-- DECISION FRAMEWORK
-- =====================================================
-- Question 1: Do these policies have DIFFERENT logic?
--   YES → Keep separate (easier to understand)
--   NO → Consider combining
--
-- Question 2: Is your database small (<10k rows)?
--   YES → Performance impact is negligible, keep separate for clarity
--   NO → Consider combining for performance
--
-- Question 3: Do you frequently modify permissions?
--   YES → Keep separate (easier to maintain)
--   NO → Safe to combine
--
-- =====================================================
-- RECOMMENDATION FOR THIS PROJECT
-- =====================================================
-- Based on the codebase analysis:
--
-- Current scale:
--   - Hundreds of games, not thousands
--   - Dozens of users, not hundreds
--   - Mostly read operations (viewing games/players)
--
-- Recommendation: KEEP POLICIES SEPARATE
--
-- Reasons:
--   1. Clarity: Each policy has clear purpose
--      - "Admins can manage" = admin permissions
--      - "Coaches can manage" = coach permissions
--      - "Users can view" = read-only access
--
--   2. Maintainability: Easy to modify one role without affecting others
--
--   3. Scale: Current data size won't see meaningful performance impact
--
--   4. Complexity: Combined policies would be harder to audit/understand
--
-- Performance cost: ~2-5ms per query (negligible at current scale)
-- Maintenance benefit: Clear, role-based permissions
--
-- Trade-off: Accept 64 warnings for better code maintainability
-- =====================================================

-- =====================================================
-- WHEN TO RECONSIDER
-- =====================================================
-- Revisit combining policies if:
--   1. Database exceeds 10,000+ games/players
--   2. Query performance becomes measurably slow (>100ms)
--   3. You have 100+ concurrent users
--   4. Coaches report slow page loads
--
-- At that point, the complexity trade-off may be justified
-- =====================================================
