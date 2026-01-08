import { useState, useEffect, memo, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useCoachAssignments } from '../../lib/useCoachAssignments'
import GameDetailModal from './GameDetailModal'
import { calculateNextEligibleDate, PITCH_SMART_RULES } from '../../lib/pitchSmartRules'
import { formatGameDate } from '../../lib/pitchCountUtils'

export default function GameEntry({ profile, isAdmin }) {
  const [seasons, setSeasons] = useState([])
  const [teams, setTeams] = useState([])
  const [selectedSeason, setSelectedSeason] = useState(null)
  const [selectedDivision, setSelectedDivision] = useState('Major') // Default to Major division
  const [loading, setLoading] = useState(true)
  const [showGameForm, setShowGameForm] = useState(false)
  const [games, setGames] = useState([])
  const [gameViolations, setGameViolations] = useState({}) // Track which games have violations
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [gameToDelete, setGameToDelete] = useState(null) // For delete confirmation
  const [deleteConfirmText, setDeleteConfirmText] = useState('') // Text to confirm deletion
  const [gameToView, setGameToView] = useState(null) // For viewing game details
  const [gameToEdit, setGameToEdit] = useState(null) // For editing game

  // Fetch coach assignments for filtering
  const coachData = useCoachAssignments(profile)

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
      let query = supabase
        .from('seasons')
        .select('*')

      // Coaches can only see active seasons
      if (!isAdmin) {
        query = query.eq('is_active', true)
      }

      query = query
        .order('is_active', { ascending: false })
        .order('start_date', { ascending: false })

      const { data, error } = await query

      if (error) throw error
      setSeasons(data)

      const activeSeason = data.find(s => s.is_active)
      if (activeSeason) {
        setSelectedSeason(activeSeason.id)
      } else if (data.length > 0) {
        setSelectedSeason(data[0].id)
      }

      // Set default division for coaches based on their first assigned division
      if (!isAdmin && !coachData.loading && coachData.divisions.length > 0) {
        setSelectedDivision(coachData.divisions[0])
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

      // Filter teams by coach's divisions
      const filteredTeams = coachData.filterTeamsByCoachDivisions(data)
      setTeams(filteredTeams)
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

      // Filter games by coach's divisions (show games where home OR away team is in coach's divisions)
      const filteredGames = coachData.filterGamesByCoachDivisions(data)
      setGames(filteredGames)

      // Check violations for all games
      checkGameViolations(filteredGames)
    } catch (err) {
      setError(err.message)
    }
  }

  const checkGameViolations = async (gamesToCheck) => {
    if (gamesToCheck.length === 0) {
      setGameViolations({})
      return
    }

    try {
      const gameIds = gamesToCheck.map(g => g.id)

      // Fetch all positions and pitching data for all games in bulk (much faster!)
      const [positionsRes, pitchingRes, playersRes] = await Promise.all([
        supabase.from('positions_played').select('*').in('game_id', gameIds),
        supabase.from('pitching_logs').select('*').in('game_id', gameIds),
        supabase.from('game_players').select('player_id, players!inner(age)').in('game_id', gameIds)
      ])

      if (positionsRes.error || pitchingRes.error || playersRes.error) {
        setGameViolations({})
        return
      }

      const allPositions = positionsRes.data
      const allPitchingLogs = pitchingRes.data

      // Create player age lookup map
      const playerAges = {}
      playersRes.data?.forEach(gp => {
        playerAges[gp.player_id] = gp.players.age
      })

      // Group data by game and player
      const violations = {}

      for (const gameId of gameIds) {
        violations[gameId] = checkGameHasViolations(
          gameId,
          allPositions.filter(p => p.game_id === gameId),
          allPitchingLogs.filter(p => p.game_id === gameId),
          playerAges
        )
      }

      setGameViolations(violations)
    } catch (err) {
      setGameViolations({})
    }
  }

  const checkGameHasViolations = (gameId, positions, pitchingLogs, playerAges) => {
    // Group by player
    const playerData = {}

    positions.forEach(pos => {
      if (!playerData[pos.player_id]) {
        playerData[pos.player_id] = { pitched: [], caught: [], pitching: null }
      }
      if (pos.position === 'pitcher') {
        playerData[pos.player_id].pitched.push(pos.inning_number)
      } else if (pos.position === 'catcher') {
        playerData[pos.player_id].caught.push(pos.inning_number)
      }
    })

    pitchingLogs.forEach(log => {
      if (playerData[log.player_id]) {
        playerData[log.player_id].pitching = log
      }
    })

    // Check each player for violations
    for (const [playerId, player] of Object.entries(playerData)) {
      const pitchedInnings = player.pitched.sort((a, b) => a - b)
      const caughtInnings = player.caught.sort((a, b) => a - b)
      const effectivePitches = player.pitching ? (player.pitching.penultimate_batter_count + 1) : 0

      // Check Rule 1: Consecutive innings
      if (hasInningsGap(pitchedInnings)) return true

      // Check Rule 2: 41+ pitches -> cannot catch after
      if (cannotCatchDueToHighPitchCount(pitchedInnings, caughtInnings, effectivePitches)) return true

      // Check Rule 3: 4 innings catching -> cannot pitch after
      if (cannotPitchDueToFourInningsCatching(pitchedInnings, caughtInnings)) return true

      // Check Rule 4: Catch 1-3 + pitch 21+ -> cannot return to catch
      if (cannotCatchAgainDueToCombined(pitchedInnings, caughtInnings, effectivePitches)) return true

      // Check Rule 5: Pitch count exceeds age limit
      if (exceedsMaxPitchesForAge(playerId, effectivePitches, playerAges)) return true
    }

    return false
  }

  // Validation helper functions
  const hasInningsGap = (innings) => {
    if (innings.length <= 1) return false
    for (let i = 0; i < innings.length - 1; i++) {
      if (innings[i + 1] - innings[i] !== 1) return true
    }
    return false
  }

  const cannotCatchDueToHighPitchCount = (pitchedInnings, caughtInnings, effectivePitches) => {
    if (effectivePitches < 41 || caughtInnings.length === 0 || pitchedInnings.length === 0) return false
    const maxPitchingInning = Math.max(...pitchedInnings)
    return caughtInnings.some(inning => inning > maxPitchingInning)
  }

  const cannotPitchDueToFourInningsCatching = (pitchedInnings, caughtInnings) => {
    if (caughtInnings.length < 4 || pitchedInnings.length === 0) return false
    const fourthCatchingInning = [...caughtInnings].sort((a, b) => a - b)[3]
    return pitchedInnings.some(inning => inning > fourthCatchingInning)
  }

  const cannotCatchAgainDueToCombined = (pitchedInnings, caughtInnings, effectivePitches) => {
    if (caughtInnings.length < 1 || caughtInnings.length > 3 || effectivePitches < 21 || pitchedInnings.length === 0) return false
    const minPitchingInning = Math.min(...pitchedInnings)
    const maxPitchingInning = Math.max(...pitchedInnings)
    const hasCaughtBeforePitching = caughtInnings.some(inning => inning < minPitchingInning)
    const hasReturnedToCatch = caughtInnings.some(inning => inning > maxPitchingInning)
    return hasCaughtBeforePitching && hasReturnedToCatch
  }

  // Helper function to get max allowed pitches for a player's age
  const getMaxPitchesForAge = (age) => {
    const rule = PITCH_SMART_RULES.find(
      r => age >= r.ageMin && age <= r.ageMax
    )
    return rule ? rule.maxPitchesPerGame : null
  }

  // Helper function to check Rule 5: Pitch count exceeds age limit
  const exceedsMaxPitchesForAge = (playerId, effectivePitches, playerAges) => {
    const age = playerAges[playerId]
    if (!age) return false  // No age data, can't validate

    const maxPitches = getMaxPitchesForAge(age)
    if (!maxPitches) return false  // No rule for this age

    return effectivePitches > maxPitches
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

  // Show empty state for coaches with no assignments
  if (coachData.isEmpty && !coachData.loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6">⚾ Game Entry</h2>
        <div className="card text-center py-12">
          <p className="text-gray-600 mb-2">You have no team assignments.</p>
          <p className="text-gray-500 text-sm">Please contact an administrator.</p>
        </div>
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

  // Filter games by selected division (show games where home OR away team is in selected division)
  const filteredGames = selectedDivision && selectedDivision !== 'All'
    ? games.filter(game =>
        game.home_team?.division === selectedDivision ||
        game.away_team?.division === selectedDivision
      )
    : games

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">⚾ Game Entry</h2>
        {isAdmin && (
          <button
            onClick={() => setShowGameForm(true)}
            className="btn btn-primary"
          >
            + Enter New Game
          </button>
        )}
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
          <label className="label">Select Division</label>
          <select
            className="input"
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value)}
          >
            {!isAdmin ? (
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
                <option value="Training">Training</option>
                <option value="Minor">Minor</option>
                <option value="Major">Major</option>
              </>
            )}
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
          {isAdmin && games.length === 0 && (
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
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-600">
                        {formatGameDate(game.game_date)}
                      </p>
                      {(game.home_team?.division || game.away_team?.division) && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                          {game.home_team?.division || game.away_team?.division}
                        </span>
                      )}
                      {gameViolations[game.id] && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                          ⚠️ Rule Violation
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-lg">
                      {game.away_team?.name || 'Unknown'} at {game.home_team?.name || 'Unknown'}
                    </p>
                    <p className="text-gray-700 mt-1">
                      Score: {game.away_score} - {game.home_score}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Scorekeeper: {game.scorekeeper_name} ({game.scorekeeper_team?.name})
                    </p>
                    {game.notes && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                        <span className="font-semibold text-yellow-900">📝 Note: </span>
                        <span className="text-gray-700">
                          {game.notes.length > 100 ? `${game.notes.substring(0, 100)}...` : game.notes}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setGameToView(game)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      View Details
                    </button>
                    {isAdmin && (
                      <>
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
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isAdmin && showGameForm && (
        <GameFormModal
          seasonId={selectedSeason}
          teams={teams}
          defaultDivision={selectedDivision}
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
      {isAdmin && gameToEdit && (
        <GameFormModal
          seasonId={selectedSeason}
          teams={teams}
          gameToEdit={gameToEdit}
          defaultDivision={gameToEdit.home_team?.division || 'Major'}
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
      {isAdmin && gameToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg px-6 pt-6 max-w-md w-full mx-4">
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

            <div className="flex gap-2 pb-6">
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
  const [step, setStep] = useState(1) // 1 = Basic Info, 2 = Player Data, 3 = Confirmation
  const [gameId, setGameId] = useState(gameToEdit?.id || null)
  const [selectedDivision, setSelectedDivision] = useState(defaultDivision || '')
  const [formData, setFormData] = useState({
    game_date: gameToEdit?.game_date || '',
    scorekeeper_name: gameToEdit?.scorekeeper_name || '',
    scorekeeper_team_id: gameToEdit?.scorekeeper_team_id || '',
    home_team_id: gameToEdit?.home_team_id || '',
    away_team_id: gameToEdit?.away_team_id || '',
    home_score: gameToEdit?.home_score?.toString() || '',
    away_score: gameToEdit?.away_score?.toString() || '',
    notes: gameToEdit?.notes || ''
  })
  const [homePlayers, setHomePlayers] = useState([]) // Player data for home team
  const [awayPlayers, setAwayPlayers] = useState([]) // Player data for away team
  const [loading, setLoading] = useState(false)
  const [modalError, setModalError] = useState(null)

  // Ref for scrolling to top on error
  const modalContentRef = useRef(null)

  // Save original game data for comparison when editing
  const [originalGameData, setOriginalGameData] = useState(null)

  // Scroll to top when error occurs
  useEffect(() => {
    if (modalError && modalContentRef.current) {
      modalContentRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [modalError])

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
          penultimate_batter_count: playerPitching?.penultimate_batter_count?.toString() || '',
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
              penultimate_batter_count: '',
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
              penultimate_batter_count: '',
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
      // Scroll to top to show error
      if (modalContentRef.current) {
        modalContentRef.current.scrollTo({ top: 0, behavior: 'smooth' })
      }
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
        penultimate_batter_count: '',
        final_pitch_count: ''
      }))

      const initializedAwayPlayers = awayData.map(player => ({
        ...player,
        was_present: true,
        absence_note: '',
        innings_pitched: [],
        innings_caught: [],
        penultimate_batter_count: '',
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

      // Validate pitch counts before proceeding to confirmation
      for (const player of allPlayers) {
        if (player.innings_pitched.length > 0 && player.final_pitch_count) {
          const penultimate = parseInt(player.penultimate_batter_count || 0)
          const final = parseInt(player.final_pitch_count)

          if (penultimate > final) {
            throw new Error(
              `Invalid pitch counts for ${player.name}: Pitch count before last batter (${penultimate}) cannot be greater than final pitch count (${final}).`
            )
          }
        }
      }

      // Validate that all innings have pitchers and catchers for each team separately
      const homeTeam = teams.find(t => t.id === formData.home_team_id)
      const awayTeam = teams.find(t => t.id === formData.away_team_id)

      // Helper function to validate inning coverage for a team
      const validateTeamCoverage = (players, teamName) => {
        const pitchedInnings = new Set()
        const caughtInnings = new Set()

        players.forEach(player => {
          player.innings_pitched.forEach(inning => pitchedInnings.add(inning))
          player.innings_caught.forEach(inning => caughtInnings.add(inning))
        })

        // Check pitching coverage
        if (pitchedInnings.size > 0) {
          const maxPitchedInning = Math.max(...Array.from(pitchedInnings))
          const missingPitchingInnings = []

          for (let i = 1; i <= maxPitchedInning; i++) {
            if (!pitchedInnings.has(i)) {
              missingPitchingInnings.push(i)
            }
          }

          if (missingPitchingInnings.length > 0) {
            throw new Error(
              `${teamName}: Missing pitchers for inning${missingPitchingInnings.length > 1 ? 's' : ''} ${missingPitchingInnings.join(', ')}. ` +
              `If inning ${maxPitchedInning} has a pitcher, all previous innings must also have pitchers.`
            )
          }
        }

        // Check catching coverage
        if (caughtInnings.size > 0) {
          const maxCaughtInning = Math.max(...Array.from(caughtInnings))
          const missingCatchingInnings = []

          for (let i = 1; i <= maxCaughtInning; i++) {
            if (!caughtInnings.has(i)) {
              missingCatchingInnings.push(i)
            }
          }

          if (missingCatchingInnings.length > 0) {
            throw new Error(
              `${teamName}: Missing catchers for inning${missingCatchingInnings.length > 1 ? 's' : ''} ${missingCatchingInnings.join(', ')}. ` +
              `If inning ${maxCaughtInning} has a catcher, all previous innings must also have catchers.`
            )
          }
        }

        // Check that pitched innings and caught innings match exactly
        const pitchedArray = Array.from(pitchedInnings).sort((a, b) => a - b)
        const caughtArray = Array.from(caughtInnings).sort((a, b) => a - b)

        if (pitchedArray.length !== caughtArray.length ||
            !pitchedArray.every((inning, index) => inning === caughtArray[index])) {

          // Find which innings are mismatched
          const pitchedOnly = pitchedArray.filter(i => !caughtInnings.has(i))
          const caughtOnly = caughtArray.filter(i => !pitchedInnings.has(i))

          let errorMsg = `${teamName}: Pitched innings and caught innings must match. `

          if (pitchedOnly.length > 0) {
            errorMsg += `Inning${pitchedOnly.length > 1 ? 's' : ''} ${pitchedOnly.join(', ')} ${pitchedOnly.length > 1 ? 'have' : 'has'} a pitcher but no catcher. `
          }

          if (caughtOnly.length > 0) {
            errorMsg += `Inning${caughtOnly.length > 1 ? 's' : ''} ${caughtOnly.join(', ')} ${caughtOnly.length > 1 ? 'have' : 'has'} a catcher but no pitcher.`
          }

          throw new Error(errorMsg.trim())
        }
      }

      // Validate home team
      validateTeamCoverage(homePlayers, homeTeam?.name || 'Home Team')

      // Validate away team
      validateTeamCoverage(awayPlayers, awayTeam?.name || 'Away Team')

      // All validation passed, go to confirmation step
      setStep(3)
    } catch (err) {
      setModalError(err.message)
      // Scroll to top to show error
      if (modalContentRef.current) {
        modalContentRef.current.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleFinalSubmit = async () => {
    setLoading(true)
    setModalError(null)

    try {
      // Combine home and away players
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
        away_score: parseInt(formData.away_score),
        notes: formData.notes || null
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
      const pitchersInGame = allPlayers.filter(p => p.innings_pitched.length > 0 && p.final_pitch_count)

      // For each pitcher, check if this game is their most recent pitching appearance
      const pitchingData = await Promise.all(pitchersInGame.map(async (p) => {
        const finalPitchCount = parseInt(p.final_pitch_count)
        const penultimateBatterCount = parseInt(p.penultimate_batter_count || 0)
        // Use penultimate_batter_count + 1 for eligibility calculation (per pitch count rules)
        const effectivePitchCount = penultimateBatterCount + 1

        // Find the player's most recent pitching game (excluding this game if editing)
        const { data: recentGames } = await supabase
          .from('pitching_logs')
          .select('game_id, games!inner(game_date)')
          .eq('player_id', p.id)
          .neq('game_id', finalGameId) // Exclude current game if editing
          .order('games(game_date)', { ascending: false })
          .limit(1)

        // Only set next_eligible_pitch_date if this game is the most recent (or player's first game)
        let nextEligiblePitchDate = null
        const thisGameDate = new Date(formData.game_date)

        if (!recentGames || recentGames.length === 0) {
          // This is player's first pitching game, so update eligibility
          const nextEligibleDate = calculateNextEligibleDate(
            formData.game_date,
            p.age,
            effectivePitchCount
          )
          nextEligiblePitchDate = nextEligibleDate ? nextEligibleDate.toISOString().split('T')[0] : null
        } else {
          // Compare dates - only update if this game is newer or equal
          const mostRecentGameDate = new Date(recentGames[0].games.game_date)
          if (thisGameDate >= mostRecentGameDate) {
            const nextEligibleDate = calculateNextEligibleDate(
              formData.game_date,
              p.age,
              effectivePitchCount
            )
            nextEligiblePitchDate = nextEligibleDate ? nextEligibleDate.toISOString().split('T')[0] : null
          }
        }

        return {
          game_id: finalGameId,
          player_id: p.id,
          final_pitch_count: finalPitchCount,
          penultimate_batter_count: penultimateBatterCount,
          next_eligible_pitch_date: nextEligiblePitchDate
        }
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
      // Scroll to top to show error
      if (modalContentRef.current) {
        modalContentRef.current.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } finally {
      setLoading(false)
    }
  }

  const toggleInning = useCallback((playerIndex, isHome, inningNum, type) => {
    const arrayKey = type === 'pitch' ? 'innings_pitched' : 'innings_caught'

    const updateFn = (players) => {
      const newPlayers = [...players]
      const player = { ...newPlayers[playerIndex] } // Clone the player object

      // Toggle the inning
      if (player[arrayKey].includes(inningNum)) {
        player[arrayKey] = player[arrayKey].filter(i => i !== inningNum)
      } else {
        player[arrayKey] = [...player[arrayKey], inningNum].sort((a, b) => a - b)
      }

      newPlayers[playerIndex] = player // Replace with new player object
      return newPlayers
    }

    if (isHome) {
      setHomePlayers(updateFn)
    } else {
      setAwayPlayers(updateFn)
    }
  }, [])

  // Helper function to check if innings are consecutive (for validation display)
  const hasInningsGap = (innings) => {
    if (innings.length <= 1) return false

    const sorted = [...innings].sort((a, b) => a - b)
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i + 1] - sorted[i] !== 1) {
        return true
      }
    }
    return false
  }

  // Helper function to get effective pitch count (penultimate + 1)
  const getEffectivePitchCount = (player) => {
    if (!player.penultimate_batter_count || player.penultimate_batter_count === '') {
      return 0
    }
    return parseInt(player.penultimate_batter_count) + 1
  }

  // Helper function to check Rule 2: 41+ pitches -> cannot catch AFTER pitching
  // Only show violation if player pitched 41+ AND catches AFTER pitching
  const cannotCatchDueToHighPitchCount = (player) => {
    const effectivePitches = getEffectivePitchCount(player)

    // Must have pitched 41+ and have catching innings
    if (effectivePitches < 41 || player.innings_caught.length === 0) {
      return false
    }

    // Must have pitched to violate this rule
    if (player.innings_pitched.length === 0) {
      return false
    }

    // Check if there are catching innings that occur AFTER pitching innings
    const maxPitchingInning = Math.max(...player.innings_pitched)
    const hasCaughtAfterPitching = player.innings_caught.some(inning => inning > maxPitchingInning)

    return hasCaughtAfterPitching
  }

  // Helper function to check Rule 3: 4+ innings catching -> cannot pitch AFTER catching
  // Only show violation if player caught 4+ innings AND pitches AFTER catching 4
  const cannotPitchDueToFourInningsCatching = (player) => {
    // Must have caught 4+ innings and have pitching innings
    if (player.innings_caught.length < 4 || player.innings_pitched.length === 0) {
      return false
    }

    // Find when they reached 4 innings caught (the 4th catching inning chronologically)
    const sortedCatchingInnings = [...player.innings_caught].sort((a, b) => a - b)
    const fourthCatchingInning = sortedCatchingInnings[3] // 0-indexed, so [3] is the 4th element

    // Check if any pitching innings occur after they reached 4 catches
    const hasPitchedAfterFourCatches = player.innings_pitched.some(inning => inning > fourthCatchingInning)

    return hasPitchedAfterFourCatches
  }

  // Helper function to check Rule 4: Catcher ≤3 innings + 21+ pitches -> cannot RETURN to catch
  // "A player who played catcher for three innings or less, moves to pitcher position,
  // and delivers 21 pitches or more, may not RETURN to the catcher position"
  // Must have: Catch (1-3) THEN Pitch (21+) THEN Return to Catch
  const cannotCatchAgainDueToCombined = (player) => {
    const caughtInnings = player.innings_caught.length
    const pitchedInnings = player.innings_pitched
    const effectivePitches = getEffectivePitchCount(player)

    // Rule only applies if caught 1-3 innings and pitched 21+
    if (caughtInnings < 1 || caughtInnings > 3 || effectivePitches < 21) {
      return false
    }

    // Must have pitched to violate "return to catch"
    if (pitchedInnings.length === 0) {
      return false
    }

    const minPitchingInning = Math.min(...pitchedInnings)
    const maxPitchingInning = Math.max(...pitchedInnings)

    // Check if there are catching innings BEFORE pitching started
    const hasCaughtBeforePitching = player.innings_caught.some(inning => inning < minPitchingInning)

    // Check if there are catching innings AFTER pitching ended
    const hasReturnedToCatch = player.innings_caught.some(inning => inning > maxPitchingInning)

    // Violation only if they caught BEFORE pitching AND AFTER pitching (the "return")
    return hasCaughtBeforePitching && hasReturnedToCatch
  }

  // Helper function to get max allowed pitches for a player's age
  const getMaxPitchesForAge = (age) => {
    const rule = PITCH_SMART_RULES.find(
      r => age >= r.ageMin && age <= r.ageMax
    )
    return rule ? rule.maxPitchesPerGame : null
  }

  // Helper function to check Rule 5: Pitch count exceeds age limit
  const exceedsMaxPitchesForAge = (player) => {
    const effectivePitches = getEffectivePitchCount(player)
    const age = player.age

    if (!age) return false
    const maxPitches = getMaxPitchesForAge(age)
    if (!maxPitches) return false

    return effectivePitches > maxPitches
  }

  const updatePlayerField = useCallback((playerIndex, isHome, field, value) => {
    const updateFn = (players) => {
      const newPlayers = [...players]
      const player = { ...newPlayers[playerIndex] } // Clone the player object
      player[field] = value
      newPlayers[playerIndex] = player // Replace with new player object
      return newPlayers
    }

    if (isHome) {
      setHomePlayers(updateFn)
    } else {
      setAwayPlayers(updateFn)
    }
  }, [])

  if (step === 1) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
        <div ref={modalContentRef} className="bg-white rounded-lg px-6 pt-6 max-w-2xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
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
              <label className="label">
                {isEditMode ? 'Division' : 'Select Division *'}
              </label>
              <select
                className="input disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                disabled={isEditMode}
              >
                <option value="">-- Select Division --</option>
                <option value="Training">Training</option>
                <option value="Minor">Minor</option>
                <option value="Major">Major</option>
              </select>
              {isEditMode && (
                <p className="text-sm text-gray-600 mt-2">Division cannot be changed when editing</p>
              )}
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

            <div className="border-t pt-4">
              <label className="label">Game Notes (Optional)</label>
              <textarea
                className="input"
                rows="3"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any notes about this game that people in the league need to know..."
              />
              <p className="text-sm text-gray-500 mt-1">
                These notes will be visible in game details and reports
              </p>
            </div>

            <div className="flex gap-2 pt-4 pb-6 border-t sticky bottom-0 bg-white">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
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
  if (step === 2) {
    const homeTeam = teams.find(t => t.id === formData.home_team_id)
    const awayTeam = teams.find(t => t.id === formData.away_team_id)

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
        <div ref={modalContentRef} className="bg-white rounded-lg px-6 pt-6 max-w-6xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
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

            <div className="flex gap-2 pt-4 pb-6 border-t sticky bottom-0 bg-white">
              <button
                type="button"
                onClick={() => {
                  setModalError(null)
                  setStep(1)
                }}
                className="btn btn-secondary"
              >
                ← Back
              </button>
              <button
                type="submit"
                className="btn btn-primary flex-1"
                disabled={loading}
              >
                {loading ? 'Validating...' : 'Next: Review & Confirm →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // Step 3: Confirmation
  if (step === 3) {
    const homeTeam = teams.find(t => t.id === formData.home_team_id)
    const awayTeam = teams.find(t => t.id === formData.away_team_id)

    // Filter players to show only those who pitched/caught or were absent
    const homePitchersAndCatchers = homePlayers.filter(p =>
      p.was_present && (p.innings_pitched.length > 0 || p.innings_caught.length > 0)
    )
    const awayPitchersAndCatchers = awayPlayers.filter(p =>
      p.was_present && (p.innings_pitched.length > 0 || p.innings_caught.length > 0)
    )
    const homeAbsent = homePlayers.filter(p => !p.was_present)
    const awayAbsent = awayPlayers.filter(p => !p.was_present)

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
        <div ref={modalContentRef} className="bg-white rounded-lg px-6 pt-6 max-w-5xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
          <h3 className="text-xl font-bold mb-4">
            {isEditMode ? 'Edit Game - Step 3: Review & Confirm' : 'Enter New Game - Step 3: Review & Confirm'}
          </h3>

          {modalError && (
            <div className="alert alert-error mb-4">
              {modalError}
            </div>
          )}

          <div className="space-y-6">
            {/* Game Summary */}
            <div className="card bg-blue-50 border border-blue-200">
              <h4 className="font-bold text-lg mb-3">Game Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <span className="font-semibold">Date:</span> {formatGameDate(formData.game_date)}
                </div>
                <div>
                  <span className="font-semibold">Division:</span> {homeTeam?.division}
                </div>
                <div className="col-span-2">
                  <span className="font-semibold">Scorekeeper:</span> {formData.scorekeeper_name}
                </div>
                {formData.notes && (
                  <div className="col-span-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <span className="font-semibold">Notes:</span> {formData.notes}
                  </div>
                )}
              </div>

              {/* Score Table */}
              <div className="border border-gray-300 rounded overflow-hidden max-w-fit">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-2 text-left font-semibold">Team</th>
                      <th className="px-4 py-2 text-center font-semibold">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-gray-300 bg-white">
                      <td className="px-4 py-2">{homeTeam?.name} (Home)</td>
                      <td className="px-4 py-2 text-center font-bold text-lg">{formData.home_score}</td>
                    </tr>
                    <tr className="border-t border-gray-300 bg-white">
                      <td className="px-4 py-2">{awayTeam?.name} (Visitor)</td>
                      <td className="px-4 py-2 text-center font-bold text-lg">{formData.away_score}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Home Team Players */}
            <ConfirmationTeamSection
              teamName={homeTeam?.name}
              pitchersAndCatchers={homePitchersAndCatchers}
              absentPlayers={homeAbsent}
              hasInningsGap={hasInningsGap}
              cannotCatchDueToHighPitchCount={cannotCatchDueToHighPitchCount}
              cannotPitchDueToFourInningsCatching={cannotPitchDueToFourInningsCatching}
              cannotCatchAgainDueToCombined={cannotCatchAgainDueToCombined}
              getEffectivePitchCount={getEffectivePitchCount}
              exceedsMaxPitchesForAge={exceedsMaxPitchesForAge}
              getMaxPitchesForAge={getMaxPitchesForAge}
            />

            {/* Away Team Players */}
            <ConfirmationTeamSection
              teamName={awayTeam?.name}
              pitchersAndCatchers={awayPitchersAndCatchers}
              absentPlayers={awayAbsent}
              hasInningsGap={hasInningsGap}
              cannotCatchDueToHighPitchCount={cannotCatchDueToHighPitchCount}
              cannotPitchDueToFourInningsCatching={cannotPitchDueToFourInningsCatching}
              cannotCatchAgainDueToCombined={cannotCatchAgainDueToCombined}
              getEffectivePitchCount={getEffectivePitchCount}
              exceedsMaxPitchesForAge={exceedsMaxPitchesForAge}
              getMaxPitchesForAge={getMaxPitchesForAge}
            />
          </div>

          <div className="flex gap-2 pt-6 pb-6 border-t sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={() => {
                setModalError(null)
                setStep(2)
              }}
              className="btn btn-secondary"
            >
              ← Back to Edit
            </button>
            <button
              type="button"
              onClick={handleFinalSubmit}
              className="btn btn-primary flex-1"
              disabled={loading}
            >
              {loading ? 'Saving Game...' : (isEditMode ? 'Confirm & Update Game' : 'Confirm & Save Game')}
            </button>
          </div>
        </div>
      </div>
    )
  }
}

// Memoized PlayerRow component to prevent unnecessary re-renders
const PlayerRow = memo(function PlayerRow({
  player,
  index,
  isHome,
  onToggleInning,
  onUpdateField
}) {
  const innings = [1, 2, 3, 4, 5, 6, 7]

  return (
    <div className="border rounded p-4 bg-gray-50">
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
          {/* Innings Pitched and Caught - Side by Side */}
          <div className="grid grid-cols-2 gap-4">
            {/* Innings Pitched */}
            <div className="bg-blue-50 p-3 rounded border border-blue-200">
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

            {/* Innings Caught */}
            <div className="bg-green-50 p-3 rounded border border-green-200">
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

          {/* Pitch Counts (only if pitched) */}
          {player.innings_pitched.length > 0 && (
            <div className="bg-blue-50 p-3 rounded border border-blue-200">
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
                    value={player.penultimate_batter_count}
                    onChange={(e) => onUpdateField(index, isHome, 'penultimate_batter_count', e.target.value)}
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
            </div>
          )}
        </div>
      )}
    </div>
  )
})

function TeamPlayerDataSection({
  team,
  players,
  isHome,
  onToggleInning,
  onUpdateField
}) {
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
            <PlayerRow
              key={player.id}
              player={player}
              index={index}
              isHome={isHome}
              onToggleInning={onToggleInning}
              onUpdateField={onUpdateField}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ConfirmationTeamSection({
  teamName,
  pitchersAndCatchers,
  absentPlayers,
  hasInningsGap,
  cannotCatchDueToHighPitchCount,
  cannotPitchDueToFourInningsCatching,
  cannotCatchAgainDueToCombined,
  getEffectivePitchCount,
  exceedsMaxPitchesForAge,
  getMaxPitchesForAge
}) {
  return (
    <div className="card border border-gray-300">
      <h4 className="font-bold text-lg mb-4 bg-gray-100 -m-4 p-3 rounded-t-lg border-b">
        {teamName}
      </h4>

      {/* Pitchers and Catchers */}
      {pitchersAndCatchers.length > 0 && (
        <div className="mt-4">
          <h5 className="font-semibold mb-3 text-blue-700">Pitchers & Catchers ({pitchersAndCatchers.length})</h5>
          <div className="space-y-3">
            {pitchersAndCatchers.map(player => {
              const pitchedInnings = player.innings_pitched
              const caughtInnings = player.innings_caught
              const effectivePitches = getEffectivePitchCount(player)

              // Check for violations
              const hasPitchingGap = hasInningsGap(pitchedInnings)
              const violationHighPitchCount = cannotCatchDueToHighPitchCount(player)
              const violationFourInningsCatching = cannotPitchDueToFourInningsCatching(player)
              const violationCombinedRule = cannotCatchAgainDueToCombined(player)
              const violationExceedsPitchLimit = exceedsMaxPitchesForAge(player)
              const hasViolation = hasPitchingGap || violationHighPitchCount || violationFourInningsCatching || violationCombinedRule || violationExceedsPitchLimit

              return (
                <div key={player.id} className={`border rounded p-3 ${hasViolation ? 'bg-red-50 border-red-300' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <h6 className="font-semibold">{player.name}</h6>
                    <span className="text-sm text-gray-600">Age: {player.age}</span>
                    {player.jersey_number && (
                      <span className="text-sm text-gray-600">#{player.jersey_number}</span>
                    )}
                    {hasViolation && (
                      <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded font-semibold">
                        ⚠️ VIOLATION
                      </span>
                    )}
                  </div>

                  {/* Innings Visual Display */}
                  {(pitchedInnings.length > 0 || caughtInnings.length > 0) && (() => {
                    // Determine maximum inning from both pitched and caught, with a minimum of 6
                    const maxInning = Math.max(
                      6, // Minimum 6 innings
                      pitchedInnings.length > 0 ? Math.max(...pitchedInnings) : 0,
                      caughtInnings.length > 0 ? Math.max(...caughtInnings) : 0
                    )
                    const innings = Array.from({ length: maxInning }, (_, i) => i + 1)

                    return (
                      <div className="mt-2 flex flex-wrap gap-6 text-sm items-center">
                        {/* Pitching */}
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-700">Pitching</span>
                          <div className="flex gap-1">
                            {innings.map(inning => (
                              <div key={`pitch-${inning}`} className="flex flex-col items-center">
                                <span className="text-xs text-gray-400 mb-0.5">{inning}</span>
                                <div
                                  className={`w-5 h-5 rounded-full border-2 ${
                                    pitchedInnings.includes(inning)
                                      ? 'bg-blue-500 border-blue-600'
                                      : 'bg-white border-gray-300'
                                  }`}
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Catching */}
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-700">Catching</span>
                          <div className="flex gap-1">
                            {innings.map(inning => (
                              <div key={`catch-${inning}`} className="flex flex-col items-center">
                                <span className="text-xs text-gray-400 mb-0.5">{inning}</span>
                                <div
                                  className={`w-5 h-5 rounded-full border-2 ${
                                    caughtInnings.includes(inning)
                                      ? 'bg-green-500 border-green-600'
                                      : 'bg-white border-gray-300'
                                  }`}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Pitch Count Info */}
                  {player.final_pitch_count && (
                    <div className="mt-2 text-xs text-gray-600">
                      Final: {player.final_pitch_count} pitches
                      {player.penultimate_batter_count > 0 && (
                        <span> (Before last batter: {player.penultimate_batter_count})</span>
                      )}
                    </div>
                  )}

                  {/* Violation Messages */}
                  {hasPitchingGap && (
                    <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-800">
                      ⚠️ Violation: Pitcher cannot return after being taken out. Innings must be consecutive.
                    </div>
                  )}
                  {violationHighPitchCount && (
                    <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-800">
                      ⚠️ Violation: Threw {effectivePitches} pitches (41+) and cannot catch for the remainder of this game.
                    </div>
                  )}
                  {violationFourInningsCatching && (
                    <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-800">
                      ⚠️ Violation: Caught {caughtInnings.length} innings and cannot pitch in this game.
                    </div>
                  )}
                  {violationCombinedRule && (
                    <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-800">
                      ⚠️ Violation: Caught 1-3 innings and threw {effectivePitches} pitches (21+). Cannot catch again in this game.
                    </div>
                  )}
                  {violationExceedsPitchLimit && (
                    <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-800">
                      ⚠️ Violation: Threw {effectivePitches} pitches, exceeding the maximum of {getMaxPitchesForAge(player.age)} for age {player.age}.
                    </div>
                  )}
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
            {absentPlayers.map(player => (
              <div key={player.id} className="bg-red-50 border border-red-200 rounded p-2 text-sm">
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{player.name}</span>
                  <span className="text-xs text-gray-600">Age: {player.age}</span>
                  {player.jersey_number && (
                    <span className="text-xs text-gray-600">#{player.jersey_number}</span>
                  )}
                </div>
                {player.absence_note && (
                  <div className="text-xs text-gray-600 mt-1">
                    Reason: {player.absence_note}
                  </div>
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
