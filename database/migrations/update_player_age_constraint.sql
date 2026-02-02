-- =====================================================
-- MIGRATION: Update player age constraint to allow 6-year-olds
-- Date: 2026-02-01
-- Purpose: Expand training division age range from 7-8 to 6-8
-- =====================================================

BEGIN;

-- Drop the existing age constraint
ALTER TABLE public.players
  DROP CONSTRAINT IF EXISTS players_age_check;

-- Add the new constraint allowing ages 6-12
ALTER TABLE public.players
  ADD CONSTRAINT players_age_check CHECK (age >= 6 AND age <= 12);

COMMIT;

-- =====================================================
-- Migration complete!
-- =====================================================
-- Notes:
--   - Updated minimum age from 7 to 6
--   - Maximum age remains 12
--   - Allows training division to include 6-year-old players
--   - Existing data should not be affected as all current players
--     are ages 7-12 (within the new range)
-- =====================================================
