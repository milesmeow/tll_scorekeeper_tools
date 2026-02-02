import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function PlayerModal({ player, teamId, onClose, onSuccess, onError }) {
  const [formData, setFormData] = useState({
    name: player?.name || '',
    age: player?.age || '',
    jersey_number: player?.jersey_number || ''
  })
  const [loading, setLoading] = useState(false)
  const [modalError, setModalError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setModalError(null)

    try {
      const playerData = {
        name: formData.name,
        age: parseInt(formData.age),
        jersey_number: formData.jersey_number || null,
        team_id: teamId
      }

      if (player) {
        // Update existing player
        const { error } = await supabase
          .from('players')
          .update(playerData)
          .eq('id', player.id)

        if (error) {
          if (error.code === '23505') {
            throw new Error('Jersey number already exists on this team')
          }
          throw error
        }

      } else {
        // Create new player
        const { error } = await supabase
          .from('players')
          .insert([playerData])

        if (error) {
          if (error.code === '23505') {
            throw new Error('Jersey number already exists on this team')
          }
          throw error
        }
      }

      onSuccess()
    } catch (err) {
      setModalError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold mb-4">
          {player ? 'Edit Player' : 'Add New Player'}
        </h3>

        {modalError && (
          <div className="alert alert-error mb-4">
            {modalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Player Name *</label>
            <input
              type="text"
              className="input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., John Smith"
            />
          </div>

          <div>
            <label className="label">Age *</label>
            <input
              type="number"
              className="input"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
              required
              min="6"
              max="12"
              placeholder="6-12"
            />
          </div>

          <div>
            <label className="label">Jersey Number (Optional)</label>
            <input
              type="text"
              className="input"
              value={formData.jersey_number}
              onChange={(e) => setFormData({ ...formData, jersey_number: e.target.value })}
              placeholder="e.g., 12"
            />
            <p className="text-xs text-gray-500 mt-1">
              Must be unique on this team
            </p>
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
              {loading ? (player ? 'Updating...' : 'Adding...') : (player ? 'Update Player' : 'Add Player')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
