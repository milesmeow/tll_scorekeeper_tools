import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function SeasonManagement() {
  const [seasons, setSeasons] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingSeason, setEditingSeason] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    fetchSeasons()
  }, [])

  const fetchSeasons = async () => {
    try {
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .order('is_active', { ascending: false })
        .order('start_date', { ascending: false })

      if (error) throw error
      setSeasons(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSetActive = async (seasonId) => {
    try {
      // First, deactivate all seasons
      await supabase
        .from('seasons')
        .update({ is_active: false })
        .neq('id', seasonId)

      // Then activate the selected one
      const { error } = await supabase
        .from('seasons')
        .update({ is_active: true })
        .eq('id', seasonId)

      if (error) throw error

      setSuccess('Season activated successfully!')
      fetchSeasons()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (seasonId) => {
    if (!confirm('Are you sure you want to delete this season? This will only work if there are no teams or games associated with it.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('seasons')
        .delete()
        .eq('id', seasonId)

      if (error) {
        // Check if it's a foreign key constraint error
        if (error.code === '23503') {
          throw new Error('Cannot delete season: teams or games are still associated with it. Delete those first.')
        }
        throw error
      }

      setSuccess('Season deleted successfully!')
      fetchSeasons()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading seasons...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Season Management</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
        >
          + Create Season
        </button>
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

      {seasons.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-600 mb-4">No seasons yet. Create your first season to get started!</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
          >
            Create First Season
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="space-y-4">
            {seasons.map((season) => (
              <div
                key={season.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{season.name}</h3>
                    {season.is_active && (
                      <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Starts: {new Date(season.start_date).toLocaleDateString()}
                    {season.end_date && ` • Ends: ${new Date(season.end_date).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!season.is_active && (
                    <button
                      onClick={() => handleSetActive(season.id)}
                      className="btn btn-secondary text-sm"
                    >
                      Set Active
                    </button>
                  )}
                  <button
                    onClick={() => setEditingSeason(season)}
                    className="text-blue-600 hover:text-blue-800 px-3 py-1"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(season.id)}
                    className="text-red-600 hover:text-red-800 px-3 py-1"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddModal && (
        <SeasonModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            fetchSeasons()
            setSuccess('Season created successfully!')
            setTimeout(() => setSuccess(null), 3000)
          }}
          onError={(err) => setError(err)}
        />
      )}

      {editingSeason && (
        <SeasonModal
          season={editingSeason}
          onClose={() => setEditingSeason(null)}
          onSuccess={() => {
            setEditingSeason(null)
            fetchSeasons()
            setSuccess('Season updated successfully!')
            setTimeout(() => setSuccess(null), 3000)
          }}
          onError={(err) => setError(err)}
        />
      )}
    </div>
  )
}

function SeasonModal({ season, onClose, onSuccess, onError }) {
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
        const { data: { user } } = await supabase.auth.getUser()
        seasonData.created_by = user.id
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