import { useState } from 'react'
import GamesListReport from './GamesListReport'

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState(null)

  // Define available reports
  const reports = [
    {
      id: 'games-list',
      name: 'Games List',
      description: 'View all games with dates, scores, and scorekeeper information',
      icon: '📋',
      component: GamesListReport
    },
    // Future reports can be added here
    // {
    //   id: 'pitch-counts',
    //   name: 'Pitch Count Summary',
    //   description: 'View pitch counts and rest day compliance',
    //   icon: '⚾',
    //   component: PitchCountReport
    // },
  ]

  // If a report is selected, render it with a back button
  if (selectedReport) {
    const ReportComponent = selectedReport.component
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedReport(null)}
          className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
        >
          <span className="mr-2">←</span>
          Back to Reports
        </button>
        <ReportComponent />
      </div>
    )
  }

  // Otherwise, show the reports menu
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-gray-600 mt-2">Select a report to view detailed information</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <button
            key={report.id}
            onClick={() => setSelectedReport(report)}
            className="card hover:shadow-lg transition-shadow text-left p-6 border-2 border-transparent hover:border-blue-500"
          >
            <div className="text-4xl mb-3">{report.icon}</div>
            <h3 className="text-lg font-semibold mb-2">{report.name}</h3>
            <p className="text-sm text-gray-600">{report.description}</p>
          </button>
        ))}
      </div>

      {/* Placeholder for future reports */}
      <div className="card bg-gray-50 border-dashed border-2 border-gray-300 text-center py-8">
        <div className="text-gray-400 text-3xl mb-2">📊</div>
        <p className="text-gray-500 text-sm">More reports coming soon...</p>
      </div>
    </div>
  )
}
