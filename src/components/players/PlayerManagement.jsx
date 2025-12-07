import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function PlayerManagement() {
  const [seasons, setSeasons] = useState([])
  const [teams, setTeams] = useState([])
  const [selectedSeason, setSelectedSeason] = useState(null)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    fetchSeasons()
  }, [])

  useEffect(() => {
    if (selectedSeason) {
      fetchTeams()
    }
  }, [selectedSeason])

  useEffect(() => {
    if (selectedTeam) {
      fetchPlayers()
    }
  }, [selectedTeam])

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
        .order('division')
        .order('name')

      if (error) throw error
      setTeams(data)
      
      if (data.length > 0 && !selectedTeam) {
        setSelectedTeam(data[0].id)
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', selectedTeam)
        .order('jersey_number')

      if (error) throw error
      setPlayers(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (playerId) => {
    if (!confirm('Are you sure you want to delete this player?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', playerId)

      if (error) {
        if (error.code === '23503') {
          throw new Error('Cannot delete player: game records are still associated with this player.')
        }
        throw error
      }

      setSuccess('Player deleted successfully!')
      fetchPlayers()
      setTimeout(() => setSuccess(null), 3000)
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
        <p className="text-gray-600 mb-4">No seasons found. Create a season first!</p>
      </div>
    )
  }

  if (teams.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-600 mb-4">No teams found for this season. Create a team first!</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Player Management</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBulkModal(true)}
            className="btn btn-secondary"
          >
            📋 Bulk Add (CSV)
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
          >
            + Add Player
          </button>
        </div>
      </div>

      {/* Season & Team Selectors */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="label">Select Season</label>
          <select
            className="input"
            value={selectedSeason || ''}
            onChange={(e) => {
              setSelectedSeason(e.target.value)
              setSelectedTeam(null)
            }}
          >
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name} {season.is_active ? '(Active)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Select Team</label>
          <select
            className="input"
            value={selectedTeam || ''}
            onChange={(e) => setSelectedTeam(e.target.value)}
          >
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name} ({team.division})
              </option>
            ))}
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

      {players.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-600 mb-4">No players yet on this team. Add your first player!</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
          >
            Add First Player
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4">Jersey #</th>
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-left py-3 px-4">Age</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player) => (
                  <tr key={player.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{player.jersey_number || '-'}</td>
                    <td className="py-3 px-4">{player.name}</td>
                    <td className="py-3 px-4">{player.age}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingPlayer(player)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(player.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddModal && (
        <PlayerModal
          teamId={selectedTeam}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            fetchPlayers()
            setSuccess('Player added successfully!')
            setTimeout(() => setSuccess(null), 3000)
          }}
          onError={(err) => setError(err)}
        />
      )}

      {editingPlayer && (
        <PlayerModal
          player={editingPlayer}
          teamId={selectedTeam}
          onClose={() => setEditingPlayer(null)}
          onSuccess={() => {
            setEditingPlayer(null)
            fetchPlayers()
            setSuccess('Player updated successfully!')
            setTimeout(() => setSuccess(null), 3000)
          }}
          onError={(err) => setError(err)}
        />
      )}

      {showBulkModal && (
        <BulkAddModal
          teamId={selectedTeam}
          onClose={() => setShowBulkModal(false)}
          onSuccess={(count) => {
            setShowBulkModal(false)
            fetchPlayers()
            setSuccess(`${count} players added successfully!`)
            setTimeout(() => setSuccess(null), 3000)
          }}
          onError={(err) => setError(err)}
        />
      )}
    </div>
  )
}

function PlayerModal({ player, teamId, onClose, onSuccess, onError }) {
  const [formData, setFormData] = useState({
    name: player?.name || '',
    age: player?.age || '',
    jersey_number: player?.jersey_number || ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const playerData = {
        name: formData.name,
        age: parseInt(formData.age),
        jersey_number: formData.jersey_number || null,
        team_id: teamId
      }

      if (player) {
        // Update existing player
        const { error } = await supabase
          .from('players')
          .update(playerData)
          .eq('id', player.id)

        if (error) throw error
      } else {
        // Create new player
        const { error } = await supabase
          .from('players')
          .insert([playerData])

        if (error) {
          if (error.code === '23505') {
            throw new Error('Jersey number already exists on this team')
          }
          throw error
        }
      }

      onSuccess()
    } catch (err) {
      onError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold mb-4">
          {player ? 'Edit Player' : 'Add New Player'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Player Name *</label>
            <input
              type="text"
              className="input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., John Smith"
            />
          </div>

          <div>
            <label className="label">Age *</label>
            <input
              type="number"
              className="input"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
              required
              min="7"
              max="22"
              placeholder="7-22"
            />
          </div>

          <div>
            <label className="label">Jersey Number (Optional)</label>
            <input
              type="text"
              className="input"
              value={formData.jersey_number}
              onChange={(e) => setFormData({ ...formData, jersey_number: e.target.value })}
              placeholder="e.g., 12"
            />
            <p className="text-xs text-gray-500 mt-1">
              Must be unique on this team
            </p>
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
              {loading ? (player ? 'Updating...' : 'Adding...') : (player ? 'Update Player' : 'Add Player')}
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Parse CSV data
      const lines = csvData.trim().split('\n')
      const players = []

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const parts = line.split(',').map(p => p.trim())
        
        if (parts.length < 2) {
          throw new Error(`Line ${i + 1}: Invalid format. Expected: Name, Age, Jersey# (optional)`)
        }

        const [name, age, jersey] = parts
        
        if (!name) {
          throw new Error(`Line ${i + 1}: Name is required`)
        }

        const ageNum = parseInt(age)
        if (isNaN(ageNum) || ageNum < 7 || ageNum > 22) {
          throw new Error(`Line ${i + 1}: Age must be between 7 and 22`)
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

      // Insert all players
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
      onError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <h3 className="text-xl font-bold mb-4">Bulk Add Players (CSV)</h3>
        
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
              <strong>Format:</strong> Name, Age, Jersey# (optional)
              <br />
              <strong>Example:</strong>
              <pre className="mt-1 text-xs">
John Smith, 12, 5{'\n'}Jane Doe, 11, 7{'\n'}Bob Johnson, 13
              </pre>
              <p className="mt-2 text-xs text-gray-600">
                • One player per line<br />
                • Age must be 7-22<br />
                • Jersey numbers must be unique on this team<br />
                • Jersey number is optional (leave blank or omit)
              </p>
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
              {loading ? 'Adding Players...' : 'Add Players'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}