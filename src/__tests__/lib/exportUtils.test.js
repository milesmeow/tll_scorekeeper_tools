import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchSeasonData, getTimestamp } from '../../lib/exportUtils'

describe('fetchSeasonData', () => {
  let mockSupabaseClient

  beforeEach(() => {
    // Create a fresh mock Supabase client for each test
    mockSupabaseClient = {
      from: vi.fn()
    }
  })

  it('should fetch complete season data with all related records', async () => {
    // Mock data
    const mockSeason = {
      id: 'season-1',
      name: 'Spring 2025',
      start_date: '2025-03-01',
      end_date: '2025-06-01',
      is_active: true
    }

    const mockTeams = [
      { id: 'team-1', name: 'Team A', division: 'Major', season_id: 'season-1' },
      { id: 'team-2', name: 'Team B', division: 'Minor', season_id: 'season-1' }
    ]

    const mockPlayers = [
      { id: 'player-1', name: 'John Doe', age: 12, team_id: 'team-1', jersey_number: 10 },
      { id: 'player-2', name: 'Jane Smith', age: 11, team_id: 'team-2', jersey_number: 15 }
    ]

    const mockTeamCoaches = [
      {
        id: 'coach-1',
        team_id: 'team-1',
        user_id: 'user-1',
        role: 'head_coach',
        user_profiles: { name: 'Coach A', email: 'coach@example.com' }
      }
    ]

    const mockGames = [
      {
        id: 'game-1',
        season_id: 'season-1',
        home_team_id: 'team-1',
        away_team_id: 'team-2',
        game_date: '2025-03-15',
        home_score: 5,
        away_score: 3
      }
    ]

    const mockGamePlayers = [
      { id: 'gp-1', game_id: 'game-1', player_id: 'player-1', was_present: true }
    ]

    const mockPitchingLogs = [
      {
        id: 'log-1',
        game_id: 'game-1',
        player_id: 'player-1',
        final_pitch_count: 45,
        penultimate_batter_count: 44,
        next_eligible_pitch_date: '2025-03-17'
      }
    ]

    const mockPositionsPlayed = [
      { id: 'pos-1', game_id: 'game-1', player_id: 'player-1', position: 'pitcher', inning_number: 1 }
    ]

    // Setup mock chain for each query
    const setupMockQuery = (returnData) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: returnData, error: null }),
      then: vi.fn((resolve) => resolve({ data: returnData, error: null }))
    })

    // Mock each database call in sequence
    mockSupabaseClient.from
      .mockReturnValueOnce(setupMockQuery(mockSeason)) // seasons
      .mockReturnValueOnce(setupMockQuery(mockTeams)) // teams
      .mockReturnValueOnce(setupMockQuery(mockPlayers)) // players
      .mockReturnValueOnce(setupMockQuery(mockTeamCoaches)) // team_coaches
      .mockReturnValueOnce(setupMockQuery(mockGames)) // games
      .mockReturnValueOnce(setupMockQuery(mockGamePlayers)) // game_players
      .mockReturnValueOnce(setupMockQuery(mockPitchingLogs)) // pitching_logs
      .mockReturnValueOnce(setupMockQuery(mockPositionsPlayed)) // positions_played

    const result = await fetchSeasonData(mockSupabaseClient, 'season-1')

    // Verify all queries were made
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('seasons')
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('teams')
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('players')
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('team_coaches')
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('games')
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('game_players')
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('pitching_logs')
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('positions_played')

    // Verify returned data structure
    expect(result).toEqual({
      season: mockSeason,
      teams: mockTeams,
      players: mockPlayers,
      teamCoaches: mockTeamCoaches,
      games: mockGames,
      gamePlayers: mockGamePlayers,
      pitchingLogs: mockPitchingLogs,
      positionsPlayed: mockPositionsPlayed
    })
  })

  it('should handle season with no teams', async () => {
    const mockSeason = {
      id: 'season-1',
      name: 'Empty Season',
      start_date: '2025-03-01',
      is_active: true
    }

    const setupMockQuery = (returnData) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: returnData, error: null }),
      then: vi.fn((resolve) => resolve({ data: returnData, error: null }))
    })

    mockSupabaseClient.from
      .mockReturnValueOnce(setupMockQuery(mockSeason)) // seasons
      .mockReturnValueOnce(setupMockQuery([])) // teams (empty)
      .mockReturnValueOnce(setupMockQuery([])) // games

    const result = await fetchSeasonData(mockSupabaseClient, 'season-1')

    // With no teams, players and team_coaches should not be queried
    // With no games, game_players, pitching_logs, positions_played should not be queried
    expect(result.season).toEqual(mockSeason)
    expect(result.teams).toEqual([])
    expect(result.players).toEqual([])
    expect(result.teamCoaches).toEqual([])
    expect(result.games).toEqual([])
    expect(result.gamePlayers).toEqual([])
    expect(result.pitchingLogs).toEqual([])
    expect(result.positionsPlayed).toEqual([])
  })

  it('should handle teams with no games', async () => {
    const mockSeason = {
      id: 'season-1',
      name: 'Spring 2025',
      is_active: true
    }

    const mockTeams = [
      { id: 'team-1', name: 'Team A', division: 'Major' }
    ]

    const mockPlayers = [
      { id: 'player-1', name: 'John Doe', team_id: 'team-1' }
    ]

    const setupMockQuery = (returnData) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: returnData, error: null }),
      then: vi.fn((resolve) => resolve({ data: returnData, error: null }))
    })

    mockSupabaseClient.from
      .mockReturnValueOnce(setupMockQuery(mockSeason)) // seasons
      .mockReturnValueOnce(setupMockQuery(mockTeams)) // teams
      .mockReturnValueOnce(setupMockQuery(mockPlayers)) // players
      .mockReturnValueOnce(setupMockQuery([])) // team_coaches
      .mockReturnValueOnce(setupMockQuery([])) // games (empty)

    const result = await fetchSeasonData(mockSupabaseClient, 'season-1')

    expect(result.teams).toEqual(mockTeams)
    expect(result.players).toEqual(mockPlayers)
    expect(result.games).toEqual([])
    expect(result.gamePlayers).toEqual([])
    expect(result.pitchingLogs).toEqual([])
    expect(result.positionsPlayed).toEqual([])
  })

  it('should throw error when season query fails', async () => {
    const mockError = new Error('Database connection failed')

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: mockError })
    })

    await expect(fetchSeasonData(mockSupabaseClient, 'season-1')).rejects.toThrow(
      'Database connection failed'
    )
  })

  it('should throw error when teams query fails', async () => {
    const mockSeason = { id: 'season-1', name: 'Integration Test Season' }
    const mockError = new Error('Teams query failed')

    const seasonQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockSeason, error: null })
    }

    const teamsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({ data: null, error: mockError }))
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(seasonQuery) // seasons
      .mockReturnValueOnce(teamsQuery) // teams

    await expect(fetchSeasonData(mockSupabaseClient, 'season-1')).rejects.toThrow(
      'Teams query failed'
    )
  })

  it('should throw error when players query fails', async () => {
    const mockSeason = { id: 'season-1', name: 'Integration Test Season' }
    const mockTeams = [{ id: 'team-1', name: 'Team A' }]
    const mockError = new Error('Players query failed')

    const setupSuccessQuery = (data) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data, error: null }),
      then: vi.fn((resolve) => resolve({ data, error: null }))
    })

    const playersQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({ data: null, error: mockError }))
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(setupSuccessQuery(mockSeason)) // seasons
      .mockReturnValueOnce(setupSuccessQuery(mockTeams)) // teams
      .mockReturnValueOnce(playersQuery) // players

    await expect(fetchSeasonData(mockSupabaseClient, 'season-1')).rejects.toThrow(
      'Players query failed'
    )
  })

  it('should throw error when game_players query fails', async () => {
    const mockSeason = { id: 'season-1', name: 'Integration Test Season' }
    const mockTeams = [{ id: 'team-1', name: 'Team A' }]
    const mockPlayers = [{ id: 'player-1', name: 'Player A' }]
    const mockTeamCoaches = []
    const mockGames = [{ id: 'game-1', season_id: 'season-1' }]
    const mockError = new Error('Game players query failed')

    const setupSuccessQuery = (data) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data, error: null }),
      then: vi.fn((resolve) => resolve({ data, error: null }))
    })

    const gamePlayersQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({ data: null, error: mockError }))
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(setupSuccessQuery(mockSeason)) // seasons
      .mockReturnValueOnce(setupSuccessQuery(mockTeams)) // teams
      .mockReturnValueOnce(setupSuccessQuery(mockPlayers)) // players
      .mockReturnValueOnce(setupSuccessQuery(mockTeamCoaches)) // team_coaches
      .mockReturnValueOnce(setupSuccessQuery(mockGames)) // games
      .mockReturnValueOnce(gamePlayersQuery) // game_players

    await expect(fetchSeasonData(mockSupabaseClient, 'season-1')).rejects.toThrow(
      'Game players query failed'
    )
  })

  it('should use .in() operator for batch queries when IDs exist', async () => {
    const mockSeason = { id: 'season-1', name: 'Integration Test Season' }
    const mockTeams = [
      { id: 'team-1', name: 'Team A' },
      { id: 'team-2', name: 'Team B' }
    ]
    const mockPlayers = []
    const mockGames = [{ id: 'game-1' }]

    const setupMockQuery = (returnData) => {
      const mock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: returnData, error: null }),
        then: vi.fn((resolve) => resolve({ data: returnData, error: null }))
      }
      return mock
    }

    const playersQuery = setupMockQuery(mockPlayers)
    const teamCoachesQuery = setupMockQuery([])
    const gamePlayersQuery = setupMockQuery([])
    const pitchingLogsQuery = setupMockQuery([])
    const positionsPlayedQuery = setupMockQuery([])

    mockSupabaseClient.from
      .mockReturnValueOnce(setupMockQuery(mockSeason)) // seasons
      .mockReturnValueOnce(setupMockQuery(mockTeams)) // teams
      .mockReturnValueOnce(playersQuery) // players
      .mockReturnValueOnce(teamCoachesQuery) // team_coaches
      .mockReturnValueOnce(setupMockQuery(mockGames)) // games
      .mockReturnValueOnce(gamePlayersQuery) // game_players
      .mockReturnValueOnce(pitchingLogsQuery) // pitching_logs
      .mockReturnValueOnce(positionsPlayedQuery) // positions_played

    await fetchSeasonData(mockSupabaseClient, 'season-1')

    // Verify .in() was called with team IDs
    expect(playersQuery.in).toHaveBeenCalledWith('team_id', ['team-1', 'team-2'])
    expect(teamCoachesQuery.in).toHaveBeenCalledWith('team_id', ['team-1', 'team-2'])

    // Verify .in() was called with game IDs
    expect(gamePlayersQuery.in).toHaveBeenCalledWith('game_id', ['game-1'])
    expect(pitchingLogsQuery.in).toHaveBeenCalledWith('game_id', ['game-1'])
    expect(positionsPlayedQuery.in).toHaveBeenCalledWith('game_id', ['game-1'])
  })

  it('should handle team_coaches with joined user_profiles data', async () => {
    const mockSeason = { id: 'season-1', name: 'Integration Test Season' }
    const mockTeams = [{ id: 'team-1', name: 'Team A' }]
    const mockPlayers = []
    const mockTeamCoaches = [
      {
        id: 'coach-1',
        team_id: 'team-1',
        user_profiles: {
          name: 'Coach Smith',
          email: 'coach@example.com'
        }
      }
    ]

    const setupMockQuery = (returnData) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: returnData, error: null }),
      then: vi.fn((resolve) => resolve({ data: returnData, error: null }))
    })

    const teamCoachesQuery = setupMockQuery(mockTeamCoaches)

    mockSupabaseClient.from
      .mockReturnValueOnce(setupMockQuery(mockSeason)) // seasons
      .mockReturnValueOnce(setupMockQuery(mockTeams)) // teams
      .mockReturnValueOnce(setupMockQuery(mockPlayers)) // players
      .mockReturnValueOnce(teamCoachesQuery) // team_coaches
      .mockReturnValueOnce(setupMockQuery([])) // games

    const result = await fetchSeasonData(mockSupabaseClient, 'season-1')

    // Verify the select was called with the join syntax
    expect(teamCoachesQuery.select).toHaveBeenCalledWith('*, user_profiles(name, email)')
    expect(result.teamCoaches).toEqual(mockTeamCoaches)
    expect(result.teamCoaches[0].user_profiles).toEqual({
      name: 'Coach Smith',
      email: 'coach@example.com'
    })
  })
})

