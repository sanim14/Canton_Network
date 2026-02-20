import React, { createContext, useContext, useState, useCallback } from 'react';
import { PARTY_META } from '../types';

interface AuthContextType {
  partyId: string | null;
  partyLabel: string;
  isAuthenticated: boolean;
  loading: boolean;
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
  const [loading] = useState(false);

  const loginAsParty = useCallback(async (id: string) => {
    // For Canton shared-secret mode: POST to /login form endpoint
    // For standalone mode: POST to /api/party/switch
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
      // Standalone mode: tell backend which party we are
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
    localStorage.removeItem('treasury_party');
    // For Canton mode, also hit the logout endpoint
    fetch('/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
  }, []);

  const partyLabel = partyId ? (PARTY_META[partyId]?.label ?? partyId) : '';

  return (
    <AuthContext.Provider value={{
      partyId,
      partyLabel,
      isAuthenticated: !!partyId,
      loading,
      loginAsParty,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
