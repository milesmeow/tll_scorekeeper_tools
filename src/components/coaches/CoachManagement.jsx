import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function CoachManagement() {
  const [coaches, setCoaches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchCoaches()
  }, [])

  const fetchCoaches = async () => {
    try {
      // Get all users who are coaches or admins
      const { data: users, error: usersError } = await supabase
        .from('user_profiles')
        .select('*')
        .in('role', ['coach', 'admin', 'super_admin'])
        .order('name')

      if (usersError) throw usersError

      // Get their team assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('team_coaches')
        .select(`
          *,
          teams (
            name,
            division,
            seasons (
              name,
              is_active
            )
          )
        `)

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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Coach Management</h2>
        <p className="text-sm text-gray-600">
          To add a new coach, go to User Management and create a user with role "Coach"
        </p>
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
      ) : (
        <div className="space-y-4">
          {coaches.map((coach) => (
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