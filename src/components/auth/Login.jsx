import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Sign in with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      // Get user profile to check role and password change requirement
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single()

      if (profileError) throw profileError

      // Check if account is inactive BEFORE calling onLoginSuccess
      if (!profile.is_active) {
        // Set error first so user sees it
        setError('Your account has been deactivated. Please contact an administrator.')
        // Then sign out (this will trigger App.jsx to redirect, but error is already set)
        await supabase.auth.signOut()
        setLoading(false)
        return // Exit early - don't call onLoginSuccess
      }

      // Check if password change is required
      if (profile.must_change_password) {
        onLoginSuccess({ user: authData.user, profile, requirePasswordChange: true })
      } else {
        onLoginSuccess({ user: authData.user, profile, requirePasswordChange: false })
      }
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="card max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">⚾ Baseball Team Manager</h1>
          <p className="text-gray-600">Sign in to manage your teams</p>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
