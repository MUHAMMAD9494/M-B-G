'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from './api';
import type { AuthUser } from '@nexora/types';

const AUTH_KEY = 'nexora_auth_user';
const TOKEN_KEY = 'nexora_auth_token';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

function persistUser(u: AuthUser | null) {
  if (typeof window === 'undefined') return;
  try {
    if (u) sessionStorage.setItem(AUTH_KEY, JSON.stringify(u));
    else sessionStorage.removeItem(AUTH_KEY);
  } catch { /* quota */ }
}

function restoreUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function persistToken(t: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (t) sessionStorage.setItem(TOKEN_KEY, t);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch { /* quota */ }
}

function restoreToken(): string | null {
  if (typeof window === 'undefined') return null;
  try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore from sessionStorage first (synchronous), then verify with /auth/me.
    const cached = restoreUser();
    const cachedToken = restoreToken();
    if (cached) {
      setUser(cached);
      setToken(cachedToken);
      setLoading(false);
    }
    // Verify session is still valid
    api
      .get<AuthUser>('/auth/me', cachedToken ?? undefined)
      .then((u) => { persistUser(u); setUser(u); })
      .catch(() => { persistUser(null); persistToken(null); setUser(null); setToken(null); })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ user: AuthUser; accessToken: string; expiresIn: number }>(
      '/auth/login',
      { email, password },
    );
    persistUser(res.user);
    persistToken(res.accessToken);
    setUser(res.user);
    setToken(res.accessToken);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    persistUser(null);
    persistToken(null);
    try {
      await api.post('/auth/logout', {}, token ?? undefined);
    } catch {
      // cookies cleared server-side
    }
    setUser(null);
    setToken(null);
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
