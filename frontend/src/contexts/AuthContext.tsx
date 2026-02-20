import React, { createContext, useContext, useState, useCallback } from 'react';
import { PARTY_META } from '../types';

interface AuthContextType {
  partyId: string | null;
  partyLabel: string;
  role: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ partyId: string; role: string; label: string }>;
  loginAsParty: (partyId: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [partyId, setPartyId] = useState<string | null>(() => localStorage.getItem('treasury_party'));
  const [role, setRole] = useState<string | null>(() => localStorage.getItem('treasury_role'));
  const [loading] = useState(false);

  const login = useCallback(async (username: string, _password: string) => {
    const resp = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    if (!resp.ok) throw new Error('Login failed');
    const data = await resp.json();

    setPartyId(data.partyId);
    setRole(data.role);
    localStorage.setItem('treasury_party', data.partyId);
    localStorage.setItem('treasury_role', data.role);

    return { partyId: data.partyId, role: data.role, label: data.label };
  }, []);

  const loginAsParty = useCallback(async (id: string) => {
    const mode = localStorage.getItem('treasury_mode');
    if (mode === 'canton') {
      const formData = new URLSearchParams();
      const userMap: Record<string, string> = {
        operator: 'operator',
        member1: 'member1',
        member2: 'member2',
        publicObserver: 'observer',
      };
      formData.append('username', userMap[id] ?? id);
      formData.append('password', '');
      const resp = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
        credentials: 'include',
        redirect: 'manual',
      });
      if (resp.status !== 200 && resp.status !== 302 && resp.type !== 'opaqueredirect') {
        throw new Error('Login failed');
      }
    } else {
      await fetch('/api/party/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ party: id }),
      });
    }
    setPartyId(id);
    localStorage.setItem('treasury_party', id);
  }, []);

  const logout = useCallback(() => {
    setPartyId(null);
    setRole(null);
    localStorage.removeItem('treasury_party');
    localStorage.removeItem('treasury_role');
    fetch('/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
  }, []);

  const partyLabel = partyId ? (PARTY_META[partyId]?.label ?? partyId) : '';

  return (
    <AuthContext.Provider value={{
      partyId,
      partyLabel,
      role,
      isAuthenticated: !!partyId,
      loading,
      login,
      loginAsParty,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