describe('getTimestamp', () => {
  it('should format date as YYYY-MM-DD_HH-MM-SS', () => {
    const date = new Date('2025-03-15T14:30:45')
    const timestamp = getTimestamp(date)
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/)
  })

  it('should pad single digit months, days, hours, minutes, seconds with zeros', () => {
    const date = new Date('2025-01-05T08:03:09')
    const timestamp = getTimestamp(date)
    expect(timestamp).toBe('2025-01-05_08-03-09')
  })

  it('should handle end of year dates', () => {
    const date = new Date('2025-12-31T23:59:59')
    const timestamp = getTimestamp(date)
    expect(timestamp).toBe('2025-12-31_23-59-59')
  })

  it('should handle midnight correctly', () => {
    const date = new Date('2025-06-15T00:00:00')
    const timestamp = getTimestamp(date)
    expect(timestamp).toBe('2025-06-15_00-00-00')
  })

  it('should create unique timestamps for different times', () => {
    const date1 = new Date('2025-03-15T10:30:45')
    const date2 = new Date('2025-03-15T10:30:46')

    const timestamp1 = getTimestamp(date1)
    const timestamp2 = getTimestamp(date2)

    expect(timestamp1).not.toBe(timestamp2)
    expect(timestamp1).toBe('2025-03-15_10-30-45')
    expect(timestamp2).toBe('2025-03-15_10-30-46')
  })
})
