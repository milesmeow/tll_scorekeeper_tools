import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useBodyScrollLock } from '../../lib/useBodyScrollLock'
import {
  parseUserCsv,
  generateTempPassword,
  usersToResultCsv
} from '../../lib/userCsvUtils'

const CREATE_USER_URL =
  'https://dnvitfjnlojorcqqccec.supabase.co/functions/v1/create-user'

// Modal has three phases: paste CSV -> create sequentially -> show results.
export default function BulkAddUsersModal({ onClose, onComplete }) {
  useBodyScrollLock()
  const [csvData, setCsvData] = useState('')
  const [modalError, setModalError] = useState(null)
  const [phase, setPhase] = useState('input') // 'input' | 'processing' | 'results'
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [successes, setSuccesses] = useState([]) // { name, email, password }
  const [failures, setFailures] = useState([]) // { line, name, email, reason }
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setModalError(null)

    // Parse & validate locally first — nothing is created if this throws.
    let users
    try {
      users = parseUserCsv(csvData)
    } catch (err) {
      setModalError(err.message)
      return
    }

    setPhase('processing')
    setProgress({ current: 0, total: users.length })

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setModalError('No active session')
      setPhase('input')
      return
    }

    const created = []
    const failed = []

    // Sequential loop: each user is a separate edge-function call. Continue on
    // error and report per row (successfully-created users keep their accounts).
    for (let i = 0; i < users.length; i++) {
      const user = users[i]
      setProgress({ current: i + 1, total: users.length })
      const password = generateTempPassword()

      try {
        const response = await fetch(CREATE_USER_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            email: user.email,
            password,
            name: user.name,
            role: 'coach'
          })
        })

        const result = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(result.error || 'Failed to create user')
        }

        created.push({ name: user.name, email: user.email, password })
      } catch (err) {
        failed.push({
          line: i + 1,
          name: user.name,
          email: user.email,
          reason: err.message
        })
      }
    }

    setSuccesses(created)
    setFailures(failed)
    setPhase('results')
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(usersToResultCsv(successes))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setModalError('Could not copy to clipboard')
    }
  }

  const handleDownload = () => {
    const csv = usersToResultCsv(successes)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `bulk-users-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleClose = () => {
    // If any users were created, make sure the parent list refreshes.
    if (successes.length > 0 && onComplete) {
      onComplete(successes.length)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">Bulk Add Users (CSV)</h3>

        {modalError && (
          <div className="alert alert-error mb-4">{modalError}</div>
        )}

        {phase === 'input' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">CSV Data</label>
              <textarea
                className="input h-64 font-mono text-sm"
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                required
                placeholder="Full Name, email&#10;John Smith, john@example.com&#10;Jane Doe, jane@example.com"
              />
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                <strong>Format:</strong> Full Name, email
                <br />
                <strong>Example:</strong>
                <pre className="mt-1 text-xs">
John Smith, john@example.com{'\n'}Jane Doe, jane@example.com
                </pre>
                <p className="mt-2 text-xs text-gray-600">
                  • One user per line
                  <br />
                  • All users are created with the <strong>Coach</strong> role
                  <br />
                  • A temporary password is generated for each user
                  <br />
                  • Emails must be unique within the list
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
              <button type="submit" className="btn btn-primary flex-1">
                Import Users
              </button>
            </div>
          </form>
        )}

        {phase === 'processing' && (
          <div className="py-8 text-center">
            <p className="text-lg font-medium mb-2">
              Creating {progress.current} of {progress.total}…
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 max-w-md mx-auto">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all"
                style={{
                  width: `${
                    progress.total
                      ? (progress.current / progress.total) * 100
                      : 0
                  }%`
                }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-3">
              Please don't close this window.
            </p>
          </div>
        )}

        {phase === 'results' && (
          <div className="space-y-4">
            <p className="text-sm">
              <span className="font-semibold text-green-700">
                {successes.length} created
              </span>
              {failures.length > 0 && (
                <>
                  {' · '}
                  <span className="font-semibold text-red-700">
                    {failures.length} failed
                  </span>
                </>
              )}
            </p>

            {successes.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Created users</h4>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {copied ? 'Copied!' : 'Copy CSV'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Download .csv
                    </button>
                  </div>
                </div>
                <div className="border border-gray-200 rounded overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3">Full Name</th>
                        <th className="text-left py-2 px-3">Email</th>
                        <th className="text-left py-2 px-3">Temp Password</th>
                      </tr>
                    </thead>
                    <tbody>
                      {successes.map((u) => (
                        <tr
                          key={u.email}
                          className="border-b border-gray-100"
                        >
                          <td className="py-2 px-3">{u.name}</td>
                          <td className="py-2 px-3">{u.email}</td>
                          <td className="py-2 px-3 font-mono">{u.password}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Share each temporary password securely. Users must change it
                  on first login.
                </p>
              </div>
            )}

            {failures.length > 0 && (
              <div>
                <h4 className="font-semibold text-red-700 mb-2">Failed rows</h4>
                <div className="border border-red-200 rounded overflow-x-auto max-h-48 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-red-50 sticky top-0">
                      <tr className="border-b border-red-200">
                        <th className="text-left py-2 px-3">Line</th>
                        <th className="text-left py-2 px-3">Email</th>
                        <th className="text-left py-2 px-3">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {failures.map((f) => (
                        <tr
                          key={`${f.line}-${f.email}`}
                          className="border-b border-red-100"
                        >
                          <td className="py-2 px-3">{f.line}</td>
                          <td className="py-2 px-3">{f.email}</td>
                          <td className="py-2 px-3 text-red-700">
                            {f.reason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="btn btn-primary"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
