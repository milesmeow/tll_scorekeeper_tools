-- =====================================================
-- ROLLBACK: Revert player age constraint back to 7-12
-- Date: 2026-02-01
-- Purpose: Rollback age range from 6-8 back to 7-8
-- =====================================================

BEGIN;

-- WARNING: This rollback will FAIL if there are any 6-year-old players in the database
-- You must delete or update any 6-year-old players before running this rollback

-- Drop the current constraint
ALTER TABLE public.players
  DROP CONSTRAINT IF EXISTS players_age_check;

-- Restore the original constraint (ages 7-12)
ALTER TABLE public.players
  ADD CONSTRAINT players_age_check CHECK (age >= 7 AND age <= 12);

COMMIT;

-- =====================================================
-- Rollback complete!
-- =====================================================
-- Notes:
--   - Reverts minimum age from 6 back to 7
--   - Maximum age remains 12
--   - Will FAIL if any players with age=6 exist in the database
--   - Delete or update 6-year-old players before running this rollback
-- =====================================================
