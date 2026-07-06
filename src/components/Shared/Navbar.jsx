import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Avatar from './Avatar'

export default function Navbar() {
  const { profile, signOut } = useAuth()
  const location = useLocation()

  const isActive = (path) =>
    location.pathname === path ? 'text-indigo-600 font-semibold' : 'text-gray-600 hover:text-indigo-600'

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
        <Link to="/" className="flex items-center gap-2 font-bold text-indigo-600 text-lg">
          🏠 Family Helper
        </Link>

        <div className="flex items-center gap-4">
          {profile?.role === 'admin' && (
            <>
              <Link to="/admin/tasks" className={`text-sm ${isActive('/admin/tasks')}`}>
                Tasks
              </Link>
              <Link to="/admin/assign" className={`text-sm ${isActive('/admin/assign')}`}>
                Assign
              </Link>
              <Link to="/admin/family" className={`text-sm ${isActive('/admin/family')}`}>
                Family
              </Link>
            </>
          )}
          <Link to="/dashboard" className={`text-sm ${isActive('/dashboard')}`}>
            My Tasks
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {profile && (
            <div className="flex items-center gap-2">
              <Avatar name={profile.display_name} color={profile.avatar_color} size="sm" />
              <span className="text-sm text-gray-700 hidden sm:inline">{profile.display_name}</span>
            </div>
          )}
          <button
            onClick={signOut}
            className="text-sm text-gray-500 hover:text-red-500 ml-2"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}
