-- =====================================================
-- MIGRATION: Add has_violation column to games table
-- Date: 2026-01-07
-- Purpose: Store violation status for performance optimization
-- =====================================================

BEGIN;

-- Add the has_violation column (nullable to handle existing games)
ALTER TABLE public.games
ADD COLUMN has_violation BOOLEAN DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.games.has_violation IS
  'Indicates if any rule violations exist in this game. NULL for legacy games not yet recalculated.';

-- Create index for filtering games by violation status
-- Partial index only covers non-NULL values for efficient filtering
CREATE INDEX idx_games_has_violation ON public.games(has_violation)
WHERE has_violation IS NOT NULL;

COMMIT;

-- =====================================================
-- Migration complete!
-- =====================================================
-- Notes:
--   - Existing games will have NULL until they are edited
--   - New games will have violations calculated on save
--   - Index only covers non-NULL values for efficient filtering
-- =====================================================
