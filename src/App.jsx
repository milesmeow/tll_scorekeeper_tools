import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Login from './components/auth/Login'
import ChangePassword from './components/auth/ChangePassword'
import Dashboard from './components/layout/Dashboard'

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [requirePasswordChange, setRequirePasswordChange] = useState(false)
  const [loginError, setLoginError] = useState(null)

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        loadProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setProfile(null) // Clear profile immediately to prevent stale data
      if (session) {
        loadProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error

      // Check if user is active - if not, sign out immediately
      if (!data.is_active) {
        console.log('User is inactive, signing out')
        setLoginError('Your account has been deactivated. Please contact an administrator.')
        await supabase.auth.signOut()
        setProfile(null)
        setLoading(false)
        return
      }

      setProfile(data)
      setRequirePasswordChange(data.must_change_password)
    } catch (error) {
      console.error('Error loading profile:', error)
      // If profile doesn't exist, sign out
      await supabase.auth.signOut()
    } finally {
      setLoading(false)
    }
  }

  const handleLoginSuccess = ({ user, profile, requirePasswordChange }) => {
    setLoginError(null) // Clear any previous login errors
    setSession({ user })
    setProfile(profile)
    setRequirePasswordChange(requirePasswordChange)
    setLoading(false)
  }

  const handlePasswordChanged = async () => {
    setRequirePasswordChange(false)
    // Reload profile to get updated data
    if (session) {
      await loadProfile(session.user.id)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⚾</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Not logged in
  if (!session) {
    return <Login onLoginSuccess={handleLoginSuccess} initialError={loginError} />
  }

  // Logged in but needs to change password
  if (requirePasswordChange) {
    return <ChangePassword onPasswordChanged={handlePasswordChanged} />
  }

  // Logged in and ready
  return profile ? <Dashboard user={session.user} profile={profile} /> : null
}
