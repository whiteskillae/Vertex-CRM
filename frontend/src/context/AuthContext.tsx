"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: any;
  loading: boolean;
  login: (userData: any) => void;
  logout: () => void;
  updateUser: (userData: any) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
  updateUser: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchMe = async () => {
      try {
        // Optimistic load from localStorage to reduce flash
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          try { setUser(JSON.parse(storedUser)); } catch { /* ignore bad JSON */ }
        }

        // Always re-verify with backend (ensures token is still valid)
        const { data } = await api.get('auth/me');
        setUser(data);
        localStorage.setItem("user", JSON.stringify(data));
      } catch {
        // Token invalid or expired → clear everything
        setUser(null);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, []);

  const login = (userData: any) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
    // Token is already stored by the API call caller
    router.push('/dashboard');
  };

  const logout = async () => {
    try { await api.post('auth/logout'); } catch { /* ignore */ }
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    router.push('/login');
  };

  const updateUser = (userData: any) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
