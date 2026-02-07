import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useCoachAssignments } from '../../lib/useCoachAssignments'
import PlayerModal from './PlayerModal'
import BulkAddModal from './BulkAddModal'
import PlayerDeleteConfirmationModal from '../common/PlayerDeleteConfirmationModal'

export default function PlayerManagement({ profile, isAdmin }) {
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
  const [deletingPlayer, setDeletingPlayer] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Fetch coach assignments for filtering
  const coachData = useCoachAssignments(profile)

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
        .order('division')
        .order('name')

      if (error) throw error

      // Filter teams by coach's divisions
      const filteredTeams = coachData.filterTeamsByCoachDivisions(data)
      setTeams(filteredTeams)

      // Auto-select first team in the selected division
      const divisionTeams = filteredTeams.filter(t => t.division === selectedDivision)
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
      setDeletingPlayer(null)
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

  // Show empty state for coaches with no assignments
  if (coachData.isEmpty && !coachData.loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6">🧢 Player Management</h2>
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
        <p className="text-gray-600 mb-4">No teams found for this season. Create a team first!</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold">🧢 Player Management</h2>
        {isAdmin && (
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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
            {!isAdmin ? (
              coachData.divisions.map((division) => (
                <option key={division} value={division}>{division}</option>
              ))
            ) : (
              <>
                <option value="Training">Training</option>
                <option value="Minor">Minor</option>
                <option value="Major">Major</option>
              </>
            )}
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
          <p className="text-gray-600 mb-4">No players yet on this team.{isAdmin && ' Add your first player!'}</p>
          {isAdmin && (
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
                  {isAdmin && (
                    <th className="text-left py-3 px-4">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {players.map((player) => (
                  <tr key={player.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{player.jersey_number || '-'}</td>
                    <td className="py-3 px-4">{player.name}</td>
                    <td className="py-3 px-4">{player.age}</td>
                    {isAdmin && (
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingPlayer(player)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeletingPlayer(player)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isAdmin && showAddModal && (
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

      {isAdmin && editingPlayer && (
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

      {isAdmin && showBulkModal && (
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

      {isAdmin && deletingPlayer && (
        <PlayerDeleteConfirmationModal
          playerName={deletingPlayer.name}
          onConfirm={() => handleDelete(deletingPlayer.id)}
          onClose={() => setDeletingPlayer(null)}
        />
      )}
    </div>
  )
}