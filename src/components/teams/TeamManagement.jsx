import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function TeamManagement() {
  const [seasons, setSeasons] = useState([])
  const [selectedSeason, setSelectedSeason] = useState(null)
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTeam, setEditingTeam] = useState(null)
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

  const fetchSeasons = async () => {
    try {
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .order('is_active', { ascending: false })
        .order('start_date', { ascending: false })

      if (error) throw error
      setSeasons(data)
      
      // Auto-select active season or first season
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
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (teamId) => {
    if (!confirm('Are you sure you want to delete this team? This will only work if there are no players or games associated with it.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId)

      if (error) {
        if (error.code === '23503') {
          throw new Error('Cannot delete team: players or games are still associated with it. Delete those first.')
        }
        throw error
      }

      setSuccess('Team deleted successfully!')
      fetchTeams()
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

  // Group teams by division
  const teamsByDivision = {
    'Training': teams.filter(t => t.division === 'Training'),
    'Minor': teams.filter(t => t.division === 'Minor'),
    'Major': teams.filter(t => t.division === 'Major')
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Team Management</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
        >
          + Create Team
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

      {teams.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-600 mb-4">No teams yet for this season. Create your first team!</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
          >
            Create First Team
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(teamsByDivision).map(([division, divTeams]) => (
            divTeams.length > 0 && (
              <div key={division}>
                <h3 className="text-lg font-semibold mb-3 text-gray-700">{division} Division</h3>
                <div className="card">
                  <div className="space-y-3">
                    {divTeams.map((team) => (
                      <div
                        key={team.id}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div>
                          <h4 className="font-medium">{team.name}</h4>
                          <p className="text-sm text-gray-500">{team.division}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingTeam(team)}
                            className="text-blue-600 hover:text-blue-800 px-3 py-1"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(team.id)}
                            className="text-red-600 hover:text-red-800 px-3 py-1"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {showAddModal && (
        <TeamModal
          seasonId={selectedSeason}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            fetchTeams()
            setSuccess('Team created successfully!')
            setTimeout(() => setSuccess(null), 3000)
          }}
          onError={(err) => setError(err)}
        />
      )}

      {editingTeam && (
        <TeamModal
          team={editingTeam}
          seasonId={selectedSeason}
          onClose={() => setEditingTeam(null)}
          onSuccess={() => {
            setEditingTeam(null)
            fetchTeams()
            setSuccess('Team updated successfully!')
            setTimeout(() => setSuccess(null), 3000)
          }}
          onError={(err) => setError(err)}
        />
      )}
    </div>
  )
}

function TeamModal({ team, seasonId, onClose, onSuccess, onError }) {
  const [formData, setFormData] = useState({
    name: team?.name || '',
    division: team?.division || 'Training'
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const teamData = {
        name: formData.name,
        division: formData.division,
        season_id: seasonId
      }

      if (team) {
        // Update existing team
        const { error } = await supabase
          .from('teams')
          .update(teamData)
          .eq('id', team.id)

        if (error) throw error
      } else {
        // Create new team
        const { error } = await supabase
          .from('teams')
          .insert([teamData])

        if (error) throw error
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
          {team ? 'Edit Team' : 'Create New Team'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Team Name *</label>
            <input
              type="text"
              className="input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., Red Sox, Yankees"
            />
          </div>

          <div>
            <label className="label">Division *</label>
            <select
              className="input"
              value={formData.division}
              onChange={(e) => setFormData({ ...formData, division: e.target.value })}
              required
            >
              <option value="Training">Training</option>
              <option value="Minor">Minor</option>
              <option value="Major">Major</option>
            </select>
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
              {loading ? (team ? 'Updating...' : 'Creating...') : (team ? 'Update Team' : 'Create Team')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}