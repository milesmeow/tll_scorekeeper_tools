-- =====================================================
-- PERFORMANCE MONITORING SETUP
-- =====================================================
-- Enables pg_stat_statements for query performance tracking
-- Run this in Supabase SQL Editor
--
-- Purpose: Monitor RLS policy overhead as application scales
-- Decision: Keep multiple permissive policies for maintainability,
--           but add monitoring to catch performance degradation
-- Reference: database/PERFORMANCE_DECISIONS.md
-- =====================================================

-- Enable pg_stat_statements extension
-- This is PostgreSQL's built-in query profiler with minimal overhead
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Create a view for monitoring slow queries on RLS-heavy tables
-- This focuses on tables with multiple permissive policies
CREATE OR REPLACE VIEW public.rls_query_performance AS
SELECT
  substring(query, 1, 150) as query_preview,
  calls as total_calls,
  round(total_exec_time::numeric, 2) as total_time_ms,
  round(mean_exec_time::numeric, 2) as avg_time_ms,
  round(min_exec_time::numeric, 2) as min_time_ms,
  round(max_exec_time::numeric, 2) as max_time_ms,
  round(stddev_exec_time::numeric, 2) as stddev_ms,
  rows as total_rows_returned
FROM pg_stat_statements
WHERE
  -- Focus on tables with multiple permissive policies
  (query ILIKE '%games%'
   OR query ILIKE '%players%'
   OR query ILIKE '%pitching_logs%'
   OR query ILIKE '%game_players%'
   OR query ILIKE '%positions_played%'
   OR query ILIKE '%seasons%'
   OR query ILIKE '%teams%'
   OR query ILIKE '%team_coaches%'
   OR query ILIKE '%user_profiles%')
  -- Exclude very fast queries (not interesting for monitoring)
  AND mean_exec_time > 5
ORDER BY mean_exec_time DESC
LIMIT 50;

-- Add comment explaining the view
COMMENT ON VIEW public.rls_query_performance IS
  'Monitors query performance on tables with multiple RLS policies.
   Use this to detect if policy overhead becomes significant.
   See database/PERFORMANCE_DECISIONS.md for thresholds.';

-- Grant access to authenticated users (admins will use this)
GRANT SELECT ON public.rls_query_performance TO authenticated;

-- Create a function to reset stats (for fresh measurements after changes)
CREATE OR REPLACE FUNCTION public.reset_query_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only super_admins can reset stats
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super_admins can reset query statistics';
  END IF;

  PERFORM pg_stat_statements_reset();
END;
$$;

COMMENT ON FUNCTION public.reset_query_stats IS
  'Resets pg_stat_statements. Only callable by super_admins.
   Use after making RLS policy changes to get fresh measurements.';

-- =====================================================
-- ROLLBACK SCRIPT (if needed)
-- =====================================================
-- To remove monitoring (uncomment and run if issues occur):
--
-- DROP VIEW IF EXISTS public.rls_query_performance;
-- DROP FUNCTION IF EXISTS public.reset_query_stats();
-- Note: pg_stat_statements extension can remain enabled (no overhead)
-- =====================================================

-- =====================================================
-- VERIFICATION
-- =====================================================
-- After running this migration, verify with:
--
-- SELECT * FROM rls_query_performance;
-- (May be empty if no queries have exceeded 5ms avg yet)
-- =====================================================
