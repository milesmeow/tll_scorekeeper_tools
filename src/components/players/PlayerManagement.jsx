import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import PlayerModal from './PlayerModal'
import BulkAddModal from './BulkAddModal'

export default function PlayerManagement({ profile }) {
  const [seasons, setSeasons] = useState([])
  const [teams, setTeams] = useState([])
  const [selectedSeason, setSelectedSeason] = useState(null)
  const [selectedDivision, setSelectedDivision] = useState('Major')
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const isCoach = profile?.role === 'coach'

  useEffect(() => {
    fetchSeasons()
  }, [])

  useEffect(() => {
    if (selectedSeason) {
      fetchTeams()
    }
  }, [selectedSeason])

  useEffect(() => {
    if (selectedSeason && teams.length > 0) {
      const divisionTeams = teams.filter(t => t.division === selectedDivision)
      if (divisionTeams.length > 0) {
        setSelectedTeam(divisionTeams[0].id)
      } else {
        setSelectedTeam(null)
      }
    }
  }, [selectedDivision])

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

      // Auto-select first team in the selected division
      const divisionTeams = data.filter(t => t.division === selectedDivision)
      if (divisionTeams.length > 0 && !selectedTeam) {
        setSelectedTeam(divisionTeams[0].id)
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
        <h2 className="text-2xl font-bold">🧢 Player Management</h2>
        {!isCoach && (
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
        )}
      </div>

      {/* Season, Division & Team Selectors */}
      <div className="grid grid-cols-3 gap-4 mb-6">
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
          <label className="label">Filter by Division</label>
          <select
            className="input"
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value)}
          >
            <option value="Training">Training</option>
            <option value="Minor">Minor</option>
            <option value="Major">Major</option>
          </select>
        </div>

        <div>
          <label className="label">Select Team</label>
          <select
            className="input"
            value={selectedTeam || ''}
            onChange={(e) => setSelectedTeam(e.target.value)}
          >
            {teams
              .filter(team => team.division === selectedDivision)
              .map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
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
          <p className="text-gray-600 mb-4">No players yet on this team.{!isCoach && ' Add your first player!'}</p>
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
                      {!isCoach && (
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
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isCoach && showAddModal && (
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

      {!isCoach && editingPlayer && (
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

      {!isCoach && showBulkModal && (
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