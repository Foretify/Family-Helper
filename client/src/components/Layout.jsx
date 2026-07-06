import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItem = ({ isActive }) =>
  `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? 'bg-indigo-600 text-white'
      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
  }`;

export default function Layout({ children }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-slate-800 flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-slate-700">
          <h1 className="text-lg font-bold text-white">🏠 Family Helper</h1>
          <p className="text-xs text-slate-400 mt-0.5">{user.household_name}</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          <NavLink to="/my-day" className={navItem}>
            ✅ My Day
          </NavLink>
          <NavLink to="/history" className={navItem}>
            📅 History
          </NavLink>

          {user.role === 'admin' && (
            <>
              <div className="pt-3 pb-1">
                <p className="text-xs text-slate-500 uppercase tracking-wider px-3">Admin</p>
              </div>
              <NavLink to="/board" className={navItem}>
                📋 Daily Board
              </NavLink>
              <NavLink to="/tasks" className={navItem}>
                📝 Task Library
              </NavLink>
              <NavLink to="/members" className={navItem}>
                👥 Members
              </NavLink>
            </>
          )}
        </nav>

        {/* User badge */}
        <div className="p-3 border-t border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ backgroundColor: user.avatar_color }}
            >
              {user.name[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm text-white font-medium truncate">{user.name}</p>
              <p className="text-xs text-slate-400 capitalize">{user.role}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full text-left text-xs text-slate-400 hover:text-white transition-colors"
          >
            Sign out →
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  );
}
