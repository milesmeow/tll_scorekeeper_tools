import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import SeasonModal from './SeasonModal'

export default function SeasonManagement({ profile }) {
  const [seasons, setSeasons] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingSeason, setEditingSeason] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const isCoach = profile?.role === 'coach'

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
        <h2 className="text-2xl font-bold">📅 Season Management</h2>
        {!isCoach && (
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
          >
            + Create Season
          </button>
        )}
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
          <p className="text-gray-600 mb-4">No seasons yet.{!isCoach && ' Create your first season to get started!'}</p>
          {!isCoach && (
            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-primary"
            >
              Create First Season
            </button>
          )}
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
                {!isCoach && (
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
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!isCoach && showAddModal && (
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

      {!isCoach && editingSeason && (
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