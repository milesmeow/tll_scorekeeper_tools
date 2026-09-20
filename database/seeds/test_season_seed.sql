-- =====================================================
-- SEED: Disposable test season for manually testing
--       delete_season_cascade() (Tools > Danger Zone > Delete Season)
-- =====================================================
--
-- Creates ONE fully-populated test season so you can exercise every table
-- the cleanup function touches, then delete it through the app UI to
-- confirm the whole tree actually goes away:
--
--   seasons -> teams -> team_coaches, players
--                     -> games -> game_players (attendance/absences)
--                               -> pitching_logs
--                               -> positions_played
--
-- Run this in the Supabase SQL Editor. Safe to run more than once -- each
-- run creates a NEW season with a timestamp in its name, so runs never
-- collide with each other or with real data. Nothing outside this new
-- season is touched.
--
-- The season is created with is_active = false, so it won't interfere
-- with whatever season your users currently see as "the active one."
--
-- After running, go to Tools in the app, select the season named
-- "TEST SEASON - safe to delete (...)" from the dropdown, and use
-- Danger Zone > Delete Season to test the real delete flow end-to-end.
-- =====================================================

DO $$
DECLARE
  v_season_id UUID;
  v_season_name TEXT := 'TEST SEASON - safe to delete (' || to_char(now(), 'YYYY-MM-DD HH24:MI:SS') || ')';
  v_team_a_id UUID;
  v_team_b_id UUID;
  v_team_a_players UUID[];
  v_team_b_players UUID[];
  v_coach_user_id UUID;
  v_game1_id UUID;
  v_game2_id UUID;
  v_game3_id UUID;
