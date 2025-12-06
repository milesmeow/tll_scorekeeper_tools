import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import UserManagement from '../admin/UserManagement'

export default function Dashboard({ user, profile }) {
  const [currentView, setCurrentView] = useState('home')

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">⚾ Baseball Team Manager</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {profile.name} ({profile.role.replace('_', ' ')})
              </span>
              <button
                onClick={handleSignOut}
                className="btn btn-secondary text-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0">
            <nav className="space-y-1">
              <button
                onClick={() => setCurrentView('home')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  currentView === 'home'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                🏠 Home
              </button>

              {profile.role === 'super_admin' && (
                <button
                  onClick={() => setCurrentView('users')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    currentView === 'users'
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  👥 User Management
                </button>
              )}

              <button
                onClick={() => setCurrentView('seasons')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  currentView === 'seasons'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                📅 Seasons
              </button>

              <button
                onClick={() => setCurrentView('teams')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  currentView === 'teams'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                🏆 Teams
              </button>

              <button
                onClick={() => setCurrentView('games')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  currentView === 'games'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                ⚾ Games
              </button>

              <button
                onClick={() => setCurrentView('reports')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  currentView === 'reports'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                📊 Reports
              </button>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {currentView === 'home' && <HomeView profile={profile} />}
            {currentView === 'users' && profile.role === 'super_admin' && <UserManagement />}
            {currentView === 'seasons' && <ComingSoon feature="Season Management" />}
            {currentView === 'teams' && <ComingSoon feature="Team Management" />}
            {currentView === 'games' && <ComingSoon feature="Game Entry" />}
            {currentView === 'reports' && <ComingSoon feature="Reports" />}
          </main>
        </div>
      </div>
    </div>
  )
}

function HomeView({ profile }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Welcome back, {profile.name}!</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">🎯 Quick Stats</h3>
          <p className="text-gray-600">Season statistics will appear here</p>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-2">📋 Recent Activity</h3>
          <p className="text-gray-600">Recent games and updates will appear here</p>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold mb-4">✨ Getting Started</h3>
        <ol className="space-y-3 text-gray-700">
          <li className="flex items-start">
            <span className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-3 flex-shrink-0">1</span>
            <div>
              <strong>Create a Season</strong>
              <p className="text-sm text-gray-600">Set up your season with start and end dates</p>
            </div>
          </li>
          <li className="flex items-start">
            <span className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-3 flex-shrink-0">2</span>
            <div>
              <strong>Add Teams</strong>
              <p className="text-sm text-gray-600">Create teams for Training, Minor, and Major divisions</p>
            </div>
          </li>
          <li className="flex items-start">
            <span className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-3 flex-shrink-0">3</span>
            <div>
              <strong>Build Rosters</strong>
              <p className="text-sm text-gray-600">Add players to your teams with their ages</p>
            </div>
          </li>
          <li className="flex items-start">
            <span className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-3 flex-shrink-0">4</span>
            <div>
              <strong>Enter Game Data</strong>
              <p className="text-sm text-gray-600">Track scores, attendance, pitch counts, and positions</p>
            </div>
          </li>
          <li className="flex items-start">
            <span className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-3 flex-shrink-0">5</span>
            <div>
              <strong>Monitor Compliance</strong>
              <p className="text-sm text-gray-600">System automatically tracks pitch count rules and rest days</p>
            </div>
          </li>
        </ol>
      </div>
    </div>
  )
}

function ComingSoon({ feature }) {
  return (
    <div className="card text-center py-12">
      <div className="text-6xl mb-4">🚧</div>
      <h2 className="text-2xl font-bold mb-2">{feature}</h2>
      <p className="text-gray-600">This feature is coming in the next phase</p>
    </div>
  )
}
