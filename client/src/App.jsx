import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import MyDay from './pages/MyDay';
import AdminBoard from './pages/AdminBoard';
import TaskLibrary from './pages/TaskLibrary';
import Members from './pages/Members';
import History from './pages/History';

function PrivateRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/my-day" replace />;
  return <Layout>{children}</Layout>;
}

function DefaultRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/board' : '/my-day'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/my-day" element={
            <PrivateRoute><MyDay /></PrivateRoute>
          } />
          <Route path="/history" element={
            <PrivateRoute><History /></PrivateRoute>
          } />

          {/* Admin routes */}
          <Route path="/board" element={
            <PrivateRoute adminOnly><AdminBoard /></PrivateRoute>
          } />
          <Route path="/tasks" element={
            <PrivateRoute adminOnly><TaskLibrary /></PrivateRoute>
          } />
          <Route path="/members" element={
            <PrivateRoute adminOnly><Members /></PrivateRoute>
          } />

          <Route path="*" element={<DefaultRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
