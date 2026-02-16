import { useState } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import UserManagement from '../admin/UserManagement'
import MaintenanceToggle from '../admin/MaintenanceToggle'
import SeasonManagement from '../seasons/SeasonManagement'
import TeamManagement from '../teams/TeamManagement'
import PlayerManagement from '../players/PlayerManagement'
import CoachManagement from '../coaches/CoachManagement'
import GameEntry from '../games/GameEntry'
import Reports from '../reports/Reports'
import RulesManagement from '../rules/RulesManagement'
import ToolsManagement from '../tools/ToolsManagement'
import LineupBuilder from '../lineup/LineupBuilder'
import RoleBasedRedirect from '../routing/RoleBasedRedirect'
import Footer from './Footer'

export default function Dashboard({ user, profile }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Calculate role flags once and pass down to child components
  const isSuperAdmin = profile.role === 'super_admin'
  const isAdmin = profile.role === 'admin' || profile.role === 'super_admin'
  const isCoach = profile.role === 'coach'

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
      // Server signOut failed — clear local session so user isn't stuck logged in
      await supabase.auth.signOut({ scope: 'local' })
    }
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              {/* Hamburger menu button - mobile only */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
                aria-label="Toggle navigation menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {sidebarOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">⚾ Baseball Team Manager</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-xs sm:text-sm text-gray-600 hidden sm:inline">
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

      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Mobile sidebar overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <aside className={`
            fixed top-0 left-0 z-50 h-full w-52 bg-white shadow-lg transform transition-transform duration-200 ease-in-out
            md:relative md:top-auto md:left-auto md:z-auto md:h-auto md:shadow-none md:transform-none md:transition-none
            md:block md:flex-shrink-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}>
            <nav className="space-y-1 p-4 md:p-0">
              {/* Mobile-only: close button and user info */}
              <div className="flex items-center justify-between mb-4 md:hidden">
                <span className="text-sm text-gray-600 truncate">
                  {profile.name}
                </span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
                  aria-label="Close navigation menu"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {isSuperAdmin && (
                <>
                  <button
                    onClick={() => { navigate('/users'); setSidebarOpen(false) }}
                    className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                      location.pathname === '/users'
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    👥 User Management
                  </button>
                  <button
                    onClick={() => { navigate('/maintenance'); setSidebarOpen(false) }}
                    className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                      location.pathname === '/maintenance'
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    🔧 Maintenance Mode
                  </button>
                </>
              )}

              <button
                onClick={() => { navigate('/games'); setSidebarOpen(false) }}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  location.pathname === '/games'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                ⚾ Games
              </button>

               <button
                onClick={() => { navigate('/teams'); setSidebarOpen(false) }}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  location.pathname === '/teams'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                🏆 Teams
              </button>

                            <button
                onClick={() => { navigate('/lineup'); setSidebarOpen(false) }}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  location.pathname === '/lineup'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                📝 Lineup Tool
              </button>

              {isAdmin &&
                (<><button
                  onClick={() => { navigate('/seasons'); setSidebarOpen(false) }}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${location.pathname === '/seasons'
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  📅 Seasons
                </button><button
                  onClick={() => { navigate('/players'); setSidebarOpen(false) }}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${location.pathname === '/players'
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'}`}
                >
                    🧢 Players
                  </button></>)
              }

              <button
                onClick={() => { navigate('/coaches'); setSidebarOpen(false) }}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  location.pathname === '/coaches'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                📋 Coaches
              </button>

              <button
                onClick={() => { navigate('/reports'); setSidebarOpen(false) }}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  location.pathname === '/reports'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                📊 Reports
              </button>

              <button
                onClick={() => { navigate('/rules'); setSidebarOpen(false) }}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  location.pathname === '/rules'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                📏 Rules
              </button>

              {isAdmin && (
                <button
                  onClick={() => { navigate('/tools'); setSidebarOpen(false) }}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    location.pathname === '/tools'
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  🛠️ Tools
                </button>
              )}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <Routes>
              <Route path="/" element={<RoleBasedRedirect profile={profile} />} />
              <Route path="/users" element={isSuperAdmin ? <UserManagement /> : <Navigate to="/teams" replace />} />
              <Route path="/maintenance" element={isSuperAdmin ? <MaintenanceToggle /> : <Navigate to="/teams" replace />} />
              <Route path="/games" element={<GameEntry profile={profile} isAdmin={isAdmin} />} />
              <Route path="/teams" element={<TeamManagement profile={profile} isCoach={isCoach} />} />
              <Route path="/seasons" element={isAdmin ? <SeasonManagement isAdmin={isAdmin} /> : <Navigate to="/teams" replace />} />
              <Route path="/players" element={isAdmin ? <PlayerManagement profile={profile} isAdmin={isAdmin} /> : <Navigate to="/teams" replace />} />
              <Route path="/coaches" element={<CoachManagement isAdmin={isAdmin} />} />
              <Route path="/reports" element={<Reports profile={profile} />} />
              <Route path="/lineup" element={<LineupBuilder profile={profile} />} />
              <Route path="/rules" element={<RulesManagement />} />
              <Route path="/tools" element={isAdmin ? <ToolsManagement isAdmin={isAdmin} /> : <Navigate to="/teams" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
