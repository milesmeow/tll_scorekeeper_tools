import { useState } from 'react'
import { useBodyScrollLock } from '../../lib/useBodyScrollLock'

export default function DeleteSeasonModal({ seasonName, deleting, error, onConfirm, onClose }) {
  useBodyScrollLock()
  const [confirmText, setConfirmText] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (confirmText === seasonName) {
      onConfirm()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-xl font-bold mb-4 text-red-600">Delete Season</h3>

        <p className="mb-4">
          Are you sure you want to permanently delete <strong>{seasonName}</strong>?
        </p>

        <p className="mb-4 text-sm text-gray-600">
          This deletes the season itself and everything under it:<br />
          &bull; All team rosters and coach assignments<br />
          &bull; All games, scores, and attendance records<br />
          &bull; All pitching and catching data<br />
          &bull; All player absence records
        </p>

        <p className="mb-4 text-sm text-gray-600">
          Consider using Export Season Data above to save a backup first. This
          action cannot be undone. Type <strong>{seasonName}</strong> to confirm.
        </p>

        {error && (
          <div className="alert alert-error mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              className={`input w-full ${
                confirmText && confirmText !== seasonName ? 'border-red-400 focus:ring-red-400' : ''
              }`}
              placeholder={`Type "${seasonName}" to confirm`}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={deleting}
              autoFocus
            />
            {confirmText && confirmText !== seasonName && (
              <p className="mt-1 text-sm text-red-600">
                Doesn't match "{seasonName}" — check for typos.
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-danger flex-1"
              disabled={deleting || confirmText !== seasonName}
            >
              {deleting ? 'Deleting...' : 'Delete Season'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
