import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function SeasonModal({ season, onClose, onSuccess, onError }) {
  const [formData, setFormData] = useState({
    name: season?.name || '',
    start_date: season?.start_date || '',
    end_date: season?.end_date || ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const seasonData = {
        name: formData.name,
        start_date: formData.start_date,
        end_date: formData.end_date || null
      }

      if (season) {
        // Update existing season
        const { error } = await supabase
          .from('seasons')
          .update(seasonData)
          .eq('id', season.id)

        if (error) throw error
      } else {
        // Create new season
        seasonData.is_active = false

        const { error } = await supabase
          .from('seasons')
          .insert([seasonData])

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
          {season ? 'Edit Season' : 'Create New Season'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Season Name *</label>
            <input
              type="text"
              className="input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., 2025 Spring Season"
            />
          </div>

          <div>
            <label className="label">Start Date *</label>
            <input
              type="date"
              className="input"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label">End Date (Optional)</label>
            <input
              type="date"
              className="input"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave blank if season is ongoing
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
              {loading ? (season ? 'Updating...' : 'Creating...') : (season ? 'Update Season' : 'Create Season')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
