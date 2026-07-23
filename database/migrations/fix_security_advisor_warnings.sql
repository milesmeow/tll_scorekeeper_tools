-- =====================================================
-- MIGRATION: Fix Supabase Security Advisor Warnings
-- =====================================================
-- Date:    2026-07-22
-- Purpose: Resolve two ERROR-level findings from the Supabase Security Advisor:
--
--   1. security_definer_view  — public.rls_query_performance
--      A view over pg_stat_statements silently inherits the creating
--      superuser's privileges and was GRANTed SELECT to all authenticated
--      users, leaking query strings across sessions. It was a dev-only
--      RLS-performance debugging tool with no application usage.
--
--   2. rls_disabled_in_public — public.constraint_name_var
--      An orphaned scratch table left over from an ad-hoc SQL Editor
--      migration. It exists only in the live DB (never in source control),
--      has RLS disabled, and is exposed to all PostgREST clients.
--
-- Run this in the Supabase SQL Editor against the live project.
-- Reference: database/migrations/OFFSEASON_SECURITY_FIXES.md
-- =====================================================

-- -----------------------------------------------------
-- Fix 1: Drop the rls_query_performance view
-- -----------------------------------------------------
-- No app code references this view. The pg_stat_statements extension and the
-- reset_query_stats() function (guarded by is_super_admin()) are intentionally
-- KEPT — only the leaky view is removed.
DROP VIEW IF EXISTS public.rls_query_performance;

-- -----------------------------------------------------
-- Fix 2: Drop the orphaned constraint_name_var table
-- -----------------------------------------------------
-- Optional pre-checks (run manually to confirm it is safe to drop):
--
--   SELECT column_name, data_type
--   FROM information_schema.columns
--   WHERE table_name = 'constraint_name_var' AND table_schema = 'public';
--
--   SELECT COUNT(*) FROM public.constraint_name_var;
--
DROP TABLE IF EXISTS public.constraint_name_var;

-- =====================================================
-- VERIFICATION
-- =====================================================
-- After running, confirm both objects are gone and reset_query_stats remains:
--
--   SELECT * FROM information_schema.views  WHERE table_name = 'rls_query_performance';  -- 0 rows
--   SELECT * FROM information_schema.tables WHERE table_name = 'constraint_name_var';     -- 0 rows
--   SELECT proname FROM pg_proc             WHERE proname   = 'reset_query_stats';         -- 1 row (kept)
--
-- Then re-run the Supabase Security Advisor scan — both ERROR entries should be gone.
-- =====================================================

-- Migration complete!
