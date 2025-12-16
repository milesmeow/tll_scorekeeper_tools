import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import AddUserModal from './AddUserModal'
import ResetPasswordModal from './ResetPasswordModal'

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [statusFilter, setStatusFilter] = useState('active')
  const [resetPasswordUser, setResetPasswordUser] = useState(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (userId, currentStatus, userRole) => {
    try {
      // Prevent deactivating the last super admin
      if (currentStatus && userRole === 'super_admin') {
        const activeSuperAdmins = users.filter(
          u => u.role === 'super_admin' && u.is_active
        )

        if (activeSuperAdmins.length === 1) {
          setError('Cannot deactivate the last super admin. At least one super admin must remain active.')
          setTimeout(() => setError(null), 5000)
          return
        }
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId)

      if (error) throw error

      setSuccess(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`)
      fetchUsers()

      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleResetPassword = (user) => {
    setResetPasswordUser(user)
  }

  if (loading) {
    return <div className="text-center py-8">Loading users...</div>
  }

  // Check if deactivation should be disabled for a user
  const isDeactivationDisabled = (user) => {
    if (!user.is_active) return false // Activation is always allowed

    if (user.role === 'super_admin') {
      const activeSuperAdmins = users.filter(
        u => u.role === 'super_admin' && u.is_active
      )
      return activeSuperAdmins.length === 1
    }

    return false
  }

  // Filter users by status
  const filteredUsers = users.filter(user => {
    if (statusFilter === 'active') return user.is_active
    if (statusFilter === 'inactive') return !user.is_active
    return true // 'all' shows everything
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">👥 User Management</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
        >
          + Add User
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-900 mb-2">📋 How to Manage Users</h3>
        <div className="text-sm text-blue-800 space-y-1">
          <p><strong>Add a User:</strong> Click the "+ Add User" button above to create a new user account. Generate a temporary password and share it securely with the user.</p>
          <p><strong>Activate/Deactivate:</strong> Use the "Activate" or "Deactivate" button to control user access. Inactive users cannot log in.</p>
          <p><strong>Reset Password:</strong> Click "Reset Password" for active users to generate a new temporary password. The user will be required to change it on next login. <em>Note: You must activate inactive users before resetting their password.</em></p>
          <p><strong>Filter Users:</strong> Use the dropdown below to view Active, Inactive, or All users.</p>
        </div>
      </div>

      {/* Status Filter */}
      <div className="mb-6">
        <label className="label">Filter by Status</label>
        <select
          className="input max-w-md"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="all">All Users</option>
        </select>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success mb-4">
          {success}
        </div>
      )}

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">Email</th>
                <th className="text-left py-3 px-4">Role</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">{user.name}</td>
                  <td className="py-3 px-4">{user.email}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      user.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                      user.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleToggleActive(user.id, user.is_active, user.role)}
                        disabled={isDeactivationDisabled(user)}
                        className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                        title={isDeactivationDisabled(user) ? 'Cannot deactivate the last super admin' : ''}
                      >
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleResetPassword(user)}
                        disabled={!user.is_active}
                        className="text-sm text-purple-600 hover:text-purple-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                        title={!user.is_active ? 'Cannot reset password for inactive users. Activate the user first.' : 'Reset user\'s password'}
                      >
                        Reset Password
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onUserAdded={() => {
            setShowAddModal(false)
            fetchUsers()
            setSuccess('User added successfully!')
            setTimeout(() => setSuccess(null), 3000)
          }}
          onError={(err) => setError(err)}
        />
      )}

      {resetPasswordUser && (
        <ResetPasswordModal
          userId={resetPasswordUser.id}
          userEmail={resetPasswordUser.email}
          userName={resetPasswordUser.name}
          onClose={() => setResetPasswordUser(null)}
          onSuccess={(message) => {
            setResetPasswordUser(null)
            setSuccess(message)
            setTimeout(() => setSuccess(null), 5000)
          }}
          onError={(err) => {
            setError(err)
            setTimeout(() => setError(null), 5000)
          }}
        />
      )}
    </div>
  )
}
