// client/src/App.jsx
// ── Router chính + Guard routes ──────────────────────────────

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth, AuthProvider } from './contexts/AuthContext.jsx';
import RoomPage from './pages/RoomPage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import ResultPage from './pages/ResultPage.jsx';

import LoginPage     from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import AdminPage     from './pages/AdminPage.jsx';
import ExamPage      from './pages/ExamPage.jsx';

// ── Guard: chỉ truy cập khi đã đăng nhập ─────────────────────
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="loading-overlay show"><div className="loading-spin">⚙️</div></div>;
  if (!user)   return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

// ── Guard: chỉ Admin mới vào được ────────────────────────────
function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <div className="loading-overlay show"><div className="loading-spin">⚙️</div></div>;
  if (!user)   return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

// ── Guard: chưa login thì không vào login page ────────────────
function PublicRoute({ children }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return null;
  if (user)    return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={
        <PublicRoute><LoginPage /></PublicRoute>
      }/>

      {/* Student + Teacher */}
      <Route path="/dashboard" element={
        <PrivateRoute><DashboardPage /></PrivateRoute>
      }/>
      <Route path="/room/:id" element={
        <PrivateRoute><RoomPage /></PrivateRoute>
      }/>
      <Route path="/exam/:id" element={
        <PrivateRoute><ExamPage /></PrivateRoute>
      }/>
      <Route path="/history" element={
        <PrivateRoute><HistoryPage /></PrivateRoute>
      }/>
      <Route path="/result/:id" element={
        <PrivateRoute><ResultPage /></PrivateRoute>
      }/>

      {/* Admin only */}
      <Route path="/admin/*" element={
        <AdminRoute><AdminPage /></AdminRoute>
      }/>

      {/* Redirect root */}
      <Route path="/" element={<Navigate to="/dashboard" replace />}/>
      <Route path="*" element={<Navigate to="/dashboard" replace />}/>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
