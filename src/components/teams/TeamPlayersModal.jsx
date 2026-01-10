import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { getPitchingDisplayData, parseLocalDate } from '../../lib/pitchCountUtils'
import PlayerDeleteConfirmationModal from '../common/PlayerDeleteConfirmationModal'

/**
 * Merges player data with their most recent pitching log
 * @param {Array} players - Array of player objects
 * @param {Array} pitchingLogs - Array of pitching log objects with game data
 * @returns {Array} - Players with enriched pitching data
 */
function enrichPlayersWithPitchingData(players, pitchingLogs) {
  // Create map of player_id -> most recent pitching log
  const pitchingMap = new Map()

  pitchingLogs.forEach(log => {
    const existing = pitchingMap.get(log.player_id)
    // Keep only the most recent by comparing game dates
    if (!existing || (log.game?.game_date > existing.game?.game_date)) {
      pitchingMap.set(log.player_id, log)
    }
  })

  // Enrich each player with their pitching data
  return players.map(player => ({
    ...player,
    lastPitchingLog: pitchingMap.get(player.id) || null
  }))
}

export default function TeamPlayersModal({ team, isCoach, onClose }) {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState(null)
  const [deletingPlayer, setDeletingPlayer] = useState(null)

  useEffect(() => {
    fetchPlayers()
  }, [team.id])

  const fetchPlayers = async () => {
    try {
      // Step 1: Fetch all players
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', team.id)
        .order('jersey_number')

      if (playersError) throw playersError

      // Step 2: Fetch pitching data for these players (completed games only)
      // Get today's date in YYYY-MM-DD format (e.g., "2026-01-09") for filtering completed games
      const today = new Date().toISOString().split('T')[0]
      const playerIds = playersData.map(p => p.id)

      let pitchingData = []
      if (playerIds.length > 0) {
        const { data: pitchingLogs, error: pitchingError } = await supabase
          .from('pitching_logs')
          .select(`
            player_id,
            penultimate_batter_count,
            final_pitch_count,
            next_eligible_pitch_date,
            game:games!inner(game_date)
          `)
          .in('player_id', playerIds)
          .lte('games.game_date', today)

        if (pitchingError) throw pitchingError
        pitchingData = pitchingLogs || []
      }

      // Step 3: Merge the data
      const enrichedPlayers = enrichPlayersWithPitchingData(playersData, pitchingData)
      setPlayers(enrichedPlayers)

    } catch (err) {
      setError('Failed to load players: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (playerId) => {
    try {
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', playerId)

      if (error) {
        if (error.code === '23503') {
          throw new Error('Cannot delete player: game records exist for this player.')
        }
        throw error
      }

      setSuccess('Player deleted successfully!')
      setDeletingPlayer(null)
      fetchPlayers()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message)
      setTimeout(() => setError(null), 5000)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-2xl font-bold">{team.name} - Players</h3>
              <p className="text-gray-600 mt-1">{team.division} Division</p>
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

          {success && (
            <div className="alert alert-success mb-4">
              {success}
            </div>
          )}

          {!isCoach && (
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="btn btn-primary"
              >
                + Add Player
              </button>
              <button
                onClick={() => setShowBulkModal(true)}
                className="btn btn-secondary"
              >
                📋 Bulk Add (CSV)
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading players...</p>
            </div>
          ) : players.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-600 mb-4">No players on this team yet.</p>
              {!isCoach && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="btn btn-primary"
                >
                  Add First Player
                </button>
              )}
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Jersey #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Age
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Last Date Pitched
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Official Pitch Count
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Next Eligible Date
                    </th>
                    {!isCoach && (
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {players.map((player) => {
                    const pitchingDisplay = getPitchingDisplayData(player.lastPitchingLog)
                    // Check if player is ineligible to pitch today ( new Date() )
                    // Example: If next_eligible_pitch_date is "2025-01-15"
                    //   - On Jan 14 at 3:00 PM: parseLocalDate creates "Jan 15 00:00:00" > "Jan 14 15:00:00" = true (ineligible)
                    //   - On Jan 15 at 8:00 AM: parseLocalDate creates "Jan 15 00:00:00" > "Jan 15 08:00:00" = false (eligible)
                    const isCurrentlyIneligible = player.lastPitchingLog?.next_eligible_pitch_date
                      && parseLocalDate(player.lastPitchingLog.next_eligible_pitch_date) > new Date()

                    return (
                      <tr key={player.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                          {player.jersey_number || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {player.name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {player.age}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {pitchingDisplay.lastDate}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {pitchingDisplay.officialCount}
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap text-sm ${
                          isCurrentlyIneligible ? 'text-red-600 font-semibold' : 'text-gray-600'
                        }`}>
                          {pitchingDisplay.nextEligibleDate}
                        </td>
                        {!isCoach && (
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                            <>
                              <button
                                onClick={() => setEditingPlayer(player)}
                                className="text-blue-600 hover:text-blue-800 mr-3"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setDeletingPlayer(player)}
                                className="text-red-600 hover:text-red-800"
                              >
                                Delete
                              </button>
                            </>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 flex justify-between items-center text-sm text-gray-600">
            <p>{players.length} player{players.length !== 1 ? 's' : ''} on roster</p>
            <button
              onClick={onClose}
              className="btn btn-secondary"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {!isCoach && showAddModal && (
        <PlayerFormModal
          teamId={team.id}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            fetchPlayers()
            setSuccess('Player added successfully!')
            setTimeout(() => setSuccess(null), 3000)
          }}
          onError={(err) => {
            setError(err)
            setTimeout(() => setError(null), 5000)
          }}
        />
      )}

      {!isCoach && editingPlayer && (
        <PlayerFormModal
          teamId={team.id}
          player={editingPlayer}
          onClose={() => setEditingPlayer(null)}
          onSuccess={() => {
            setEditingPlayer(null)
            fetchPlayers()
            setSuccess('Player updated successfully!')
            setTimeout(() => setSuccess(null), 3000)
          }}
          onError={(err) => {
            setError(err)
            setTimeout(() => setError(null), 5000)
          }}
        />
      )}

      {!isCoach && showBulkModal && (
        <BulkAddModal
          teamId={team.id}
          onClose={() => setShowBulkModal(false)}
          onSuccess={(count) => {
            setShowBulkModal(false)
            fetchPlayers()
            setSuccess(`${count} player${count !== 1 ? 's' : ''} added successfully!`)
            setTimeout(() => setSuccess(null), 3000)
          }}
          onError={(err) => {
            setError(err)
            setTimeout(() => setError(null), 5000)
          }}
        />
      )}

      {!isCoach && deletingPlayer && (
        <PlayerDeleteConfirmationModal
          playerName={deletingPlayer.name}
          onConfirm={() => handleDelete(deletingPlayer.id)}
          onClose={() => setDeletingPlayer(null)}
        />
      )}
    </div>
  )
}

function PlayerFormModal({ teamId, player, onClose, onSuccess, onError }) {
  const isEditMode = !!player
  const [formData, setFormData] = useState({
    name: player?.name || '',
    age: player?.age || '',
    jersey_number: player?.jersey_number || ''
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (isEditMode) {
        const { error } = await supabase
          .from('players')
          .update({
            name: formData.name,
            age: parseInt(formData.age),
            jersey_number: formData.jersey_number || null
          })
          .eq('id', player.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('players')
          .insert([{
            team_id: teamId,
            name: formData.name,
            age: parseInt(formData.age),
            jersey_number: formData.jersey_number || null
          }])

        if (error) throw error
      }

      onSuccess()
    } catch (err) {
      if (err.code === '23505') {
        onError('Jersey number already exists on this team.')
      } else {
        onError(err.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-xl font-bold mb-4">
          {isEditMode ? 'Edit Player' : 'Add Player'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Name *</label>
            <input
              type="text"
              className="input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label">Age *</label>
            <input
              type="number"
              min="7"
              max="22"
              className="input"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label">Jersey Number (optional)</label>
            <input
              type="text"
              className="input"
              placeholder="e.g., 12"
              value={formData.jersey_number}
              onChange={(e) => setFormData({ ...formData, jersey_number: e.target.value })}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : isEditMode ? 'Update' : 'Add Player'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function BulkAddModal({ teamId, onClose, onSuccess, onError }) {
  const [csvData, setCsvData] = useState('')
  const [loading, setLoading] = useState(false)
  const [modalError, setModalError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setModalError(null)

    try {
      const lines = csvData.trim().split('\n')
      const players = []

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const parts = line.split(',').map(p => p.trim())

        if (parts.length < 2) {
          throw new Error('Line ' + (i + 1) + ': Invalid format. Expected: Name, Age, Jersey# (optional)')
        }

        const [name, age, jersey] = parts

        if (!name) {
          throw new Error('Line ' + (i + 1) + ': Name is required')
        }

        const ageNum = parseInt(age)
        if (isNaN(ageNum) || ageNum < 7 || ageNum > 22) {
          throw new Error('Line ' + (i + 1) + ': Age must be between 7 and 22')
        }

        players.push({
          name,
          age: ageNum,
          jersey_number: jersey || null,
          team_id: teamId
        })
      }

      if (players.length === 0) {
        throw new Error('No valid players found in CSV data')
      }

      const { error } = await supabase
        .from('players')
        .insert(players)

      if (error) {
        if (error.code === '23505') {
          throw new Error('One or more jersey numbers already exist on this team')
        }
        throw error
      }

      onSuccess(players.length)
    } catch (err) {
      setModalError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <h3 className="text-xl font-bold mb-4">Bulk Add Players (CSV)</h3>

        {modalError && (
          <div className="alert alert-error mb-4">
            {modalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">CSV Data</label>
            <textarea
              className="input h-64 font-mono text-sm"
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              required
              placeholder="Name, Age, Jersey# (optional)&#10;John Smith, 12, 5&#10;Jane Doe, 11, 7&#10;Bob Johnson, 13"
            />
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
              <p><strong>Format:</strong> Name, Age, Jersey# (optional)</p>
              <p className="mt-1"><strong>Example:</strong></p>
              <pre className="mt-1 text-xs bg-white p-2 rounded border">John Smith, 12, 5
Jane Doe, 11, 7
Bob Johnson, 13</pre>
              <p className="mt-2 text-xs text-gray-600">
                • One player per line<br />
                • Age must be 7-22<br />
                • Jersey numbers must be unique on this team<br />
                • Jersey number is optional (leave blank for no jersey)
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Players'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
