import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const SANDBOX_ACCOUNTS = [
  { username: 'alice', role: 'Member 1', desc: 'DAO Strategist — creates and manages treasury strategies' },
  { username: 'bob', role: 'Member 2', desc: 'DAO Strategist — creates and manages treasury strategies' },
  { username: 'admin', role: 'Operator', desc: 'System admin — manages epochs and DAO lifecycle' },
  { username: 'guest', role: 'Public Observer', desc: 'View-only — sees performance but not allocations' },
];

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ label: string; role: string } | null>(null);
  const [showAccounts, setShowAccounts] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) { setError('Username is required'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await login(username.trim(), password);
      setResult({ label: res.label, role: res.role });
      setTimeout(() => navigate('/dashboard'), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (uname: string) => {
    setUsername(uname);
    setError('');
    setLoading(true);
    try {
      const res = await login(uname, '');
      setResult({ label: res.label, role: res.role });
      setTimeout(() => navigate('/dashboard'), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 24,
    }}>
      <div style={{ width: 440, maxWidth: '100%' }}>
        <Link to="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-3)',
          textDecoration: 'none', marginBottom: 32,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to Home
        </Link>

        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" style={{ marginBottom: 16 }}>
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/><circle cx="12" cy="16" r="1.5"/>
          </svg>
          <h1 style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>
            Sign In
          </h1>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-3)', maxWidth: 360, margin: '0 auto', lineHeight: 1.6 }}>
            Your role is determined by your DAO membership. Operators manage epochs, Members create strategies, Observers view public data.
          </p>
        </div>

        {result && (
          <div style={{
            padding: '12px 16px', borderRadius: 8, marginBottom: 20,
            background: '#34d39916', border: '1px solid #34d39933',
            fontFamily: 'var(--mono)', fontSize: 12, color: '#34d399',
            textAlign: 'center',
          }}>
            Signed in as <b>{result.label}</b> ({result.role})
          </div>
        )}

        {error && (
          <div style={{
            padding: '8px 14px', borderRadius: 8, marginBottom: 16,
            background: '#f8717122', border: '1px solid #f8717144',
            fontFamily: 'var(--mono)', fontSize: 12, color: '#f87171',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <label style={{
            display: 'block', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)',
            textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6,
          }}>
            Username
          </label>
          <input
            type="text"
            className="ts-input"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="e.g. alice, bob, admin, guest"
            autoFocus
            disabled={loading}
            style={{ width: '100%', marginBottom: 14, padding: '10px 14px' }}
          />
          <label style={{
            display: 'block', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)',
            textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6,
          }}>
            Password
          </label>
          <input
            type="password"
            className="ts-input"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Leave blank for sandbox"
            disabled={loading}
            style={{ width: '100%', marginBottom: 20, padding: '10px 14px' }}
          />
          <button
            type="submit"
            className="ts-btn ts-btn-accent"
            disabled={loading || !username.trim()}
            style={{ width: '100%', padding: '10px 0', fontSize: 13, justifyContent: 'center' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: 24 }}>
          <button
            onClick={() => setShowAccounts(!showAccounts)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)',
              display: 'flex', alignItems: 'center', gap: 6, padding: 0,
            }}
          >
            <svg
              width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ transform: showAccounts ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}
            >
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            Sandbox test accounts
          </button>
          {showAccounts && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {SANDBOX_ACCOUNTS.map(acc => (
                <button
                  key={acc.username}
                  onClick={() => handleQuickLogin(acc.username)}
                  disabled={loading}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 8,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    cursor: loading ? 'wait' : 'pointer', textAlign: 'left',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-2)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 6,
                    background: '#818cf822', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: '#818cf8',
                    flexShrink: 0,
                  }}>
                    {acc.username[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                      {acc.username}
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-3)' }}>
                      {acc.role} — {acc.desc}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{
          textAlign: 'center', marginTop: 28,
          fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)',
          lineHeight: 1.6,
        }}>
          Privacy is enforced by Canton's ledger, not application code.<br/>
          <Link to="/register" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
            New to Canton? Learn about registration &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
