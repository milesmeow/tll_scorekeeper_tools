-- =====================================================
-- ROLLBACK: Fix Supabase Security Advisor Warnings
-- =====================================================
-- Date:    2026-07-22
-- Purpose: Reverse database/migrations/fix_security_advisor_warnings.sql
--
-- This recreates ONLY the rls_query_performance view and its grant, restoring
-- the dev-only monitoring tool. Note this will re-introduce the Supabase
-- security_definer_view finding — only roll back if you specifically need the
-- monitoring view again.
--
-- public.constraint_name_var is intentionally NOT recreated: it was an orphaned
-- scratch table with no known/tracked schema, so there is nothing to restore.
-- =====================================================

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
  (query ILIKE '%games%'
   OR query ILIKE '%players%'
   OR query ILIKE '%pitching_logs%'
   OR query ILIKE '%game_players%'
   OR query ILIKE '%positions_played%'
   OR query ILIKE '%seasons%'
   OR query ILIKE '%teams%'
   OR query ILIKE '%team_coaches%'
   OR query ILIKE '%user_profiles%')
  AND mean_exec_time > 5
ORDER BY mean_exec_time DESC
LIMIT 50;

COMMENT ON VIEW public.rls_query_performance IS
  'Monitors query performance on tables with multiple RLS policies.
   Use this to detect if policy overhead becomes significant.
   See database/PERFORMANCE_DECISIONS.md for thresholds.';

GRANT SELECT ON public.rls_query_performance TO authenticated;

-- Rollback complete!