BEGIN
  -- 1. Season (inactive, so it doesn't disturb the real active season)
  INSERT INTO public.seasons (name, start_date, end_date, is_active)
  VALUES (v_season_name, CURRENT_DATE - 30, CURRENT_DATE + 30, false)
  RETURNING id INTO v_season_id;

  -- 2. Teams
  INSERT INTO public.teams (season_id, name, division)
  VALUES (v_season_id, 'Test Tigers', 'Minor')
  RETURNING id INTO v_team_a_id;

  INSERT INTO public.teams (season_id, name, division)
  VALUES (v_season_id, 'Test Sharks', 'Minor')
  RETURNING id INTO v_team_b_id;

  -- 3. Coach assignment -- reuses whatever coach/admin profile already
  -- exists rather than trying to create an auth.users row from SQL.
  -- Skipped entirely if no coach/admin account exists yet.
  SELECT id INTO v_coach_user_id
  FROM public.user_profiles
  WHERE role IN ('coach', 'admin')
  ORDER BY created_at
  LIMIT 1;

  IF v_coach_user_id IS NOT NULL THEN
    INSERT INTO public.team_coaches (team_id, user_id, role, can_edit)
    VALUES (v_team_a_id, v_coach_user_id, 'head_coach', true);
  END IF;

  -- 4. Rosters: 9 players per team, ages 8-10, jerseys 1-9
  WITH ins AS (
    INSERT INTO public.players (team_id, name, age, jersey_number)
    SELECT v_team_a_id, 'Tiger Player ' || gs, 8 + (gs % 3), gs::text
    FROM generate_series(1, 9) AS gs
    RETURNING id
  )
  SELECT array_agg(id) INTO v_team_a_players FROM ins;

  WITH ins AS (
    INSERT INTO public.players (team_id, name, age, jersey_number)
    SELECT v_team_b_id, 'Shark Player ' || gs, 8 + (gs % 3), gs::text
    FROM generate_series(1, 9) AS gs
    RETURNING id
  )
  SELECT array_agg(id) INTO v_team_b_players FROM ins;

  -- 5. Games: 3, a week or so apart
  INSERT INTO public.games (season_id, game_date, home_team_id, away_team_id, home_score, away_score, scorekeeper_name, scorekeeper_team_id)
  VALUES (v_season_id, CURRENT_DATE - 14, v_team_a_id, v_team_b_id, 7, 5, 'Test Scorekeeper', v_team_a_id)
  RETURNING id INTO v_game1_id;

  INSERT INTO public.games (season_id, game_date, home_team_id, away_team_id, home_score, away_score, scorekeeper_name, scorekeeper_team_id)
  VALUES (v_season_id, CURRENT_DATE - 7, v_team_b_id, v_team_a_id, 3, 9, 'Test Scorekeeper', v_team_b_id)
  RETURNING id INTO v_game2_id;

  INSERT INTO public.games (season_id, game_date, home_team_id, away_team_id, home_score, away_score, scorekeeper_name, scorekeeper_team_id)
  VALUES (v_season_id, CURRENT_DATE, v_team_a_id, v_team_b_id, 4, 4, 'Test Scorekeeper', v_team_a_id)
  RETURNING id INTO v_game3_id;

  -- 6. Attendance for all 3 games (both full rosters), then mark a few absent
  INSERT INTO public.game_players (game_id, player_id, was_present)
  SELECT g.id, p.id, true
  FROM (VALUES (v_game1_id), (v_game2_id), (v_game3_id)) AS g(id)
  CROSS JOIN unnest(v_team_a_players || v_team_b_players) AS p(id);

  UPDATE public.game_players SET was_present = false, absence_note = 'Family trip'
  WHERE game_id = v_game1_id AND player_id = v_team_a_players[1];

  UPDATE public.game_players SET was_present = false, absence_note = 'Sick'
  WHERE game_id = v_game2_id AND player_id = v_team_b_players[2];

  UPDATE public.game_players SET was_present = false, absence_note = 'School event'
  WHERE game_id = v_game3_id AND player_id = v_team_a_players[3];

  -- 7. Pitching logs (a couple of pitchers per game)
  INSERT INTO public.pitching_logs (game_id, player_id, final_pitch_count, penultimate_batter_count, next_eligible_pitch_date)
  VALUES
    (v_game1_id, v_team_a_players[2], 45, 44, CURRENT_DATE - 14 + 3),
    (v_game1_id, v_team_b_players[2], 38, 37, CURRENT_DATE - 14 + 2),
    (v_game2_id, v_team_b_players[3], 52, 51, CURRENT_DATE - 7 + 4),
    (v_game2_id, v_team_a_players[4], 30, 29, NULL),
    (v_game3_id, v_team_a_players[2], 41, 40, CURRENT_DATE + 3);

  -- 8. Positions played, matching the pitching logs above plus a couple of catchers
  INSERT INTO public.positions_played (game_id, player_id, inning_number, position)
  VALUES
    (v_game1_id, v_team_a_players[2], 1, 'pitcher'),
    (v_game1_id, v_team_a_players[2], 2, 'pitcher'),
    (v_game1_id, v_team_b_players[3], 1, 'catcher'),
    (v_game1_id, v_team_b_players[3], 2, 'catcher'),
    (v_game2_id, v_team_b_players[3], 1, 'pitcher'),
    (v_game2_id, v_team_a_players[5], 1, 'catcher'),
    (v_game3_id, v_team_a_players[2], 1, 'pitcher'),
    (v_game3_id, v_team_b_players[4], 1, 'catcher');

  RAISE NOTICE 'Created test season "%" (id: %)', v_season_name, v_season_id;
END $$;

-- =====================================================
-- VERIFY: row counts for the most recently created test season.
-- Run this BEFORE deleting to see the full footprint, and again AFTER
-- using Tools > Danger Zone > Delete Season to confirm everything is gone
-- (every count below should be 0 after a successful delete).
-- =====================================================
WITH target_season AS (
  SELECT id FROM public.seasons
  WHERE name LIKE 'TEST SEASON - safe to delete%'
  ORDER BY created_at DESC
  LIMIT 1
)
SELECT
  (SELECT count(*) FROM public.seasons WHERE id IN (SELECT id FROM target_season)) AS seasons,
  (SELECT count(*) FROM public.teams WHERE season_id IN (SELECT id FROM target_season)) AS teams,
  (SELECT count(*) FROM public.team_coaches WHERE team_id IN (SELECT id FROM public.teams WHERE season_id IN (SELECT id FROM target_season))) AS team_coaches,
  (SELECT count(*) FROM public.players WHERE team_id IN (SELECT id FROM public.teams WHERE season_id IN (SELECT id FROM target_season))) AS players,
  (SELECT count(*) FROM public.games WHERE season_id IN (SELECT id FROM target_season)) AS games,
  (SELECT count(*) FROM public.game_players WHERE game_id IN (SELECT id FROM public.games WHERE season_id IN (SELECT id FROM target_season))) AS game_players_attendance_rows,
  (SELECT count(*) FROM public.game_players WHERE was_present = false AND game_id IN (SELECT id FROM public.games WHERE season_id IN (SELECT id FROM target_season))) AS absences,
  (SELECT count(*) FROM public.pitching_logs WHERE game_id IN (SELECT id FROM public.games WHERE season_id IN (SELECT id FROM target_season))) AS pitching_logs,
  (SELECT count(*) FROM public.positions_played WHERE game_id IN (SELECT id FROM public.games WHERE season_id IN (SELECT id FROM target_season))) AS positions_played;
