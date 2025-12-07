import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function GameEntry() {
  const [seasons, setSeasons] = useState([])
  const [teams, setTeams] = useState([])
  const [selectedSeason, setSelectedSeason] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showGameForm, setShowGameForm] = useState(false)
  const [games, setGames] = useState([])
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    fetchSeasons()
  }, [])

  useEffect(() => {
    if (selectedSeason) {
      fetchTeams()
      fetchGames()
    }
  }, [selectedSeason])

  const fetchSeasons = async () => {
    try {
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .order('is_active', { ascending: false })
        .order('start_date', { ascending: false })

      if (error) throw error
      setSeasons(data)
      
      const activeSeason = data.find(s => s.is_active)
      if (activeSeason) {
        setSelectedSeason(activeSeason.id)
      } else if (data.length > 0) {
        setSelectedSeason(data[0].id)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('season_id', selectedSeason)
        .order('name')

      if (error) throw error
      setTeams(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchGames = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select(`
          *,
          home_team:teams!games_home_team_id_fkey(name, division),
          away_team:teams!games_away_team_id_fkey(name, division),
          scorekeeper_team:teams!games_scorekeeper_team_id_fkey(name)
        `)
        .eq('season_id', selectedSeason)
        .order('game_date', { ascending: false })

      if (error) throw error
      setGames(data)
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  if (seasons.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-600">No seasons found. Create a season first!</p>
      </div>
    )
  }

  if (teams.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-600">No teams found for this season. Create teams first!</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Game Entry</h2>
        <button
          onClick={() => setShowGameForm(true)}
          className="btn btn-primary"
        >
          + Enter New Game
        </button>
      </div>

      {/* Season Selector */}
      <div className="mb-6">
        <label className="label">Select Season</label>
        <select
          className="input max-w-md"
          value={selectedSeason || ''}
          onChange={(e) => setSelectedSeason(e.target.value)}
        >
          {seasons.map((season) => (
            <option key={season.id} value={season.id}>
              {season.name} {season.is_active ? '(Active)' : ''}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success mb-4">
          {success}
        </div>
      )}

      {/* Games List */}
      {games.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-600 mb-4">No games entered yet for this season.</p>
          <button
            onClick={() => setShowGameForm(true)}
            className="btn btn-primary"
          >
            Enter First Game
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="space-y-4">
            {games.map((game) => (
              <div
                key={game.id}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">
                      {new Date(game.game_date).toLocaleDateString()}
                    </p>
                    <p className="font-semibold text-lg">
                      {game.home_team.name} vs {game.away_team.name}
                    </p>
                    <p className="text-gray-700 mt-1">
                      Score: {game.home_score} - {game.away_score}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Scorekeeper: {game.scorekeeper_name} ({game.scorekeeper_team?.name})
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className="text-blue-600 hover:text-blue-800 text-sm">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showGameForm && (
        <GameFormModal
          seasonId={selectedSeason}
          teams={teams}
          onClose={() => setShowGameForm(false)}
          onSuccess={() => {
            setShowGameForm(false)
            fetchGames()
            setSuccess('Game entered successfully!')
            setTimeout(() => setSuccess(null), 3000)
          }}
          onError={(err) => setError(err)}
        />
      )}
    </div>
  )
}

function GameFormModal({ seasonId, teams, onClose, onSuccess, onError }) {
  const [step, setStep] = useState(1) // 1 = Basic Info, 2 = Player Data
  const [gameId, setGameId] = useState(null)
  const [formData, setFormData] = useState({
    game_date: '',
    scorekeeper_name: '',
    scorekeeper_team_id: '',
    home_team_id: '',
    away_team_id: '',
    home_score: '',
    away_score: ''
  })
  const [homePlayers, setHomePlayers] = useState([])
  const [awayPlayers, setAwayPlayers] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalError, setModalError] = useState(null)

  const handleBasicInfoSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setModalError(null)

    try {
      // Validation
      if (formData.home_team_id === formData.away_team_id) {
        throw new Error('Home and away teams must be different')
      }

      const gameData = {
        season_id: seasonId,
        game_date: formData.game_date,
        scorekeeper_name: formData.scorekeeper_name,
        scorekeeper_team_id: formData.scorekeeper_team_id,
        home_team_id: formData.home_team_id,
        away_team_id: formData.away_team_id,
        home_score: parseInt(formData.home_score),
        away_score: parseInt(formData.away_score)
      }

      const { data, error } = await supabase
        .from('games')
        .insert([gameData])
        .select()
        .single()

      if (error) throw error

      setGameId(data.id)
      
      // Fetch players for both teams
      await fetchPlayers(formData.home_team_id, formData.away_team_id)
      
      setStep(2)
    } catch (err) {
      setModalError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchPlayers = async (homeTeamId, awayTeamId) => {
    try {
      const { data: homeData, error: homeError } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', homeTeamId)
        .order('name')

      if (homeError) throw homeError

      const { data: awayData, error: awayError } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', awayTeamId)
        .order('name')

      if (awayError) throw awayError

      // Initialize player data with empty values
      setHomePlayers(homeData.map(p => ({
        ...p,
        was_present: true,
        absence_note: '',
        innings_pitched: [],
        innings_caught: [],
        penultimate_pitch_count: '',
        final_pitch_count: ''
      })))

      setAwayPlayers(awayData.map(p => ({
        ...p,
        was_present: true,
        absence_note: '',
        innings_pitched: [],
        innings_caught: [],
        penultimate_pitch_count: '',
        final_pitch_count: ''
      })))
    } catch (err) {
      setModalError(err.message)
    }
  }

  const handlePlayerDataSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setModalError(null)

    try {
      const allPlayers = [...homePlayers, ...awayPlayers]

      // Insert game_players (attendance)
      const attendanceData = allPlayers.map(p => ({
        game_id: gameId,
        player_id: p.id,
        was_present: p.was_present,
        absence_note: p.was_present ? null : p.absence_note
      }))

      const { error: attendanceError } = await supabase
        .from('game_players')
        .insert(attendanceData)

      if (attendanceError) throw attendanceError

      // Insert pitching logs (only for players who pitched)
      const pitchingData = allPlayers
        .filter(p => p.innings_pitched.length > 0 && p.final_pitch_count)
        .map(p => ({
          game_id: gameId,
          player_id: p.id,
          final_pitch_count: parseInt(p.final_pitch_count),
          penultimate_batter_count: parseInt(p.penultimate_pitch_count || 0)
        }))

      if (pitchingData.length > 0) {
        const { error: pitchingError } = await supabase
          .from('pitching_logs')
          .insert(pitchingData)

        if (pitchingError) throw pitchingError
      }

      // Insert positions played (pitching and catching)
      const positionsData = []
      
      allPlayers.forEach(p => {
        // Add pitching positions
        p.innings_pitched.forEach(inning => {
          positionsData.push({
            game_id: gameId,
            player_id: p.id,
            inning_number: inning,
            position: 'pitcher'
          })
        })
        
        // Add catching positions
        p.innings_caught.forEach(inning => {
          positionsData.push({
            game_id: gameId,
            player_id: p.id,
            inning_number: inning,
            position: 'catcher'
          })
        })
      })

      if (positionsData.length > 0) {
        const { error: positionsError } = await supabase
          .from('positions_played')
          .insert(positionsData)

        if (positionsError) throw positionsError
      }

      onSuccess()
    } catch (err) {
      setModalError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleInning = (playerIndex, isHome, inningNum, type) => {
    const players = isHome ? [...homePlayers] : [...awayPlayers]
    const player = players[playerIndex]
    const arrayKey = type === 'pitch' ? 'innings_pitched' : 'innings_caught'
    
    if (player[arrayKey].includes(inningNum)) {
      player[arrayKey] = player[arrayKey].filter(i => i !== inningNum)
    } else {
      player[arrayKey] = [...player[arrayKey], inningNum].sort((a, b) => a - b)
    }
    
    if (isHome) {
      setHomePlayers(players)
    } else {
      setAwayPlayers(players)
    }
  }

  const updatePlayerField = (playerIndex, isHome, field, value) => {
    const players = isHome ? [...homePlayers] : [...awayPlayers]
    players[playerIndex][field] = value
    
    if (isHome) {
      setHomePlayers(players)
    } else {
      setAwayPlayers(players)
    }
  }

  if (step === 1) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 my-8">
          <h3 className="text-xl font-bold mb-4">Enter New Game - Step 1: Basic Info</h3>

          {modalError && (
            <div className="alert alert-error mb-4">
              {modalError}
            </div>
          )}
          
          <form onSubmit={handleBasicInfoSubmit} className="space-y-6">
            <div>
              <label className="label">Game Date *</label>
              <input
                type="date"
                className="input"
                value={formData.game_date}
                onChange={(e) => setFormData({ ...formData, game_date: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Scorekeeper Name *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.scorekeeper_name}
                  onChange={(e) => setFormData({ ...formData, scorekeeper_name: e.target.value })}
                  required
                  placeholder="John Smith"
                />
              </div>
              <div>
                <label className="label">Scorekeeper's Team *</label>
                <select
                  className="input"
                  value={formData.scorekeeper_team_id}
                  onChange={(e) => setFormData({ ...formData, scorekeeper_team_id: e.target.value })}
                  required
                >
                  <option value="">-- Select Team --</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name} ({team.division})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-4">Teams & Scores</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="label">Home Team *</label>
                    <select
                      className="input"
                      value={formData.home_team_id}
                      onChange={(e) => setFormData({ ...formData, home_team_id: e.target.value })}
                      required
                    >
                      <option value="">-- Select Team --</option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name} ({team.division})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Home Score *</label>
                    <input
                      type="number"
                      className="input"
                      value={formData.home_score}
                      onChange={(e) => setFormData({ ...formData, home_score: e.target.value })}
                      required
                      min="0"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="label">Away Team *</label>
                    <select
                      className="input"
                      value={formData.away_team_id}
                      onChange={(e) => setFormData({ ...formData, away_team_id: e.target.value })}
                      required
                    >
                      <option value="">-- Select Team --</option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name} ({team.division})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Away Score *</label>
                    <input
                      type="number"
                      className="input"
                      value={formData.away_score}
                      onChange={(e) => setFormData({ ...formData, away_score: e.target.value })}
                      required
                      min="0"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary flex-1"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Next: Enter Player Data →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // Step 2: Player Data
  const homeTeam = teams.find(t => t.id === formData.home_team_id)
  const awayTeam = teams.find(t => t.id === formData.away_team_id)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">Enter New Game - Step 2: Player Data</h3>

        {modalError && (
          <div className="alert alert-error mb-4">
            {modalError}
          </div>
        )}

        <form onSubmit={handlePlayerDataSubmit} className="space-y-8">
          {/* Home Team Section */}
          <TeamPlayerDataSection
            team={homeTeam}
            players={homePlayers}
            isHome={true}
            onToggleInning={toggleInning}
            onUpdateField={updatePlayerField}
          />

          {/* Away Team Section */}
          <TeamPlayerDataSection
            team={awayTeam}
            players={awayPlayers}
            isHome={false}
            onToggleInning={toggleInning}
            onUpdateField={updatePlayerField}
          />

          <div className="flex gap-2 pt-4 border-t sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn btn-secondary"
            >
              ← Back
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={loading}
            >
              {loading ? 'Saving Game Data...' : 'Complete & Save Game'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TeamPlayerDataSection({ team, players, isHome, onToggleInning, onUpdateField }) {
  const innings = [1, 2, 3, 4, 5, 6, 7] // Adjust if you need more innings

  return (
    <div className="border rounded-lg p-4">
      <h4 className="text-lg font-bold mb-4">{team.name} - Player Data</h4>
      
      {players.length === 0 ? (
        <p className="text-gray-500 text-sm">No players on this team's roster.</p>
      ) : (
        <div className="space-y-4">
          {players.map((player, index) => (
            <div key={player.id} className="border rounded p-4 bg-gray-50">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h5 className="font-semibold">{player.name}</h5>
                    <span className="text-sm text-gray-600">Age: {player.age}</span>
                    {player.jersey_number && (
                      <span className="text-sm text-gray-600">#{player.jersey_number}</span>
                    )}
                  </div>
                  
                  {/* Attendance */}
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={player.was_present}
                        onChange={(e) => onUpdateField(index, isHome, 'was_present', e.target.checked)}
                      />
                      Present
                    </label>
                    {!player.was_present && (
                      <input
                        type="text"
                        className="input text-sm flex-1"
                        placeholder="Absence reason (optional)"
                        value={player.absence_note}
                        onChange={(e) => onUpdateField(index, isHome, 'absence_note', e.target.value)}
                      />
                    )}
                  </div>
                </div>
              </div>

              {player.was_present && (
                <div className="space-y-3 border-t pt-3">
                  {/* Innings Pitched */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Innings Pitched:</label>
                    <div className="flex gap-2 flex-wrap">
                      {innings.map(inning => (
                        <label key={inning} className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={player.innings_pitched.includes(inning)}
                            onChange={() => onToggleInning(index, isHome, inning, 'pitch')}
                          />
                          <span className="text-sm">{inning}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Pitch Counts (only if pitched) */}
                  {player.innings_pitched.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">
                          Pitch Count (before last batter)
                        </label>
                        <input
                          type="number"
                          className="input text-sm"
                          placeholder="0"
                          min="0"
                          value={player.penultimate_pitch_count}
                          onChange={(e) => onUpdateField(index, isHome, 'penultimate_pitch_count', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">
                          Final Pitch Count *
                        </label>
                        <input
                          type="number"
                          className="input text-sm"
                          placeholder="0"
                          min="0"
                          required
                          value={player.final_pitch_count}
                          onChange={(e) => onUpdateField(index, isHome, 'final_pitch_count', e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Innings Caught */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Innings Caught:</label>
                    <div className="flex gap-2 flex-wrap">
                      {innings.map(inning => (
                        <label key={inning} className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={player.innings_caught.includes(inning)}
                            onChange={() => onToggleInning(index, isHome, inning, 'catch')}
                          />
                          <span className="text-sm">{inning}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}