"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'employee';
  status: 'active' | 'pending' | 'blocked';
  avatar?: string;
  isVerified?: boolean;
  lastReadTasksAt?: string;
  lastReadMessagesAt?: string;
  phone?: string;
  bio?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (userData: User & { token?: string }) => void;
  logout: () => void;
  updateUser: (userData: User) => void;
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          try { setUser(JSON.parse(storedUser)); } catch { /* ignore */ }
        }

        const { data } = await api.get('auth/me');
        setUser(data);
        localStorage.setItem("user", JSON.stringify(data));
      } catch {
        setUser(null);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, []);

  const login = (userData: User & { token?: string }) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
    router.push('/dashboard');
  };

  const logout = async () => {
    try { await api.post('auth/logout'); } catch { /* ignore */ }
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    router.push('/login');
  };

  const updateUser = (userData: User) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
