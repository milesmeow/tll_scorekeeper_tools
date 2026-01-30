import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function CoachManagement({ isAdmin }) {
  const [coaches, setCoaches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [seasons, setSeasons] = useState([])
  const [selectedSeason, setSelectedSeason] = useState(null)
  const [selectedDivision, setSelectedDivision] = useState('Major')

  useEffect(() => {
    fetchSeasons()
  }, [])

  useEffect(() => {
    if (selectedSeason) {
      fetchCoaches()
    }
  }, [selectedSeason])

  const fetchSeasons = async () => {
    try {
      let query = supabase.from('seasons').select('*')

      // Coaches only see active season
      if (!isAdmin) {
        query = query.eq('is_active', true)
      }

      query = query
        .order('is_active', { ascending: false })
        .order('start_date', { ascending: false })

      const { data, error } = await query
      if (error) throw error

      setSeasons(data)

      // Auto-select active season
      const activeSeason = data.find(s => s.is_active)
      if (activeSeason) {
        setSelectedSeason(activeSeason.id)
      } else if (data.length > 0) {
        setSelectedSeason(data[0].id)
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchCoaches = async () => {
    try {
      // Get all users who are coaches or admins
      const { data: users, error: usersError } = await supabase
        .from('user_profiles')
        .select('*')
        .in('role', ['coach', 'admin', 'super_admin'])
        .order('name')

      if (usersError) throw usersError

      // Get their team assignments for the selected season
      const { data: assignments, error: assignmentsError } = await supabase
        .from('team_coaches')
        .select(`
          *,
          teams!inner (
            name,
            division,
            season_id,
            seasons (
              name,
              is_active
            )
          )
        `)
        .eq('teams.season_id', selectedSeason)

      if (assignmentsError) throw assignmentsError

      // Combine the data
      const coachesWithAssignments = users.map(user => ({
        ...user,
        assignments: assignments.filter(a => a.user_id === user.id)
      }))

      setCoaches(coachesWithAssignments)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading coaches...</div>
  }

  // Filter coaches by division (only show coaches with assignments in selected season)
  const filteredCoaches = selectedDivision === 'All'
    ? coaches.filter(coach => coach.assignments.length > 0)
    : coaches.filter(coach =>
        coach.assignments.some(assignment => assignment.teams.division === selectedDivision)
      )

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">📋 Coach Management</h2>
        {isAdmin && (
          <p className="text-sm text-gray-600">
            To add a new coach, go to User Management and create a user with role "Coach"
          </p>
        )}
      </div>

      {/* Season and Division Selectors */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Season</label>
          <select
            className="input"
            value={selectedSeason || ''}
            onChange={(e) => setSelectedSeason(e.target.value)}
            disabled={!isAdmin}
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

      {coaches.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-600">No coaches found. Create coach users in User Management.</p>
        </div>
      ) : filteredCoaches.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-600">No coaches found for {selectedDivision} division.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCoaches.map((coach) => (
            <div key={coach.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{coach.name}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      coach.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                      coach.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {coach.role.replace('_', ' ').toUpperCase()}
                    </span>
                    {!coach.is_active && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                        INACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{coach.email}</p>

                  {coach.assignments.length > 0 ? (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Team Assignments:</p>
                      <div className="space-y-2">
                        {coach.assignments.map((assignment) => (
                          <div 
                            key={assignment.id} 
                            className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded"
                          >
                            <span className="font-medium">
                              {assignment.teams.name}
                            </span>
                            <span className="text-gray-500">
                              ({assignment.teams.division})
                            </span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-600">
                              {assignment.teams.seasons.name}
                              {assignment.teams.seasons.is_active && ' (Active)'}
                            </span>
                            <span className="text-gray-400">•</span>
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              assignment.role === 'head_coach' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {assignment.role.replace('_', ' ')}
                            </span>
                            <span className="text-gray-400">•</span>
                            <span className="text-xs text-gray-600">
                              {assignment.can_edit ? 'Can Edit' : 'Read Only'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No team assignments yet</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}