// client/src/contexts/AuthContext.jsx
// ── Context xác thực toàn cục ────────────────────────────────

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, getErrorMessage } from '../api/index.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true); // true khi đang khôi phục session

  // Khôi phục session khi load trang
  useEffect(() => {
    const token = localStorage.getItem('examhub_token');
    if (!token) { setLoading(false); return; }

    authAPI.me()
      .then(res  => setUser(res.data.user))
      .catch(()  => localStorage.removeItem('examhub_token'))
      .finally(() => setLoading(false));
  }, []);

  // ── Đăng nhập ─────────────────────────────────────────────
  const login = useCallback(async (ident, password) => {
    const res = await authAPI.login(ident, password);  // throw on error → caller handles
    localStorage.setItem('examhub_token', res.data.token);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  // ── Đăng ký ───────────────────────────────────────────────
  const register = useCallback(async (data) => {
    await authAPI.register(data);
  }, []);

  // ── Đăng xuất ─────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem('examhub_token');
    setUser(null);
  }, []);

  // ── Làm mới thông tin user (sau khi cấp token, premium...) ─
  const refreshUser = useCallback(async () => {
    try {
      const res = await authAPI.me();
      setUser(res.data.user);
    } catch {}
  }, []);

  // ── Helpers phân quyền ────────────────────────────────────
  const isAdmin   = user?.role === 'admin';
  const isTeacher = user?.role === 'admin' || user?.role === 'teacher';
  const isPremium = user?.premium || false;

  return (
    <AuthContext.Provider value={{
      user, loading,
      login, register, logout, refreshUser,
      isAdmin, isTeacher, isPremium,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook tiện ích
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải dùng bên trong <AuthProvider>');
  return ctx;
}
