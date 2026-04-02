// client/src/api/index.js
// ── Axios instance + tất cả API calls ──────────────────────

import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// ── Axios instance ──────────────────────────────────────────
const api = axios.create({
  baseURL        : BASE,
  withCredentials: true,
  timeout        : 30_000,          // 30 giây (AI có thể chậm)
});

// Gắn Bearer token từ localStorage trước mỗi request
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('examhub_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Xử lý 401 → chuyển về trang login
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('examhub_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ─────────────────────────────────────────────────────
export const authAPI = {
  login  : (ident, password)          => api.post('/auth/login', { ident, password }),
  register: (data)                    => api.post('/auth/register', data),
  me     : ()                         => api.get('/auth/me'),
  changePassword: (oldP, newP)        => api.post('/auth/change-password', { oldPassword: oldP, newPassword: newP }),
};

// ── Rooms ────────────────────────────────────────────────────
export const roomsAPI = {
  list   : (params = {})  => api.get('/rooms',  { params }),
  get    : (id)           => api.get(`/rooms/${id}`),
  create : (data)         => api.post('/rooms', data),
  update : (id, data)     => api.put(`/rooms/${id}`, data),
  delete : (id)           => api.delete(`/rooms/${id}`),
};

// ── Exams ────────────────────────────────────────────────────
export const examsAPI = {
  list       : (params = {})     => api.get('/exams',   { params }),
  get        : (id)              => api.get(`/exams/${id}`),
  create     : (data)            => api.post('/exams', data),
  update     : (id, data)        => api.put(`/exams/${id}`, data),
  delete     : (id)              => api.delete(`/exams/${id}`),
  leaderboard: (examId)          => api.get(`/exams/${examId}/leaderboard`),
};

// ── Questions ────────────────────────────────────────────────
export const questionsAPI = {
  list  : (params = {}) => api.get('/exams/questions/list', { params }),
  create: (data)        => api.post('/exams/questions', data),
  update: (id, data)    => api.put(`/exams/questions/${id}`, data),
  delete: (id)          => api.delete(`/exams/questions/${id}`),
};

// ── Submissions ──────────────────────────────────────────────
export const submissionsAPI = {
  myHistory: ()     => api.get('/exams/submissions/my'),
  submit   : (data) => api.post('/exams/submissions', data),
};

// ── AI ───────────────────────────────────────────────────────
export const aiAPI = {
  chat: (feature, prompt, opts = {}) =>
    api.post('/ai/chat', { feature, prompt, ...opts }),

  generateQuestions: (params) =>
    api.post('/ai/generate-questions', params),

  tokenBalance: () => api.get('/ai/token-balance'),
};

// ── Admin ────────────────────────────────────────────────────
export const adminAPI = {
  stats        : ()             => api.get('/admin/stats'),
  users        : ()             => api.get('/admin/users'),
  createUser   : (data)         => api.post('/admin/users', data),
  deleteUser   : (id)           => api.delete(`/admin/users/${id}`),
  grantTokens  : (ident, amount)=> api.post('/admin/users/grant-tokens', { ident, amount }),
  grantPremium : (ident, grant, days) => api.post('/admin/users/grant-premium', { ident, grant, days }),
  resetTokens  : (id)           => api.post(`/admin/users/${id}/reset-tokens`),
  getTokenCosts: ()             => api.get('/admin/token-costs'),
  saveTokenCosts: (costs, genFactor) => api.put('/admin/token-costs', { costs, genFactor }),
};

// ── Tiện ích: lấy lỗi message từ axios error ─────────────────
export function getErrorMessage(err) {
  return err?.response?.data?.error || err?.message || 'Lỗi không xác định.';
}

export default api;
