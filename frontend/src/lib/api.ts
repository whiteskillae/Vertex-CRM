import axios from 'axios';

// ── API Base URL ──────────────────────────────────────────────────────────────
// Default to port 5001 (the actual backend port).
// Override via NEXT_PUBLIC_API_URL in .env.local for production.
const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
const API_URL = rawUrl.endsWith('/') ? rawUrl : `${rawUrl}/`;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// ── Request Interceptor: Attach JWT token ─────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      let token = localStorage.getItem('token');
      // ── FIX: Ensure we don't send "null" or "undefined" as strings ──────────
      if (token === 'null' || token === 'undefined') {
        token = null;
        localStorage.removeItem('token');
      }
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor: Auto-logout on 401 ─────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      typeof window !== 'undefined' &&
      !window.location.pathname.includes('/login')
    ) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
