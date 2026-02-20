import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Toast from '../common/Toast';
import { useTreasury } from '../../hooks/useTreasury';
import { TreasuryContext } from '../../contexts/TreasuryContext';
import { useDemo } from '../../contexts/DemoContext';

const AppShell: React.FC = () => {
  const treasury = useTreasury();
  const { isDemoMode, exitDemo } = useDemo();
  const navigate = useNavigate();

  if (treasury.loading) {
    return (
      <div style={{
        background: '#07070c', color: '#e2e8f0', height: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'IBM Plex Mono',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
              <circle cx="12" cy="16" r="1.5" />
            </svg>
          </div>
          <span style={{ letterSpacing: 4, textTransform: 'uppercase', fontSize: 13, color: '#64748b' }}>
            Initializing Vault
          </span>
        </div>
      </div>
    );
  }

  return (
    <TreasuryContext.Provider value={treasury}>
      {treasury.toast && <Toast msg={treasury.toast.msg} type={treasury.toast.type} />}
      {isDemoMode && (
        <div className="ts-demo-banner">
          <span>DEMO MODE &mdash; Data shown is simulated.</span>
          <button
            onClick={() => { exitDemo(); navigate('/login'); }}
            style={{
              background: 'none', border: '1px solid #fbbf2444', borderRadius: 4,
              color: '#fbbf24', fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
              padding: '2px 10px', cursor: 'pointer', marginLeft: 8,
            }}
          >
            Sign in for live data
          </button>
        </div>
      )}
      <div className="ts-app-shell">
        <Sidebar />
        <div className="ts-app-content">
          <Header
            epoch={treasury.epoch}
            partyId={treasury.partyId}
            partyLabel={treasury.partyLabel}
            partyColor={treasury.partyColor}
            isOperator={treasury.isOperator}
            onAdvanceEpoch={treasury.advanceEpoch}
            onOpenVoting={treasury.openVoting}
            onExecuteElim={treasury.executeElim}
            onBootstrap={treasury.bootstrap}
          />
          <main className="ts-main">
            <Outlet />
          </main>
        </div>
      </div>
    </TreasuryContext.Provider>
  );
};

export default AppShell;
