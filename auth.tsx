'use client';
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { api, clearToken, getToken, setToken } from './api';

export type User = { id: string; name: string; email: string; role: string; membership: string; creditBalance: number; emailVerified: boolean; referralCode?: string };
const Ctx = createContext<{ user: User | null; loading: boolean; refresh: () => Promise<void>; login: (token: string) => Promise<void>; logout: () => void }>(null as any);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!getToken()) { setUser(null); setLoading(false); return; }
    try { setUser(await api<User>('/account/me')); } catch { clearToken(); setUser(null); }
    setLoading(false);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return <Ctx.Provider value={{ user, loading, refresh, login: async t => { setToken(t); await refresh(); }, logout: () => { clearToken(); setUser(null); window.location.href = '/'; } }}>{children}</Ctx.Provider>;
}
