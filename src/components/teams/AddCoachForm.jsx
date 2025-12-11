import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function AddCoachForm({ teamId, coaches, existingAssignments, onSuccess, onCancel, onError }) {
  const [formData, setFormData] = useState({
    user_id: '',
    role: 'head_coach',
    // can_edit: false
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
          can_edit: false // coaches can READ ONLY
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
