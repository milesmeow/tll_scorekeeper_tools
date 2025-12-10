import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function PlayerAbsencesReport() {
  const [seasons, setSeasons] = useState([])
  const [selectedSeason, setSelectedSeason] = useState('')
  const [absences, setAbsences] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterDivision, setFilterDivision] = useState('All')

  useEffect(() => {
    fetchSeasons()
  }, [])

  useEffect(() => {
    if (selectedSeason) {
      fetchAbsences()
    } else {
      setAbsences([])
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

  const fetchAbsences = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch all absences with player and game information
      const { data: absenceData, error: absenceError } = await supabase
        .from('game_players')
        .select(`
          id,
          was_present,
          absence_note,
          player_id,
          game_id,
          players (
            id,
            name,
            team_id,
            teams (
              name,
              division
            )
          ),
          games (
            id,
            game_date,
            season_id,
            home_team:teams!games_home_team_id_fkey(name),
            away_team:teams!games_away_team_id_fkey(name)
          )
        `)
        .eq('was_present', false)
        .eq('games.season_id', selectedSeason)

      if (absenceError) throw absenceError

      // Filter by division if needed
      let filteredAbsences = absenceData || []
      if (filterDivision !== 'All') {
        filteredAbsences = filteredAbsences.filter(absence =>
          absence.players?.teams?.division === filterDivision
        )
      }

      // Group absences by player
      const playerAbsencesMap = {}

      filteredAbsences.forEach(absence => {
        const playerId = absence.player_id

        if (!playerAbsencesMap[playerId]) {
          playerAbsencesMap[playerId] = {
            playerId: playerId,
            playerName: absence.players?.name || 'Unknown Player',
            teamName: absence.players?.teams?.name || 'Unknown Team',
            division: absence.players?.teams?.division || 'Unknown',
            absences: []
          }
        }

        playerAbsencesMap[playerId].absences.push({
          gameId: absence.game_id,
          gameDate: absence.games?.game_date,
          homeTeam: absence.games?.home_team?.name,
          awayTeam: absence.games?.away_team?.name,
          note: absence.absence_note
        })
      })

      // Convert to array and sort absences by date
      const playerAbsencesArray = Object.values(playerAbsencesMap).map(player => ({
        ...player,
        totalAbsences: player.absences.length,
        absences: player.absences.sort((a, b) =>
          new Date(b.gameDate) - new Date(a.gameDate)
        )
      }))

      // Sort players by total absences (descending)
      playerAbsencesArray.sort((a, b) => b.totalAbsences - a.totalAbsences)

      setAbsences(playerAbsencesArray)
    } catch (err) {
      setError('Failed to load absences: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    })
  }

  const selectedSeasonData = seasons.find(s => s.id === selectedSeason)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Player Absences Report</h1>
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
              <option value="All">All Divisions</option>
              <option value="Training">Training</option>
              <option value="Minor">Minor</option>
              <option value="Major">Major</option>
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

      {/* Loading State */}
      {loading && selectedSeason && (
        <div className="text-center py-8">
          <div className="text-gray-600">Loading absences...</div>
        </div>
      )}

      {/* Absences List */}
      {!loading && selectedSeason && (
        <div className="space-y-4">
          <div className="card">
            <h2 className="text-lg font-semibold mb-2">
              {selectedSeasonData?.name} - {absences.length} player{absences.length !== 1 ? 's' : ''} with absences
            </h2>
            <p className="text-sm text-gray-600">
              Total absences: {absences.reduce((sum, p) => sum + p.totalAbsences, 0)}
            </p>
          </div>

          {absences.length === 0 ? (
            <div className="card text-center py-8 text-gray-500">
              No absences found for the selected filters.
            </div>
          ) : (
            <div className="space-y-4">
              {absences.map((player) => (
                <div key={player.playerId} className="card">
                  <div className="mb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold">{player.playerName}</h3>
                        <p className="text-sm text-gray-600">
                          {player.teamName} ({player.division})
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-red-600">
                          {player.totalAbsences}
                        </div>
                        <div className="text-xs text-gray-500">
                          absence{player.totalAbsences !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Absence Dates:</h4>
                    <div className="flex flex-wrap gap-2">
                      {player.absences.map((absence, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            // TODO: Navigate to game detail
                            alert(`Game ID: ${absence.gameId}\nDate: ${formatDate(absence.gameDate)}\n${absence.awayTeam} @ ${absence.homeTeam}${absence.note ? '\nNote: ' + absence.note : ''}`)
                          }}
                          className="inline-flex items-center px-3 py-1.5 bg-gray-100 hover:bg-blue-50 hover:border-blue-300 border border-gray-300 rounded text-sm transition-colors"
                          title={`${absence.awayTeam} @ ${absence.homeTeam}${absence.note ? '\nNote: ' + absence.note : ''}`}
                        >
                          <span className="font-medium">{formatDate(absence.gameDate)}</span>
                          {absence.note && (
                            <span className="ml-2 text-xs text-gray-500">📝</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Instruction when no season selected */}
      {!selectedSeason && !loading && (
        <div className="card text-center py-12">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-gray-600">Select a season to view player absences</p>
        </div>
      )}
    </div>
  )
}
