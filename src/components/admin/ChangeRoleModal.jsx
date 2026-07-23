import { useState } from 'react'
import { useBodyScrollLock } from '../../lib/useBodyScrollLock'

export default function ChangeRoleModal({
  userName,
  userEmail,
  currentRole,
  loading,
  onConfirm,
  onClose,
}) {
  useBodyScrollLock()
  const [selectedRole, setSelectedRole] = useState(currentRole)

  const isUnchanged = selectedRole === currentRole

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!isUnchanged) {
      onConfirm(selectedRole)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-xl font-bold mb-4">Change User Role</h3>

        <p className="mb-4">
          Change the role for <strong>{userName}</strong>.
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 text-sm text-gray-700">
          <p><strong>Email:</strong> {userEmail}</p>
          <p><strong>Current role:</strong> {currentRole.replace('_', ' ')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">New Role</label>
            <select
              className="input"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="coach">Coach</option>
              <option value="admin">Admin</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Admins have full data access. Coaches have read-only access to their
              assigned teams.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={isUnchanged || loading}
            >
              {loading ? 'Saving...' : 'Change Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
