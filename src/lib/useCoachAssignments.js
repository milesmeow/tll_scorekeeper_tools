import { useState, useEffect } from 'react'
import { supabase } from './supabase'

/**
 * Custom hook for fetching and filtering coach assignments
 * Returns coach's team assignments, divisions, and utility functions for filtering
 *
 * @param {Object} profile - User profile object with role property
 * @returns {Object} Coach assignment data and filtering utilities
 */
export function useCoachAssignments(profile) {
  const [teams, setTeams] = useState([])
  const [divisions, setDivisions] = useState([])
  const [teamObjects, setTeamObjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const isCoach = profile?.role === 'coach'

  useEffect(() => {
    // Only fetch if user is a coach
    if (!isCoach) {
      setLoading(false)
      return
    }

    fetchCoachAssignments()
  }, [profile?.id, isCoach])

  const fetchCoachAssignments = async () => {
    try {
      setLoading(true)
      setError(null)

      // Query team_coaches table with join to teams table
      const { data, error: fetchError } = await supabase
        .from('team_coaches')
        .select(`
          team_id,
          teams:team_id (
            id,
            name,
            division
          )
        `)
        .eq('user_id', profile.id)

      if (fetchError) throw fetchError

      // Extract team IDs
      const teamIds = data?.map(tc => tc.team_id) || []

      // Extract team objects (flatten the nested structure)
      const teamsData = data?.map(tc => tc.teams).filter(Boolean) || []

      // Extract unique divisions
      const uniqueDivisions = [...new Set(teamsData.map(t => t.division).filter(Boolean))]

      setTeams(teamIds)
      setTeamObjects(teamsData)
      setDivisions(uniqueDivisions)
    } catch (err) {
      setError('Failed to load coach assignments: ' + err.message)
      console.error('Error fetching coach assignments:', err)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Filter teams array to only include teams in coach's divisions
   * @param {Array} teamsArray - Array of team objects with division property
   * @returns {Array} Filtered teams array
   */
  const filterTeamsByCoachDivisions = (teamsArray) => {
    // If not a coach or no divisions assigned, return all teams
    if (!isCoach || divisions.length === 0) {
      return teamsArray
    }

    // Filter teams by coach's divisions
    return teamsArray.filter(team => divisions.includes(team.division))
  }

  /**
   * Filter games array to show games where home OR away team is in coach's divisions
   * @param {Array} gamesArray - Array of game objects with home_team and away_team properties
   * @returns {Array} Filtered games array
   */
  const filterGamesByCoachDivisions = (gamesArray) => {
    // If not a coach or no divisions assigned, return all games
    if (!isCoach || divisions.length === 0) {
      return gamesArray
    }

    // Filter games where EITHER home or away team is in coach's divisions
    return gamesArray.filter(game => {
      const homeDiv = game.home_team?.division
      const awayDiv = game.away_team?.division
      return divisions.includes(homeDiv) || divisions.includes(awayDiv)
    })
  }

  return {
    teams,
    divisions,
    teamObjects,
    loading,
    error,
    isCoach,
    isEmpty: isCoach && teams.length === 0,
    filterTeamsByCoachDivisions,
    filterGamesByCoachDivisions
  }
}
