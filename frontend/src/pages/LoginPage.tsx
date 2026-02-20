import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PARTIES, PARTY_META } from '../types';

const LoginPage: React.FC = () => {
  const { loginAsParty } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleSelect = async (partyId: string) => {
    setError('');
    setLoading(partyId);
    try {
      await loginAsParty(partyId);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 24,
    }}>
      <div style={{ width: 520, maxWidth: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" style={{ marginBottom: 16 }}>
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/><circle cx="12" cy="16" r="1.5"/>
          </svg>
          <h1 style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>
            Select Your Party
          </h1>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-3)', maxWidth: 380, margin: '0 auto' }}>
            Each party has a different view of the treasury. Open multiple tabs to compare what each party can see.
          </p>
        </div>

        {error && (
          <div style={{
            padding: '8px 14px', borderRadius: 8, marginBottom: 16,
            background: '#f8717122', border: '1px solid #f8717144',
            fontFamily: 'var(--mono)', fontSize: 12, color: '#f87171',
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {PARTIES.map(id => {
            const meta = PARTY_META[id];
            const isLoading = loading === id;
            return (
              <button
                key={id}
                onClick={() => handleSelect(id)}
                disabled={!!loading}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                  padding: 20, borderRadius: 12,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  cursor: loading ? 'wait' : 'pointer',
                  transition: 'all 0.15s ease',
                  opacity: loading && !isLoading ? 0.5 : 1,
                  textAlign: 'left',
                }}
                onMouseEnter={e => {
                  if (!loading) {
                    (e.currentTarget as HTMLElement).style.borderColor = meta.color;
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                  (e.currentTarget as HTMLElement).style.transform = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: meta.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: meta.color,
                  }}>
                    {meta.short}
                  </div>
                  <div>
                    <div style={{
                      fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, color: 'var(--text)',
                    }}>
                      {meta.label}
                    </div>
                  </div>
                </div>
                <div style={{
                  fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)',
                  lineHeight: 1.5,
                }}>
                  {meta.description}
                </div>
                {isLoading && (
                  <div style={{
                    marginTop: 8, fontFamily: 'var(--mono)', fontSize: 11, color: meta.color,
                  }}>
                    Connecting...
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div style={{
          textAlign: 'center', marginTop: 32,
          fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)',
          lineHeight: 1.6,
        }}>
          Privacy is enforced by Canton's ledger, not application code.<br/>
          Each party only sees contracts where they are a stakeholder.
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
