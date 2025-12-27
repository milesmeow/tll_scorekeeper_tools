import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useCoachAssignments } from '../../lib/useCoachAssignments'
import { formatGameDate } from '../../lib/pitchCountUtils'

export default function GamesListReport({ profile }) {
  const [seasons, setSeasons] = useState([])
  const [selectedSeason, setSelectedSeason] = useState('')
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterDivision, setFilterDivision] = useState('All')

  const isCoach = profile?.role === 'coach'

  // Fetch coach assignments for filtering
  const coachData = useCoachAssignments(profile)

  useEffect(() => {
    fetchSeasons()
  }, [])

  useEffect(() => {
    if (selectedSeason) {
      fetchGames()
    } else {
      setGames([])
      setLoading(false)
    }
  }, [selectedSeason, filterDivision])

  const fetchSeasons = async () => {
    try {
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .order('start_date', { ascending: false })

      if (error) throw error

      setSeasons(data || [])

      // Auto-select active season if available
      const activeSeason = data?.find(s => s.is_active)
      if (activeSeason) {
        setSelectedSeason(activeSeason.id)
      }
    } catch (err) {
      setError('Failed to load seasons: ' + err.message)
    }
  }

  const fetchGames = async () => {
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('games')
        .select(`
          *,
          home_team:teams!games_home_team_id_fkey(name, division),
          away_team:teams!games_away_team_id_fkey(name, division),
          scorekeeper_team:teams!games_scorekeeper_team_id_fkey(name)
        `)
        .eq('season_id', selectedSeason)
        .order('game_date', { ascending: false })

      const { data, error } = await query

      if (error) throw error

      // First, filter by coach's divisions (for coaches only)
      let filteredGames = coachData.filterGamesByCoachDivisions(data || [])

      // Then, filter by selected division if not 'All'
      if (filterDivision !== 'All') {
        filteredGames = filteredGames.filter(game =>
          game.home_team?.division === filterDivision ||
          game.away_team?.division === filterDivision
        )
      }

      setGames(filteredGames)
    } catch (err) {
      setError('Failed to load games: ' + err.message)
    } finally {
      setLoading(false)
    }
  }


  const selectedSeasonData = seasons.find(s => s.id === selectedSeason)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Games List Report</h1>
      </div>

      {/* Season and Division Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Season</label>
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="input"
            >
              <option value="">Select a season...</option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name} {season.is_active ? '(Active)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Division Filter</label>
            <select
              value={filterDivision}
              onChange={(e) => setFilterDivision(e.target.value)}
              className="input"
              disabled={!selectedSeason}
            >
              {isCoach ? (
                <>
                  {coachData.divisions.length > 1 && (
                    <option value="All">All My Divisions</option>
                  )}
                  {coachData.divisions.map((division) => (
                    <option key={division} value={division}>{division}</option>
                  ))}
                </>
              ) : (
                <>
                  <option value="All">All Divisions</option>
                  <option value="Training">Training</option>
                  <option value="Minor">Minor</option>
                  <option value="Major">Major</option>
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Empty state for coaches with no assignments */}
      {coachData.isEmpty && !coachData.loading && (
        <div className="card text-center py-12">
          <p className="text-gray-600 mb-2">You have no team assignments.</p>
          <p className="text-gray-500 text-sm">Please contact an administrator.</p>
        </div>
      )}

      {/* Loading State */}
      {loading && selectedSeason && (
        <div className="text-center py-8">
          <div className="text-gray-600">Loading games...</div>
        </div>
      )}

      {/* Games Table */}
      {!loading && selectedSeason && (
        <div className="card">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">
              {selectedSeasonData?.name} - {games.length} game{games.length !== 1 ? 's' : ''}
            </h2>
          </div>

          {games.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No games found for the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Away Team
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Away Score
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Home Team
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Home Score
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Scorekeeper
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {games.map((game) => (
                    <tr key={game.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {formatGameDate(game.game_date, {
                          month: '2-digit',
                          day: '2-digit',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div>{game.away_team?.name || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">{game.away_team?.division}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-semibold">
                        {game.away_score ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div>{game.home_team?.name || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">{game.home_team?.division}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-semibold">
                        {game.home_score ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div>{game.scorekeeper_name}</div>
                        {game.scorekeeper_team && (
                          <div className="text-xs text-gray-500">{game.scorekeeper_team.name}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Instruction when no season selected */}
      {!selectedSeason && !loading && (
        <div className="card text-center py-12">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-gray-600">Select a season to view games</p>
        </div>
      )}
    </div>
  )
}
