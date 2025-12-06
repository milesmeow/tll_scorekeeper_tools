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
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'coach', 'scorekeeper')),
  is_active BOOLEAN DEFAULT true,
  must_change_password BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. SEASONS
-- =====================================================

CREATE TABLE public.seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- e.g., "2025 Season"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
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
  role TEXT NOT NULL CHECK (role IN ('head_coach', 'assistant', 'scorekeeper')),
  can_edit BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

CREATE INDEX idx_team_coaches_user ON public.team_coaches(user_id);
CREATE INDEX idx_team_coaches_team ON public.team_coaches(team_id);

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
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (home_team_id != away_team_id)
);

CREATE INDEX idx_games_season ON public.games(season_id);
CREATE INDEX idx_games_date ON public.games(game_date);
CREATE INDEX idx_games_home_team ON public.games(home_team_id);
CREATE INDEX idx_games_away_team ON public.games(away_team_id);

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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (penultimate_batter_count <= final_pitch_count)
);

CREATE INDEX idx_pitching_logs_game ON public.pitching_logs(game_id);
CREATE INDEX idx_pitching_logs_player ON public.pitching_logs(player_id);

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
-- 10. PITCH COUNT RULES (Reference Data)
-- =====================================================

CREATE TABLE public.pitch_count_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  age_min INTEGER NOT NULL,
  age_max INTEGER NOT NULL,
  max_pitches_per_game INTEGER NOT NULL,
  rest_days JSONB NOT NULL, -- {pitch_ranges: [{min, max, days}]}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Pitch Smart Guidelines
INSERT INTO public.pitch_count_rules (age_min, age_max, max_pitches_per_game, rest_days) VALUES
  (7, 8, 50, '[
    {"min": 1, "max": 20, "days": 0},
    {"min": 21, "max": 35, "days": 1},
    {"min": 36, "max": 50, "days": 2}
  ]'::jsonb),
  (9, 10, 75, '[
    {"min": 1, "max": 20, "days": 0},
    {"min": 21, "max": 35, "days": 1},
    {"min": 36, "max": 50, "days": 2},
    {"min": 51, "max": 65, "days": 3},
    {"min": 66, "max": 999, "days": 4}
  ]'::jsonb),
  (11, 12, 85, '[
    {"min": 1, "max": 20, "days": 0},
    {"min": 21, "max": 35, "days": 1},
    {"min": 36, "max": 50, "days": 2},
    {"min": 51, "max": 65, "days": 3},
    {"min": 66, "max": 999, "days": 4}
  ]'::jsonb),
  (13, 14, 95, '[
    {"min": 1, "max": 20, "days": 0},
    {"min": 21, "max": 35, "days": 1},
    {"min": 36, "max": 50, "days": 2},
    {"min": 51, "max": 65, "days": 3},
    {"min": 66, "max": 999, "days": 4}
  ]'::jsonb),
  (15, 16, 95, '[
    {"min": 1, "max": 30, "days": 0},
    {"min": 31, "max": 45, "days": 1},
    {"min": 46, "max": 60, "days": 2},
    {"min": 61, "max": 75, "days": 3},
    {"min": 76, "max": 999, "days": 4}
  ]'::jsonb),
  (17, 18, 105, '[
    {"min": 1, "max": 30, "days": 0},
    {"min": 31, "max": 45, "days": 1},
    {"min": 46, "max": 60, "days": 2},
    {"min": 61, "max": 80, "days": 3},
    {"min": 81, "max": 999, "days": 4}
  ]'::jsonb),
  (19, 22, 120, '[
    {"min": 1, "max": 30, "days": 0},
    {"min": 31, "max": 45, "days": 1},
    {"min": 46, "max": 60, "days": 2},
    {"min": 61, "max": 80, "days": 3},
    {"min": 81, "max": 105, "days": 4},
    {"min": 106, "max": 999, "days": 5}
  ]'::jsonb);

-- =====================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pitching_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions_played ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pitch_count_rules ENABLE ROW LEVEL SECURITY;

-- Helper function to check user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM public.user_profiles WHERE id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- USER PROFILES
-- Super admins can do everything
CREATE POLICY "Super admins can manage all users"
  ON public.user_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  );

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (id = auth.uid());

-- Users can update their own profile (name, password change flag)
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (id = auth.uid());

-- SEASONS
-- Super admins and admins can manage seasons
CREATE POLICY "Admins can manage seasons"
  ON public.seasons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('super_admin', 'admin')
    )
  );

-- Coaches/scorekeepers can view seasons
CREATE POLICY "All authenticated users can view seasons"
  ON public.seasons FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- TEAMS
-- Admins can manage all teams
CREATE POLICY "Admins can manage teams"
  ON public.teams FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('super_admin', 'admin')
    )
  );

-- Coaches can view their assigned teams
CREATE POLICY "Coaches can view assigned teams"
  ON public.teams FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid() AND up.role IN ('super_admin', 'admin')
      ) OR
      EXISTS (
        SELECT 1 FROM public.team_coaches tc
        WHERE tc.team_id = teams.id AND tc.user_id = auth.uid()
      )
    )
  );

-- TEAM_COACHES
CREATE POLICY "Admins can manage team coaches"
  ON public.team_coaches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Users can view their coach assignments"
  ON public.team_coaches FOR SELECT
  USING (user_id = auth.uid());

-- PLAYERS
-- Admins can manage all players
CREATE POLICY "Admins can manage players"
  ON public.players FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('super_admin', 'admin')
    )
  );

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
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('super_admin', 'admin')
    )
  );

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
  (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role IN ('super_admin', 'admin')) OR
   EXISTS (SELECT 1 FROM public.team_coaches tc JOIN public.games g ON (tc.team_id = g.home_team_id OR tc.team_id = g.away_team_id) 
           WHERE g.id = game_players.game_id AND tc.user_id = auth.uid() AND tc.can_edit = true))
);

CREATE POLICY "View game_players" ON public.game_players FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Manage pitching_logs" ON public.pitching_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM public.games g WHERE g.id = pitching_logs.game_id) AND
  (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role IN ('super_admin', 'admin')) OR
   EXISTS (SELECT 1 FROM public.team_coaches tc JOIN public.games g ON (tc.team_id = g.home_team_id OR tc.team_id = g.away_team_id) 
           WHERE g.id = pitching_logs.game_id AND tc.user_id = auth.uid() AND tc.can_edit = true))
);

CREATE POLICY "View pitching_logs" ON public.pitching_logs FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Manage positions_played" ON public.positions_played FOR ALL USING (
  EXISTS (SELECT 1 FROM public.games g WHERE g.id = positions_played.game_id) AND
  (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role IN ('super_admin', 'admin')) OR
   EXISTS (SELECT 1 FROM public.team_coaches tc JOIN public.games g ON (tc.team_id = g.home_team_id OR tc.team_id = g.away_team_id) 
           WHERE g.id = positions_played.game_id AND tc.user_id = auth.uid() AND tc.can_edit = true))
);

CREATE POLICY "View positions_played" ON public.positions_played FOR SELECT USING (auth.uid() IS NOT NULL);

-- PITCH COUNT RULES (reference data - read only for all)
CREATE POLICY "All users can view pitch count rules"
  ON public.pitch_count_rules FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- =====================================================
-- 12. FUNCTIONS & TRIGGERS
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
