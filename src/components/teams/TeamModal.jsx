import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function TeamModal({ team, seasonId, onClose, onSuccess, onError }) {
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
