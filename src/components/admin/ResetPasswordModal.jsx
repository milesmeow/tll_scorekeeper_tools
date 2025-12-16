import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function ResetPasswordModal({ userId, userEmail, userName, onClose, onSuccess, onError }) {
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [resetComplete, setResetComplete] = useState(false)

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setNewPassword(password)
    setShowPassword(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validate password
    if (newPassword.length < 8) {
      onError('Password must be at least 8 characters long')
      return
    }

    setLoading(true)

    try {
      // Get current user's session token
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('No active session')
      }

      // Call the Edge Function
      const response = await fetch(
        'https://dnvitfjnlojorcqqccec.supabase.co/functions/v1/reset-password',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            userId,
            newPassword
          })
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset password')
      }

      // Mark as complete and show success message
      setResetComplete(true)
      setShowPassword(true)

    } catch (err) {
      onError(err.message)
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(newPassword)
    alert('Password copied to clipboard!')
  }

  const handleClose = () => {
    if (resetComplete) {
      onSuccess(`Password reset for ${userName}`)
    } else {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold mb-4">Reset Password</h3>

        {!resetComplete ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>User:</strong> {userName}
                <br />
                <strong>Email:</strong> {userEmail}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">New Password</label>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Generate
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Enter or generate password"
                />
                {newPassword && (
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 text-sm"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                User will be required to change this password on next login
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Make sure to save this password before closing.
                You'll need to communicate it to the user securely.
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
                disabled={loading}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="alert alert-success">
              Password has been reset successfully!
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 mb-2">
                <strong>Temporary Password:</strong>
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  className="input flex-1 font-mono"
                  value={newPassword}
                  readOnly
                />
                <button
                  onClick={copyToClipboard}
                  className="btn btn-primary"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Action Required:</strong>
                <br />• Save this password before closing
                <br />• Communicate it securely to {userName}
                <br />• They must change it on next login
              </p>
            </div>

            <button
              onClick={handleClose}
              className="btn btn-primary w-full"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
