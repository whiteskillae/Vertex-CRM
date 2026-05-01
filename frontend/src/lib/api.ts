import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// ── API Base URL ──────────────────────────────────────────────────────────────
const getBaseUrl = () => {
  let url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
  
  // ── FIX: Ensure URL always ends with /api (required by backend structure) ────
  // If the user forgot to add /api in Vercel env, we fix it here.
  if (!url.includes('/api') && !url.includes('localhost')) {
    url = url.endsWith('/') ? `${url}api` : `${url}/api`;
  }
  
  return url.endsWith('/') ? url : `${url}/`;
};

const API_URL = getBaseUrl();

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
  (config: InternalAxiosRequestConfig) => {
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
  (error: AxiosError) => Promise.reject(error)
);

// ── Response Interceptor: Auto-logout on 401 ─────────────────────────────────
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
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
