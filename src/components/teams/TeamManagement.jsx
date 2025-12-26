import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useCoachAssignments } from '../../lib/useCoachAssignments'
import TeamPlayersModal from './TeamPlayersModal'
import TeamModal from './TeamModal'
import ManageCoachesModal from './ManageCoachesModal'

export default function TeamManagement({ profile }) {
  const [seasons, setSeasons] = useState([])
  const [selectedSeason, setSelectedSeason] = useState(null)
  const [selectedDivision, setSelectedDivision] = useState('Major')
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTeam, setEditingTeam] = useState(null)
  const [managingCoaches, setManagingCoaches] = useState(null)
  const [managingPlayers, setManagingPlayers] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const isCoach = profile?.role === 'coach'

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
      if (isCoach && !coachData.loading && coachData.divisions.length > 0) {
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

  // Show empty state for coaches with no assignments
  if (coachData.isEmpty && !coachData.loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6">🏆 Team Management</h2>
        <div className="card text-center py-12">
          <p className="text-gray-600 mb-2">You have no team assignments.</p>
          <p className="text-gray-500 text-sm">Please contact an administrator.</p>
        </div>
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
        <h2 className="text-2xl font-bold">🏆 Team Management</h2>
        {!isCoach && (
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
          >
            + Create Team
          </button>
        )}
      </div>

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
            {isCoach ? (
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
                <option value="All">All Divisions</option>
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

      {teams.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-600 mb-4">No teams yet for this season.{!isCoach && ' Create your first team!'}</p>
          {!isCoach && (
            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-primary"
            >
              Create First Team
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(teamsByDivision)
            .filter(([division]) => selectedDivision === 'All' || division === selectedDivision)
            .map(([division, divTeams]) => (
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
                            onClick={() => setManagingPlayers(team)}
                            className="text-purple-600 hover:text-purple-800 px-3 py-1"
                          >
                            Players
                          </button>
                          {!isCoach && (
                            <>
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
                            </>
                          )}
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

      {!isCoach && showAddModal && (
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

      {!isCoach && editingTeam && (
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

      {!isCoach && managingCoaches && (
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

      {managingPlayers && (
        <TeamPlayersModal
          team={managingPlayers}
          profile={profile}
          onClose={() => setManagingPlayers(null)}
        />
      )}
    </div>
  )
}