import { Navigate } from 'react-router-dom'

export default function RoleBasedRedirect({ profile }) {
  if (!profile) {
    return null
  }

  // Redirect based on user role (replicates getInitialView logic from Dashboard)
  if (profile.role === 'super_admin') {
    return <Navigate to="/users" replace />
  }

  if (profile.role === 'admin') {
    return <Navigate to="/games" replace />
  }

  // Default for coaches and any other roles
  return <Navigate to="/teams" replace />
}
