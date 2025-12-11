import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import AddCoachForm from './AddCoachForm'

export default function ManageCoachesModal({ team, onClose, onSuccess, onError }) {
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
                        Read Only
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
