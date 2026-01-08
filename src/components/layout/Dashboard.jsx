import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import UserManagement from '../admin/UserManagement'
import SeasonManagement from '../seasons/SeasonManagement'
import TeamManagement from '../teams/TeamManagement'
import PlayerManagement from '../players/PlayerManagement'
import CoachManagement from '../coaches/CoachManagement'
import GameEntry from '../games/GameEntry'
import Reports from '../reports/Reports'
import RulesManagement from '../rules/RulesManagement'
import ToolsManagement from '../tools/ToolsManagement'
import RoleBasedRedirect from '../routing/RoleBasedRedirect'
import Footer from './Footer'

export default function Dashboard({ user, profile }) {
  const navigate = useNavigate()
  const location = useLocation()

  // Calculate role flags once and pass down to child components
  const isSuperAdmin = profile.role === 'super_admin'
  const isAdmin = profile.role === 'admin' || profile.role === 'super_admin'
  const isCoach = profile.role === 'coach'

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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

      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0">
            <nav className="space-y-1">
              {/* <button
                onClick={() => setCurrentView('home')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  currentView === 'home'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                🏠 Home
              </button> */}

              {isSuperAdmin && (
                <button
                  onClick={() => navigate('/users')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    location.pathname === '/users'
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  👥 User Management
                </button>
              )}

              <button
                onClick={() => navigate('/games')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  location.pathname === '/games'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                ⚾ Games
              </button>

               <button
                onClick={() => navigate('/teams')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  location.pathname === '/teams'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                🏆 Teams
              </button>

              {isAdmin &&
                (<><button
                  onClick={() => navigate('/seasons')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${location.pathname === '/seasons'
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  📅 Seasons
                </button><button
                  onClick={() => navigate('/players')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${location.pathname === '/players'
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'}`}
                >
                    🧢 Players
                  </button></>)
              }

              <button
                onClick={() => navigate('/coaches')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  location.pathname === '/coaches'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                📋 Coaches
              </button>

              <button
                onClick={() => navigate('/reports')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  location.pathname === '/reports'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                📊 Reports
              </button>

              <button
                onClick={() => navigate('/rules')}
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
                  onClick={() => navigate('/tools')}
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
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<RoleBasedRedirect profile={profile} />} />
              <Route path="/users" element={isSuperAdmin ? <UserManagement /> : <Navigate to="/teams" replace />} />
              <Route path="/games" element={<GameEntry profile={profile} isAdmin={isAdmin} />} />
              <Route path="/teams" element={<TeamManagement profile={profile} isCoach={isCoach} />} />
              <Route path="/seasons" element={isAdmin ? <SeasonManagement isAdmin={isAdmin} /> : <Navigate to="/teams" replace />} />
              <Route path="/players" element={isAdmin ? <PlayerManagement profile={profile} isAdmin={isAdmin} /> : <Navigate to="/teams" replace />} />
              <Route path="/coaches" element={<CoachManagement isAdmin={isAdmin} />} />
              <Route path="/reports" element={<Reports profile={profile} />} />
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
