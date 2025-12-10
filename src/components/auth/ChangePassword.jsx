import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function ChangePassword({ onPasswordChanged }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      // Update password in Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (authError) throw authError

      // Update user profile to mark password as changed
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ must_change_password: false })
        .eq('id', user.id)

      if (profileError) throw profileError

      onPasswordChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="card max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🔒 Change Your Password</h1>
          <p className="text-gray-600">You must change your temporary password before continuing</p>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="label">New Password</label>
            <input
              type="password"
              className="input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label className="label">Confirm Password</label>
            <input
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Re-enter your password"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Password requirements:</strong>
              <br />• At least 8 characters long
              <br />• Should be unique and secure
            </p>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
