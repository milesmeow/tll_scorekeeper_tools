import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

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

  const handleToggleActive = async (userId, currentStatus) => {
    try {
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

  if (loading) {
    return <div className="text-center py-8">Loading users...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">User Management</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
        >
          + Add User
        </button>
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
              {users.map((user) => (
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
                    <button
                      onClick={() => handleToggleActive(user.id, user.is_active)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
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
    </div>
  )
}

function AddUserModal({ onClose, onUserAdded, onError }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'coach',
    tempPassword: ''
  })
  const [loading, setLoading] = useState(false)

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData({ ...formData, tempPassword: password })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // This is a simplified version - in production, you'd want a server-side function
      // to create users since the anon key can't create auth users directly
      
      // For now, we'll show instructions to create the user manually
      alert(`
To add this user:

1. Go to Supabase Dashboard > Authentication > Users
2. Click "Add user" > "Create new user"
3. Enter:
   - Email: ${formData.email}
   - Password: ${formData.tempPassword}
   - Auto Confirm User: ✓
4. Copy the User UUID
5. Go to Table Editor > user_profiles > Insert row
6. Fill in:
   - id: [paste UUID]
   - email: ${formData.email}
   - name: ${formData.name}
   - role: ${formData.role}
   - is_active: true
   - must_change_password: true
7. Click Save

The user can then log in with:
Email: ${formData.email}
Password: ${formData.tempPassword}
      `)
      
      onClose()
    } catch (err) {
      onError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold mb-4">Add New User</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input
              type="text"
              className="input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label">Role</label>
            <select
              className="input"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="coach">Coach</option>
              <option value="scorekeeper">Scorekeeper</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Temporary Password</label>
              <button
                type="button"
                onClick={generatePassword}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Generate
              </button>
            </div>
            <input
              type="text"
              className="input"
              value={formData.tempPassword}
              onChange={(e) => setFormData({ ...formData, tempPassword: e.target.value })}
              required
              placeholder="Generate or enter password"
            />
            <p className="text-xs text-gray-500 mt-1">
              User will be required to change this password on first login
            </p>
          </div>

          <div className="alert alert-info text-sm">
            <strong>Note:</strong> Due to Supabase security, you'll need to manually create this user in the dashboard. Instructions will be shown after clicking "Add User".
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
              className="btn btn-primary flex-1"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
