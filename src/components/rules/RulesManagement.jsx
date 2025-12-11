import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function RulesManagement() {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingRule, setEditingRule] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    fetchRules()
  }, [])

  const fetchRules = async () => {
    try {
      const { data, error } = await supabase
        .from('pitch_count_rules')
        .select('*')
        .order('min_age', { ascending: true })
        .order('min_pitches', { ascending: true })

      if (error) throw error
      setRules(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (ruleId) => {
    if (!confirm('Are you sure you want to delete this rule?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('pitch_count_rules')
        .delete()
        .eq('id', ruleId)

      if (error) throw error

      setSuccess('Rule deleted successfully!')
      fetchRules()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message)
    }
  }

  // Group rules by age range for better display
  const groupedRules = rules.reduce((acc, rule) => {
    const key = `${rule.min_age}-${rule.max_age}`
    if (!acc[key]) {
      acc[key] = {
        min_age: rule.min_age,
        max_age: rule.max_age,
        rules: []
      }
    }
    acc[key].rules.push(rule)
    return acc
  }, {})

  if (loading) {
    return <div className="text-center py-8">Loading rules...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">📋 Pitch Count & Rest Day Rules</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
        >
          + Add Rule
        </button>
      </div>

      <div className="card mb-6">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
          <p className="text-sm text-blue-700">
            <strong>📌 About Pitch Count Rules:</strong> These rules define the required rest days based on the number of pitches thrown and player age.
            The system will automatically track and enforce these rules to protect young pitchers' arms.
          </p>
        </div>
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

      {rules.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-600 mb-4">No pitch count rules defined yet. Add rules to track required rest days.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
          >
            Add First Rule
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.values(groupedRules).map((ageGroup) => (
            <div key={`${ageGroup.min_age}-${ageGroup.max_age}`} className="card">
              <h3 className="text-lg font-semibold mb-4">
                Ages {ageGroup.min_age}-{ageGroup.max_age}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pitch Range
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Required Rest Days
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {ageGroup.rules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            {rule.min_pitches} - {rule.max_pitches} pitches
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            {rule.rest_days} {rule.rest_days === 1 ? 'day' : 'days'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={() => setEditingRule(rule)}
                            className="text-blue-600 hover:text-blue-800 px-3 py-1"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(rule.id)}
                            className="text-red-600 hover:text-red-800 px-3 py-1"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <RuleModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            fetchRules()
            setSuccess('Rule created successfully!')
            setTimeout(() => setSuccess(null), 3000)
          }}
          onError={(err) => setError(err)}
        />
      )}

      {editingRule && (
        <RuleModal
          rule={editingRule}
          onClose={() => setEditingRule(null)}
          onSuccess={() => {
            setEditingRule(null)
            fetchRules()
            setSuccess('Rule updated successfully!')
            setTimeout(() => setSuccess(null), 3000)
          }}
          onError={(err) => setError(err)}
        />
      )}
    </div>
  )
}

function RuleModal({ rule, onClose, onSuccess, onError }) {
  const [formData, setFormData] = useState({
    min_age: rule?.min_age || '',
    max_age: rule?.max_age || '',
    min_pitches: rule?.min_pitches || '',
    max_pitches: rule?.max_pitches || '',
    rest_days: rule?.rest_days || ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const ruleData = {
        min_age: parseInt(formData.min_age),
        max_age: parseInt(formData.max_age),
        min_pitches: parseInt(formData.min_pitches),
        max_pitches: parseInt(formData.max_pitches),
        rest_days: parseInt(formData.rest_days)
      }

      // Validation
      if (ruleData.min_age > ruleData.max_age) {
        throw new Error('Minimum age cannot be greater than maximum age')
      }
      if (ruleData.min_pitches > ruleData.max_pitches) {
        throw new Error('Minimum pitches cannot be greater than maximum pitches')
      }

      if (rule) {
        // Update existing rule
        const { error } = await supabase
          .from('pitch_count_rules')
          .update(ruleData)
          .eq('id', rule.id)

        if (error) throw error
      } else {
        // Create new rule
        const { error } = await supabase
          .from('pitch_count_rules')
          .insert([ruleData])

        if (error) throw error
      }

      onSuccess()
    } catch (err) {
      onError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold mb-4">
          {rule ? 'Edit Pitch Count Rule' : 'Add Pitch Count Rule'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Min Age *</label>
              <input
                type="number"
                className="input"
                value={formData.min_age}
                onChange={(e) => setFormData({ ...formData, min_age: e.target.value })}
                required
                min="4"
                max="18"
              />
            </div>

            <div>
              <label className="label">Max Age *</label>
              <input
                type="number"
                className="input"
                value={formData.max_age}
                onChange={(e) => setFormData({ ...formData, max_age: e.target.value })}
                required
                min="4"
                max="18"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Min Pitches *</label>
              <input
                type="number"
                className="input"
                value={formData.min_pitches}
                onChange={(e) => setFormData({ ...formData, min_pitches: e.target.value })}
                required
                min="1"
              />
            </div>

            <div>
              <label className="label">Max Pitches *</label>
              <input
                type="number"
                className="input"
                value={formData.max_pitches}
                onChange={(e) => setFormData({ ...formData, max_pitches: e.target.value })}
                required
                min="1"
              />
            </div>
          </div>

          <div>
            <label className="label">Required Rest Days *</label>
            <input
              type="number"
              className="input"
              value={formData.rest_days}
              onChange={(e) => setFormData({ ...formData, rest_days: e.target.value })}
              required
              min="0"
              max="7"
            />
            <p className="text-xs text-gray-500 mt-1">
              Number of calendar days required before pitcher can pitch again
            </p>
          </div>

          <div className="flex gap-2 pt-4">
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
              {loading ? (rule ? 'Updating...' : 'Creating...') : (rule ? 'Update Rule' : 'Create Rule')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
