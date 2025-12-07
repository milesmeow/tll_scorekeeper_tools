import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function TeamManagement() {
  const [seasons, setSeasons] = useState([])
  const [selectedSeason, setSelectedSeason] = useState(null)
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTeam, setEditingTeam] = useState(null)
  const [managingCoaches, setManagingCoaches] = useState(null)
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
                            onClick={() => setManagingCoaches(team)}
                            className="text-green-600 hover:text-green-800 px-3 py-1"
                          >
                            Coaches
                          </button>
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

      {managingCoaches && (
        <ManageCoachesModal
          team={managingCoaches}
          onClose={() => setManagingCoaches(null)}
          onSuccess={() => {
            setManagingCoaches(null)
            setSuccess('Coach assignments updated!')
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
        const { error } = await supabase
          .from('teams')
          .update(teamData)
          .eq('id', team.id)

        if (error) throw error
      } else {
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

function ManageCoachesModal({ team, onClose, onSuccess, onError }) {
  const [coaches, setCoaches] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Get all coaches
      const { data: coachData, error: coachError } = await supabase
        .from('user_profiles')
        .select('*')
        .in('role', ['coach', 'admin', 'super_admin'])
        .eq('is_active', true)
        .order('name')

      if (coachError) throw coachError

      // Get current assignments for this team
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('team_coaches')
        .select(`
          *,
          user_profiles (name, email)
        `)
        .eq('team_id', team.id)

      if (assignmentError) throw assignmentError

      setCoaches(coachData)
      setAssignments(assignmentData)
    } catch (err) {
      onError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveCoach = async (assignmentId) => {
    if (!confirm('Remove this coach from the team?')) return

    try {
      const { error } = await supabase
        .from('team_coaches')
        .delete()
        .eq('id', assignmentId)

      if (error) throw error

      fetchData()
    } catch (err) {
      onError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">
          Manage Coaches - {team.name}
        </h3>

        {/* Current Assignments */}
        <div className="mb-6">
          <h4 className="font-semibold mb-3">Current Coaches:</h4>
          {assignments.length === 0 ? (
            <p className="text-gray-500 text-sm">No coaches assigned yet</p>
          ) : (
            <div className="space-y-2">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{assignment.user_profiles.name}</p>
                    <p className="text-sm text-gray-600">{assignment.user_profiles.email}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                        {assignment.role.replace('_', ' ')}
                      </span>
                      <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded">
                        {assignment.can_edit ? 'Can Edit' : 'Read Only'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveCoach(assignment.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Coach Button */}
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="btn btn-primary mb-4"
          >
            + Assign Coach
          </button>
        )}

        {/* Add Coach Form */}
        {showAddForm && (
          <AddCoachForm
            teamId={team.id}
            coaches={coaches}
            existingAssignments={assignments}
            onSuccess={() => {
              setShowAddForm(false)
              fetchData()
            }}
            onCancel={() => setShowAddForm(false)}
            onError={onError}
          />
        )}

        <div className="flex justify-end pt-4 border-t">
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function AddCoachForm({ teamId, coaches, existingAssignments, onSuccess, onCancel, onError }) {
  const [formData, setFormData] = useState({
    user_id: '',
    role: 'head_coach',
    can_edit: true
  })
  const [loading, setLoading] = useState(false)

  const assignedCoachIds = existingAssignments.map(a => a.user_id)
  const availableCoaches = coaches.filter(c => !assignedCoachIds.includes(c.id))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from('team_coaches')
        .insert([{
          team_id: teamId,
          user_id: formData.user_id,
          role: formData.role,
          can_edit: formData.can_edit
        }])

      if (error) throw error

      onSuccess()
    } catch (err) {
      onError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (availableCoaches.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded mb-4">
        <p className="text-sm text-yellow-800">All available coaches are already assigned to this team.</p>
        <button onClick={onCancel} className="text-sm text-blue-600 hover:text-blue-800 mt-2">
          Cancel
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-blue-50 border border-blue-200 rounded mb-4 space-y-3">
      <div>
        <label className="label">Select Coach *</label>
        <select
          className="input"
          value={formData.user_id}
          onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
          required
        >
          <option value="">-- Select Coach --</option>
          {availableCoaches.map((coach) => (
            <option key={coach.id} value={coach.id}>
              {coach.name} ({coach.email})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Role *</label>
        <select
          className="input"
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
        >
          <option value="head_coach">Head Coach</option>
          <option value="assistant">Assistant Coach</option>
        </select>
      </div>

      <div>
        <label className="label">Permissions *</label>
        <select
          className="input"
          value={formData.can_edit ? 'edit' : 'readonly'}
          onChange={(e) => setFormData({ ...formData, can_edit: e.target.value === 'edit' })}
        >
          <option value="edit">Can Edit (Read/Write)</option>
          <option value="readonly">Read Only</option>
        </select>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-secondary flex-1"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary flex-1"
          disabled={loading}
        >
          {loading ? 'Assigning...' : 'Assign Coach'}
        </button>
      </div>
    </form>
  )
}