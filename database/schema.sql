-- =====================================================
-- BASEBALL TEAM MANAGEMENT - DATABASE SCHEMA
-- =====================================================
-- Run this in your Supabase SQL Editor

-- =====================================================
-- 1. USERS & ROLES (extends Supabase auth.users)
-- =====================================================

CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'coach')),
  is_active BOOLEAN DEFAULT true,
  must_change_password BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('super_admin', 'admin', 'coach'));


-- =====================================================
-- 2. SEASONS
-- =====================================================

CREATE TABLE public.seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- e.g., "2025 Season"
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_seasons_active ON public.seasons(is_active);

-- Create unique partial index to enforce only one active season
CREATE UNIQUE INDEX idx_only_one_active_season 
  ON public.seasons(is_active) 
  WHERE is_active = true;

-- =====================================================
-- 3. TEAMS
-- =====================================================

CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  division TEXT NOT NULL CHECK (division IN ('Training', 'Minor', 'Major')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(season_id, name)
);

CREATE INDEX idx_teams_season ON public.teams(season_id);

-- =====================================================
-- 4. TEAM COACHES (Permissions)
-- =====================================================

CREATE TABLE public.team_coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('head_coach', 'assistant')),
  can_edit BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

CREATE INDEX idx_team_coaches_user ON public.team_coaches(user_id);
CREATE INDEX idx_team_coaches_team ON public.team_coaches(team_id);

-- Update the check constraint on team_coaches to remove scorekeeper
ALTER TABLE public.team_coaches 
DROP CONSTRAINT IF EXISTS team_coaches_role_check;

ALTER TABLE public.team_coaches 
ADD CONSTRAINT team_coaches_role_check 
CHECK (role IN ('head_coach', 'assistant'));

-- =====================================================
-- 5. PLAYERS
-- =====================================================

CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 7 AND age <= 22),
  jersey_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_players_team ON public.players(team_id);
CREATE INDEX idx_players_age ON public.players(age);

-- Add unique constraint on team_id + jersey_number
-- This ensures jersey numbers are unique per team
ALTER TABLE public.players 
ADD CONSTRAINT unique_jersey_per_team 
UNIQUE (team_id, jersey_number);



-- =====================================================
-- 6. GAMES
-- =====================================================

CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  game_date DATE NOT NULL,
  home_team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  away_team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  home_score INTEGER,
  away_score INTEGER,
  scorekeeper_name TEXT NOT NULL,
  scorekeeper_team_id UUID REFERENCES public.teams(id);
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (home_team_id != away_team_id)
);

CREATE INDEX idx_games_season ON public.games(season_id);
CREATE INDEX idx_games_date ON public.games(game_date);
CREATE INDEX idx_games_home_team ON public.games(home_team_id);
CREATE INDEX idx_games_away_team ON public.games(away_team_id);

-- Add scorekeeper fields to games table
ALTER TABLE public.games 
-- Add comment to clarify the field
COMMENT ON COLUMN public.games.scorekeeper_team_id IS 'The team that the scorekeeper belongs to';


-- =====================================================
-- 7. GAME PLAYERS (Attendance)
-- =====================================================

CREATE TABLE public.game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  was_present BOOLEAN NOT NULL DEFAULT true,
  absence_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, player_id)
);

CREATE INDEX idx_game_players_game ON public.game_players(game_id);
CREATE INDEX idx_game_players_player ON public.game_players(player_id);
CREATE INDEX idx_game_players_absent ON public.game_players(was_present) WHERE was_present = false;

-- =====================================================
-- 8. PITCHING LOGS
-- =====================================================

CREATE TABLE public.pitching_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  final_pitch_count INTEGER NOT NULL CHECK (final_pitch_count >= 0),
  penultimate_batter_count INTEGER NOT NULL CHECK (penultimate_batter_count >= 0),
  next_eligible_pitch_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (penultimate_batter_count <= final_pitch_count)
);

CREATE INDEX idx_pitching_logs_game ON public.pitching_logs(game_id);
CREATE INDEX idx_pitching_logs_player ON public.pitching_logs(player_id);

-- Add next_eligible_pitch_date column for existing installations
-- (Safe to run - will be ignored if column already exists)
ALTER TABLE public.pitching_logs
ADD COLUMN IF NOT EXISTS next_eligible_pitch_date DATE;

-- =====================================================
-- 9. POSITIONS PLAYED
-- =====================================================

CREATE TABLE public.positions_played (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  inning_number INTEGER NOT NULL CHECK (inning_number > 0),
  position TEXT NOT NULL CHECK (position IN ('pitcher', 'catcher')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, player_id, inning_number, position)
);

