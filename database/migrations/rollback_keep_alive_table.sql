-- =====================================================
-- ROLLBACK: Remove keep_alive table + ping function
-- Date: 2026-09-02
-- Purpose: Rollback the Supabase keep-alive feature
-- =====================================================
--
-- NOTE: Before running this, remove the scheduler as well, or it will keep
-- calling a function that no longer exists and the endpoint will start
-- returning 500s daily:
--   1. Delete the "crons" entry from vercel.json and redeploy
--   2. Disable/delete the cron-job.org job
--
-- Once rolled back, the project will pause again after ~7 days idle.
-- =====================================================

BEGIN;

-- Drop the ping function
DROP FUNCTION IF EXISTS public.record_keep_alive_ping();

-- Drop the table (RLS settings go with it)
DROP TABLE IF EXISTS public.keep_alive;

COMMIT;

-- =====================================================
-- Rollback complete!
-- =====================================================
