'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface AuthUser {
  id: string;
  nombre: string;
  email: string;
  rol: string; // ADMINISTRADOR | ODONTOLOGO | RECEPCIONISTA | CAJERO | PRACTICANTE
  rol_id?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  isLoading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isTokenExpired = (token: string) => {
    try {
      const payload = token.split('.')[1];
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(atob(base64).split('').map((c) => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`).join(''));
      const parsed = JSON.parse(json);
      return typeof parsed.exp === 'number' && Date.now() / 1000 > parsed.exp;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (stored && token && !isTokenExpired(token)) {
        setUserState(JSON.parse(stored));
      } else {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUserState(null);
      }
    } catch {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setUserState(null);
    }
    setIsLoading(false);
  }, []);

  const setUser = (u: AuthUser | null) => {
    setUserState(u);
    if (u) {
      localStorage.setItem('user', JSON.stringify(u));
    } else {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
