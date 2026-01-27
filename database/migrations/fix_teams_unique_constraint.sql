-- Migration: Allow same team name in different divisions
-- Changes constraint from UNIQUE(season_id, name) to UNIQUE(season_id, name, division)
--
-- Problem: The original constraint prevented having "Red Sox" in both
-- Training and Major divisions within the same season.
--
-- Solution: Include division in the unique constraint so team names only
-- need to be unique within their specific division.
--
-- Run this in Supabase SQL Editor

-- Drop the existing constraint
ALTER TABLE public.teams
DROP CONSTRAINT teams_season_id_name_key;

-- Add the new constraint that includes division
ALTER TABLE public.teams
ADD CONSTRAINT teams_season_id_name_division_key UNIQUE(season_id, name, division);

-- Verification: After running, you should be able to create teams with the
-- same name in different divisions (e.g., "Red Sox" in Training AND "Red Sox" in Major)
