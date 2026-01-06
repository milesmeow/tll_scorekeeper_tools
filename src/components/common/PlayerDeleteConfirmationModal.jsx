import { useState } from 'react'

export default function PlayerDeleteConfirmationModal({ playerName, onConfirm, onClose }) {
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
        <h3 className="text-xl font-bold mb-4 text-red-600">Delete Player</h3>

        <p className="mb-4">
          Are you sure you want to delete <strong>{playerName}</strong>?
        </p>

        <p className="mb-4 text-sm text-gray-600">
          This action cannot be undone. Type <strong>DELETE</strong> to confirm.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              className="input w-full"
              placeholder="Type DELETE to confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1 bg-red-600 hover:bg-red-700"
              disabled={confirmText !== 'DELETE'}
            >
              Delete Player
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
