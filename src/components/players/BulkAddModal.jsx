import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function BulkAddModal({ teamId, onClose, onSuccess, onError }) {
  const [csvData, setCsvData] = useState('')
  const [loading, setLoading] = useState(false)
  const [modalError, setModalError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setModalError(null)

    try {
      // Parse CSV data
      const lines = csvData.trim().split('\n')
      const players = []

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const parts = line.split(',').map(p => p.trim())

        if (parts.length < 2) {
          throw new Error(`Line ${i + 1}: Invalid format. Expected: Name, Age, Jersey# (optional)`)
        }

        const [name, age, jersey] = parts

        if (!name) {
          throw new Error(`Line ${i + 1}: Name is required`)
        }

        const ageNum = parseInt(age)
        if (isNaN(ageNum) || ageNum < 7 || ageNum > 12) {
          throw new Error(`Line ${i + 1}: Age must be between 7 and 12`)
        }

        players.push({
          name,
          age: ageNum,
          jersey_number: jersey || null,
          team_id: teamId
        })
      }

      if (players.length === 0) {
        throw new Error('No valid players found in CSV data')
      }

      // Insert all players
      const { error } = await supabase
        .from('players')
        .insert(players)

      if (error) {
        if (error.code === '23505') {
          throw new Error('One or more jersey numbers already exist on this team')
        }
        throw error
      }

      onSuccess(players.length)
    } catch (err) {
      setModalError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <h3 className="text-xl font-bold mb-4">Bulk Add Players (CSV)</h3>

        {modalError && (
          <div className="alert alert-error mb-4">
            {modalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">CSV Data</label>
            <textarea
              className="input h-64 font-mono text-sm"
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              required
              placeholder="Name, Age, Jersey# (optional)&#10;John Smith, 12, 5&#10;Jane Doe, 11, 7&#10;Bob Johnson, 13"
            />
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
              <strong>Format:</strong> Name, Age, Jersey# (optional)
              <br />
              <strong>Example:</strong>
              <pre className="mt-1 text-xs">
John Smith, 12, 5{'\n'}Jane Doe, 11, 7{'\n'}Bob Johnson, 13
              </pre>
              <p className="mt-2 text-xs text-gray-600">
                • One player per line<br />
                • Age must be 7-12<br />
                • Jersey numbers must be unique on this team<br />
                • Jersey number is optional (leave blank or omit)
              </p>
            </div>
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
              {loading ? 'Adding Players...' : 'Add Players'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
