-- =====================================================
-- FIX: Prevent cascading deletes for teams
-- =====================================================
-- This migration changes foreign key constraints from CASCADE to RESTRICT
-- to prevent accidental deletion of teams that have associated data.

-- Drop and recreate the foreign key constraint on players table
ALTER TABLE public.players
DROP CONSTRAINT IF EXISTS players_team_id_fkey;

ALTER TABLE public.players
ADD CONSTRAINT players_team_id_fkey
  FOREIGN KEY (team_id)
  REFERENCES public.teams(id)
  ON DELETE RESTRICT;

-- Drop and recreate the foreign key constraint on games table for home_team_id
ALTER TABLE public.games
DROP CONSTRAINT IF EXISTS games_home_team_id_fkey;

ALTER TABLE public.games
ADD CONSTRAINT games_home_team_id_fkey
  FOREIGN KEY (home_team_id)
  REFERENCES public.teams(id)
  ON DELETE RESTRICT;

-- Drop and recreate the foreign key constraint on games table for away_team_id
ALTER TABLE public.games
DROP CONSTRAINT IF EXISTS games_away_team_id_fkey;

ALTER TABLE public.games
ADD CONSTRAINT games_away_team_id_fkey
  FOREIGN KEY (away_team_id)
  REFERENCES public.teams(id)
  ON DELETE RESTRICT;

-- Optional: Also fix scorekeeper_team_id to be consistent
ALTER TABLE public.games
DROP CONSTRAINT IF EXISTS games_scorekeeper_team_id_fkey;

ALTER TABLE public.games
ADD CONSTRAINT games_scorekeeper_team_id_fkey
  FOREIGN KEY (scorekeeper_team_id)
  REFERENCES public.teams(id)
  ON DELETE RESTRICT;

-- =====================================================
-- RESULT: Teams can no longer be deleted if they have:
-- - Players assigned to them
-- - Games where they are home or away team
-- - Games where they are the scorekeeper team
-- =====================================================