CREATE INDEX idx_positions_game ON public.positions_played(game_id);
CREATE INDEX idx_positions_player ON public.positions_played(player_id);
CREATE INDEX idx_positions_position ON public.positions_played(position);

-- =====================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables EXCEPT user_profiles (to avoid recursion)
-- user_profiles is still protected by authentication
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pitching_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions_played ENABLE ROW LEVEL SECURITY;

-- USER PROFILES - No RLS (authentication still required)
-- Disabling RLS avoids infinite recursion when policies need to check user roles
-- Application logic and authentication still protect this table

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin')
    AND is_active = true
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Helper function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
    AND is_active = true
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- SEASONS
-- Super admins and admins can manage seasons
CREATE POLICY "Admins can manage seasons"
  ON public.seasons FOR ALL
  USING (public.is_admin());

-- All authenticated users can view seasons
CREATE POLICY "All authenticated users can view seasons"
  ON public.seasons FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- TEAMS
-- Admins can manage all teams
CREATE POLICY "Admins can manage teams"
  ON public.teams FOR ALL
  USING (public.is_admin());

-- Coaches can view their assigned teams
CREATE POLICY "Coaches can view assigned teams"
  ON public.teams FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      public.is_admin() OR
      EXISTS (
        SELECT 1 FROM public.team_coaches tc
        WHERE tc.team_id = teams.id AND tc.user_id = auth.uid()
      )
    )
  );

-- TEAM_COACHES
CREATE POLICY "Admins can manage team coaches"
  ON public.team_coaches FOR ALL
  USING (public.is_admin());

CREATE POLICY "Users can view their coach assignments"
  ON public.team_coaches FOR SELECT
  USING (user_id = auth.uid());

-- PLAYERS
-- Admins can manage all players
CREATE POLICY "Admins can manage players"
  ON public.players FOR ALL
  USING (public.is_admin());

-- Coaches with edit permission can manage their team's players
CREATE POLICY "Coaches can manage team players"
  ON public.players FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.team_coaches tc
      WHERE tc.team_id = players.team_id 
        AND tc.user_id = auth.uid() 
        AND tc.can_edit = true
    )
  );

-- All authenticated can view players
CREATE POLICY "Users can view players"
  ON public.players FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- GAMES (and related tables)
-- Admins can manage all games
CREATE POLICY "Admins can manage games"
  ON public.games FOR ALL
  USING (public.is_admin());

-- Coaches with edit permission can manage games for their teams
CREATE POLICY "Coaches can manage team games"
  ON public.games FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.team_coaches tc
      WHERE (tc.team_id = games.home_team_id OR tc.team_id = games.away_team_id)
        AND tc.user_id = auth.uid() 
        AND tc.can_edit = true
    )
  );

-- All authenticated can view games
CREATE POLICY "Users can view games"
  ON public.games FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Similar policies for game-related tables
CREATE POLICY "Manage game_players" ON public.game_players FOR ALL USING (
  EXISTS (SELECT 1 FROM public.games g WHERE g.id = game_players.game_id) AND
  (public.is_admin() OR
   EXISTS (SELECT 1 FROM public.team_coaches tc JOIN public.games g ON (tc.team_id = g.home_team_id OR tc.team_id = g.away_team_id) 
           WHERE g.id = game_players.game_id AND tc.user_id = auth.uid() AND tc.can_edit = true))
);

CREATE POLICY "View game_players" ON public.game_players FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Manage pitching_logs" ON public.pitching_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM public.games g WHERE g.id = pitching_logs.game_id) AND
  (public.is_admin() OR
   EXISTS (SELECT 1 FROM public.team_coaches tc JOIN public.games g ON (tc.team_id = g.home_team_id OR tc.team_id = g.away_team_id) 
           WHERE g.id = pitching_logs.game_id AND tc.user_id = auth.uid() AND tc.can_edit = true))
);

CREATE POLICY "View pitching_logs" ON public.pitching_logs FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Manage positions_played" ON public.positions_played FOR ALL USING (
  EXISTS (SELECT 1 FROM public.games g WHERE g.id = positions_played.game_id) AND
  (public.is_admin() OR
   EXISTS (SELECT 1 FROM public.team_coaches tc JOIN public.games g ON (tc.team_id = g.home_team_id OR tc.team_id = g.away_team_id) 
           WHERE g.id = positions_played.game_id AND tc.user_id = auth.uid() AND tc.can_edit = true))
);

CREATE POLICY "View positions_played" ON public.positions_played FOR SELECT USING (auth.uid() IS NOT NULL);

-- =====================================================
-- 11. FUNCTIONS & TRIGGERS
-- =====================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_seasons_updated_at BEFORE UPDATE ON public.seasons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON public.games
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- SCHEMA COMPLETE
-- =====================================================
