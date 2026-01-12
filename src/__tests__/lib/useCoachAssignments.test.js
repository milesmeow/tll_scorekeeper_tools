import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// Mock the supabase module BEFORE importing useCoachAssignments
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}))

import { useCoachAssignments } from '../../lib/useCoachAssignments'
import { supabase } from '../../lib/supabase'

describe('useCoachAssignments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch coach assignments with team joins for coach users', async () => {
    const mockCoachProfile = {
      id: 'coach-user-1',
      role: 'coach',
      name: 'Coach Smith'
    }

    const mockAssignments = [
      {
        team_id: 'team-1',
        teams: {
          id: 'team-1',
          name: 'Team A',
          division: 'Major'
        }
      },
      {
        team_id: 'team-2',
        teams: {
          id: 'team-2',
          name: 'Team B',
          division: 'Minor'
        }
      }
    ]

    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: mockAssignments,
        error: null
      })
    })

    const { result } = renderHook(() => useCoachAssignments(mockCoachProfile))

    // Initially loading should be true
    expect(result.current.loading).toBe(true)
    expect(result.current.isCoach).toBe(true)

    // Wait for the hook to finish loading
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Verify the query was made correctly
    expect(supabase.from).toHaveBeenCalledWith('team_coaches')
    const selectMock = supabase.from().select
    expect(selectMock).toHaveBeenCalledWith(expect.stringContaining('team_id'))
    expect(selectMock).toHaveBeenCalledWith(expect.stringContaining('teams:team_id'))

    const eqMock = supabase.from().eq
    expect(eqMock).toHaveBeenCalledWith('user_id', 'coach-user-1')

    // Verify the returned data
    expect(result.current.teams).toEqual(['team-1', 'team-2'])
    expect(result.current.teamObjects).toEqual([
      { id: 'team-1', name: 'Team A', division: 'Major' },
      { id: 'team-2', name: 'Team B', division: 'Minor' }
    ])
    expect(result.current.divisions).toEqual(['Major', 'Minor'])
    expect(result.current.error).toBeNull()
    expect(result.current.isEmpty).toBe(false)
  })

  it('should not fetch data for non-coach users', async () => {
    const mockAdminProfile = {
      id: 'admin-user-1',
      role: 'admin',
      name: 'Admin User'
    }

    const { result } = renderHook(() => useCoachAssignments(mockAdminProfile))

    // Wait for initial render
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Verify no query was made
    expect(supabase.from).not.toHaveBeenCalled()

    // Verify empty results
    expect(result.current.isCoach).toBe(false)
    expect(result.current.teams).toEqual([])
    expect(result.current.divisions).toEqual([])
    expect(result.current.teamObjects).toEqual([])
    expect(result.current.isEmpty).toBe(false) // Not a coach, so not empty
  })

  it('should handle coach with no assignments', async () => {
    const mockCoachProfile = {
      id: 'coach-user-2',
      role: 'coach',
      name: 'Coach Without Teams'
    }

    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [],
        error: null
      })
    })

    const { result } = renderHook(() => useCoachAssignments(mockCoachProfile))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.teams).toEqual([])
    expect(result.current.divisions).toEqual([])
    expect(result.current.teamObjects).toEqual([])
    expect(result.current.isEmpty).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('should handle database query errors', async () => {
    const mockCoachProfile = {
      id: 'coach-user-1',
      role: 'coach'
    }

    const mockError = new Error('Database connection failed')

    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: null,
        error: mockError
      })
    })

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { result } = renderHook(() => useCoachAssignments(mockCoachProfile))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Failed to load coach assignments: Database connection failed')
    expect(result.current.teams).toEqual([])
    expect(result.current.divisions).toEqual([])
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  it('should extract unique divisions from team assignments', async () => {
    const mockCoachProfile = {
      id: 'coach-user-1',
      role: 'coach'
    }

    const mockAssignments = [
      {
        team_id: 'team-1',
        teams: { id: 'team-1', name: 'Team A', division: 'Major' }
      },
      {
        team_id: 'team-2',
        teams: { id: 'team-2', name: 'Team B', division: 'Major' }
      },
      {
        team_id: 'team-3',
        teams: { id: 'team-3', name: 'Team C', division: 'Minor' }
      }
    ]

    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: mockAssignments,
        error: null
      })
    })

    const { result } = renderHook(() => useCoachAssignments(mockCoachProfile))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Should have 2 unique divisions (Major appears twice, Minor once)
    expect(result.current.divisions).toEqual(['Major', 'Minor'])
    expect(result.current.teams.length).toBe(3)
  })

  it('should handle null or undefined team data gracefully', async () => {
    const mockCoachProfile = {
      id: 'coach-user-1',
      role: 'coach'
    }

    const mockAssignments = [
      {
        team_id: 'team-1',
        teams: { id: 'team-1', name: 'Team A', division: 'Major' }
      },
      {
        team_id: 'team-2',
        teams: null // Null team reference
      }
    ]

    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: mockAssignments,
        error: null
      })
    })

    const { result } = renderHook(() => useCoachAssignments(mockCoachProfile))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Should filter out null teams
    expect(result.current.teamObjects).toEqual([
      { id: 'team-1', name: 'Team A', division: 'Major' }
    ])
    expect(result.current.teams).toEqual(['team-1', 'team-2']) // IDs are still present
    expect(result.current.divisions).toEqual(['Major'])
  })

  describe('filterTeamsByCoachDivisions', () => {
    it('should return all teams for non-coach users', async () => {
      const mockAdminProfile = {
        id: 'admin-1',
        role: 'admin'
      }

      const { result } = renderHook(() => useCoachAssignments(mockAdminProfile))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const allTeams = [
        { id: 'team-1', name: 'Team A', division: 'Major' },
        { id: 'team-2', name: 'Team B', division: 'Minor' },
        { id: 'team-3', name: 'Team C', division: 'Training' }
      ]

      const filtered = result.current.filterTeamsByCoachDivisions(allTeams)
      expect(filtered).toEqual(allTeams)
    })

    it('should filter teams to coach divisions', async () => {
      const mockCoachProfile = {
        id: 'coach-1',
        role: 'coach'
      }

      const mockAssignments = [
        {
          team_id: 'team-1',
          teams: { id: 'team-1', name: 'Team A', division: 'Major' }
        }
      ]

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: mockAssignments,
          error: null
        })
      })

      const { result } = renderHook(() => useCoachAssignments(mockCoachProfile))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const allTeams = [
        { id: 'team-1', name: 'Team A', division: 'Major' },
        { id: 'team-2', name: 'Team B', division: 'Minor' },
        { id: 'team-3', name: 'Team C', division: 'Training' }
      ]

      const filtered = result.current.filterTeamsByCoachDivisions(allTeams)
      expect(filtered).toEqual([
        { id: 'team-1', name: 'Team A', division: 'Major' }
      ])
    })

    it('should return all teams for coach with no divisions', async () => {
      const mockCoachProfile = {
        id: 'coach-1',
        role: 'coach'
      }

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      })

      const { result } = renderHook(() => useCoachAssignments(mockCoachProfile))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const allTeams = [
        { id: 'team-1', name: 'Team A', division: 'Major' }
      ]

      const filtered = result.current.filterTeamsByCoachDivisions(allTeams)
      expect(filtered).toEqual(allTeams)
    })
  })

  describe('filterGamesByCoachDivisions', () => {
    it('should return all games for non-coach users', async () => {
      const mockAdminProfile = {
        id: 'admin-1',
        role: 'admin'
      }

      const { result } = renderHook(() => useCoachAssignments(mockAdminProfile))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const allGames = [
        {
          id: 'game-1',
          home_team: { division: 'Major' },
          away_team: { division: 'Minor' }
        },
        {
          id: 'game-2',
          home_team: { division: 'Training' },
          away_team: { division: 'Training' }
        }
      ]

      const filtered = result.current.filterGamesByCoachDivisions(allGames)
      expect(filtered).toEqual(allGames)
    })

    it('should filter games where either home or away team is in coach divisions', async () => {
      const mockCoachProfile = {
        id: 'coach-1',
        role: 'coach'
      }

      const mockAssignments = [
        {
          team_id: 'team-1',
          teams: { id: 'team-1', name: 'Team A', division: 'Major' }
        }
      ]

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: mockAssignments,
          error: null
        })
      })

      const { result } = renderHook(() => useCoachAssignments(mockCoachProfile))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const allGames = [
        {
          id: 'game-1',
          home_team: { division: 'Major' },
          away_team: { division: 'Minor' }
        },
        {
          id: 'game-2',
          home_team: { division: 'Minor' },
          away_team: { division: 'Major' }
        },
        {
          id: 'game-3',
          home_team: { division: 'Training' },
          away_team: { division: 'Minor' }
        }
      ]

      const filtered = result.current.filterGamesByCoachDivisions(allGames)

      // Should include games 1 and 2 (both have Major division in either home or away)
      expect(filtered).toEqual([
        {
          id: 'game-1',
          home_team: { division: 'Major' },
          away_team: { division: 'Minor' }
        },
        {
          id: 'game-2',
          home_team: { division: 'Minor' },
          away_team: { division: 'Major' }
        }
      ])
    })

    it('should return all games for coach with no divisions', async () => {
      const mockCoachProfile = {
        id: 'coach-1',
        role: 'coach'
      }

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      })

      const { result } = renderHook(() => useCoachAssignments(mockCoachProfile))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const allGames = [
        {
          id: 'game-1',
          home_team: { division: 'Major' },
          away_team: { division: 'Minor' }
        }
      ]

      const filtered = result.current.filterGamesByCoachDivisions(allGames)
      expect(filtered).toEqual(allGames)
    })
  })
})
