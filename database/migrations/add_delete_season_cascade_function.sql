-- =====================================================
-- MIGRATION: Add delete_season_cascade() function
-- Date: 2026-09-19
-- Purpose: Let super_admins permanently delete a season and all of its data
--          (team rosters, coach assignments, games, pitching/catching logs,
--          and attendance/absences) as a single cleanup action.
-- =====================================================
--
-- fix_team_delete_constraints.sql intentionally changed teams.season_id,
-- games.season_id, and players.team_id from CASCADE to RESTRICT so that
-- accidental deletes fail loudly. This function is the deliberate,
-- super_admin-gated bypass of those guards: it deletes in the dependency
-- order the RESTRICT constraints require (games, then players, then teams,
-- then the season itself) inside one plpgsql function body, so the whole
-- operation is a single transaction -- if any step fails, everything rolls
-- back and nothing is left half-deleted.

BEGIN;

CREATE OR REPLACE FUNCTION public.delete_season_cascade(p_season_id UUID)
RETURNS TABLE (
  season_name TEXT,
  teams_deleted INTEGER,
  players_deleted INTEGER,
  coaches_deleted INTEGER,
  games_deleted INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_season_name TEXT;
  v_team_ids UUID[];
  v_teams_deleted INTEGER;
  v_players_deleted INTEGER;
  v_coaches_deleted INTEGER;
  v_games_deleted INTEGER;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super_admins can delete a season';
  END IF;

  SELECT s.name INTO v_season_name
  FROM public.seasons s
  WHERE s.id = p_season_id;

  IF v_season_name IS NULL THEN
    RAISE EXCEPTION 'Season not found';
  END IF;

  SELECT array_agg(t.id) INTO v_team_ids
  FROM public.teams t
  WHERE t.season_id = p_season_id;

  -- team_coaches has no season_id of its own and is cascade-deleted when its
  -- team is deleted below, so its count has to be taken before that happens.
  SELECT count(*) INTO v_coaches_deleted
  FROM public.team_coaches tc
  WHERE tc.team_id = ANY(v_team_ids);

  -- Deleting games cascades game_players, pitching_logs, and positions_played
  -- (all ON DELETE CASCADE on game_id), which covers pitching/catching data
  -- and attendance/absences for the season.
  WITH deleted AS (
    DELETE FROM public.games WHERE season_id = p_season_id RETURNING id
  )
  SELECT count(*) INTO v_games_deleted FROM deleted;

  -- Players must be deleted before their teams (players.team_id is RESTRICT).
  WITH deleted AS (
    DELETE FROM public.players WHERE team_id = ANY(v_team_ids) RETURNING id
  )
  SELECT count(*) INTO v_players_deleted FROM deleted;

  -- Teams cascade-delete team_coaches (team_coaches.team_id is CASCADE).
  WITH deleted AS (
    DELETE FROM public.teams WHERE season_id = p_season_id RETURNING id
  )
  SELECT count(*) INTO v_teams_deleted FROM deleted;

  DELETE FROM public.seasons WHERE id = p_season_id;

  RETURN QUERY
  SELECT v_season_name, v_teams_deleted, v_players_deleted, v_coaches_deleted, v_games_deleted;
END;
$$;

COMMENT ON FUNCTION public.delete_season_cascade IS
  'Permanently deletes a season and everything under it (teams/rosters, coach '
  'assignments, games, pitching/catching logs, attendance/absences). Only '
  'callable by super_admins. The whole delete runs as one transaction.';

COMMIT;

-- =====================================================
-- Migration complete!
-- =====================================================
-- Notes:
--   - Irreversible: there is no undo. Callers should export a backup first
--     (Tools > Export Season Data) if the data might be needed later.
--   - Deleting the currently active season is allowed; the app will simply
--     have no active season until a super_admin marks a different one active.
--   - Returns per-category counts so the caller can show a summary of what
--     was removed.
-- =====================================================
