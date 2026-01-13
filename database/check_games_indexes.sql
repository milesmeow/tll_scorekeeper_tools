-- =====================================================
-- DIAGNOSTIC QUERIES: Check games table indexes and policies
-- Date: 2026-01-12
-- Purpose: Investigate Supabase Performance Advisor warning about missing foreign key indexes
-- Decision: Indexes declined - see database/PERFORMANCE_DECISIONS.md for full analysis
-- =====================================================
-- Run these in Supabase SQL Editor to verify current state
-- =====================================================

-- 1. Check all indexes on the games table
-- This shows what indexes currently exist
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'games'
  AND schemaname = 'public'
ORDER BY indexname;

-- Expected to see:
-- - games_pkey (primary key)
-- - idx_games_season
-- - idx_games_date
-- - idx_games_has_violation
-- Missing (what we need to add):
-- - idx_games_home_team
-- - idx_games_away_team
-- - idx_games_scorekeeper_team


-- =====================================================
-- 2. Check all foreign key constraints on games table
-- This shows which columns reference other tables
SELECT
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    a.attname AS column_name,
    confrelid::regclass AS foreign_table_name
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
WHERE conrelid = 'public.games'::regclass
  AND contype = 'f'
ORDER BY conname;

-- Expected to see:
-- - games_away_team_id_fkey -> teams
-- - games_home_team_id_fkey -> teams
-- - games_scorekeeper_team_id_fkey -> teams
-- - games_season_id_fkey -> seasons


-- =====================================================
-- 3. Check which foreign keys are missing indexes
-- This identifies the performance issue
SELECT
    c.conname AS foreign_key_constraint,
    att.attname AS column_name,
    CASE
        WHEN i.indexrelid IS NULL THEN '❌ MISSING INDEX'
        ELSE '✅ Has index: ' || idx.relname
    END AS index_status
FROM pg_constraint c
JOIN pg_attribute att ON att.attnum = ANY(c.conkey) AND att.attrelid = c.conrelid
LEFT JOIN pg_index i ON i.indrelid = c.conrelid
    AND att.attnum = ANY(i.indkey)
    AND i.indisprimary = false
LEFT JOIN pg_class idx ON idx.oid = i.indexrelid
WHERE c.conrelid = 'public.games'::regclass
  AND c.contype = 'f'
ORDER BY c.conname;


-- =====================================================
-- 4. Check RLS policies that use these foreign keys
-- This shows policies that will benefit from indexes
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual AS using_clause
FROM pg_policies
WHERE tablename = 'games'
  AND schemaname = 'public'
ORDER BY policyname;

-- Look for policies that reference home_team_id, away_team_id in USING clause


-- =====================================================
-- 5. Check table statistics (how many games exist)
-- More rows = more important to have indexes
SELECT
    schemaname,
    relname AS table_name,
    n_live_tup AS row_count,
    n_dead_tup AS dead_rows,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE relname = 'games'
  AND schemaname = 'public';


-- =====================================================
-- 6. EXPLAIN ANALYZE: Test query performance WITHOUT index
-- Run this to see current performance (before adding indexes)
-- Replace 'your-team-uuid' with actual team UUID
EXPLAIN ANALYZE
SELECT id, game_date, home_score, away_score
FROM public.games
WHERE home_team_id = 'your-team-uuid'
   OR away_team_id = 'your-team-uuid';

-- Look for "Seq Scan" (table scan) vs "Index Scan" (good)
-- Note the "Execution Time" value


-- =====================================================
-- 7. Check RLS policy performance (coach access pattern)
-- This simulates what happens when a coach queries games
-- Replace with actual coach user_id and team_id
EXPLAIN ANALYZE
SELECT g.*
FROM public.games g
WHERE EXISTS (
    SELECT 1 FROM public.team_coaches tc
    WHERE (tc.team_id = g.home_team_id OR tc.team_id = g.away_team_id)
      AND tc.user_id = 'your-coach-user-uuid'
      AND tc.can_edit = true
);

-- Without indexes, this will be slow (nested loop with seq scan)
-- With indexes, should use Index Scan on games


-- =====================================================
-- SUMMARY
-- =====================================================
-- Run queries 1-5 to diagnose current state
-- Run queries 6-7 to measure performance impact
-- If you see "❌ MISSING INDEX" in query #3, that confirms the issue
-- =====================================================
