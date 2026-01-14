-- =====================================================
-- ROLLBACK: Remove app_config table
-- Date: 2026-01-13
-- Purpose: Rollback maintenance mode feature
-- =====================================================

BEGIN;

-- Drop helper function
DROP FUNCTION IF EXISTS public.update_maintenance_mode(BOOLEAN, TEXT);

-- Drop table (RLS policies are automatically dropped)
DROP TABLE IF EXISTS public.app_config;

COMMIT;

-- =====================================================
-- Rollback complete!
-- =====================================================
