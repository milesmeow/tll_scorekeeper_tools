import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function GameEntry() {
  const [seasons, setSeasons] = useState([])
  const [teams, setTeams] = useState([])
  const [selectedSeason, setSelectedSeason] = useState(null)
  const [selectedDivision, setSelectedDivision] = useState('All') // Division filter
  const [loading, setLoading] = useState(true)
  const [showGameForm, setShowGameForm] = useState(false)
  const [games, setGames] = useState([])
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [gameToDelete, setGameToDelete] = useState(null) // For delete confirmation
  const [deleteConfirmText, setDeleteConfirmText] = useState('') // Text to confirm deletion
  const [gameToView, setGameToView] = useState(null) // For viewing game details
  const [gameToEdit, setGameToEdit] = useState(null) // For editing game

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

  const handleDeleteGame = async () => {
    if (!gameToDelete || deleteConfirmText.toLowerCase() !== 'delete') return

    try {
      const { error } = await supabase
        .from('games')
        .delete()
        .eq('id', gameToDelete.id)

      if (error) throw error

      // Refresh games list
      await fetchGames()
      setSuccess('Game deleted successfully!')
      setTimeout(() => setSuccess(null), 3000)
      setGameToDelete(null)
      setDeleteConfirmText('')
    } catch (err) {
      setError(err.message)
      setGameToDelete(null)
      setDeleteConfirmText('')
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

  // Filter games by selected division
  const filteredGames = selectedDivision === 'All'
    ? games
    : games.filter(game => game.home_team.division === selectedDivision)

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

      {/* Season and Division Selectors */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Select Season</label>
          <select
            className="input"
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
        <div>
          <label className="label">Filter by Division</label>
          <select
            className="input"
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value)}
          >
            <option value="All">All Divisions</option>
            <option value="Training">Training</option>
            <option value="Minor">Minor</option>
            <option value="Major">Major</option>
          </select>
        </div>
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
      {filteredGames.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-600 mb-4">
            {games.length === 0
              ? 'No games entered yet for this season.'
              : `No games found for ${selectedDivision} division.`
            }
          </p>
          {games.length === 0 && (
            <button
              onClick={() => setShowGameForm(true)}
              className="btn btn-primary"
            >
              Enter First Game
            </button>
          )}
        </div>
      ) : (
        <div className="card">
          <div className="space-y-4">
            {filteredGames.map((game) => (
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
                      {game.away_team.name} at {game.home_team.name}
                    </p>
                    <p className="text-gray-700 mt-1">
                      Score: {game.away_score} - {game.home_score}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Scorekeeper: {game.scorekeeper_name} ({game.scorekeeper_team?.name})
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setGameToView(game)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => setGameToEdit(game)}
                      className="text-green-600 hover:text-green-800 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setGameToDelete(game)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
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
          defaultDivision={selectedDivision !== 'All' ? selectedDivision : ''}
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

      {/* Game Detail Modal */}
      {gameToView && (
        <GameDetailModal
          game={gameToView}
          onClose={() => setGameToView(null)}
        />
      )}

      {/* Edit Game Modal */}
      {gameToEdit && (
        <GameFormModal
          seasonId={selectedSeason}
          teams={teams}
          gameToEdit={gameToEdit}
          defaultDivision={gameToEdit.home_team.division}
          onClose={() => setGameToEdit(null)}
          onSuccess={() => {
            setGameToEdit(null)
            fetchGames()
            setSuccess('Game updated successfully!')
            setTimeout(() => setSuccess(null), 3000)
          }}
          onError={(err) => setError(err)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {gameToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4 text-red-600">Delete Game?</h3>

            <div className="mb-4">
              <p className="text-gray-700 mb-2">
                You are about to delete this game:
              </p>
              <div className="bg-gray-50 p-3 rounded border border-gray-200">
                <p className="font-semibold">
                  {gameToDelete.away_team?.name} at {gameToDelete.home_team?.name}
                </p>
                <p className="text-sm text-gray-600">
                  {new Date(gameToDelete.game_date).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-600">
                  Score: {gameToDelete.away_score} - {gameToDelete.home_score}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-700 mb-2">
                This will permanently delete the game and all player data (attendance, pitch counts, positions played).
              </p>
              <p className="text-sm font-semibold text-red-600 mb-2">
                This action cannot be undone!
              </p>
              <label className="label">Type "delete" to confirm:</label>
              <input
                type="text"
                className="input"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type delete here"
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setGameToDelete(null)
                  setDeleteConfirmText('')
                }}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteGame}
                disabled={deleteConfirmText.toLowerCase() !== 'delete'}
                className="btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex-1"
              >
                Delete Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function GameFormModal({ seasonId, teams, defaultDivision, gameToEdit, onClose, onSuccess, onError }) {
  const isEditMode = !!gameToEdit
  const [step, setStep] = useState(1) // 1 = Basic Info, 2 = Player Data
  const [gameId, setGameId] = useState(gameToEdit?.id || null)
  const [selectedDivision, setSelectedDivision] = useState(defaultDivision || '')
  const [formData, setFormData] = useState({
    game_date: gameToEdit?.game_date || '',
    scorekeeper_name: gameToEdit?.scorekeeper_name || '',
    scorekeeper_team_id: gameToEdit?.scorekeeper_team_id || '',
    home_team_id: gameToEdit?.home_team_id || '',
    away_team_id: gameToEdit?.away_team_id || '',
    home_score: gameToEdit?.home_score?.toString() || '',
    away_score: gameToEdit?.away_score?.toString() || ''
  })
  const [homePlayers, setHomePlayers] = useState([]) // Player data for home team
  const [awayPlayers, setAwayPlayers] = useState([]) // Player data for away team
  const [loading, setLoading] = useState(false)
  const [modalError, setModalError] = useState(null)

  // Save original game data for comparison when editing
  const [originalGameData, setOriginalGameData] = useState(null)

  // Load existing player data when editing
  useEffect(() => {
    if (isEditMode && gameToEdit) {
      loadExistingGameData()
    }
  }, [])

  const loadExistingGameData = async () => {
    try {
      setLoading(true)

      // Fetch game_players with player info
      const { data: gamePlayers, error: playersError } = await supabase
        .from('game_players')
        .select(`
          *,
          player:players(*)
        `)
        .eq('game_id', gameToEdit.id)

      if (playersError) throw playersError

      // Fetch pitching_logs
      const { data: pitchingLogs, error: pitchingError } = await supabase
        .from('pitching_logs')
        .select('*')
        .eq('game_id', gameToEdit.id)

      if (pitchingError) throw pitchingError

      // Fetch positions_played
      const { data: positionsPlayed, error: positionsError } = await supabase
        .from('positions_played')
        .select('*')
        .eq('game_id', gameToEdit.id)

      if (positionsError) throw positionsError

      // Organize player data by team
      const homePlayerData = []
      const awayPlayerData = []

      gamePlayers.forEach(gp => {
        const playerPitching = pitchingLogs.find(pl => pl.player_id === gp.player_id)
        const playerPositions = positionsPlayed.filter(pp => pp.player_id === gp.player_id)

        const playerData = {
          ...gp.player,
          was_present: gp.was_present,
          absence_note: gp.absence_note || '',
          innings_pitched: playerPositions
            .filter(p => p.position === 'pitcher')
            .map(p => p.inning_number)
            .sort((a, b) => a - b),
          innings_caught: playerPositions
            .filter(p => p.position === 'catcher')
            .map(p => p.inning_number)
            .sort((a, b) => a - b),
          penultimate_pitch_count: playerPitching?.penultimate_batter_count?.toString() || '',
          final_pitch_count: playerPitching?.final_pitch_count?.toString() || ''
        }

        if (gp.player.team_id === gameToEdit.home_team_id) {
          homePlayerData.push(playerData)
        } else {
          awayPlayerData.push(playerData)
        }
      })

      setHomePlayers(homePlayerData)
      setAwayPlayers(awayPlayerData)

      // Save original game data for comparison when teams change
      setOriginalGameData({
        homeTeamId: gameToEdit.home_team_id,
        awayTeamId: gameToEdit.away_team_id,
        homePlayers: homePlayerData,
        awayPlayers: awayPlayerData
      })
    } catch (err) {
      setModalError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Filter teams by selected division
  const filteredTeams = selectedDivision
    ? teams.filter(team => team.division === selectedDivision)
    : []

  // Filter out already selected teams from home/away dropdowns
  const availableHomeTeams = filteredTeams.filter(team => team.id !== formData.away_team_id)
  const availableAwayTeams = filteredTeams.filter(team => team.id !== formData.home_team_id)

  const handleBasicInfoSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setModalError(null)

    try {
      // Validation
      if (formData.home_team_id === formData.away_team_id) {
        throw new Error('Home and away teams must be different')
      }

      if (isEditMode) {
        // For edit mode: Don't save yet, handle player data based on team changes
        const oldHomeId = originalGameData.homeTeamId
        const oldAwayId = originalGameData.awayTeamId
        const newHomeId = formData.home_team_id
        const newAwayId = formData.away_team_id

        // Check if teams are exactly the same (including swap)
        const sameTeams = (oldHomeId === newHomeId && oldAwayId === newAwayId) ||
                         (oldHomeId === newAwayId && oldAwayId === newHomeId)

        if (sameTeams) {
          // Teams are the same (possibly swapped) - reorganize existing player data
          if (oldHomeId === newAwayId && oldAwayId === newHomeId) {
            // Teams were swapped - just swap the player arrays
            const temp = homePlayers
            setHomePlayers(awayPlayers)
            setAwayPlayers(temp)
          }
          // If teams unchanged, keep player data as-is
        } else {
          // Teams changed - need to handle intelligently
          // Use ORIGINAL game data to determine which teams to keep
          const homeTeamKept = (newHomeId === oldHomeId || newHomeId === oldAwayId)
          const awayTeamKept = (newAwayId === oldHomeId || newAwayId === oldAwayId)

          let newHomePlayers = []
          let newAwayPlayers = []

          if (homeTeamKept) {
            // Home team is from the original game - get its ORIGINAL data
            if (newHomeId === oldHomeId) {
              newHomePlayers = originalGameData.homePlayers
            } else {
              // newHomeId === oldAwayId
              newHomePlayers = originalGameData.awayPlayers
            }
          } else {
            // Home team is new - fetch players
            const { data, error } = await supabase
              .from('players')
              .select('*')
              .eq('team_id', newHomeId)
              .order('name')

            if (error) throw error

            newHomePlayers = data.map(player => ({
              ...player,
              was_present: true,
              absence_note: '',
              innings_pitched: [],
              innings_caught: [],
              penultimate_pitch_count: '',
              final_pitch_count: ''
            }))
          }

          if (awayTeamKept) {
            // Away team is from the original game - get its ORIGINAL data
            if (newAwayId === oldAwayId) {
              newAwayPlayers = originalGameData.awayPlayers
            } else {
              // newAwayId === oldHomeId
              newAwayPlayers = originalGameData.homePlayers
            }
          } else {
            // Away team is new - fetch players
            const { data, error } = await supabase
              .from('players')
              .select('*')
              .eq('team_id', newAwayId)
              .order('name')

            if (error) throw error

            newAwayPlayers = data.map(player => ({
              ...player,
              was_present: true,
              absence_note: '',
              innings_pitched: [],
              innings_caught: [],
              penultimate_pitch_count: '',
              final_pitch_count: ''
            }))
          }

          setHomePlayers(newHomePlayers)
          setAwayPlayers(newAwayPlayers)
        }
      } else {
        // For new game: Don't save to database yet, just fetch players
        // Game will be created in Step 2 along with player data
        await fetchPlayers(formData.home_team_id, formData.away_team_id)
      }

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

      // Initialize ALL players with default data (all assumed present)
      const initializedHomePlayers = homeData.map(player => ({
        ...player,
        was_present: true,
        absence_note: '',
        innings_pitched: [],
        innings_caught: [],
        penultimate_pitch_count: '',
        final_pitch_count: ''
      }))

      const initializedAwayPlayers = awayData.map(player => ({
        ...player,
        was_present: true,
        absence_note: '',
        innings_pitched: [],
        innings_caught: [],
        penultimate_pitch_count: '',
        final_pitch_count: ''
      }))

      setHomePlayers(initializedHomePlayers)
      setAwayPlayers(initializedAwayPlayers)
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
      let finalGameId = gameId

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

      if (!isEditMode) {
        // Creating new game - insert game record
        const { data, error } = await supabase
          .from('games')
          .insert([gameData])
          .select()
          .single()

        if (error) throw error

        finalGameId = data.id
        setGameId(finalGameId)
      } else {
        // Editing game - update game record and delete old player data
        const { error } = await supabase
          .from('games')
          .update(gameData)
          .eq('id', gameId)

        if (error) throw error

        // Delete existing player data
        await supabase.from('game_players').delete().eq('game_id', gameId)
        await supabase.from('pitching_logs').delete().eq('game_id', gameId)
        await supabase.from('positions_played').delete().eq('game_id', gameId)
      }

      // Insert game_players (attendance)
      const attendanceData = allPlayers.map(p => ({
        game_id: finalGameId,
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
          game_id: finalGameId,
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
            game_id: finalGameId,
            player_id: p.id,
            inning_number: inning,
            position: 'pitcher'
          })
        })

        // Add catching positions
        p.innings_caught.forEach(inning => {
          positionsData.push({
            game_id: finalGameId,
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
          <h3 className="text-xl font-bold mb-4">
            {isEditMode ? 'Edit Game - Step 1: Basic Info' : 'Enter New Game - Step 1: Basic Info'}
          </h3>

          {modalError && (
            <div className="alert alert-error mb-4">
              {modalError}
            </div>
          )}

          <form onSubmit={handleBasicInfoSubmit} className="space-y-6">
            {/* Division Selector */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label className="label">Select Division *</label>
              <select
                className="input"
                value={selectedDivision}
                onChange={(e) => {
                  setSelectedDivision(e.target.value)
                  // Reset team selections when division changes
                  setFormData({
                    ...formData,
                    scorekeeper_team_id: '',
                    home_team_id: '',
                    away_team_id: ''
                  })
                }}
                required
              >
                <option value="">-- Select Division --</option>
                <option value="Training">Training</option>
                <option value="Minor">Minor</option>
                <option value="Major">Major</option>
              </select>
            </div>

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
                  disabled={!selectedDivision}
                >
                  <option value="">-- Select Team --</option>
                  {filteredTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
                {!selectedDivision && (
                  <p className="text-sm text-gray-500 mt-1">Select a division first</p>
                )}
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
                      disabled={!selectedDivision}
                    >
                      <option value="">-- Select Team --</option>
                      {availableHomeTeams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                    {!selectedDivision && (
                      <p className="text-sm text-gray-500 mt-1">Select a division first</p>
                    )}
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
                      disabled={!selectedDivision}
                    >
                      <option value="">-- Select Team --</option>
                      {availableAwayTeams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                    {!selectedDivision && (
                      <p className="text-sm text-gray-500 mt-1">Select a division first</p>
                    )}
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
        <h3 className="text-xl font-bold mb-4">
          {isEditMode ? 'Edit Game - Step 2: Player Data' : 'Enter New Game - Step 2: Player Data'}
        </h3>

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
              {loading ? 'Saving Game Data...' : (isEditMode ? 'Update Game' : 'Complete & Save Game')}
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

      {/* Player Data Entry Forms - All players included by default */}
      {players.length === 0 ? (
        <p className="text-gray-500 text-sm italic text-center py-4">
          No players on this team's roster
        </p>
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

                  {/* Attendance - Mark if ABSENT */}
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!player.was_present}
                        onChange={(e) => onUpdateField(index, isHome, 'was_present', !e.target.checked)}
                      />
                      <span className="text-red-600">Absent</span>
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

function GameDetailModal({ game, onClose }) {
  const [loading, setLoading] = useState(true)
  const [gameData, setGameData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchGameDetails()
  }, [])

  const fetchGameDetails = async () => {
    try {
      // Fetch game_players with player info
      const { data: gamePlayers, error: playersError } = await supabase
        .from('game_players')
        .select(`
          *,
          player:players(*)
        `)
        .eq('game_id', game.id)

      if (playersError) throw playersError

      // Fetch pitching_logs with player info
      const { data: pitchingLogs, error: pitchingError } = await supabase
        .from('pitching_logs')
        .select(`
          *,
          player:players(*)
        `)
        .eq('game_id', game.id)

      if (pitchingError) throw pitchingError

      // Fetch positions_played with player info
      const { data: positionsPlayed, error: positionsError } = await supabase
        .from('positions_played')
        .select(`
          *,
          player:players(*)
        `)
        .eq('game_id', game.id)

      if (positionsError) throw positionsError

      // Organize data by team and player
      const homePlayerData = []
      const awayPlayerData = []

      gamePlayers.forEach(gp => {
        const playerData = {
          ...gp,
          pitching: pitchingLogs.find(pl => pl.player_id === gp.player_id),
          positions: positionsPlayed.filter(pp => pp.player_id === gp.player_id)
        }

        if (gp.player.team_id === game.home_team_id) {
          homePlayerData.push(playerData)
        } else {
          awayPlayerData.push(playerData)
        }
      })

      setGameData({
        homePlayers: homePlayerData,
        awayPlayers: awayPlayerData
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 max-w-5xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-2xl font-bold">{game.away_team.name} at {game.home_team.name}</h3>
            <p className="text-gray-600 mt-1">
              {new Date(game.game_date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
            <p className="text-lg font-semibold mt-2">
              Final Score: {game.away_score} - {game.home_score}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Scorekeeper: {game.scorekeeper_name} ({game.scorekeeper_team?.name})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="alert alert-error mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading game details...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Home Team Section */}
            <TeamDetailSection
              teamName={game.home_team.name}
              players={gameData.homePlayers}
              isHome={true}
            />

            {/* Away Team Section */}
            <TeamDetailSection
              teamName={game.away_team.name}
              players={gameData.awayPlayers}
              isHome={false}
            />
          </div>
        )}

        <div className="flex justify-end mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function TeamDetailSection({ teamName, players, isHome }) {
  // Only show players who pitched, caught, or were absent
  const pitchersAndCatchers = players.filter(p => p.was_present && p.positions.length > 0)
  const absentPlayers = players.filter(p => !p.was_present)

  return (
    <div className="border rounded-lg p-4">
      <h4 className="text-lg font-bold mb-4 bg-blue-50 -m-4 p-4 rounded-t-lg border-b">
        {teamName} {isHome ? '(Home)' : '(Away)'}
      </h4>

      {/* Pitchers and Catchers */}
      {pitchersAndCatchers.length > 0 && (
        <div className="mt-4">
          <h5 className="font-semibold mb-3 text-blue-700">Pitchers & Catchers</h5>
          <div className="space-y-3">
            {pitchersAndCatchers.map(playerData => {
              const pitchedInnings = playerData.positions
                .filter(p => p.position === 'pitcher')
                .map(p => p.inning_number)
                .sort((a, b) => a - b)

              const caughtInnings = playerData.positions
                .filter(p => p.position === 'catcher')
                .map(p => p.inning_number)
                .sort((a, b) => a - b)

              return (
                <div key={playerData.player_id} className="bg-gray-50 border rounded p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h6 className="font-semibold">{playerData.player.name}</h6>
                        <span className="text-sm text-gray-600">Age: {playerData.player.age}</span>
                        {playerData.player.jersey_number && (
                          <span className="text-sm text-gray-600">#{playerData.player.jersey_number}</span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {/* Pitching Info */}
                        {pitchedInnings.length > 0 && (
                          <div>
                            <span className="font-medium text-gray-700">Pitched: </span>
                            <span className="text-gray-600">
                              {pitchedInnings.length === 1
                                ? `Inning ${pitchedInnings[0]}`
                                : `Innings ${pitchedInnings.join(', ')}`
                              }
                            </span>
                            {playerData.pitching && (
                              <div className="mt-1 pl-2 border-l-2 border-blue-300">
                                <div>
                                  <span className="font-medium text-gray-700">Final Pitch Count: </span>
                                  <span className="text-blue-700 font-semibold">
                                    {playerData.pitching.final_pitch_count}
                                  </span>
                                </div>
                                {playerData.pitching.penultimate_batter_count > 0 && (
                                  <div>
                                    <span className="font-medium text-gray-700">Before Last Batter: </span>
                                    <span className="text-gray-600">
                                      {playerData.pitching.penultimate_batter_count}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Catching Info */}
                        {caughtInnings.length > 0 && (
                          <div>
                            <span className="font-medium text-gray-700">Caught: </span>
                            <span className="text-gray-600">
                              {caughtInnings.length === 1
                                ? `Inning ${caughtInnings[0]}`
                                : `Innings ${caughtInnings.join(', ')}`
                              }
                            </span>
                          </div>
                        )}
                      </div>

                      {pitchedInnings.length === 0 && caughtInnings.length === 0 && (
                        <p className="text-sm text-gray-500 italic">
                          No pitching or catching recorded
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Absent Players */}
      {absentPlayers.length > 0 && (
        <div className="mt-4">
          <h5 className="font-semibold mb-3 text-red-700">Absent ({absentPlayers.length})</h5>
          <div className="space-y-2">
            {absentPlayers.map(playerData => (
              <div key={playerData.player_id} className="bg-red-50 border border-red-200 rounded p-3">
                <div className="flex items-center gap-3">
                  <h6 className="font-semibold text-gray-800">{playerData.player.name}</h6>
                  <span className="text-sm text-gray-600">Age: {playerData.player.age}</span>
                  {playerData.player.jersey_number && (
                    <span className="text-sm text-gray-600">#{playerData.player.jersey_number}</span>
                  )}
                </div>
                {playerData.absence_note && (
                  <p className="text-sm text-gray-600 mt-1">
                    <span className="font-medium">Reason: </span>
                    {playerData.absence_note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {pitchersAndCatchers.length === 0 && absentPlayers.length === 0 && (
        <p className="text-gray-500 text-sm italic text-center py-4">
          No pitchers, catchers, or absences recorded
        </p>
      )}
    </div>
  )
}