import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function MaintenanceToggle() {
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [maintenanceMessage, setMaintenanceMessage] = useState('')
  const [editingMessage, setEditingMessage] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    fetchMaintenanceConfig()
  }, [])

  const fetchMaintenanceConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('maintenance_mode, maintenance_message')
        .eq('id', 1)
        .single()

      if (error) throw error

      setMaintenanceMode(data.maintenance_mode)
      setMaintenanceMessage(data.maintenance_message)
      setNewMessage(data.maintenance_message)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleMaintenance = async () => {
    setUpdating(true)
    setError(null)
    setSuccess(null)

    try {
      const { error } = await supabase.rpc('update_maintenance_mode', {
        p_maintenance_mode: !maintenanceMode
      })

      if (error) throw error

      setMaintenanceMode(!maintenanceMode)
      setSuccess(`Maintenance mode ${!maintenanceMode ? 'enabled' : 'disabled'} successfully`)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message)
      setTimeout(() => setError(null), 5000)
    } finally {
      setUpdating(false)
    }
  }

  const handleUpdateMessage = async () => {
    setUpdating(true)
    setError(null)
    setSuccess(null)

    try {
      const { error } = await supabase.rpc('update_maintenance_mode', {
        p_maintenance_mode: maintenanceMode,
        p_maintenance_message: newMessage
      })

      if (error) throw error

      setMaintenanceMessage(newMessage)
      setEditingMessage(false)
      setSuccess('Maintenance message updated successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message)
      setTimeout(() => setError(null), 5000)
    } finally {
      setUpdating(false)
    }
  }

  const handleCancelEdit = () => {
    setNewMessage(maintenanceMessage)
    setEditingMessage(false)
  }

  if (loading) {
    return <div className="text-center py-8">Loading maintenance settings...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Maintenance Mode</h2>
        <p className="text-gray-600 mb-6">
          Control application access during maintenance periods. Super admins can always access the application.
        </p>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      {/* Maintenance Mode Toggle */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-1">
              Maintenance Mode Status
            </h3>
            <p className="text-sm text-gray-600">
              {maintenanceMode
                ? 'Application is currently in maintenance mode. Only super admins can access.'
                : 'Application is currently accessible to all users.'}
            </p>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              maintenanceMode
                ? 'bg-red-100 text-red-800'
                : 'bg-green-100 text-green-800'
            }`}>
              {maintenanceMode ? 'Enabled' : 'Disabled'}
            </span>
            <button
              onClick={handleToggleMaintenance}
              disabled={updating}
              className={`btn whitespace-nowrap ${
                maintenanceMode ? 'btn-success' : 'btn-error'
              }`}
            >
              {updating
                ? 'Updating...'
                : maintenanceMode
                ? 'Disable Maintenance'
                : 'Enable Maintenance'}
            </button>
          </div>
        </div>
      </div>

      {/* Maintenance Message Editor */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-3">Maintenance Message</h3>
        <p className="text-sm text-gray-600 mb-4">
          Customize the message displayed to users during maintenance mode.
        </p>

        {!editingMessage ? (
          <div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <p className="text-gray-700">{maintenanceMessage}</p>
            </div>
            <button
              onClick={() => setEditingMessage(true)}
              className="btn btn-secondary"
            >
              Edit Message
            </button>
          </div>
        ) : (
          <div>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="input min-h-[100px] mb-4"
              placeholder="Enter maintenance message..."
            />
            <div className="flex space-x-2">
              <button
                onClick={handleUpdateMessage}
                disabled={updating || !newMessage.trim()}
                className="btn btn-primary"
              >
                {updating ? 'Saving...' : 'Save Message'}
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={updating}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Warning Box */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-semibold text-yellow-800 mb-2">Important Notes:</h4>
        <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
          <li>Super admins can always access the application in maintenance mode</li>
          <li>All other users (admins and coaches) will see the maintenance page</li>
          <li>Changes take effect immediately for all users</li>
          <li>Use maintenance mode for database updates, critical fixes, or scheduled maintenance</li>
        </ul>
      </div>
    </div>
  )
}
