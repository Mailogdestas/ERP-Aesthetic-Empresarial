import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

type AuthContextType = { token: string | null; barbeariaId: string | null; userId: string | null; login: (email: string, senha: string) => Promise<void>; logout: () => void; };
const AuthContext = createContext<AuthContextType>({ token: null, barbeariaId: null, userId: null, login: async () => {}, logout: () => {} });

function decodeJwt(token: string | null): any | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(typeof window !== 'undefined' ? atob(parts[1]) : Buffer.from(parts[1], 'base64').toString('utf-8'));
    return payload;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null);
  const [barbeariaId, setBarbeariaId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const payload = decodeJwt(token);
    setBarbeariaId(payload?.barbeariaId ?? null);
    setUserId(payload?.sub ?? null);
  }, [token]);
  const login = async (email: string, senha: string) => {
    const res = await api.post('/auth/login', { email, senha });
    localStorage.setItem('accessToken', res.data.accessToken);
    setToken(res.data.accessToken);
  };
  const logout = () => {
    localStorage.removeItem('accessToken');
    setToken(null);
    setBarbeariaId(null);
    setUserId(null);
  };
  return <AuthContext.Provider value={{ token, barbeariaId, userId, login, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);