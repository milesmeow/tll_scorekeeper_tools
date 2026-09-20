import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { exportSeasonBackup, exportSeasonCSV, exportSeasonHTML } from '../../lib/exportUtils'
import DeleteSeasonModal from './DeleteSeasonModal'

export default function ToolsManagement({ isAdmin, isSuperAdmin }) {
  const [seasons, setSeasons] = useState([])
  const [selectedSeasonId, setSelectedSeasonId] = useState('')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [exportType, setExportType] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  const [deleteSuccess, setDeleteSuccess] = useState(null)

  useEffect(() => {
    fetchSeasons()
  }, [])

  const fetchSeasons = async () => {
    try {
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .order('start_date', { ascending: false })

      if (error) throw error
      setSeasons(data || [])
      if (data && data.length > 0) {
        // Auto-select the active season if available
        const activeSeason = data.find(s => s.is_active)
        setSelectedSeasonId(activeSeason?.id || data[0].id)
      }
    } catch (error) {
      console.error('Error fetching seasons:', error)
      alert('Error loading seasons: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleExportBackup = async () => {
    if (!selectedSeasonId) {
      alert('Please select a season')
      return
    }

    setExporting(true)
    setExportType('backup')
    try {
      await exportSeasonBackup(selectedSeasonId)
    } catch (error) {
      console.error('Error exporting backup:', error)
      alert('Error exporting backup: ' + error.message)
    } finally {
      setExporting(false)
      setExportType('')
    }
  }

  const handleExportCSV = async () => {
    if (!selectedSeasonId) {
      alert('Please select a season')
      return
    }

    setExporting(true)
    setExportType('csv')
    try {
      await exportSeasonCSV(selectedSeasonId)
    } catch (error) {
      console.error('Error exporting CSV:', error)
      alert('Error exporting CSV: ' + error.message)
    } finally {
      setExporting(false)
      setExportType('')
    }
  }

  const handleExportHTML = async () => {
    if (!selectedSeasonId) {
      alert('Please select a season')
      return
    }

    setExporting(true)
    setExportType('html')
    try {
      await exportSeasonHTML(selectedSeasonId)
    } catch (error) {
      console.error('Error exporting HTML:', error)
      alert('Error exporting HTML: ' + error.message)
    } finally {
      setExporting(false)
      setExportType('')
    }
  }

  const handleDeleteSeason = async () => {
    setDeleting(true)
    setDeleteError(null)
    try {
      const { data, error } = await supabase.rpc('delete_season_cascade', {
        p_season_id: selectedSeasonId
      })

      if (error) throw error

      const summary = data?.[0]
      const remaining = seasons.filter((s) => s.id !== selectedSeasonId)
      setSeasons(remaining)
      const nextActive = remaining.find((s) => s.is_active)
      setSelectedSeasonId(nextActive?.id || remaining[0]?.id || '')
      setShowDeleteModal(false)
      setDeleteSuccess(
        summary
          ? `Deleted "${summary.season_name}": ${summary.teams_deleted} teams, ` +
            `${summary.players_deleted} players, ${summary.coaches_deleted} coach assignments, ` +
            `${summary.games_deleted} games removed.`
          : 'Season deleted.'
      )
      setTimeout(() => setDeleteSuccess(null), 8000)
    } catch (error) {
      console.error('Error deleting season:', error)
      setDeleteError(error.message)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading...</div>
  }

  const selectedSeason = seasons.find(s => s.id === selectedSeasonId)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">🛠️ Tools</h2>
      </div>

      {deleteSuccess && (
        <div className="alert alert-success mb-6">
          {deleteSuccess}
        </div>
      )}

      {seasons.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-600">No seasons available. Create a season first.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Season Selector */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Select Season</h3>
            <select
              value={selectedSeasonId}
              onChange={(e) => setSelectedSeasonId(e.target.value)}
              className="input w-full max-w-md"
            >
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name}
                  {season.is_active ? ' (Active)' : ''}
                  {' - '}
                  {new Date(season.start_date).toLocaleDateString()}
                  {season.end_date ? ` to ${new Date(season.end_date).toLocaleDateString()}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Export Tools */}
          {selectedSeason && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Export Season Data</h3>
              <p className="text-sm text-gray-600 mb-6">
                Export data for: <strong>{selectedSeason.name}</strong>
              </p>

              <div className="space-y-4">
                {/* Backup Export */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">
                        💾 Backup Export
                      </h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Export complete season data as JSON format. This backup can be used to restore
                        the season data later (import functionality coming soon).
                      </p>
                      <p className="text-xs text-gray-500">
                        Includes: Season info, teams, players, coaches, games, attendance, pitch counts, and positions
                      </p>
                    </div>
                    <button
                      onClick={handleExportBackup}
                      disabled={exporting}
                      className="btn btn-primary whitespace-nowrap self-start"
                    >
                      {exporting && exportType === 'backup' ? 'Exporting...' : 'Export JSON'}
                    </button>
                  </div>
                </div>

                {/* CSV Export */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">
                        📊 CSV Export
                      </h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Export season data as multiple CSV files in a ZIP archive. Easy to open in
                        Excel or Google Sheets for analysis.
                      </p>
                      <p className="text-xs text-gray-500">
                        Files included: season.csv, teams.csv, players.csv, games.csv, game_players.csv,
                        pitching_logs.csv, positions_played.csv, team_coaches.csv
                      </p>
                    </div>
                    <button
                      onClick={handleExportCSV}
                      disabled={exporting}
                      className="btn btn-primary whitespace-nowrap self-start"
                    >
                      {exporting && exportType === 'csv' ? 'Exporting...' : 'Export CSV'}
                    </button>
                  </div>
                </div>

                {/* HTML Report Export */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">
                        📄 HTML Report
                      </h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Generate a formatted HTML report with all season data. Perfect for printing,
                        viewing, or sharing with others.
                      </p>
                      <p className="text-xs text-gray-500">
                        Includes: Formatted tables for all teams, rosters, game schedules, and statistics
                      </p>
                    </div>
                    <button
                      onClick={handleExportHTML}
                      disabled={exporting}
                      className="btn btn-primary whitespace-nowrap self-start"
                    >
                      {exporting && exportType === 'html' ? 'Exporting...' : 'Export HTML'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Future Tools Placeholder */}
          <div className="card bg-gray-50">
            <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Import season data from backup</li>
              <li>• Bulk data operations</li>
              <li>• Advanced reporting tools</li>
            </ul>
          </div>

          {/* Danger Zone - super_admin only */}
          {isSuperAdmin && selectedSeason && (
            <div className="card border-2 border-red-200">
              <h3 className="text-lg font-semibold mb-4 text-red-700">⚠️ Danger Zone</h3>
              <div className="border border-red-200 rounded-lg p-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">
                      🗑️ Delete Season
                    </h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Permanently deletes <strong>{selectedSeason.name}</strong> and everything under
                      it: team rosters, coach assignments, games, pitching/catching data, and player
                      absences. This cannot be undone.
                    </p>
                    <p className="text-xs text-gray-500">
                      Tip: run Export Season Data above first if you may need this data later.
                    </p>
                  </div>
                  <button
                    onClick={() => { setDeleteError(null); setShowDeleteModal(true) }}
                    className="btn btn-danger whitespace-nowrap self-start"
                  >
                    Delete Season
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showDeleteModal && selectedSeason && (
        <DeleteSeasonModal
          seasonName={selectedSeason.name}
          deleting={deleting}
          error={deleteError}
          onConfirm={handleDeleteSeason}
          onClose={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  )
}
