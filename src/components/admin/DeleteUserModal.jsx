import { useState } from 'react'
import { useBodyScrollLock } from '../../lib/useBodyScrollLock'

export default function DeleteUserModal({
  userName,
  userEmail,
  userRole,
  loading,
  onConfirm,
  onClose,
}) {
  useBodyScrollLock()
  const [confirmText, setConfirmText] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (confirmText === 'DELETE') {
      onConfirm()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-xl font-bold mb-4 text-red-600">Delete User</h3>

        <p className="mb-4">
          Are you sure you want to permanently delete <strong>{userName}</strong>?
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 text-sm text-gray-700">
          <p><strong>Email:</strong> {userEmail}</p>
          <p><strong>Role:</strong> {userRole.replace('_', ' ')}</p>
        </div>

        <p className="mb-4 text-sm text-gray-600">
          This will permanently remove the user's account and all of their coach
          assignments. This action cannot be undone. Type <strong>DELETE</strong> to
          confirm.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            className="input w-full"
            placeholder="Type DELETE to confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoFocus
          />

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
              className="btn btn-primary flex-1 bg-red-600 hover:bg-red-700"
              disabled={confirmText !== 'DELETE' || loading}
            >
              {loading ? 'Deleting...' : 'Delete User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
